import { sha256 } from 'js-sha256';

/**
 * Generate HMAC-SHA256 signature for API authentication
 * Matches Flutter SDK: signature = HMAC(appKey, appSecret)
 *
 * @param appKey - The chat app key
 * @param appSecret - The chat app secret
 * @returns HMAC-SHA256 signature as hex string
 */
export function generateSignature(appKey: string, appSecret: string): string {
  // Using js-sha256 for HMAC generation (works in React Native)
  // The key is appSecret, the message is appKey
  return sha256.hmac(appSecret, appKey);
}
