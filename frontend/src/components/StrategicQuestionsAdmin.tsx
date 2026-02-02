import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface StrategicQuestion {
    id: string;
    text: string;
    key?: string;
    priority: 'High' | 'Medium' | 'Low';
    active: boolean;
}

const StrategicQuestionsAdmin: React.FC = () => {
    const [questions, setQuestions] = useState<StrategicQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editedQuestions, setEditedQuestions] = useState<StrategicQuestion[]>([]);

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await apiService.getStrategicQuestions();
            setQuestions(data);
            setEditedQuestions(JSON.parse(JSON.stringify(data)));
        } catch (err: any) {
            setError(err.message || 'Failed to load strategic questions');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            // Validate
            if (editedQuestions.some(q => !q.text.trim())) {
                throw new Error('All questions must have text');
            }

            await apiService.saveStrategicQuestions(editedQuestions);
            setQuestions(editedQuestions);
            setEditMode(false);
            // Reload to ensure sync
            await loadQuestions();
        } catch (err: any) {
            setError(err.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedQuestions(JSON.parse(JSON.stringify(questions)));
        setEditMode(false);
        setError('');
    };

    const handleAddQuestion = () => {
        const newQuestion: StrategicQuestion = {
            id: `custom_${Date.now()}`,
            text: '',
            priority: 'High',
            active: true
        };
        setEditedQuestions([...editedQuestions, newQuestion]);
    };

    const handleRemoveQuestion = (index: number) => {
        const newQuestions = [...editedQuestions];
        newQuestions.splice(index, 1);
        setEditedQuestions(newQuestions);
    };

    const handleQuestionChange = (index: number, field: keyof StrategicQuestion, value: any) => {
        const newQuestions = [...editedQuestions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setEditedQuestions(newQuestions);
    };

    if (loading && questions.length === 0) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading strategic questions...</div>;
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Strategic Questions Management</h2>
                {!editMode && (
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
                        ✏️ Edit Questions
                    </button>
                )}
            </div>

            <div style={{
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
            }}>
                <p style={{ marginTop: 0, color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
                    These questions are prioritized by the AI agent during the discovery process.
                    The goal is to gather strategic context (Success, Risks, Value, Sponsorship) early.
                    You can modify the phrasing, priority, or add new custom questions here.
                </p>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {(editMode ? editedQuestions : questions).map((question, index) => (
                    <div key={question.id} style={{
                        backgroundColor: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '15px',
                        display: 'grid',
                        gridTemplateColumns: editMode ? '40px 2fr 1fr 120px 80px 40px' : '40px 1fr 120px',
                        gap: '15px',
                        alignItems: 'center',
                        opacity: question.active ? 1 : 0.6
                    }}>
                        <div style={{ fontWeight: 'bold', color: '#999' }}>#{index + 1}</div>

                        {editMode ? (
                            <input
                                type="text"
                                value={question.text}
                                onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                                placeholder="Enter question text..."
                                style={{
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    width: '100%',
                                    fontSize: '14px'
                                }}
                            />
                        ) : (
                            <div style={{ fontSize: '15px', fontWeight: '500' }}>
                                {question.text}
                                {question.key && <span style={{
                                    marginLeft: '10px',
                                    fontSize: '11px',
                                    backgroundColor: '#e9ecef',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    color: '#495057'
                                }}>{question.key.toUpperCase()}</span>}
                            </div>
                        )}

                        {editMode && (
                            <>
                                <input
                                    type="text"
                                    list={`key-suggestions-${index}`}
                                    value={question.key || ''}
                                    onChange={(e) => handleQuestionChange(index, 'key', e.target.value)}
                                    placeholder="Tag (e.g. sponsorship)"
                                    style={{
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        width: '100%',
                                        fontSize: '14px'
                                    }}
                                    title="Strategic Category Key (used for tagging)"
                                />
                                <datalist id={`key-suggestions-${index}`}>
                                    <option value="success_criteria">Success Criteria</option>
                                    <option value="risks_constraints">Risks & Constraints</option>
                                    <option value="value_estimate">Value Estimate</option>
                                    <option value="sponsorship">Sponsorship</option>
                                </datalist>
                            </>
                        )}

                        {editMode ? (
                            <select
                                value={question.priority}
                                onChange={(e) => handleQuestionChange(index, 'priority', e.target.value)}
                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="High">High Priority</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                backgroundColor: question.priority === 'High' ? '#ffeeba' : (question.priority === 'Medium' ? '#bee5eb' : '#e2e3e5'),
                                color: question.priority === 'High' ? '#856404' : (question.priority === 'Medium' ? '#0c5460' : '#383d41')
                            }}>
                                {question.priority}
                            </div>
                        )}

                        {editMode && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={question.active}
                                    onChange={(e) => handleQuestionChange(index, 'active', e.target.checked)}
                                />
                                Active
                            </label>
                        )}

                        {editMode && (
                            <button
                                onClick={() => handleRemoveQuestion(index)}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#dc3545',
                                    cursor: 'pointer',
                                    fontSize: '18px'
                                }}
                                title="Remove question"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                ))}

                {editMode && (
                    <button
                        onClick={handleAddQuestion}
                        style={{
                            padding: '12px',
                            backgroundColor: '#f8f9fa',
                            border: '2px dashed #ddd',
                            borderRadius: '8px',
                            color: '#666',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            marginTop: '10px'
                        }}
                    >
                        + Add New Question
                    </button>
                )}
            </div>

            {editMode && (
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleCancel}
                        disabled={saving}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#fff',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            color: '#333'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#28a745',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            color: '#fff',
                            fontWeight: 'bold'
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default StrategicQuestionsAdmin;
