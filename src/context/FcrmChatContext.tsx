import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  ChatConfig,
  ChatConfigWithDefaults,
  applyConfigDefaults,
  ChatState,
  ChatMessage,
  PaginatedMessages,
  SendMessageResponse,
  EditMessageResponse,
  UserData,
  SendProgressCallback,
  createEmptyPaginatedMessages,
  parseChatMessage,
} from '../types';
import { ChatApiService, CancelToken } from '../services/api.service';
import { ChatSocketService } from '../services/socket.service';
import { ChatStorageService } from '../services/storage.service';
import { ChatException } from '../utils/errors';

/**
 * FCRM Chat Context Value
 */
export interface FcrmChatContextValue extends ChatState {
  // Initialization
  initialize: () => Promise<void>;

  // Registration
  register: (userData: UserData, endpoint?: string) => Promise<void>;
  updateBrowser: (userData: UserData) => Promise<ChatMessage[]>;
  updateUserData: (data: Partial<UserData>) => Promise<Record<string, unknown>>;
  updateName: (name: string) => Promise<Record<string, unknown>>;
  updatePhone: (phone: string) => Promise<Record<string, unknown>>;
  updateEmail: (email: string) => Promise<Record<string, unknown>>;

  // Messaging
  sendMessage: (
    message: string,
    endpoint?: string,
    metadata?: Record<string, unknown>
  ) => Promise<SendMessageResponse>;
  editMessage: (messageId: number, content: string) => Promise<EditMessageResponse>;
  sendImage: (
    imageUri: string,
    endpoint?: string,
    onProgress?: SendProgressCallback,
    cancelToken?: CancelToken
  ) => Promise<Record<string, unknown>>;
  sendFile: (
    fileUri: string,
    endpoint?: string,
    onProgress?: SendProgressCallback,
    cancelToken?: CancelToken
  ) => Promise<Record<string, unknown>>;
  getMessages: (page?: number, perPage?: number) => Promise<PaginatedMessages>;
  loadMessages: (page?: number, perPage?: number) => Promise<PaginatedMessages>;

  // Typing
  sendTyping: (isTyping: boolean) => void;

  // Connection
  disconnect: () => void;
  reconnect: () => void;
  reset: () => Promise<void>;

  // Subscriptions (return unsubscribe functions)
  onMessage: (callback: (message: ChatMessage) => void) => () => void;
  onConnectionChange: (callback: (connected: boolean) => void) => () => void;
  onTyping: (callback: (isTyping: boolean) => void) => () => void;

  // Helpers
  isActive: boolean;
  getUserData: () => Promise<Record<string, unknown> | null>;
  checkIsRegistered: () => Promise<boolean>;

  // Create cancel token for uploads
  createCancelToken: () => CancelToken;
}

const FcrmChatContext = createContext<FcrmChatContextValue | undefined>(undefined);

/**
 * Props for FcrmChatProvider
 */
export interface FcrmChatProviderProps {
  config: ChatConfig;
  children: ReactNode;
  autoInitialize?: boolean;
}

/**
 * FCRM Chat Provider component
 */
