import React, { useState, memo } from 'react';
import { SessionListItem } from '../../../shared/dist';

interface SessionListTableProps {
  sessions: SessionListItem[];
  loading: boolean;
  onSessionClick: (sessionId: string) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
}

// Memoized row component for performance
interface SessionRowProps {
  session: SessionListItem;
  onSessionClick: (sessionId: string) => void;
  formatDate: (dateString: string) => string;
  formatConfidence: (confidence?: number) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  renderIndicators: (session: SessionListItem) => React.ReactNode;
}

const SessionRow = memo<SessionRowProps>(({
  session,
  onSessionClick,
  formatDate,
  formatConfidence,
  getStatusColor,
  getStatusLabel,
  renderIndicators
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <tr
      onClick={() => onSessionClick(session.sessionId)}
      role="row"
      tabIndex={0}
      aria-label={`View session ${session.sessionId}, ${session.category || 'not classified'}, confidence ${formatConfidence(session.confidence)}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSessionClick(session.sessionId);
        }
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        backgroundColor: session.status === 'manual_review' ? '#fff9e6' : '#fff',
        borderBottom: '1px solid #dee2e6',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        outline: isFocused ? '3px solid #007bff' : 'none',
        outlineOffset: isFocused ? '-3px' : '0'
      }}
      onMouseEnter={(e) => {
        if (!isFocused) {
          e.currentTarget.style.backgroundColor = session.status === 'manual_review' ? '#fff3cd' : '#f8f9fa';
        }
      }}
      onMouseLeave={(e) => {
        if (!isFocused) {
          e.currentTarget.style.backgroundColor = session.status === 'manual_review' ? '#fff9e6' : '#fff';
        }
      }}
    >
      <td
        style={{
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#007bff'
        }}
        aria-label={`Session ID: ${session.sessionId}`}
      >
        {session.sessionId.substring(0, 8)}...
      </td>
      <td
        style={{ padding: '12px', whiteSpace: 'nowrap' }}
        aria-label={`Created: ${formatDate(session.createdAt)}`}
      >
        {formatDate(session.createdAt)}
      </td>
      <td
        style={{ padding: '12px' }}
        aria-label={`Subject: ${session.subject || 'Not specified'}`}
      >
        {session.subject || <span style={{ color: '#999' }}>—</span>}
      </td>
      <td
        style={{ padding: '12px', fontWeight: 'bold' }}
        aria-label={`Category: ${session.category || 'Not classified'}`}
      >
        {session.category || <span style={{ color: '#999' }}>—</span>}
      </td>
      <td
        style={{
          padding: '12px',
          fontWeight: 'bold',
          color: session.confidence && session.confidence < 0.6 ? '#dc3545' : '#28a745'
        }}
        aria-label={`Confidence: ${formatConfidence(session.confidence)}`}
      >
        {formatConfidence(session.confidence)}
      </td>
      <td style={{ padding: '12px' }} aria-label={`Status: ${getStatusLabel(session.status)}`}>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            backgroundColor: getStatusColor(session.status),
            color: '#fff',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}
        >
          {getStatusLabel(session.status)}
        </span>
      </td>
      <td
        style={{ padding: '12px', fontSize: '13px' }}
        aria-label={`Model: ${session.modelUsed}`}
      >
        {session.modelUsed}
      </td>
      <td style={{ padding: '12px' }}>
        {renderIndicators(session)}
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.session.sessionId === nextProps.session.sessionId &&
    prevProps.session.status === nextProps.session.status &&
    prevProps.session.confidence === nextProps.session.confidence &&
    prevProps.session.requiresAttention === nextProps.session.requiresAttention &&
    prevProps.session.triggeredRulesCount === nextProps.session.triggeredRulesCount
  );
});

SessionRow.displayName = 'SessionRow';

const SessionListTable: React.FC<SessionListTableProps> = ({
  sessions,
  loading,
  onSessionClick,
  pagination,
  onPageChange
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const announcementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Announce session count changes to screen readers
  React.useEffect(() => {
    if (announcementRef.current && !loading) {
      const message = sessions.length === 0
        ? 'No sessions found matching your filters'
        : `Showing ${sessions.length} session${sessions.length === 1 ? '' : 's'} on page ${pagination.page} of ${pagination.totalPages}. Total ${pagination.total} sessions.`;
      announcementRef.current.textContent = message;
    }
  }, [sessions.length, pagination.page, pagination.totalPages, pagination.total, loading]);

  // Announce page changes
  const handlePageChangeWithAnnouncement = (newPage: number) => {
    onPageChange(newPage);
    if (announcementRef.current) {
      announcementRef.current.textContent = `Loading page ${newPage} of ${pagination.totalPages}`;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatConfidence = (confidence?: number): string => {
    if (confidence === undefined) return 'N/A';
    return `${Math.round(confidence * 100)}%`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'manual_review':
        return '#ffc107';
      case 'pending_admin_review':
        return '#fd7e14'; // Orange for pending review
      case 'active':
        return '#007bff';
      default:
        return '#6c757d';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'manual_review':
        return 'Manual Review';
      case 'pending_admin_review':
        return 'Pending Admin Review';
      case 'active':
        return 'Active';
      default:
        return status;
    }
  };

  const renderIndicators = (session: SessionListItem) => {
    const indicators = [];

    // Warning icon for unconfirmed feedback
    if (session.feedbackConfirmed === false) {
      indicators.push(
        <span
          key="unconfirmed"
          title="Unconfirmed feedback"
          aria-label="Unconfirmed feedback"
          style={{
            fontSize: '18px',
            marginRight: '6px',
            cursor: 'help'
          }}
        >
          ⚠️
        </span>
      );
    }

    // Thumbs down for negative rating
    if (session.userRating === 'down') {
      indicators.push(
        <span
          key="negative"
          title="Negative user rating"
          aria-label="Negative user rating"
          style={{
            fontSize: '18px',
            marginRight: '6px',
            cursor: 'help'
          }}
        >
          👎
        </span>
      );
    }

    // Magnifying glass for manual review
    if (session.status === 'manual_review') {
      indicators.push(
        <span
          key="review"
          title="Manual review required"
          aria-label="Manual review required"
          style={{
            fontSize: '18px',
            marginRight: '6px',
            cursor: 'help'
          }}
        >
          🔍
        </span>
      );
    }

    // Low confidence indicator
    if (session.confidence !== undefined && session.confidence < 0.6) {
      indicators.push(
        <span
          key="low-confidence"
          title="Low confidence classification"
          aria-label="Low confidence classification"
          style={{
            fontSize: '18px',
            marginRight: '6px',
            cursor: 'help'
          }}
        >
          ⚡
        </span>
      );
    }

    // Triggered rules badge
    if (session.triggeredRulesCount && session.triggeredRulesCount > 0) {
      indicators.push(
        <span
          key="rules"
          title={`${session.triggeredRulesCount} rule(s) triggered`}
          aria-label={`${session.triggeredRulesCount} rule(s) triggered`}
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            backgroundColor: '#6f42c1',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginRight: '6px',
            cursor: 'help'
          }}
        >
          🎯 {session.triggeredRulesCount}
        </span>
      );
    }

    // Override indicator
    if (session.hasDecisionMatrix) {
      indicators.push(
        <span
          key="override"
          title="Decision matrix applied"
          aria-label="Decision matrix applied"
          style={{
            fontSize: '18px',
            marginRight: '6px',
            cursor: 'help'
          }}
        >
          🔄
        </span>
      );
    }

    return indicators.length > 0 ? (
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        {indicators}
      </div>
    ) : (
      <span style={{ color: '#999' }}>—</span>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
        role="status"
        aria-live="polite"
        aria-label="Loading sessions"
      >
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <div
            style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
            aria-hidden="true"
          />
          <p style={{ marginTop: '15px', fontSize: '14px' }}>Loading sessions...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '40px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>No Sessions Found</h3>
        <p style={{ color: '#666', margin: '0 0 20px 0' }}>
          No sessions match your current filters.
        </p>
        <p style={{ color: '#999', fontSize: '14px' }}>
          Try adjusting your filters or clearing them to see more results.
        </p>
      </div>
    );
  }

  // Mobile card layout
  if (isMobile) {
    return (
      <div>
        {/* Screen reader announcements */}
        <div
          ref={announcementRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: 'absolute',
            left: '-10000px',
            width: '1px',
            height: '1px',
            overflow: 'hidden'
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} role="list" aria-label="Session list">
          {sessions.map((session) => (
            <div
              key={session.sessionId}
              onClick={() => onSessionClick(session.sessionId)}
              role="listitem"
              tabIndex={0}
              aria-label={`View session ${session.sessionId}, ${session.category || 'not classified'}, confidence ${formatConfidence(session.confidence)}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSessionClick(session.sessionId);
                }
              }}
              style={{
                backgroundColor: session.status === 'manual_review' ? '#fff9e6' : '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                minHeight: '44px',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '3px solid #007bff';
                e.currentTarget.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  Session ID
                </div>
                <div style={{ fontSize: '14px', fontFamily: 'monospace', color: '#333' }}>
                  {session.sessionId.substring(0, 8)}...
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                    Created
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    {formatDate(session.createdAt)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                    Status
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      backgroundColor: getStatusColor(session.status),
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    {getStatusLabel(session.status)}
                  </div>
                </div>
              </div>

              {session.subject && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                    Subject
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    {session.subject}
                  </div>
                </div>
              )}

              {session.category && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                      Category
                    </div>
                    <div style={{ fontSize: '14px', color: '#333', fontWeight: 'bold' }}>
                      {session.category}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                      Confidence
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: session.confidence && session.confidence < 0.6 ? '#dc3545' : '#28a745',
                        fontWeight: 'bold'
                      }}
                    >
                      {formatConfidence(session.confidence)}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  Model
                </div>
                <div style={{ fontSize: '14px', color: '#333' }}>
                  {session.modelUsed}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  Indicators
                </div>
                {renderIndicators(session)}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Pagination */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '14px', color: '#666' }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => handlePageChangeWithAnnouncement(pagination.page - 1)}
                disabled={pagination.page === 1}
                aria-label="Previous page"
                aria-disabled={pagination.page === 1}
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  padding: '10px 16px',
                  backgroundColor: pagination.page === 1 ? '#e9ecef' : '#007bff',
                  color: pagination.page === 1 ? '#6c757d' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  if (pagination.page !== 1) {
                    e.currentTarget.style.outline = '3px solid #0056b3';
                    e.currentTarget.style.outlineOffset = '2px';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                ← Prev
              </button>
              <button
                onClick={() => handlePageChangeWithAnnouncement(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                aria-label="Next page"
                aria-disabled={pagination.page === pagination.totalPages}
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  padding: '10px 16px',
                  backgroundColor: pagination.page === pagination.totalPages ? '#e9ecef' : '#007bff',
                  color: pagination.page === pagination.totalPages ? '#6c757d' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  if (pagination.page !== pagination.totalPages) {
                    e.currentTarget.style.outline = '3px solid #0056b3';
                    e.currentTarget.style.outlineOffset = '2px';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop table layout
  return (
    <div>
      {/* Screen reader announcements */}
      <div
        ref={announcementRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      />

      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            role="table"
            aria-label="Sessions table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }} role="row">
                <th
                  scope="col"
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#495057',
                    whiteSpace: 'nowrap',
                    fontSize: '14px'
                  }}
                >
                  Session ID
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#495057',
                    whiteSpace: 'nowrap',
                    fontSize: '14px'
                  }}
                >
                  Created Date
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#495057',
                    whiteSpace: 'nowrap',
                    fontSize: '14px'
                  }}
                >
                  Subject
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#495057',
                    whiteSpace: 'nowrap',
                    fontSize: '14px'
                  }}
                >
                  Category
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#495057',
                    whiteSpace: 'nowrap',
                    fontSize: '14px'
                  }}
                >
                  Confidence
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#495057',
                    whiteSpace: 'nowrap',
                    fontSize: '14px'
                  }}
                >
                  Status
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#495057',
                    whiteSpace: 'nowrap',
                    fontSize: '14px'
                  }}
                >
                  Model
                </th>
                <th
                  scope="col"
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#495057',
                    whiteSpace: 'nowrap',
                    fontSize: '14px'
                  }}
                >
                  Indicators
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <SessionRow
                  key={session.sessionId}
                  session={session}
                  onSessionClick={onSessionClick}
                  formatDate={formatDate}
                  formatConfidence={formatConfidence}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  renderIndicators={renderIndicators}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desktop Pagination */}
      {pagination.totalPages > 1 && (
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ fontSize: '14px', color: '#666' }}>
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} sessions
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => handlePageChangeWithAnnouncement(1)}
              disabled={pagination.page === 1}
              aria-label="First page"
              aria-disabled={pagination.page === 1}
              style={{
                padding: '8px 12px',
                backgroundColor: pagination.page === 1 ? '#e9ecef' : '#fff',
                color: pagination.page === 1 ? '#6c757d' : '#007bff',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                minWidth: '44px',
                minHeight: '44px',
                outline: 'none'
              }}
              onFocus={(e) => {
                if (pagination.page !== 1) {
                  e.currentTarget.style.outline = '3px solid #007bff';
                  e.currentTarget.style.outlineOffset = '2px';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
            >
              ««
            </button>
            <button
              onClick={() => handlePageChangeWithAnnouncement(pagination.page - 1)}
              disabled={pagination.page === 1}
              aria-label="Previous page"
              aria-disabled={pagination.page === 1}
              style={{
                padding: '8px 12px',
                backgroundColor: pagination.page === 1 ? '#e9ecef' : '#fff',
                color: pagination.page === 1 ? '#6c757d' : '#007bff',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                minWidth: '44px',
                minHeight: '44px',
                outline: 'none'
              }}
              onFocus={(e) => {
                if (pagination.page !== 1) {
                  e.currentTarget.style.outline = '3px solid #007bff';
                  e.currentTarget.style.outlineOffset = '2px';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
            >
              ‹ Prev
            </button>
            <span style={{ padding: '0 12px', fontSize: '14px', color: '#495057' }} aria-live="polite" aria-atomic="true">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChangeWithAnnouncement(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              aria-label="Next page"
              aria-disabled={pagination.page === pagination.totalPages}
              style={{
                padding: '8px 12px',
                backgroundColor: pagination.page === pagination.totalPages ? '#e9ecef' : '#fff',
                color: pagination.page === pagination.totalPages ? '#6c757d' : '#007bff',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                minWidth: '44px',
                minHeight: '44px',
                outline: 'none'
              }}
              onFocus={(e) => {
                if (pagination.page !== pagination.totalPages) {
                  e.currentTarget.style.outline = '3px solid #007bff';
                  e.currentTarget.style.outlineOffset = '2px';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
            >
              Next ›
            </button>
            <button
              onClick={() => handlePageChangeWithAnnouncement(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
              aria-label="Last page"
              aria-disabled={pagination.page === pagination.totalPages}
              style={{
                padding: '8px 12px',
                backgroundColor: pagination.page === pagination.totalPages ? '#e9ecef' : '#fff',
                color: pagination.page === pagination.totalPages ? '#6c757d' : '#007bff',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                minWidth: '44px',
                minHeight: '44px',
                outline: 'none'
              }}
              onFocus={(e) => {
                if (pagination.page !== pagination.totalPages) {
                  e.currentTarget.style.outline = '3px solid #007bff';
                  e.currentTarget.style.outlineOffset = '2px';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
            >
              »»
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          fontSize: '13px'
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#495057' }}>
          Indicator Legend:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span>
            <span style={{ color: '#666' }}>Unconfirmed feedback</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>👎</span>
            <span style={{ color: '#666' }}>Negative rating</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔍</span>
            <span style={{ color: '#666' }}>Manual review</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚡</span>
            <span style={{ color: '#666' }}>Low confidence (&lt;60%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              padding: '2px 6px',
              backgroundColor: '#6f42c1',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '11px'
            }}>🎯 N</span>
            <span style={{ color: '#666' }}>Rules triggered</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔄</span>
            <span style={{ color: '#666' }}>Decision matrix applied</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionListTable;
