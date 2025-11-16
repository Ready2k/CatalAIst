import React, { useEffect, useState, useCallback } from 'react';
import { DecisionMatrix } from '../../../shared/dist';
import DecisionMatrixFlowEditor from './DecisionMatrixFlowEditor';

interface DecisionMatrixAdminProps {
  onLoadMatrix: () => Promise<DecisionMatrix>;
  onLoadVersions: () => Promise<{ versions: string[] }>;
  onLoadVersion: (version: string) => Promise<DecisionMatrix>;
  onUpdateMatrix: (matrix: DecisionMatrix) => Promise<DecisionMatrix>;
  onGenerateMatrix: () => Promise<{ matrix: DecisionMatrix }>;
  onExportMatrix: (version?: string) => Promise<Blob>;
  onExportAllVersions: () => Promise<Blob>;
  onImportMatrix: (matrixData: any, replaceExisting: boolean) => Promise<any>;
}

const DecisionMatrixAdmin: React.FC<DecisionMatrixAdminProps> = ({
  onLoadMatrix,
  onLoadVersions,
  onLoadVersion,
  onUpdateMatrix,
  onGenerateMatrix,
  onExportMatrix,
  onExportAllVersions,
  onImportMatrix,
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
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFileContent, setImportFileContent] = useState<any>(null);
  const [replaceExisting, setReplaceExisting] = useState(true); // Default to creating new version

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

  const handleExport = async (version?: string) => {
    setExporting(true);
    setError('');
    try {
      const blob = await onExportMatrix(version);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision-matrix-v${version || matrix?.version || 'latest'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccessMessage('Decision matrix exported successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to export decision matrix');
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    setError('');
    try {
      const blob = await onExportAllVersions();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decision-matrices-all-versions-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccessMessage('All decision matrix versions exported successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to export decision matrices');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        setImportFileContent(content);
        setReplaceExisting(true); // Default to checked (create new version)
        setShowImportDialog(true);
        setError('');
      } catch (err) {
        setError('Invalid JSON file. Please select a valid decision matrix export file.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleImport = async () => {
    if (!importFileContent) return;

    setImporting(true);
    setError('');
    setSuccessMessage('');
    try {
      const response = await onImportMatrix(importFileContent, replaceExisting);
      setSuccessMessage(`Decision matrix imported successfully! New version: ${response.newVersion}`);
      setShowImportDialog(false);
      setImportFileContent(null);
      setReplaceExisting(true); // Reset to default
      await loadData(); // Reload to show imported matrix
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      if (err.status === 409) {
        // Matrix already exists - show option to replace
        setError(err.message + ' Check "Create new version" to import anyway.');
      } else {
        setError(err.message || 'Failed to import decision matrix');
      }
    } finally {
      setImporting(false);
    }
  };

  const handleCancelImport = () => {
    setShowImportDialog(false);
    setImportFileContent(null);
    setReplaceExisting(true); // Reset to default (checked)
    setError('');
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

  const updateRule = (ruleId: string, updates: any) => {
    if (!matrix) return;
    setMatrix({
      ...matrix,
      rules: matrix.rules.map(rule =>
        rule.ruleId === ruleId ? { ...rule, ...updates } : rule
      ),
    });
  };

  const updateRuleCondition = (ruleId: string, conditionIndex: number, updates: any) => {
    if (!matrix) return;
    setMatrix({
      ...matrix,
      rules: matrix.rules.map(rule => {
        if (rule.ruleId === ruleId) {
          const newConditions = [...rule.conditions];
          newConditions[conditionIndex] = { ...newConditions[conditionIndex], ...updates };
          return { ...rule, conditions: newConditions };
        }
        return rule;
      }),
    });
  };

  const addRuleCondition = (ruleId: string) => {
    if (!matrix) return;
    setMatrix({
      ...matrix,
      rules: matrix.rules.map(rule => {
        if (rule.ruleId === ruleId) {
          return {
            ...rule,
            conditions: [
              ...rule.conditions,
              {
                attribute: matrix.attributes[0]?.name || '',
                operator: '==' as const,
                value: ''
              }
            ]
          };
        }
        return rule;
      }),
    });
  };

  const deleteRuleCondition = (ruleId: string, conditionIndex: number) => {
    if (!matrix) return;
    setMatrix({
      ...matrix,
      rules: matrix.rules.map(rule => {
        if (rule.ruleId === ruleId) {
          return {
            ...rule,
            conditions: rule.conditions.filter((_, idx) => idx !== conditionIndex)
          };
        }
        return rule;
      }),
    });
  };

  const updateRuleAction = (ruleId: string, updates: any) => {
    if (!matrix) return;
    setMatrix({
      ...matrix,
      rules: matrix.rules.map(rule => {
        if (rule.ruleId === ruleId) {
          return {
            ...rule,
            action: { ...rule.action, ...updates }
          };
        }
        return rule;
      }),
    });
  };

  const addNewRule = () => {
    if (!matrix) return;
    const newRuleId = `rule-${Date.now()}`;
    const newRule = {
      ruleId: newRuleId,
      name: `New Rule ${matrix.rules.length + 1}`,
      description: 'New rule description',
      priority: 50,
      active: true,
      conditions: [
        {
          attribute: matrix.attributes[0]?.name || '',
          operator: '==' as const,
          value: ''
        }
      ],
      action: {
        type: 'adjust_confidence' as const,
        confidenceAdjustment: 0,
        rationale: 'Adjustment rationale'
      }
    };
    setMatrix({
      ...matrix,
      rules: [...matrix.rules, newRule]
    });
  };

  const deleteRule = (ruleId: string) => {
    if (!matrix) return;
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    setMatrix({
      ...matrix,
      rules: matrix.rules.filter(rule => rule.ruleId !== ruleId)
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

          {/* Export Button */}
          <button
            onClick={() => handleExport()}
            disabled={exporting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
            title="Export current version"
          >
            {exporting ? '⏳' : '📥'} Export
          </button>

          {/* Import Button */}
          <label style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'inline-block'
          }}
          title="Import decision matrix">
            📤 Import
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </label>

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

      {/* Import Dialog */}
      {showImportDialog && importFileContent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginTop: 0 }}>Import Decision Matrix</h3>
            
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <strong>File Details:</strong>
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                <div>Version: {importFileContent.matrix?.version || importFileContent.version || 'Unknown'}</div>
                <div>Rules: {importFileContent.matrix?.rules?.length || importFileContent.rules?.length || 0}</div>
                <div>Attributes: {importFileContent.matrix?.attributes?.length || importFileContent.attributes?.length || 0}</div>
                {importFileContent.exportedAt && (
                  <div>Exported: {new Date(importFileContent.exportedAt).toLocaleString()}</div>
                )}
              </div>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#f8d7da',
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px',
                border: '1px solid #f5c6cb'
              }}>
                <div style={{ marginBottom: '5px', fontWeight: 'bold', color: '#721c24' }}>
                  ✗ Import Error
                </div>
                <div style={{ fontSize: '14px', color: '#721c24', wordBreak: 'break-word' }}>
                  {error}
                </div>
              </div>
            )}

            {matrix && (
              <div style={{
                backgroundColor: '#d1ecf1',
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px',
                border: '1px solid #bee5eb'
              }}>
                <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#0c5460' }}>
                  ℹ️ Matrix Already Exists
                </div>
                <div style={{ fontSize: '14px', color: '#0c5460', marginBottom: '15px' }}>
                  Current version: {matrix.version}. Importing will create a new version (v{(() => {
                    const [major, minor] = matrix.version.split('.').map(Number);
                    return `${major}.${minor + 1}`;
                  })()}).
                </div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#0c5460'
                }}>
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>✓ Create new version from imported rules</span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelImport}
                disabled={importing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: importing ? '#6c757d' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {importing ? '⏳ Importing...' : '✓ Import'}
              </button>
            </div>
          </div>
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
              handleExportAll();
            }}
            disabled={exporting}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: exporting ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: exporting ? 0.5 : 1
            }}
            onMouseEnter={(e) => !exporting && (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            📦 Export All Versions
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Rules ({matrix.rules.length})</h3>
          {editMode && (
            <button
              onClick={addNewRule}
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              ➕ Add Rule
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {matrix.rules.map(rule => (
            <div key={rule.ruleId} style={{
              padding: '15px',
              backgroundColor: rule.active ? '#f8f9fa' : '#e9ecef',
              borderRadius: '4px',
              borderLeft: `4px solid ${rule.active ? '#28a745' : '#6c757d'}`
            }}>
              {/* Rule Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  {editMode ? (
                    <input
                      type="text"
                      value={rule.name}
                      onChange={(e) => updateRule(rule.ruleId, { name: e.target.value })}
                      style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        width: '100%',
                        maxWidth: '400px'
                      }}
                    />
                  ) : (
                    <strong>{rule.name}</strong>
                  )}
                  <span style={{
                    marginLeft: '10px',
                    padding: '2px 8px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    Priority: {editMode ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rule.priority}
                        onChange={(e) => updateRule(rule.ruleId, { priority: parseInt(e.target.value) })}
                        style={{
                          width: '50px',
                          padding: '2px 4px',
                          marginLeft: '4px',
                          border: '1px solid #fff',
                          borderRadius: '2px'
                        }}
                      />
                    ) : rule.priority}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {editMode && (
                    <>
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
                      <button
                        onClick={() => deleteRule(rule.ruleId)}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Rule Description */}
              <div style={{ marginBottom: '10px' }}>
                {editMode ? (
                  <textarea
                    value={rule.description}
                    onChange={(e) => updateRule(rule.ruleId, { description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      minHeight: '60px',
                      fontFamily: 'inherit'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {rule.description}
                  </div>
                )}
              </div>

              {/* Conditions */}
              <div style={{ fontSize: '13px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong>Conditions:</strong>
                  {editMode && (
                    <button
                      onClick={() => addRuleCondition(rule.ruleId)}
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      + Add Condition
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rule.conditions.map((cond, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      backgroundColor: '#fff',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0'
                    }}>
                      {editMode ? (
                        <>
                          <select
                            value={cond.attribute}
                            onChange={(e) => updateRuleCondition(rule.ruleId, idx, { attribute: e.target.value })}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '3px',
                              flex: '1'
                            }}
                          >
                            {matrix.attributes.map(attr => (
                              <option key={attr.name} value={attr.name}>{attr.name}</option>
                            ))}
                          </select>
                          <select
                            value={cond.operator}
                            onChange={(e) => updateRuleCondition(rule.ruleId, idx, { operator: e.target.value })}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '3px'
                            }}
                          >
                            <option value="==">equals (==)</option>
                            <option value="!=">not equals (!=)</option>
                            <option value=">">greater than (&gt;)</option>
                            <option value="<">less than (&lt;)</option>
                            <option value=">=">greater than or equal (&gt;=)</option>
                            <option value="<=">less than or equal (&lt;=)</option>
                            <option value="in">in</option>
                            <option value="not_in">not in</option>
                          </select>
                          <input
                            type="text"
                            value={typeof cond.value === 'string' ? cond.value : JSON.stringify(cond.value)}
                            onChange={(e) => {
                              let value: any = e.target.value;
                              try {
                                value = JSON.parse(e.target.value);
                              } catch {
                                // Keep as string if not valid JSON
                              }
                              updateRuleCondition(rule.ruleId, idx, { value });
                            }}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '3px',
                              flex: '1'
                            }}
                          />
                          <button
                            onClick={() => deleteRuleCondition(rule.ruleId, idx)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#dc3545',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <span>
                          {cond.attribute} {cond.operator} {JSON.stringify(cond.value)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div style={{ fontSize: '13px', padding: '10px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                <strong>Action:</strong>
                {editMode ? (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <label style={{ minWidth: '80px', fontSize: '12px' }}>Type:</label>
                      <select
                        value={rule.action.type}
                        onChange={(e) => updateRuleAction(rule.ruleId, { type: e.target.value })}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '3px',
                          flex: '1'
                        }}
                      >
                        <option value="adjust_confidence">Adjust Confidence</option>
                        <option value="override">Override Category</option>
                        <option value="flag_review">Flag for Review</option>
                      </select>
                    </div>
                    {rule.action.type === 'override' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ minWidth: '80px', fontSize: '12px' }}>Category:</label>
                        <select
                          value={rule.action.targetCategory || ''}
                          onChange={(e) => updateRuleAction(rule.ruleId, { targetCategory: e.target.value })}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '3px',
                            flex: '1'
                          }}
                        >
                          <option value="">Select category...</option>
                          <option value="Eliminate">Eliminate</option>
                          <option value="Simplify">Simplify</option>
                          <option value="Digitise">Digitise</option>
                          <option value="RPA">RPA</option>
                          <option value="AI Agent">AI Agent</option>
                          <option value="Agentic AI">Agentic AI</option>
                        </select>
                      </div>
                    )}
                    {rule.action.type === 'adjust_confidence' && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ minWidth: '80px', fontSize: '12px' }}>Adjustment:</label>
                        <input
                          type="number"
                          min="-100"
                          max="100"
                          value={rule.action.confidenceAdjustment || 0}
                          onChange={(e) => updateRuleAction(rule.ruleId, { confidenceAdjustment: parseInt(e.target.value) })}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '3px',
                            width: '80px'
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#666' }}>(-100 to +100)</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <label style={{ minWidth: '80px', fontSize: '12px', paddingTop: '4px' }}>Rationale:</label>
                      <textarea
                        value={rule.action.rationale || ''}
                        onChange={(e) => updateRuleAction(rule.ruleId, { rationale: e.target.value })}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          border: '1px solid #ddd',
                          borderRadius: '3px',
                          flex: '1',
                          minHeight: '50px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '4px' }}>
                    <div>
                      {rule.action.type}
                      {rule.action.targetCategory && ` → ${rule.action.targetCategory}`}
                      {rule.action.confidenceAdjustment !== undefined && ` (${rule.action.confidenceAdjustment > 0 ? '+' : ''}${rule.action.confidenceAdjustment})`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>
                      {rule.action.rationale}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DecisionMatrixAdmin;
