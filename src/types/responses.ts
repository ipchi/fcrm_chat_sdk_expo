/**
 * Registration response
 */
export interface RegistrationResponse {
  success: boolean;
  browserKey: string;
  chatId?: number;
  message?: string;
  lastMessages?: unknown[];
}

/**
 * Send message response
 */
export interface SendMessageResponse {
  success: boolean;
  userMessageId: number;
  chatId: number;
  aiAgentEnabled: boolean;
  aiMessage?: Record<string, unknown>;
}

/**
 * Edit message response
 */
export interface EditMessageResponse {
  success: boolean;
  messageId: number;
  content: string;
  edited: boolean;
  editedAt?: string;
}

/**
 * Update user data response
 */
export interface UpdateUserDataResponse {
  success: boolean;
  userData: Record<string, unknown>;
  message?: string;
}

/**
 * Upload progress callback
 */
export type SendProgressCallback = (sent: number, total: number) => void;

/**
 * Upload response
 */
export interface UploadResponse {
  imageUrl: string;
  [key: string]: unknown;
}

/**
 * Parse RegistrationResponse from JSON
 */
export function parseRegistrationResponse(json: Record<string, unknown>): RegistrationResponse {
  return {
    success: (json.success as boolean) ?? false,
    browserKey: (json.browser_key as string) ?? '',
    chatId: json.chat_id as number | undefined,
    message: json.message as string | undefined,
    lastMessages: json.last_messages as unknown[] | undefined,
  };
}

/**
 * Parse SendMessageResponse from JSON
 */
export function parseSendMessageResponse(json: Record<string, unknown>): SendMessageResponse {
  return {
    success: (json.success as boolean) ?? false,
    userMessageId: (json.user_message_id as number) ?? 0,
    chatId: (json.chat_id as number) ?? 0,
    aiAgentEnabled: (json.ai_agent_enabled as boolean) ?? false,
    aiMessage: json.ai_message as Record<string, unknown> | undefined,
  };
}

/**
 * Parse EditMessageResponse from JSON
 */
export function parseEditMessageResponse(json: Record<string, unknown>): EditMessageResponse {
  const message = json.message as Record<string, unknown> | undefined;
  return {
    success: (json.success as boolean) ?? false,
    messageId: (message?.id as number) ?? 0,
    content: (message?.content as string) ?? '',
    edited: (message?.edited as boolean) ?? false,
    editedAt: message?.edited_at as string | undefined,
  };
}

/**
 * Parse UpdateUserDataResponse from JSON
 */
export function parseUpdateUserDataResponse(json: Record<string, unknown>): UpdateUserDataResponse {
  return {
    success: (json.success as boolean) ?? false,
    userData: (json.user_data as Record<string, unknown>) ?? {},
    message: json.message as string | undefined,
  };
}
