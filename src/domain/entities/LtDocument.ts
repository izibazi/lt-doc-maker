/**
 * LT資料ドメインエンティティ
 * LT資料のビジネスロジックと不変条件を定義
 */

import { BaseEntity } from '../../shared/types/common';
import { DomainError } from '../../shared/types/errors';
import { LT_DOCUMENT_CONSTANTS } from '../../shared/utils/constants';

export type DocumentStatus = 'draft' | 'completed' | 'archived';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface DocumentSection {
  title: string;
  content: string;
  order: number;
  estimatedTime: number; // 秒単位
}

export interface DocumentMetadata {
  targetAudience?: string;
  difficulty?: Difficulty;
  keywords?: string[];
}

export interface LtDocumentProps {
  id: string;
  title: string;
  content: string;
  sections: DocumentSection[];
  estimatedDuration: number; // 秒単位
  status: DocumentStatus;
  templateId?: string;
  userId: string;
  tags?: string[];
  metadata?: DocumentMetadata;
  exportedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class LtDocument implements BaseEntity {
  private constructor(private props: LtDocumentProps) {
    this.validateInvariants();
  }

  // ファクトリーメソッド：新規LT資料作成
  static create(params: {
    id: string;
    title: string;
    content: string;
    sections: DocumentSection[];
    templateId?: string;
    userId: string;
    tags?: string[];
    metadata?: DocumentMetadata;
  }): LtDocument {
    const now = new Date();
    const estimatedDuration = LtDocument.calculateDuration(params.sections);

    return new LtDocument({
      ...params,
      estimatedDuration,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    });
  }

  // ファクトリーメソッド：テンプレートから作成
  static createFromTemplate(params: {
    id: string;
    title: string;
    templateId: string;
    userId: string;
    sections: DocumentSection[];
  }): LtDocument {
    return LtDocument.create({
      ...params,
      content: '', // テンプレートからの場合は初期コンテンツは空
    });
  }

  // ファクトリーメソッド：既存データからの復元
  static fromPersistence(props: LtDocumentProps): LtDocument {
    return new LtDocument(props);
  }

  // 静的メソッド：所要時間の計算
  private static calculateDuration(sections: DocumentSection[]): number {
    const totalSectionTime = sections.reduce((total, section) => {
      return total + section.estimatedTime;
    }, 0);

    // 導入と結論の時間を加算（各30秒）
    return totalSectionTime + 60;
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get title(): string {
    return this.props.title;
  }

  get content(): string {
    return this.props.content;
  }

  get sections(): DocumentSection[] {
    return [...this.props.sections];
  }

  get estimatedDuration(): number {
    return this.props.estimatedDuration;
  }

  get status(): DocumentStatus {
    return this.props.status;
  }

  get templateId(): string | undefined {
    return this.props.templateId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get tags(): string[] | undefined {
    return this.props.tags ? [...this.props.tags] : undefined;
  }

  get metadata(): DocumentMetadata | undefined {
    return this.props.metadata ? { ...this.props.metadata } : undefined;
  }

  get exportedAt(): Date | undefined {
    return this.props.exportedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ビジネスメソッド：基本情報更新
  updateBasicInfo(params: {
    title?: string;
    content?: string;
    tags?: string[];
    metadata?: DocumentMetadata;
  }): void {
    if (params.title !== undefined) {
      this.validateTitle(params.title);
      this.props.title = params.title;
    }

    if (params.content !== undefined) {
      this.validateContent(params.content);
      this.props.content = params.content;
    }

    if (params.tags !== undefined) {
      this.validateTags(params.tags);
      this.props.tags = [...params.tags];
    }

    if (params.metadata !== undefined) {
      this.props.metadata = { ...params.metadata };
    }

    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：セクション更新
  updateSections(sections: DocumentSection[]): void {
    this.validateSections(sections);
    this.props.sections = [...sections];
    this.props.estimatedDuration = LtDocument.calculateDuration(sections);
    
    // 時間制約の確認
    this.validateDuration();
    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：セクション追加
  addSection(section: Omit<DocumentSection, 'order'>): void {
    const maxOrder = Math.max(0, ...this.props.sections.map(s => s.order));
    const newSection: DocumentSection = {
      ...section,
      order: maxOrder + 1,
    };

    this.validateSection(newSection);
    this.props.sections.push(newSection);
    this.props.estimatedDuration = LtDocument.calculateDuration(this.props.sections);
    
    this.validateDuration();
    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：セクション削除
  removeSection(sectionOrder: number): void {
    const sectionIndex = this.props.sections.findIndex(s => s.order === sectionOrder);
    
    if (sectionIndex === -1) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'SECTION_NOT_FOUND',
        message: '指定されたセクションが見つかりません',
        timestamp: new Date(),
      });
    }

    this.props.sections.splice(sectionIndex, 1);
    this.props.estimatedDuration = LtDocument.calculateDuration(this.props.sections);
    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：ステータス変更
  changeStatus(status: DocumentStatus): void {
    // 完了状態への変更時は追加検証
    if (status === 'completed') {
      this.validateForCompletion();
    }

    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：エクスポート実行
  markAsExported(): void {
    if (this.props.status !== 'completed') {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'DOCUMENT_NOT_COMPLETED',
        message: '完了状態の資料のみエクスポートできます',
        timestamp: new Date(),
      });
    }

    this.props.exportedAt = new Date();
    this.props.updatedAt = new Date();
  }

  // ビジネスルール：所要時間が制限内かチェック
  isWithinTimeLimit(): boolean {
    const maxDurationSeconds = LT_DOCUMENT_CONSTANTS.MAX_DURATION_MINUTES * 60;
    const minDurationSeconds = LT_DOCUMENT_CONSTANTS.MIN_DURATION_MINUTES * 60;
    
    return this.props.estimatedDuration >= minDurationSeconds && 
           this.props.estimatedDuration <= maxDurationSeconds;
  }

  // ビジネスルール：所要時間を分で取得
  getEstimatedDurationInMinutes(): number {
    return Math.round(this.props.estimatedDuration / 60 * 10) / 10; // 小数点1桁まで
  }

  // ビジネスルール：完了可能かチェック
  canComplete(): boolean {
    return this.props.content.trim().length >= LT_DOCUMENT_CONSTANTS.MIN_CONTENT_LENGTH &&
           this.props.sections.length >= LT_DOCUMENT_CONSTANTS.MIN_SECTIONS &&
           this.isWithinTimeLimit();
  }

  // ビジネスルール：アーカイブ可能かチェック
  canArchive(): boolean {
    return this.props.status === 'completed' || this.props.status === 'draft';
  }

  // ビジネスルール：編集可能かチェック
  isEditable(): boolean {
    return this.props.status === 'draft';
  }

  // ビジネスルール：セクション並び替え
  reorderSections(sectionOrders: number[]): void {
    if (sectionOrders.length !== this.props.sections.length) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_SECTION_ORDER',
        message: 'セクションの順序が正しくありません',
        timestamp: new Date(),
      });
    }

    const reorderedSections = sectionOrders.map((order, index) => {
      const section = this.props.sections.find(s => s.order === order);
      if (!section) {
        throw new DomainError({
          type: 'DOMAIN_ERROR',
          code: 'SECTION_NOT_FOUND',
          message: '指定されたセクションが見つかりません',
          timestamp: new Date(),
        });
      }
      return { ...section, order: index };
    });

    this.props.sections = reorderedSections;
    this.props.updatedAt = new Date();
  }

  // 不変条件の検証
  private validateInvariants(): void {
    this.validateTitle(this.props.title);
    this.validateContent(this.props.content);
    this.validateSections(this.props.sections);
    this.validateDuration();
    if (this.props.tags) {
      this.validateTags(this.props.tags);
    }
  }

  // タイトルの検証
  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_TITLE',
        message: 'タイトルは必須です',
        timestamp: new Date(),
      });
    }

    if (title.length > LT_DOCUMENT_CONSTANTS.MAX_TITLE_LENGTH) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_TITLE',
        message: `タイトルは${LT_DOCUMENT_CONSTANTS.MAX_TITLE_LENGTH}文字以内で入力してください`,
        timestamp: new Date(),
      });
    }
  }

  // コンテンツの検証
  private validateContent(content: string): void {
    if (content.length > LT_DOCUMENT_CONSTANTS.MAX_CONTENT_LENGTH) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'CONTENT_TOO_LONG',
        message: `コンテンツは${LT_DOCUMENT_CONSTANTS.MAX_CONTENT_LENGTH}文字以内で入力してください`,
        timestamp: new Date(),
      });
    }
  }

  // セクション配列の検証
  private validateSections(sections: DocumentSection[]): void {
    if (sections.length > LT_DOCUMENT_CONSTANTS.MAX_SECTIONS) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'TOO_MANY_SECTIONS',
        message: `セクションは最大${LT_DOCUMENT_CONSTANTS.MAX_SECTIONS}個まで作成できます`,
        timestamp: new Date(),
      });
    }

    sections.forEach(section => this.validateSection(section));
  }

  // セクション単体の検証
  private validateSection(section: DocumentSection): void {
    if (!section.title || section.title.trim().length === 0) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_SECTION_TITLE',
        message: 'セクションタイトルは必須です',
        timestamp: new Date(),
      });
    }

    if (section.estimatedTime <= 0) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_SECTION_TIME',
        message: 'セクションの見積時間は1秒以上である必要があります',
        timestamp: new Date(),
      });
    }

    if (section.order < 0) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_SECTION_ORDER',
        message: 'セクションの順序は0以上である必要があります',
        timestamp: new Date(),
      });
    }
  }

  // タグの検証
  private validateTags(tags: string[]): void {
    if (tags.length > 10) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'TOO_MANY_TAGS',
        message: 'タグは最大10個まで設定できます',
        timestamp: new Date(),
      });
    }

    tags.forEach(tag => {
      if (tag.length > 20) {
        throw new DomainError({
          type: 'DOMAIN_ERROR',
          code: 'TAG_TOO_LONG',
          message: 'タグは20文字以内で入力してください',
          timestamp: new Date(),
        });
      }
    });
  }

  // 所要時間の検証
  private validateDuration(): void {
    if (!this.isWithinTimeLimit()) {
      const minMinutes = LT_DOCUMENT_CONSTANTS.MIN_DURATION_MINUTES;
      const maxMinutes = LT_DOCUMENT_CONSTANTS.MAX_DURATION_MINUTES;
      
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_DURATION',
        message: `LT資料の所要時間は${minMinutes}分以上${maxMinutes}分以内にしてください`,
        timestamp: new Date(),
      });
    }
  }

  // 完了時の検証
  private validateForCompletion(): void {
    if (!this.canComplete()) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'CANNOT_COMPLETE',
        message: 'コンテンツ不足または時間制約により完了できません',
        timestamp: new Date(),
      });
    }
  }

  // エンティティの等価性判定
  equals(other: LtDocument): boolean {
    return this.props.id === other.props.id;
  }

  // 永続化用データの取得
  toPersistence(): LtDocumentProps {
    return { ...this.props };
  }
}