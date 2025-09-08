/**
 * アプリケーション定数
 * アプリケーション全体で使用される定数を定義
 */

// LT資料関連の定数
export const LT_DOCUMENT_CONSTANTS = {
  // 時間制約（分）
  MAX_DURATION_MINUTES: 5,
  MIN_DURATION_MINUTES: 3,
  
  // コンテンツ制約
  MAX_TITLE_LENGTH: 100,
  MAX_CONTENT_LENGTH: 5000,
  MIN_CONTENT_LENGTH: 100,
  
  // セクション制約
  MAX_SECTIONS: 10,
  MIN_SECTIONS: 3,
  
  // 出力フォーマット
  OUTPUT_FORMAT: 'markdown' as const,
  
  // デフォルト値
  DEFAULT_DURATION: 5,
} as const;

// テンプレート関連の定数
export const TEMPLATE_CONSTANTS = {
  MAX_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200,
  
  // テンプレートタイプ
  TYPES: {
    TECHNICAL: 'technical',
    BUSINESS: 'business', 
    TUTORIAL: 'tutorial',
    SHOWCASE: 'showcase',
  } as const,
} as const;

// UI関連の定数
export const UI_CONSTANTS = {
  // ページネーション
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  
  // 検索
  MIN_SEARCH_LENGTH: 2,
  SEARCH_DEBOUNCE_MS: 300,
  
  // ローディング
  MIN_LOADING_TIME_MS: 500,
} as const;

// API関連の定数
export const API_CONSTANTS = {
  BASE_PATH: '/api/v1',
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  
  // エンドポイント
  ENDPOINTS: {
    DOCUMENTS: '/documents',
    TEMPLATES: '/templates',
    USERS: '/users',
  } as const,
} as const;

// ローカルストレージキー
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'lt-doc-maker:user-preferences',
  DRAFT_DOCUMENTS: 'lt-doc-maker:draft-documents',
  RECENT_TEMPLATES: 'lt-doc-maker:recent-templates',
} as const;

// バリデーション関連の定数
export const VALIDATION_CONSTANTS = {
  // 正規表現
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SLUG_REGEX: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  
  // メッセージ
  MESSAGES: {
    REQUIRED: '必須項目です',
    INVALID_EMAIL: '有効なメールアドレスを入力してください',
    TOO_LONG: '文字数制限を超えています',
    TOO_SHORT: '文字数が不足しています',
  } as const,
} as const;