/**
 * Drizzleユーザーリポジトリ実装
 * Drizzle ORMを使用したユーザーの永続化実装
 */

import { and, eq, like, gte, lte, count, sql } from 'drizzle-orm';
import { db } from '../database/connection';
import { users } from '../database/schema';
import { User } from '../../domain/entities/User';
import { UserRepository, UserSearchFilters } from '../../domain/repositories/UserRepository';
import { SearchCriteria, Filter } from '../../shared/types/common';
import { SystemError } from '../../shared/types/errors';

export class DrizzleUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result.length > 0 ? this.toDomainEntity(result[0]) : null;
    } catch (error) {
      throw this.handleError('findById', error, { id });
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result.length > 0 ? this.toDomainEntity(result[0]) : null;
    } catch (error) {
      throw this.handleError('findByEmail', error, { email });
    }
  }

  async save(user: User): Promise<void> {
    try {
      const persistenceData = user.toPersistence();
      const dbData = this.toDbEntity(persistenceData);

      // 既存チェック
      const existing = await this.exists(user.id);
      
      if (existing) {
        await db.update(users)
          .set({
            email: dbData.email,
            name: dbData.name,
            avatar: dbData.avatar,
            preferences: dbData.preferences,
            updatedAt: dbData.updatedAt,
          })
          .where(eq(users.id, dbData.id));
      } else {
        await db.insert(users).values(dbData);
      }
    } catch (error) {
      throw this.handleError('save', error, { userId: user.id });
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      // Drizzle ORMでは削除された行数を直接取得できないため、削除前に存在チェックを行う
      const exists = await this.exists(id);
      if (!exists) {
        throw new SystemError({
          type: 'SYSTEM_ERROR',
          code: 'USER_NOT_FOUND',
          message: `ユーザーID ${id} は存在しません`,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      throw this.handleError('delete', error, { id });
    }
  }

  async findAll(criteria?: SearchCriteria): Promise<User[]> {
    try {
      let query = db.select().from(users);

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const results = await query;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findAll', error, { criteria });
    }
  }

  async findMany(ids: string[]): Promise<User[]> {
    try {
      if (ids.length === 0) return [];

      const results = await db.select()
        .from(users)
        .where(sql`${users.id} IN ${sql.raw(`(${ids.map(() => '?').join(',')})`, ids)}`);

      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findMany', error, { ids });
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const result = await db.select({ count: count() })
        .from(users)
        .where(eq(users.id, id));
      
      return result[0].count > 0;
    } catch (error) {
      throw this.handleError('exists', error, { id });
    }
  }

  async existsByEmail(email: string): Promise<boolean> {
    try {
      const result = await db.select({ count: count() })
        .from(users)
        .where(eq(users.email, email));
      
      return result[0].count > 0;
    } catch (error) {
      throw this.handleError('existsByEmail', error, { email });
    }
  }

  async count(criteria?: SearchCriteria): Promise<number> {
    try {
      let query = db.select({ count: count() }).from(users);

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const result = await query;
      return result[0].count;
    } catch (error) {
      throw this.handleError('count', error, { criteria });
    }
  }

  // プライベートメソッド：ドメインエンティティへの変換
  private toDomainEntity(dbUser: any): User {
    return User.fromPersistence({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      avatar: dbUser.avatar,
      preferences: dbUser.preferences,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    });
  }

  // プライベートメソッド：DB エンティティへの変換
  private toDbEntity(userData: any): any {
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
      preferences: userData.preferences,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };
  }

  // プライベートメソッド：検索条件の適用
  private applyCriteria(query: any, criteria: SearchCriteria): any {
    let conditions: any[] = [];

    if (criteria.filters) {
      criteria.filters.forEach(filter => {
        conditions.push(this.buildFilterCondition(filter));
      });
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // ソート適用
    if (criteria.sort && criteria.sort.length > 0) {
      const sortField = criteria.sort[0];
      if (sortField.field === 'createdAt') {
        query = sortField.direction === 'asc' 
          ? query.orderBy(users.createdAt)
          : query.orderBy(sql`${users.createdAt} DESC`);
      } else if (sortField.field === 'name') {
        query = sortField.direction === 'asc'
          ? query.orderBy(users.name)
          : query.orderBy(sql`${users.name} DESC`);
      }
    }

    // ページネーション適用
    if (criteria.pagination) {
      const offset = (criteria.pagination.page - 1) * criteria.pagination.limit;
      query = query.offset(offset).limit(criteria.pagination.limit);
    }

    return query;
  }

  // プライベートメソッド：フィルター条件の構築
  private buildFilterCondition(filter: Filter): any {
    switch (filter.field) {
      case 'name':
        return filter.operator === 'like'
          ? like(users.name, `%${filter.value}%`)
          : eq(users.name, filter.value as string);

      case 'email':
        return filter.operator === 'like'
          ? like(users.email, `%${filter.value}%`)
          : eq(users.email, filter.value as string);

      case 'createdAt':
        if (filter.operator === 'gte') {
          return gte(users.createdAt, filter.value as Date);
        } else if (filter.operator === 'lte') {
          return lte(users.createdAt, filter.value as Date);
        }
        return eq(users.createdAt, filter.value as Date);

      default:
        throw new SystemError({
          type: 'SYSTEM_ERROR',
          code: 'INVALID_FILTER_FIELD',
          message: `サポートされていないフィルターフィールド: ${filter.field}`,
          timestamp: new Date(),
        });
    }
  }

  // プライベートメソッド：エラーハンドリング
  private handleError(operation: string, error: unknown, context?: Record<string, unknown>): SystemError {
    return new SystemError({
      type: 'SYSTEM_ERROR',
      code: 'DATABASE_ERROR',
      message: `ユーザーリポジトリ操作 (${operation}) でエラーが発生しました`,
      details: {
        operation,
        context,
        originalError: error instanceof Error ? error.message : String(error),
      },
      timestamp: new Date(),
      originalError: error instanceof Error ? error : new Error(String(error)),
    });
  }
}