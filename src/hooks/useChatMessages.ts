import { useState, useEffect, useCallback } from 'react';
import { useFcrmChatContext } from '../context/FcrmChatContext';
import { ChatMessage } from '../types';

/**
 * Options for useChatMessages hook
 */
export interface UseChatMessagesOptions {
  /** Automatically load messages on mount (default: true) */
  autoLoad?: boolean;
  /** Number of messages per page (default: 20) */
  perPage?: number;
}

/**
 * Return value from useChatMessages hook
 */
export interface UseChatMessagesReturn {
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
export function useChatMessages(options: UseChatMessagesOptions = {}): UseChatMessagesReturn {
  const { autoLoad = true, perPage = 20 } = options;
  const { loadMessages, onMessage, isInitialized, isRegistered } = useFcrmChatContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState({ hasMore: false, currentPage: 0, lastPage: 1 });

  // Subscribe to new messages
  useEffect(() => {
    const unsubscribe = onMessage((newMessage) => {
      setMessages((prev) => {
        // Check if message already exists (by id)
        const exists = prev.some((m) => m.id === newMessage.id);
        if (exists) {
          // Update existing message (e.g., for edits)
          return prev.map((m) => (m.id === newMessage.id ? newMessage : m));
        }
        // Add new message at the beginning (newest first)
        return [newMessage, ...prev];
      });
    });
    return unsubscribe;
  }, [onMessage]);

  // Refresh messages (reset to page 1)
  const refresh = useCallback(async () => {
    if (!isInitialized) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await loadMessages(1, perPage);
      setMessages(result.messages);
      setPagination({
        hasMore: result.hasMore,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, loadMessages, perPage]);

  // Load more messages (next page)
  const loadMore = useCallback(async () => {
    if (!isInitialized || isLoading || !pagination.hasMore) return;

    const nextPage = pagination.currentPage + 1;
    setIsLoading(true);

    try {
      const result = await loadMessages(nextPage, perPage);
      setMessages((prev) => {
        // Filter out duplicates by id
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = result.messages.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newMessages];
      });
      setPagination({
        hasMore: result.hasMore,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, isLoading, loadMessages, perPage, pagination]);

  // Auto-load on mount when initialized and registered
  useEffect(() => {
    if (autoLoad && isInitialized && isRegistered) {
      refresh();
    }
  }, [autoLoad, isInitialized, isRegistered, refresh]);

  return {
    messages,
    isLoading,
    error,
    hasMore: pagination.hasMore,
    currentPage: pagination.currentPage,
    loadMore,
    refresh,
  };
}

export default useChatMessages;
