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

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true, // Cho phép gửi cookie
  },
  namespace: '/payment-events',
})
export class PaymentEventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PaymentEventsGateway.name);
  private userSockets = new Map<string, Set<string>>();
  private readonly MAX_CONNECTIONS_PER_USER = 3;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async afterInit(server: Server) {
    this.logger.log('PaymentEventsGateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.headers.cookie
          ?.split('; ')
          .find((c) => c.startsWith('access_token='))
          ?.split('=')[1] ||
        client.handshake.auth?.token ||
        client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} - No token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub || payload.id;
      client.data.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }

      const userConnections = this.userSockets.get(userId);

      if (userConnections.size >= this.MAX_CONNECTIONS_PER_USER) {
        const oldestSocketId = Array.from(userConnections)[0];
        const oldestSocket = this.server.sockets.sockets.get(oldestSocketId);
        if (oldestSocket) {
          this.logger.warn(
            `User ${userId} exceeded connection limit. Disconnecting oldest connection ${oldestSocketId}`,
          );
          oldestSocket.disconnect(true);
        }
        userConnections.delete(oldestSocketId);
      }

      userConnections.add(client.id);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(client.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  @SubscribeMessage('subscribe-order')
  handleSubscribeOrder(client: Socket, orderId: string) {
    client.join(`order:${orderId}`);
    return { success: true, message: 'Subscribed to order updates' };
  }

  @SubscribeMessage('unsubscribe-order')
  handleUnsubscribeOrder(client: Socket, orderId: string) {
    client.leave(`order:${orderId}`);
    return { success: true, message: 'Unsubscribed from order updates' };
  }

  emitPaymentUpdate(userId: string, orderId: string, data: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit('payment-status', data);
      });
    }

    this.server.to(`order:${orderId}`).emit('payment-status', data);
  }

  emitPaymentCompleted(userId: string, orderId: string, orderData: any) {
    const data = {
      status: 'COMPLETED',
      orderId,
      timestamp: new Date().toISOString(),
      order: orderData,
    };

    this.emitPaymentUpdate(userId, orderId, data);
  }

  emitPaymentFailed(userId: string, orderId: string, reason?: string) {
    const data = {
      status: 'FAILED',
      orderId,
      reason,
      timestamp: new Date().toISOString(),
    };

    this.emitPaymentUpdate(userId, orderId, data);
  }
}
