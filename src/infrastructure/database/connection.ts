/**
 * データベース接続設定
 * Drizzle ORMとLibSQL（SQLite）の接続設定
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// 環境変数からデータベースURL取得
const databaseUrl = process.env.DATABASE_URL || 'file:./local.db';

// LibSQLクライアント作成
export const client = createClient({
  url: databaseUrl,
  // 本番環境では認証トークンを設定
  ...(process.env.DATABASE_AUTH_TOKEN && {
    authToken: process.env.DATABASE_AUTH_TOKEN,
  }),
});

// Drizzle ORMインスタンス作成
export const db = drizzle(client, { schema });

// データベース接続テスト
export async function testConnection(): Promise<boolean> {
  try {
    await client.execute('SELECT 1');
    return true;
  } catch (error) {
    console.error('データベース接続エラー:', error);
    return false;
  }
}

// データベース接続終了
export async function closeConnection(): Promise<void> {
  try {
    client.close();
  } catch (error) {
    console.error('データベース接続終了エラー:', error);
  }
}