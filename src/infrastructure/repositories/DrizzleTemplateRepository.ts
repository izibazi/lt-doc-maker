/**
 * Drizzleテンプレートリポジトリ実装
 * Drizzle ORMを使用したテンプレートの永続化実装
 */

import { and, eq, like, gte, lte, count, sql } from 'drizzle-orm';
import { db } from '../database/connection';
import { templates } from '../database/schema';
import { Template, TemplateType } from '../../domain/entities/Template';
import { TemplateRepository, TemplateSearchFilters } from '../../domain/repositories/TemplateRepository';
import { SearchCriteria, Filter } from '../../shared/types/common';
import { SystemError } from '../../shared/types/errors';

export class DrizzleTemplateRepository implements TemplateRepository {
  async findById(id: string): Promise<Template | null> {
    try {
      const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
      return result.length > 0 ? this.toDomainEntity(result[0]) : null;
    } catch (error) {
      throw this.handleError('findById', error, { id });
    }
  }

  async save(template: Template): Promise<void> {
    try {
      const persistenceData = template.toPersistence();
      const dbData = this.toDbEntity(persistenceData);

      const existing = await this.exists(template.id);
      
      if (existing) {
        await db.update(templates)
          .set({
            name: dbData.name,
            description: dbData.description,
            type: dbData.type,
            structure: dbData.structure,
            prompts: dbData.prompts,
            isPublic: dbData.isPublic,
            updatedAt: dbData.updatedAt,
          })
          .where(eq(templates.id, dbData.id));
      } else {
        await db.insert(templates).values(dbData);
      }
    } catch (error) {
      throw this.handleError('save', error, { templateId: template.id });
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const exists = await this.exists(id);
      if (!exists) {
        throw new SystemError({
          type: 'SYSTEM_ERROR',
          code: 'TEMPLATE_NOT_FOUND',
          message: `テンプレートID ${id} は存在しません`,
          timestamp: new Date(),
        });
      }

      await db.delete(templates).where(eq(templates.id, id));
    } catch (error) {
      throw this.handleError('delete', error, { id });
    }
  }

  async findAll(criteria?: SearchCriteria): Promise<Template[]> {
    try {
      let query = db.select().from(templates);

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const results = await query;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findAll', error, { criteria });
    }
  }

  async findMany(ids: string[]): Promise<Template[]> {
    try {
      if (ids.length === 0) return [];

      const results = await db.select()
        .from(templates)
        .where(sql`${templates.id} IN ${sql.raw(`(${ids.map(() => '?').join(',')})`, ids)}`);

      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findMany', error, { ids });
    }
  }

  async findByType(type: TemplateType, criteria?: SearchCriteria): Promise<Template[]> {
    try {
      let query = db.select().from(templates).where(eq(templates.type, type));

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const results = await query;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findByType', error, { type, criteria });
    }
  }

  async findByCreatedBy(createdBy: string, criteria?: SearchCriteria): Promise<Template[]> {
    try {
      let query = db.select().from(templates).where(eq(templates.createdBy, createdBy));

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const results = await query;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findByCreatedBy', error, { createdBy, criteria });
    }
  }

  async findPublic(criteria?: SearchCriteria): Promise<Template[]> {
    try {
      let query = db.select().from(templates).where(eq(templates.isPublic, true));

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const results = await query;
      return results.map(result => this.toDomainEntity(result));
    } catch (error) {
      throw this.handleError('findPublic', error, { criteria });
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const result = await db.select({ count: count() })
        .from(templates)
        .where(eq(templates.id, id));
      
      return result[0].count > 0;
    } catch (error) {
      throw this.handleError('exists', error, { id });
    }
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    try {
      let conditions = [eq(templates.name, name)];
      
      if (excludeId) {
        conditions.push(sql`${templates.id} != ${excludeId}`);
      }

      const result = await db.select({ count: count() })
        .from(templates)
        .where(and(...conditions));
      
      return result[0].count > 0;
    } catch (error) {
      throw this.handleError('existsByName', error, { name, excludeId });
    }
  }

  async count(criteria?: SearchCriteria): Promise<number> {
    try {
      let query = db.select({ count: count() }).from(templates);

      if (criteria) {
        query = this.applyCriteria(query, criteria);
      }

      const result = await query;
      return result[0].count;
    } catch (error) {
      throw this.handleError('count', error, { criteria });
    }
  }

  async countByType(type: TemplateType): Promise<number> {
    try {
      const result = await db.select({ count: count() })
        .from(templates)
        .where(eq(templates.type, type));
      
      return result[0].count;
    } catch (error) {
      throw this.handleError('countByType', error, { type });
    }
  }

  async countByCreatedBy(createdBy: string): Promise<number> {
    try {
      const result = await db.select({ count: count() })
        .from(templates)
        .where(eq(templates.createdBy, createdBy));
      
      return result[0].count;
    } catch (error) {
      throw this.handleError('countByCreatedBy', error, { createdBy });
    }
  }

  // プライベートメソッド：ドメインエンティティへの変換
  private toDomainEntity(dbTemplate: any): Template {
    return Template.fromPersistence({
      id: dbTemplate.id,
      name: dbTemplate.name,
      description: dbTemplate.description,
      type: dbTemplate.type,
      structure: dbTemplate.structure,
      prompts: dbTemplate.prompts,
      isPublic: dbTemplate.isPublic,
      createdBy: dbTemplate.createdBy,
      createdAt: dbTemplate.createdAt,
      updatedAt: dbTemplate.updatedAt,
    });
  }

  // プライベートメソッド：DB エンティティへの変換
  private toDbEntity(templateData: any): any {
    return {
      id: templateData.id,
      name: templateData.name,
      description: templateData.description,
      type: templateData.type,
      structure: templateData.structure,
      prompts: templateData.prompts,
      isPublic: templateData.isPublic,
      createdBy: templateData.createdBy,
      createdAt: templateData.createdAt,
      updatedAt: templateData.updatedAt,
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
          ? query.orderBy(templates.createdAt)
          : query.orderBy(sql`${templates.createdAt} DESC`);
      } else if (sortField.field === 'name') {
        query = sortField.direction === 'asc'
          ? query.orderBy(templates.name)
          : query.orderBy(sql`${templates.name} DESC`);
      } else if (sortField.field === 'updatedAt') {
        query = sortField.direction === 'asc'
          ? query.orderBy(templates.updatedAt)
          : query.orderBy(sql`${templates.updatedAt} DESC`);
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
          ? like(templates.name, `%${filter.value}%`)
          : eq(templates.name, filter.value as string);

      case 'description':
        return filter.operator === 'like'
          ? like(templates.description, `%${filter.value}%`)
          : eq(templates.description, filter.value as string);

      case 'type':
        return eq(templates.type, filter.value as TemplateType);

      case 'isPublic':
        return eq(templates.isPublic, filter.value as boolean);

      case 'createdBy':
        return eq(templates.createdBy, filter.value as string);

      case 'createdAt':
        if (filter.operator === 'gte') {
          return gte(templates.createdAt, filter.value as Date);
        } else if (filter.operator === 'lte') {
          return lte(templates.createdAt, filter.value as Date);
        }
        return eq(templates.createdAt, filter.value as Date);

      case 'updatedAt':
        if (filter.operator === 'gte') {
          return gte(templates.updatedAt, filter.value as Date);
        } else if (filter.operator === 'lte') {
          return lte(templates.updatedAt, filter.value as Date);
        }
        return eq(templates.updatedAt, filter.value as Date);

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
      message: `テンプレートリポジトリ操作 (${operation}) でエラーが発生しました`,
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