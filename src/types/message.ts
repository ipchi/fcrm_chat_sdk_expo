/**
 * Message type enum
 */
export type MessageType = 'user' | 'admin' | 'ai' | 'system';

/**
 * Parse message type from string
 */
export function parseMessageType(value: string | undefined): MessageType {
  switch (value?.toLowerCase()) {
    case 'user':
      return 'user';
    case 'admin':
      return 'admin';
    case 'ai':
      return 'ai';
    case 'system':
      return 'system';
    default:
      return 'user';
  }
}

/**
 * Chat message model
 */
export interface ChatMessage {
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
export interface SocketMessage {
  event?: string;
  message: ChatMessage;
}

/**
 * Paginated messages response
 */
export interface PaginatedMessages {
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
export function parseChatMessage(json: Record<string, unknown>): ChatMessage {
  return {
    id: (json.id as number) ?? 0,
    chatId: (json.chat_id as number) ?? 0,
    content: (json.content as string) ?? '',
    type: parseMessageType(json.type as string),
    senderName: json.sender_name as string | undefined,
    senderType: json.sender_type as string | undefined,
    createdAt: json.created_at ? new Date(json.created_at as string) : new Date(),
    updatedAt: json.updated_at ? new Date(json.updated_at as string) : undefined,
    isRead: (json.is_read as boolean) ?? false,
    readAt: json.read_at ? new Date(json.read_at as string) : undefined,
    metadata: json.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * Parse SocketMessage from JSON
 */
export function parseSocketMessage(json: Record<string, unknown>): SocketMessage {
  const messageData = (json.message as Record<string, unknown>) ?? json;
  return {
    event: json.event as string | undefined,
    message: parseChatMessage(messageData),
  };
}

/**
 * Parse PaginatedMessages from JSON
 */
export function parsePaginatedMessages(json: Record<string, unknown>): PaginatedMessages {
  const messagesData = (json.messages as Record<string, unknown>[]) ?? [];
  const messages = messagesData.map(parseChatMessage);
  const total = (json.total as number) ?? 0;
  const currentPage = (json.current_page as number) ?? 1;
  const perPage = (json.per_page as number) ?? 20;
  const lastPage = (json.last_page as number) ?? 1;

  return {
    messages,
    total,
    currentPage,
    perPage,
    lastPage,
    hasMore: currentPage < lastPage,
  };
}

/**
 * Check if message content is an image URL
 */
export function isImageContent(content: string): boolean {
  const lowerContent = content.toLowerCase();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  return (
    imageExtensions.some((ext) => lowerContent.includes(ext)) &&
    (lowerContent.includes('/storage/') || lowerContent.startsWith('http'))
  );
}

/**
 * Check if message is an image
 */
export function isMessageImage(message: ChatMessage): boolean {
  return message.metadata?.is_image === true || isImageContent(message.content);
}

/**
 * Check if message has been edited
 */
export function isMessageEdited(message: ChatMessage): boolean {
  return message.metadata?.edited === true;
}

/**
 * Get edited timestamp (if edited)
 */
export function getMessageEditedAt(message: ChatMessage): Date | undefined {
  const editedAt = message.metadata?.edited_at;
  if (typeof editedAt === 'string') {
    return new Date(editedAt);
  }
  return undefined;
}

/**
 * Get original content before editing
 */
export function getMessageOriginalContent(message: ChatMessage): string | undefined {
  return message.metadata?.original_content as string | undefined;
}

/**
 * Check if message can be edited (within 24 hours)
 */
export function canEditMessage(message: ChatMessage): boolean {
  const now = new Date();
  const diff = now.getTime() - message.createdAt.getTime();
  const hoursDiff = diff / (1000 * 60 * 60);
  return hoursDiff < 24;
}
