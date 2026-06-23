import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import * as express from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GenerateInviteDto } from './dto/generate-invite.dto';
import { RegisterAssistantDto } from './dto/register-assistant.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Public } from '../../core/decorators/public.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { GetUser } from '../../core/decorators/get-user.decorator';

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── POST /auth/login ─────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.login(dto);
    const { refreshToken, ...payload } = result;
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { data: payload };
  }

  // ─── POST /auth/register (default role: doctor) ───────────────────────────

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.register(dto);
    const { refreshToken, ...payload } = result;
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { data: payload };
  }

  // ─── POST /auth/invite-assistant (JWT-protected, no DoctorProfileGuard) ──

  @UseGuards(JwtAuthGuard)
  @Post('invite-assistant')
  @HttpCode(HttpStatus.OK)
  async generateInvite(
    @GetUser('id') userId: string,
    @Body() dto: GenerateInviteDto,
  ) {
    const result = await this.authService.generateAssistantInvite(userId, dto);
    return { data: result };
  }

  // ─── GET /auth/invite-info?token=... ─────────────────────────────────────

  @Public()
  @Get('invite-info')
  async getInviteInfo(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Token is required');
    const result = await this.authService.getInviteInfo(token);
    return { data: result };
  }

  // ─── POST /auth/register-assistant (via invite link) ─────────────────────

  @Public()
  @Post('register-assistant')
  @HttpCode(HttpStatus.CREATED)
  async registerAssistant(
    @Body() dto: RegisterAssistantDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.registerAssistant(dto);
    const { refreshToken, ...payload } = result;
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { data: payload };
  }

  // ─── POST /auth/refresh ───────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const rawToken = cookies?.[REFRESH_COOKIE];

    if (!rawToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Refresh token not found',
      });
      return;
    }

    const result = await this.authService.refreshAccessToken(rawToken);
    return { data: result };
  }

  // ─── POST /auth/logout ────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const rawToken = cookies?.[REFRESH_COOKIE];
    await this.authService.logout(rawToken);
    res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTIONS });
    return { data: { success: true } };
  }

  // ─── POST /auth/forgot-password ───────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { data: { message: 'Jika email terdaftar, link reset telah dikirim.' } };
  }

  // ─── POST /auth/reset-password ────────────────────────────────────────────

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { data: { success: true } };
  }

  // ─── POST /auth/invite/accept (legacy email-invite flow) ─────────────────

  @Public()
  @Post('invite/accept')
  @HttpCode(HttpStatus.CREATED)
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.acceptInvite(dto);
    const { refreshToken, ...payload } = result;
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { data: payload };
  }
}
