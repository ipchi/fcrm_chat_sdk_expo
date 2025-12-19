import axios, {
  AxiosInstance,
  AxiosError,
  AxiosProgressEvent,
  CancelTokenSource,
  CancelToken as AxiosCancelToken,
} from 'axios';
import {
  ChatConfigWithDefaults,
  getApiUrl,
  ChatAppRemoteConfig,
  parseChatAppRemoteConfig,
  RegistrationResponse,
  parseRegistrationResponse,
  SendMessageResponse,
  parseSendMessageResponse,
  EditMessageResponse,
  parseEditMessageResponse,
  UpdateUserDataResponse,
  parseUpdateUserDataResponse,
  PaginatedMessages,
  parsePaginatedMessages,
  SendProgressCallback,
} from '../types';
import { generateSignature } from '../utils/hmac';
import { ChatApiException, UploadCancelledException } from '../utils/errors';

/**
 * Cancel token for upload operations
 */
export class CancelToken {
  private _isCancelled = false;
  private _source: CancelTokenSource;

  constructor() {
    this._source = axios.CancelToken.source();
  }

  /**
   * Whether this token has been cancelled
   */
  get isCancelled(): boolean {
    return this._isCancelled;
  }

  /**
   * Get axios cancel token
   */
  get axiosToken(): AxiosCancelToken {
    return this._source.token;
  }

  /**
   * Cancel the operation
   */
  cancel(): void {
    if (!this._isCancelled) {
      this._isCancelled = true;
      this._source.cancel('Upload cancelled');
    }
  }
}

/**
 * API service for FCRM Chat
 */
export class ChatApiService {
  private client: AxiosInstance;
  private config: ChatConfigWithDefaults;

