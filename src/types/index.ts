// Re-export all types
export * from './config';
export * from './message';
export * from './responses';
export * from './remote-config';

/**
 * User data for registration
 */
export interface UserData {
  name?: string;
  phone?: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Chat state
 */
export interface ChatState {
  isInitialized: boolean;
  isConnected: boolean;
  isRegistered: boolean;
  remoteConfig: import('./remote-config').ChatAppRemoteConfig | null;
  browserKey: string | null;
  chatId: number | null;
  error: Error | null;
}

/**
 * Create empty paginated messages response
 */
export function createEmptyPaginatedMessages(perPage: number = 20): import('./message').PaginatedMessages {
  return {
    messages: [],
    total: 0,
    currentPage: 1,
    perPage,
    lastPage: 1,
    hasMore: false,
  };
}
