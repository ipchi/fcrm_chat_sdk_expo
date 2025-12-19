import { useFcrmChatContext } from '../context/FcrmChatContext';

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
export function useFcrmChat() {
  return useFcrmChatContext();
}

export default useFcrmChat;
