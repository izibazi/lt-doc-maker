/**
 * LT資料生成ドメインサービス
 * テンプレートからLT資料を生成するビジネスロジック
 */

import { LtDocument, DocumentSection } from '../entities/LtDocument';
import { Template } from '../entities/Template';
import { DomainError } from '../../shared/types/errors';
import { LT_DOCUMENT_CONSTANTS } from '../../shared/utils/constants';

export interface GenerateDocumentParams {
  documentId: string;
  userId: string;
  title: string;
  template: Template;
  userInput: string;
}

export interface DocumentGenerationResult {
  document: LtDocument;
  generatedSections: DocumentSection[];
  warnings: string[];
}

export class LtDocumentGenerationService {
  /**
   * テンプレートからLT資料を生成
   */
  generateFromTemplate(params: GenerateDocumentParams): DocumentGenerationResult {
    this.validateGenerationParams(params);

    const warnings: string[] = [];
    const sections = this.generateSections(params.template, params.userInput, warnings);
    
    // 時間制約チェック
    const totalDuration = this.calculateTotalDuration(sections);
    if (totalDuration > LT_DOCUMENT_CONSTANTS.MAX_DURATION_MINUTES * 60) {
      warnings.push('生成されたコンテンツが時間制限を超えています。セクションを調整してください。');
    }

    const document = LtDocument.create({
      id: params.documentId,
      title: params.title,
      content: this.generateInitialContent(sections, params.userInput),
      sections,
      templateId: params.template.id,
      userId: params.userId,
    });

    return {
      document,
      generatedSections: sections,
      warnings,
    };
  }

  /**
   * ユーザー入力からセクションを自動生成
   */
  generateSectionsFromInput(
    userInput: string,
    targetDurationMinutes: number = LT_DOCUMENT_CONSTANTS.DEFAULT_DURATION
  ): DocumentSection[] {
    const targetDurationSeconds = targetDurationMinutes * 60;
    
    // シンプルな分割ロジック（実際はAI/NLP処理に置き換え）
    const inputSections = this.splitInputIntoSections(userInput);
    const timePerSection = Math.floor(targetDurationSeconds / Math.max(inputSections.length, 3));

    return inputSections.map((section, index) => ({
      title: section.title,
      content: section.content,
      order: index,
      estimatedTime: timePerSection,
    }));
  }

  /**
   * LT資料の内容を最適化
   */
  optimizeForTimeLimit(document: LtDocument, targetDurationMinutes: number): DocumentSection[] {
    const targetDurationSeconds = targetDurationMinutes * 60;
    const currentSections = document.sections;
    const currentDuration = document.estimatedDuration;

    if (currentDuration <= targetDurationSeconds) {
      return currentSections; // すでに制限内
    }

    // 各セクションの時間を比例的に短縮
    const reductionRatio = targetDurationSeconds / currentDuration;
    
    return currentSections.map(section => ({
      ...section,
      estimatedTime: Math.max(30, Math.floor(section.estimatedTime * reductionRatio)), // 最低30秒
    }));
  }

  /**
   * セクション内容の品質チェック
   */
  validateSectionQuality(sections: DocumentSection[]): string[] {
    const warnings: string[] = [];

    sections.forEach((section, index) => {
      // セクション長チェック
      if (section.content.length < 50) {
        warnings.push(`セクション${index + 1}「${section.title}」の内容が短すぎます。`);
      }

      if (section.content.length > 500) {
        warnings.push(`セクション${index + 1}「${section.title}」の内容が長すぎる可能性があります。`);
      }

      // 時間配分チェック
      if (section.estimatedTime < 30) {
        warnings.push(`セクション${index + 1}「${section.title}」の時間が短すぎます（30秒未満）。`);
      }

      if (section.estimatedTime > 90) {
        warnings.push(`セクション${index + 1}「${section.title}」の時間が長すぎます（90秒超）。`);
      }
    });

    return warnings;
  }

