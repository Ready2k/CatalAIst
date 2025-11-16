import React, { useEffect, useState, useCallback } from 'react';
import { Session, TransformationCategory } from '../../../shared/dist';

interface SessionDetailModalProps {
  sessionId: string;
  onClose: () => void;
}

type TabType = 'overview' | 'conversations' | 'classification' | 'decisionMatrix' | 'feedback';

const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ sessionId, onClose }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isMobile, setIsMobile] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Check screen size for responsive design
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Scroll to top on modal open
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load session details
  useEffect(() => {
    const loadSession = async () => {
      setLoading(true);
      setError('');
      try {
        const token = sessionStorage.getItem('authToken');
        const response = await fetch(`/api/analytics/sessions/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load session details');
        }

        const data = await response.json();
        setSession(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load session');
        console.error('Session load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Copy session ID to clipboard
  const handleCopySessionId = useCallback(() => {
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, [sessionId]);

  // Format confidence as percentage
  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Get category color
  const getCategoryColor = (category: TransformationCategory) => {
    const colors: Record<TransformationCategory, string> = {
      'Eliminate': '#dc3545',
      'Simplify': '#fd7e14',
      'Digitise': '#ffc107',
      'RPA': '#28a745',
      'AI Agent': '#17a2b8',
      'Agentic AI': '#6f42c1'
    };
    return colors[category] || '#6c757d';
  };

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...modalStyle(isMobile), textAlign: 'center', padding: '40px' }}>
          <p>Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle(isMobile)}>
          <div style={headerStyle}>
            <h2 style={{ margin: 0 }}>Error</h2>
            <button
              onClick={onClose}
              style={closeButtonStyle}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
          <div style={{ padding: '20px' }}>
            <p style={{ color: '#dc3545' }}>{error || 'Session not found'}</p>
            <button onClick={onClose} style={primaryButtonStyle}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={overlayStyle} 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div style={modalStyle(isMobile)} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '20px' }} id="modal-title">Session Details</h2>
          <button
            onClick={onClose}
            style={closeButtonStyle}
            aria-label="Close session details modal"
            onFocus={(e) => {
              e.currentTarget.style.outline = '3px solid #007bff';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={tabContainerStyle} role="tablist" aria-label="Session detail tabs">
          <button
            onClick={() => setActiveTab('overview')}
            style={tabButtonStyle(activeTab === 'overview')}
            role="tab"
            aria-selected={activeTab === 'overview'}
            aria-controls="tab-panel-overview"
            id="tab-overview"
            tabIndex={activeTab === 'overview' ? 0 : -1}
            onFocus={(e) => {
              if (activeTab === 'overview') {
                e.currentTarget.style.outline = '3px solid #007bff';
                e.currentTarget.style.outlineOffset = '2px';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('conversations')}
            style={tabButtonStyle(activeTab === 'conversations')}
            role="tab"
            aria-selected={activeTab === 'conversations'}
            aria-controls="tab-panel-conversations"
            id="tab-conversations"
            tabIndex={activeTab === 'conversations' ? 0 : -1}
            onFocus={(e) => {
              if (activeTab === 'conversations') {
                e.currentTarget.style.outline = '3px solid #007bff';
                e.currentTarget.style.outlineOffset = '2px';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            Conversations
          </button>
          <button
            onClick={() => setActiveTab('classification')}
            style={tabButtonStyle(activeTab === 'classification')}
            role="tab"
            aria-selected={activeTab === 'classification'}
            aria-controls="tab-panel-classification"
            id="tab-classification"
            tabIndex={activeTab === 'classification' ? 0 : -1}
            onFocus={(e) => {
              if (activeTab === 'classification') {
                e.currentTarget.style.outline = '3px solid #007bff';
                e.currentTarget.style.outlineOffset = '2px';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            Classification
          </button>
          <button
            onClick={() => setActiveTab('decisionMatrix')}
            style={tabButtonStyle(activeTab === 'decisionMatrix')}
            role="tab"
            aria-selected={activeTab === 'decisionMatrix'}
            aria-controls="tab-panel-decisionMatrix"
            id="tab-decisionMatrix"
            tabIndex={activeTab === 'decisionMatrix' ? 0 : -1}
            onFocus={(e) => {
              if (activeTab === 'decisionMatrix') {
                e.currentTarget.style.outline = '3px solid #007bff';
                e.currentTarget.style.outlineOffset = '2px';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            Decision Matrix
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            style={tabButtonStyle(activeTab === 'feedback')}
            role="tab"
            aria-selected={activeTab === 'feedback'}
            aria-controls="tab-panel-feedback"
            id="tab-feedback"
            tabIndex={activeTab === 'feedback' ? 0 : -1}
            onFocus={(e) => {
              if (activeTab === 'feedback') {
                e.currentTarget.style.outline = '3px solid #007bff';
                e.currentTarget.style.outlineOffset = '2px';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            Feedback & Rating
          </button>
        </div>

        {/* Tab Content */}
        <div style={contentStyle} role="tabpanel" id={`tab-panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'overview' && (
            <OverviewTab session={session} onCopySessionId={handleCopySessionId} copySuccess={copySuccess} />
          )}
          {activeTab === 'conversations' && (
            <ConversationsTab session={session} />
          )}
          {activeTab === 'classification' && (
            <ClassificationTab session={session} getCategoryColor={getCategoryColor} formatConfidence={formatConfidence} />
          )}
          {activeTab === 'decisionMatrix' && (
            <DecisionMatrixTab session={session} getCategoryColor={getCategoryColor} formatConfidence={formatConfidence} />
          )}
          {activeTab === 'feedback' && (
            <FeedbackTab session={session} getCategoryColor={getCategoryColor} />
          )}
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{
  session: Session;
  onCopySessionId: () => void;
  copySuccess: boolean;
}> = ({ session, onCopySessionId, copySuccess }) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Session Metadata</h3>
      
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Session ID</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <code style={codeStyle}>{session.sessionId}</code>
          <button
            onClick={onCopySessionId}
            style={secondaryButtonStyle}
            aria-label="Copy session ID to clipboard"
            aria-live="polite"
            onFocus={(e) => {
              e.currentTarget.style.outline = '3px solid #007bff';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            {copySuccess ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Initiative ID</label>
        <div style={valueStyle}>{session.initiativeId}</div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Created At</label>
        <div style={valueStyle}>{formatDate(session.createdAt)}</div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Updated At</label>
        <div style={valueStyle}>{formatDate(session.updatedAt)}</div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Status</label>
        <div style={valueStyle}>
          <span style={statusBadgeStyle(session.status)}>
            {session.status}
          </span>
        </div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Model Used</label>
        <div style={valueStyle}>{session.modelUsed}</div>
      </div>

      {session.subject && (
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Subject</label>
          <div style={valueStyle}>{session.subject}</div>
        </div>
      )}
    </div>
  );
};

// Conversations Tab Component
const ConversationsTab: React.FC<{ session: Session }> = ({ session }) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  if (!session.conversations || session.conversations.length === 0) {
    return (
      <div style={emptyStateStyle}>
        <p>No conversations recorded for this session.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Conversations ({session.conversations.length})</h3>
      
      {session.conversations.map((conv, index) => (
        <div key={conv.conversationId} style={conversationCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <strong>Conversation {index + 1}</strong>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {formatDate(conv.timestamp)}
            </span>
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Process Description</label>
            <div style={valueStyle}>{conv.processDescription}</div>
          </div>

          {conv.subject && (
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Subject</label>
              <div style={valueStyle}>{conv.subject}</div>
            </div>
          )}

          {conv.clarificationQA && conv.clarificationQA.length > 0 && (
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Clarification Q&A</label>
              <div style={{ marginTop: '10px' }}>
                {conv.clarificationQA.map((qa, qaIndex) => (
                  <div key={qaIndex} style={qaCardStyle}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ color: '#007bff' }}>Q:</strong> {qa.question}
                    </div>
                    <div>
                      <strong style={{ color: '#28a745' }}>A:</strong> {qa.answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Classification Tab Component
const ClassificationTab: React.FC<{
  session: Session;
  getCategoryColor: (category: TransformationCategory) => string;
  formatConfidence: (confidence: number) => string;
}> = ({ session, getCategoryColor, formatConfidence }) => {
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassifyResult, setReclassifyResult] = useState<any>(null);
  const [reclassifyError, setReclassifyError] = useState('');

  const handleReclassify = async () => {
    if (!window.confirm('Are you sure you want to reclassify this session with the current decision matrix?')) {
      return;
    }

    setReclassifying(true);
    setReclassifyError('');
    setReclassifyResult(null);

    try {
      const token = sessionStorage.getItem('authToken');
      const credentialsStr = sessionStorage.getItem('llmCredentials');
      
      if (!credentialsStr) {
        throw new Error('No LLM credentials found. Please reconfigure your LLM provider in the Configuration tab.');
      }
      
      const credentials = JSON.parse(credentialsStr);

      const requestBody: any = {
        sessionId: session.sessionId,
        useOriginalModel: true,
        reason: 'Admin reclassification from UI'
      };

      // Add credentials based on provider
      if (session.classification?.llmProvider === 'bedrock') {
        requestBody.provider = 'bedrock';
        requestBody.awsAccessKeyId = credentials.awsAccessKeyId;
        requestBody.awsSecretAccessKey = credentials.awsSecretAccessKey;
        
        if (!credentials.awsAccessKeyId || !credentials.awsSecretAccessKey) {
          throw new Error('AWS credentials are incomplete. Please reconfigure your AWS Bedrock provider in the Configuration tab.');
        }
        
        if (credentials.awsSessionToken) {
          requestBody.awsSessionToken = credentials.awsSessionToken;
        }
        if (credentials.awsRegion) {
          requestBody.awsRegion = credentials.awsRegion;
        }
      } else {
        requestBody.apiKey = credentials.apiKey;
        
        if (!credentials.apiKey) {
          throw new Error('OpenAI API key is missing. Please reconfigure your OpenAI provider in the Configuration tab.');
        }
      }

      const response = await fetch('/api/process/reclassify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reclassify session');
      }

      const result = await response.json();
      setReclassifyResult(result);

      // Reload the page after 3 seconds to show updated classification
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      setReclassifyError(err.message || 'Failed to reclassify session');
      console.error('Reclassify error:', err);
    } finally {
      setReclassifying(false);
    }
  };

  if (!session.classification) {
    return (
      <div style={emptyStateStyle}>
        <p>No classification available for this session.</p>
      </div>
    );
  }

  const { classification } = session;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Classification Details</h3>
        <button
          onClick={handleReclassify}
          disabled={reclassifying}
          style={{
            padding: '10px 20px',
            backgroundColor: reclassifying ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: reclassifying ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!reclassifying) {
              e.currentTarget.style.backgroundColor = '#0056b3';
            }
          }}
          onMouseLeave={(e) => {
            if (!reclassifying) {
              e.currentTarget.style.backgroundColor = '#007bff';
            }
          }}
        >
          {reclassifying ? '🔄 Reclassifying...' : '🔄 Reclassify'}
        </button>
      </div>

      {/* Reclassification Result */}
      {reclassifyResult && (
        <div style={{
          padding: '15px',
          backgroundColor: reclassifyResult.changed ? '#d4edda' : '#d1ecf1',
          border: `1px solid ${reclassifyResult.changed ? '#c3e6cb' : '#bee5eb'}`,
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h4 style={{ marginTop: 0, color: reclassifyResult.changed ? '#155724' : '#0c5460' }}>
            {reclassifyResult.changed ? '✅ Classification Changed!' : 'ℹ️ Classification Unchanged'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', alignItems: 'center' }}>
            <div>
              <strong>Original:</strong>
              <div style={{ marginTop: '5px' }}>
                <span style={{
                  ...categoryBadgeStyle,
                  backgroundColor: getCategoryColor(reclassifyResult.original.category as TransformationCategory),
                }}>
                  {reclassifyResult.original.category}
                </span>
                <div style={{ marginTop: '5px', fontSize: '14px' }}>
                  Confidence: {Math.round(reclassifyResult.original.confidence * 100)}%
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Matrix: {reclassifyResult.original.matrixVersion}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '24px', color: '#007bff' }}>→</div>
            <div>
              <strong>New:</strong>
              <div style={{ marginTop: '5px' }}>
                <span style={{
                  ...categoryBadgeStyle,
                  backgroundColor: getCategoryColor(reclassifyResult.new.category as TransformationCategory),
                }}>
                  {reclassifyResult.new.category}
                </span>
                <div style={{ marginTop: '5px', fontSize: '14px' }}>
                  Confidence: {Math.round(reclassifyResult.new.confidence * 100)}%
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Matrix: {reclassifyResult.new.matrixVersion}
                </div>
              </div>
            </div>
          </div>
          {reclassifyResult.confidenceDelta !== 0 && (
            <div style={{ marginTop: '10px', fontSize: '14px' }}>
              Confidence change: {reclassifyResult.confidenceDelta > 0 ? '+' : ''}{(reclassifyResult.confidenceDelta * 100).toFixed(1)}%
            </div>
          )}
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            Page will reload in 3 seconds to show updated classification...
          </div>
        </div>
      )}

      {/* Reclassification Error */}
      {reclassifyError && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px',
          color: '#721c24'
        }}>
          <strong>Error:</strong> {reclassifyError}
        </div>
      )}

      <h3 style={{ marginTop: 0 }}>Classification Details</h3>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Category</label>
        <div>
          <span style={{
            ...categoryBadgeStyle,
            backgroundColor: getCategoryColor(classification.category),
          }}>
            {classification.category}
          </span>
        </div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Confidence</label>
        <div style={valueStyle}>
          {formatConfidence(classification.confidence)}
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            overflow: 'hidden',
            marginTop: '8px'
          }}>
            <div style={{
              width: `${classification.confidence * 100}%`,
              height: '100%',
              backgroundColor: classification.confidence >= 0.6 ? '#28a745' : '#ffc107'
            }} />
          </div>
        </div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Rationale</label>
        <div style={valueStyle}>{classification.rationale}</div>
      </div>

      <div style={highlightBoxStyle}>
        <h4 style={{ marginTop: 0, color: '#007bff' }}>Category Progression</h4>
        <div style={valueStyle}>{classification.categoryProgression}</div>
      </div>

      <div style={highlightBoxStyle}>
        <h4 style={{ marginTop: 0, color: '#28a745' }}>Future Opportunities</h4>
        <div style={valueStyle}>{classification.futureOpportunities}</div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Model Used</label>
        <div style={valueStyle}>{classification.modelUsed}</div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>LLM Provider</label>
        <div style={valueStyle}>{classification.llmProvider}</div>
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Timestamp</label>
        <div style={valueStyle}>{new Date(classification.timestamp).toLocaleString()}</div>
      </div>
    </div>
  );
};

// Decision Matrix Tab Component
const DecisionMatrixTab: React.FC<{
  session: Session;
  getCategoryColor: (category: TransformationCategory) => string;
  formatConfidence: (confidence: number) => string;
}> = ({ session, getCategoryColor, formatConfidence }) => {
  const evaluation = session.classification?.decisionMatrixEvaluation;

  if (!evaluation) {
    return (
      <div style={emptyStateStyle}>
        <p>No decision matrix evaluation available for this session.</p>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
          This session was classified without using the decision matrix rules engine.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Decision Matrix Evaluation</h3>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Matrix Version</label>
        <div style={valueStyle}>{evaluation.matrixVersion}</div>
      </div>

      {evaluation.overridden && (
        <div style={{
          ...highlightBoxStyle,
          backgroundColor: '#fff3cd',
          borderColor: '#ffc107'
        }}>
          <strong>⚠️ Classification Override</strong>
          <p style={{ margin: '8px 0 0 0' }}>
            The decision matrix rules modified the original classification.
          </p>
        </div>
      )}

      {/* Original vs Final Classification Comparison */}
      <div style={comparisonBoxStyle}>
        <h4 style={{ marginTop: 0 }}>Classification Comparison</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Original Classification</label>
            <div>
              <span style={{
                ...categoryBadgeStyle,
                backgroundColor: getCategoryColor(evaluation.originalClassification.category),
              }}>
                {evaluation.originalClassification.category}
              </span>
              <div style={{ marginTop: '8px', fontSize: '14px' }}>
                Confidence: {formatConfidence(evaluation.originalClassification.confidence)}
              </div>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Final Classification</label>
            <div>
              <span style={{
                ...categoryBadgeStyle,
                backgroundColor: getCategoryColor(evaluation.finalClassification.category),
              }}>
                {evaluation.finalClassification.category}
              </span>
              <div style={{ marginTop: '8px', fontSize: '14px' }}>
                Confidence: {formatConfidence(evaluation.finalClassification.confidence)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Attributes */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>Extracted Attributes</label>
        <div style={attributesGridStyle}>
          {Object.entries(evaluation.extractedAttributes).map(([key, value]) => (
            <div key={key} style={attributeCardStyle}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{key}</div>
              <div style={{ color: '#666' }}>{String(value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Triggered Rules */}
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>
          Triggered Rules ({evaluation.triggeredRules.length})
        </label>
        {evaluation.triggeredRules.length === 0 ? (
          <div style={emptyStateStyle}>
            <p>No rules were triggered for this session.</p>
          </div>
        ) : (
          <div style={{ marginTop: '10px' }}>
            {evaluation.triggeredRules.map((rule, index) => (
              <div key={rule.ruleId} style={ruleCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong>{rule.ruleName}</strong>
                  <span style={actionBadgeStyle(rule.action.type)}>
                    {rule.action.type}
                  </span>
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <strong>Action:</strong>{' '}
                  {rule.action.type === 'override' && rule.action.targetCategory && (
                    <span>Override to <strong>{rule.action.targetCategory}</strong></span>
                  )}
                  {rule.action.type === 'adjust_confidence' && rule.action.confidenceAdjustment !== undefined && (
                    <span>Adjust confidence by <strong>{rule.action.confidenceAdjustment > 0 ? '+' : ''}{rule.action.confidenceAdjustment}</strong></span>
                  )}
                  {rule.action.type === 'flag_review' && (
                    <span>Flag for manual review</span>
                  )}
                </div>

                <div>
                  <strong>Rationale:</strong> {rule.action.rationale}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Feedback Tab Component
const FeedbackTab: React.FC<{
  session: Session;
  getCategoryColor: (category: TransformationCategory) => string;
}> = ({ session, getCategoryColor }) => {
  const hasFeedback = session.feedback !== undefined;
  const hasRating = session.userRating !== undefined;

  if (!hasFeedback && !hasRating) {
    return (
      <div style={emptyStateStyle}>
        <p>No feedback or rating available for this session.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Feedback & Rating</h3>

      {/* Feedback Section */}
      {hasFeedback && session.feedback && (
        <div style={sectionBoxStyle}>
          <h4 style={{ marginTop: 0 }}>Classification Feedback</h4>
          
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Confirmation Status</label>
            <div>
              <span style={confirmationBadgeStyle(session.feedback.confirmed)}>
                {session.feedback.confirmed ? '✓ Confirmed' : '✗ Not Confirmed'}
              </span>
            </div>
          </div>

          {!session.feedback.confirmed && session.feedback.correctedCategory && (
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Corrected Category</label>
              <div>
                <span style={{
                  ...categoryBadgeStyle,
                  backgroundColor: getCategoryColor(session.feedback.correctedCategory),
                }}>
                  {session.feedback.correctedCategory}
                </span>
              </div>
            </div>
          )}

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Feedback Timestamp</label>
            <div style={valueStyle}>{new Date(session.feedback.timestamp).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Rating Section */}
      {hasRating && session.userRating && (
        <div style={sectionBoxStyle}>
          <h4 style={{ marginTop: 0 }}>User Rating</h4>
          
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Rating</label>
            <div>
              <span style={ratingBadgeStyle(session.userRating.rating)}>
                {session.userRating.rating === 'up' ? '👍 Positive' : '👎 Negative'}
              </span>
            </div>
          </div>

          {session.userRating.comments && (
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Comments</label>
              <div style={{
                ...valueStyle,
                backgroundColor: '#f8f9fa',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}>
                {session.userRating.comments}
              </div>
            </div>
          )}

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Rating Timestamp</label>
            <div style={valueStyle}>{new Date(session.userRating.timestamp).toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
  overflowY: 'auto'
};

const modalStyle = (isMobile: boolean): React.CSSProperties => ({
  backgroundColor: '#fff',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  width: isMobile ? '100%' : '90%',
  maxWidth: isMobile ? '100%' : '1200px',
  maxHeight: isMobile ? '100vh' : '90vh',
  display: 'flex',
  flexDirection: 'column',
  margin: isMobile ? 0 : 'auto'
});

const headerStyle: React.CSSProperties = {
  padding: '20px',
  borderBottom: '1px solid #dee2e6',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#f8f9fa'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  color: '#6c757d',
  padding: '0',
  width: '44px',
  height: '44px',
  minWidth: '44px',
  minHeight: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  transition: 'background-color 0.2s',
  outline: 'none'
};

const tabContainerStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #dee2e6',
  backgroundColor: '#f8f9fa',
  overflowX: 'auto',
  flexWrap: 'nowrap'
};

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '12px 20px',
  border: 'none',
  backgroundColor: active ? '#fff' : 'transparent',
  color: active ? '#007bff' : '#6c757d',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: active ? 'bold' : 'normal',
  borderBottom: active ? '3px solid #007bff' : '3px solid transparent',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
  minWidth: '44px',
  minHeight: '44px'
});

const contentStyle: React.CSSProperties = {
  padding: '20px',
  overflowY: 'auto',
  flex: 1
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: '20px'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: '8px',
  color: '#495057',
  fontSize: '14px'
};

const valueStyle: React.CSSProperties = {
  color: '#212529',
  fontSize: '14px',
  lineHeight: '1.5'
};

const codeStyle: React.CSSProperties = {
  backgroundColor: '#f8f9fa',
  padding: '4px 8px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '13px',
  border: '1px solid #dee2e6'
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold',
  minWidth: '44px',
  minHeight: '44px'
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  backgroundColor: '#6c757d',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  minWidth: '44px',
  minHeight: '44px'
};

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, string> = {
    'active': '#17a2b8',
    'completed': '#28a745',
    'manual_review': '#ffc107'
  };
  return {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    backgroundColor: colors[status] || '#6c757d',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold'
  };
};

const categoryBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '6px 16px',
  borderRadius: '16px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold'
};

const conversationCardStyle: React.CSSProperties = {
  backgroundColor: '#f8f9fa',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '16px',
  border: '1px solid #dee2e6'
};

const qaCardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '12px',
  borderRadius: '4px',
  marginBottom: '8px',
  border: '1px solid #dee2e6'
};

const highlightBoxStyle: React.CSSProperties = {
  backgroundColor: '#e7f3ff',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '2px solid #007bff'
};

const comparisonBoxStyle: React.CSSProperties = {
  backgroundColor: '#f8f9fa',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '1px solid #dee2e6'
};

const attributesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '12px',
  marginTop: '10px'
};

const attributeCardStyle: React.CSSProperties = {
  backgroundColor: '#f8f9fa',
  padding: '12px',
  borderRadius: '4px',
  border: '1px solid #dee2e6'
};

const ruleCardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '12px',
  border: '2px solid #007bff',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
};

const actionBadgeStyle = (type: string): React.CSSProperties => {
  const colors: Record<string, string> = {
    'override': '#dc3545',
    'adjust_confidence': '#ffc107',
    'flag_review': '#17a2b8'
  };
  return {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    backgroundColor: colors[type] || '#6c757d',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  };
};

const sectionBoxStyle: React.CSSProperties = {
  backgroundColor: '#f8f9fa',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '1px solid #dee2e6'
};

const confirmationBadgeStyle = (confirmed: boolean): React.CSSProperties => ({
  display: 'inline-block',
  padding: '6px 16px',
  borderRadius: '16px',
  backgroundColor: confirmed ? '#28a745' : '#dc3545',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold'
});

const ratingBadgeStyle = (rating: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '6px 16px',
  borderRadius: '16px',
  backgroundColor: rating === 'up' ? '#28a745' : '#dc3545',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold'
});

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: '#6c757d'
};

export default SessionDetailModal;
