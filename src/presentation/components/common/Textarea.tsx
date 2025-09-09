/**
 * テキストエリアコンポーネント
 * 再利用可能なマルチラインテキスト入力UI
 */

import React from 'react';

export interface TextareaProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  error?: string;
  helperText?: string;
  label?: string;
  maxLength?: number;
  minLength?: number;
  rows?: number;
  autoFocus?: boolean;
  className?: string;
  textareaClassName?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
}

export const Textarea: React.FC<TextareaProps> = ({
  id,
  name,
  value,
  defaultValue,
  placeholder,
  disabled = false,
  required = false,
  readOnly = false,
  error,
  helperText,
  label,
  maxLength,
  minLength,
  rows = 4,
  autoFocus = false,
  className = '',
  textareaClassName = '',
  onChange,
  onBlur,
  onFocus,
}) => {
  const baseTextareaClasses = 'block w-full rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 resize-y';
  
  const stateClasses = error
    ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
    
  const disabledClasses = disabled
    ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
    : 'bg-white';

  const readOnlyClasses = readOnly
    ? 'bg-gray-50 cursor-not-allowed resize-none'
    : '';

  const textareaClasses = `${baseTextareaClasses} ${stateClasses} ${disabledClasses} ${readOnlyClasses} px-3 py-2 text-sm ${textareaClassName}`;

  const currentLength = value?.length || defaultValue?.length || 0;

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label 
          htmlFor={id}
          className={`block text-sm font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        maxLength={maxLength}
        minLength={minLength}
        rows={rows}
        autoFocus={autoFocus}
        className={textareaClasses}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
      />
      
      <div className="flex justify-between items-start">
        <div>
          {error && (
            <p className="text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          
          {helperText && !error && (
            <p className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>
        
        {maxLength && (
          <p className={`text-sm ${currentLength > maxLength * 0.9 ? 'text-orange-600' : 'text-gray-500'}`}>
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
};