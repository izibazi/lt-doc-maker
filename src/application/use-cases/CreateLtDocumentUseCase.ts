/**
 * LT資料作成ユースケース
 * LT資料の作成に関するアプリケーションロジック
 */

import { LtDocument } from '../../domain/entities/LtDocument';
import { Template } from '../../domain/entities/Template';
import { User } from '../../domain/entities/User';
import { LtDocumentRepository } from '../../domain/repositories/LtDocumentRepository';
import { TemplateRepository } from '../../domain/repositories/TemplateRepository';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { LtDocumentGenerationService } from '../../domain/services/LtDocumentGenerationService';
import { ValidationError, NotFoundError, DomainError } from '../../shared/types/errors';
import { CreateLtDocumentInput } from '../../shared/utils/validation';

export interface CreateLtDocumentCommand {
  userId: string;
  title: string;
  content?: string;
  templateId?: string;
  userInput?: string;
  tags?: string[];
  metadata?: {
    targetAudience?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    keywords?: string[];
  };
}

export interface CreateLtDocumentResult {
  document: LtDocument;
  warnings: string[];
}

export class CreateLtDocumentUseCase {
  constructor(
    private ltDocumentRepository: LtDocumentRepository,
    private templateRepository: TemplateRepository,
    private userRepository: UserRepository,
    private documentGenerationService: LtDocumentGenerationService
  ) {}

  async execute(command: CreateLtDocumentCommand): Promise<CreateLtDocumentResult> {
    // 入力検証
    await this.validateCommand(command);

    // ユーザー存在確認
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundError({
        type: 'NOT_FOUND_ERROR',
        code: 'USER_NOT_FOUND',
        message: 'ユーザーが見つかりません',
        resource: 'User',
        id: command.userId,
        timestamp: new Date(),
      });
    }

    // テンプレート存在確認（指定されている場合）
    let template: Template | null = null;
    if (command.templateId) {
      template = await this.templateRepository.findById(command.templateId);
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
    }

    // タイトル重複チェック
    const titleExists = await this.ltDocumentRepository.existsByTitle(
      command.title,
      command.userId
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

    // ドキュメントID生成
    const documentId = this.generateDocumentId();

    let document: LtDocument;
    let warnings: string[] = [];

    if (template && command.userInput) {
      // テンプレートベースの生成
      const generationResult = this.documentGenerationService.generateFromTemplate({
        documentId,
        userId: command.userId,
        title: command.title,
        template,
        userInput: command.userInput,
      });

      document = generationResult.document;
      warnings = generationResult.warnings;

      // 追加の設定適用
      if (command.tags || command.metadata) {
        document.updateBasicInfo({
          tags: command.tags,
          metadata: command.metadata,
        });
      }
    } else if (command.userInput) {
      // ユーザー入力からの自動生成
      const generatedSections = this.documentGenerationService.generateSectionsFromInput(
        command.userInput
      );

      document = LtDocument.create({
        id: documentId,
        title: command.title,
        content: command.content || command.userInput,
        sections: generatedSections,
        userId: command.userId,
        tags: command.tags,
        metadata: command.metadata,
      });

      // 品質チェック
      const qualityWarnings = this.documentGenerationService.validateSectionQuality(
        generatedSections
      );
      warnings.push(...qualityWarnings);
    } else {
      // 手動作成
      document = LtDocument.create({
        id: documentId,
        title: command.title,
        content: command.content || '',
        sections: [],
        templateId: command.templateId,
        userId: command.userId,
        tags: command.tags,
        metadata: command.metadata,
      });
    }

    // 保存
    await this.ltDocumentRepository.save(document);

    return {
      document,
      warnings,
    };
  }

  private async validateCommand(command: CreateLtDocumentCommand): Promise<void> {
    if (!command.userId) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'ユーザーIDは必須です',
        field: 'userId',
        timestamp: new Date(),
      });
    }

    if (!command.title || command.title.trim().length === 0) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'タイトルは必須です',
        field: 'title',
        timestamp: new Date(),
      });
    }

    if (command.title.length > 100) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'INVALID_LENGTH',
        message: 'タイトルは100文字以内で入力してください',
        field: 'title',
        value: command.title,
        timestamp: new Date(),
      });
    }

    // テンプレート使用時はユーザー入力必須
    if (command.templateId && (!command.userInput || command.userInput.trim().length === 0)) {
      throw new ValidationError({
        type: 'VALIDATION_ERROR',
        code: 'REQUIRED_FIELD',
        message: 'テンプレートを使用する場合はユーザー入力が必要です',
        field: 'userInput',
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
  }

  private generateDocumentId(): string {
    // 実際の実装では UUID や 他のユニークID生成方法を使用
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}