import React, { useState, useEffect } from 'react';
import { Session, TransformationCategory } from '../../../shared/dist';

interface AdminReviewProps {
  onLoadPendingReviews: () => Promise<{
    sessions: Session[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  onSubmitReview: (sessionId: string, approved: boolean, correctedCategory?: TransformationCategory, reviewNotes?: string) => Promise<void>;
  onLoadStats: () => Promise<{
    pendingCount: number;
    reviewedCount: number;
    approvedCount: number;
    correctedCount: number;
    approvalRate: number;
  }>;
}

const AdminReview: React.FC<AdminReviewProps> = ({
  onLoadPendingReviews,
  onSubmitReview,
  onLoadStats
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [correctedCategory, setCorrectedCategory] = useState<TransformationCategory | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories: TransformationCategory[] = [
    'Eliminate',
    'Simplify',
    'Digitise',
    'RPA',
    'AI Agent',
    'Agentic AI'
  ];

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [reviewsData, statsData] = await Promise.all([
        onLoadPendingReviews(),
        onLoadStats()
      ]);
      
      setSessions(reviewsData.sessions);
      setTotalPages(reviewsData.totalPages);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = (session: Session) => {
    setSelectedSession(session);
    setReviewNotes('');
    setCorrectedCategory('');
  };

  const handleApprove = async () => {
    if (!selectedSession) return;
    
    setLoading(true);
    setError('');
    try {
      await onSubmitReview(selectedSession.sessionId, true, undefined, reviewNotes);
      setSelectedSession(null);
      setReviewNotes('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const handleCorrect = async () => {
    if (!selectedSession || !correctedCategory) {
      setError('Please select a corrected category');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await onSubmitReview(selectedSession.sessionId, false, correctedCategory, reviewNotes);
      setSelectedSession(null);
      setReviewNotes('');
      setCorrectedCategory('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: TransformationCategory): string => {
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

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Admin Review - Pending Evaluations</h2>

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Stats Dashboard */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: '#fff3cd',
            borderRadius: '8px',
            border: '1px solid #ffc107'
          }}>
            <div style={{ fontSize: '14px', color: '#856404', marginBottom: '5px' }}>
              Pending Reviews
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#856404' }}>
              {stats.pendingCount}
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: '#d4edda',
            borderRadius: '8px',
            border: '1px solid #28a745'
          }}>
            <div style={{ fontSize: '14px', color: '#155724', marginBottom: '5px' }}>
              Approved
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#155724' }}>
              {stats.approvedCount}
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: '#f8d7da',
            borderRadius: '8px',
            border: '1px solid #dc3545'
          }}>
            <div style={{ fontSize: '14px', color: '#721c24', marginBottom: '5px' }}>
              Corrected
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#721c24' }}>
              {stats.correctedCount}
            </div>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: '#d1ecf1',
            borderRadius: '8px',
            border: '1px solid #17a2b8'
          }}>
            <div style={{ fontSize: '14px', color: '#0c5460', marginBottom: '5px' }}>
              Approval Rate
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0c5460' }}>
              {(stats.approvalRate * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '1fr 1fr' : '1fr', gap: '20px' }}>
        {/* Sessions List */}
        <div>
          <h3 style={{ marginBottom: '15px' }}>
            Pending Sessions ({sessions.length})
          </h3>

          {loading && sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Loading...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              backgroundColor: '#d4edda',
              borderRadius: '8px',
              color: '#155724'
            }}>
              🎉 No pending reviews! All evaluations have been reviewed.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sessions.map(session => (
                  <div
                    key={session.sessionId}
                    onClick={() => handleSelectSession(session)}
                    style={{
                      padding: '15px',
                      backgroundColor: selectedSession?.sessionId === session.sessionId ? '#e7f3ff' : '#fff',
                      border: selectedSession?.sessionId === session.sessionId ? '2px solid #007bff' : '1px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (selectedSession?.sessionId !== session.sessionId) {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (selectedSession?.sessionId !== session.sessionId) {
                        e.currentTarget.style.backgroundColor = '#fff';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(session.createdAt).toLocaleString()}
                      </div>
                      {session.subject && (
                        <div style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          backgroundColor: '#e9ecef',
                          borderRadius: '3px'
                        }}>
                          {session.subject}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>
                      {session.conversations[0]?.processDescription.substring(0, 100)}...
                    </div>
                    {session.classification && (
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: getCategoryColor(session.classification.category),
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {session.classification.category} ({(session.classification.confidence * 100).toFixed(0)}%)
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '10px',
                  marginTop: '20px'
                }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: page === 1 ? '#e9ecef' : '#007bff',
                      color: page === 1 ? '#6c757d' : '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: page === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '8px 16px', color: '#666' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: page === totalPages ? '#e9ecef' : '#007bff',
                      color: page === totalPages ? '#6c757d' : '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Review Panel */}
        {selectedSession && selectedSession.classification && (
          <div style={{
            padding: '20px',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            position: 'sticky',
            top: '20px',
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Review Classification</h3>

            {/* Process Description */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                Process Description
              </h4>
              <div style={{
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                {selectedSession.conversations[0]?.processDescription}
              </div>
            </div>

            {/* Clarification Q&A */}
            {selectedSession.conversations[0]?.clarificationQA.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                  Clarification Questions ({selectedSession.conversations[0].clarificationQA.length})
                </h4>
                {selectedSession.conversations[0].clarificationQA.map((qa, idx) => (
                  <div key={idx} style={{
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    fontSize: '13px'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Q: {qa.question}</div>
                    <div>A: {qa.answer}</div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Classification */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                AI Classification
              </h4>
              <div style={{
                padding: '15px',
                backgroundColor: getCategoryColor(selectedSession.classification.category),
                color: '#fff',
                borderRadius: '8px',
                marginBottom: '10px'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
                  {selectedSession.classification.category}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  Confidence: {(selectedSession.classification.confidence * 100).toFixed(1)}%
                </div>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                fontSize: '13px',
                lineHeight: '1.6',
                marginBottom: '10px'
              }}>
                <strong>Rationale:</strong><br />
                {selectedSession.classification.rationale}
              </div>
            </div>

            {/* Review Actions */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                Your Review
              </h4>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  Corrected Category (if needed)
                </label>
                <select
                  value={correctedCategory}
                  onChange={(e) => setCorrectedCategory(e.target.value as TransformationCategory | '')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">-- Same as AI (Approve) --</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  Review Notes (optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about your review decision..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: loading ? '#6c757d' : '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={handleCorrect}
                  disabled={loading || !correctedCategory}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: loading || !correctedCategory ? '#6c757d' : '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: loading || !correctedCategory ? 'not-allowed' : 'pointer'
                  }}
                >
                  ✗ Correct
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReview;
