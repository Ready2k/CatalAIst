import React, { useEffect, useState } from 'react';

interface Prompt {
  id: string;
  name: string;
  content: string;
  version: string;
  updatedAt: string;
}

interface PromptAdminProps {
  onLoadPrompts: () => Promise<Prompt[]>;
  onLoadPrompt: (id: string) => Promise<Prompt>;
  onUpdatePrompt: (id: string, content: string) => Promise<Prompt>;
}

const PromptAdmin: React.FC<PromptAdminProps> = ({
  onLoadPrompts,
  onLoadPrompt,
  onUpdatePrompt,
}) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await onLoadPrompts();
      setPrompts(data);
      if (data.length > 0 && !selectedPrompt) {
        await selectPrompt(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const selectPrompt = async (id: string) => {
    setLoading(true);
    setError('');
    setEditMode(false);
    try {
      const prompt = await onLoadPrompt(id);
      setSelectedPrompt(prompt);
      setEditedContent(prompt.content);
    } catch (err: any) {
      setError(err.message || 'Failed to load prompt');
    } finally {
      setLoading(false);
    }
  };

  const validatePrompt = (content: string): boolean => {
    setValidationError('');
    
    if (content.trim().length === 0) {
      setValidationError('Prompt content cannot be empty');
      return false;
    }

    if (content.length < 50) {
      setValidationError('Prompt content seems too short (minimum 50 characters)');
      return false;
    }

    // Check for common placeholders
    const requiredPlaceholders = ['{', '}'];
    const hasPlaceholders = requiredPlaceholders.some(p => content.includes(p));
    if (!hasPlaceholders) {
      setValidationError('Warning: Prompt may be missing variable placeholders (e.g., {variable})');
      // This is a warning, not a blocker
    }

    return true;
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;

    if (!validatePrompt(editedContent)) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await onUpdatePrompt(selectedPrompt.id, editedContent);
      setSelectedPrompt(updated);
      setEditMode(false);
      await loadPrompts(); // Reload list to show new version
    } catch (err: any) {
      setError(err.message || 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (selectedPrompt) {
      setEditedContent(selectedPrompt.content);
    }
    setEditMode(false);
    setValidationError('');
  };

  if (loading && prompts.length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px', textAlign: 'center' }}>
        <p>Loading prompts...</p>
      </div>
    );
  }

  if (error && !selectedPrompt) {
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
          onClick={loadPrompts}
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

  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>Prompt Management</h2>
        {selectedPrompt && !editMode && (
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
        )}
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

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
        {/* Prompt List */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '15px',
          height: 'fit-content'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>
            Available Prompts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {prompts.map(prompt => (
              <button
                key={prompt.id}
                onClick={() => selectPrompt(prompt.id)}
                disabled={editMode}
                style={{
                  padding: '12px',
                  backgroundColor: selectedPrompt?.id === prompt.id ? '#007bff' : '#fff',
                  color: selectedPrompt?.id === prompt.id ? '#fff' : '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  textAlign: 'left',
                  cursor: editMode ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {prompt.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  opacity: 0.8
                }}>
                  v{prompt.version}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Editor */}
        {selectedPrompt && (
          <div style={{
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '10px' }}>
                {selectedPrompt.name}
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '14px',
                color: '#666'
              }}>
                <div>
                  <strong>Version:</strong> {selectedPrompt.version}
                </div>
                <div>
                  <strong>Last Updated:</strong> {new Date(selectedPrompt.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {validationError && (
              <div style={{
                padding: '10px',
                backgroundColor: validationError.startsWith('Warning') ? '#fff3cd' : '#f8d7da',
                color: validationError.startsWith('Warning') ? '#856404' : '#721c24',
                borderRadius: '4px',
                marginBottom: '15px',
                fontSize: '14px'
              }}>
                {validationError}
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Prompt Content:
              </label>
              {editMode ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => {
                    setEditedContent(e.target.value);
                    setValidationError('');
                  }}
                  style={{
                    width: '100%',
                    minHeight: '400px',
                    padding: '12px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              ) : (
                <pre style={{
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  maxHeight: '500px',
                  overflowY: 'auto',
                  margin: 0
                }}>
                  {selectedPrompt.content}
                </pre>
              )}
              <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                {editedContent.length} characters
              </div>
            </div>

            {editMode && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: saving ? '#6c757d' : '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#fff',
                    color: '#6c757d',
                    border: '1px solid #6c757d',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div style={{
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #ddd',
              fontSize: '12px',
              color: '#999'
            }}>
              <p style={{ margin: 0 }}>
                <strong>Note:</strong> Changes to prompts will create a new version and apply to all future classifications.
                Previous versions are retained for audit purposes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptAdmin;
