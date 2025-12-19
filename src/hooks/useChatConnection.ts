import { useState, useEffect } from 'react';
import { useFcrmChatContext } from '../context/FcrmChatContext';

/**
 * Return value from useChatConnection hook
 */
export interface UseChatConnectionReturn {
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
export function useChatConnection(): UseChatConnectionReturn {
  const {
    isConnected: contextIsConnected,
    isInitialized,
    isRegistered,
    error,
    onConnectionChange,
  } = useFcrmChatContext();

  const [isConnected, setIsConnected] = useState(contextIsConnected);

  useEffect(() => {
    // Sync with context value
    setIsConnected(contextIsConnected);
  }, [contextIsConnected]);

  useEffect(() => {
    const unsubscribe = onConnectionChange((connected) => {
      setIsConnected(connected);
    });
    return unsubscribe;
  }, [onConnectionChange]);

  return {
    isConnected,
    isInitialized,
    isRegistered,
    error,
  };
}

export default useChatConnection;
