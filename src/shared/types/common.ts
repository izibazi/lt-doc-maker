/**
 * 共通型定義
 * アプリケーション全体で使用されるベース型を定義
 */

// ベースエンティティ型
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ページネーション型
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ソート型
export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
}

// フィルター型
export interface Filter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
  value: unknown;
}

// 検索条件型
export interface SearchCriteria {
  filters?: Filter[];
  sort?: Sort[];
  pagination?: Pagination;
}

// ID型（型安全性を高めるため）
export type EntityId = string;
export type UserId = string;
export type LtDocumentId = string;
export type TemplateId = string;