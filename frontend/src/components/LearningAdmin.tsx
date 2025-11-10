import React, { useEffect, useState } from 'react';
import { LearningSuggestion, LearningAnalysis } from '../../../shared/dist';

interface LearningAdminProps {
  onLoadSuggestions: () => Promise<LearningSuggestion[]>;
  onApproveSuggestion: (suggestionId: string) => Promise<void>;
  onRejectSuggestion: (suggestionId: string, notes?: string) => Promise<void>;
  onTriggerAnalysis: () => Promise<LearningAnalysis>;
}

const LearningAdmin: React.FC<LearningAdminProps> = ({
  onLoadSuggestions,
  onApproveSuggestion,
  onRejectSuggestion,
  onTriggerAnalysis,
}) => {
  const [suggestions, setSuggestions] = useState<LearningSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LearningAnalysis | null>(null);
  const [rejectNotes, setRejectNotes] = useState<{ [key: string]: string }>({});

  const loadSuggestions = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await onLoadSuggestions();
      setSuggestions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, [onLoadSuggestions]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleTriggerAnalysis = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const result = await onTriggerAnalysis();
      setAnalysisResult(result);
      await loadSuggestions(); // Reload suggestions after analysis
    } catch (err: any) {
      setError(err.message || 'Failed to trigger analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApprove = async (suggestionId: string) => {
    setError('');
    try {
      await onApproveSuggestion(suggestionId);
      await loadSuggestions();
    } catch (err: any) {
      setError(err.message || 'Failed to approve suggestion');
    }
  };

  const handleReject = async (suggestionId: string) => {
    setError('');
    try {
      await onRejectSuggestion(suggestionId, rejectNotes[suggestionId]);
      setRejectNotes({ ...rejectNotes, [suggestionId]: '' });
      await loadSuggestions();
    } catch (err: any) {
      setError(err.message || 'Failed to reject suggestion');
    }
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const reviewedSuggestions = suggestions.filter(s => s.status !== 'pending');

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px', textAlign: 'center' }}>
        <p>Loading AI learning suggestions...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>AI Learning Admin</h2>
        <button
          onClick={handleTriggerAnalysis}
          disabled={analyzing}
          style={{
            padding: '10px 20px',
            backgroundColor: analyzing ? '#6c757d' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: analyzing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {analyzing ? '🔄 Analyzing...' : '🔍 Trigger Analysis'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}

      {/* Analysis Result */}
      {analysisResult && (
        <div style={{
          backgroundColor: '#d1ecf1',
          border: '1px solid #bee5eb',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          color: '#0c5460'
        }}>
          <h3 style={{ marginTop: 0 }}>Latest Analysis Report</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <strong>Triggered By:</strong> {analysisResult.triggeredBy}
            </div>
            <div>
              <strong>Triggered At:</strong> {new Date(analysisResult.triggeredAt).toLocaleString()}
            </div>
            <div>
              <strong>Total Sessions:</strong> {analysisResult.dataRange.totalSessions}
            </div>
            <div>
              <strong>Overall Agreement:</strong> {Math.round(analysisResult.findings.overallAgreementRate * 100)}%
            </div>
          </div>
          
          {analysisResult.findings.identifiedPatterns.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <strong>Identified Patterns:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                {analysisResult.findings.identifiedPatterns.map((pattern, idx) => (
                  <li key={idx}>{pattern}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.findings.commonMisclassifications.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <strong>Common Misclassifications:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                {analysisResult.findings.commonMisclassifications.map((misc, idx) => (
                  <li key={idx}>
                    {misc.from} → {misc.to} ({misc.count} occurrences)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Pending Suggestions */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0 }}>
          Pending Suggestions ({pendingSuggestions.length})
        </h3>

        {pendingSuggestions.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center' }}>
            No pending suggestions. Trigger an analysis to generate new suggestions.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pendingSuggestions.map(suggestion => (
              <div key={suggestion.suggestionId} style={{
                padding: '20px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'between', marginBottom: '15px' }}>
                  <div>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: '#ffc107',
                      color: '#000',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginRight: '10px'
                    }}>
                      {suggestion.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(suggestion.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <strong>Rationale:</strong>
                  <p style={{ margin: '5px 0', lineHeight: '1.5' }}>
                    {suggestion.rationale}
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '10px',
                  marginBottom: '15px',
                  padding: '10px',
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  borderRadius: '4px'
                }}>
                  <div>
                    <strong>Affected Categories:</strong>
                    <div style={{ fontSize: '14px' }}>
                      {suggestion.impactEstimate.affectedCategories.join(', ')}
                    </div>
                  </div>
                  <div>
                    <strong>Expected Improvement:</strong>
                    <div style={{ fontSize: '14px', color: '#28a745', fontWeight: 'bold' }}>
                      +{suggestion.impactEstimate.expectedImprovementPercent}%
                    </div>
                  </div>
                  <div>
                    <strong>Confidence:</strong>
                    <div style={{ fontSize: '14px' }}>
                      {Math.round(suggestion.impactEstimate.confidenceLevel * 100)}%
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <strong>Suggested Change:</strong>
                  <pre style={{
                    margin: '5px 0',
                    padding: '10px',
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(suggestion.suggestedChange, null, 2)}
                  </pre>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    Review Notes (optional):
                  </label>
                  <textarea
                    value={rejectNotes[suggestion.suggestionId] || ''}
                    onChange={(e) => setRejectNotes({
                      ...rejectNotes,
                      [suggestion.suggestionId]: e.target.value
                    })}
                    placeholder="Add notes about your decision..."
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

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleApprove(suggestion.suggestionId)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReject(suggestion.suggestionId)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed Suggestions */}
      {reviewedSuggestions.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>
            Reviewed Suggestions ({reviewedSuggestions.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {reviewedSuggestions.map(suggestion => (
              <div key={suggestion.suggestionId} style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                borderLeft: `4px solid ${
                  suggestion.status === 'approved' ? '#28a745' :
                  suggestion.status === 'applied' ? '#007bff' : '#dc3545'
                }`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: 
                        suggestion.status === 'approved' ? '#28a745' :
                        suggestion.status === 'applied' ? '#007bff' : '#dc3545',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginRight: '10px'
                    }}>
                      {suggestion.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {suggestion.type.replace('_', ' ')}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    Reviewed: {suggestion.reviewedAt ? new Date(suggestion.reviewedAt).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                  {suggestion.rationale}
                </div>
                {suggestion.reviewNotes && (
                  <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                    Notes: {suggestion.reviewNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningAdmin;
