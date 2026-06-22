import { io, Socket } from 'socket.io-client';
import { SocketEvents, WhiteboardSegment, MessageAttachment } from '@/types';
import { useAuthStore } from '@/store';

const rawSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const SOCKET_URL = rawSocketUrl
  ? rawSocketUrl.replace(/\/?$/, '')
  : apiUrl
  ? apiUrl.replace(/\/api\/?$/, '')
  : 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private currentSessionId: string | null = null;
  private connectionPromise: Promise<void> | null = null;
  private resolveConnection: (() => void) | null = null;

  connect(token: string): Promise<Socket> {
    if (this.socket?.connected) {
      console.log('Socket already connected:', this.socket.id);
      return Promise.resolve(this.socket);
    }

    if (this.connectionPromise) {
      console.log('🔌 Socket connection in progress, waiting...');
      return this.connectionPromise.then(() => this.socket as Socket);
    }

    // Create a promise for connection with timeout
    this.connectionPromise = new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        console.error('❌ Connection promise timed out after 30 seconds');
        if (token) {
          console.error('📍 Token provided:', token.substring(0, 20) + '...');
        }
        reject(new Error('Socket connection timeout'));
      }, 30000);

      this.resolveConnection = () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Connection promise resolved');
        resolve();
      };
    });

    console.log('🔌 Connecting to socket at:', SOCKET_URL);
    console.log('📍 Current location:', typeof window !== 'undefined' ? window.location.origin : 'server-side');
    console.log('📍 Environment:', process.env.NODE_ENV);
    this.socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      withCredentials: true,
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      reconnectionAttempts: 10,
      timeout: 15000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      console.log('📊 Connected via transport:', this.socket?.io?.engine?.transport?.name);
      if (this.resolveConnection) {
        this.resolveConnection();
      }

      // Join this user's personal notification room so server-side
      // notification:received events (e.g. session reminders, session ended) reach them
      const user = useAuthStore.getState().user;
      if (user?.id) {
        this.socket?.emit('user:join', user.id);
      }

      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      this.connectionPromise = null;
      this.resolveConnection = null;
      this.emit('disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.emit('error', error);
    });

    // Track connection attempt
    this.socket.io?.on('open', () => {
      console.log('🔓 Socket.IO connection opened');
    });

    this.socket.io?.engine?.on('upgrade', (transport: any) => {
      console.log('⬆️ Transport upgraded to:', transport.name);
    });

    this.socket.io?.engine?.on('upgradeError', (error: any) => {
      console.log('⬆️ Transport upgrade error:', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connect_error:', error);
      console.error('📍 Error message:', error.message);
      console.error('📍 Socket URL is:', SOCKET_URL);
      console.error('📍 Transport status:', {
        websocketActive: this.socket?.active,
        connected: this.socket?.connected,
        currentTransport: this.socket?.io?.engine?.transport?.name,
      });
      if (error.message.includes('Authentication')) {
        console.error('🔐 Auth failed - check token validity');
      } else if (error.message.includes('CORS')) {
        console.error('🚨 CORS error - backend origin mismatch');
      } else if (error.message.includes('timeout')) {
        console.error('⏱️ Connection timeout - backend may be down or websocket not supported');
      }
    });

    // Handle connection failure after max retries
    this.socket.on('connect_error', () => {
      const reconnectAttempt = this.socket?.io?.reconnectionAttempts() || 0;
      console.error(`📊 Reconnection attempt status: ${reconnectAttempt}`);
    });

    // Debug: Log all incoming events
    this.socket.onAny((eventName, ...args) => {
      console.log('🔔 Socket received event:', eventName, args);
    });

    // Screen share events
    this.socket.on('screen:started', (data) => {
      console.log('🖥️ Screen share started event received:', data);
      this.emit('screen:started', data);
    });

    this.socket.on('screen:stopped', (data) => {
      console.log('🛑 Screen share stopped event received:', data);
      this.emit('screen:stopped', data);
    });

    return this.connectionPromise.then(() => this.socket as Socket);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Public getter for debugging
  getSocket() {
    return this.socket;
  }

  async waitForConnection(timeoutMs: number = 10000): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    if (!this.connectionPromise) {
      return Promise.reject(new Error('Socket not initialized'));
    }

    return Promise.race([
      this.connectionPromise,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Socket connection timeout')), timeoutMs)
      ),
    ]);
  }

  on<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void) {
    if (!this.socket) {
      console.warn(`Socket not initialized for event: ${event}`);
      return;
    }
    
    console.log(`🎧 Registering listener for event: ${event}`);
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)!.push(callback);
    this.socket.on(event as string, callback);
  }

  off<K extends keyof SocketEvents>(event: K, callback?: (data: SocketEvents[K]) => void) {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off(event as string, callback);
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      // Remove all listeners for this event
      this.socket.off(event as string);
      this.listeners.delete(event);
    }
  }

  offAll<K extends keyof SocketEvents>(event: K) {
    if (!this.socket) return;
    this.socket.off(event as string);
    this.listeners.delete(event);
  }

  emit<K extends keyof SocketEvents>(event: K, data?: SocketEvents[K]) {
    if (!this.socket) {
      console.warn(`⚠️ Socket not initialized for event: ${event}`, data);
      return;
    }
    
    console.log(`🔍 [EMIT-CHECK] Event: ${event}, Socket connected: ${this.socket.connected}, Socket ID: ${this.socket.id}`);
    
    // If socket is connected, emit immediately
    if (this.socket.connected) {
      console.log(`✅ [EMIT-NOW] Socket connected, EMITTING event: ${event}`, data);
      this.socket.emit(event as string, data);
      return;
    }
    
    // Socket exists but NOT connected - MUST queue it
    console.warn(`⚠️ [EMIT-QUEUE] Socket NOT connected for event: ${event}`, { 
      socketId: this.socket.id,
      socketConnected: this.socket.connected,
      socketReadyState: (this.socket.io?.engine as any)?.readyState,
      hasConnectionPromise: !!this.connectionPromise,
    });
    
    // Try waiting for connection promise first
    if (this.connectionPromise) {
      console.log(`⏳ [EMIT-QUEUE] Connection promise exists, waiting...`);
      this.connectionPromise.then(() => {
        if (this.socket?.connected) {
          console.log(`✅ [EMIT-DELAYED] Socket now connected after promise! Emitting: ${event}`);
          this.socket!.emit(event as string, data);
        } else {
          console.error(`❌ [EMIT-FAILED] Socket STILL not connected after promise resolved for: ${event}`);
          console.log(`❌ [EMIT-DEBUG] Socket state:`, {
            exists: !!this.socket,
            connected: this.socket?.connected,
            id: this.socket?.id,
          });
        }
      }).catch(err => {
        console.error(`❌ [EMIT-FAILED] Connection promise rejected for event: ${event}`, err);
      });
      return;
    }
    
    // No connection promise - manually retry with exponential backoff
    console.log(`⏳ [EMIT-RETRY] No connection promise, setting up manual retry polling...`);
    let retries = 0;
    const maxRetries = 40; // 40 * 100ms = 4 seconds with exponential backoff
    let retryDelay = 100;
    
    const attemptEmit = () => {
      retries++;
      const currentDelay = Math.min(retryDelay * retries, 1000); // Cap at 1 second
      
      if (this.socket?.connected) {
        console.log(`✅ [EMIT-RETRY-SUCCESS] Socket NOW connected on attempt ${retries}! Emitting: ${event}`);
        this.socket.emit(event as string, data);
        return; // Success - stop retrying
      } else if (retries >= maxRetries) {
        console.error(`❌ [EMIT-FAILED] Gave up after ${maxRetries} attempts (${(maxRetries * 125) / 1000}s): ${event}`);
        console.error(`❌ [EMIT-FINAL-STATE]`, {
          socketExists: !!this.socket,
          socketConnected: this.socket?.connected,
          socketId: this.socket?.id,
          readyState: (this.socket?.io?.engine as any)?.readyState,
        });
        return; // Give up
      }
      
      // Schedule next retry
      setTimeout(attemptEmit, currentDelay);
    };
    
    // Start retry loop
    attemptEmit();
  }

  // Session management
  joinSession(sessionId: string) {
    this.currentSessionId = sessionId;
    const user = useAuthStore.getState().user;
    this.emit('session:join', { sessionId, userId: user?.id, userName: user?.name } as any);
  }

  leaveSession(sessionId: string) {
    const user = useAuthStore.getState().user;
    this.emit('session:leave', { sessionId, userId: user?.id } as any);
    this.currentSessionId = null;
  }

  endSession(sessionId: string, mentorId?: string, studentId?: string) {
    this.emit('session:ended', { sessionId, mentorId, studentId } as any);
  }

  // Chat
  sendMessage(content: string, attachment?: MessageAttachment) {
    console.log('📤 SocketService.sendMessage called:', content, attachment);
    const user = useAuthStore.getState().user;
    const data = {
      // `type` stays 'text' even with an attachment — it's an orthogonal field
      // (content format: text/code_snippet/system) backed by a fixed Postgres
      // enum; attachment presence alone signals "this message has a file".
      content,
      sessionId: this.currentSessionId,
      userId: user?.id,
      type: 'text',
      attachment,
    };
    console.log('📡 Emitting message:send event:', data);
    this.emit('message:send', data as any);
  }

  // Code Editor
  sendCode(code: string, language: string, sessionId?: string) {
    const user = useAuthStore.getState().user;
    this.emit('code:update', { 
      code, 
      language, 
      sessionId: sessionId || this.currentSessionId,
      userId: user?.id 
    } as any);
  }

  moveCursor(line: number, column: number) {
    const user = useAuthStore.getState().user;
    this.emit('cursor:move', { 
      line, 
      column, 
      sessionId: this.currentSessionId,
      userId: user?.id
    } as any);
  }

  // Whiteboard
  sendWhiteboardDraw(segment: WhiteboardSegment, sessionId?: string) {
    this.emit('whiteboard:draw', {
      segment,
      sessionId: sessionId || this.currentSessionId,
    } as any);
  }

  clearWhiteboard(sessionId?: string) {
    this.emit('whiteboard:clear', {
      sessionId: sessionId || this.currentSessionId,
    } as any);
  }

  // Video
  toggleCamera() {
    const user = useAuthStore.getState().user;
    this.emit('video:toggle-camera', { userId: user?.id } as any);
  }

  toggleMic() {
    const user = useAuthStore.getState().user;
    this.emit('video:toggle-mic', { userId: user?.id } as any);
  }

  sendVideoOffer(offer: any) {
    this.emit('video:offer', { offer } as any);
  }

  sendVideoAnswer(answer: any) {
    this.emit('video:answer', { answer } as any);
  }

  sendICECandidate(candidate: any) {
    this.emit('video:ice-candidate', candidate as any);
  }

  // Screen Share
  startScreenShare() {
    const user = useAuthStore.getState().user;
    const data = { userId: user?.id, sessionId: this.currentSessionId } as any;
    console.log('📡 SocketService.startScreenShare emitting:', data);
    this.emit('screen:started', data);
  }

  stopScreenShare() {
    const user = useAuthStore.getState().user;
    this.emit('screen:stopped', { userId: user?.id, sessionId: this.currentSessionId } as any);
  }
}

export const socketService = new SocketService();
