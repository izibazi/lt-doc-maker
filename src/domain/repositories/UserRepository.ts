/**
 * ユーザーリポジトリインターフェース
 * ユーザーの永続化に関する操作を定義
 */

import { User } from '../entities/User';
import { SearchCriteria, Pagination } from '../../shared/types/common';

export interface UserRepository {
  // 基本操作
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
  
  // 検索操作
  findAll(criteria?: SearchCriteria): Promise<User[]>;
  findMany(ids: string[]): Promise<User[]>;
  
  // 存在確認
  exists(id: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  
  // カウント
  count(criteria?: SearchCriteria): Promise<number>;
}

export interface UserSearchFilters {
  name?: string;
  email?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}