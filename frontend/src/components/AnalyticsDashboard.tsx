import React, { useEffect, useState, useCallback } from 'react';
import { AnalyticsMetrics } from '../../../shared/types';

interface AnalyticsDashboardProps {
  onLoadAnalytics: () => Promise<AnalyticsMetrics>;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onLoadAnalytics }) => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

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
      {metrics.alertTriggered && (
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
        textAlign: 'center'
      }}>
        Last updated: {new Date(metrics.calculatedAt).toLocaleString()}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