  /**
   * LT資料全体の構成バランスチェック
   */
  analyzeDocumentBalance(document: LtDocument): {
    isBalanced: boolean;
    suggestions: string[];
    sectionDistribution: Array<{ title: string; percentage: number }>;
  } {
    const totalDuration = document.estimatedDuration;
    const sections = document.sections;
    const suggestions: string[] = [];

    const sectionDistribution = sections.map(section => ({
      title: section.title,
      percentage: Math.round((section.estimatedTime / totalDuration) * 100),
    }));

    // バランス判定
    let isBalanced = true;

    // 単一セクションが全体の50%を超えている場合
    const maxPercentage = Math.max(...sectionDistribution.map(s => s.percentage));
    if (maxPercentage > 50) {
      isBalanced = false;
      suggestions.push('単一セクションが全体の50%を超えています。内容を分割することを検討してください。');
    }

    // セクション数が極端に少ない/多い場合
    if (sections.length < LT_DOCUMENT_CONSTANTS.MIN_SECTIONS) {
      isBalanced = false;
      suggestions.push(`セクション数が少なすぎます。最低${LT_DOCUMENT_CONSTANTS.MIN_SECTIONS}個のセクションを推奨します。`);
    }

    if (sections.length > LT_DOCUMENT_CONSTANTS.MAX_SECTIONS) {
      suggestions.push('セクション数が多すぎます。聴衆が理解しやすくするため、統合を検討してください。');
    }

    return {
      isBalanced,
      suggestions,
      sectionDistribution,
    };
  }

  private validateGenerationParams(params: GenerateDocumentParams): void {
    if (!params.userInput || params.userInput.trim().length < 10) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INSUFFICIENT_INPUT',
        message: 'LT資料を生成するには最低10文字の入力が必要です',
        timestamp: new Date(),
      });
    }

    if (!params.title || params.title.trim().length === 0) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'INVALID_TITLE',
        message: 'タイトルは必須です',
        timestamp: new Date(),
      });
    }
  }

  private generateSections(template: Template, userInput: string, warnings: string[]): DocumentSection[] {
    const templateSections = template.structure.sections;
    const sections: DocumentSection[] = [];

    templateSections.forEach((templateSection, index) => {
      const generatedContent = this.generateSectionContent(
        templateSection,
        userInput,
        template.prompts
      );

      // セクション時間の推定（文字数ベース）
      const estimatedTime = this.estimateReadingTime(generatedContent);

      sections.push({
        title: templateSection.title,
        content: generatedContent,
        order: index,
        estimatedTime,
      });

      // 品質チェック
      if (generatedContent.length < 20) {
        warnings.push(`セクション「${templateSection.title}」の生成内容が短すぎます。`);
      }
    });

    return sections;
  }

  private generateSectionContent(
    templateSection: any,
    userInput: string,
    prompts?: any
  ): string {
    // 実際の実装では、AI/NLPサービスを使用してコンテンツを生成
    // ここでは簡単なテンプレート置換を実装

    let content = templateSection.content || '';
    
    // プロンプトがある場合は適用
    const sectionPrompt = prompts?.sections?.[templateSection.title];
    if (sectionPrompt) {
      content = `${sectionPrompt}\n\n${content}`;
    }

    // ユーザー入力の一部を挿入（シンプルな実装）
    if (content.includes('{USER_INPUT}')) {
      const inputSnippet = userInput.length > 100 
        ? userInput.substring(0, 100) + '...' 
        : userInput;
      content = content.replace('{USER_INPUT}', inputSnippet);
    }

    return content || `${templateSection.title}に関する内容をここに記述します。\n\n${userInput.substring(0, 50)}...`;
  }

  private estimateReadingTime(content: string): number {
    // 日本語の読み上げ速度：約300文字/分 = 5文字/秒
    const charactersPerSecond = 5;
    const baseTime = 10; // 基本時間（説明や間など）
    
    return Math.max(30, Math.floor(content.length / charactersPerSecond) + baseTime);
  }

  private generateInitialContent(sections: DocumentSection[], userInput: string): string {
    const intro = `# 概要\n\n${userInput.substring(0, 200)}${userInput.length > 200 ? '...' : ''}\n\n`;
    const sectionContent = sections.map(section => 
      `## ${section.title}\n\n${section.content}\n\n`
    ).join('');
    
    return intro + sectionContent;
  }

  private calculateTotalDuration(sections: DocumentSection[]): number {
    return sections.reduce((total, section) => total + section.estimatedTime, 0) + 60; // 導入・結論時間
  }

  private splitInputIntoSections(input: string): Array<{ title: string; content: string }> {
    // シンプルな分割ロジック（実際はより高度な処理を実装）
    const paragraphs = input.split('\n\n').filter(p => p.trim().length > 0);
    
    if (paragraphs.length <= 1) {
      return [
        { title: '概要', content: input.substring(0, Math.floor(input.length / 3)) },
        { title: '詳細', content: input.substring(Math.floor(input.length / 3), Math.floor(input.length * 2 / 3)) },
        { title: 'まとめ', content: input.substring(Math.floor(input.length * 2 / 3)) },
      ];
    }

    return paragraphs.slice(0, 5).map((paragraph, index) => ({
      title: `セクション ${index + 1}`,
      content: paragraph,
    }));
  }
}