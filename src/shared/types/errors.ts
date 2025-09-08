/**
 * エラー型定義
 * アプリケーション全体で使用されるエラー型を定義
 */

// ベースエラー型
export interface BaseError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// ドメインエラー型
export interface DomainError extends BaseError {
  type: 'DOMAIN_ERROR';
}

// バリデーションエラー型
export interface ValidationError extends BaseError {
  type: 'VALIDATION_ERROR';
  field?: string;
  value?: unknown;
}

// 認証エラー型
export interface AuthenticationError extends BaseError {
  type: 'AUTHENTICATION_ERROR';
}

// 認可エラー型
export interface AuthorizationError extends BaseError {
  type: 'AUTHORIZATION_ERROR';
}

// リソースが見つからないエラー型
export interface NotFoundError extends BaseError {
  type: 'NOT_FOUND_ERROR';
  resource: string;
  id: string;
}

// 競合エラー型
export interface ConflictError extends BaseError {
  type: 'CONFLICT_ERROR';
  conflictingField: string;
}

// システムエラー型
export interface SystemError extends BaseError {
  type: 'SYSTEM_ERROR';
  originalError?: Error;
}

// アプリケーションエラーの統合型
export type AppError = 
  | DomainError
  | ValidationError
  | AuthenticationError
  | AuthorizationError
  | NotFoundError
  | ConflictError
  | SystemError;

// エラーコード定数
export const ERROR_CODES = {
  // バリデーションエラー
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_LENGTH: 'INVALID_LENGTH',
  INVALID_VALUE: 'INVALID_VALUE',
  
  // ビジネスロジックエラー
  DOCUMENT_TOO_LONG: 'DOCUMENT_TOO_LONG',
  INVALID_DURATION: 'INVALID_DURATION',
  TEMPLATE_NOT_COMPATIBLE: 'TEMPLATE_NOT_COMPATIBLE',
  
  // システムエラー
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];