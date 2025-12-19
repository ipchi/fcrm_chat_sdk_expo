import { ReactNode } from 'react';
import { CancelToken as CancelToken$1 } from 'axios';

/**
 * Message type enum
 */
type MessageType = 'user' | 'admin' | 'ai' | 'system';
/**
 * Parse message type from string
 */
declare function parseMessageType(value: string | undefined): MessageType;
/**
 * Chat message model
 */
interface ChatMessage {
    id: number;
    chatId: number;
    content: string;
    type: MessageType;
    senderName?: string;
    senderType?: string;
    createdAt: Date;
    updatedAt?: Date;
    isRead: boolean;
    readAt?: Date;
    metadata?: Record<string, unknown>;
}
/**
 * Socket message wrapper
 */
interface SocketMessage {
    event?: string;
    message: ChatMessage;
}
/**
 * Paginated messages response
 */
interface PaginatedMessages {
    messages: ChatMessage[];
    total: number;
    currentPage: number;
    perPage: number;
    lastPage: number;
    hasMore: boolean;
}
/**
 * Parse ChatMessage from JSON
 */
declare function parseChatMessage(json: Record<string, unknown>): ChatMessage;
/**
 * Parse SocketMessage from JSON
 */
declare function parseSocketMessage(json: Record<string, unknown>): SocketMessage;
/**
 * Parse PaginatedMessages from JSON
 */
declare function parsePaginatedMessages(json: Record<string, unknown>): PaginatedMessages;
/**
 * Check if message content is an image URL
 */
declare function isImageContent(content: string): boolean;
/**
 * Check if message is an image
 */
declare function isMessageImage(message: ChatMessage): boolean;
/**
 * Check if message has been edited
 */
declare function isMessageEdited(message: ChatMessage): boolean;
/**
 * Get edited timestamp (if edited)
 */
declare function getMessageEditedAt(message: ChatMessage): Date | undefined;
/**
 * Get original content before editing
 */
declare function getMessageOriginalContent(message: ChatMessage): string | undefined;
/**
 * Check if message can be edited (within 24 hours)
 */
declare function canEditMessage(message: ChatMessage): boolean;

/**
 * Chat App configuration received from server
 */
interface ChatAppRemoteConfig {
    appName: string;
    appDescription?: string;
    logoUrl?: string;
    isActive: boolean;
    settings: Record<string, unknown>;
    requiredFields: Record<string, string>;
    socketUrl: string;
    socketApiKey: string;
}
/**
 * Parse ChatAppRemoteConfig from JSON
 */
declare function parseChatAppRemoteConfig(json: Record<string, unknown>): ChatAppRemoteConfig;
/**
 * Get start text from settings
 */
declare function getStartText(config: ChatAppRemoteConfig): string;
/**
 * Check if AI agent is enabled
 */
declare function isAiAgentEnabled(config: ChatAppRemoteConfig): boolean;
/**
 * Get message header color
 */
declare function getMsHeaderColor(config: ChatAppRemoteConfig): string;
/**
 * Get message name color
 */
declare function getMsNameColor(config: ChatAppRemoteConfig): string;

/**
 * Configuration for FCRM Chat SDK
 */
interface ChatConfig {
    /** Base URL of the FCRM backend (e.g., https://api.yourcompany.com) */
    baseUrl: string;
    /** Company/tenant token for tenant identification */
    companyToken: string;
    /** Chat App key provided in FCRM dashboard */
    appKey: string;
    /** Chat App secret provided in FCRM dashboard */
    appSecret: string;
    /** Optional custom socket URL (if different from default) */
    socketUrl?: string;
    /** Connection timeout in milliseconds (default: 20000) */
    connectionTimeout?: number;
    /** Enable debug logging (default: false) */
    enableLogging?: boolean;
}
/**
 * ChatConfig with default values applied
 */
interface ChatConfigWithDefaults extends ChatConfig {
    connectionTimeout: number;
    enableLogging: boolean;
}
/**
 * Apply default values to ChatConfig
 */
declare function applyConfigDefaults(config: ChatConfig): ChatConfigWithDefaults;
/**
 * Get the API endpoint URL with company token
 */
declare function getApiUrl(config: ChatConfig): string;

