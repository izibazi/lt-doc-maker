/**
 * LT資料カードコンポーネント
 * LT資料の概要表示カード
 */

import React from 'react';
import { LtDocument, DocumentStatus } from '../../../domain/entities/LtDocument';
import { Button } from '../common/Button';

export interface DocumentCardProps {
  document: LtDocument;
  onEdit?: (documentId: string) => void;
  onView?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
  onExport?: (documentId: string) => void;
  showActions?: boolean;
  className?: string;
}

const statusConfig = {
  draft: {
    label: '下書き',
    color: 'bg-gray-100 text-gray-800',
    icon: '📝',
  },
  completed: {
    label: '完了',
    color: 'bg-green-100 text-green-800',
    icon: '✅',
  },
  archived: {
    label: 'アーカイブ',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '📦',
  },
};

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onEdit,
  onView,
  onDelete,
  onExport,
  showActions = true,
  className = '',
}) => {
  const status = statusConfig[document.status];
  const estimatedMinutes = document.getEstimatedDurationInMinutes();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${className}`}>
      <div className="p-6">
        {/* ヘッダー */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {document.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              更新日: {formatDate(document.updatedAt)}
            </p>
          </div>
          
          <div className="ml-4 flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
              <span className="mr-1">{status.icon}</span>
              {status.label}
            </span>
          </div>
        </div>

        {/* コンテンツプレビュー */}
        <div className="mb-4">
          <p className="text-gray-700 text-sm line-clamp-3">
            {document.content || 'コンテンツなし'}
          </p>
        </div>

        {/* メタ情報 */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              約{estimatedMinutes}分
            </span>
            
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {document.sections.length}セクション
            </span>
          </div>

          {document.exportedAt && (
            <span className="flex items-center text-green-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              エクスポート済み
            </span>
          )}
        </div>

        {/* タグ */}
        {document.tags && document.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {document.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
              {document.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{document.tags.length - 3}個
                </span>
              )}
            </div>
          </div>
        )}

        {/* アクション */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex space-x-2">
              {onView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(document.id)}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  表示
                </Button>
              )}
              
              {onEdit && document.isEditable() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(document.id)}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  編集
                </Button>
              )}
            </div>

            <div className="flex space-x-2">
              {onExport && document.status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport(document.id)}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  エクスポート
                </Button>
              )}
              
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(document.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};