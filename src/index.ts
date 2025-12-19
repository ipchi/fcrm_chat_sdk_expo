// Context and Provider
export {
  FcrmChatProvider,
  useFcrmChatContext,
  type FcrmChatContextValue,
  type FcrmChatProviderProps,
} from './context';

// Main hook (primary API)
export { useFcrmChat } from './hooks/useFcrmChat';

// Specialized hooks
export {
  useChatMessages,
  type UseChatMessagesOptions,
  type UseChatMessagesReturn,
} from './hooks/useChatMessages';
export { useChatConnection, type UseChatConnectionReturn } from './hooks/useChatConnection';
export {
  useChatTyping,
  type UseChatTypingOptions,
  type UseChatTypingReturn,
} from './hooks/useChatTyping';

// Types
export type {
  ChatConfig,
  ChatConfigWithDefaults,
  ChatMessage,
  MessageType,
  SocketMessage,
  PaginatedMessages,
  RegistrationResponse,
  SendMessageResponse,
  EditMessageResponse,
  UpdateUserDataResponse,
  SendProgressCallback,
  UploadResponse,
  ChatAppRemoteConfig,
  UserData,
  ChatState,
} from './types';

// Type utilities
export {
  applyConfigDefaults,
  getApiUrl,
  parseChatMessage,
  parseSocketMessage,
  parsePaginatedMessages,
  parseMessageType,
  isImageContent,
  isMessageImage,
  isMessageEdited,
  getMessageEditedAt,
  getMessageOriginalContent,
  canEditMessage,
  parseChatAppRemoteConfig,
  getStartText,
  isAiAgentEnabled,
  getMsHeaderColor,
  getMsNameColor,
  createEmptyPaginatedMessages,
} from './types';

// Utilities (for advanced users)
export { generateSignature } from './utils/hmac';
export { ChatException, ChatApiException, UploadCancelledException } from './utils/errors';

// Services (for advanced users who need direct access)
export { ChatApiService, CancelToken } from './services/api.service';
export { ChatSocketService } from './services/socket.service';
export { ChatStorageService } from './services/storage.service';

// Re-export service callback types
export type {
  ConnectionChangeCallback,
  MessageCallback,
  TypingCallback,
  BrowserKeyUpdateCallback,
} from './services/socket.service';
