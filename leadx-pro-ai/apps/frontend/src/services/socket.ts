import { io, Socket } from 'socket.io-client';

/**
 * Socket.io client service for real-time updates.
 * Connects to the backend WebSocket server using the user's JWT token.
 */
class SocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  /**
   * Connect to the WebSocket server with auth token
   */
  connect(): void {
    if (this.socket?.connected) return;

    const tokens = localStorage.getItem('tokens');
    if (!tokens) return;

    const { accessToken } = JSON.parse(tokens);

    this.socket = io('/', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      // Re-attach all stored listeners after reconnection
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((cb) => this.socket?.on(event, cb));
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * Subscribe to a specific job's updates
   */
  subscribeToJob(jobId: number): void {
    this.socket?.emit('subscribe:job', jobId);
  }

  /**
   * Unsubscribe from a specific job's updates
   */
  unsubscribeFromJob(jobId: number): void {
    this.socket?.emit('unsubscribe:job', jobId);
  }

  /**
   * Listen to a socket event. Stores the listener so it survives reconnections.
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback);
  }

  /**
   * Remove a specific listener for an event
   */
  off(event: string, callback: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  /**
   * Check if socket is connected
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketClient = new SocketClient();
