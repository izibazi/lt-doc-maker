/**
 * API型定義
 * APIリクエスト・レスポンス型を定義
 */

import { AppError } from './errors';
import { Pagination } from './common';

// 成功レスポンス型
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    pagination?: Pagination;
    timestamp: string;
  };
}

// エラーレスポンス型
export interface ApiErrorResponse {
  success: false;
  error: AppError;
  message: string;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// API統合レスポンス型
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// APIステータス型
export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

// APIコール状態型
export interface ApiState<T = unknown> {
  status: ApiStatus;
  data?: T;
  error?: AppError;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// HTTPメソッド型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// APIエンドポイント型
export interface ApiEndpoint {
  path: string;
  method: HttpMethod;
  description?: string;
}

// リクエストオプション型
export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// ページネーション付きレスポンス型
export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
  total: number;
}