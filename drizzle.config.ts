/**
 * Drizzle Kit設定ファイル
 * マイグレーションとスキーマ生成の設定
 */

import { Config } from 'drizzle-kit';

export default {
  schema: './src/infrastructure/database/schema.ts',
  out: './src/infrastructure/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./local.db',
  },
  verbose: true,
  strict: true,
} satisfies Config;