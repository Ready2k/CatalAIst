import React, { useState } from 'react';

interface ChatInterfaceProps {
  onSubmit: (description: string) => void;
  onVoiceRecord?: () => void;
  isProcessing?: boolean;
  showVoiceButton?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSubmit,
  onVoiceRecord,
  isProcessing = false,
  showVoiceButton = true,
}) => {
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const validateDescription = (text: string): boolean => {
    if (text.trim().length < 10) {
      setError('Please provide at least 10 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (validateDescription(description)) {
      onSubmit(description);
      setDescription('');
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h2 style={{ marginBottom: '10px' }}>Describe Your Process</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Tell us about the business process or initiative you'd like to classify.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: We currently manually review and approve expense reports by checking receipts against company policy..."
            disabled={isProcessing}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              fontSize: '14px',
              border: error ? '1px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          {error && (
            <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
              {error}
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            {description.length} characters (minimum 10 required)
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '12px 24px',
              backgroundColor: isProcessing ? '#6c757d' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
            onMouseOver={(e) => {
              if (!isProcessing) e.currentTarget.style.backgroundColor = '#0056b3';
            }}
            onMouseOut={(e) => {
              if (!isProcessing) e.currentTarget.style.backgroundColor = '#007bff';
            }}
          >
            {isProcessing ? 'Processing...' : 'Submit'}
          </button>

          {showVoiceButton && onVoiceRecord && (
            <button
              type="button"
              onClick={onVoiceRecord}
              disabled={isProcessing}
              style={{
                padding: '12px 24px',
                backgroundColor: isProcessing ? '#6c757d' : '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                if (!isProcessing) e.currentTarget.style.backgroundColor = '#218838';
              }}
              onMouseOut={(e) => {
                if (!isProcessing) e.currentTarget.style.backgroundColor = '#28a745';
              }}
            >
              🎤 Voice
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