/**
 * Registration response
 */
interface RegistrationResponse {
    success: boolean;
    browserKey: string;
    chatId?: number;
    message?: string;
    lastMessages?: unknown[];
}
/**
 * Send message response
 */
interface SendMessageResponse {
    success: boolean;
    userMessageId: number;
    chatId: number;
    aiAgentEnabled: boolean;
    aiMessage?: Record<string, unknown>;
}
/**
 * Edit message response
 */
interface EditMessageResponse {
    success: boolean;
    messageId: number;
    content: string;
    edited: boolean;
    editedAt?: string;
}
/**
 * Update user data response
 */
interface UpdateUserDataResponse {
    success: boolean;
    userData: Record<string, unknown>;
    message?: string;
}
/**
 * Upload progress callback
 */
type SendProgressCallback = (sent: number, total: number) => void;
/**
 * Upload response
 */
interface UploadResponse {
    imageUrl: string;
    [key: string]: unknown;
}

/**
 * User data for registration
 */
interface UserData {
    name?: string;
    phone?: string;
    email?: string;
    [key: string]: unknown;
}
/**
 * Chat state
 */
interface ChatState {
    isInitialized: boolean;
    isConnected: boolean;
    isRegistered: boolean;
    remoteConfig: ChatAppRemoteConfig | null;
    browserKey: string | null;
    chatId: number | null;
    error: Error | null;
}
/**
 * Create empty paginated messages response
 */
declare function createEmptyPaginatedMessages(perPage?: number): PaginatedMessages;

/**
 * Cancel token for upload operations
 */
declare class CancelToken {
    private _isCancelled;
    private _source;
    constructor();
    /**
     * Whether this token has been cancelled
     */
    get isCancelled(): boolean;
    /**
     * Get axios cancel token
     */
    get axiosToken(): CancelToken$1;
    /**
     * Cancel the operation
     */
    cancel(): void;
}
/**
 * API service for FCRM Chat
 */
declare class ChatApiService {
    private client;
    private config;
    constructor(config: ChatConfigWithDefaults);
    /**
     * Log message if logging is enabled
     */
    private log;
    /**
     * Get default headers with signature
     */
    private getHeaders;
    /**
     * Parse error from response
     */
    private parseError;
    /**
     * Get chat app configuration
     */
    getConfig(): Promise<ChatAppRemoteConfig>;
    /**
     * Register a new browser/device
     */
    registerBrowser(userData: Record<string, unknown>, endpoint?: string): Promise<RegistrationResponse>;
    /**
     * Update browser/device information
     */
    updateBrowser(browserKey: string, userData: Record<string, unknown>): Promise<RegistrationResponse>;
    /**
     * Update specific user data fields (partial update)
     */
    updateUserData(browserKey: string, data: Record<string, unknown>): Promise<UpdateUserDataResponse>;
    /**
     * Send a message
     */
    sendMessage(browserKey: string, message: string, endpoint?: string, metadata?: Record<string, unknown>): Promise<SendMessageResponse>;
    /**
     * Edit a message (only allowed within 1 day of creation)
     */
    editMessage(browserKey: string, messageId: number, content: string): Promise<EditMessageResponse>;
    /**
     * Get chat messages with pagination
     */
    getMessages(browserKey: string, page?: number, perPage?: number): Promise<PaginatedMessages>;
    /**
     * Upload an image
     */
    uploadImage(browserKey: string, imageUri: string, endpoint?: string, onProgress?: SendProgressCallback, cancelToken?: CancelToken): Promise<Record<string, unknown>>;
    /**
     * Upload a file
     */
    uploadFile(browserKey: string, fileUri: string, endpoint?: string, onProgress?: SendProgressCallback, cancelToken?: CancelToken): Promise<Record<string, unknown>>;
    /**
     * Dispose the service
     */
    dispose(): void;
}

/**
 * FCRM Chat Context Value
 */
