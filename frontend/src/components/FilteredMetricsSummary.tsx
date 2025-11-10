import React, { useState, useEffect } from 'react';
import { FilteredMetrics } from '../../../shared/types';

interface FilteredMetricsSummaryProps {
  metrics: FilteredMetrics;
  loading: boolean;
}

const FilteredMetricsSummary: React.FC<FilteredMetricsSummaryProps> = ({
  metrics,
  loading
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Check screen size for responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: isMobile && isCollapsed ? '12px 20px' : '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isMobile && isCollapsed ? '0' : '20px'
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '18px',
    color: '#333'
  };

  const collapseButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#007bff',
    border: '1px solid #007bff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    minWidth: '44px',
    minHeight: '44px',
    outline: 'none'
  };

  const metricsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  };

  const metricCardStyle: React.CSSProperties = {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e9ecef'
  };

  const metricLabelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#666',
    marginBottom: '6px',
    fontWeight: '500'
  };

  const metricValueStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333'
  };

  // Loading state
  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          <div
            style={{
              display: 'inline-block',
              width: '30px',
              height: '30px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
            aria-label="Loading filtered metrics"
          />
          <p style={{ marginTop: '10px', fontSize: '14px' }}>Calculating metrics...</p>
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

  // Collapsed view on mobile
  if (isMobile && isCollapsed) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>
            Filtered Results: {metrics.totalCount} sessions
          </h3>
          <button
            onClick={() => setIsCollapsed(false)}
            style={collapseButtonStyle}
            aria-label="Expand filtered metrics summary"
            aria-expanded="false"
            onFocus={(e) => {
              e.currentTarget.style.outline = '3px solid #007bff';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            ▼ Show
          </button>
        </div>
      </div>
    );
  }

  // Get category entries sorted by count
  const categoryEntries = Object.entries(metrics.categoryDistribution)
    .sort(([, a], [, b]) => b - a);

  const totalCategorySessions = categoryEntries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div style={containerStyle} role="region" aria-label="Filtered metrics summary">
      <div style={headerStyle}>
        <h3 style={titleStyle} id="metrics-heading">Filtered Metrics Summary</h3>
        {isMobile && (
          <button
            onClick={() => setIsCollapsed(true)}
            style={collapseButtonStyle}
            aria-label="Collapse filtered metrics summary"
            aria-expanded="true"
            onFocus={(e) => {
              e.currentTarget.style.outline = '3px solid #007bff';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            ▲ Hide
          </button>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div style={metricsGridStyle}>
        {/* Total Count */}
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>Total Sessions</div>
          <div
            style={{
              ...metricValueStyle,
              color: '#007bff'
            }}
            aria-label={`Total filtered sessions: ${metrics.totalCount}`}
          >
            {metrics.totalCount}
          </div>
        </div>

        {/* Average Confidence */}
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>Avg Confidence</div>
          <div
            style={{
              ...metricValueStyle,
              color: metrics.averageConfidence >= 0.7 ? '#28a745' : metrics.averageConfidence >= 0.5 ? '#ffc107' : '#dc3545'
            }}
            aria-label={`Average confidence: ${formatPercentage(metrics.averageConfidence)}`}
          >
            {formatPercentage(metrics.averageConfidence)}
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#e9ecef',
            borderRadius: '3px',
            overflow: 'hidden',
            marginTop: '8px'
          }}>
            <div style={{
              width: `${metrics.averageConfidence * 100}%`,
              height: '100%',
              backgroundColor: metrics.averageConfidence >= 0.7 ? '#28a745' : metrics.averageConfidence >= 0.5 ? '#ffc107' : '#dc3545',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* Agreement Rate */}
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>Agreement Rate</div>
          <div
            style={{
              ...metricValueStyle,
              color: metrics.agreementRate >= 0.8 ? '#28a745' : '#dc3545'
            }}
            aria-label={`Agreement rate: ${formatPercentage(metrics.agreementRate)}`}
          >
            {formatPercentage(metrics.agreementRate)}
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#e9ecef',
            borderRadius: '3px',
            overflow: 'hidden',
            marginTop: '8px'
          }}>
            <div style={{
              width: `${metrics.agreementRate * 100}%`,
              height: '100%',
              backgroundColor: metrics.agreementRate >= 0.8 ? '#28a745' : '#dc3545',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      {categoryEntries.length > 0 && (
        <div>
          <h4 style={{
            margin: '0 0 15px 0',
            fontSize: '16px',
            color: '#495057',
            fontWeight: '600'
          }}>
            Category Distribution
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categoryEntries.map(([category, count]) => {
              const percentage = totalCategorySessions > 0 ? (count / totalCategorySessions) * 100 : 0;
              return (
                <div key={category}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '14px'
                  }}>
                    <span style={{ fontWeight: '600', color: '#495057' }}>
                      {category}
                    </span>
                    <span style={{ color: '#6c757d', fontWeight: '500' }}>
                      {count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '20px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: '#007bff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: percentage > 15 ? 'center' : 'flex-end',
                        paddingRight: percentage > 15 ? '0' : '4px',
                        color: percentage > 15 ? '#fff' : '#007bff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        transition: 'width 0.5s ease'
                      }}
                      aria-label={`${category}: ${count} sessions, ${Math.round(percentage)}%`}
                    >
                      {percentage > 15 && `${Math.round(percentage)}%`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state for category distribution */}
      {categoryEntries.length === 0 && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          No category data available for filtered sessions
        </div>
      )}

      {/* Info note */}
      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#004085'
      }}>
        <strong>ℹ️ Note:</strong> Metrics update within 500ms when filters change
      </div>
    </div>
  );
};

export default FilteredMetricsSummary;
