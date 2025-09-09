/**
 * テンプレート適用ユースケース
 * 既存のLT資料にテンプレートを適用するアプリケーションロジック
 */

import { LtDocument } from '../../domain/entities/LtDocument';
import { Template } from '../../domain/entities/Template';
import { LtDocumentRepository } from '../../domain/repositories/LtDocumentRepository';
import { TemplateRepository } from '../../domain/repositories/TemplateRepository';
import { TemplateApplicationService } from '../../domain/services/TemplateApplicationService';
import { ValidationError, NotFoundError, DomainError } from '../../shared/types/errors';

export interface ApplyTemplateCommand {
  documentId: string;
  templateId: string;
  userId: string;
  options?: {
    preserveContent?: boolean;
    forceApply?: boolean;
    customSections?: Array<{
      order: number;
      title?: string;
      content?: string;
      estimatedTime?: number;
    }>;
  };
}

export interface ApplyTemplateResult {
  document: LtDocument;
  compatibilityScore: number;
  appliedSections: number;
  skippedSections: string[];
  warnings: string[];
  recommendations: string[];
}

export class ApplyTemplateUseCase {
  constructor(
    private ltDocumentRepository: LtDocumentRepository,
    private templateRepository: TemplateRepository,
    private templateApplicationService: TemplateApplicationService
  ) {}

