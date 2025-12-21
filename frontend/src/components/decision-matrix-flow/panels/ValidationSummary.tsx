import React from 'react';
import { ValidationError } from '../types/flow-types';
import { groupErrorsBySeverity } from '../utils/nodeValidation';

interface ValidationSummaryProps {
  validationErrors: ValidationError[];
  onNodeClick?: (nodeId: string) => void;
}

/**
 * ValidationSummary component displays a summary of all validation errors
 * at the bottom of the flow editor
 */
const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  validationErrors,
  onNodeClick
}) => {
  if (validationErrors.length === 0) {
    return null;
  }

  const { errors, warnings } = groupErrorsBySeverity(validationErrors);
  const hasErrors = errors.length > 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: hasErrors ? '#fef2f2' : '#fffbeb',
        borderTop: `2px solid ${hasErrors ? '#fecaca' : '#fde68a'}`,
        padding: '12px 20px',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
        zIndex: 100,
        maxHeight: '200px',
        overflowY: 'auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Icon */}
        <div style={{ fontSize: '20px', marginTop: '2px' }}>
          {hasErrors ? '⚠️' : '⚡'}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: hasErrors ? '#991b1b' : '#92400e',
            marginBottom: '8px'
          }}>
            {hasErrors ? (
              <>Validation Errors ({errors.length})</>
            ) : (
              <>Warnings ({warnings.length})</>
            )}
            {hasErrors && (
              <span style={{ fontWeight: 400, marginLeft: '8px' }}>
                Fix these errors before saving
              </span>
            )}
          </div>

          {/* Error List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {errors.map((error, index) => (
              <div
                key={`error-${index}`}
                style={{
                  fontSize: '13px',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ 
                  fontWeight: 500,
                  color: '#dc2626',
                  fontSize: '12px'
                }}>
                  ERROR:
                </span>
                <span>{error.message}</span>
                {onNodeClick && (
                  <button
                    onClick={() => onNodeClick(error.nodeId)}
                    style={{
                      marginLeft: 'auto',
                      padding: '2px 8px',
                      fontSize: '11px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    View Node
                  </button>
                )}
              </div>
            ))}

            {warnings.map((warning, index) => (
              <div
                key={`warning-${index}`}
                style={{
                  fontSize: '13px',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ 
                  fontWeight: 500,
                  color: '#d97706',
                  fontSize: '12px'
                }}>
                  WARNING:
                </span>
                <span>{warning.message}</span>
                {onNodeClick && (
                  <button
                    onClick={() => onNodeClick(warning.nodeId)}
                    style={{
                      marginLeft: 'auto',
                      padding: '2px 8px',
                      fontSize: '11px',
                      backgroundColor: '#d97706',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    View Node
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px',
          minWidth: '120px',
          padding: '8px 12px',
          backgroundColor: 'white',
          borderRadius: '6px',
          border: `1px solid ${hasErrors ? '#fecaca' : '#fde68a'}`
        }}>
          {errors.length > 0 && (
            <div style={{ 
              fontSize: '12px', 
              color: '#991b1b',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Errors:</span>
              <span style={{ fontWeight: 600 }}>{errors.length}</span>
            </div>
          )}
          {warnings.length > 0 && (
            <div style={{ 
              fontSize: '12px', 
              color: '#92400e',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Warnings:</span>
              <span style={{ fontWeight: 600 }}>{warnings.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationSummary;
