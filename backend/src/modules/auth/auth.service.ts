import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtPayload } from '../../core/types/request.types';
import { MembershipStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Token Helpers ───────────────────────────────────────────────────────────

  private generateAccessToken(userId: string): string {
    const payload: JwtPayload = { sub: userId };
    return this.jwtService.sign(payload, {
      expiresIn: '15m',
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getCookieOptions(maxAgeDays: number): Record<string, unknown> {
    return {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
      path: '/',
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          where: { status: MembershipStatus.active },
          include: {
            doctorProfile: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const { passwordHash: _pw, ...userWithoutPassword } = user;
    void _pw;

    return {
      accessToken,
      refreshToken,
      user: {
        id: userWithoutPassword.id,
        name: userWithoutPassword.name,
        email: userWithoutPassword.email,
        phone: userWithoutPassword.phone,
        avatarUrl: userWithoutPassword.avatarUrl,
        createdAt: userWithoutPassword.createdAt,
      },
      memberships: user.memberships.map((m) => ({
        id: m.id,
        userId: m.userId,
        doctorProfileId: m.doctorProfileId,
        role: m.role,
        status: m.status,
      })),
    };
  }

  // ─── Refresh Token ───────────────────────────────────────────────────────────

  async refreshAccessToken(rawRefreshToken: string): Promise<{ accessToken: string }> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.revokedAt !== null || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const accessToken = this.generateAccessToken(storedToken.userId);
    return { accessToken };
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHash = this.hashToken(rawRefreshToken);

    await this.prisma.refreshToken
      .update({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      })
      .catch(() => {
        // Token may not exist — that's fine
        this.logger.warn('Attempted to revoke a non-existent refresh token');
      });
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Always succeed silently to prevent email enumeration (BR-SEC)
    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: rawToken,
        expiresAt,
      },
    });

    // TODO: Integrate email service to send rawToken link
    this.logger.log(`Password reset token generated for user ${user.id}`);
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const newHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens for security
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ─── Accept Invite ───────────────────────────────────────────────────────────

  async acceptInvite(dto: AcceptInviteDto) {
    const membership = await this.prisma.membership.findUnique({
      where: { inviteToken: dto.inviteToken },
      include: { user: true },
    });

    if (
      !membership ||
      membership.status !== MembershipStatus.invited ||
      !membership.inviteTokenExpiresAt ||
      membership.inviteTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invite token is invalid or expired');
    }

    const passwordHash = await argon2.hash(dto.password);

    // Update the user that was invited (created with placeholder on invitation)
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: membership.userId },
        data: { name: dto.name, passwordHash },
      });

      await tx.membership.update({
        where: { id: membership.id },
        data: {
          status: MembershipStatus.active,
          inviteToken: null,
          inviteTokenExpiresAt: null,
        },
      });

      return user;
    });

    const accessToken = this.generateAccessToken(updatedUser.id);
    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId: updatedUser.id, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatarUrl,
        createdAt: updatedUser.createdAt,
      },
    };
  }
}
