import React, { useEffect, useState } from 'react';

interface AuditLog {
  sessionId: string;
  timestamp: string;
  eventType: string;
  userId: string;
  data: any;
  piiScrubbed: boolean;
  metadata?: any;
}

interface AuditTrailProps {
  onLoadAuditLogs: (date?: string) => Promise<AuditLog[]>;
}

const AuditTrail: React.FC<AuditTrailProps> = ({ onLoadAuditLogs }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterSessionId, setFilterSessionId] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, [selectedDate]);

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await onLoadAuditLogs(selectedDate);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterEventType !== 'all' && log.eventType !== filterEventType) {
      return false;
    }
    if (filterSessionId && !log.sessionId.includes(filterSessionId)) {
      return false;
    }
    return true;
  });

  // Group logs by session
  const sessionGroups = filteredLogs.reduce((groups, log) => {
    const sessionId = log.sessionId;
    if (!groups[sessionId]) {
      groups[sessionId] = [];
    }
    groups[sessionId].push(log);
    return groups;
  }, {} as Record<string, AuditLog[]>);

  // Sort sessions by most recent activity
  const sortedSessions = Object.entries(sessionGroups).sort((a, b) => {
    const aLatest = Math.max(...a[1].map(l => new Date(l.timestamp).getTime()));
    const bLatest = Math.max(...b[1].map(l => new Date(l.timestamp).getTime()));
    return bLatest - aLatest;
  });

  const eventTypes = ['all', ...Array.from(new Set(logs.map(l => l.eventType)))];

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'input': return '#007bff';
      case 'classification': return '#28a745';
      case 'clarification': return '#ffc107';
      case 'feedback': return '#17a2b8';
      case 'rating': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'input': return '📝';
      case 'classification': return '🎯';
      case 'clarification': return '❓';
      case 'feedback': return '✅';
      case 'rating': return '⭐';
      default: return '📋';
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px', textAlign: 'center' }}>
        <p>Loading audit logs...</p>
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
        <h2 style={{ margin: 0 }}>Audit Trail</h2>
        <button
          onClick={loadLogs}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
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

      {/* Filters */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Filters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
              Event Type
            </label>
            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Events' : type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
              Session ID
            </label>
            <input
              type="text"
              value={filterSessionId}
              onChange={(e) => setFilterSessionId(e.target.value)}
              placeholder="Filter by session..."
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <strong>Summary:</strong> Showing {sortedSessions.length} sessions with {filteredLogs.length} events (of {logs.length} total)
      </div>

      {/* Sessions */}
      {sortedSessions.length === 0 ? (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
            No audit logs found for the selected filters.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {sortedSessions.map(([sessionId, sessionLogs]) => {
            const firstLog = sessionLogs[0];
            const lastLog = sessionLogs[sessionLogs.length - 1];
            const classification = sessionLogs.find(l => l.eventType === 'classification');
            const hasPII = sessionLogs.some(l => l.piiScrubbed);
            
            return (
              <div key={sessionId} style={{
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                {/* Session Header */}
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px 20px',
                  borderBottom: '1px solid #ddd'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                        Session: {sessionId.substring(0, 8)}...
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        <span style={{ marginRight: '15px' }}>
                          👤 User: {firstLog.userId}
                        </span>
                        <span style={{ marginRight: '15px' }}>
                          📅 Started: {new Date(firstLog.timestamp).toLocaleString()}
                        </span>
                        <span>
                          🔢 {sessionLogs.length} events
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {classification && (
                        <div style={{
                          padding: '4px 12px',
                          backgroundColor: '#28a745',
                          color: '#fff',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          marginBottom: '5px'
                        }}>
                          {classification.data.classification?.category || 'Classified'}
                        </div>
                      )}
                      {hasPII && (
                        <div style={{
                          padding: '2px 8px',
                          backgroundColor: '#ffc107',
                          color: '#000',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          🔒 PII SCRUBBED
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Session Events */}
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sessionLogs.map((log, idx) => (
                      <div key={idx} style={{
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        borderLeft: `4px solid ${getEventColor(log.eventType)}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div>
                            <span style={{ fontSize: '16px', marginRight: '8px' }}>
                              {getEventIcon(log.eventType)}
                            </span>
                            <span style={{
                              padding: '2px 8px',
                              backgroundColor: getEventColor(log.eventType),
                              color: '#fff',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              marginRight: '10px'
                            }}>
                              {log.eventType.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        {/* Event Summary */}
                        <div style={{ fontSize: '13px', marginBottom: '8px', color: '#333' }}>
                          {log.eventType === 'input' && log.data.processDescription && (
                            <div>
                              <strong>Input:</strong> {log.data.processDescription.substring(0, 100)}
                              {log.data.processDescription.length > 100 && '...'}
                            </div>
                          )}
                          {log.eventType === 'classification' && log.data.classification && (
                            <div>
                              <strong>Category:</strong> {log.data.classification.category} 
                              <span style={{ marginLeft: '10px', color: '#666' }}>
                                (Confidence: {Math.round(log.data.classification.confidence * 100)}%)
                              </span>
                            </div>
                          )}
                          {log.eventType === 'clarification' && (
                            <div>
                              <strong>Clarification:</strong> {log.data.questions?.length || 0} questions asked
                            </div>
                          )}
                          {log.eventType === 'feedback' && (
                            <div>
                              <strong>Feedback:</strong> {log.data.confirmed ? '✅ Confirmed' : '❌ Corrected'}
                              {log.data.correctedCategory && ` → ${log.data.correctedCategory}`}
                            </div>
                          )}
                          {log.eventType === 'rating' && (
                            <div>
                              <strong>Rating:</strong> {log.data.rating === 'up' ? '👍 Positive' : '👎 Negative'}
                            </div>
                          )}
                        </div>

                        {/* Expandable Details */}
                        <details style={{ fontSize: '12px' }}>
                          <summary style={{ cursor: 'pointer', color: '#007bff', fontWeight: 'bold' }}>
                            View Full Details
                          </summary>
                          <pre style={{
                            margin: '10px 0 0 0',
                            padding: '10px',
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            overflow: 'auto',
                            maxHeight: '300px'
                          }}>
                            {JSON.stringify({ data: log.data, metadata: log.metadata }, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuditTrail;
