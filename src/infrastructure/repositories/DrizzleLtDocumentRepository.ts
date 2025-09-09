/**
 * DrizzleLT資料リポジトリ実装
 * Drizzle ORMを使用したLT資料の永続化実装
 */

import { and, eq, like, gte, lte, count, sql, desc, asc } from 'drizzle-orm';
import { db } from '../database/connection';
import { ltDocuments } from '../database/schema';
import { LtDocument, DocumentStatus, Difficulty } from '../../domain/entities/LtDocument';
import { 
  LtDocumentRepository, 
  LtDocumentSearchFilters, 
  DocumentStatistics 
} from '../../domain/repositories/LtDocumentRepository';
import { SearchCriteria, Filter } from '../../shared/types/common';
import { SystemError } from '../../shared/types/errors';

export class DrizzleLtDocumentRepository implements LtDocumentRepository {
  async findById(id: string): Promise<LtDocument | null> {
    try {
      const result = await db.select().from(ltDocuments).where(eq(ltDocuments.id, id)).limit(1);
      return result.length > 0 ? this.toDomainEntity(result[0]) : null;
    } catch (error) {
      throw this.handleError('findById', error, { id });
    }
  }

  async save(document: LtDocument): Promise<void> {
    try {
      const persistenceData = document.toPersistence();
      const dbData = this.toDbEntity(persistenceData);

      const existing = await this.exists(document.id);
      
      if (existing) {
        await db.update(ltDocuments)
          .set({
            title: dbData.title,
            content: dbData.content,
            sections: dbData.sections,
            estimatedDuration: dbData.estimatedDuration,
            status: dbData.status,
            tags: dbData.tags,
            metadata: dbData.metadata,
            exportedAt: dbData.exportedAt,
            updatedAt: dbData.updatedAt,
          })
          .where(eq(ltDocuments.id, dbData.id));
      } else {
        await db.insert(ltDocuments).values(dbData);
      }
    } catch (error) {
      throw this.handleError('save', error, { documentId: document.id });
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const exists = await this.exists(id);
      if (!exists) {
        throw new SystemError({
          type: 'SYSTEM_ERROR',
          code: 'DOCUMENT_NOT_FOUND',
          message: `LT資料ID ${id} は存在しません`,
          timestamp: new Date(),
        });
      }

      await db.delete(ltDocuments).where(eq(ltDocuments.id, id));
    } catch (error) {
      throw this.handleError('delete', error, { id });
    }
  }

  async findAll(criteria?: SearchCriteria): Promise<LtDocument[]> {
    try {
      let query = db.select().from(ltDocuments);

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const results = await query;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findAll', error, { criteria });
    }
  }

  async findMany(ids: string[]): Promise<LtDocument[]> {
    try {
      if (ids.length === 0) return [];

      const results = await db.select()
        .from(ltDocuments)
        .where(sql`${ltDocuments.id} IN ${sql.raw(`(${ids.map(() => '?').join(',')})`, ids)}`);

      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findMany', error, { ids });
    }
  }

  async findByUserId(userId: string, criteria?: SearchCriteria): Promise<LtDocument[]> {
    try {
      let query = db.select().from(ltDocuments).where(eq(ltDocuments.userId, userId));

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const results = await query;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findByUserId', error, { userId, criteria });
    }
  }

  async findByStatus(status: DocumentStatus, criteria?: SearchCriteria): Promise<LtDocument[]> {
    try {
      let query = db.select().from(ltDocuments).where(eq(ltDocuments.status, status));

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const results = await query;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findByStatus', error, { status, criteria });
    }
  }

  async findByTemplateId(templateId: string, criteria?: SearchCriteria): Promise<LtDocument[]> {
    try {
      let query = db.select().from(ltDocuments).where(eq(ltDocuments.templateId, templateId));

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const results = await query;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findByTemplateId', error, { templateId, criteria });
    }
  }

  async findByTags(tags: string[], criteria?: SearchCriteria): Promise<LtDocument[]> {
    try {
      // JSONフィールドでのタグ検索（SQLite JSON関数を使用）
      let conditions = tags.map(tag => 
        sql`json_extract(${ltDocuments.tags}, '$') LIKE '%${tag}%'`
      );

      let query = db.select().from(ltDocuments).where(and(...conditions));

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const results = await query;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findByTags', error, { tags, criteria });
    }
  }

  async searchByText(query: string, criteria?: SearchCriteria): Promise<LtDocument[]> {
    try {
      const searchCondition = sql`(
        ${ltDocuments.title} LIKE '%${query}%' OR 
        ${ltDocuments.content} LIKE '%${query}%' OR
        json_extract(${ltDocuments.sections}, '$') LIKE '%${query}%'
      )`;

      let dbQuery = db.select().from(ltDocuments).where(searchCondition);

      if (criteria) {
        dbQuery = this.applyCriteria(dbQuery, criteria);
      }

      const results = await dbQuery;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('searchByText', error, { query, criteria });
    }
  }

