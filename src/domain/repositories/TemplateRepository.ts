/**
 * テンプレートリポジトリインターフェース
 * テンプレートの永続化に関する操作を定義
 */

import { Template, TemplateType } from '../entities/Template';
import { SearchCriteria } from '../../shared/types/common';

export interface TemplateRepository {
  // 基本操作
  findById(id: string): Promise<Template | null>;
  save(template: Template): Promise<void>;
  delete(id: string): Promise<void>;
  
  // 検索操作
  findAll(criteria?: SearchCriteria): Promise<Template[]>;
  findMany(ids: string[]): Promise<Template[]>;
  findByType(type: TemplateType, criteria?: SearchCriteria): Promise<Template[]>;
  findByCreatedBy(createdBy: string, criteria?: SearchCriteria): Promise<Template[]>;
  findPublic(criteria?: SearchCriteria): Promise<Template[]>;
  
  // 存在確認
  exists(id: string): Promise<boolean>;
  existsByName(name: string, excludeId?: string): Promise<boolean>;
  
  // カウント
  count(criteria?: SearchCriteria): Promise<number>;
  countByType(type: TemplateType): Promise<number>;
  countByCreatedBy(createdBy: string): Promise<number>;
}

export interface TemplateSearchFilters {
  name?: string;
  description?: string;
  type?: TemplateType;
  isPublic?: boolean;
  createdBy?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}