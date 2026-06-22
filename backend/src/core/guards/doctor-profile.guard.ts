import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RequestWithUser } from '../types/request.types';
import { MembershipStatus } from '@prisma/client';

/**
 * DoctorProfileGuard:
 * - Extracts doctorProfileId from params, query, or body
 * - Checks that req.user has an active membership for that doctorProfile
 * - Injects the membership into req.membership
 *
 * Must be used AFTER JwtAuthGuard.
 */
@Injectable()
export class DoctorProfileGuard implements CanActivate {
  private readonly logger = new Logger(DoctorProfileGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;

    const doctorProfileId =
      (req.params['doctorProfileId'] as string | undefined) ??
      (req.params['id'] as string | undefined) ??
      (req.query['doctorProfileId'] as string | undefined) ??
      ((req.body as Record<string, unknown>)['doctorProfileId'] as string | undefined);

    if (!doctorProfileId) {
      throw new BadRequestException('doctorProfileId is required');
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: user.id,
        doctorProfileId,
        status: MembershipStatus.active,
      },
    });

    if (!membership) {
      this.logger.warn(
        `User ${user.id} attempted to access doctorProfile ${doctorProfileId} without active membership`,
      );
      throw new ForbiddenException('You do not have access to this doctor profile');
    }

    req.membership = {
      id: membership.id,
      userId: membership.userId,
      doctorProfileId: membership.doctorProfileId,
      role: membership.role,
      status: membership.status,
    };

    return true;
  }
}
