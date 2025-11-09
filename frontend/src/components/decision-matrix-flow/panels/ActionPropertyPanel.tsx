import React, { useState, useEffect } from 'react';
import NodePropertyPanel from './NodePropertyPanel';
import { ActionNode, ValidationError } from '../types/flow-types';
import { RuleAction, TransformationCategory } from '../../../../../shared/types';
import { validateAction } from '../utils/validation';
import { useDebounce } from '../utils/debounce';

interface ActionPropertyPanelProps {
  selectedNode: ActionNode | null;
  onClose: () => void;
  onSave: (updatedAction: RuleAction) => void;
  onCancel: () => void;
}

const ActionPropertyPanel: React.FC<ActionPropertyPanelProps> = ({
  selectedNode,
  onClose,
  onSave,
  onCancel
}) => {
  const [editedAction, setEditedAction] = useState<RuleAction | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Initialize edited action when node changes
  useEffect(() => {
    if (selectedNode) {
      setEditedAction({ ...selectedNode.data.action });
      setIsDirty(false);
      setValidationErrors([]);
    }
  }, [selectedNode]);

  // Debounced validation (200ms delay)
  const debouncedValidate = useDebounce((action: RuleAction, parentRuleId: string) => {
    const errors = validateAction(action, parentRuleId);
    setValidationErrors(errors);
  }, 200);

  // Validate whenever action changes
  useEffect(() => {
    if (editedAction && selectedNode) {
      debouncedValidate(editedAction, selectedNode.data.parentRuleId);
    }
  }, [editedAction, selectedNode, debouncedValidate]);

  if (!selectedNode || !editedAction) {
    return null;
  }

  const handleTypeChange = (type: 'override' | 'adjust_confidence' | 'flag_review') => {
    const updated: RuleAction = {
      ...editedAction,
      type
    };

    // Clear fields that don't apply to the new type
    if (type !== 'override') {
      delete updated.targetCategory;
    }
    if (type !== 'adjust_confidence') {
      delete updated.confidenceAdjustment;
    }

    // Set default values for new type
    if (type === 'override' && !updated.targetCategory) {
      updated.targetCategory = 'RPA';
    }
    if (type === 'adjust_confidence' && updated.confidenceAdjustment === undefined) {
      updated.confidenceAdjustment = 0.2;
    }

    setEditedAction(updated);
    setIsDirty(true);
  };

  const handleTargetCategoryChange = (category: TransformationCategory) => {
    const updated = { ...editedAction, targetCategory: category };
    setEditedAction(updated);
    setIsDirty(true);
  };

  const handleConfidenceAdjustmentChange = (value: number) => {
    const updated = { ...editedAction, confidenceAdjustment: value };
    setEditedAction(updated);
    setIsDirty(true);
  };

  const handleRationaleChange = (value: string) => {
    const updated = { ...editedAction, rationale: value };
    setEditedAction(updated);
    setIsDirty(true);
  };

  const handleSave = () => {
    // Check for blocking errors
    const blockingErrors = validationErrors.filter(e => e.severity === 'error');
    if (blockingErrors.length > 0) {
      return;
    }

    onSave(editedAction);
    setIsDirty(false);
  };

  const handleCancel = () => {
    setEditedAction({ ...selectedNode.data.action });
    setIsDirty(false);
    setValidationErrors([]);
    onCancel();
  };

  const getCategories = (): TransformationCategory[] => {
    return ['Eliminate', 'Simplify', 'Digitise', 'RPA', 'AI Agent', 'Agentic AI'];
  };

  const getActionTypeDescription = (type: string): string => {
    switch (type) {
      case 'override':
        return 'Force a specific category, ignoring AI suggestion';
      case 'adjust_confidence':
        return 'Boost or reduce AI confidence in its suggestion';
      case 'flag_review':
        return 'Mark for manual review by a human';
      default:
        return '';
    }
  };

  const hasBlockingErrors = validationErrors.some(e => e.severity === 'error');

  return (
    <NodePropertyPanel
      selectedNode={selectedNode}
      onClose={onClose}
      onSave={handleSave}
      onCancel={handleCancel}
      title="Action Properties"
      isDirty={isDirty}
      hasErrors={hasBlockingErrors}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div
            style={{
              padding: '12px',
              backgroundColor: validationErrors.some(e => e.severity === 'error') ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${validationErrors.some(e => e.severity === 'error') ? '#fecaca' : '#fde68a'}`,
              borderRadius: '6px',
              fontSize: '12px',
              color: validationErrors.some(e => e.severity === 'error') ? '#991b1b' : '#92400e'
            }}
          >
            <strong>{validationErrors.some(e => e.severity === 'error') ? '⚠️ Validation Errors:' : '⚠️ Warnings:'}</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Editable: Action Type */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px'
            }}
          >
            Action Type *
          </label>
          <select
            value={editedAction.type}
            onChange={(e) => handleTypeChange(e.target.value as any)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <option value="override">Override Category</option>
            <option value="adjust_confidence">Adjust Confidence</option>
            <option value="flag_review">Flag for Review</option>
          </select>
          <p style={{ 
            fontSize: '11px', 
            color: '#6b7280', 
            marginTop: '4px',
            marginBottom: 0 
          }}>
            {getActionTypeDescription(editedAction.type)}
          </p>
        </div>

        {/* Conditional: Target Category (for override) */}
        {editedAction.type === 'override' && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '6px'
              }}
            >
              Target Category *
            </label>
            <select
              value={editedAction.targetCategory || ''}
              onChange={(e) => handleTargetCategoryChange(e.target.value as TransformationCategory)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {getCategories().map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <p style={{ 
              fontSize: '11px', 
              color: '#6b7280', 
              marginTop: '4px',
              marginBottom: 0 
            }}>
              The classification will be forced to this category
            </p>
          </div>
        )}

        {/* Conditional: Confidence Adjustment (for adjust_confidence) */}
        {editedAction.type === 'adjust_confidence' && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '6px'
              }}
            >
              Confidence Adjustment *
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={editedAction.confidenceAdjustment || 0}
                onChange={(e) => handleConfidenceAdjustmentChange(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <input
                type="number"
                min="-1"
                max="1"
                step="0.1"
                value={editedAction.confidenceAdjustment || 0}
                onChange={(e) => handleConfidenceAdjustmentChange(parseFloat(e.target.value))}
                style={{
                  width: '80px',
                  padding: '6px 8px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}
              />
            </div>
            <p style={{ 
              fontSize: '11px', 
              color: '#6b7280', 
              marginTop: '6px',
              marginBottom: 0 
            }}>
              Positive values boost confidence, negative values reduce it (-1 to +1)
            </p>
            <div
              style={{
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#374151'
              }}
            >
              {editedAction.confidenceAdjustment && editedAction.confidenceAdjustment > 0 ? (
                <span>✓ Will <strong>increase</strong> confidence by {Math.abs(editedAction.confidenceAdjustment)}</span>
              ) : editedAction.confidenceAdjustment && editedAction.confidenceAdjustment < 0 ? (
                <span>⚠ Will <strong>decrease</strong> confidence by {Math.abs(editedAction.confidenceAdjustment)}</span>
              ) : (
                <span>No adjustment (neutral)</span>
              )}
            </div>
          </div>
        )}

        {/* Info box for flag_review */}
        {editedAction.type === 'flag_review' && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#92400e'
            }}
          >
            <strong>⚠️ Manual Review:</strong> This action will flag the classification 
            for manual review by a human. The AI suggestion will still be shown, but 
            the process will require human approval before proceeding.
          </div>
        )}

        {/* Editable: Rationale */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px'
            }}
          >
            Rationale *
          </label>
          <textarea
            value={editedAction.rationale}
            onChange={(e) => handleRationaleChange(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.5'
            }}
            placeholder="Explain why this action should be taken..."
          />
          <p style={{ 
            fontSize: '11px', 
            color: '#6b7280', 
            marginTop: '4px',
            marginBottom: 0 
          }}>
            Provide a clear explanation for why this action is appropriate
          </p>
        </div>

        {/* Info box */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#1e40af'
          }}
        >
          <strong>💡 Action Types:</strong>
          <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
            <li><strong>Override:</strong> Use when you're certain about the category</li>
            <li><strong>Adjust Confidence:</strong> Use to fine-tune AI suggestions</li>
            <li><strong>Flag Review:</strong> Use for sensitive or complex cases</li>
          </ul>
        </div>
      </div>
    </NodePropertyPanel>
  );
};

export default ActionPropertyPanel;
