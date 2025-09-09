/**
 * テンプレート適用ドメインサービス
 * テンプレートの適用・カスタマイズに関するビジネスロジック
 */

import { Template, TemplateSection } from '../entities/Template';
import { LtDocument, DocumentSection } from '../entities/LtDocument';
import { DomainError } from '../../shared/types/errors';

export interface TemplateApplicationParams {
  template: Template;
  targetDocument: LtDocument;
  preserveContent?: boolean;
  customSections?: Partial<DocumentSection>[];
}

export interface TemplateApplicationResult {
  updatedDocument: LtDocument;
  appliedSections: DocumentSection[];
  skippedSections: string[];
  warnings: string[];
}

export interface TemplateCompatibilityCheck {
  isCompatible: boolean;
  score: number; // 0-100
  reasons: string[];
  recommendations: string[];
}

export class TemplateApplicationService {
  /**
   * テンプレートを既存のLT資料に適用
   */
  applyTemplateToDocument(params: TemplateApplicationParams): TemplateApplicationResult {
    this.validateApplicationParams(params);

    const warnings: string[] = [];
    const skippedSections: string[] = [];
    const existingSections = params.targetDocument.sections;
    const templateSections = params.template.structure.sections;

    // セクションマッピングの作成
    const sectionMapping = this.createSectionMapping(existingSections, templateSections);
    
    // 新しいセクションの生成
    const appliedSections = this.generateAppliedSections(
      templateSections,
      existingSections,
      sectionMapping,
      params.preserveContent,
      params.customSections,
      warnings,
      skippedSections
    );

    // ドキュメントの更新
    const updatedDocument = this.createUpdatedDocument(
      params.targetDocument,
      appliedSections,
      params.template.id
    );

    return {
      updatedDocument,
      appliedSections,
      skippedSections,
      warnings,
    };
  }

  /**
   * テンプレートとドキュメントの互換性をチェック
   */
  checkTemplateCompatibility(template: Template, document: LtDocument): TemplateCompatibilityCheck {
    const reasons: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // セクション数の比較
    const docSectionCount = document.sections.length;
    const templateSectionCount = template.structure.sections.length;
    
    if (Math.abs(docSectionCount - templateSectionCount) > 2) {
      score -= 20;
      reasons.push(`セクション数の差が大きい（現在: ${docSectionCount}, テンプレート: ${templateSectionCount}）`);
      recommendations.push('セクション数を調整することを検討してください');
    }

    // セクション名の類似性チェック
    const similarSections = this.findSimilarSections(
      document.sections,
      template.structure.sections
    );

    const similarityRatio = similarSections.length / Math.max(docSectionCount, templateSectionCount);
    if (similarityRatio < 0.3) {
      score -= 30;
      reasons.push('既存セクションとテンプレートセクションの類似性が低い');
      recommendations.push('セクション名を調整するか、より適切なテンプレートを選択してください');
    }

    // 推定時間の比較
    const docDuration = document.estimatedDuration;
    const templateDuration = template.calculateEstimatedDuration();
    
    const timeDifference = Math.abs(docDuration - templateDuration) / Math.max(docDuration, templateDuration);
    if (timeDifference > 0.5) {
      score -= 15;
      reasons.push('推定時間の差が大きい');
      recommendations.push('セクション内容の調整が必要になる可能性があります');
    }

    // テンプレートタイプとドキュメント内容の適合性
    if (!this.isTypeCompatible(template, document)) {
      score -= 25;
      reasons.push('テンプレートタイプとドキュメント内容が適合しない可能性');
      recommendations.push('より適切なテンプレートタイプを選択することを検討してください');
    }

    return {
      isCompatible: score >= 60,
      score: Math.max(0, score),
      reasons,
      recommendations,
    };
  }

