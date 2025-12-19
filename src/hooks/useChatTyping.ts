import { useState, useEffect, useCallback, useRef } from 'react';
import { useFcrmChatContext } from '../context/FcrmChatContext';

/**
 * Options for useChatTyping hook
 */
export interface UseChatTypingOptions {
  /** Debounce time in milliseconds (default: 1000) */
  debounceMs?: number;
}

/**
 * Return value from useChatTyping hook
 */
export interface UseChatTypingReturn {
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
export function useChatTyping(options: UseChatTypingOptions = {}): UseChatTypingReturn {
  const { debounceMs = 1000 } = options;
  const { sendTyping: contextSendTyping, onTyping } = useFcrmChatContext();

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentlyTypingRef = useRef(false);

  // Subscribe to typing events from other party
  useEffect(() => {
    const unsubscribe = onTyping((typing) => {
      setIsOtherTyping(typing);
    });
    return unsubscribe;
  }, [onTyping]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Send typing indicator (with debounce for false)
  const setTyping = useCallback(
    (text: string) => {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (text.length > 0) {
        // Start typing
        if (!isCurrentlyTypingRef.current) {
          isCurrentlyTypingRef.current = true;
          contextSendTyping(true);
        }

        // Set timeout to stop typing after debounce
        typingTimeoutRef.current = setTimeout(() => {
          isCurrentlyTypingRef.current = false;
          contextSendTyping(false);
          typingTimeoutRef.current = null;
        }, debounceMs);
      } else {
        // Stop typing immediately when text is empty
        if (isCurrentlyTypingRef.current) {
          isCurrentlyTypingRef.current = false;
          contextSendTyping(false);
        }
      }
    },
    [contextSendTyping, debounceMs]
  );

  // Manual send typing
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      isCurrentlyTypingRef.current = isTyping;
      contextSendTyping(isTyping);
    },
    [contextSendTyping]
  );

  return {
    isOtherTyping,
    setTyping,
    sendTyping,
  };
}

export default useChatTyping;
