import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';
import { Observable } from 'lib0/observable';

export interface RemoteUserState {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    color?: string;
    line?: number;
    column?: number;
  };
}

/**
 * CollaborativeEditorService - Manages Yjs document, WebSocket provider, and awareness
 * Provides real-time collaboration with CRDT conflict resolution
 * 
 * 🔥 FIX for Issue #61: Late-joining students now receive existing code content
 */
export class CollaborativeEditorService extends Observable {
  private doc: Y.Doc;
  private provider: WebsocketProvider | null = null;
  private yText: Y.Text;
  private awareness: Awareness | null = null;
  private sessionId: string;
  private userId: string;
  private userName: string = 'Anonymous';
  private userEmail: string = '';
  private connected: boolean = false;
  private wsUrl: string = 'ws://localhost:1234';
  private syncAttempts: number = 0;
  private maxSyncAttempts: number = 5;
  private syncRetryTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.doc = new Y.Doc();
    this.yText = this.doc.getText('monaco');
    this.sessionId = '';
    this.userId = '';
  }

  /**
   * Initialize collaborative session with enhanced sync for late joiners
   */
  async initialize(
    sessionId: string,
    userId: string,
    wsUrl?: string,
    userName?: string,
    userEmail?: string
  ): Promise<void> {
    this.sessionId = sessionId;
    this.userId = userId;
    this.userName = userName || 'Anonymous';
    this.userEmail = userEmail || '';
    this.wsUrl = wsUrl || 'ws://localhost:1234';
    this.syncAttempts = 0;

    console.log('🚀 [COLLAB] Initializing collaborative session:', { 
      sessionId, 
      userId, 
      userName,
      wsUrl: this.wsUrl 
    });

    try {
      // Create WebSocket provider
      this.provider = new WebsocketProvider(
        this.wsUrl,
        `session-${sessionId}`,
        this.doc
      );

      // Get awareness instance
      this.awareness = this.provider.awareness;

      // Set local user state
      this.awareness.setLocalState({
        user: {
          id: this.userId,
          name: this.userName,
          email: this.userEmail,
          color: this.getRandomColor(),
          line: 1,
          column: 1,
        },
      });

      // ✅ 🔥 CRITICAL FIX #1: Force sync when connection is established
      this.provider.on('status', (event: { status: string }) => {
        console.log('🔵 [COLLAB] Provider Status:', event.status);
        
        if (event.status === 'connected') {
          this.connected = true;
          this.syncAttempts = 0;
          console.log('✅ [COLLAB] Connected to Yjs server');
          
          // 🔥 CRITICAL: Force full sync for late joiners
          this.forceSync();
          
          // Emit status event
          this.emit('status', [{ status: 'connected' }]);
        } else if (event.status === 'disconnected') {
          this.connected = false;
          console.log('❌ [COLLAB] Disconnected from Yjs server');
          this.emit('status', [{ status: 'disconnected' }]);
        }
      });

      // ✅ 🔥 CRITICAL FIX #2: Monitor sync and retry if document is empty
      this.provider.on('sync', (isSynced: boolean) => {
        console.log('🔄 [COLLAB] Sync status:', isSynced, 'Document length:', this.yText.length);
        
        if (isSynced) {
          // Check if document has content
          if (this.yText.length === 0) {
            console.log('⚠️ [COLLAB] Document is empty despite sync!');
            this.handleEmptyDocument();
          } else {
            console.log('✅ [COLLAB] Document synced successfully! Length:', this.yText.length);
            this.syncAttempts = 0; // Reset attempts on success
          }
        } else {
          console.log('🔄 [COLLAB] Waiting for sync...');
        }
      });

      // ✅ 🔥 CRITICAL FIX #3: Handle awareness changes
      this.awareness.on('change', () => {
        const states = this.awareness?.getStates();
        if (states) {
          const remoteUsers: RemoteUserState[] = [];
          states.forEach((state: any, clientId: number) => {
            if (clientId !== this.awareness?.clientID && state.user) {
              remoteUsers.push({ user: state.user });
            }
          });
          this.emit('awareness', [remoteUsers]);
        }
      });

      // ✅ 🔥 CRITICAL FIX #4: Wait for connection with timeout
      await this.waitForConnection();

      // ✅ 🔥 CRITICAL FIX #5: Final sync check after connection
      await this.ensureDocumentSynced();

      console.log('✅ [COLLAB] Initialization complete. Document length:', this.yText.length);
      
    } catch (error) {
      console.error('❌ [COLLAB] Initialization failed:', error);
      this.emit('error', [error]);
      throw error;
    }
  }

  /**
   * Force sync with retry mechanism
   */
  private forceSync(): void {
    if (!this.provider) return;
    
    console.log('🔄 [COLLAB] Forcing sync...');
    this.provider.sync(true);
    
    // Also request sync from awareness
    if (this.awareness) {
      this.awareness.setLocalState({
        ...this.awareness.getLocalState(),
        user: {
          ...this.awareness.getLocalState()?.user,
          syncRequest: Date.now(),
        },
      });
    }
  }

  /**
   * Handle empty document after sync
   */
  private handleEmptyDocument(): void {
    this.syncAttempts++;
    console.log(`⚠️ [COLLAB] Empty document detected (attempt ${this.syncAttempts}/${this.maxSyncAttempts})`);
    
    if (this.syncAttempts <= this.maxSyncAttempts) {
      // Clear existing timer
      if (this.syncRetryTimer) {
        clearTimeout(this.syncRetryTimer);
      }
      
      // Retry sync with exponential backoff
      const delay = Math.min(500 * Math.pow(2, this.syncAttempts - 1), 5000);
      console.log(`🔄 [COLLAB] Retrying sync in ${delay}ms...`);
      
      this.syncRetryTimer = setTimeout(() => {
        if (this.provider) {
          console.log(`🔄 [COLLAB] Retry ${this.syncAttempts}: Forcing sync...`);
          this.provider.sync(true);
          
          // Also try to request from other peers
          if (this.awareness) {
            this.awareness.setLocalState({
              ...this.awareness.getLocalState(),
              user: {
                ...this.awareness.getLocalState()?.user,
                requestSync: true,
                requestTime: Date.now(),
              },
            });
          }
        }
      }, delay);
    } else {
      console.warn('⚠️ [COLLAB] Max sync attempts reached. Document may be empty.');
      this.emit('warning', [{ message: 'Could not sync document content' }]);
    }
  }

  /**
   * Wait for connection with timeout
   */
  private waitForConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout after 10 seconds'));
      }, 10000);

      if (this.connected) {
        clearTimeout(timeout);
        resolve();
      } else {
        this.provider?.on('status', function onStatus(event: { status: string }) {
          if (event.status === 'connected') {
            this.off('status', onStatus);
            clearTimeout(timeout);
            resolve();
          }
        });
      }
    });
  }

  /**
   * Ensure document is synced after connection
   */
  private async ensureDocumentSynced(): Promise<void> {
    // Wait a bit for sync to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if document has content
    if (this.yText.length === 0 && this.connected) {
      console.log('🔄 [COLLAB] Document still empty, forcing final sync...');
      this.forceSync();
      
      // Wait another second
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check again
      if (this.yText.length === 0) {
        console.warn('⚠️ [COLLAB] Document remains empty after final sync attempt');
      }
    }
  }

  /**
   * Get shared Y.Text instance
   */
  getSharedText(): Y.Text {
    return this.yText;
  }

  /**
   * Get Yjs document
   */
  getDocument(): Y.Doc {
    return this.doc;
  }

  /**
   * Get WebSocket provider
   */
  getProvider(): WebsocketProvider | null {
    return this.provider;
  }

  /**
   * Get awareness instance
   */
  getAwareness(): Awareness | null {
    return this.awareness;
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get remote users
   */
  getRemoteUsers(): RemoteUserState[] {
    if (!this.awareness) return [];
    
    const states = this.awareness.getStates();
    const remoteUsers: RemoteUserState[] = [];
    states.forEach((state: any, clientId: number) => {
      if (clientId !== this.awareness?.clientID && state.user) {
        remoteUsers.push({ user: state.user });
      }
    });
    return remoteUsers;
  }

  /**
   * Update cursor position
   */
  updateCursor(line: number, column: number): void {
    if (!this.awareness) return;
    
    const localState = this.awareness.getLocalState();
    if (localState) {
      this.awareness.setLocalState({
        ...localState,
        user: {
          ...localState.user,
          line,
          column,
        },
      });
    }
  }

  /**
   * Observe remote awareness changes
   */
  observeRemoteAwareness(callback: (remoteUsers: RemoteUserState[]) => void): () => void {
    const handler = () => {
      const remoteUsers = this.getRemoteUsers();
      callback(remoteUsers);
    };
    
    this.awareness?.on('change', handler);
    
    // Return unsubscribe function
    return () => {
      this.awareness?.off('change', handler);
    };
  }

  /**
   * Destroy instance and cleanup
   */
  destroy(): void {
    console.log('🧹 [COLLAB] Destroying collaborative editor service');
    
    // Clear retry timer
    if (this.syncRetryTimer) {
      clearTimeout(this.syncRetryTimer);
      this.syncRetryTimer = null;
    }
    
    if (this.provider) {
      try {
        this.provider.destroy();
      } catch (error) {
        console.error('Error destroying provider:', error);
      }
    }
    
    if (this.doc) {
      try {
        this.doc.destroy();
      } catch (error) {
        console.error('Error destroying document:', error);
      }
    }
    
    this.provider = null;
    this.awareness = null;
    this.connected = false;
    this.syncAttempts = 0;
  }

  /**
   * Get random color for user
   */
  private getRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#FF9F43', '#00D2D3',
      '#FF6B6B', '#A29BFE', '#FD79A8', '#FDCB6E',
      '#6C5CE7', '#00B894', '#E17055', '#0984E3',
      '#F368E0', '#00CEC9', '#FF7675', '#74B9FF'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

/**
 * Factory function to create new instance
 */
export function createNewCollaborativeEditorService(): CollaborativeEditorService {
  return new CollaborativeEditorService();
}

export default CollaborativeEditorService;