  /**
   * テンプレートの動的カスタマイズ
   */
  customizeTemplateForDocument(
    template: Template,
    document: LtDocument,
    customizationOptions?: {
      preserveExistingTitles?: boolean;
      adjustTimeDistribution?: boolean;
      mergeCompatibleSections?: boolean;
    }
  ): Template {
    const options = {
      preserveExistingTitles: true,
      adjustTimeDistribution: true,
      mergeCompatibleSections: true,
      ...customizationOptions,
    };

    const customizedSections = [...template.structure.sections];
    const docSections = document.sections;

    if (options.preserveExistingTitles) {
      // 類似セクションのタイトルを保持
      const similarPairs = this.findSimilarSections(docSections, customizedSections);
      similarPairs.forEach(({ docSection, templateSection }) => {
        const index = customizedSections.findIndex(s => s.order === templateSection.order);
        if (index !== -1) {
          customizedSections[index] = {
            ...customizedSections[index],
            title: docSection.title,
          };
        }
      });
    }

    if (options.mergeCompatibleSections) {
      // 互換性のあるセクションをマージ
      customizedSections.forEach((section, index) => {
        const compatibleDocSection = docSections.find(ds => 
          this.calculateSectionSimilarity(ds, section) > 0.7
        );

        if (compatibleDocSection) {
          customizedSections[index] = {
            ...section,
            content: this.mergeContent(section.content, compatibleDocSection.content),
          };
        }
      });
    }

    // カスタマイズされたテンプレートを作成
    return Template.create({
      id: `${template.id}-customized-${Date.now()}`,
      name: `${template.name} (カスタマイズ版)`,
      description: `${document.title} 用にカスタマイズされたテンプレート`,
      type: template.type,
      structure: { sections: customizedSections },
      prompts: template.prompts,
      isPublic: false,
    });
  }

  /**
   * セクション順序の最適化提案
   */
  suggestSectionOrder(
    existingSections: DocumentSection[],
    templateSections: TemplateSection[]
  ): Array<{ currentOrder: number; suggestedOrder: number; reason: string }> {
    const suggestions: Array<{ currentOrder: number; suggestedOrder: number; reason: string }> = [];

    // テンプレートの順序に基づく最適化
    existingSections.forEach((section, currentIndex) => {
      const bestMatch = this.findBestTemplateMatch(section, templateSections);
      if (bestMatch && bestMatch.order !== currentIndex) {
        suggestions.push({
          currentOrder: currentIndex,
          suggestedOrder: bestMatch.order,
          reason: `「${bestMatch.title}」との類似性に基づく最適化`,
        });
      }
    });

    return suggestions;
  }