interface FcrmChatContextValue extends ChatState {
    initialize: () => Promise<void>;
    register: (userData: UserData, endpoint?: string) => Promise<void>;
    updateBrowser: (userData: UserData) => Promise<ChatMessage[]>;
    updateUserData: (data: Partial<UserData>) => Promise<Record<string, unknown>>;
    updateName: (name: string) => Promise<Record<string, unknown>>;
    updatePhone: (phone: string) => Promise<Record<string, unknown>>;
    updateEmail: (email: string) => Promise<Record<string, unknown>>;
    sendMessage: (message: string, endpoint?: string, metadata?: Record<string, unknown>) => Promise<SendMessageResponse>;
    editMessage: (messageId: number, content: string) => Promise<EditMessageResponse>;
    sendImage: (imageUri: string, endpoint?: string, onProgress?: SendProgressCallback, cancelToken?: CancelToken) => Promise<Record<string, unknown>>;
    sendFile: (fileUri: string, endpoint?: string, onProgress?: SendProgressCallback, cancelToken?: CancelToken) => Promise<Record<string, unknown>>;
    getMessages: (page?: number, perPage?: number) => Promise<PaginatedMessages>;
    loadMessages: (page?: number, perPage?: number) => Promise<PaginatedMessages>;
    sendTyping: (isTyping: boolean) => void;
    disconnect: () => void;
    reconnect: () => void;
    reset: () => Promise<void>;
    onMessage: (callback: (message: ChatMessage) => void) => () => void;
    onConnectionChange: (callback: (connected: boolean) => void) => () => void;
    onTyping: (callback: (isTyping: boolean) => void) => () => void;
    isActive: boolean;
    getUserData: () => Promise<Record<string, unknown> | null>;
    checkIsRegistered: () => Promise<boolean>;
    createCancelToken: () => CancelToken;
}
/**
 * Props for FcrmChatProvider
 */
interface FcrmChatProviderProps {
    config: ChatConfig;
    children: ReactNode;
    autoInitialize?: boolean;
}
/**
 * FCRM Chat Provider component
 */
declare function FcrmChatProvider({ config, children, autoInitialize, }: FcrmChatProviderProps): JSX.Element;
/**
 * Hook to access FCRM Chat context
 */
declare function useFcrmChatContext(): FcrmChatContextValue;

/**
 * Main hook for accessing FCRM Chat SDK functionality
 *
 * @example
 * ```tsx
 * function ChatScreen() {
 *   const {
 *     isConnected,
 *     isInitialized,
 *     initialize,
 *     register,
 *     sendMessage,
 *     onMessage
 *   } = useFcrmChat();
 *
 *   useEffect(() => {
 *     const unsubscribe = onMessage((msg) => {
 *       console.log('New message:', msg);
 *     });
 *     return unsubscribe;
 *   }, [onMessage]);
 *
 *   // ...
 * }
 * ```
 */
declare function useFcrmChat(): FcrmChatContextValue;

/**
 * Options for useChatMessages hook
 */
interface UseChatMessagesOptions {
    /** Automatically load messages on mount (default: true) */
    autoLoad?: boolean;
    /** Number of messages per page (default: 20) */
    perPage?: number;
}
/**
 * Return value from useChatMessages hook
 */
interface UseChatMessagesReturn {
    /** Array of chat messages (newest first) */
    messages: ChatMessage[];
    /** Whether messages are currently loading */
    isLoading: boolean;
    /** Error if loading failed */
    error: Error | null;
    /** Whether there are more messages to load */
    hasMore: boolean;
    /** Current page number */
    currentPage: number;
    /** Load more messages (next page) */
    loadMore: () => Promise<void>;
    /** Refresh messages (reset to page 1) */
    refresh: () => Promise<void>;
}
/**
 * Hook for managing chat messages with pagination and real-time updates
 *
 * @example
 * ```tsx
 * function MessageList() {
 *   const { messages, isLoading, hasMore, loadMore, refresh } = useChatMessages({
 *     autoLoad: true,
 *     perPage: 20,
 *   });
 *
 *   return (
 *     <FlatList
 *       data={messages}
 *       renderItem={({ item }) => <MessageBubble message={item} />}
 *       onEndReached={() => hasMore && loadMore()}
 *       refreshing={isLoading}
 *       onRefresh={refresh}
 *     />
 *   );
 * }
 * ```
 */
declare function useChatMessages(options?: UseChatMessagesOptions): UseChatMessagesReturn;

