// src/context/FcrmChatContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo
} from "react";

// src/types/config.ts
function applyConfigDefaults(config) {
  return {
    ...config,
    connectionTimeout: config.connectionTimeout ?? 2e4,
    enableLogging: config.enableLogging ?? false
  };
}
function getApiUrl(config) {
  return `${config.baseUrl}/api/v1/mobile-chat/${config.companyToken}`;
}

// src/types/message.ts
function parseMessageType(value) {
  switch (value?.toLowerCase()) {
    case "user":
      return "user";
    case "admin":
      return "admin";
    case "ai":
      return "ai";
    case "system":
      return "system";
    default:
      return "user";
  }
}
function parseChatMessage(json) {
  return {
    id: json.id ?? 0,
    chatId: json.chat_id ?? 0,
    content: json.content ?? "",
    type: parseMessageType(json.type),
    senderName: json.sender_name,
    senderType: json.sender_type,
    createdAt: json.created_at ? new Date(json.created_at) : /* @__PURE__ */ new Date(),
    updatedAt: json.updated_at ? new Date(json.updated_at) : void 0,
    isRead: json.is_read ?? false,
    readAt: json.read_at ? new Date(json.read_at) : void 0,
    metadata: json.metadata
  };
}
function parseSocketMessage(json) {
  const messageData = json.message ?? json;
  return {
    event: json.event,
    message: parseChatMessage(messageData)
  };
}
function parsePaginatedMessages(json) {
  const messagesData = json.messages ?? [];
  const messages = messagesData.map(parseChatMessage);
  const total = json.total ?? 0;
  const currentPage = json.current_page ?? 1;
  const perPage = json.per_page ?? 20;
  const lastPage = json.last_page ?? 1;
  return {
    messages,
    total,
    currentPage,
    perPage,
    lastPage,
    hasMore: currentPage < lastPage
  };
}
function isImageContent(content) {
  const lowerContent = content.toLowerCase();
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
  return imageExtensions.some((ext) => lowerContent.includes(ext)) && (lowerContent.includes("/storage/") || lowerContent.startsWith("http"));
}
function isMessageImage(message) {
  return message.metadata?.is_image === true || isImageContent(message.content);
}
function isMessageEdited(message) {
  return message.metadata?.edited === true;
}
function getMessageEditedAt(message) {
  const editedAt = message.metadata?.edited_at;
  if (typeof editedAt === "string") {
    return new Date(editedAt);
  }
  return void 0;
}
function getMessageOriginalContent(message) {
  return message.metadata?.original_content;
}
function canEditMessage(message) {
  const now = /* @__PURE__ */ new Date();
  const diff = now.getTime() - message.createdAt.getTime();
  const hoursDiff = diff / (1e3 * 60 * 60);
  return hoursDiff < 24;
}

// src/types/responses.ts
function parseRegistrationResponse(json) {
  return {
    success: json.success ?? false,
    browserKey: json.browser_key ?? "",
    chatId: json.chat_id,
    message: json.message,
    lastMessages: json.last_messages
  };
}
function parseSendMessageResponse(json) {
  return {
    success: json.success ?? false,
    userMessageId: json.user_message_id ?? 0,
    chatId: json.chat_id ?? 0,
    aiAgentEnabled: json.ai_agent_enabled ?? false,
    aiMessage: json.ai_message
  };
}
function parseEditMessageResponse(json) {
  const message = json.message;
  return {
    success: json.success ?? false,
    messageId: message?.id ?? 0,
    content: message?.content ?? "",
    edited: message?.edited ?? false,
    editedAt: message?.edited_at
  };
}
function parseUpdateUserDataResponse(json) {
  return {
    success: json.success ?? false,
    userData: json.user_data ?? {},
    message: json.message
  };
}

// src/types/remote-config.ts
function parseRequiredFields(fields) {
  if (fields == null) return {};
  if (typeof fields === "object" && fields !== null) {
    const result = {};
    for (const [key, value] of Object.entries(fields)) {
      result[String(key)] = String(value);
    }
    return result;
  }
  return {};
}
function parseChatAppRemoteConfig(json) {
  return {
    appName: json.app_name ?? "Chat",
    appDescription: json.app_description,
    logoUrl: json.logo_url,
    isActive: json.is_active ?? false,
    settings: json.settings ?? {},
    requiredFields: parseRequiredFields(json.required_fields),
    socketUrl: json.socket_url ?? "",
    socketApiKey: json.socket_api_key ?? ""
  };
}
function getStartText(config) {
  return String(config.settings.startText ?? "");
}
function isAiAgentEnabled(config) {
  return config.settings.ai_agent_enabled === true;
}
function getMsHeaderColor(config) {
  return String(config.settings.ms_header_color ?? "white");
}
function getMsNameColor(config) {
  return String(config.settings.ms_name_color ?? "darkred");
}

// src/types/index.ts
function createEmptyPaginatedMessages(perPage = 20) {
  return {
    messages: [],
    total: 0,
    currentPage: 1,
    perPage,
    lastPage: 1,
    hasMore: false
  };
}