  async searchByTitle(query: string, criteria?: SearchCriteria): Promise<LtDocument[]> {
    try {
      let dbQuery = db.select().from(ltDocuments).where(like(ltDocuments.title, `%${query}%`));

      if (criteria) {
        dbQuery = this.applyCriteria(dbQuery, criteria);
      }

      const results = await dbQuery;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('searchByTitle', error, { query, criteria });
    }
  }

  async findRecent(userId: string, limit: number = 10): Promise<LtDocument[]> {
    try {
      const results = await db.select()
        .from(ltDocuments)
        .where(eq(ltDocuments.userId, userId))
        .orderBy(desc(ltDocuments.updatedAt))
        .limit(limit);

      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findRecent', error, { userId, limit });
    }
  }

  async findPopularTags(limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    try {
      // SQLiteでのJSONタグ集計（簡略化された実装）
      const results = await db.execute(sql`
        WITH tag_counts AS (
          SELECT 
            json_each.value as tag,
            COUNT(*) as count
          FROM ${ltDocuments}, json_each(${ltDocuments.tags})
          WHERE ${ltDocuments.tags} IS NOT NULL
          GROUP BY json_each.value
          ORDER BY count DESC
          LIMIT ${limit}
        )
        SELECT tag, count FROM tag_counts
      `);

      return results.rows.map(row => ({
        tag: row[0] as string,
        count: row[1] as number,
      }));
    } catch (error) {
      throw this.handleError('findPopularTags', error, { limit });
    }
  }

  async findByDurationRange(
    minSeconds: number, 
    maxSeconds: number, 
    criteria?: SearchCriteria
  ): Promise<LtDocument[]> {
    try {
      let query = db.select()
        .from(ltDocuments)
        .where(and(
          gte(ltDocuments.estimatedDuration, minSeconds),
          lte(ltDocuments.estimatedDuration, maxSeconds)
        ));

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const results = await query;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findByDurationRange', error, { minSeconds, maxSeconds, criteria });
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const result = await db.select({ count: count() })
        .from(ltDocuments)
        .where(eq(ltDocuments.id, id));
      
      return result[0].count > 0;
    } catch (error) {
      throw this.handleError('exists', error, { id });
    }
  }

  async existsByTitle(title: string, userId: string, excludeId?: string): Promise<boolean> {
    try {
      let conditions = [
        eq(ltDocuments.title, title),
        eq(ltDocuments.userId, userId)
      ];
      
      if (excludeId) {
        conditions.push(sql`${ltDocuments.id} != ${excludeId}`);
      }

      const result = await db.select({ count: count() })
        .from(ltDocuments)
        .where(and(...conditions));
      
      return result[0].count > 0;
    } catch (error) {
      throw this.handleError('existsByTitle', error, { title, userId, excludeId });
    }
  }

  async count(criteria?: SearchCriteria): Promise<number> {
    try {
      let query = db.select({ count: count() }).from(ltDocuments);

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const result = await query;
      return result[0].count;
    } catch (error) {
      throw this.handleError('count', error, { criteria });
    }
  }

  async countByUserId(userId: string): Promise<number> {
    try {
      const result = await db.select({ count: count() })
        .from(ltDocuments)
        .where(eq(ltDocuments.userId, userId));
      
      return result[0].count;
    } catch (error) {
      throw this.handleError('countByUserId', error, { userId });
    }
  }

  async countByStatus(status: DocumentStatus): Promise<number> {
    try {
      const result = await db.select({ count: count() })
        .from(ltDocuments)
        .where(eq(ltDocuments.status, status));
      
      return result[0].count;
    } catch (error) {
      throw this.handleError('countByStatus', error, { status });
    }
  }

  async countByTemplateId(templateId: string): Promise<number> {
    try {
      const result = await db.select({ count: count() })
        .from(ltDocuments)
        .where(eq(ltDocuments.templateId, templateId));
      
      return result[0].count;
    } catch (error) {
      throw this.handleError('countByTemplateId', error, { templateId });
    }
  }