/**
 * Return value from useChatConnection hook
 */
interface UseChatConnectionReturn {
    /** Whether socket is connected */
    isConnected: boolean;
    /** Whether SDK is initialized */
    isInitialized: boolean;
    /** Whether user is registered */
    isRegistered: boolean;
    /** Current error (if any) */
    error: Error | null;
}
/**
 * Hook for tracking chat connection status
 *
 * @example
 * ```tsx
 * function ConnectionStatus() {
 *   const { isConnected, isInitialized, isRegistered, error } = useChatConnection();
 *
 *   if (error) {
 *     return <Text>Error: {error.message}</Text>;
 *   }
 *
 *   if (!isInitialized) {
 *     return <Text>Initializing...</Text>;
 *   }
 *
 *   return (
 *     <View style={[styles.status, isConnected ? styles.online : styles.offline]}>
 *       <Text>{isConnected ? 'Online' : 'Offline'}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
declare function useChatConnection(): UseChatConnectionReturn;

/**
 * Options for useChatTyping hook
 */
interface UseChatTypingOptions {
    /** Debounce time in milliseconds (default: 1000) */
    debounceMs?: number;
}
/**
 * Return value from useChatTyping hook
 */
interface UseChatTypingReturn {
    /** Whether the other party is typing */
    isOtherTyping: boolean;
    /** Call this when user is typing (auto-debounced) */
    setTyping: (text: string) => void;
    /** Manually send typing indicator */
    sendTyping: (isTyping: boolean) => void;
}
/**
 * Hook for managing typing indicators with debounce
 *
 * @example
 * ```tsx
 * function ChatInput() {
 *   const { isOtherTyping, setTyping } = useChatTyping({ debounceMs: 1000 });
 *   const [text, setText] = useState('');
 *
 *   const handleTextChange = (value: string) => {
 *     setText(value);
 *     setTyping(value); // Automatically handles typing indicator
 *   };
 *
 *   return (
 *     <View>
 *       {isOtherTyping && <Text>Agent is typing...</Text>}
 *       <TextInput
 *         value={text}
 *         onChangeText={handleTextChange}
 *         placeholder="Type a message..."
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
declare function useChatTyping(options?: UseChatTypingOptions): UseChatTypingReturn;

/**
 * Generate HMAC-SHA256 signature for API authentication
 * Matches Flutter SDK: signature = HMAC(appKey, appSecret)
 *
 * @param appKey - The chat app key
 * @param appSecret - The chat app secret
 * @returns HMAC-SHA256 signature as hex string
 */
declare function generateSignature(appKey: string, appSecret: string): string;

/**
 * Base exception for chat SDK errors
 */
declare class ChatException extends Error {
    constructor(message: string);
}
/**
 * API exception with status code
 */
declare class ChatApiException extends ChatException {
    readonly statusCode: number;
    constructor(message: string, statusCode: number);
    toString(): string;
}
/**
 * Exception thrown when an upload is cancelled
 */
declare class UploadCancelledException extends ChatException {
    constructor(message?: string);
}

/**
 * Connection change callback
 */
type ConnectionChangeCallback = (connected: boolean) => void;
/**
 * Message received callback
 */
type MessageCallback = (message: ChatMessage) => void;
/**
 * Typing indicator callback
 */
type TypingCallback = (isTyping: boolean) => void;
/**
 * Browser key update callback
 */
type BrowserKeyUpdateCallback = (browserKey: string) => void;
/**
 * Socket.IO service for real-time chat messaging
 */
