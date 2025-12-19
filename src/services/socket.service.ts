import { io, Socket } from 'socket.io-client';
import { ChatMessage, parseSocketMessage } from '../types';

/**
 * Connection change callback
 */
export type ConnectionChangeCallback = (connected: boolean) => void;

/**
 * Message received callback
 */
export type MessageCallback = (message: ChatMessage) => void;

/**
 * Typing indicator callback
 */
export type TypingCallback = (isTyping: boolean) => void;

/**
 * Browser key update callback
 */
export type BrowserKeyUpdateCallback = (browserKey: string) => void;

/**
 * Socket.IO service for real-time chat messaging
 */
export class ChatSocketService {
  private socket: Socket | null = null;
  private currentBrowserKey: string | null = null;
  private enableLogging: boolean;

  // Event callbacks
  private connectionCallbacks: Set<ConnectionChangeCallback> = new Set();
  private messageCallbacks: Set<MessageCallback> = new Set();
  private typingCallbacks: Set<TypingCallback> = new Set();
  private browserKeyCallbacks: Set<BrowserKeyUpdateCallback> = new Set();

  constructor(enableLogging = false) {
    this.enableLogging = enableLogging;
  }

  /**
   * Current connection status
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Current browser key
   */
  get browserKey(): string | null {
    return this.currentBrowserKey;
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string): void {
    if (this.enableLogging) {
      console.log(`[FCRM Socket] ${message}`);
    }
  }

