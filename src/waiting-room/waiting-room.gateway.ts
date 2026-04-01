import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/waiting-room',
})
export class WaitingRoomGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WaitingRoomGateway.name);

  // Map userId → Set của socket IDs (hỗ trợ multi-tab)
  private userSockets = new Map<string, Set<string>>();
  private readonly MAX_CONNECTIONS_PER_USER = 3;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('WaitingRoomGateway initialized');
  }

  // ─── Connection lifecycle ──────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      // Auth pattern giống payment-events.gateway.ts: cookie → auth → query
      const token =
        client.handshake.headers.cookie
          ?.split('; ')
          .find((c) => c.startsWith('access_token='))
          ?.split('=')
          .slice(1)
          .join('=') ||
        client.handshake.auth?.token ||
        client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`WR client ${client.id} - No token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token as string, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub || payload.id;
      client.data.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }

      const userConnections = this.userSockets.get(userId);

      // Giới hạn số connection đồng thời — disconnect oldest nếu vượt giới hạn
      if (userConnections.size >= this.MAX_CONNECTIONS_PER_USER) {
        const oldestSocketId = Array.from(userConnections)[0];
        const oldestSocket = this.server.sockets.sockets.get(oldestSocketId);
        if (oldestSocket) {
          this.logger.warn(
            `WR: User ${userId} vượt giới hạn connection. Ngắt kết nối cũ nhất ${oldestSocketId}`,
          );
          oldestSocket.disconnect(true);
        }
        userConnections.delete(oldestSocketId);
      }

      userConnections.add(client.id);
      this.logger.log(`WR client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.error(`WR connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string;
    const eventId = client.data.eventId as string | undefined;

    if (!userId) return;

    // Dọn userSockets map
    const connections = this.userSockets.get(userId);
    if (connections) {
      connections.delete(client.id);
      if (connections.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`WR client disconnected: ${client.id} (user: ${userId})`);

    // Nếu user đang trong waiting room của một event → publish cleanup delayed 60s
    // Consumer sẽ check lại sau 60s: nếu vẫn disconnect → ZREM khỏi queue
    // Grace period 60s cho phép multi-tab reconnect trước khi bị xóa
    if (eventId && !this.isUserConnected(userId, eventId)) {
      this.amqpConnection.publish(
        'delayed-exchange',
        'wr.disconnect',
        { userId, eventId },
        { headers: { 'x-delay': 60_000 } },
      );
      this.logger.log(
        `WR: Scheduled disconnect cleanup (60s) for user ${userId}, event ${eventId}`,
      );
    }
  }

  // ─── Client-emitted events ─────────────────────────────────────────────────

  /**
   * Client emit sau khi join queue hoặc reconnect.
   * Join vào 2 rooms: room cá nhân (nhận your-turn) + room event (nhận queue-shrunk).
   */
  @SubscribeMessage('wr:join-room')
  handleJoinRoom(client: Socket, eventId: string) {
    const userId = client.data.userId as string;
    if (!userId || !eventId) return { success: false };

    // Lưu eventId để dùng khi disconnect
    client.data.eventId = eventId;

    // Room cá nhân: nhận emitYourTurn
    client.join(`wr:user:${userId}:${eventId}`);
    // Room event-level: nhận emitQueueShrunk (broadcast)
    client.join(`wr:event:${eventId}`);

    this.logger.log(`WR: User ${userId} joined rooms for event ${eventId}`);
    return { success: true };
  }

  @SubscribeMessage('wr:leave-room')
  handleLeaveRoom(client: Socket, eventId: string) {
    const userId = client.data.userId as string;
    if (!userId || !eventId) return { success: false };

    client.leave(`wr:user:${userId}:${eventId}`);
    client.leave(`wr:event:${eventId}`);
    client.data.eventId = undefined;

    return { success: true };
  }

  // ─── Methods gọi từ WaitingRoomService ────────────────────────────────────

  /**
   * Emit "đến lượt" cho user cụ thể.
   * Emit vào room cá nhân `wr:user:{userId}:{eventId}` — hoạt động đúng trên multi-instance
   * nhờ Redis adapter.
   */
  emitYourTurn(
    userId: string,
    eventId: string,
    data: {
      token: string;
      ttl: number;
      ticketTypeId?: string;
      quantity?: number;
    },
  ): void {
    this.server.to(`wr:user:${userId}:${eventId}`).emit('wr:your-turn', {
      ...data,
      eventId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast event-level khi queue giảm (Option B — Section 12-C).
   * Thay vì emit position từng user (N×5000), chỉ emit 1 event cho toàn bộ room.
   * Client nhận totalInQueue và tự estimate lại thứ tự chờ.
   * Nếu cần position chính xác → client gọi GET /waiting-room/status/:eventId.
   */
  emitQueueShrunk(eventId: string, data: { totalInQueue: number }): void {
    this.server.to(`wr:event:${eventId}`).emit('wr:queue-shrunk', {
      ...data,
      eventId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check user còn ít nhất 1 socket kết nối trong event cụ thể.
   * Dùng bởi WrDisconnectConsumer để quyết định có ZREM hay không.
   */
  isUserConnected(userId: string, eventId: string): boolean {
    const connections = this.userSockets.get(userId);
    if (!connections || connections.size === 0) return false;

    // Kiểm tra ít nhất 1 socket đang ở trong room của event này
    for (const socketId of connections) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket?.rooms.has(`wr:user:${userId}:${eventId}`)) return true;
    }
    return false;
  }
}
