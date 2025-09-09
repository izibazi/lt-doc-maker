/**
 * LT資料リポジトリインターフェース
 * LT資料の永続化に関する操作を定義
 */

import { LtDocument, DocumentStatus, Difficulty } from '../entities/LtDocument';
import { SearchCriteria } from '../../shared/types/common';

export interface LtDocumentRepository {
  // 基本操作
  findById(id: string): Promise<LtDocument | null>;
  save(document: LtDocument): Promise<void>;
  delete(id: string): Promise<void>;
  
  // 検索操作
  findAll(criteria?: SearchCriteria): Promise<LtDocument[]>;
  findMany(ids: string[]): Promise<LtDocument[]>;
  findByUserId(userId: string, criteria?: SearchCriteria): Promise<LtDocument[]>;
  findByStatus(status: DocumentStatus, criteria?: SearchCriteria): Promise<LtDocument[]>;
  findByTemplateId(templateId: string, criteria?: SearchCriteria): Promise<LtDocument[]>;
  findByTags(tags: string[], criteria?: SearchCriteria): Promise<LtDocument[]>;
  
  // 検索（テキスト）
  searchByText(query: string, criteria?: SearchCriteria): Promise<LtDocument[]>;
  searchByTitle(query: string, criteria?: SearchCriteria): Promise<LtDocument[]>;
  
  // 統計的検索
  findRecent(userId: string, limit?: number): Promise<LtDocument[]>;
  findPopularTags(limit?: number): Promise<Array<{ tag: string; count: number }>>;
  findByDurationRange(minSeconds: number, maxSeconds: number, criteria?: SearchCriteria): Promise<LtDocument[]>;
  
  // 存在確認
  exists(id: string): Promise<boolean>;
  existsByTitle(title: string, userId: string, excludeId?: string): Promise<boolean>;
  
  // カウント
  count(criteria?: SearchCriteria): Promise<number>;
  countByUserId(userId: string): Promise<number>;
  countByStatus(status: DocumentStatus): Promise<number>;
  countByTemplateId(templateId: string): Promise<number>;
  
  // 統計情報
  getStatsByUserId(userId: string): Promise<DocumentStatistics>;
}

export interface LtDocumentSearchFilters {
  title?: string;
  content?: string;
  status?: DocumentStatus;
  templateId?: string;
  userId?: string;
  tags?: string[];
  difficulty?: Difficulty;
  targetAudience?: string;
  keywords?: string[];
  minDuration?: number; // 秒
  maxDuration?: number; // 秒
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  exportedAfter?: Date;
  exportedBefore?: Date;
}

export interface DocumentStatistics {
  totalDocuments: number;
  draftDocuments: number;
  completedDocuments: number;
  archivedDocuments: number;
  averageDuration: number; // 秒
  totalSections: number;
  mostUsedTags: Array<{ tag: string; count: number }>;
  documentsThisMonth: number;
  documentsThisWeek: number;
}