export function FcrmChatProvider({
  config,
  children,
  autoInitialize = false,
}: FcrmChatProviderProps): JSX.Element {
  // Apply config defaults
  const configWithDefaults = useMemo<ChatConfigWithDefaults>(
    () => applyConfigDefaults(config),
    [config]
  );

  // Services refs (maintain across re-renders)
  const apiServiceRef = useRef<ChatApiService | null>(null);
  const socketServiceRef = useRef<ChatSocketService | null>(null);
  const storageServiceRef = useRef<ChatStorageService | null>(null);

  // State
  const [state, setState] = useState<ChatState>({
    isInitialized: false,
    isConnected: false,
    isRegistered: false,
    remoteConfig: null,
    browserKey: null,
    chatId: null,
    error: null,
  });

  // Initialize services on mount
  useEffect(() => {
    apiServiceRef.current = new ChatApiService(configWithDefaults);
    socketServiceRef.current = new ChatSocketService(configWithDefaults.enableLogging);
    storageServiceRef.current = new ChatStorageService(configWithDefaults.appKey);

    // Setup socket event listeners
    const socketService = socketServiceRef.current;
    const storageService = storageServiceRef.current;

    const unsubConnection = socketService.onConnectionChange((connected) => {
      setState((prev) => ({ ...prev, isConnected: connected }));
    });

    const unsubBrowserKey = socketService.onBrowserKeyUpdate(async (key) => {
      setState((prev) => ({ ...prev, browserKey: key }));
      await storageService.saveBrowserKey(key);
    });

    // Auto-initialize if requested
    if (autoInitialize) {
      initialize();
    }

    // Cleanup
    return () => {
      unsubConnection();
      unsubBrowserKey();
      apiServiceRef.current?.dispose();
      socketServiceRef.current?.dispose();
    };
  }, [configWithDefaults, autoInitialize]);

  /**
   * Initialize the chat SDK
   */
  const initialize = useCallback(async () => {
    if (state.isInitialized) return;

    const apiService = apiServiceRef.current;
    const socketService = socketServiceRef.current;
    const storageService = storageServiceRef.current;

    if (!apiService || !socketService || !storageService) {
      throw new ChatException('Services not initialized');
    }

    try {
      // Get remote configuration
      const remoteConfig = await apiService.getConfig();

      if (!remoteConfig.isActive) {
        throw new ChatException('Chat app is not active');
      }

      // Get stored browser key
      const browserKey = await storageService.getBrowserKey();
      const isRegistered = await storageService.isRegistered();

      // Connect to socket
      socketService.connect(
        config.socketUrl ?? remoteConfig.socketUrl,
        remoteConfig.socketApiKey,
        browserKey ?? undefined
      );

      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isRegistered,
        remoteConfig,
        browserKey,
        error: null,
      }));
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      setState((prev) => ({ ...prev, error }));
      throw e;
    }
  }, [state.isInitialized, config.socketUrl]);

  /**
   * Register a new browser/device
   */
  const register = useCallback(
    async (userData: UserData, endpoint?: string) => {
      if (!state.isInitialized) {
        throw new ChatException('Chat not initialized. Call initialize() first.');
      }

      const apiService = apiServiceRef.current;
      const socketService = socketServiceRef.current;
      const storageService = storageServiceRef.current;

      if (!apiService || !socketService || !storageService) {
        throw new ChatException('Services not initialized');
      }

      // Validate required fields (with detailed logging)
      const requiredFields = state.remoteConfig?.requiredFields ?? {};
      console.log('[FCRM Chat] Required fields:', JSON.stringify(requiredFields));
      console.log('[FCRM Chat] User data keys:', Object.keys(userData));

      for (const [key, label] of Object.entries(requiredFields)) {
        const value = userData[key];
        console.log(`[FCRM Chat] Checking field '${key}' (label: '${label}'): value = '${value}'`);
        if (value == null || String(value).trim() === '') {
          throw new ChatException(`Missing required field: ${label} (key: ${key})`);
        }
      }

      // Register browser
      const response = await apiService.registerBrowser(userData, endpoint);

      // Save to storage
      await storageService.saveBrowserKey(response.browserKey);
      const userDataWithMeta = {
        ...userData,
        registered: true,
        registrationDate: new Date().toISOString(),
      };
      await storageService.saveUserData(userDataWithMeta);

      // Update socket connection
      socketService.updateBrowserKey(response.browserKey);

      setState((prev) => ({
        ...prev,
        isRegistered: true,
        browserKey: response.browserKey,
        chatId: response.chatId ?? null,
      }));
    },
    [state.isInitialized, state.remoteConfig]
  );

  /**
   * Update browser/device information
   */
  const updateBrowser = useCallback(
    async (userData: UserData): Promise<ChatMessage[]> => {
      if (!state.isInitialized) {
        throw new ChatException('Chat not initialized. Call initialize() first.');
      }
      if (!state.browserKey) {
        throw new ChatException('Not registered. Call register() first.');
      }

      const apiService = apiServiceRef.current;
      const storageService = storageServiceRef.current;

      if (!apiService || !storageService) {
        throw new ChatException('Services not initialized');
      }

      const response = await apiService.updateBrowser(state.browserKey, userData);

      // Parse last messages
      const messages: ChatMessage[] = [];
      if (response.lastMessages) {
        for (const m of response.lastMessages) {
          if (typeof m === 'object' && m !== null) {
            messages.push(parseChatMessage(m as Record<string, unknown>));
          }
        }
      }

      // Update storage
      await storageService.saveUserData(userData);

      setState((prev) => ({
        ...prev,
        chatId: response.chatId ?? prev.chatId,
      }));

      return messages;
    },
    [state.isInitialized, state.browserKey]
  );

  /**
   * Update specific user data fields (partial update)
   */
  const updateUserData = useCallback(
    async (data: Partial<UserData>): Promise<Record<string, unknown>> => {
      if (!state.isInitialized) {
        throw new ChatException('Chat not initialized. Call initialize() first.');
      }
      if (!state.browserKey) {
        throw new ChatException('Not registered. Call register() first.');
      }

      const apiService = apiServiceRef.current;
      const storageService = storageServiceRef.current;

      if (!apiService || !storageService) {
        throw new ChatException('Services not initialized');
      }

      const response = await apiService.updateUserData(state.browserKey, data);

      // Update stored user data
      await storageService.saveUserData(response.userData);

      return response.userData;
    },
    [state.isInitialized, state.browserKey]
  );

  /**
   * Update only the client name
   */
  const updateName = useCallback(
    (name: string) => updateUserData({ name }),
    [updateUserData]
  );

  /**
   * Update only the client phone
   */
  const updatePhone = useCallback(
    (phone: string) => updateUserData({ phone }),
    [updateUserData]
  );

  /**
   * Update only the client email
   */
  const updateEmail = useCallback(
    (email: string) => updateUserData({ email }),
    [updateUserData]
  );

  /**
   * Send a text message
   */
  const sendMessage = useCallback(
    async (
      message: string,
      endpoint?: string,
      metadata?: Record<string, unknown>
    ): Promise<SendMessageResponse> => {
      if (!state.isInitialized) {
        throw new ChatException('Chat not initialized. Call initialize() first.');
      }
      if (!state.browserKey) {
        throw new ChatException('Not registered. Call register() first.');
      }

      const apiService = apiServiceRef.current;
      if (!apiService) {
        throw new ChatException('Services not initialized');
      }

      return await apiService.sendMessage(state.browserKey, message, endpoint, metadata);
    },
    [state.isInitialized, state.browserKey]
  );

  /**
   * Edit a message
   */
  const editMessage = useCallback(
    async (messageId: number, content: string): Promise<EditMessageResponse> => {
      if (!state.isInitialized) {
        throw new ChatException('Chat not initialized. Call initialize() first.');
      }
      if (!state.browserKey) {
        throw new ChatException('Not registered. Call register() first.');
      }

      const apiService = apiServiceRef.current;
      if (!apiService) {
        throw new ChatException('Services not initialized');
      }

      return await apiService.editMessage(state.browserKey, messageId, content);
    },
    [state.isInitialized, state.browserKey]
  );

  /**
   * Upload and send an image
   */
  const sendImage = useCallback(
    async (
      imageUri: string,
      endpoint?: string,
      onProgress?: SendProgressCallback,
      cancelToken?: CancelToken
    ): Promise<Record<string, unknown>> => {
      if (!state.isInitialized) {
        throw new ChatException('Chat not initialized. Call initialize() first.');
      }
      if (!state.browserKey) {
        throw new ChatException('Not registered. Call register() first.');
      }

      const apiService = apiServiceRef.current;
      if (!apiService) {
        throw new ChatException('Services not initialized');
      }

      return await apiService.uploadImage(
        state.browserKey,
        imageUri,
        endpoint,
        onProgress,
        cancelToken
      );
    },
    [state.isInitialized, state.browserKey]
  );

  /**
   * Upload and send a file
   */
  const sendFile = useCallback(
    async (
      fileUri: string,
      endpoint?: string,
      onProgress?: SendProgressCallback,
      cancelToken?: CancelToken
    ): Promise<Record<string, unknown>> => {
      if (!state.isInitialized) {
        throw new ChatException('Chat not initialized. Call initialize() first.');
      }
      if (!state.browserKey) {
        throw new ChatException('Not registered. Call register() first.');
      }

      const apiService = apiServiceRef.current;
      if (!apiService) {
        throw new ChatException('Services not initialized');
      }

      return await apiService.uploadFile(
        state.browserKey,
        fileUri,
        endpoint,
        onProgress,
        cancelToken
      );
    },
    [state.isInitialized, state.browserKey]
  );

  /**
   * Get chat message history with pagination
   */
  const getMessages = useCallback(
    async (page = 1, perPage = 20): Promise<PaginatedMessages> => {
      if (!state.isInitialized) {
        throw new ChatException('Chat not initialized. Call initialize() first.');
      }
      if (!state.browserKey) {
        throw new ChatException('Not registered. Call register() first.');
      }

      const apiService = apiServiceRef.current;
      if (!apiService) {
        throw new ChatException('Services not initialized');
      }

      return await apiService.getMessages(state.browserKey, page, perPage);
    },
    [state.isInitialized, state.browserKey]
  );

  /**
   * Load chat messages for history/regeneration with pagination
   */
  const loadMessages = useCallback(
    async (page = 1, perPage = 20): Promise<PaginatedMessages> => {
      if (!state.isInitialized) {
        throw new ChatException('Chat not initialized. Call initialize() first.');
      }

      const storageService = storageServiceRef.current;
      const apiService = apiServiceRef.current;

      if (!storageService || !apiService) {
        throw new ChatException('Services not initialized');
      }

      // Check if browser key exists
      let browserKey = state.browserKey;
      if (!browserKey) {
        // Try to load from storage
        browserKey = await storageService.getBrowserKey();
      }

      // If still no browser key, user is not registered
      if (!browserKey) {
        return createEmptyPaginatedMessages(perPage);
      }

      // Get stored user data
      const userData = await storageService.getUserData();
      if (!userData) {
        return createEmptyPaginatedMessages(perPage);
      }

      try {
        // Try to get messages directly with pagination
        return await apiService.getMessages(browserKey, page, perPage);
      } catch {
        // If fails, return empty paginated response
        return createEmptyPaginatedMessages(perPage);
      }
    },
    [state.isInitialized, state.browserKey]
  );

  /**
   * Send typing indicator
   */
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (state.browserKey) {
        socketServiceRef.current?.sendTyping(state.browserKey, isTyping);
      }
    },
    [state.browserKey]
  );

  /**
   * Subscribe to incoming messages
   */
  const onMessage = useCallback((callback: (message: ChatMessage) => void): (() => void) => {
    const socketService = socketServiceRef.current;
    if (!socketService) {
      return () => {};
    }
    return socketService.onMessage(callback);
  }, []);

  /**
   * Subscribe to connection changes
   */
  const onConnectionChange = useCallback(
    (callback: (connected: boolean) => void): (() => void) => {
      const socketService = socketServiceRef.current;
      if (!socketService) {
        return () => {};
      }
      return socketService.onConnectionChange(callback);
    },
    []
  );

  /**
   * Subscribe to typing indicators
   */
  const onTyping = useCallback((callback: (isTyping: boolean) => void): (() => void) => {
    const socketService = socketServiceRef.current;
    if (!socketService) {
      return () => {};
    }
    return socketService.onTyping(callback);
  }, []);

  /**
   * Clear all stored data and reset
   */
  const reset = useCallback(async () => {
    const storageService = storageServiceRef.current;
    const socketService = socketServiceRef.current;

    if (storageService) {
      await storageService.clearAll();
    }
    if (socketService) {
      socketService.disconnect();
    }

    setState((prev) => ({
      ...prev,
      isRegistered: false,
      browserKey: null,
      chatId: null,
    }));
  }, []);

  /**
   * Disconnect from chat
   */
  const disconnect = useCallback(() => {
    socketServiceRef.current?.disconnect();
  }, []);

  /**
   * Reconnect to chat
   */
  const reconnect = useCallback(() => {
    const socketService = socketServiceRef.current;
    const remoteConfig = state.remoteConfig;

    if (socketService && remoteConfig) {
      socketService.connect(
        config.socketUrl ?? remoteConfig.socketUrl,
        remoteConfig.socketApiKey,
        state.browserKey ?? undefined
      );
    }
  }, [config.socketUrl, state.remoteConfig, state.browserKey]);

  /**
   * Get stored user data
   */
  const getUserData = useCallback(async (): Promise<Record<string, unknown> | null> => {
    return await storageServiceRef.current?.getUserData() ?? null;
  }, []);

  /**
   * Check if user is registered
   */
  const checkIsRegistered = useCallback(async (): Promise<boolean> => {
    return await storageServiceRef.current?.isRegistered() ?? false;
  }, []);

  /**
   * Create a cancel token for uploads
   */
  const createCancelToken = useCallback((): CancelToken => {
    return new CancelToken();
  }, []);

  // Context value
  const contextValue = useMemo<FcrmChatContextValue>(
    () => ({
      // State
      ...state,
      isActive: state.remoteConfig?.isActive ?? false,

      // Methods
      initialize,
      register,
      updateBrowser,
      updateUserData,
      updateName,
      updatePhone,
      updateEmail,
      sendMessage,
      editMessage,
      sendImage,
      sendFile,
      getMessages,
      loadMessages,
      sendTyping,
      onMessage,
      onConnectionChange,
      onTyping,
      disconnect,
      reconnect,
      reset,
      getUserData,
      checkIsRegistered,
      createCancelToken,
    }),
    [
      state,
      initialize,
      register,
      updateBrowser,
      updateUserData,
      updateName,
      updatePhone,
      updateEmail,
      sendMessage,
      editMessage,
      sendImage,
      sendFile,
      getMessages,
      loadMessages,
      sendTyping,
      onMessage,
      onConnectionChange,
      onTyping,
      disconnect,
      reconnect,
      reset,
      getUserData,
      checkIsRegistered,
      createCancelToken,
    ]
  );

  return (
    <FcrmChatContext.Provider value={contextValue}>{children}</FcrmChatContext.Provider>
  );
}

/**
 * Hook to access FCRM Chat context
 */
export function useFcrmChatContext(): FcrmChatContextValue {
  const context = useContext(FcrmChatContext);
  if (context === undefined) {
    throw new Error('useFcrmChatContext must be used within a FcrmChatProvider');
  }
  return context;
}
