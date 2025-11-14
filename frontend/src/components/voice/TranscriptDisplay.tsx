import React, { useState } from 'react';

interface TranscriptDisplayProps {
  text: string;
  editable: boolean;
  onTextChange?: (text: string) => void;
  showCharacterCount?: boolean;
  minLength?: number;
  maxLength?: number;
}

/**
 * TranscriptDisplay Component
 * 
 * Displays transcription with mode-appropriate editing capabilities.
 * - Read-only mode: Styled div with copy button (for streaming mode)
 * - Editable mode: Textarea with character count (for non-streaming mode)
 * 
 * This component is designed to be reusable and can be extracted into a standalone package.
 */
const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  text,
  editable,
  onTextChange,
  showCharacterCount = true,
  minLength = 10,
  maxLength = 10000,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onTextChange) {
      onTextChange(e.target.value);
    }
  };

  const getValidationError = (): string | null => {
    if (text.length < minLength) {
      return `Transcription too short (minimum ${minLength} characters)`;
    }
    if (text.length > maxLength) {
      return `Transcription too long (maximum ${maxLength} characters)`;
    }
    return null;
  };

  const validationError = getValidationError();
  const characterCount = text.length;

  if (!editable) {
    // Read-only mode (streaming)
    return (
      <div>
        <div
          style={{
            padding: '15px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#495057',
            minHeight: '80px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {text || <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>No transcription yet...</span>}
        </div>
        
        {text && (
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={handleCopy}
              style={{
                padding: '8px 16px',
                backgroundColor: copied ? '#28a745' : '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'background-color 0.2s',
              }}
            >
              {copied ? '✓ Copied!' : '📋 Copy Text'}
            </button>
            
            {showCharacterCount && (
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                {characterCount} characters
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Editable mode (non-streaming)
  return (
    <div>
      <textarea
        value={text}
        onChange={handleTextChange}
        placeholder="Your transcription will appear here. You can edit it before submitting."
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '12px',
          fontSize: '14px',
          lineHeight: '1.6',
          border: validationError ? '2px solid #dc3545' : '1px solid #ced4da',
          borderRadius: '4px',
          boxSizing: 'border-box',
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
      
      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {showCharacterCount && (
          <div
            style={{
              fontSize: '12px',
              color: validationError ? '#dc3545' : characterCount > maxLength * 0.9 ? '#ffc107' : '#6c757d',
            }}
          >
            {characterCount} / {maxLength} characters
            {characterCount < minLength && (
              <span style={{ marginLeft: '8px', color: '#dc3545' }}>
                (minimum {minLength})
              </span>
            )}
          </div>
        )}
        
        {text && (
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: copied ? '#28a745' : '#6c757d',
              border: `1px solid ${copied ? '#28a745' : '#6c757d'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        )}
      </div>
      
      {validationError && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        >
          {validationError}
        </div>
      )}
    </div>
  );
};

export default TranscriptDisplay;
