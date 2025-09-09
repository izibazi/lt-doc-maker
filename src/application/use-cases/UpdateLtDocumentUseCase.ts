/**
 * LT資料更新ユースケース
 * LT資料の更新に関するアプリケーションロジック
 */

import { LtDocument, DocumentStatus } from '../../domain/entities/LtDocument';
import { LtDocumentRepository } from '../../domain/repositories/LtDocumentRepository';
import { LtDocumentGenerationService } from '../../domain/services/LtDocumentGenerationService';
import { ValidationError, NotFoundError, DomainError } from '../../shared/types/errors';

export interface UpdateLtDocumentCommand {
  documentId: string;
  userId: string;
  title?: string;
  content?: string;
  sections?: Array<{
    title: string;
    content: string;
    order: number;
    estimatedTime: number;
  }>;
  status?: DocumentStatus;
  tags?: string[];
  metadata?: {
    targetAudience?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    keywords?: string[];
  };
}

export interface UpdateLtDocumentResult {
  document: LtDocument;
  warnings: string[];
  optimized: boolean;
}

export class UpdateLtDocumentUseCase {
  constructor(
    private ltDocumentRepository: LtDocumentRepository,
    private documentGenerationService: LtDocumentGenerationService
  ) {}

  async execute(command: UpdateLtDocumentCommand): Promise<UpdateLtDocumentResult> {
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
        message: '他のユーザーのLT資料は編集できません',
        timestamp: new Date(),
      });
    }

    // 編集可能状態チェック
    if (!document.isEditable()) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'DOCUMENT_NOT_EDITABLE',
        message: '現在の状態では編集できません',
        timestamp: new Date(),
      });
    }

    let warnings: string[] = [];
    let optimized = false;

    // タイトル重複チェック（タイトル変更時）
    if (command.title && command.title !== document.title) {
      const titleExists = await this.ltDocumentRepository.existsByTitle(
        command.title,
        command.userId,
        command.documentId
      );
      if (titleExists) {
        throw new ValidationError({
          type: 'VALIDATION_ERROR',
          code: 'DUPLICATE_TITLE',
          message: '同じタイトルのLT資料が既に存在します',
          field: 'title',
          value: command.title,
          timestamp: new Date(),
        });
      }
    }

    // 基本情報更新
    if (command.title !== undefined || command.content !== undefined || 
        command.tags !== undefined || command.metadata !== undefined) {
      document.updateBasicInfo({
        title: command.title,
        content: command.content,
        tags: command.tags,
        metadata: command.metadata,
      });
    }

    // セクション更新
    if (command.sections) {
      document.updateSections(command.sections);

      // 時間制約チェックと最適化
      if (!document.isWithinTimeLimit()) {
        const optimizedSections = this.documentGenerationService.optimizeForTimeLimit(
          document,
          5 // 5分に最適化
        );
        document.updateSections(optimizedSections);
        optimized = true;
        warnings.push('時間制限に合わせてセクションが最適化されました');
      }

      // 品質チェック
      const qualityWarnings = this.documentGenerationService.validateSectionQuality(
        command.sections
      );
      warnings.push(...qualityWarnings);

      // バランスチェック
      const balanceAnalysis = this.documentGenerationService.analyzeDocumentBalance(document);
      warnings.push(...balanceAnalysis.suggestions);
    }

    // ステータス変更
    if (command.status && command.status !== document.status) {
      // 完了状態への変更時は追加検証
      if (command.status === 'completed' && !document.canComplete()) {
        throw new DomainError({
          type: 'DOMAIN_ERROR',
          code: 'CANNOT_COMPLETE',
          message: 'コンテンツ不足または時間制約により完了できません',
          timestamp: new Date(),
        });
      }

      document.changeStatus(command.status);
    }

    // 保存
    await this.ltDocumentRepository.save(document);

    return {
      document,
      warnings,
      optimized,
    };
  }

  private validateCommand(command: UpdateLtDocumentCommand): void {
    if (!command.documentId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'ドキュメントIDは必須です',
        field: 'documentId',
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

    if (command.title !== undefined && command.title.length > 100) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'INVALID_LENGTH',
        message: 'タイトルは100文字以内で入力してください',
        field: 'title',
        value: command.title,
        timestamp: new Date(),
      });
    }

    if (command.tags && command.tags.length > 10) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'INVALID_VALUE',
        message: 'タグは最大10個まで設定できます',
        field: 'tags',
        value: command.tags,
        timestamp: new Date(),
      });
    }

    if (command.sections) {
      if (command.sections.length > 10) {
        throw new ValidationError({
          type: 'VALIDATION_ERROR',
          code: 'INVALID_VALUE',
          message: 'セクションは最大10個まで作成できます',
          field: 'sections',
          timestamp: new Date(),
        });
      }

      // セクション個別検証
      command.sections.forEach((section, index) => {
        if (!section.title || section.title.trim().length === 0) {
          throw new ValidationError({
            type: 'VALIDATION_ERROR',
            code: 'REQUIRED_FIELD',
            message: `セクション${index + 1}のタイトルは必須です`,
            field: `sections[${index}].title`,
            timestamp: new Date(),
          });
        }

        if (section.estimatedTime <= 0) {
          throw new ValidationError({
            type: 'VALIDATION_ERROR',
            code: 'INVALID_VALUE',
            message: `セクション${index + 1}の見積時間は1秒以上である必要があります`,
            field: `sections[${index}].estimatedTime`,
            value: section.estimatedTime,
            timestamp: new Date(),
          });
        }
      });
    }
  }
}