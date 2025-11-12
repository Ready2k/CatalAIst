import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { 
  AnalyticsMetrics, 
  SessionFilters as SessionFiltersType, 
  SessionListItem, 
  FilterOptions,
  FilteredMetrics
} from '../../../shared/dist';
import { apiService } from '../services/api';
import SessionFilters from './SessionFilters';
import FilteredMetricsSummary from './FilteredMetricsSummary';
import SessionListTable from './SessionListTable';
import SessionDetailModal from './SessionDetailModal';

interface AnalyticsDashboardProps {
  onLoadAnalytics: () => Promise<AnalyticsMetrics>;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onLoadAnalytics }) => {
  // Existing aggregate metrics state
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New session list state
  const [filters, setFilters] = useState<SessionFiltersType>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    subjects: [],
    models: [],
    categories: [],
    statuses: []
  });
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [filteredMetrics, setFilteredMetrics] = useState<FilteredMetrics | null>(null);
  const [filteredMetricsLoading, setFilteredMetricsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await onLoadAnalytics();
      // Ensure agreementRateByCategory exists
      if (data && !data.agreementRateByCategory) {
        data.agreementRateByCategory = {};
      }
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, [onLoadAnalytics]);

  // Load filter options on mount (memoized)
  const loadFilterOptions = useCallback(async () => {
    try {
      const options = await apiService.getFilterOptions();
      setFilterOptions(options);
    } catch (err: any) {
      console.error('Failed to load filter options:', err);
      showToast('Failed to load filter options', 'error');
    }
  }, []);

  // Memoize filter options to prevent unnecessary re-renders
  // We use string keys instead of the object itself to avoid unnecessary re-renders
  const subjectsKey = filterOptions.subjects.join(',');
  const modelsKey = filterOptions.models.join(',');
  const categoriesKey = filterOptions.categories.join(',');
  const statusesKey = filterOptions.statuses.join(',');
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedFilterOptions = useMemo(() => filterOptions, [
    subjectsKey,
    modelsKey,
    categoriesKey,
    statusesKey
  ]);

  // Load filtered metrics
  const loadFilteredMetrics = useCallback(async (currentFilters: SessionFiltersType) => {
    setFilteredMetricsLoading(true);
    try {
      // Get all sessions matching filters (without pagination) to calculate metrics
      const response = await apiService.getSessionsList(
        currentFilters,
        1,
        10000 // Large limit to get all sessions for metrics
      );
      
      // Calculate metrics from sessions
      const totalCount = response.total;
      const sessionsWithConfidence = response.sessions.filter((s: SessionListItem) => s.confidence !== undefined);
      const averageConfidence = sessionsWithConfidence.length > 0
        ? sessionsWithConfidence.reduce((sum: number, s: SessionListItem) => sum + (s.confidence || 0), 0) / sessionsWithConfidence.length
        : 0;
      
      const sessionsWithFeedback = response.sessions.filter((s: SessionListItem) => s.feedbackConfirmed !== undefined);
      const confirmedFeedback = sessionsWithFeedback.filter((s: SessionListItem) => s.feedbackConfirmed === true);
      const agreementRate = sessionsWithFeedback.length > 0
        ? confirmedFeedback.length / sessionsWithFeedback.length
        : 0;
      
      const categoryDistribution: { [category: string]: number } = {};
      response.sessions.forEach((s: SessionListItem) => {
        if (s.category) {
          categoryDistribution[s.category] = (categoryDistribution[s.category] || 0) + 1;
        }
      });

      setFilteredMetrics({
        totalCount,
        averageConfidence,
        agreementRate,
        categoryDistribution
      });
    } catch (err: any) {
      console.error('Failed to load filtered metrics:', err);
    } finally {
      setFilteredMetricsLoading(false);
    }
  }, []);

  // Load session list with debouncing
  const loadSessions = useCallback(async (
    currentFilters: SessionFiltersType,
    currentPage: number,
    immediate: boolean = false
  ) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const fetchSessions = async () => {
      setSessionsLoading(true);
      setSessionsError('');
      try {
        const response = await apiService.getSessionsList(
          currentFilters,
          currentPage,
          pagination.limit
        );
        setSessions(response.sessions);
        setPagination({
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages
        });

        // Also load filtered metrics
        loadFilteredMetrics(currentFilters);
      } catch (err: any) {
        setSessionsError(err.message || 'Failed to load sessions');
        console.error('Sessions error:', err);
        showToast('Failed to load sessions', 'error');
      } finally {
        setSessionsLoading(false);
      }
    };

    if (immediate) {
      fetchSessions();
    } else {
      // Debounce for 200ms
      debounceTimerRef.current = setTimeout(fetchSessions, 200);
    }
  }, [pagination.limit, loadFilteredMetrics]);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: SessionFiltersType) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    loadSessions(newFilters, 1, false); // Debounced
  }, [loadSessions]);

  // Handle page changes
  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    loadSessions(filters, newPage, true); // Immediate
  }, [filters, loadSessions]);

  // Handle session click
  const handleSessionClick = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setSelectedSessionId(null);
  }, []);

  useEffect(() => {
    loadMetrics();
    loadFilterOptions();
    loadSessions({}, 1, true); // Load initial sessions immediately
  }, [loadMetrics, loadFilterOptions, loadSessions]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '20px auto',
        padding: '20px',
        textAlign: 'center'
      }}>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '20px auto',
        padding: '20px'
      }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          {error}
        </div>
        <button
          onClick={loadMetrics}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '20px auto',
        padding: '20px',
        textAlign: 'center'
      }}>
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '20px auto',
      padding: '20px'
    }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '15px 20px',
          backgroundColor: toast.type === 'error' ? '#f8d7da' : '#d4edda',
          color: toast.type === 'error' ? '#721c24' : '#155724',
          border: `1px solid ${toast.type === 'error' ? '#f5c6cb' : '#c3e6cb'}`,
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 10000,
          maxWidth: '400px'
        }}>
          {toast.message}
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>Analytics Dashboard</h2>
        <button
          onClick={loadMetrics}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Alert Banner */}
      {metrics && metrics.alertTriggered && (
        <div style={{
          padding: '15px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#856404'
        }}>
          <strong>⚠️ Alert:</strong> Agreement rate has fallen below 80%. Review and improvement recommended.
        </div>
      )}

      {/* Key Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Overall Agreement Rate */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            Overall Agreement Rate
          </div>
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: metrics.overallAgreementRate >= 0.8 ? '#28a745' : '#dc3545'
          }}>
            {formatPercentage(metrics.overallAgreementRate)}
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            overflow: 'hidden',
            marginTop: '10px'
          }}>
            <div style={{
              width: `${metrics.overallAgreementRate * 100}%`,
              height: '100%',
              backgroundColor: metrics.overallAgreementRate >= 0.8 ? '#28a745' : '#dc3545'
            }} />
          </div>
        </div>

        {/* User Satisfaction Rate */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            User Satisfaction Rate
          </div>
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#007bff'
          }}>
            {formatPercentage(metrics.userSatisfactionRate)}
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            overflow: 'hidden',
            marginTop: '10px'
          }}>
            <div style={{
              width: `${metrics.userSatisfactionRate * 100}%`,
              height: '100%',
              backgroundColor: '#007bff'
            }} />
          </div>
        </div>

        {/* Total Sessions */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            Total Sessions
          </div>
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#6c757d'
          }}>
            {metrics.totalSessions}
          </div>
        </div>

        {/* Average Classification Time */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            Avg Classification Time
          </div>
          <div style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#17a2b8'
          }}>
            {formatTime(metrics.averageClassificationTimeMs)}
          </div>
        </div>
      </div>

      {/* Agreement Rate by Category */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
          Agreement Rate by Category
        </h3>

        {!metrics.agreementRateByCategory || Object.keys(metrics.agreementRateByCategory).length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
            No category data available yet. Process some classifications to see metrics.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {Object.entries(metrics.agreementRateByCategory).map(([category, rate]) => (
            <div key={category}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '5px'
              }}>
                <span style={{ fontWeight: 'bold' }}>{category}</span>
                <span style={{
                  color: rate >= 0.8 ? '#28a745' : '#dc3545',
                  fontWeight: 'bold'
                }}>
                  {formatPercentage(rate)}
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '24px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${rate * 100}%`,
                  height: '100%',
                  backgroundColor: rate >= 0.8 ? '#28a745' : '#dc3545',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  transition: 'width 0.5s ease'
                }}>
                  {rate > 0.15 && formatPercentage(rate)}
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div style={{
        marginTop: '20px',
        fontSize: '12px',
        color: '#999',
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        Last updated: {new Date(metrics.calculatedAt).toLocaleString()}
      </div>

      {/* Divider */}
      <div style={{
        borderTop: '2px solid #e9ecef',
        margin: '40px 0',
        paddingTop: '40px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Session Explorer</h3>
      </div>

      {/* Session Filters */}
      <SessionFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        filterOptions={memoizedFilterOptions}
      />

      {/* Filtered Metrics Summary */}
      {filteredMetrics && (
        <FilteredMetricsSummary
          metrics={filteredMetrics}
          loading={filteredMetricsLoading}
        />
      )}

      {/* Sessions Error */}
      {sessionsError && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginTop: '20px',
          marginBottom: '20px'
        }}>
          {sessionsError}
        </div>
      )}

      {/* Session List Table */}
      <SessionListTable
        sessions={sessions}
        loading={sessionsLoading}
        onSessionClick={handleSessionClick}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* Session Detail Modal */}
      {selectedSessionId && (
        <SessionDetailModal
          sessionId={selectedSessionId}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default AnalyticsDashboard;
