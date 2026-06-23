import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GenerateInviteDto } from './dto/generate-invite.dto';
import { RegisterAssistantDto } from './dto/register-assistant.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtPayload } from '../../core/types/request.types';
import { MembershipRole, MembershipStatus } from '@prisma/client';

// Payload shape for assistant invite JWTs (distinct from access-token JWTs)
interface AssistantInvitePayload {
  sub: string;        // doctorProfileId
  type: 'assistant_invite';
  iat?: number;
  exp?: number;
}

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

  private async issueSessionTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
    return { accessToken, refreshToken };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          where: { status: MembershipStatus.active },
          include: { doctorProfile: true },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const { accessToken, refreshToken } = await this.issueSessionTokens(user.id);
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
        doctorProfile: m.doctorProfile
          ? { id: m.doctorProfile.id, specialization: m.doctorProfile.specialization }
          : undefined,
      })),
    };
  }

  // ─── Register (Doctor) ───────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const passwordHash = await argon2.hash(dto.password);

    const { user, membership } = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name: dto.name, email: dto.email, passwordHash },
      });
      const profile = await tx.doctorProfile.create({
        data: {
          userId: newUser.id,
          specialization: dto.specialization ?? 'General Practitioner',
        },
      });
      const newMembership = await tx.membership.create({
        data: {
          userId: newUser.id,
          doctorProfileId: profile.id,
          role: MembershipRole.doctor,
          status: MembershipStatus.active,
        },
      });
      return { user: newUser, profile, membership: newMembership };
    });

    const { accessToken, refreshToken } = await this.issueSessionTokens(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      memberships: [
        {
          id: membership.id,
          userId: membership.userId,
          doctorProfileId: membership.doctorProfileId,
          role: membership.role,
          status: membership.status,
        },
      ],
    };
  }

  // ─── Generate Assistant Invite ───────────────────────────────────────────────

  async generateAssistantInvite(userId: string, dto: GenerateInviteDto) {
    // Caller must have an active membership in the target doctor profile
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        doctorProfileId: dto.doctorProfileId,
        status: MembershipStatus.active,
      },
      include: {
        doctorProfile: { include: { user: { select: { name: true } } } },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Anda tidak memiliki akses ke profil dokter ini');
    }

    // Build a self-contained, signed invite JWT (48 h validity — no DB row required)
    const payload: AssistantInvitePayload = {
      sub: dto.doctorProfileId,
      type: 'assistant_invite',
    };

    const inviteToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '48h',
    });

    this.logger.log(
      `Invite token generated by user ${userId} for doctorProfile ${dto.doctorProfileId}`,
    );

    return {
      inviteToken,
      doctorProfileId: dto.doctorProfileId,
      doctorName: membership.doctorProfile?.user?.name ?? 'Dokter',
      specialization: membership.doctorProfile?.specialization ?? '',
    };
  }

  // ─── Get Invite Info (validate token, return profile meta) ───────────────────

  async getInviteInfo(token: string) {
    let payload: AssistantInvitePayload;
    try {
      payload = this.jwtService.verify<AssistantInvitePayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new BadRequestException('Link undangan tidak valid atau sudah kadaluarsa');
    }

    if (payload.type !== 'assistant_invite') {
      throw new BadRequestException('Link undangan tidak valid');
    }

    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id: payload.sub },
      include: { user: { select: { name: true } } },
    });

    if (!profile) throw new BadRequestException('Profil dokter tidak ditemukan');

    return {
      doctorProfileId: profile.id,
      specialization: profile.specialization,
      doctorName: profile.user.name,
    };
  }

  // ─── Register Assistant (via invite token) ────────────────────────────────────

  async registerAssistant(dto: RegisterAssistantDto) {
    // Validate invite token
    let doctorProfileId: string;
    try {
      const payload = this.jwtService.verify<AssistantInvitePayload>(dto.inviteToken, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      if (payload.type !== 'assistant_invite') {
        throw new BadRequestException('Link undangan tidak valid');
      }
      doctorProfileId = payload.sub;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Link undangan tidak valid atau sudah kadaluarsa');
    }

    // Email uniqueness
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email sudah terdaftar');

    // Check doctor profile still exists
    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorProfileId },
    });
    if (!profile) throw new BadRequestException('Profil dokter pengundang tidak ditemukan');

    const passwordHash = await argon2.hash(dto.password);

    const { user, membership } = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name: dto.name, email: dto.email, passwordHash },
      });
      const newMembership = await tx.membership.create({
        data: {
          userId: newUser.id,
          doctorProfileId,
          role: MembershipRole.assistant,
          status: MembershipStatus.active,
        },
      });
      return { user: newUser, membership: newMembership };
    });

    const { accessToken, refreshToken } = await this.issueSessionTokens(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      memberships: [
        {
          id: membership.id,
          userId: membership.userId,
          doctorProfileId: membership.doctorProfileId,
          role: membership.role,
          status: membership.status,
        },
      ],
    };
  }

  // ─── Refresh Token ───────────────────────────────────────────────────────────

  async refreshAccessToken(rawRefreshToken: string): Promise<{ accessToken: string }> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

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
      .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
      .catch(() => {
        this.logger.warn('Attempted to revoke a non-existent refresh token');
      });
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return; // Silently succeed (BR-SEC)

    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token: rawToken, expiresAt },
    });

    this.logger.log(`Password reset token generated for user ${user.id}`);
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token: dto.token } });
    if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: newHash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ─── Accept Invite (legacy email-based flow) ──────────────────────────────────

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

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: membership.userId },
        data: { name: dto.name, passwordHash },
      });
      await tx.membership.update({
        where: { id: membership.id },
        data: { status: MembershipStatus.active, inviteToken: null, inviteTokenExpiresAt: null },
      });
      return user;
    });

    const { accessToken, refreshToken } = await this.issueSessionTokens(updatedUser.id);

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
