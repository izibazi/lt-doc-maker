/**
 * LT資料フォームコンポーネント
 * LT資料の作成・編集フォーム
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { LtDocument, DocumentSection, DocumentStatus } from '../../../domain/entities/LtDocument';

export interface DocumentFormData {
  title: string;
  content: string;
  sections: DocumentSection[];
  tags: string[];
  metadata?: {
    targetAudience?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    keywords?: string[];
  };
}

export interface DocumentFormProps {
  initialData?: LtDocument;
  onSubmit: (data: DocumentFormData) => void;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
  showStatusChange?: boolean;
  onStatusChange?: (status: DocumentStatus) => void;
  className?: string;
}

export const DocumentForm: React.FC<DocumentFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = '保存',
  showStatusChange = false,
  onStatusChange,
  className = '',
}) => {
  const [formData, setFormData] = useState<DocumentFormData>({
    title: initialData?.title || '',
    content: initialData?.content || '',
    sections: initialData?.sections || [],
    tags: initialData?.tags || [],
    metadata: initialData?.metadata,
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof DocumentFormData) => 
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: event.target.value,
      }));
      
      // エラーをクリア
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    };

  const handleSectionChange = (index: number, field: keyof DocumentSection, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) => 
        i === index ? { ...section, [field]: value } : section
      ),
    }));
  };

  const addSection = () => {
    setFormData(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          title: '',
          content: '',
          order: prev.sections.length,
          estimatedTime: 60, // デフォルト1分
        },
      ],
    }));
  };

  const removeSection = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections
        .filter((_, i) => i !== index)
        .map((section, i) => ({ ...section, order: i })),
    }));
  };

  const handleTagAdd = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim()) && formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleMetadataChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value,
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です';
    } else if (formData.title.length > 100) {
      newErrors.title = 'タイトルは100文字以内で入力してください';
    }

    if (formData.content.length > 5000) {
      newErrors.content = 'コンテンツは5000文字以内で入力してください';
    }

    if (formData.sections.length > 10) {
      newErrors.sections = 'セクションは最大10個まで作成できます';
    }

    formData.sections.forEach((section, index) => {
      if (!section.title.trim()) {
        newErrors[`section_${index}_title`] = 'セクションタイトルは必須です';
      }
      if (section.estimatedTime <= 0) {
        newErrors[`section_${index}_time`] = '見積時間は1秒以上である必要があります';
      }
    });

    if (formData.tags.length > 10) {
      newErrors.tags = 'タグは最大10個まで設定できます';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const totalEstimatedTime = formData.sections.reduce((total, section) => total + section.estimatedTime, 0);
  const totalMinutes = Math.round(totalEstimatedTime / 60 * 10) / 10;

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* タイトル */}
      <Input
        label="タイトル"
        required
        value={formData.title}
        onChange={handleInputChange('title')}
        error={errors.title}
        maxLength={100}
        placeholder="LT資料のタイトルを入力してください"
      />

      {/* コンテンツ */}
      <Textarea
        label="概要・内容"
        value={formData.content}
        onChange={handleInputChange('content')}
        error={errors.content}
        maxLength={5000}
        rows={4}
        placeholder="LT資料の概要や内容を入力してください"
        helperText="資料の概要や目的を簡潔に記述してください"
      />

      {/* セクション */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            セクション
          </label>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>合計推定時間: {totalMinutes}分</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSection}
              disabled={formData.sections.length >= 10}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              セクション追加
            </Button>
          </div>
        </div>

        {errors.sections && (
          <p className="text-sm text-red-600">{errors.sections}</p>
        )}

        {formData.sections.map((section, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">
                セクション {index + 1}
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSection(index)}
                className="text-red-600 hover:text-red-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="セクションタイトル"
                  value={section.title}
                  onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                  error={errors[`section_${index}_title`]}
                  required
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="時間(秒)"
                  value={section.estimatedTime}
                  onChange={(e) => handleSectionChange(index, 'estimatedTime', parseInt(e.target.value) || 0)}
                  error={errors[`section_${index}_time`]}
                  required
                  min="1"
                />
              </div>
            </div>

            <Textarea
              placeholder="セクションの内容"
              value={section.content}
              onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
              rows={3}
            />
          </div>
        ))}

        {formData.sections.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>セクションが追加されていません</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSection}
              className="mt-2"
            >
              最初のセクションを追加
            </Button>
          </div>
        )}
      </div>

      {/* タグ */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          タグ
        </label>
        
        <div className="flex space-x-2">
          <Input
            placeholder="タグを入力してEnterキーで追加"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd())}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleTagAdd}
            disabled={!tagInput.trim() || formData.tags.length >= 10}
          >
            追加
          </Button>
        </div>

        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  onClick={() => handleTagRemove(tag)}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {errors.tags && (
          <p className="text-sm text-red-600">{errors.tags}</p>
        )}
      </div>

      {/* メタデータ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="対象者"
          placeholder="初心者向け、エンジニア向けなど"
          value={formData.metadata?.targetAudience || ''}
          onChange={(e) => handleMetadataChange('targetAudience', e.target.value)}
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            難易度
          </label>
          <select
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            value={formData.metadata?.difficulty || ''}
            onChange={(e) => handleMetadataChange('difficulty', e.target.value)}
          >
            <option value="">選択してください</option>
            <option value="beginner">初級</option>
            <option value="intermediate">中級</option>
            <option value="advanced">上級</option>
          </select>
        </div>
      </div>

      {/* アクション */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        {showStatusChange && onStatusChange && initialData && (
          <div className="flex space-x-2">
            {initialData.status === 'draft' && initialData.canComplete() && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onStatusChange('completed')}
              >
                完了にする
              </Button>
            )}
            {initialData.canArchive() && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onStatusChange('archived')}
              >
                アーカイブ
              </Button>
            )}
          </div>
        )}

        <div className="flex space-x-3 ml-auto">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={loading}
            >
              キャンセル
            </Button>
          )}
          
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
};