declare class ChatSocketService {
    private socket;
    private currentBrowserKey;
    private enableLogging;
    private connectionCallbacks;
    private messageCallbacks;
    private typingCallbacks;
    private browserKeyCallbacks;
    constructor(enableLogging?: boolean);
    /**
     * Current connection status
     */
    get isConnected(): boolean;
    /**
     * Current browser key
     */
    get browserKey(): string | null;
    /**
     * Log message if logging is enabled
     */
    private log;
    /**
     * Connect to socket server
     */
    connect(socketUrl: string, apiKey: string, browserKey?: string): void;
    /**
     * Setup socket event listeners
     */
    private setupListeners;
    /**
     * Handle incoming message
     */
    private handleMessage;
    /**
     * Notify all connection change callbacks
     */
    private notifyConnectionChange;
    /**
     * Notify all message callbacks
     */
    private notifyMessage;
    /**
     * Notify all typing callbacks
     */
    private notifyTyping;
    /**
     * Notify all browser key update callbacks
     */
    private notifyBrowserKeyUpdate;
    /**
     * Subscribe to connection changes
     * @returns Unsubscribe function
     */
    onConnectionChange(callback: ConnectionChangeCallback): () => void;
    /**
     * Subscribe to incoming messages
     * @returns Unsubscribe function
     */
    onMessage(callback: MessageCallback): () => void;
    /**
     * Subscribe to typing indicators
     * @returns Unsubscribe function
     */
    onTyping(callback: TypingCallback): () => void;
    /**
     * Subscribe to browser key updates
     * @returns Unsubscribe function
     */
    onBrowserKeyUpdate(callback: BrowserKeyUpdateCallback): () => void;
    /**
     * Join a chat room
     */
    joinChatRoom(browserKey: string): void;
    /**
     * Leave a chat room
     */
    leaveChatRoom(browserKey: string): void;
    /**
     * Send typing indicator
     */
    sendTyping(browserKey: string, isTyping: boolean): void;
    /**
     * Update browser key and rejoin room
     */
    updateBrowserKey(browserKey: string): void;
    /**
     * Subscribe to a channel
     */
    subscribe(channel: string): void;
    /**
     * Unsubscribe from a channel
     */
    unsubscribe(channel: string): void;
    /**
     * Disconnect socket
     */
    disconnect(): void;
    /**
     * Dispose all resources
     */
    dispose(): void;
}

/**
 * Storage service for persisting chat data using AsyncStorage
 */
declare class ChatStorageService {
    private appKey;
    constructor(appKey: string);
    /**
     * Get storage key for browser key
     */
    private get browserStorageKey();
    /**
     * Get storage key for user data
     */
    private get userDataStorageKey();
    /**
     * Save browser key to storage
     */
    saveBrowserKey(browserKey: string): Promise<void>;
    /**
     * Get browser key from storage
     */
    getBrowserKey(): Promise<string | null>;
    /**
     * Clear browser key from storage
     */
    clearBrowserKey(): Promise<void>;
    /**
     * Save user data to storage
     */
    saveUserData(userData: Record<string, unknown>): Promise<void>;
    /**
     * Get user data from storage
     */
    getUserData(): Promise<Record<string, unknown> | null>;
    /**
     * Clear user data from storage
     */
    clearUserData(): Promise<void>;
    /**
     * Check if user is registered (has browser key)
     */
    isRegistered(): Promise<boolean>;
    /**
     * Clear all stored data
     */
    clearAll(): Promise<void>;
}

export { type BrowserKeyUpdateCallback, CancelToken, ChatApiException, ChatApiService, type ChatAppRemoteConfig, type ChatConfig, type ChatConfigWithDefaults, ChatException, type ChatMessage, ChatSocketService, type ChatState, ChatStorageService, type ConnectionChangeCallback, type EditMessageResponse, type FcrmChatContextValue, FcrmChatProvider, type FcrmChatProviderProps, type MessageCallback, type MessageType, type PaginatedMessages, type RegistrationResponse, type SendMessageResponse, type SendProgressCallback, type SocketMessage, type TypingCallback, type UpdateUserDataResponse, UploadCancelledException, type UploadResponse, type UseChatConnectionReturn, type UseChatMessagesOptions, type UseChatMessagesReturn, type UseChatTypingOptions, type UseChatTypingReturn, type UserData, applyConfigDefaults, canEditMessage, createEmptyPaginatedMessages, generateSignature, getApiUrl, getMessageEditedAt, getMessageOriginalContent, getMsHeaderColor, getMsNameColor, getStartText, isAiAgentEnabled, isImageContent, isMessageEdited, isMessageImage, parseChatAppRemoteConfig, parseChatMessage, parseMessageType, parsePaginatedMessages, parseSocketMessage, useChatConnection, useChatMessages, useChatTyping, useFcrmChat, useFcrmChatContext };
