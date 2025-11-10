import React, { useEffect, useState, useCallback } from 'react';
import { DecisionMatrix } from '../../../shared/types';
import DecisionMatrixFlowEditor from './DecisionMatrixFlowEditor';

interface DecisionMatrixAdminProps {
  onLoadMatrix: () => Promise<DecisionMatrix>;
  onLoadVersions: () => Promise<{ versions: string[] }>;
  onLoadVersion: (version: string) => Promise<DecisionMatrix>;
  onUpdateMatrix: (matrix: DecisionMatrix) => Promise<DecisionMatrix>;
  onGenerateMatrix: () => Promise<{ matrix: DecisionMatrix }>;
}

const DecisionMatrixAdmin: React.FC<DecisionMatrixAdminProps> = ({
  onLoadMatrix,
  onLoadVersions,
  onLoadVersion,
  onUpdateMatrix,
  onGenerateMatrix,
}) => {
  const [matrix, setMatrix] = useState<DecisionMatrix | null>(null);
  const [versions, setVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [needsInitialization, setNeedsInitialization] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'flow'>('list');
  const [showHelp, setShowHelp] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setNeedsInitialization(false);
    try {
      const [matrixData, versionsData] = await Promise.all([
        onLoadMatrix(),
        onLoadVersions(),
      ]);
      setMatrix(matrixData);
      setVersions(versionsData.versions || []);
      setSelectedVersion(matrixData.version);
    } catch (err: any) {
      // Check if it's a 404 (matrix not initialized)
      if (err.status === 404) {
        setNeedsInitialization(true);
        setError('');
      } else {
        setError(err.message || 'Failed to load decision matrix');
      }
    } finally {
      setLoading(false);
    }
  }, [onLoadMatrix, onLoadVersions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const response = await onGenerateMatrix();
      setMatrix(response.matrix);
      setNeedsInitialization(false);
      await loadData(); // Reload to get versions
    } catch (err: any) {
      setError(err.message || 'Failed to generate decision matrix');
    } finally {
      setGenerating(false);
    }
  };

  const loadSpecificVersion = async (version: string) => {
    setLoading(true);
    setError('');
    try {
      const matrixData = await onLoadVersion(version);
      setMatrix(matrixData);
      setSelectedVersion(version);
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load version');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!matrix) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      const updatedMatrix = await onUpdateMatrix(matrix);
      setMatrix(updatedMatrix);
      setEditMode(false);
      setSuccessMessage(`Decision matrix saved successfully! New version: ${updatedMatrix.version}`);
      await loadData(); // Reload to get new version list
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to save decision matrix');
    } finally {
      setSaving(false);
    }
  };

  const handleFlowSave = async (updatedMatrix: DecisionMatrix) => {
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      const savedMatrix = await onUpdateMatrix(updatedMatrix);
      setMatrix(savedMatrix);
      setSuccessMessage(`Decision matrix saved successfully! New version: ${savedMatrix.version}`);
      await loadData(); // Reload to get new version list
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to save decision matrix');
      throw err; // Re-throw so flow editor can handle it
    } finally {
      setSaving(false);
    }
  };

  const handleFlowCancel = () => {
    setViewMode('list');
  };

  const toggleRuleActive = (ruleId: string) => {
    if (!matrix) return;
    setMatrix({
      ...matrix,
      rules: matrix.rules.map(rule =>
        rule.ruleId === ruleId ? { ...rule, active: !rule.active } : rule
      ),
    });
  };

  const updateAttributeWeight = (name: string, weight: number) => {
    if (!matrix) return;
    setMatrix({
      ...matrix,
      attributes: matrix.attributes.map(attr =>
        attr.name === name ? { ...attr, weight } : attr
      ),
    });
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px', textAlign: 'center' }}>
        <p>Loading decision matrix...</p>
      </div>
    );
  }

  if (needsInitialization) {
    return (
      <div style={{ maxWidth: '800px', margin: '50px auto', padding: '40px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, color: '#343a40', textAlign: 'center' }}>Initialize Decision Matrix</h2>
        <p style={{ fontSize: '16px', color: '#666', textAlign: 'center', marginBottom: '30px' }}>
          The decision matrix hasn't been initialized yet. This matrix will be used to evaluate and classify business processes based on attributes like complexity, business value, and risk.
        </p>
        <div style={{
          padding: '20px',
          backgroundColor: '#e7f3ff',
          borderRadius: '4px',
          marginBottom: '30px'
        }}>
          <p style={{ margin: '0 0 10px 0', color: '#004085', fontWeight: 'bold' }}>
            What will be generated:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#004085' }}>
            <li>Business process attributes (frequency, complexity, risk, etc.)</li>
            <li>Classification rules for the 6 transformation categories</li>
            <li>Decision logic based on industry best practices</li>
          </ul>
        </div>
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
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '12px 32px',
              backgroundColor: generating ? '#6c757d' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: generating ? 'not-allowed' : 'pointer'
            }}
          >
            {generating ? '🔄 Generating Matrix...' : '✨ Generate Decision Matrix'}
          </button>
        </div>
        <p style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '20px' }}>
          This process uses AI to generate an initial decision matrix. You can edit it afterwards.
        </p>
      </div>
    );
  }

  if (error && !matrix) {
    return (
      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
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
          onClick={loadData}
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

  if (!matrix) {
    return (
      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px', textAlign: 'center' }}>
        <p>No decision matrix available</p>
      </div>
    );
  }

  return viewMode === 'flow' ? (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 1000, backgroundColor: '#fff' }}>
      <DecisionMatrixFlowEditor
        matrix={matrix}
        onSave={handleFlowSave}
        onCancel={handleFlowCancel}
      />
      {/* Success Message for Flow View */}
      {successMessage && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          backgroundColor: '#10b981',
          color: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          fontSize: '14px',
          fontWeight: 500
        }}>
          ✓ {successMessage}
        </div>
      )}
      {/* Error Message for Flow View */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          backgroundColor: '#ef4444',
          color: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          fontSize: '14px',
          fontWeight: 500
        }}>
          ✗ {error}
        </div>
      )}
    </div>
  ) : (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>Decision Matrix Admin</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: '#f1f5f9',
            padding: '4px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 12px',
                backgroundColor: '#fff',
                color: '#1e293b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              📋 List View
            </button>
            <button
              onClick={() => setViewMode('flow')}
              style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '400',
                boxShadow: 'none'
              }}
            >
              🔀 Flow View
            </button>
          </div>

          {/* Help Menu Button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#fff',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            title="Help & Documentation"
          >
            ❓ Help
          </button>

          {/* Edit/Save/Cancel Buttons */}
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✏️ Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: saving ? '#6c757d' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Saving...' : '💾 Save'}
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  loadData();
                }}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div style={{
          padding: '15px',
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderRadius: '4px',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✗</span>
          <span>{error}</span>
        </div>
      )}

      {/* Help Menu Dropdown */}
      {showHelp && (
        <div style={{
          position: 'absolute',
          top: '80px',
          right: '20px',
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: '8px',
          minWidth: '220px',
          zIndex: 100
        }}>
          <button
            onClick={() => {
              setShowHelp(false);
              setViewMode('flow');
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🎓 Start Welcome Tour
          </button>
          <button
            onClick={() => {
              setShowHelp(false);
              setViewMode('flow');
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            📖 Show Legend
          </button>
          <div style={{
            height: '1px',
            backgroundColor: '#e2e8f0',
            margin: '4px 0'
          }} />
          <button
            onClick={() => {
              setShowHelp(false);
              alert('Help documentation coming soon!');
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            📚 Open Help Guide
          </button>
          <button
            onClick={() => {
              setShowHelp(false);
              alert('Interactive tutorial coming soon!');
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🎯 Interactive Tutorial
          </button>
          <button
            onClick={() => {
              setShowHelp(false);
              alert('Keyboard shortcuts:\n\n• Tab: Navigate nodes\n• Arrow keys: Move between connected nodes\n• Enter: Select/edit node\n• Escape: Deselect/close panels');
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ⌨️ Keyboard Shortcuts
          </button>
          <button
            onClick={() => {
              setShowHelp(false);
              alert('Tips & Best Practices:\n\n• Use higher priorities (80-100) for critical business rules\n• Keep rule conditions simple and focused\n• Document rationale for all override actions\n• Test rules with sample data before deploying');
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            💡 Tips & Best Practices
          </button>
        </div>
      )}

      {/* Version Info */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <strong>Current Version:</strong> {matrix.version}
          </div>
          <div>
            <strong>Created By:</strong> {matrix.createdBy}
          </div>
          <div>
            <strong>Created At:</strong> {new Date(matrix.createdAt).toLocaleString()}
          </div>
          <div>
            <strong>Status:</strong>{' '}
            <span style={{
              padding: '2px 8px',
              backgroundColor: matrix.active ? '#28a745' : '#6c757d',
              color: '#fff',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {matrix.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div style={{ marginTop: '15px' }}>
          <strong>Description:</strong> {matrix.description}
        </div>
      </div>

      {/* Version History */}
      {versions.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>Version History</h3>
          <select
            value={selectedVersion}
            onChange={(e) => loadSpecificVersion(e.target.value)}
            disabled={editMode}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            {versions.map(v => (
              <option key={v} value={v}>
                Version {v} {v === matrix.version ? '(current)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Attributes */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0 }}>Attributes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {matrix.attributes.map(attr => (
            <div key={attr.name} style={{
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <strong>{attr.name}</strong>
                  <span style={{
                    marginLeft: '10px',
                    padding: '2px 8px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {attr.type}
                  </span>
                </div>
                <div>
                  Weight:{' '}
                  {editMode ? (
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={attr.weight}
                      onChange={(e) => updateAttributeWeight(attr.name, parseFloat(e.target.value))}
                      style={{
                        width: '60px',
                        padding: '4px',
                        marginLeft: '5px'
                      }}
                    />
                  ) : (
                    <strong>{attr.weight}</strong>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {attr.description}
              </div>
              {attr.possibleValues && (
                <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                  Values: {attr.possibleValues.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <h3 style={{ marginTop: 0 }}>Rules ({matrix.rules.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {matrix.rules.map(rule => (
            <div key={rule.ruleId} style={{
              padding: '15px',
              backgroundColor: rule.active ? '#f8f9fa' : '#e9ecef',
              borderRadius: '4px',
              borderLeft: `4px solid ${rule.active ? '#28a745' : '#6c757d'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <strong>{rule.name}</strong>
                  <span style={{
                    marginLeft: '10px',
                    padding: '2px 8px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    Priority: {rule.priority}
                  </span>
                </div>
                {editMode && (
                  <button
                    onClick={() => toggleRuleActive(rule.ruleId)}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: rule.active ? '#dc3545' : '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {rule.active ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                {rule.description}
              </div>
              <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                <strong>Conditions:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {rule.conditions.map((cond, idx) => (
                    <li key={idx}>
                      {cond.attribute} {cond.operator} {JSON.stringify(cond.value)}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ fontSize: '13px' }}>
                <strong>Action:</strong> {rule.action.type}
                {rule.action.targetCategory && ` → ${rule.action.targetCategory}`}
                {rule.action.confidenceAdjustment && ` (${rule.action.confidenceAdjustment > 0 ? '+' : ''}${rule.action.confidenceAdjustment})`}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>
                {rule.action.rationale}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DecisionMatrixAdmin;
