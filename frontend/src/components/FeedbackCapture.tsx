import React, { useState } from 'react';
import { TransformationCategory } from '../../../shared/dist';

interface FeedbackCaptureProps {
  currentCategory: TransformationCategory;
  onConfirm: () => void;
  onCorrect: (correctedCategory: TransformationCategory) => void;
  onRating: (rating: 'up' | 'down', comments?: string) => void;
  isProcessing?: boolean;
}

const FeedbackCapture: React.FC<FeedbackCaptureProps> = ({
  currentCategory,
  onConfirm,
  onCorrect,
  onRating,
  isProcessing = false,
}) => {
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TransformationCategory | ''>('');
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingComments, setRatingComments] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const categories: TransformationCategory[] = [
    'Eliminate',
    'Simplify',
    'Digitise',
    'RPA',
    'AI Agent',
    'Agentic AI',
  ];

  const handleConfirm = () => {
    onConfirm();
    setFeedbackSubmitted(true);
    setShowRatingForm(true);
  };

  const handleCorrect = () => {
    if (selectedCategory && selectedCategory !== currentCategory) {
      onCorrect(selectedCategory);
      setFeedbackSubmitted(true);
      setShowRatingForm(true);
      setShowCorrectionForm(false);
    }
  };

  const handleRating = (rating: 'up' | 'down') => {
    onRating(rating, ratingComments || undefined);
    setShowRatingForm(false);
  };

  if (feedbackSubmitted && !showRatingForm) {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '20px auto',
        padding: '20px',
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#155724'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>✓ Thank You!</h3>
        <p style={{ margin: 0 }}>Your feedback has been recorded.</p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '20px auto',
      padding: '20px'
    }}>
      {!feedbackSubmitted && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
            Is this classification correct?
          </h3>

          {!showCorrectionForm ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: isProcessing ? '#6c757d' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={(e) => {
                  if (!isProcessing) e.currentTarget.style.backgroundColor = '#218838';
                }}
                onMouseOut={(e) => {
                  if (!isProcessing) e.currentTarget.style.backgroundColor = '#28a745';
                }}
              >
                ✓ Confirm
              </button>

              <button
                onClick={() => setShowCorrectionForm(true)}
                disabled={isProcessing}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: isProcessing ? '#6c757d' : '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={(e) => {
                  if (!isProcessing) e.currentTarget.style.backgroundColor = '#c82333';
                }}
                onMouseOut={(e) => {
                  if (!isProcessing) e.currentTarget.style.backgroundColor = '#dc3545';
                }}
              >
                ✗ Correct
              </button>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '15px', color: '#666' }}>
                Please select the correct category:
              </p>

              <div style={{ marginBottom: '15px' }}>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as TransformationCategory)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat} disabled={cat === currentCategory}>
                      {cat} {cat === currentCategory ? '(current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCorrect}
                  disabled={!selectedCategory || selectedCategory === currentCategory || isProcessing}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    backgroundColor: (!selectedCategory || selectedCategory === currentCategory || isProcessing) ? '#6c757d' : '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: (!selectedCategory || selectedCategory === currentCategory || isProcessing) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Submit Correction
                </button>

                <button
                  onClick={() => {
                    setShowCorrectionForm(false);
                    setSelectedCategory('');
                  }}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    backgroundColor: '#fff',
                    color: '#6c757d',
                    border: '1px solid #6c757d',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: isProcessing ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showRatingForm && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
            How was your experience?
          </h3>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              onClick={() => handleRating('up')}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '20px',
                backgroundColor: '#fff',
                color: '#28a745',
                border: '2px solid #28a745',
                borderRadius: '8px',
                fontSize: '48px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.backgroundColor = '#28a745';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseOut={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.color = '#28a745';
                }
              }}
            >
              👍
            </button>

            <button
              onClick={() => handleRating('down')}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '20px',
                backgroundColor: '#fff',
                color: '#dc3545',
                border: '2px solid #dc3545',
                borderRadius: '8px',
                fontSize: '48px',
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
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.color = '#dc3545';
                }
              }}
            >
              👎
            </button>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="comments" style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
              Additional comments (optional):
            </label>
            <textarea
              id="comments"
              value={ratingComments}
              onChange={(e) => setRatingComments(e.target.value)}
              placeholder="Tell us more about your experience..."
              disabled={isProcessing}
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <button
            onClick={() => setShowRatingForm(false)}
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#fff',
              color: '#6c757d',
              border: '1px solid #6c757d',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
          >
            Skip Rating
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedbackCapture;
