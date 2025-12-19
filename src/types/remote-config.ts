/**
 * Chat App configuration received from server
 */
export interface ChatAppRemoteConfig {
  appName: string;
  appDescription?: string;
  logoUrl?: string;
  isActive: boolean;
  settings: Record<string, unknown>;
  requiredFields: Record<string, string>;
  socketUrl: string;
  socketApiKey: string;
}

/**
 * Parse required fields from API response
 */
function parseRequiredFields(fields: unknown): Record<string, string> {
  if (fields == null) return {};
  if (typeof fields === 'object' && fields !== null) {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      result[String(key)] = String(value);
    }
    return result;
  }
  return {};
}

/**
 * Parse ChatAppRemoteConfig from JSON
 */
export function parseChatAppRemoteConfig(json: Record<string, unknown>): ChatAppRemoteConfig {
  return {
    appName: (json.app_name as string) ?? 'Chat',
    appDescription: json.app_description as string | undefined,
    logoUrl: json.logo_url as string | undefined,
    isActive: (json.is_active as boolean) ?? false,
    settings: (json.settings as Record<string, unknown>) ?? {},
    requiredFields: parseRequiredFields(json.required_fields),
    socketUrl: (json.socket_url as string) ?? '',
    socketApiKey: (json.socket_api_key as string) ?? '',
  };
}

/**
 * Get start text from settings
 */
export function getStartText(config: ChatAppRemoteConfig): string {
  return String(config.settings.startText ?? '');
}

/**
 * Check if AI agent is enabled
 */
export function isAiAgentEnabled(config: ChatAppRemoteConfig): boolean {
  return config.settings.ai_agent_enabled === true;
}

/**
 * Get message header color
 */
export function getMsHeaderColor(config: ChatAppRemoteConfig): string {
  return String(config.settings.ms_header_color ?? 'white');
}

/**
 * Get message name color
 */
export function getMsNameColor(config: ChatAppRemoteConfig): string {
  return String(config.settings.ms_name_color ?? 'darkred');
}
