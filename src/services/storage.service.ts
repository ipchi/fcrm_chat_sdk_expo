import AsyncStorage from '@react-native-async-storage/async-storage';

const BROWSER_KEY_PREFIX = 'fcrm_chat_browser_';
const USER_DATA_PREFIX = 'fcrm_chat_user_';

/**
 * Storage service for persisting chat data using AsyncStorage
 */
export class ChatStorageService {
  private appKey: string;

  constructor(appKey: string) {
    this.appKey = appKey;
  }

  /**
   * Get storage key for browser key
   */
  private get browserStorageKey(): string {
    return `${BROWSER_KEY_PREFIX}${this.appKey}`;
  }

  /**
   * Get storage key for user data
   */
  private get userDataStorageKey(): string {
    return `${USER_DATA_PREFIX}${this.appKey}`;
  }

  /**
   * Save browser key to storage
   */
  async saveBrowserKey(browserKey: string): Promise<void> {
    await AsyncStorage.setItem(this.browserStorageKey, browserKey);
  }

  /**
   * Get browser key from storage
   */
  async getBrowserKey(): Promise<string | null> {
    return await AsyncStorage.getItem(this.browserStorageKey);
  }

  /**
   * Clear browser key from storage
   */
  async clearBrowserKey(): Promise<void> {
    await AsyncStorage.removeItem(this.browserStorageKey);
  }

  /**
   * Save user data to storage
   */
  async saveUserData(userData: Record<string, unknown>): Promise<void> {
    await AsyncStorage.setItem(this.userDataStorageKey, JSON.stringify(userData));
  }

  /**
   * Get user data from storage
   */
  async getUserData(): Promise<Record<string, unknown> | null> {
    const data = await AsyncStorage.getItem(this.userDataStorageKey);
    if (data) {
      try {
        return JSON.parse(data) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Clear user data from storage
   */
  async clearUserData(): Promise<void> {
    await AsyncStorage.removeItem(this.userDataStorageKey);
  }

  /**
   * Check if user is registered (has browser key)
   */
  async isRegistered(): Promise<boolean> {
    const browserKey = await this.getBrowserKey();
    return browserKey !== null && browserKey.length > 0;
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    await Promise.all([this.clearBrowserKey(), this.clearUserData()]);
  }
}