  async execute(command: ApplyTemplateCommand): Promise<ApplyTemplateResult> {
    // 入力検証
    this.validateCommand(command);

    // ドキュメント取得
    const document = await this.ltDocumentRepository.findById(command.documentId);
    if (!document) {
      throw new NotFoundError({
        type: 'NOT_FOUND_ERROR',
        code: 'DOCUMENT_NOT_FOUND',
        message: 'LT資料が見つかりません',
        resource: 'LtDocument',
        id: command.documentId,
        timestamp: new Date(),
      });
    }

    // 権限チェック
    if (document.userId !== command.userId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'UNAUTHORIZED',
        message: '他のユーザーのLT資料にはテンプレートを適用できません',
        timestamp: new Date(),
      });
    }

    // 編集可能状態チェック
    if (!document.isEditable()) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'DOCUMENT_NOT_EDITABLE',
        message: '現在の状態ではテンプレートを適用できません',
        timestamp: new Date(),
      });
    }

    // テンプレート取得
    const template = await this.templateRepository.findById(command.templateId);
    if (!template) {
      throw new NotFoundError({
        type: 'NOT_FOUND_ERROR',
        code: 'TEMPLATE_NOT_FOUND',
        message: 'テンプレートが見つかりません',
        resource: 'Template',
        id: command.templateId,
        timestamp: new Date(),
      });
    }

    // 互換性チェック
    const compatibilityCheck = this.templateApplicationService.checkTemplateCompatibility(
      template,
      document
    );

    // 強制適用でない場合、互換性が低い場合は警告
    if (!command.options?.forceApply && !compatibilityCheck.isCompatible) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'TEMPLATE_INCOMPATIBLE',
        message: 'テンプレートとドキュメントの互換性が低いです',
        details: {
          score: compatibilityCheck.score,
          reasons: compatibilityCheck.reasons,
          recommendations: compatibilityCheck.recommendations,
        },
        timestamp: new Date(),
      });
    }

    // テンプレート適用
    const applicationResult = this.templateApplicationService.applyTemplateToDocument({
      template,
      targetDocument: document,
      preserveContent: command.options?.preserveContent ?? true,
      customSections: command.options?.customSections,
    });

    // 結果の保存
    await this.ltDocumentRepository.save(applicationResult.updatedDocument);

    return {
      document: applicationResult.updatedDocument,
      compatibilityScore: compatibilityCheck.score,
      appliedSections: applicationResult.appliedSections.length,
      skippedSections: applicationResult.skippedSections,
      warnings: [
        ...applicationResult.warnings,
        ...compatibilityCheck.reasons,
      ],
      recommendations: compatibilityCheck.recommendations,
    };
  }

  /**
   * テンプレート適用のプレビュー（実際に適用せずに結果を確認）
   */
  async preview(command: ApplyTemplateCommand): Promise<{
    compatibilityCheck: any;
    sectionsPreview: Array<{
      currentTitle?: string;
      newTitle: string;
      action: 'create' | 'update' | 'merge' | 'skip';
      reason: string;
    }>;
    estimatedChanges: {
      sectionsAdded: number;
      sectionsModified: number;
      sectionsRemoved: number;
      durationChange: number; // 秒
    };
  }> {
    // 入力検証
    this.validateCommand(command);

    // エンティティ取得（実際の適用と同じ検証）
    const document = await this.ltDocumentRepository.findById(command.documentId);
    if (!document) {
      throw new NotFoundError({
        type: 'NOT_FOUND_ERROR',
        code: 'DOCUMENT_NOT_FOUND',
        message: 'LT資料が見つかりません',
        resource: 'LtDocument',
        id: command.documentId,
        timestamp: new Date(),
      });
    }

    if (document.userId !== command.userId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'UNAUTHORIZED',
        message: '他のユーザーのLT資料にはテンプレートを適用できません',
        timestamp: new Date(),
      });
    }

    const template = await this.templateRepository.findById(command.templateId);
    if (!template) {
      throw new NotFoundError({
        type: 'NOT_FOUND_ERROR',
        code: 'TEMPLATE_NOT_FOUND',
        message: 'テンプレートが見つかりません',
        resource: 'Template',
        id: command.templateId,
        timestamp: new Date(),
      });
    }

    // 互換性チェック
    const compatibilityCheck = this.templateApplicationService.checkTemplateCompatibility(
      template,
      document
    );

    // セクションプレビューの生成
    const existingSections = document.sections;
    const templateSections = template.structure.sections;
    
    const sectionsPreview = templateSections.map((templateSection, index) => {
      const existingSection = existingSections[index];
      
      if (!existingSection) {
        return {
          newTitle: templateSection.title,
          action: 'create' as const,
          reason: 'テンプレートから新しいセクションを追加',
        };
      }

      const similarity = this.calculateSectionSimilarity(
        existingSection.title,
        templateSection.title
      );

      if (similarity > 0.7) {
        return {
          currentTitle: existingSection.title,
          newTitle: templateSection.title,
          action: 'merge' as const,
          reason: '類似したセクションをマージ',
        };
      } else if (command.options?.preserveContent) {
        return {
          currentTitle: existingSection.title,
          newTitle: templateSection.title,
          action: 'update' as const,
          reason: 'タイトルを更新、コンテンツは保持',
        };
      } else {
        return {
          currentTitle: existingSection.title,
          newTitle: templateSection.title,
          action: 'update' as const,
          reason: 'テンプレートの内容で置き換え',
        };
      }
    });

    // 変更予測の計算
    const estimatedChanges = {
      sectionsAdded: Math.max(0, templateSections.length - existingSections.length),
      sectionsModified: Math.min(templateSections.length, existingSections.length),
      sectionsRemoved: Math.max(0, existingSections.length - templateSections.length),
      durationChange: template.calculateEstimatedDuration() - document.estimatedDuration,
    };

    return {
      compatibilityCheck,
      sectionsPreview,
      estimatedChanges,
    };
  }

  private validateCommand(command: ApplyTemplateCommand): void {
    if (!command.documentId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'ドキュメントIDは必須です',
        field: 'documentId',
        timestamp: new Date(),
      });
    }

    if (!command.templateId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'テンプレートIDは必須です',
        field: 'templateId',
        timestamp: new Date(),
      });
    }

    if (!command.userId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'ユーザーIDは必須です',
        field: 'userId',
        timestamp: new Date(),
      });
    }

    if (command.documentId === command.templateId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'INVALID_VALUE',
        message: 'ドキュメントIDとテンプレートIDは異なる値である必要があります',
        timestamp: new Date(),
      });
    }
  }

  private calculateSectionSimilarity(title1: string, title2: string): number {
    // シンプルな文字列類似度計算
    const normalize = (str: string) => str.toLowerCase().trim();
    const n1 = normalize(title1);
    const n2 = normalize(title2);
    
    if (n1 === n2) return 1.0;
    if (n1.includes(n2) || n2.includes(n1)) return 0.8;
    
    // 共通文字数ベースの簡易計算
    const commonChars = [...n1].filter(char => n2.includes(char)).length;
    const maxLength = Math.max(n1.length, n2.length);
    
    return maxLength > 0 ? commonChars / maxLength : 0;
  }
}