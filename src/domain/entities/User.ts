/**
 * ユーザードメインエンティティ
 * ユーザーのビジネスロジックと不変条件を定義
 */

import { BaseEntity } from '../../shared/types/common';
import { DomainError } from '../../shared/types/errors';

export interface UserPreferences {
  defaultTemplate?: string;
  autoSave?: boolean;
  theme?: 'light' | 'dark';
}

export interface UserProps {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export class User implements BaseEntity {
  private constructor(private props: UserProps) {
    this.validateInvariants();
  }

  // ファクトリーメソッド：新規ユーザー作成
  static create(params: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    preferences?: UserPreferences;
  }): User {
    const now = new Date();
    return new User({
      ...params,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ファクトリーメソッド：既存データからの復元
  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get avatar(): string | undefined {
    return this.props.avatar;
  }

  get preferences(): UserPreferences | undefined {
    return this.props.preferences;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ビジネスメソッド：プロフィール更新
  updateProfile(params: {
    name?: string;
    avatar?: string;
  }): void {
    if (params.name !== undefined) {
      this.validateName(params.name);
      this.props.name = params.name;
    }

    if (params.avatar !== undefined) {
      this.props.avatar = params.avatar;
    }

    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：設定更新
  updatePreferences(preferences: Partial<UserPreferences>): void {
    this.props.preferences = {
      ...this.props.preferences,
      ...preferences,
    };
    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：メールアドレス更新
  updateEmail(email: string): void {
    this.validateEmail(email);
    this.props.email = email;
    this.props.updatedAt = new Date();
  }

  // ビジネスルール：デフォルトテンプレートの取得
  getDefaultTemplate(): string | null {
    return this.props.preferences?.defaultTemplate || null;
  }

  // ビジネスルール：自動保存設定の確認
  isAutoSaveEnabled(): boolean {
    return this.props.preferences?.autoSave ?? true;
  }

  // ビジネスルール：テーマ設定の取得
  getTheme(): 'light' | 'dark' {
    return this.props.preferences?.theme || 'light';
  }

  // 不変条件の検証
  private validateInvariants(): void {
    this.validateEmail(this.props.email);
    this.validateName(this.props.name);
  }

  // メールアドレスの検証
  private validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_EMAIL',
        message: 'メールアドレスは必須です',
        timestamp: new Date(),
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_EMAIL',
        message: '有効なメールアドレスを入力してください',
        timestamp: new Date(),
      });
    }
  }

  // 名前の検証
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_NAME',
        message: '名前は必須です',
        timestamp: new Date(),
      });
    }

    if (name.length > 100) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_NAME',
        message: '名前は100文字以内で入力してください',
        timestamp: new Date(),
      });
    }
  }

  // エンティティの等価性判定
  equals(other: User): boolean {
    return this.props.id === other.props.id;
  }

  // 永続化用データの取得
  toPersistence(): UserProps {
    return { ...this.props };
  }
}