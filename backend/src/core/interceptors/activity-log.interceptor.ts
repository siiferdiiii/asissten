import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { LOG_ACTIVITY_KEY } from '../decorators/log-activity.decorator';
import { RequestWithUser } from '../types/request.types';
import { ActivityAction } from '@prisma/client';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const entityType = this.reflector.getAllAndOverride<string>(LOG_ACTIVITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!entityType) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<RequestWithUser>();
    const method = req.method;

    let action: ActivityAction | null = null;
    if (method === 'POST') {
      action = ActivityAction.create;
    } else if (method === 'PUT' || method === 'PATCH') {
      action = ActivityAction.update;
    } else if (method === 'DELETE') {
      action = ActivityAction.delete;
    }

    return next.handle().pipe(
      tap({
        next: async (res) => {
          if (!action) return;

          // Attempt to extract the entity ID from response
          // Response can be { success: true, data: { id: ... } } or just the entity itself { id: ... }
          let entityId = '';
          if (res) {
            if (res.id) {
              entityId = res.id;
            } else if (res.data && res.data.id) {
              entityId = res.data.id;
            }
          }

          // If it's a mutation and we have the entity ID in req.params, we can fallback to that if response doesn't have it
          const paramId = req.params['id'] || req.params['tripId'] || req.params['eventId'];
          if (!entityId && paramId) {
            entityId = paramId as string;
          }

          const actorUserId = req.user?.id;
          const doctorProfileId = req.membership?.doctorProfileId;

          if (actorUserId && doctorProfileId && entityId) {
            try {
              await this.prisma.activityLog.create({
                data: {
                  doctorProfileId,
                  actorUserId,
                  action,
                  entityType,
                  entityId,
                },
              });
            } catch (error) {
              console.error('Failed to log activity:', error);
            }
          }
        },
      }),
    );
  }
}
