/**
 * テンプレートドメインエンティティ
 * テンプレートのビジネスロジックと不変条件を定義
 */

import { BaseEntity } from '../../shared/types/common';
import { DomainError } from '../../shared/types/errors';
import { TEMPLATE_CONSTANTS } from '../../shared/utils/constants';

export type TemplateType = 'technical' | 'business' | 'tutorial' | 'showcase';

export interface TemplateSection {
  title: string;
  content: string;
  order: number;
  required: boolean;
}

export interface TemplateStructure {
  sections: TemplateSection[];
}

export interface TemplatePrompts {
  intro?: string;
  sections?: Record<string, string>;
  conclusion?: string;
}

export interface TemplateProps {
  id: string;
  name: string;
  description?: string;
  type: TemplateType;
  structure: TemplateStructure;
  prompts?: TemplatePrompts;
  isPublic: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Template implements BaseEntity {
  private constructor(private props: TemplateProps) {
    this.validateInvariants();
  }

  // ファクトリーメソッド：新規テンプレート作成
  static create(params: {
    id: string;
    name: string;
    description?: string;
    type: TemplateType;
    structure: TemplateStructure;
    prompts?: TemplatePrompts;
    isPublic?: boolean;
    createdBy?: string;
  }): Template {
    const now = new Date();
    return new Template({
      ...params,
      isPublic: params.isPublic ?? true,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ファクトリーメソッド：既存データからの復元
  static fromPersistence(props: TemplateProps): Template {
    return new Template(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get type(): TemplateType {
    return this.props.type;
  }

  get structure(): TemplateStructure {
    return { ...this.props.structure };
  }

  get prompts(): TemplatePrompts | undefined {
    return this.props.prompts ? { ...this.props.prompts } : undefined;
  }

  get isPublic(): boolean {
    return this.props.isPublic;
  }

  get createdBy(): string | undefined {
    return this.props.createdBy;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ビジネスメソッド：基本情報更新
  updateBasicInfo(params: {
    name?: string;
    description?: string;
    type?: TemplateType;
  }): void {
    if (params.name !== undefined) {
      this.validateName(params.name);
      this.props.name = params.name;
    }

    if (params.description !== undefined) {
      this.validateDescription(params.description);
      this.props.description = params.description;
    }

    if (params.type !== undefined) {
      this.props.type = params.type;
    }

    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：構造更新
  updateStructure(structure: TemplateStructure): void {
    this.validateStructure(structure);
    this.props.structure = { ...structure };
    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：プロンプト更新
  updatePrompts(prompts: TemplatePrompts): void {
    this.props.prompts = { ...prompts };
    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：公開設定変更
  setPublic(isPublic: boolean): void {
    this.props.isPublic = isPublic;
    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：セクション追加
  addSection(section: Omit<TemplateSection, 'order'>): void {
    const maxOrder = Math.max(
      0,
      ...this.props.structure.sections.map(s => s.order)
    );
    
    const newSection: TemplateSection = {
      ...section,
      order: maxOrder + 1,
    };

    this.validateSection(newSection);
    this.props.structure.sections.push(newSection);
    this.props.updatedAt = new Date();
  }

  // ビジネスメソッド：セクション削除
  removeSection(sectionOrder: number): void {
    const sectionIndex = this.props.structure.sections.findIndex(
      s => s.order === sectionOrder
    );

    if (sectionIndex === -1) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'SECTION_NOT_FOUND',
        message: '指定されたセクションが見つかりません',
        timestamp: new Date(),
      });
    }

    // 必須セクションは削除できない
    const section = this.props.structure.sections[sectionIndex];
    if (section.required) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'CANNOT_DELETE_REQUIRED_SECTION',
        message: '必須セクションは削除できません',
        timestamp: new Date(),
      });
    }

    this.props.structure.sections.splice(sectionIndex, 1);
    this.props.updatedAt = new Date();
  }

  // ビジネスルール：セクション並び替え
  reorderSections(sectionOrders: number[]): void {
    if (sectionOrders.length !== this.props.structure.sections.length) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_SECTION_ORDER',
        message: 'セクションの順序が正しくありません',
        timestamp: new Date(),
      });
    }

    // 新しい順序でセクションを並び替え
    const reorderedSections = sectionOrders.map((order, index) => {
      const section = this.props.structure.sections.find(s => s.order === order);
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

    this.props.structure.sections = reorderedSections;
    this.props.updatedAt = new Date();
  }

  // ビジネスルール：必須セクション数の取得
  getRequiredSectionCount(): number {
    return this.props.structure.sections.filter(s => s.required).length;
  }

  // ビジネスルール：推定所要時間の計算
  calculateEstimatedDuration(): number {
    // セクション数に基づく簡易計算（秒単位）
    const baseDuration = 60; // 1分
    const sectionDuration = 30; // セクションあたり30秒
    return baseDuration + (this.props.structure.sections.length * sectionDuration);
  }

  // ビジネスルール：テンプレートの複製
  clone(newId: string, createdBy?: string): Template {
    return Template.create({
      id: newId,
      name: `${this.props.name}のコピー`,
      description: this.props.description,
      type: this.props.type,
      structure: { ...this.props.structure },
      prompts: this.props.prompts ? { ...this.props.prompts } : undefined,
      isPublic: false, // 複製は非公開で開始
      createdBy,
    });
  }

  // 不変条件の検証
  private validateInvariants(): void {
    this.validateName(this.props.name);
    if (this.props.description) {
      this.validateDescription(this.props.description);
    }
    this.validateStructure(this.props.structure);
  }

  // 名前の検証
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_TEMPLATE_NAME',
        message: 'テンプレート名は必須です',
        timestamp: new Date(),
      });
    }

    if (name.length > TEMPLATE_CONSTANTS.MAX_NAME_LENGTH) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_TEMPLATE_NAME',
        message: `テンプレート名は${TEMPLATE_CONSTANTS.MAX_NAME_LENGTH}文字以内で入力してください`,
        timestamp: new Date(),
      });
    }
  }

  // 説明の検証
  private validateDescription(description: string): void {
    if (description.length > TEMPLATE_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_TEMPLATE_DESCRIPTION',
        message: `説明は${TEMPLATE_CONSTANTS.MAX_DESCRIPTION_LENGTH}文字以内で入力してください`,
        timestamp: new Date(),
      });
    }
  }

  // 構造の検証
  private validateStructure(structure: TemplateStructure): void {
    if (!structure.sections || structure.sections.length === 0) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_TEMPLATE_STRUCTURE',
        message: 'テンプレートには最低1つのセクションが必要です',
        timestamp: new Date(),
      });
    }

    structure.sections.forEach(section => this.validateSection(section));
  }

  // セクションの検証
  private validateSection(section: TemplateSection): void {
    if (!section.title || section.title.trim().length === 0) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_SECTION_TITLE',
        message: 'セクションタイトルは必須です',
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

  // エンティティの等価性判定
  equals(other: Template): boolean {
    return this.props.id === other.props.id;
  }

  // 永続化用データの取得
  toPersistence(): TemplateProps {
    return { ...this.props };
  }
}