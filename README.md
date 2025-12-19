# FCRM Chat SDK for Expo/React Native

A React Native SDK for integrating FCRM Chat into your Expo or React Native applications. Provides real-time messaging via Socket.IO and REST API integration.

## Features

- Real-time messaging via Socket.IO
- HMAC-SHA256 authentication
- User/device registration
- Message history with pagination
- Image and file uploads with progress tracking
- Message editing (within 24 hours)
- Typing indicators
- Connection state management
- React Hooks API

## Installation

```bash
npm install @fcrm/chat-sdk-expo
# or
yarn add @fcrm/chat-sdk-expo
```

### Peer Dependencies

Make sure you have these peer dependencies installed:

```bash
npm install react react-native @react-native-async-storage/async-storage
```

## Quick Start

### 1. Wrap your app with the Provider

```tsx
import { FcrmChatProvider } from '@fcrm/chat-sdk-expo';

const chatConfig = {
  baseUrl: 'https://api.yourcompany.com',
  companyToken: 'your-company-token',
  appKey: 'your-chat-app-key',
  appSecret: 'your-chat-app-secret',
  enableLogging: __DEV__, // Enable logging in development
};

export default function App() {
  return (
    <FcrmChatProvider config={chatConfig}>
      <YourApp />
    </FcrmChatProvider>
  );
}
```

### 2. Use the SDK in your components

```tsx
import { useFcrmChat, useChatMessages, useChatTyping } from '@fcrm/chat-sdk-expo';

function ChatScreen() {
  const {
    initialize,
    register,
    sendMessage,
    isInitialized,
    isConnected,
    isRegistered,
  } = useFcrmChat();

  const { messages, isLoading, hasMore, loadMore, refresh } = useChatMessages();
  const { isOtherTyping, setTyping } = useChatTyping();

  const [inputText, setInputText] = useState('');

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, []);

  // Register user after initialization
  useEffect(() => {
    if (isInitialized && !isRegistered) {
      register({
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
      });
    }
  }, [isInitialized, isRegistered]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    await sendMessage(inputText);
    setInputText('');
    setTyping('');
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        inverted
        renderItem={({ item }) => <MessageBubble message={item} />}
        onEndReached={() => hasMore && loadMore()}
        refreshing={isLoading}
        onRefresh={refresh}
      />

      {isOtherTyping && <Text>Agent is typing...</Text>}

      <TextInput
        value={inputText}
        onChangeText={(text) => {
          setInputText(text);
          setTyping(text);
        }}
        placeholder="Type a message..."
      />
      <Button title="Send" onPress={handleSend} />
    </View>
  );
}
```

## API Reference

### Configuration

```typescript
interface ChatConfig {
  /** Base URL of the FCRM backend */
  baseUrl: string;
  /** Company/tenant token */
  companyToken: string;
  /** Chat App key from FCRM dashboard */
  appKey: string;
  /** Chat App secret from FCRM dashboard */
  appSecret: string;
  /** Custom socket URL (optional) */
  socketUrl?: string;
  /** Connection timeout in ms (default: 20000) */
  connectionTimeout?: number;
  /** Enable debug logging (default: false) */
  enableLogging?: boolean;
}
```

### Logging

The SDK includes debug logging that can be controlled via the `enableLogging` configuration option:

```typescript
const chatConfig = {
  baseUrl: 'https://api.yourcompany.com',
  companyToken: 'your-company-token',
  appKey: 'your-chat-app-key',
  appSecret: 'your-chat-app-secret',

  enableLogging: __DEV__,  // Recommended: logs only in development
  // enableLogging: true,  // Always log (for debugging)
  // enableLogging: false, // Never log (default, for production)
};
```

When enabled, the SDK logs:
- API requests and responses
- Socket connection events
- Registration field validation
- Error details

**Recommendation:** Use `enableLogging: __DEV__` to automatically enable logging during development and disable it in production builds.

### FcrmChatProvider

The main provider component that wraps your app.

```tsx
<FcrmChatProvider
  config={chatConfig}
  autoInitialize={false} // Set to true to auto-initialize on mount
>
  {children}
</FcrmChatProvider>
```

### useFcrmChat()

The main hook for accessing all SDK functionality.

```typescript
const {
  // State
  isInitialized,    // boolean - SDK initialized
  isConnected,      // boolean - Socket connected
  isRegistered,     // boolean - User registered
  isActive,         // boolean - Chat app is active
  browserKey,       // string | null - Device identifier
  chatId,           // number | null - Chat room ID
  remoteConfig,     // ChatAppRemoteConfig | null
  error,            // Error | null

  // Initialization
  initialize,       // () => Promise<void>

  // Registration
  register,         // (userData, endpoint?) => Promise<void>
  updateBrowser,    // (userData) => Promise<ChatMessage[]>
  updateUserData,   // (data) => Promise<Record<string, unknown>>
  updateName,       // (name) => Promise<...>
  updatePhone,      // (phone) => Promise<...>
  updateEmail,      // (email) => Promise<...>

  // Messaging
  sendMessage,      // (message, endpoint?, metadata?) => Promise<SendMessageResponse>
  editMessage,      // (messageId, content) => Promise<EditMessageResponse>
  sendImage,        // (imageUri, endpoint?, onProgress?, cancelToken?) => Promise<...>
  sendFile,         // (fileUri, endpoint?, onProgress?, cancelToken?) => Promise<...>
  getMessages,      // (page?, perPage?) => Promise<PaginatedMessages>
  loadMessages,     // (page?, perPage?) => Promise<PaginatedMessages>

  // Typing
  sendTyping,       // (isTyping: boolean) => void

  // Connection
  disconnect,       // () => void
  reconnect,        // () => void
  reset,            // () => Promise<void> - Clear all data

  // Event subscriptions (return unsubscribe function)
  onMessage,        // (callback) => () => void
  onConnectionChange, // (callback) => () => void
  onTyping,         // (callback) => () => void

  // Helpers
  getUserData,      // () => Promise<Record<string, unknown> | null>
  checkIsRegistered, // () => Promise<boolean>
  createCancelToken, // () => CancelToken
} = useFcrmChat();
```