// src/services/api.service.ts
import axios from "axios";

// src/utils/hmac.ts
import { sha256 } from "js-sha256";
function generateSignature(appKey, appSecret) {
  return sha256.hmac(appSecret, appKey);
}

// src/utils/errors.ts
var ChatException = class _ChatException extends Error {
  constructor(message) {
    super(message);
    this.name = "ChatException";
    const ErrorWithCapture = Error;
    if (ErrorWithCapture.captureStackTrace) {
      ErrorWithCapture.captureStackTrace(this, _ChatException);
    }
  }
};
var ChatApiException = class _ChatApiException extends ChatException {
  constructor(message, statusCode) {
    super(message);
    this.name = "ChatApiException";
    this.statusCode = statusCode;
    const ErrorWithCapture = Error;
    if (ErrorWithCapture.captureStackTrace) {
      ErrorWithCapture.captureStackTrace(this, _ChatApiException);
    }
  }
  toString() {
    return `ChatApiException: ${this.message} (status: ${this.statusCode})`;
  }
};
var UploadCancelledException = class _UploadCancelledException extends ChatException {
  constructor(message = "Upload was cancelled") {
    super(message);
    this.name = "UploadCancelledException";
    const ErrorWithCapture = Error;
    if (ErrorWithCapture.captureStackTrace) {
      ErrorWithCapture.captureStackTrace(this, _UploadCancelledException);
    }
  }
};

