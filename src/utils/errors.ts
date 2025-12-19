/**
 * Base exception for chat SDK errors
 */
export class ChatException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatException';
    // Maintains proper stack trace for where error was thrown (V8 engines)
    const ErrorWithCapture = Error as typeof Error & {
      captureStackTrace?: (target: object, constructor: Function) => void;
    };
    if (ErrorWithCapture.captureStackTrace) {
      ErrorWithCapture.captureStackTrace(this, ChatException);
    }
  }
}

/**
 * API exception with status code
 */
export class ChatApiException extends ChatException {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ChatApiException';
    this.statusCode = statusCode;
    const ErrorWithCapture = Error as typeof Error & {
      captureStackTrace?: (target: object, constructor: Function) => void;
    };
    if (ErrorWithCapture.captureStackTrace) {
      ErrorWithCapture.captureStackTrace(this, ChatApiException);
    }
  }

  override toString(): string {
    return `ChatApiException: ${this.message} (status: ${this.statusCode})`;
  }
}

/**
 * Exception thrown when an upload is cancelled
 */
export class UploadCancelledException extends ChatException {
  constructor(message: string = 'Upload was cancelled') {
    super(message);
    this.name = 'UploadCancelledException';
    const ErrorWithCapture = Error as typeof Error & {
      captureStackTrace?: (target: object, constructor: Function) => void;
    };
    if (ErrorWithCapture.captureStackTrace) {
      ErrorWithCapture.captureStackTrace(this, UploadCancelledException);
    }
  }
}