### useChatMessages(options?)

Hook for managing chat messages with pagination and real-time updates.

```typescript
const {
  messages,     // ChatMessage[] - Array of messages (newest first)
  isLoading,    // boolean
  error,        // Error | null
  hasMore,      // boolean - More pages available
  currentPage,  // number
  loadMore,     // () => Promise<void> - Load next page
  refresh,      // () => Promise<void> - Reload from page 1
} = useChatMessages({
  autoLoad: true,  // Auto-load on mount (default: true)
  perPage: 20,     // Messages per page (default: 20)
});
```

### useChatConnection()

Hook for tracking connection status.

```typescript
const {
  isConnected,    // boolean
  isInitialized,  // boolean
  isRegistered,   // boolean
  error,          // Error | null
} = useChatConnection();
```

### useChatTyping(options?)

Hook for managing typing indicators with debounce.

```typescript
const {
  isOtherTyping,  // boolean - Other party is typing
  setTyping,      // (text: string) => void - Auto-debounced
  sendTyping,     // (isTyping: boolean) => void - Manual
} = useChatTyping({
  debounceMs: 1000,  // Debounce time (default: 1000)
});
```

## Types

### ChatMessage

```typescript
interface ChatMessage {
  id: number;
  chatId: number;
  content: string;
  type: 'user' | 'admin' | 'ai' | 'system';
  senderName?: string;
  senderType?: string;
  createdAt: Date;
  updatedAt?: Date;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
}
```

### PaginatedMessages

```typescript
interface PaginatedMessages {
  messages: ChatMessage[];
  total: number;
  currentPage: number;
  perPage: number;
  lastPage: number;
  hasMore: boolean;
}
```

## Image Upload with Progress

```typescript
const { sendImage, createCancelToken } = useFcrmChat();

const cancelToken = createCancelToken();

try {
  const result = await sendImage(
    imageUri,
    undefined, // endpoint
    (sent, total) => {
      const progress = (sent / total) * 100;
      console.log(`Upload progress: ${progress.toFixed(1)}%`);
    },
    cancelToken
  );
  console.log('Uploaded:', result.imageUrl);
} catch (error) {
  if (error.name === 'UploadCancelledException') {
    console.log('Upload was cancelled');
  }
}

// To cancel the upload:
cancelToken.cancel();
```

## Error Handling

```typescript
import { ChatException, ChatApiException, UploadCancelledException } from '@fcrm/chat-sdk-expo';

try {
  await sendMessage('Hello');
} catch (error) {
  if (error instanceof ChatApiException) {
    console.log(`API Error: ${error.message} (status: ${error.statusCode})`);
  } else if (error instanceof UploadCancelledException) {
    console.log('Upload cancelled');
  } else if (error instanceof ChatException) {
    console.log(`Chat Error: ${error.message}`);
  }
}
```

## Message Utilities

```typescript
import {
  isMessageImage,
  isMessageEdited,
  canEditMessage,
  getMessageEditedAt,
  getMessageOriginalContent,
} from '@fcrm/chat-sdk-expo';

// Check if message is an image
if (isMessageImage(message)) {
  // Render image
}

// Check if message was edited
if (isMessageEdited(message)) {
  const editedAt = getMessageEditedAt(message);
  const original = getMessageOriginalContent(message);
}

// Check if message can still be edited (within 24 hours)
if (canEditMessage(message)) {
  // Show edit button
}
```

## Advanced Usage

### Direct Service Access

For advanced use cases, you can access the services directly:

```typescript
import {
  ChatApiService,
  ChatSocketService,
  ChatStorageService,
  generateSignature,
} from '@fcrm/chat-sdk-expo';
```

### Custom Socket Events

```typescript
const { onMessage, onConnectionChange, onTyping } = useFcrmChat();

useEffect(() => {
  const unsubMessage = onMessage((message) => {
    console.log('New message:', message);
  });

  const unsubConnection = onConnectionChange((connected) => {
    console.log('Connection:', connected ? 'online' : 'offline');
  });

  const unsubTyping = onTyping((isTyping) => {
    console.log('Agent typing:', isTyping);
  });

  return () => {
    unsubMessage();
    unsubConnection();
    unsubTyping();
  };
}, []);
```

## License

MIT