  constructor(config: ChatConfigWithDefaults) {
    this.config = config;
    const apiUrl = getApiUrl(config);

    this.client = axios.create({
      baseURL: apiUrl,
      timeout: config.connectionTimeout,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Log message if logging is enabled
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[FCRM Chat] ${message}`);
    }
  }

  /**
   * Get default headers with signature
   */
  private getHeaders(isJson = true): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Chat-Signature': generateSignature(this.config.appKey, this.config.appSecret),
      'X-Chat-App-Key': this.config.appKey,
    };
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  /**
   * Parse error from response
   */
  private parseError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<Record<string, unknown>>;
      const data = axiosError.response?.data;
      if (data) {
        if (data.error) {
          return String(data.error);
        }
        if (data.errors && typeof data.errors === 'object') {
          const errors = data.errors as Record<string, string[]>;
          return Object.values(errors).flat().join(', ');
        }
        if (data.message) {
          return String(data.message);
        }
      }
      return `Request failed with status ${axiosError.response?.status ?? 'unknown'}`;
    }
    return String(error);
  }

  /**
   * Get chat app configuration
   */
  async getConfig(): Promise<ChatAppRemoteConfig> {
    const signature = generateSignature(this.config.appKey, this.config.appSecret);

    this.log(`Getting config`);

    try {
      const response = await this.client.get('/config', {
        params: {
          key: this.config.appKey,
          sig: signature,
        },
        headers: { Accept: 'application/json' },
      });

      this.log(`Config received: ${response.data.app_name}`);
      return parseChatAppRemoteConfig(response.data);
    } catch (error) {
      const message = this.parseError(error);
      this.log(`Config error: ${message}`);
      const statusCode = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      throw new ChatApiException(message, statusCode);
    }
  }

  /**
   * Register a new browser/device
   */
  async registerBrowser(
    userData: Record<string, unknown>,
    endpoint?: string
  ): Promise<RegistrationResponse> {
    this.log('Registering browser');

    try {
      const response = await this.client.post(
        '/register-browser',
        {
          chat_app_key: this.config.appKey,
          user_data: userData,
          endpoint,
        },
        { headers: this.getHeaders() }
      );

      this.log(`Browser registered: ${response.data.browser_key}`);
      return parseRegistrationResponse(response.data);
    } catch (error) {
      const message = this.parseError(error);
      this.log(`Registration error: ${message}`);
      const statusCode = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      throw new ChatApiException(message, statusCode);
    }
  }

  /**
   * Update browser/device information
   */
  async updateBrowser(
    browserKey: string,
    userData: Record<string, unknown>
  ): Promise<RegistrationResponse> {
    this.log(`Updating browser: ${browserKey}`);

    try {
      const response = await this.client.post(
        '/browser/update',
        {
          chat_app_key: this.config.appKey,
          browser_key: browserKey,
          user_data: userData,
        },
        { headers: this.getHeaders() }
      );

      this.log('Browser updated');
      return parseRegistrationResponse(response.data);
    } catch (error) {
      const message = this.parseError(error);
      this.log(`Update error: ${message}`);
      const statusCode = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      throw new ChatApiException(message, statusCode);
    }
  }

  /**
   * Update specific user data fields (partial update)
   */
  async updateUserData(
    browserKey: string,
    data: Record<string, unknown>
  ): Promise<UpdateUserDataResponse> {
    this.log(`Updating user data for browser: ${browserKey}`);

    try {
      const response = await this.client.post(
        '/browser/update-data',
        {
          chat_app_key: this.config.appKey,
          browser_key: browserKey,
          data,
        },
        { headers: this.getHeaders() }
      );

      this.log('User data updated');
      return parseUpdateUserDataResponse(response.data);
    } catch (error) {
      const message = this.parseError(error);
      this.log(`Update user data error: ${message}`);
      const statusCode = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      throw new ChatApiException(message, statusCode);
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    browserKey: string,
    message: string,
    endpoint?: string,
    metadata?: Record<string, unknown>
  ): Promise<SendMessageResponse> {
    this.log('Sending message');

    try {
      const body: Record<string, unknown> = {
        chat_app_key: this.config.appKey,
        browser_key: browserKey,
        message,
        endpoint,
      };

      if (metadata && Object.keys(metadata).length > 0) {
        body.metadata = metadata;
      }

      const response = await this.client.post('/send-message', body, {
        headers: this.getHeaders(),
      });

      this.log(`Message sent: ${response.data.user_message_id}`);
      return parseSendMessageResponse(response.data);
    } catch (error) {
      const message = this.parseError(error);
      this.log(`Send error: ${message}`);
      const statusCode = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      throw new ChatApiException(message, statusCode);
    }
  }

  /**
   * Edit a message (only allowed within 1 day of creation)
   */
  async editMessage(
    browserKey: string,
    messageId: number,
    content: string
  ): Promise<EditMessageResponse> {
    this.log(`Editing message: ${messageId}`);

    try {
      const response = await this.client.post(
        '/edit-message',
        {
          chat_app_key: this.config.appKey,
          browser_key: browserKey,
          message_id: messageId,
          content,
        },
        { headers: this.getHeaders() }
      );

      this.log(`Message edited: ${messageId}`);
      return parseEditMessageResponse(response.data);
    } catch (error) {
      const message = this.parseError(error);
      this.log(`Edit error: ${message}`);
      const statusCode = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      throw new ChatApiException(message, statusCode);
    }
  }

  /**
   * Get chat messages with pagination
   */
  async getMessages(
    browserKey: string,
    page = 1,
    perPage = 20
  ): Promise<PaginatedMessages> {
    this.log(`Getting messages (page: ${page}, perPage: ${perPage})`);

    try {
      const response = await this.client.post(
        '/messages',
        {
          chat_app_key: this.config.appKey,
          browser_key: browserKey,
          page,
          per_page: perPage,
        },
        { headers: this.getHeaders() }
      );

      const paginatedMessages = parsePaginatedMessages(response.data);
      this.log(
        `Received ${paginatedMessages.messages.length} messages (page ${paginatedMessages.currentPage}/${paginatedMessages.lastPage})`
      );
      return paginatedMessages;
    } catch (error) {
      const message = this.parseError(error);
      this.log(`Messages error: ${message}`);
      const statusCode = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      throw new ChatApiException(message, statusCode);
    }
  }

  /**
   * Upload an image
   */
  async uploadImage(
    browserKey: string,
    imageUri: string,
    endpoint?: string,
    onProgress?: SendProgressCallback,
    cancelToken?: CancelToken
  ): Promise<Record<string, unknown>> {
    this.log(`Uploading image: ${imageUri}`);

    // Check if already cancelled
    if (cancelToken?.isCancelled) {
      throw new UploadCancelledException();
    }

    try {
      // Create form data
      const formData = new FormData();
      formData.append('chat_app_key', this.config.appKey);
      formData.append('browser_key', browserKey);
      if (endpoint) {
        formData.append('endpoint', endpoint);
      }

      // Extract filename from URI
      const uriParts = imageUri.split('/');
      const fileName = uriParts[uriParts.length - 1];

      // Determine mime type
      const extension = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        bmp: 'image/bmp',
      };
      const mimeType = mimeTypes[extension] ?? 'image/jpeg';

      // Append file - React Native style
      formData.append('image', {
        uri: imageUri,
        name: fileName,
        type: mimeType,
      } as unknown as Blob);

      const response = await this.client.post('/upload-image', formData, {
        headers: {
          ...this.getHeaders(false),
          'Content-Type': 'multipart/form-data',
        },
        cancelToken: cancelToken?.axiosToken,
        onUploadProgress: onProgress
          ? (progressEvent: AxiosProgressEvent) => {
              const total = progressEvent.total ?? 0;
              const loaded = progressEvent.loaded ?? 0;
              onProgress(loaded, total);
            }
          : undefined,
      });

      this.log(`Image uploaded: ${response.data.image_url}`);
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        this.log('Upload cancelled');
        throw new UploadCancelledException();
      }
      const message = this.parseError(error);
      this.log(`Upload error: ${message}`);
      const statusCode = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      throw new ChatApiException(message, statusCode);
    }
  }

  /**
   * Upload a file
   */
  async uploadFile(
    browserKey: string,
    fileUri: string,
    endpoint?: string,
    onProgress?: SendProgressCallback,
    cancelToken?: CancelToken
  ): Promise<Record<string, unknown>> {
    // For now, use the same endpoint as image upload
    // Backend can be extended to support generic file uploads
    return this.uploadImage(browserKey, fileUri, endpoint, onProgress, cancelToken);
  }

  /**
   * Dispose the service
   */
  dispose(): void {
    // Axios doesn't need explicit cleanup
  }
}
