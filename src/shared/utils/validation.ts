/**
 * Zodバリデーションスキーマ定義
 * アプリケーション全体で使用されるバリデーションスキーマ
 */

import { z } from 'zod';
import { LT_DOCUMENT_CONSTANTS, TEMPLATE_CONSTANTS, VALIDATION_CONSTANTS } from './constants';

// 基本的なバリデーションスキーマ
export const baseValidationSchemas = {
  email: z
    .string()
    .email(VALIDATION_CONSTANTS.MESSAGES.INVALID_EMAIL)
    .min(1, VALIDATION_CONSTANTS.MESSAGES.REQUIRED),
    
  id: z
    .string()
    .min(1, VALIDATION_CONSTANTS.MESSAGES.REQUIRED),
    
  slug: z
    .string()
    .regex(VALIDATION_CONSTANTS.SLUG_REGEX, 'スラッグ形式で入力してください（小文字・数字・ハイフンのみ）'),
    
  timestamp: z
    .date()
    .or(z.string().datetime())
    .or(z.number().int().positive()),
};

// LT資料関連のバリデーションスキーマ
export const ltDocumentValidationSchemas = {
  title: z
    .string()
    .min(1, VALIDATION_CONSTANTS.MESSAGES.REQUIRED)
    .max(LT_DOCUMENT_CONSTANTS.MAX_TITLE_LENGTH, `タイトルは${LT_DOCUMENT_CONSTANTS.MAX_TITLE_LENGTH}文字以内で入力してください`),
    
  content: z
    .string()
    .min(LT_DOCUMENT_CONSTANTS.MIN_CONTENT_LENGTH, `コンテンツは${LT_DOCUMENT_CONSTANTS.MIN_CONTENT_LENGTH}文字以上必要です`)
    .max(LT_DOCUMENT_CONSTANTS.MAX_CONTENT_LENGTH, `コンテンツは${LT_DOCUMENT_CONSTANTS.MAX_CONTENT_LENGTH}文字以内で入力してください`),
    
  duration: z
    .number()
    .int('整数で入力してください')
    .min(LT_DOCUMENT_CONSTANTS.MIN_DURATION_MINUTES * 60, `最低${LT_DOCUMENT_CONSTANTS.MIN_DURATION_MINUTES}分必要です`)
    .max(LT_DOCUMENT_CONSTANTS.MAX_DURATION_MINUTES * 60, `最大${LT_DOCUMENT_CONSTANTS.MAX_DURATION_MINUTES}分以内にしてください`),
    
  section: z.object({
    title: z.string().min(1, 'セクションタイトルは必須です').max(100, 'セクションタイトルは100文字以内で入力してください'),
    content: z.string().min(1, 'セクションコンテンツは必須です'),
    order: z.number().int().min(0, '順序は0以上の整数である必要があります'),
    estimatedTime: z.number().int().min(1, '見積時間は1秒以上である必要があります'),
  }),
  
  sections: z
    .array(z.object({
      title: z.string().min(1, 'セクションタイトルは必須です'),
      content: z.string().min(1, 'セクションコンテンツは必須です'),
      order: z.number().int().min(0),
      estimatedTime: z.number().int().min(1),
    }))
    .min(LT_DOCUMENT_CONSTANTS.MIN_SECTIONS, `最低${LT_DOCUMENT_CONSTANTS.MIN_SECTIONS}個のセクションが必要です`)
    .max(LT_DOCUMENT_CONSTANTS.MAX_SECTIONS, `最大${LT_DOCUMENT_CONSTANTS.MAX_SECTIONS}個のセクションまで作成できます`),
    
  status: z.enum(['draft', 'completed', 'archived'], {
    errorMap: () => ({ message: '有効なステータスを選択してください' }),
  }),
  
  tags: z
    .array(z.string().min(1).max(20))
    .max(10, '最大10個のタグまで設定できます')
    .optional(),
    
  metadata: z.object({
    targetAudience: z.string().max(100).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    keywords: z.array(z.string().max(50)).max(20).optional(),
  }).optional(),
};