  /**
   * Connect to socket server
   */
  connect(socketUrl: string, apiKey: string, browserKey?: string): void {
    if (this.socket?.connected) {
      this.log('Already connected');
      return;
    }

    this.log(`Connecting to: ${socketUrl}`);

    const authData: Record<string, string> = {
      key: apiKey,
    };

    if (browserKey) {
      authData.browser_key = browserKey;
      this.currentBrowserKey = browserKey;
    }

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      auth: authData,
    });

    this.setupListeners();
  }

  /**
   * Setup socket event listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connect', () => {
      this.log(`Connected: ${this.socket?.id}`);
      this.notifyConnectionChange(true);

      // Join chat room if browser key exists
      if (this.currentBrowserKey) {
        this.joinChatRoom(this.currentBrowserKey);
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      this.log(`Connection error: ${error.message}`);
      this.notifyConnectionChange(false);
    });

    // Disconnected
    this.socket.on('disconnect', (reason) => {
      this.log(`Disconnected: ${reason}`);
      this.notifyConnectionChange(false);
    });

    // Reconnection attempt
    this.socket.io.on('reconnect_attempt', (attemptNumber) => {
      this.log(`Reconnection attempt: ${attemptNumber}`);
    });

    // Reconnected
    this.socket.io.on('reconnect', (attemptNumber) => {
      this.log(`Reconnected after ${attemptNumber} attempts`);
      this.notifyConnectionChange(true);

      // Rejoin chat room
      if (this.currentBrowserKey) {
        this.joinChatRoom(this.currentBrowserKey);
      }
    });

    // Laravel broadcast messages (Chat App)
    // Listen for both formats: colons (from backend) and backslashes (legacy)
    this.socket.on('App:Events:Chat:MessageEvent', (data: unknown) => {
      this.handleMessage(data, 'colon format');
    });

    // Legacy backslash format (for backward compatibility)
    this.socket.on('App\\Events\\Chat\\MessageEvent', (data: unknown) => {
      this.handleMessage(data, 'backslash format');
    });

    // Telegram messages (colon format from backend)
    this.socket.on('App:Events:Telegram:MessageEvent', (data: unknown) => {
      this.handleMessage(data, 'telegram colon format');
    });

    // Telegram messages (legacy backslash format)
    this.socket.on('App\\Events\\Telegram\\MessageEvent', (data: unknown) => {
      this.handleMessage(data, 'telegram backslash format');
    });

    // Message edited event
    this.socket.on('App:Events:Chat:MessageEditedEvent', (data: unknown) => {
      this.handleMessage(data, 'edited message');
    });

    // Typing indicator
    this.socket.on('typing', (data: unknown) => {
      const isTyping =
        typeof data === 'object' && data !== null && (data as Record<string, unknown>).isTyping === true;
      this.log(`Typing: ${isTyping}`);
      this.notifyTyping(isTyping);
    });

    // User joined
    this.socket.on('user-joined', (data: unknown) => {
      this.log(`User joined: ${JSON.stringify(data)}`);
    });

    // User left
    this.socket.on('user-left', (data: unknown) => {
      this.log(`User left: ${JSON.stringify(data)}`);
    });

    // Authentication error
    this.socket.on('auth-error', (data: unknown) => {
      this.log(`Auth error: ${JSON.stringify(data)}`);
    });

    // Browser key updated
    this.socket.on('browser-key-updated', (data: unknown) => {
      if (typeof data === 'object' && data !== null) {
        const browserKey = (data as Record<string, unknown>).browser_key;
        if (typeof browserKey === 'string') {
          this.log(`Browser key updated: ${browserKey}`);
          this.currentBrowserKey = browserKey;
          this.notifyBrowserKeyUpdate(browserKey);
        }
      }
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: unknown, format: string): void {
    this.log(`Message received (${format}): ${JSON.stringify(data)}`);
    try {
      const messageData = typeof data === 'object' && data !== null ? data : { message: data };
      const socketMessage = parseSocketMessage(messageData as Record<string, unknown>);
      this.notifyMessage(socketMessage.message);
    } catch (e) {
      this.log(`Error parsing message: ${e}`);
    }
  }

  /**
   * Notify all connection change callbacks
   */
  private notifyConnectionChange(connected: boolean): void {
    this.connectionCallbacks.forEach((callback) => callback(connected));
  }

  /**
   * Notify all message callbacks
   */
  private notifyMessage(message: ChatMessage): void {
    this.messageCallbacks.forEach((callback) => callback(message));
  }

  /**
   * Notify all typing callbacks
   */
  private notifyTyping(isTyping: boolean): void {
    this.typingCallbacks.forEach((callback) => callback(isTyping));
  }

  /**
   * Notify all browser key update callbacks
   */
  private notifyBrowserKeyUpdate(browserKey: string): void {
    this.browserKeyCallbacks.forEach((callback) => callback(browserKey));
  }

  /**
   * Subscribe to connection changes
   * @returns Unsubscribe function
   */
  onConnectionChange(callback: ConnectionChangeCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to incoming messages
   * @returns Unsubscribe function
   */
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to typing indicators
   * @returns Unsubscribe function
   */
  onTyping(callback: TypingCallback): () => void {
    this.typingCallbacks.add(callback);
    return () => {
      this.typingCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to browser key updates
   * @returns Unsubscribe function
   */
  onBrowserKeyUpdate(callback: BrowserKeyUpdateCallback): () => void {
    this.browserKeyCallbacks.add(callback);
    return () => {
      this.browserKeyCallbacks.delete(callback);
    };
  }

  /**
   * Join a chat room
   */
  joinChatRoom(browserKey: string): void {
    if (!this.socket?.connected) {
      this.log('Cannot join room - not connected');
      return;
    }

    // Use underscore format to match backend channel naming
    const roomName = `private-chat_${browserKey}`;
    this.socket.emit('join', roomName);
    this.currentBrowserKey = browserKey;
    this.log(`Joined room: ${roomName}`);
  }

  /**
   * Leave a chat room
   */
  leaveChatRoom(browserKey: string): void {
    if (!this.socket?.connected) return;

    // Use underscore format to match backend channel naming
    const roomName = `private-chat_${browserKey}`;
    this.socket.emit('leave', roomName);
    this.log(`Left room: ${roomName}`);
  }

  /**
   * Send typing indicator
   */
  sendTyping(browserKey: string, isTyping: boolean): void {
    if (!this.socket?.connected) return;

    this.socket.emit('typing', {
      browser_key: browserKey,
      isTyping,
    });
  }

  /**
   * Update browser key and rejoin room
   */
  updateBrowserKey(browserKey: string): void {
    if (browserKey === this.currentBrowserKey) return;

    // Leave old room
    if (this.currentBrowserKey && this.socket?.connected) {
      this.leaveChatRoom(this.currentBrowserKey);
    }

    this.currentBrowserKey = browserKey;

    // Join new room
    if (this.socket?.connected) {
      this.joinChatRoom(browserKey);
    }
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: string): void {
    if (!this.socket?.connected) {
      this.log('Cannot subscribe - not connected');
      return;
    }

    this.socket.emit('join', channel);
    this.log(`Subscribed to: ${channel}`);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('leave', channel);
    this.log(`Unsubscribed from: ${channel}`);
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentBrowserKey = null;
      this.notifyConnectionChange(false);
      this.log('Disconnected');
    }
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.disconnect();
    this.connectionCallbacks.clear();
    this.messageCallbacks.clear();
    this.typingCallbacks.clear();
    this.browserKeyCallbacks.clear();
  }
}
