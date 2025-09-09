/**
 * Drizzle ORMスキーマ定義
 * データベーステーブルの定義
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ユーザーテーブル
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  preferences: text('preferences', { mode: 'json' }).$type<{
    defaultTemplate?: string;
    autoSave?: boolean;
    theme?: 'light' | 'dark';
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// テンプレートテーブル  
export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().$type<'technical' | 'business' | 'tutorial' | 'showcase'>(),
  structure: text('structure', { mode: 'json' }).notNull().$type<{
    sections: Array<{
      title: string;
      content: string;
      order: number;
      required: boolean;
    }>;
  }>(),
  prompts: text('prompts', { mode: 'json' }).$type<{
    intro?: string;
    sections?: Record<string, string>;
    conclusion?: string;
  }>(),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(true),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// LT資料テーブル
export const ltDocuments = sqliteTable('lt_documents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  sections: text('sections', { mode: 'json' }).notNull().$type<Array<{
    title: string;
    content: string;
    order: number;
    estimatedTime: number; // 秒単位
  }>>(),
  estimatedDuration: integer('estimated_duration').notNull(), // 秒単位
  status: text('status').notNull().default('draft').$type<'draft' | 'completed' | 'archived'>(),
  templateId: text('template_id').references(() => templates.id),
  userId: text('user_id').notNull().references(() => users.id),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  metadata: text('metadata', { mode: 'json' }).$type<{
    targetAudience?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    keywords?: string[];
  }>(),
  exportedAt: integer('exported_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Zodスキーマの生成
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email('有効なメールアドレスを入力してください'),
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
});

export const selectUserSchema = createSelectSchema(users);

export const insertTemplateSchema = createInsertSchema(templates, {
  name: z.string().min(1, 'テンプレート名は必須です').max(50, 'テンプレート名は50文字以内で入力してください'),
  description: z.string().max(200, '説明は200文字以内で入力してください').optional(),
  type: z.enum(['technical', 'business', 'tutorial', 'showcase']),
});

export const selectTemplateSchema = createSelectSchema(templates);

export const insertLtDocumentSchema = createInsertSchema(ltDocuments, {
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルは100文字以内で入力してください'),
  content: z.string().min(100, 'コンテンツは100文字以上必要です').max(5000, 'コンテンツは5000文字以内で入力してください'),
  estimatedDuration: z.number().min(180, '最低3分必要です').max(300, '最大5分以内にしてください'), // 3-5分（秒）
});

export const selectLtDocumentSchema = createSelectSchema(ltDocuments);

// 型エクスポート
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

export type LtDocument = typeof ltDocuments.$inferSelect;
export type NewLtDocument = typeof ltDocuments.$inferInsert;

// バリデーション型エクスポート
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = z.infer<typeof selectUserSchema>;

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type SelectTemplate = z.infer<typeof selectTemplateSchema>;

export type InsertLtDocument = z.infer<typeof insertLtDocumentSchema>;
export type SelectLtDocument = z.infer<typeof selectLtDocumentSchema>;