  async getStatsByUserId(userId: string): Promise<DocumentStatistics> {
    try {
      // 基本統計
      const totalResult = await db.select({ count: count() })
        .from(ltDocuments)
        .where(eq(ltDocuments.userId, userId));

      const draftResult = await db.select({ count: count() })
        .from(ltDocuments)
        .where(and(eq(ltDocuments.userId, userId), eq(ltDocuments.status, 'draft')));

      const completedResult = await db.select({ count: count() })
        .from(ltDocuments)
        .where(and(eq(ltDocuments.userId, userId), eq(ltDocuments.status, 'completed')));

      const archivedResult = await db.select({ count: count() })
        .from(ltDocuments)
        .where(and(eq(ltDocuments.userId, userId), eq(ltDocuments.status, 'archived')));

      // 平均時間計算
      const avgResult = await db.execute(sql`
        SELECT AVG(${ltDocuments.estimatedDuration}) as avgDuration
        FROM ${ltDocuments}
        WHERE ${ltDocuments.userId} = ${userId}
      `);

      // 今月と今週の統計
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeekStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

      const thisMonthResult = await db.select({ count: count() })
        .from(ltDocuments)
        .where(and(
          eq(ltDocuments.userId, userId),
          gte(ltDocuments.createdAt, thisMonthStart)
        ));

      const thisWeekResult = await db.select({ count: count() })
        .from(ltDocuments)
        .where(and(
          eq(ltDocuments.userId, userId),
          gte(ltDocuments.createdAt, thisWeekStart)
        ));

      // セクション総数（簡略化）
      const sectionsResult = await db.execute(sql`
        SELECT SUM(json_array_length(${ltDocuments.sections})) as totalSections
        FROM ${ltDocuments}
        WHERE ${ltDocuments.userId} = ${userId}
      `);

      return {
        totalDocuments: totalResult[0].count,
        draftDocuments: draftResult[0].count,
        completedDocuments: completedResult[0].count,
        archivedDocuments: archivedResult[0].count,
        averageDuration: avgResult.rows[0]?.[0] as number || 0,
        totalSections: sectionsResult.rows[0]?.[0] as number || 0,
        mostUsedTags: [], // 簡略化のため空配列
        documentsThisMonth: thisMonthResult[0].count,
        documentsThisWeek: thisWeekResult[0].count,
      };
    } catch (error) {
      throw this.handleError('getStatsByUserId', error, { userId });
    }
  }

  // プライベートメソッド：ドメインエンティティへの変換
  private toDomainEntity(dbDocument: any): LtDocument {
    return LtDocument.fromPersistence({
      id: dbDocument.id,
      title: dbDocument.title,
      content: dbDocument.content,
      sections: dbDocument.sections,
      estimatedDuration: dbDocument.estimatedDuration,
      status: dbDocument.status,
      templateId: dbDocument.templateId,
      userId: dbDocument.userId,
      tags: dbDocument.tags,
      metadata: dbDocument.metadata,
      exportedAt: dbDocument.exportedAt,
      createdAt: dbDocument.createdAt,
      updatedAt: dbDocument.updatedAt,
    });
  }

  // プライベートメソッド：DB エンティティへの変換
  private toDbEntity(documentData: any): any {
    return {
      id: documentData.id,
      title: documentData.title,
      content: documentData.content,
      sections: documentData.sections,
      estimatedDuration: documentData.estimatedDuration,
      status: documentData.status,
      templateId: documentData.templateId,
      userId: documentData.userId,
      tags: documentData.tags,
      metadata: documentData.metadata,
      exportedAt: documentData.exportedAt,
      createdAt: documentData.createdAt,
      updatedAt: documentData.updatedAt,
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
      const orderBy = sortField.direction === 'asc' ? asc : desc;
      
      switch (sortField.field) {
        case 'createdAt':
          query = query.orderBy(orderBy(ltDocuments.createdAt));
          break;
        case 'updatedAt':
          query = query.orderBy(orderBy(ltDocuments.updatedAt));
          break;
        case 'title':
          query = query.orderBy(orderBy(ltDocuments.title));
          break;
        case 'estimatedDuration':
          query = query.orderBy(orderBy(ltDocuments.estimatedDuration));
          break;
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
      case 'title':
        return filter.operator === 'like'
          ? like(ltDocuments.title, `%${filter.value}%`)
          : eq(ltDocuments.title, filter.value as string);

      case 'content':
        return like(ltDocuments.content, `%${filter.value}%`);

      case 'status':
        return eq(ltDocuments.status, filter.value as DocumentStatus);

      case 'templateId':
        return eq(ltDocuments.templateId, filter.value as string);

      case 'userId':
        return eq(ltDocuments.userId, filter.value as string);

      case 'estimatedDuration':
        if (filter.operator === 'gte') {
          return gte(ltDocuments.estimatedDuration, filter.value as number);
        } else if (filter.operator === 'lte') {
          return lte(ltDocuments.estimatedDuration, filter.value as number);
        }
        return eq(ltDocuments.estimatedDuration, filter.value as number);

      case 'createdAt':
        if (filter.operator === 'gte') {
          return gte(ltDocuments.createdAt, filter.value as Date);
        } else if (filter.operator === 'lte') {
          return lte(ltDocuments.createdAt, filter.value as Date);
        }
        return eq(ltDocuments.createdAt, filter.value as Date);

      case 'updatedAt':
        if (filter.operator === 'gte') {
          return gte(ltDocuments.updatedAt, filter.value as Date);
        } else if (filter.operator === 'lte') {
          return lte(ltDocuments.updatedAt, filter.value as Date);
        }
        return eq(ltDocuments.updatedAt, filter.value as Date);

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
      message: `LT資料リポジトリ操作 (${operation}) でエラーが発生しました`,
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