  private validateApplicationParams(params: TemplateApplicationParams): void {
    if (!params.template) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'TEMPLATE_REQUIRED',
        message: 'テンプレートが指定されていません',
        timestamp: new Date(),
      });
    }

    if (!params.targetDocument) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'DOCUMENT_REQUIRED',
        message: '対象ドキュメントが指定されていません',
        timestamp: new Date(),
      });
    }

    if (!params.targetDocument.isEditable()) {
      throw new DomainError({
        type: 'DOMAIN_ERROR',
        code: 'DOCUMENT_NOT_EDITABLE',
        message: '編集可能な状態のドキュメントのみテンプレートを適用できます',
        timestamp: new Date(),
      });
    }
  }

  private createSectionMapping(
    docSections: DocumentSection[],
    templateSections: TemplateSection[]
  ): Map<number, number> {
    const mapping = new Map<number, number>();

    docSections.forEach((docSection, docIndex) => {
      let bestMatch = -1;
      let bestSimilarity = 0;

      templateSections.forEach((templateSection, templateIndex) => {
        const similarity = this.calculateSectionSimilarity(docSection, templateSection);
        if (similarity > bestSimilarity && similarity > 0.3) {
          bestMatch = templateIndex;
          bestSimilarity = similarity;
        }
      });

      if (bestMatch !== -1) {
        mapping.set(docIndex, bestMatch);
      }
    });

    return mapping;
  }

  private calculateSectionSimilarity(
    docSection: DocumentSection,
    templateSection: TemplateSection
  ): number {
    // タイトルの類似度計算（シンプルな実装）
    const titleSimilarity = this.calculateStringSimilarity(
      docSection.title.toLowerCase(),
      templateSection.title.toLowerCase()
    );

    // 内容の類似度計算
    const contentSimilarity = this.calculateStringSimilarity(
      docSection.content.toLowerCase(),
      templateSection.content.toLowerCase()
    );

    // 重み付け平均
    return titleSimilarity * 0.7 + contentSimilarity * 0.3;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein距離ベースの簡単な類似度計算
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private findSimilarSections(
    docSections: DocumentSection[],
    templateSections: TemplateSection[]
  ): Array<{ docSection: DocumentSection; templateSection: TemplateSection }> {
    const similar: Array<{ docSection: DocumentSection; templateSection: TemplateSection }> = [];

    docSections.forEach(docSection => {
      templateSections.forEach(templateSection => {
        const similarity = this.calculateSectionSimilarity(docSection, templateSection);
        if (similarity > 0.5) {
          similar.push({ docSection, templateSection });
        }
      });
    });

    return similar;
  }

  private isTypeCompatible(template: Template, document: LtDocument): boolean {
    // キーワードベースの簡単な互換性チェック
    const typeKeywords = {
      technical: ['技術', 'API', 'システム', 'コード', '実装', '開発'],
      business: ['ビジネス', '売上', '収益', '戦略', 'マーケティング', '顧客'],
      tutorial: ['手順', '方法', 'やり方', 'チュートリアル', '学習', '練習'],
      showcase: ['紹介', '発表', 'デモ', 'ショーケース', '事例', '実績'],
    };

    const keywords = typeKeywords[template.type] || [];
    const documentText = `${document.title} ${document.content}`.toLowerCase();

    return keywords.some(keyword => documentText.includes(keyword));
  }

  private generateAppliedSections(
    templateSections: TemplateSection[],
    existingSections: DocumentSection[],
    sectionMapping: Map<number, number>,
    preserveContent: boolean = false,
    customSections: Partial<DocumentSection>[] = [],
    warnings: string[],
    skippedSections: string[]
  ): DocumentSection[] {
    return templateSections.map((templateSection, index) => {
      const customSection = customSections.find(cs => cs.order === index);
      const mappedDocSection = this.findMappedSection(existingSections, sectionMapping, index);

      let content = templateSection.content;
      let title = templateSection.title;
      let estimatedTime = 60; // デフォルト時間

      // カスタムセクションが指定されている場合
      if (customSection) {
        title = customSection.title || title;
        content = customSection.content || content;
        estimatedTime = customSection.estimatedTime || estimatedTime;
      }
      // 既存セクションとマッピングされている場合
      else if (mappedDocSection && preserveContent) {
        title = mappedDocSection.title;
        content = mappedDocSection.content;
        estimatedTime = mappedDocSection.estimatedTime;
      }
      // 既存セクションはあるが、内容を保持しない場合
      else if (mappedDocSection) {
        title = mappedDocSection.title;
        // contentはテンプレートのものを使用
        warnings.push(`セクション「${title}」の内容がテンプレートで置き換えられました`);
      }

      return {
        title,
        content,
        order: index,
        estimatedTime,
      };
    });
  }

  private findMappedSection(
    existingSections: DocumentSection[],
    mapping: Map<number, number>,
    templateIndex: number
  ): DocumentSection | undefined {
    for (const [docIndex, tempIndex] of mapping.entries()) {
      if (tempIndex === templateIndex) {
        return existingSections[docIndex];
      }
    }
    return undefined;
  }

  private findBestTemplateMatch(
    section: DocumentSection,
    templateSections: TemplateSection[]
  ): TemplateSection | undefined {
    let bestMatch: TemplateSection | undefined;
    let bestSimilarity = 0;

    templateSections.forEach(templateSection => {
      const similarity = this.calculateSectionSimilarity(section, templateSection);
      if (similarity > bestSimilarity) {
        bestMatch = templateSection;
        bestSimilarity = similarity;
      }
    });

    return bestSimilarity > 0.3 ? bestMatch : undefined;
  }

  private mergeContent(templateContent: string, docContent: string): string {
    // シンプルなコンテンツマージ
    if (!templateContent && !docContent) return '';
    if (!templateContent) return docContent;
    if (!docContent) return templateContent;

    return `${docContent}\n\n[テンプレート参考]\n${templateContent}`;
  }

  private createUpdatedDocument(
    originalDocument: LtDocument,
    newSections: DocumentSection[],
    templateId: string
  ): LtDocument {
    const updatedDocument = LtDocument.fromPersistence(originalDocument.toPersistence());
    updatedDocument.updateSections(newSections);
    
    // テンプレートIDの更新
    const updatedProps = {
      ...updatedDocument.toPersistence(),
      templateId,
    };

    return LtDocument.fromPersistence(updatedProps);
  }
}