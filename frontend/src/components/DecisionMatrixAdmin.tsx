import React, { useEffect, useState } from 'react';
import { DecisionMatrix, Rule, Attribute } from '../../../shared/types';

interface DecisionMatrixAdminProps {
  onLoadMatrix: () => Promise<DecisionMatrix>;
  onLoadVersions: () => Promise<{ versions: string[] }>;
  onLoadVersion: (version: string) => Promise<DecisionMatrix>;
  onUpdateMatrix: (matrix: DecisionMatrix) => Promise<DecisionMatrix>;
}

const DecisionMatrixAdmin: React.FC<DecisionMatrixAdminProps> = ({
  onLoadMatrix,
  onLoadVersions,
  onLoadVersion,
  onUpdateMatrix,
}) => {
  const [matrix, setMatrix] = useState<DecisionMatrix | null>(null);
  const [versions, setVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [matrixData, versionsData] = await Promise.all([
        onLoadMatrix(),
        onLoadVersions(),
      ]);
      setMatrix(matrixData);
      setVersions(versionsData.versions || []);
      setSelectedVersion(matrixData.version);
    } catch (err: any) {
      setError(err.message || 'Failed to load decision matrix');
    } finally {
      setLoading(false);
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
    try {
      const updatedMatrix = await onUpdateMatrix(matrix);
      setMatrix(updatedMatrix);
      setEditMode(false);
      await loadData(); // Reload to get new version list
    } catch (err: any) {
      setError(err.message || 'Failed to save decision matrix');
    } finally {
      setSaving(false);
    }
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

  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>Decision Matrix Admin</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
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
