import React, { useState, useEffect } from 'react';
import AudioPlayer from './voice/AudioPlayer';
import NonStreamingModeController from './voice/NonStreamingModeController';
import StreamingModeController from './voice/StreamingModeController';

interface ClarificationQuestionsProps {
  questions: string[];
  currentQuestionIndex: number;
  totalQuestions: number;
  onAnswer: (answer: string | string[]) => void;
  onSkipInterview?: () => void;
  onStartFresh?: () => void;
  onVoiceRecord?: () => void;
  isProcessing?: boolean;
  showVoiceButton?: boolean;
  streamingMode?: boolean;
  voiceType?: string;
}

const ClarificationQuestions: React.FC<ClarificationQuestionsProps> = ({
  questions,
  currentQuestionIndex,
  totalQuestions,
  onAnswer,
  onSkipInterview,
  onStartFresh,
  onVoiceRecord,
  isProcessing = false,
  showVoiceButton = true,
  streamingMode = false,
  voiceType,
}) => {
  // Initialize answers array with empty strings for each question
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
  const [errors, setErrors] = useState<string[]>(questions.map(() => ''));
  const [wasProcessing, setWasProcessing] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceQuestionIndex, setVoiceQuestionIndex] = useState<number | null>(null);
  const [forceNonStreaming, setForceNonStreaming] = useState(false);

  // Reset answers when questions change (new batch arrives)
  useEffect(() => {
    setAnswers(questions.map(() => ''));
    setErrors(questions.map(() => ''));
  }, [questions]);

  // Clear answers when processing completes
  useEffect(() => {
    if (wasProcessing && !isProcessing) {
      // Processing just finished, clear the answers
      setAnswers(questions.map(() => ''));
    }
    setWasProcessing(isProcessing);
  }, [isProcessing, wasProcessing, questions]);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);

    // Clear error for this question
    const newErrors = [...errors];
    newErrors[index] = '';
    setErrors(newErrors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all answers
    const newErrors = answers.map((answer, index) =>
      answer.trim().length < 1 ? 'Please provide an answer' : ''
    );

    setErrors(newErrors);

    // Check if any errors
    if (newErrors.some(error => error !== '')) {
      return;
    }

    // Submit all answers
    onAnswer(answers);

    // Don't clear immediately - let the useEffect handle it when processing completes
    // This allows users to see their answers while processing
  };

  const handleVoiceClick = (index: number) => {
    setVoiceQuestionIndex(index);
    setShowVoiceModal(true);
  };

  const handleVoiceTranscription = (text: string) => {
    if (voiceQuestionIndex !== null) {
      handleAnswerChange(voiceQuestionIndex, text);
    }
    setShowVoiceModal(false);
    setVoiceQuestionIndex(null);
  };

  const handleVoiceCancel = () => {
    setShowVoiceModal(false);
    setVoiceQuestionIndex(null);
    setForceNonStreaming(false);
  };

  const handleSwitchToNonStreaming = () => {
    setForceNonStreaming(true);
  };

  return (
    <div style={{
      maxWidth: '900px',
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
            {questions.length} Question{questions.length > 1 ? 's' : ''} ({currentQuestionIndex + 1}-{currentQuestionIndex + questions.length} of {totalQuestions})
          </span>
        </div>

        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: '#fff',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '20px'
        }}>
          <div style={{
            width: `${((currentQuestionIndex + questions.length) / totalQuestions) * 100}%`,
            height: '100%',
            backgroundColor: '#ffc107',
            transition: 'width 0.3s ease'
          }} />
        </div>

        <form onSubmit={handleSubmit}>
          {questions.map((question, index) => (
            <div key={index} style={{ marginBottom: '25px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#333',
                  flex: 1,
                }}>
                  {questions.length > 1 && (
                    <span style={{
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#007bff',
                      color: '#fff',
                      borderRadius: '50%',
                      textAlign: 'center',
                      lineHeight: '24px',
                      fontSize: '14px',
                      marginRight: '10px'
                    }}>
                      {index + 1}
                    </span>
                  )}
                  {question}
                </label>
                {showVoiceButton && (
                  <button
                    type="button"
                    onClick={() => handleVoiceClick(index)}
                    disabled={isProcessing}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: isProcessing ? '#6c757d' : '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      marginLeft: '10px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🎤 Voice
                  </button>
                )}
              </div>

              {/* Audio Player for question playback */}
              {showVoiceButton && (
                <div style={{ marginBottom: '10px' }}>
                  <AudioPlayer
                    text={question}
                    voiceType={voiceType}
                    autoPlay={false}
                    onError={(err) => console.warn('Audio playback error:', err)}
                  />
                </div>
              )}

              <textarea
                value={answers[index]}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Type your answer here..."
                disabled={isProcessing}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  fontSize: '14px',
                  border: errors[index] ? '1px solid #dc3545' : '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              {errors[index] && (
                <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                  {errors[index]}
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
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
              {isProcessing ? 'Processing...' : `Submit ${questions.length > 1 ? 'All Answers' : 'Answer'}`}
            </button>

          </div>
        </form>
      </div>

      {/* Voice Modal */}
      {showVoiceModal && voiceQuestionIndex !== null && (
        (streamingMode && !forceNonStreaming) ? (
          <StreamingModeController
            onTranscriptionComplete={handleVoiceTranscription}
            onCancel={handleVoiceCancel}
            currentQuestion={questions[voiceQuestionIndex]}
            onSwitchToNonStreaming={handleSwitchToNonStreaming}
            voiceType={voiceType}
          />
        ) : (
          <NonStreamingModeController
            onTranscriptionComplete={handleVoiceTranscription}
            onCancel={handleVoiceCancel}
          />
        )
      )}

      <div style={{
        textAlign: 'center',
        color: '#666',
        fontSize: '14px',
        marginTop: '20px'
      }}>
        <p style={{ marginBottom: '15px' }}>
          We need a bit more information to provide an accurate classification.
          {currentQuestionIndex >= 8 && (
            <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
              {' '}({currentQuestionIndex + 1}/15 questions - approaching limit)
            </span>
          )}
        </p>

        {(onSkipInterview || onStartFresh) && (
          <div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {onSkipInterview && (
                <button
                  onClick={onSkipInterview}
                  disabled={isProcessing}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    color: '#dc3545',
                    border: '2px solid #dc3545',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (!isProcessing) {
                      e.currentTarget.style.backgroundColor = '#dc3545';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isProcessing) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#dc3545';
                    }
                  }}
                >
                  ⏭️ Skip Interview & Classify Now
                </button>
              )}
              {onStartFresh && (
                <button
                  onClick={onStartFresh}
                  disabled={isProcessing}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    color: '#6c757d',
                    border: '2px solid #6c757d',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (!isProcessing) {
                      e.currentTarget.style.backgroundColor = '#6c757d';
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isProcessing) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#6c757d';
                    }
                  }}
                >
                  🔄 Start Fresh
                </button>
              )}
            </div>
            <p style={{
              fontSize: '12px',
              color: '#999',
              marginTop: '8px',
              fontStyle: 'italic'
            }}>
              {onSkipInterview && 'Skip: Proceed with available information'}
              {onSkipInterview && onStartFresh && ' • '}
              {onStartFresh && 'Start Fresh: Clear session and begin again'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClarificationQuestions;
