import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token =
        (socket.handshake.auth as Record<string, string>)?.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });

      const userId = payload.sub;

      const memberships = await this.prisma.membership.findMany({
        where: { userId, status: MembershipStatus.active },
        select: { doctorProfileId: true },
      });

      // Join personal user room
      await socket.join(`user:${userId}`);

      // Join all doctor rooms where user is an active member
      for (const m of memberships) {
        await socket.join(`doctor:${m.doctorProfileId}`);
      }

      // Attach userId to socket data for reference
      socket.data.userId = userId;

      this.logger.log(
        `Socket connected: ${socket.id} — user ${userId} joined ${memberships.length + 1} room(s)`,
      );
    } catch {
      this.logger.warn(`Socket connection rejected — invalid token`);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket): void {
    this.logger.log(`Socket disconnected: ${socket.id}`);
  }

  /**
   * Emit an event to a specific doctor room.
   */
  emitToDoctorRoom(doctorProfileId: string, event: string, payload: unknown): void {
    this.server.to(`doctor:${doctorProfileId}`).emit(event, payload);
  }

  /**
   * Emit an event to a specific user room (personal notifications).
   */
  emitToUserRoom(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
