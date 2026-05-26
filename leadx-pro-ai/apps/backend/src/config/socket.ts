import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/token';
import { env } from './environment';
import { logger } from '../utils/logger';

class SocketService {
  private io: Server | null = null;
  private userSockets: Map<number, Set<string>> = new Map();

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const payload = verifyAccessToken(token);
        (socket as any).userId = payload.userId;
        (socket as any).userRole = payload.role;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = (socket as any).userId as number;

      // Track user socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Join user-specific room
      socket.join(`user:${userId}`);

      logger.info(`Socket connected: ${socket.id} (user: ${userId})`);

      // Handle job subscription
      socket.on('subscribe:job', (jobId: number) => {
        socket.join(`job:${jobId}`);
        logger.debug(`Socket ${socket.id} subscribed to job ${jobId}`);
      });

      socket.on('unsubscribe:job', (jobId: number) => {
        socket.leave(`job:${jobId}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(userId);
          }
        }
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    logger.info('Socket.IO server initialized');
    return this.io;
  }

  /**
   * Emit event to a specific user
   */
  emitToUser(userId: number, event: string, data: unknown): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  /**
   * Emit event to all subscribers of a specific job
   */
  emitToJob(jobId: number, event: string, data: unknown): void {
    if (this.io) {
      this.io.to(`job:${jobId}`).emit(event, data);
    }
  }

  /**
   * Emit to all connected clients
   */
  emitToAll(event: string, data: unknown): void {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Get connected user count
   */
  getConnectedCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get the Socket.IO server instance
   */
  getIO(): Server | null {
    return this.io;
  }
}

export const socketService = new SocketService();
