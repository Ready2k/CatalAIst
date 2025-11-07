import React, { useState } from 'react';

interface ClarificationQuestionsProps {
  questions: string[];
  currentQuestionIndex: number;
  totalQuestions: number;
  onAnswer: (answer: string) => void;
  onVoiceRecord?: () => void;
  isProcessing?: boolean;
  showVoiceButton?: boolean;
}

const ClarificationQuestions: React.FC<ClarificationQuestionsProps> = ({
  questions,
  currentQuestionIndex,
  totalQuestions,
  onAnswer,
  onVoiceRecord,
  isProcessing = false,
  showVoiceButton = true,
}) => {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (answer.trim().length < 1) {
      setError('Please provide an answer');
      return;
    }

    onAnswer(answer);
    setAnswer('');
  };

  const currentQuestion = questions[0] || '';

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <h3 style={{ margin: 0, color: '#856404' }}>
            Clarification Needed
          </h3>
          <span style={{
            backgroundColor: '#ffc107',
            color: '#000',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
        </div>

        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: '#fff',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '15px'
        }}>
          <div style={{
            width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
            height: '100%',
            backgroundColor: '#ffc107',
            transition: 'width 0.3s ease'
          }} />
        </div>

        <p style={{
          fontSize: '18px',
          color: '#333',
          marginBottom: '20px',
          lineHeight: '1.5'
        }}>
          {currentQuestion}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              disabled={isProcessing}
              style={{
                width: '100%',
                minHeight: '80px',
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
              {isProcessing ? 'Processing...' : 'Submit Answer'}
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

      <div style={{
        textAlign: 'center',
        color: '#666',
        fontSize: '14px'
      }}>
        <p>
          We need a bit more information to provide an accurate classification.
          Maximum 5 questions per session.
        </p>
      </div>
    </div>
  );
};

export default ClarificationQuestions;