// テンプレート関連のバリデーションスキーマ
export const templateValidationSchemas = {
  name: z
    .string()
    .min(1, VALIDATION_CONSTANTS.MESSAGES.REQUIRED)
    .max(TEMPLATE_CONSTANTS.MAX_NAME_LENGTH, `テンプレート名は${TEMPLATE_CONSTANTS.MAX_NAME_LENGTH}文字以内で入力してください`),
    
  description: z
    .string()
    .max(TEMPLATE_CONSTANTS.MAX_DESCRIPTION_LENGTH, `説明は${TEMPLATE_CONSTANTS.MAX_DESCRIPTION_LENGTH}文字以内で入力してください`)
    .optional(),
    
  type: z.enum(['technical', 'business', 'tutorial', 'showcase'], {
    errorMap: () => ({ message: '有効なテンプレートタイプを選択してください' }),
  }),
  
  structure: z.object({
    sections: z.array(z.object({
      title: z.string().min(1, 'セクションタイトルは必須です'),
      content: z.string(),
      order: z.number().int().min(0),
      required: z.boolean(),
    })),
  }),
  
  prompts: z.object({
    intro: z.string().optional(),
    sections: z.record(z.string()).optional(),
    conclusion: z.string().optional(),
  }).optional(),
};

// ユーザー関連のバリデーションスキーマ
export const userValidationSchemas = {
  name: z
    .string()
    .min(1, VALIDATION_CONSTANTS.MESSAGES.REQUIRED)
    .max(100, 'ユーザー名は100文字以内で入力してください'),
    
  email: baseValidationSchemas.email,
  
  preferences: z.object({
    defaultTemplate: z.string().optional(),
    autoSave: z.boolean().default(true),
    theme: z.enum(['light', 'dark']).default('light'),
  }).optional(),
};

// API関連のバリデーションスキーマ
export const apiValidationSchemas = {
  pagination: z.object({
    page: z.number().int().min(1, 'ページは1以上である必要があります').default(1),
    limit: z.number().int().min(1).max(100, '1ページあたり最大100件まで取得できます').default(10),
  }),
  
  search: z.object({
    query: z
      .string()
      .min(2, '検索クエリは2文字以上入力してください')
      .max(100, '検索クエリは100文字以内で入力してください'),
    filters: z.record(z.unknown()).optional(),
  }),
  
  sort: z.object({
    field: z.string().min(1, 'ソートフィールドは必須です'),
    direction: z.enum(['asc', 'desc']).default('desc'),
  }),
};

// フォーム用の統合バリデーションスキーマ
export const formValidationSchemas = {
  createLtDocument: z.object({
    title: ltDocumentValidationSchemas.title,
    content: ltDocumentValidationSchemas.content,
    sections: ltDocumentValidationSchemas.sections,
    templateId: baseValidationSchemas.id.optional(),
    tags: ltDocumentValidationSchemas.tags,
    metadata: ltDocumentValidationSchemas.metadata,
  }),
  
  updateLtDocument: z.object({
    id: baseValidationSchemas.id,
    title: ltDocumentValidationSchemas.title.optional(),
    content: ltDocumentValidationSchemas.content.optional(),
    sections: ltDocumentValidationSchemas.sections.optional(),
    status: ltDocumentValidationSchemas.status.optional(),
    tags: ltDocumentValidationSchemas.tags,
    metadata: ltDocumentValidationSchemas.metadata,
  }),
  
  createTemplate: z.object({
    name: templateValidationSchemas.name,
    description: templateValidationSchemas.description,
    type: templateValidationSchemas.type,
    structure: templateValidationSchemas.structure,
    prompts: templateValidationSchemas.prompts,
    isPublic: z.boolean().default(true),
  }),
  
  createUser: z.object({
    name: userValidationSchemas.name,
    email: userValidationSchemas.email,
    preferences: userValidationSchemas.preferences,
  }),
};

// 型エクスポート
export type CreateLtDocumentInput = z.infer<typeof formValidationSchemas.createLtDocument>;
export type UpdateLtDocumentInput = z.infer<typeof formValidationSchemas.updateLtDocument>;
export type CreateTemplateInput = z.infer<typeof formValidationSchemas.createTemplate>;
export type CreateUserInput = z.infer<typeof formValidationSchemas.createUser>;
export type PaginationInput = z.infer<typeof apiValidationSchemas.pagination>;
export type SearchInput = z.infer<typeof apiValidationSchemas.search>;
export type SortInput = z.infer<typeof apiValidationSchemas.sort>;