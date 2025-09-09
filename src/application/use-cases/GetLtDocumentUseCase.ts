/**
 * LT資料取得ユースケース
 * LT資料の取得・検索に関するアプリケーションロジック
 */

import { LtDocument, DocumentStatus } from '../../domain/entities/LtDocument';
import { LtDocumentRepository, DocumentStatistics } from '../../domain/repositories/LtDocumentRepository';
import { ValidationError, NotFoundError } from '../../shared/types/errors';
import { SearchCriteria, Pagination } from '../../shared/types/common';

export interface GetLtDocumentQuery {
  documentId: string;
  userId: string;
}

export interface ListLtDocumentsQuery {
  userId: string;
  status?: DocumentStatus;
  templateId?: string;
  tags?: string[];
  search?: string;
  pagination?: Pagination;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'estimatedDuration';
  sortDirection?: 'asc' | 'desc';
}

export interface GetDocumentStatisticsQuery {
  userId: string;
}

export class GetLtDocumentUseCase {
  constructor(
    private ltDocumentRepository: LtDocumentRepository
  ) {}

  /**
   * 単一のLT資料を取得
   */
  async getDocument(query: GetLtDocumentQuery): Promise<LtDocument> {
    this.validateGetDocumentQuery(query);

    const document = await this.ltDocumentRepository.findById(query.documentId);
    if (!document) {
      throw new NotFoundError({
        type: 'NOT_FOUND_ERROR',
        code: 'DOCUMENT_NOT_FOUND',
        message: 'LT資料が見つかりません',
        resource: 'LtDocument',
        id: query.documentId,
        timestamp: new Date(),
      });
    }

    // 権限チェック（他のユーザーの資料は閲覧不可）
    if (document.userId !== query.userId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'UNAUTHORIZED',
        message: '他のユーザーのLT資料は閲覧できません',
        timestamp: new Date(),
      });
    }

    return document;
  }

  /**
   * ユーザーのLT資料一覧を取得
   */
  async listDocuments(query: ListLtDocumentsQuery): Promise<{
    documents: LtDocument[];
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    this.validateListDocumentsQuery(query);

    // 検索条件の構築
    const criteria: SearchCriteria = {
      filters: [
        { field: 'userId', operator: 'eq', value: query.userId }
      ],
    };

    // ステータスフィルター
    if (query.status) {
      criteria.filters!.push({
        field: 'status',
        operator: 'eq',
        value: query.status,
      });
    }

    // テンプレートフィルター
    if (query.templateId) {
      criteria.filters!.push({
        field: 'templateId',
        operator: 'eq',
        value: query.templateId,
      });
    }

    // タグフィルター（複数タグは AND 条件）
    if (query.tags && query.tags.length > 0) {
      // 実装簡略化のため、最初のタグのみ使用
      // 実際の実装では複数タグの AND/OR 検索を実装
      criteria.filters!.push({
        field: 'tags',
        operator: 'like',
        value: query.tags[0],
      });
    }

    // テキスト検索
    if (query.search) {
      criteria.filters!.push({
        field: 'title',
        operator: 'like',
        value: query.search,
      });
    }

    // ソート
    if (query.sortBy) {
      criteria.sort = [{
        field: query.sortBy,
        direction: query.sortDirection || 'desc',
      }];
    }

    // ページネーション
    const pagination = query.pagination || { page: 1, limit: 10, total: 0, hasNext: false, hasPrev: false };
    criteria.pagination = pagination;

    // 実行
    let documents: LtDocument[];
    
    if (query.search) {
      // テキスト検索の場合
      documents = await this.ltDocumentRepository.searchByText(query.search, criteria);
    } else if (query.tags && query.tags.length > 0) {
      // タグ検索の場合
      documents = await this.ltDocumentRepository.findByTags(query.tags, criteria);
    } else if (query.status) {
      // ステータス検索の場合
      documents = await this.ltDocumentRepository.findByStatus(query.status, criteria);
    } else {
      // 一般的な検索
      documents = await this.ltDocumentRepository.findByUserId(query.userId, criteria);
    }

    // 総数取得
    const totalCount = await this.ltDocumentRepository.countByUserId(query.userId);

    return {
      documents,
      totalCount,
      hasNext: pagination.page * pagination.limit < totalCount,
      hasPrev: pagination.page > 1,
    };
  }

  /**
   * 最近更新されたLT資料を取得
   */
  async getRecentDocuments(userId: string, limit: number = 5): Promise<LtDocument[]> {
    if (!userId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'ユーザーIDは必須です',
        field: 'userId',
        timestamp: new Date(),
      });
    }

    if (limit <= 0 || limit > 50) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'INVALID_VALUE',
        message: 'リミットは1-50の範囲で指定してください',
        field: 'limit',
        value: limit,
        timestamp: new Date(),
      });
    }

    return await this.ltDocumentRepository.findRecent(userId, limit);
  }

  /**
   * ユーザーのLT資料統計を取得
   */
  async getDocumentStatistics(query: GetDocumentStatisticsQuery): Promise<DocumentStatistics> {
    if (!query.userId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'ユーザーIDは必須です',
        field: 'userId',
        timestamp: new Date(),
      });
    }

    return await this.ltDocumentRepository.getStatsByUserId(query.userId);
  }

  /**
   * 人気のタグ一覧を取得
   */
  async getPopularTags(limit: number = 10): Promise<Array<{ tag: string; count: number }>> {
    if (limit <= 0 || limit > 100) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'INVALID_VALUE',
        message: 'リミットは1-100の範囲で指定してください',
        field: 'limit',
        value: limit,
        timestamp: new Date(),
      });
    }

    return await this.ltDocumentRepository.findPopularTags(limit);
  }

  /**
   * 時間範囲でLT資料を検索
   */
  async findByDurationRange(
    userId: string,
    minMinutes: number = 3,
    maxMinutes: number = 5,
    pagination?: Pagination
  ): Promise<LtDocument[]> {
    if (!userId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'ユーザーIDは必須です',
        field: 'userId',
        timestamp: new Date(),
      });
    }

    if (minMinutes <= 0 || maxMinutes <= 0 || minMinutes > maxMinutes) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'INVALID_VALUE',
        message: '有効な時間範囲を指定してください',
        field: 'duration',
        timestamp: new Date(),
      });
    }

    const criteria: SearchCriteria = {
      filters: [
        { field: 'userId', operator: 'eq', value: userId }
      ],
      pagination,
    };

    return await this.ltDocumentRepository.findByDurationRange(
      minMinutes * 60, // 分を秒に変換
      maxMinutes * 60,
      criteria
    );
  }

  private validateGetDocumentQuery(query: GetLtDocumentQuery): void {
    if (!query.documentId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'ドキュメントIDは必須です',
        field: 'documentId',
        timestamp: new Date(),
      });
    }

    if (!query.userId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'ユーザーIDは必須です',
        field: 'userId',
        timestamp: new Date(),
      });
    }
  }

  private validateListDocumentsQuery(query: ListLtDocumentsQuery): void {
    if (!query.userId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'ユーザーIDは必須です',
        field: 'userId',
        timestamp: new Date(),
      });
    }

    if (query.tags && query.tags.length > 10) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'INVALID_VALUE',
        message: 'タグは最大10個まで指定できます',
        field: 'tags',
        value: query.tags,
        timestamp: new Date(),
      });
    }

    if (query.search && query.search.length > 100) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'INVALID_VALUE',
        message: '検索クエリは100文字以内で指定してください',
        field: 'search',
        value: query.search,
        timestamp: new Date(),
      });
    }

    if (query.pagination) {
      if (query.pagination.page <= 0) {
        throw new ValidationError({
          type: 'VALIDATION_ERROR',
          code: 'INVALID_VALUE',
          message: 'ページ番号は1以上である必要があります',
          field: 'pagination.page',
          value: query.pagination.page,
          timestamp: new Date(),
        });
      }

      if (query.pagination.limit <= 0 || query.pagination.limit > 100) {
        throw new ValidationError({
          type: 'VALIDATION_ERROR',
          code: 'INVALID_VALUE',
          message: 'リミットは1-100の範囲で指定してください',
          field: 'pagination.limit',
          value: query.pagination.limit,
          timestamp: new Date(),
        });
      }
    }
  }
}