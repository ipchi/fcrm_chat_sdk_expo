/**
 * Configuration for FCRM Chat SDK
 */
export interface ChatConfig {
  /** Base URL of the FCRM backend (e.g., https://api.yourcompany.com) */
  baseUrl: string;
  /** Company/tenant token for tenant identification */
  companyToken: string;
  /** Chat App key provided in FCRM dashboard */
  appKey: string;
  /** Chat App secret provided in FCRM dashboard */
  appSecret: string;
  /** Optional custom socket URL (if different from default) */
  socketUrl?: string;
  /** Connection timeout in milliseconds (default: 20000) */
  connectionTimeout?: number;
  /** Enable debug logging (default: false) */
  enableLogging?: boolean;
}

/**
 * ChatConfig with default values applied
 */
export interface ChatConfigWithDefaults extends ChatConfig {
  connectionTimeout: number;
  enableLogging: boolean;
}

/**
 * Apply default values to ChatConfig
 */
export function applyConfigDefaults(config: ChatConfig): ChatConfigWithDefaults {
  return {
    ...config,
    connectionTimeout: config.connectionTimeout ?? 20000,
    enableLogging: config.enableLogging ?? false,
  };
}

/**
 * Get the API endpoint URL with company token
 */
export function getApiUrl(config: ChatConfig): string {
  return `${config.baseUrl}/api/v1/mobile-chat/${config.companyToken}`;
}