// src/services/api.service.ts
var CancelToken = class {
  constructor() {
    this._isCancelled = false;
    this._source = axios.CancelToken.source();
  }
  /**
   * Whether this token has been cancelled
   */
  get isCancelled() {
    return this._isCancelled;
  }
  /**
   * Get axios cancel token
   */
  get axiosToken() {
    return this._source.token;
  }
  /**
   * Cancel the operation
   */
  cancel() {
    if (!this._isCancelled) {
      this._isCancelled = true;
      this._source.cancel("Upload cancelled");
    }
  }
};
var ChatApiService = class {
  constructor(config) {
    this.config = config;
    const apiUrl = getApiUrl(config);
    this.client = axios.create({
      baseURL: apiUrl,
      timeout: config.connectionTimeout,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });
  }
  /**
   * Log message if logging is enabled
   */
  log(message) {
    if (this.config.enableLogging) {
      console.log(`[FCRM Chat] ${message}`);
    }
  }
  /**
   * Get default headers with signature
   */
  getHeaders(isJson = true) {
    const headers = {
      Accept: "application/json",
      "X-Chat-Signature": generateSignature(this.config.appKey, this.config.appSecret),
      "X-Chat-App-Key": this.config.appKey
    };
    if (isJson) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  }
  /**
   * Parse error from response
   */
  parseError(error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error;
      const data = axiosError.response?.data;
      if (data) {
        if (data.error) {
          return String(data.error);
        }
        if (data.errors && typeof data.errors === "object") {
          const errors = data.errors;
          return Object.values(errors).flat().join(", ");
        }
        if (data.message) {
          return String(data.message);
        }
      }
      return `Request failed with status ${axiosError.response?.status ?? "unknown"}`;
    }
    return String(error);
  }
  /**
   * Get chat app configuration
   */
  async getConfig() {
    const signature = generateSignature(this.config.appKey, this.config.appSecret);
    this.log(`Getting config`);
    try {
      const response = await this.client.get("/config", {
        params: {
          key: this.config.appKey,
          sig: signature
        },
        headers: { Accept: "application/json" }
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
  async registerBrowser(userData, endpoint) {
    this.log("Registering browser");
    try {
      const response = await this.client.post(
        "/register-browser",
        {
          chat_app_key: this.config.appKey,
          user_data: userData,
          endpoint
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
  async updateBrowser(browserKey, userData) {
    this.log(`Updating browser: ${browserKey}`);
    try {
      const response = await this.client.post(
        "/browser/update",
        {
          chat_app_key: this.config.appKey,
          browser_key: browserKey,
          user_data: userData
        },
        { headers: this.getHeaders() }
      );
      this.log("Browser updated");
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
  async updateUserData(browserKey, data) {
    this.log(`Updating user data for browser: ${browserKey}`);
    try {
      const response = await this.client.post(
        "/browser/update-data",
        {
          chat_app_key: this.config.appKey,
          browser_key: browserKey,
          data
        },
        { headers: this.getHeaders() }
      );
      this.log("User data updated");
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
  async sendMessage(browserKey, message, endpoint, metadata) {
    this.log("Sending message");
    try {
      const body = {
        chat_app_key: this.config.appKey,
        browser_key: browserKey,
        message,
        endpoint
      };
      if (metadata && Object.keys(metadata).length > 0) {
        body.metadata = metadata;
      }
      const response = await this.client.post("/send-message", body, {
        headers: this.getHeaders()
      });
      this.log(`Message sent: ${response.data.user_message_id}`);
      return parseSendMessageResponse(response.data);
    } catch (error) {
      const message2 = this.parseError(error);
      this.log(`Send error: ${message2}`);
      const statusCode = axios.isAxiosError(error) ? error.response?.status ?? 0 : 0;
      throw new ChatApiException(message2, statusCode);
    }
  }
  /**
   * Edit a message (only allowed within 1 day of creation)
   */
  async editMessage(browserKey, messageId, content) {
    this.log(`Editing message: ${messageId}`);
    try {
      const response = await this.client.post(
        "/edit-message",
        {
          chat_app_key: this.config.appKey,
          browser_key: browserKey,
          message_id: messageId,
          content
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
  async getMessages(browserKey, page = 1, perPage = 20) {
    this.log(`Getting messages (page: ${page}, perPage: ${perPage})`);
    try {
      const response = await this.client.post(
        "/messages",
        {
          chat_app_key: this.config.appKey,
          browser_key: browserKey,
          page,
          per_page: perPage
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
  async uploadImage(browserKey, imageUri, endpoint, onProgress, cancelToken) {
    this.log(`Uploading image: ${imageUri}`);
    if (cancelToken?.isCancelled) {
      throw new UploadCancelledException();
    }
    try {
      const formData = new FormData();
      formData.append("chat_app_key", this.config.appKey);
      formData.append("browser_key", browserKey);
      if (endpoint) {
        formData.append("endpoint", endpoint);
      }
      const uriParts = imageUri.split("/");
      const fileName = uriParts[uriParts.length - 1];
      const extension = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeTypes = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        bmp: "image/bmp"
      };
      const mimeType = mimeTypes[extension] ?? "image/jpeg";
      formData.append("image", {
        uri: imageUri,
        name: fileName,
        type: mimeType
      });
      const response = await this.client.post("/upload-image", formData, {
        headers: {
          ...this.getHeaders(false),
          "Content-Type": "multipart/form-data"
        },
        cancelToken: cancelToken?.axiosToken,
        onUploadProgress: onProgress ? (progressEvent) => {
          const total = progressEvent.total ?? 0;
          const loaded = progressEvent.loaded ?? 0;
          onProgress(loaded, total);
        } : void 0
      });
      this.log(`Image uploaded: ${response.data.image_url}`);
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        this.log("Upload cancelled");
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
  async uploadFile(browserKey, fileUri, endpoint, onProgress, cancelToken) {
    return this.uploadImage(browserKey, fileUri, endpoint, onProgress, cancelToken);
  }
  /**
   * Dispose the service
   */
  dispose() {
  }
};

// src/services/socket.service.ts
import { io } from "socket.io-client";
var ChatSocketService = class {
  constructor(enableLogging = false) {
    this.socket = null;
    this.currentBrowserKey = null;
    // Event callbacks
    this.connectionCallbacks = /* @__PURE__ */ new Set();
    this.messageCallbacks = /* @__PURE__ */ new Set();
    this.typingCallbacks = /* @__PURE__ */ new Set();
    this.browserKeyCallbacks = /* @__PURE__ */ new Set();
    this.enableLogging = enableLogging;
  }
  /**
   * Current connection status
   */
  get isConnected() {
    return this.socket?.connected ?? false;
  }
  /**
   * Current browser key
   */
  get browserKey() {
    return this.currentBrowserKey;
  }
  /**
   * Log message if logging is enabled
   */
  log(message) {
    if (this.enableLogging) {
      console.log(`[FCRM Socket] ${message}`);
    }
  }
  /**
   * Connect to socket server
   */
  connect(socketUrl, apiKey, browserKey) {
    if (this.socket?.connected) {
      this.log("Already connected");
      return;
    }
    this.log(`Connecting to: ${socketUrl}`);
    const authData = {
      key: apiKey
    };
    if (browserKey) {
      authData.browser_key = browserKey;
      this.currentBrowserKey = browserKey;
    }
    this.socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1e3,
      timeout: 2e4,
      auth: authData
    });
    this.setupListeners();
  }
  /**
   * Setup socket event listeners
   */
  setupListeners() {
    if (!this.socket) return;
    this.socket.on("connect", () => {
      this.log(`Connected: ${this.socket?.id}`);
      this.notifyConnectionChange(true);
      if (this.currentBrowserKey) {
        this.joinChatRoom(this.currentBrowserKey);
      }
    });
    this.socket.on("connect_error", (error) => {
      this.log(`Connection error: ${error.message}`);
      this.notifyConnectionChange(false);
    });
    this.socket.on("disconnect", (reason) => {
      this.log(`Disconnected: ${reason}`);
      this.notifyConnectionChange(false);
    });
    this.socket.io.on("reconnect_attempt", (attemptNumber) => {
      this.log(`Reconnection attempt: ${attemptNumber}`);
    });
    this.socket.io.on("reconnect", (attemptNumber) => {
      this.log(`Reconnected after ${attemptNumber} attempts`);
      this.notifyConnectionChange(true);
      if (this.currentBrowserKey) {
        this.joinChatRoom(this.currentBrowserKey);
      }
    });
    this.socket.on("App:Events:Chat:MessageEvent", (data) => {
      this.handleMessage(data, "colon format");
    });
    this.socket.on("App\\Events\\Chat\\MessageEvent", (data) => {
      this.handleMessage(data, "backslash format");
    });
    this.socket.on("App:Events:Telegram:MessageEvent", (data) => {
      this.handleMessage(data, "telegram colon format");
    });
    this.socket.on("App\\Events\\Telegram\\MessageEvent", (data) => {
      this.handleMessage(data, "telegram backslash format");
    });
    this.socket.on("App:Events:Chat:MessageEditedEvent", (data) => {
      this.handleMessage(data, "edited message");
    });
    this.socket.on("typing", (data) => {
      const isTyping = typeof data === "object" && data !== null && data.isTyping === true;
      this.log(`Typing: ${isTyping}`);
      this.notifyTyping(isTyping);
    });
    this.socket.on("user-joined", (data) => {
      this.log(`User joined: ${JSON.stringify(data)}`);
    });
    this.socket.on("user-left", (data) => {
      this.log(`User left: ${JSON.stringify(data)}`);
    });
    this.socket.on("auth-error", (data) => {
      this.log(`Auth error: ${JSON.stringify(data)}`);
    });
    this.socket.on("browser-key-updated", (data) => {
      if (typeof data === "object" && data !== null) {
        const browserKey = data.browser_key;
        if (typeof browserKey === "string") {
          this.log(`Browser key updated: ${browserKey}`);
          this.currentBrowserKey = browserKey;
          this.notifyBrowserKeyUpdate(browserKey);
        }
      }
    });
  }
  /**
   * Handle incoming message
   */
  handleMessage(data, format) {
    this.log(`Message received (${format}): ${JSON.stringify(data)}`);
    try {
      const messageData = typeof data === "object" && data !== null ? data : { message: data };
      const socketMessage = parseSocketMessage(messageData);
      this.notifyMessage(socketMessage.message);
    } catch (e) {
      this.log(`Error parsing message: ${e}`);
    }
  }
  /**
   * Notify all connection change callbacks
   */
  notifyConnectionChange(connected) {
    this.connectionCallbacks.forEach((callback) => callback(connected));
  }
  /**
   * Notify all message callbacks
   */
  notifyMessage(message) {
    this.messageCallbacks.forEach((callback) => callback(message));
  }
  /**
   * Notify all typing callbacks
   */
  notifyTyping(isTyping) {
    this.typingCallbacks.forEach((callback) => callback(isTyping));
  }
  /**
   * Notify all browser key update callbacks
   */
  notifyBrowserKeyUpdate(browserKey) {
    this.browserKeyCallbacks.forEach((callback) => callback(browserKey));
  }
  /**
   * Subscribe to connection changes
   * @returns Unsubscribe function
   */
  onConnectionChange(callback) {
    this.connectionCallbacks.add(callback);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }
  /**
   * Subscribe to incoming messages
   * @returns Unsubscribe function
   */
  onMessage(callback) {
    this.messageCallbacks.add(callback);
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }
  /**
   * Subscribe to typing indicators
   * @returns Unsubscribe function
   */
  onTyping(callback) {
    this.typingCallbacks.add(callback);
    return () => {
      this.typingCallbacks.delete(callback);
    };
  }
  /**
   * Subscribe to browser key updates
   * @returns Unsubscribe function
   */
  onBrowserKeyUpdate(callback) {
    this.browserKeyCallbacks.add(callback);
    return () => {
      this.browserKeyCallbacks.delete(callback);
    };
  }
  /**
   * Join a chat room
   */
  joinChatRoom(browserKey) {
    if (!this.socket?.connected) {
      this.log("Cannot join room - not connected");
      return;
    }
    const roomName = `private-chat_${browserKey}`;
    this.socket.emit("join", roomName);
    this.currentBrowserKey = browserKey;
    this.log(`Joined room: ${roomName}`);
  }
  /**
   * Leave a chat room
   */
  leaveChatRoom(browserKey) {
    if (!this.socket?.connected) return;
    const roomName = `private-chat_${browserKey}`;
    this.socket.emit("leave", roomName);
    this.log(`Left room: ${roomName}`);
  }
  /**
   * Send typing indicator
   */
  sendTyping(browserKey, isTyping) {
    if (!this.socket?.connected) return;
    this.socket.emit("typing", {
      browser_key: browserKey,
      isTyping
    });
  }
  /**
   * Update browser key and rejoin room
   */
  updateBrowserKey(browserKey) {
    if (browserKey === this.currentBrowserKey) return;
    if (this.currentBrowserKey && this.socket?.connected) {
      this.leaveChatRoom(this.currentBrowserKey);
    }
    this.currentBrowserKey = browserKey;
    if (this.socket?.connected) {
      this.joinChatRoom(browserKey);
    }
  }
  /**
   * Subscribe to a channel
   */
  subscribe(channel) {
    if (!this.socket?.connected) {
      this.log("Cannot subscribe - not connected");
      return;
    }
    this.socket.emit("join", channel);
    this.log(`Subscribed to: ${channel}`);
  }
  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel) {
    if (!this.socket?.connected) return;
    this.socket.emit("leave", channel);
    this.log(`Unsubscribed from: ${channel}`);
  }
  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentBrowserKey = null;
      this.notifyConnectionChange(false);
      this.log("Disconnected");
    }
  }
  /**
   * Dispose all resources
   */
  dispose() {
    this.disconnect();
    this.connectionCallbacks.clear();
    this.messageCallbacks.clear();
    this.typingCallbacks.clear();
    this.browserKeyCallbacks.clear();
  }
};

// src/services/storage.service.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
var BROWSER_KEY_PREFIX = "fcrm_chat_browser_";
var USER_DATA_PREFIX = "fcrm_chat_user_";
var ChatStorageService = class {
  constructor(appKey) {
    this.appKey = appKey;
  }
  /**
   * Get storage key for browser key
   */
  get browserStorageKey() {
    return `${BROWSER_KEY_PREFIX}${this.appKey}`;
  }
  /**
   * Get storage key for user data
   */
  get userDataStorageKey() {
    return `${USER_DATA_PREFIX}${this.appKey}`;
  }
  /**
   * Save browser key to storage
   */
  async saveBrowserKey(browserKey) {
    await AsyncStorage.setItem(this.browserStorageKey, browserKey);
  }
  /**
   * Get browser key from storage
   */
  async getBrowserKey() {
    return await AsyncStorage.getItem(this.browserStorageKey);
  }
  /**
   * Clear browser key from storage
   */
  async clearBrowserKey() {
    await AsyncStorage.removeItem(this.browserStorageKey);
  }
  /**
   * Save user data to storage
   */
  async saveUserData(userData) {
    await AsyncStorage.setItem(this.userDataStorageKey, JSON.stringify(userData));
  }
  /**
   * Get user data from storage
   */
  async getUserData() {
    const data = await AsyncStorage.getItem(this.userDataStorageKey);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return null;
  }
  /**
   * Clear user data from storage
   */
  async clearUserData() {
    await AsyncStorage.removeItem(this.userDataStorageKey);
  }
  /**
   * Check if user is registered (has browser key)
   */
  async isRegistered() {
    const browserKey = await this.getBrowserKey();
    return browserKey !== null && browserKey.length > 0;
  }
  /**
   * Clear all stored data
   */
  async clearAll() {
    await Promise.all([this.clearBrowserKey(), this.clearUserData()]);
  }
};

// src/context/FcrmChatContext.tsx
import { jsx } from "react/jsx-runtime";
var FcrmChatContext = createContext(void 0);
function FcrmChatProvider({
  config,
  children,
  autoInitialize = false
}) {
  const configWithDefaults = useMemo(
    () => applyConfigDefaults(config),
    [config]
  );
  const apiServiceRef = useRef(null);
  const socketServiceRef = useRef(null);
  const storageServiceRef = useRef(null);
  const [state, setState] = useState({
    isInitialized: false,
    isConnected: false,
    isRegistered: false,
    remoteConfig: null,
    browserKey: null,
    chatId: null,
    error: null
  });
  useEffect(() => {
    apiServiceRef.current = new ChatApiService(configWithDefaults);
    socketServiceRef.current = new ChatSocketService(configWithDefaults.enableLogging);
    storageServiceRef.current = new ChatStorageService(configWithDefaults.appKey);
    const socketService = socketServiceRef.current;
    const storageService = storageServiceRef.current;
    const unsubConnection = socketService.onConnectionChange((connected) => {
      setState((prev) => ({ ...prev, isConnected: connected }));
    });
    const unsubBrowserKey = socketService.onBrowserKeyUpdate(async (key) => {
      setState((prev) => ({ ...prev, browserKey: key }));
      await storageService.saveBrowserKey(key);
    });
    if (autoInitialize) {
      initialize();
    }
    return () => {
      unsubConnection();
      unsubBrowserKey();
      apiServiceRef.current?.dispose();
      socketServiceRef.current?.dispose();
    };
  }, [configWithDefaults, autoInitialize]);
  const initialize = useCallback(async () => {
    if (state.isInitialized) return;
    const apiService = apiServiceRef.current;
    const socketService = socketServiceRef.current;
    const storageService = storageServiceRef.current;
    if (!apiService || !socketService || !storageService) {
      throw new ChatException("Services not initialized");
    }
    try {
      const remoteConfig = await apiService.getConfig();
      if (!remoteConfig.isActive) {
        throw new ChatException("Chat app is not active");
      }
      const browserKey = await storageService.getBrowserKey();
      const isRegistered = await storageService.isRegistered();
      socketService.connect(
        config.socketUrl ?? remoteConfig.socketUrl,
        remoteConfig.socketApiKey,
        browserKey ?? void 0
      );
      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isRegistered,
        remoteConfig,
        browserKey,
        error: null
      }));
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      setState((prev) => ({ ...prev, error }));
      throw e;
    }
  }, [state.isInitialized, config.socketUrl]);
  const register = useCallback(
    async (userData, endpoint) => {
      if (!state.isInitialized) {
        throw new ChatException("Chat not initialized. Call initialize() first.");
      }
      const apiService = apiServiceRef.current;
      const socketService = socketServiceRef.current;
      const storageService = storageServiceRef.current;
      if (!apiService || !socketService || !storageService) {
        throw new ChatException("Services not initialized");
      }
      const requiredFields = state.remoteConfig?.requiredFields ?? {};
      for (const [key, label] of Object.entries(requiredFields)) {
        const value = userData[key];
        if (value == null || String(value).trim() === "") {
          throw new ChatException(`Missing required field: ${label}`);
        }
      }
      const response = await apiService.registerBrowser(userData, endpoint);
      await storageService.saveBrowserKey(response.browserKey);
      const userDataWithMeta = {
        ...userData,
        registered: true,
        registrationDate: (/* @__PURE__ */ new Date()).toISOString()
      };
      await storageService.saveUserData(userDataWithMeta);
      socketService.updateBrowserKey(response.browserKey);
      setState((prev) => ({
        ...prev,
        isRegistered: true,
        browserKey: response.browserKey,
        chatId: response.chatId ?? null
      }));
    },
    [state.isInitialized, state.remoteConfig]
  );
  const updateBrowser = useCallback(
    async (userData) => {
      if (!state.isInitialized) {
        throw new ChatException("Chat not initialized. Call initialize() first.");
      }
      if (!state.browserKey) {
        throw new ChatException("Not registered. Call register() first.");
      }
      const apiService = apiServiceRef.current;
      const storageService = storageServiceRef.current;
      if (!apiService || !storageService) {
        throw new ChatException("Services not initialized");
      }
      const response = await apiService.updateBrowser(state.browserKey, userData);
      const messages = [];
      if (response.lastMessages) {
        for (const m of response.lastMessages) {
          if (typeof m === "object" && m !== null) {
            messages.push(parseChatMessage(m));
          }
        }
      }
      await storageService.saveUserData(userData);
      setState((prev) => ({
        ...prev,
        chatId: response.chatId ?? prev.chatId
      }));
      return messages;
    },
    [state.isInitialized, state.browserKey]
  );
  const updateUserData = useCallback(
    async (data) => {
      if (!state.isInitialized) {
        throw new ChatException("Chat not initialized. Call initialize() first.");
      }
      if (!state.browserKey) {
        throw new ChatException("Not registered. Call register() first.");
      }
      const apiService = apiServiceRef.current;
      const storageService = storageServiceRef.current;
      if (!apiService || !storageService) {
        throw new ChatException("Services not initialized");
      }
      const response = await apiService.updateUserData(state.browserKey, data);
      await storageService.saveUserData(response.userData);
      return response.userData;
    },
    [state.isInitialized, state.browserKey]
  );
  const updateName = useCallback(
    (name) => updateUserData({ name }),
    [updateUserData]
  );
  const updatePhone = useCallback(
    (phone) => updateUserData({ phone }),
    [updateUserData]
  );
  const updateEmail = useCallback(
    (email) => updateUserData({ email }),
    [updateUserData]
  );
  const sendMessage = useCallback(
    async (message, endpoint, metadata) => {
      if (!state.isInitialized) {
        throw new ChatException("Chat not initialized. Call initialize() first.");
      }
      if (!state.browserKey) {
        throw new ChatException("Not registered. Call register() first.");
      }
      const apiService = apiServiceRef.current;
      if (!apiService) {
        throw new ChatException("Services not initialized");
      }
      return await apiService.sendMessage(state.browserKey, message, endpoint, metadata);
    },
    [state.isInitialized, state.browserKey]
  );
  const editMessage = useCallback(
    async (messageId, content) => {
      if (!state.isInitialized) {
        throw new ChatException("Chat not initialized. Call initialize() first.");
      }
      if (!state.browserKey) {
        throw new ChatException("Not registered. Call register() first.");
      }
      const apiService = apiServiceRef.current;
      if (!apiService) {
        throw new ChatException("Services not initialized");
      }
      return await apiService.editMessage(state.browserKey, messageId, content);
    },
    [state.isInitialized, state.browserKey]
  );
  const sendImage = useCallback(
    async (imageUri, endpoint, onProgress, cancelToken) => {
      if (!state.isInitialized) {
        throw new ChatException("Chat not initialized. Call initialize() first.");
      }
      if (!state.browserKey) {
        throw new ChatException("Not registered. Call register() first.");
      }
      const apiService = apiServiceRef.current;
      if (!apiService) {
        throw new ChatException("Services not initialized");
      }
      return await apiService.uploadImage(
        state.browserKey,
        imageUri,
        endpoint,
        onProgress,
        cancelToken
      );
    },
    [state.isInitialized, state.browserKey]
  );
  const sendFile = useCallback(
    async (fileUri, endpoint, onProgress, cancelToken) => {
      if (!state.isInitialized) {
        throw new ChatException("Chat not initialized. Call initialize() first.");
      }
      if (!state.browserKey) {
        throw new ChatException("Not registered. Call register() first.");
      }
      const apiService = apiServiceRef.current;
      if (!apiService) {
        throw new ChatException("Services not initialized");
      }
      return await apiService.uploadFile(
        state.browserKey,
        fileUri,
        endpoint,
        onProgress,
        cancelToken
      );
    },
    [state.isInitialized, state.browserKey]
  );
  const getMessages = useCallback(
    async (page = 1, perPage = 20) => {
      if (!state.isInitialized) {
        throw new ChatException("Chat not initialized. Call initialize() first.");
      }
      if (!state.browserKey) {
        throw new ChatException("Not registered. Call register() first.");
      }
      const apiService = apiServiceRef.current;
      if (!apiService) {
        throw new ChatException("Services not initialized");
      }
      return await apiService.getMessages(state.browserKey, page, perPage);
    },
    [state.isInitialized, state.browserKey]
  );
  const loadMessages = useCallback(
    async (page = 1, perPage = 20) => {
      if (!state.isInitialized) {
        throw new ChatException("Chat not initialized. Call initialize() first.");
      }
      const storageService = storageServiceRef.current;
      const apiService = apiServiceRef.current;
      if (!storageService || !apiService) {
        throw new ChatException("Services not initialized");
      }
      let browserKey = state.browserKey;
      if (!browserKey) {
        browserKey = await storageService.getBrowserKey();
      }
      if (!browserKey) {
        return createEmptyPaginatedMessages(perPage);
      }
      const userData = await storageService.getUserData();
      if (!userData) {
        return createEmptyPaginatedMessages(perPage);
      }
      try {
        return await apiService.getMessages(browserKey, page, perPage);
      } catch {
        return createEmptyPaginatedMessages(perPage);
      }
    },
    [state.isInitialized, state.browserKey]
  );
  const sendTyping = useCallback(
    (isTyping) => {
      if (state.browserKey) {
        socketServiceRef.current?.sendTyping(state.browserKey, isTyping);
      }
    },
    [state.browserKey]
  );
  const onMessage = useCallback((callback) => {
    const socketService = socketServiceRef.current;
    if (!socketService) {
      return () => {
      };
    }
    return socketService.onMessage(callback);
  }, []);
  const onConnectionChange = useCallback(
    (callback) => {
      const socketService = socketServiceRef.current;
      if (!socketService) {
        return () => {
        };
      }
      return socketService.onConnectionChange(callback);
    },
    []
  );
  const onTyping = useCallback((callback) => {
    const socketService = socketServiceRef.current;
    if (!socketService) {
      return () => {
      };
    }
    return socketService.onTyping(callback);
  }, []);
  const reset = useCallback(async () => {
    const storageService = storageServiceRef.current;
    const socketService = socketServiceRef.current;
    if (storageService) {
      await storageService.clearAll();
    }
    if (socketService) {
      socketService.disconnect();
    }
    setState((prev) => ({
      ...prev,
      isRegistered: false,
      browserKey: null,
      chatId: null
    }));
  }, []);
  const disconnect = useCallback(() => {
    socketServiceRef.current?.disconnect();
  }, []);
  const reconnect = useCallback(() => {
    const socketService = socketServiceRef.current;
    const remoteConfig = state.remoteConfig;
    if (socketService && remoteConfig) {
      socketService.connect(
        config.socketUrl ?? remoteConfig.socketUrl,
        remoteConfig.socketApiKey,
        state.browserKey ?? void 0
      );
    }
  }, [config.socketUrl, state.remoteConfig, state.browserKey]);
  const getUserData = useCallback(async () => {
    return await storageServiceRef.current?.getUserData() ?? null;
  }, []);
  const checkIsRegistered = useCallback(async () => {
    return await storageServiceRef.current?.isRegistered() ?? false;
  }, []);
  const createCancelToken = useCallback(() => {
    return new CancelToken();
  }, []);
  const contextValue = useMemo(
    () => ({
      // State
      ...state,
      isActive: state.remoteConfig?.isActive ?? false,
      // Methods
      initialize,
      register,
      updateBrowser,
      updateUserData,
      updateName,
      updatePhone,
      updateEmail,
      sendMessage,
      editMessage,
      sendImage,
      sendFile,
      getMessages,
      loadMessages,
      sendTyping,
      onMessage,
      onConnectionChange,
      onTyping,
      disconnect,
      reconnect,
      reset,
      getUserData,
      checkIsRegistered,
      createCancelToken
    }),
    [
      state,
      initialize,
      register,
      updateBrowser,
      updateUserData,
      updateName,
      updatePhone,
      updateEmail,
      sendMessage,
      editMessage,
      sendImage,
      sendFile,
      getMessages,
      loadMessages,
      sendTyping,
      onMessage,
      onConnectionChange,
      onTyping,
      disconnect,
      reconnect,
      reset,
      getUserData,
      checkIsRegistered,
      createCancelToken
    ]
  );
  return /* @__PURE__ */ jsx(FcrmChatContext.Provider, { value: contextValue, children });
}
function useFcrmChatContext() {
  const context = useContext(FcrmChatContext);
  if (context === void 0) {
    throw new Error("useFcrmChatContext must be used within a FcrmChatProvider");
  }
  return context;
}

// src/hooks/useFcrmChat.ts
function useFcrmChat() {
  return useFcrmChatContext();
}

// src/hooks/useChatMessages.ts
import { useState as useState2, useEffect as useEffect2, useCallback as useCallback2 } from "react";
function useChatMessages(options = {}) {
  const { autoLoad = true, perPage = 20 } = options;
  const { loadMessages, onMessage, isInitialized, isRegistered } = useFcrmChatContext();
  const [messages, setMessages] = useState2([]);
  const [isLoading, setIsLoading] = useState2(false);
  const [error, setError] = useState2(null);
  const [pagination, setPagination] = useState2({ hasMore: false, currentPage: 0, lastPage: 1 });
  useEffect2(() => {
    const unsubscribe = onMessage((newMessage) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === newMessage.id);
        if (exists) {
          return prev.map((m) => m.id === newMessage.id ? newMessage : m);
        }
        return [newMessage, ...prev];
      });
    });
    return unsubscribe;
  }, [onMessage]);
  const refresh = useCallback2(async () => {
    if (!isInitialized) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await loadMessages(1, perPage);
      setMessages(result.messages);
      setPagination({
        hasMore: result.hasMore,
        currentPage: result.currentPage,
        lastPage: result.lastPage
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, loadMessages, perPage]);
  const loadMore = useCallback2(async () => {
    if (!isInitialized || isLoading || !pagination.hasMore) return;
    const nextPage = pagination.currentPage + 1;
    setIsLoading(true);
    try {
      const result = await loadMessages(nextPage, perPage);
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = result.messages.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newMessages];
      });
      setPagination({
        hasMore: result.hasMore,
        currentPage: result.currentPage,
        lastPage: result.lastPage
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, isLoading, loadMessages, perPage, pagination]);
  useEffect2(() => {
    if (autoLoad && isInitialized && isRegistered) {
      refresh();
    }
  }, [autoLoad, isInitialized, isRegistered, refresh]);
  return {
    messages,
    isLoading,
    error,
    hasMore: pagination.hasMore,
    currentPage: pagination.currentPage,
    loadMore,
    refresh
  };
}

// src/hooks/useChatConnection.ts
import { useState as useState3, useEffect as useEffect3 } from "react";
function useChatConnection() {
  const {
    isConnected: contextIsConnected,
    isInitialized,
    isRegistered,
    error,
    onConnectionChange
  } = useFcrmChatContext();
  const [isConnected, setIsConnected] = useState3(contextIsConnected);
  useEffect3(() => {
    setIsConnected(contextIsConnected);
  }, [contextIsConnected]);
  useEffect3(() => {
    const unsubscribe = onConnectionChange((connected) => {
      setIsConnected(connected);
    });
    return unsubscribe;
  }, [onConnectionChange]);
  return {
    isConnected,
    isInitialized,
    isRegistered,
    error
  };
}

// src/hooks/useChatTyping.ts
import { useState as useState4, useEffect as useEffect4, useCallback as useCallback3, useRef as useRef2 } from "react";
function useChatTyping(options = {}) {
  const { debounceMs = 1e3 } = options;
  const { sendTyping: contextSendTyping, onTyping } = useFcrmChatContext();
  const [isOtherTyping, setIsOtherTyping] = useState4(false);
  const typingTimeoutRef = useRef2(null);
  const isCurrentlyTypingRef = useRef2(false);
  useEffect4(() => {
    const unsubscribe = onTyping((typing) => {
      setIsOtherTyping(typing);
    });
    return unsubscribe;
  }, [onTyping]);
  useEffect4(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  const setTyping = useCallback3(
    (text) => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (text.length > 0) {
        if (!isCurrentlyTypingRef.current) {
          isCurrentlyTypingRef.current = true;
          contextSendTyping(true);
        }
        typingTimeoutRef.current = setTimeout(() => {
          isCurrentlyTypingRef.current = false;
          contextSendTyping(false);
          typingTimeoutRef.current = null;
        }, debounceMs);
      } else {
        if (isCurrentlyTypingRef.current) {
          isCurrentlyTypingRef.current = false;
          contextSendTyping(false);
        }
      }
    },
    [contextSendTyping, debounceMs]
  );
  const sendTyping = useCallback3(
    (isTyping) => {
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
    sendTyping
  };
}
export {
  CancelToken,
  ChatApiException,
  ChatApiService,
  ChatException,
  ChatSocketService,
  ChatStorageService,
  FcrmChatProvider,
  UploadCancelledException,
  applyConfigDefaults,
  canEditMessage,
  createEmptyPaginatedMessages,
  generateSignature,
  getApiUrl,
  getMessageEditedAt,
  getMessageOriginalContent,
  getMsHeaderColor,
  getMsNameColor,
  getStartText,
  isAiAgentEnabled,
  isImageContent,
  isMessageEdited,
  isMessageImage,
  parseChatAppRemoteConfig,
  parseChatMessage,
  parseMessageType,
  parsePaginatedMessages,
  parseSocketMessage,
  useChatConnection,
  useChatMessages,
  useChatTyping,
  useFcrmChat,
  useFcrmChatContext
};
