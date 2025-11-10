import React, { useState, useEffect } from 'react';
import NodePropertyPanel from './NodePropertyPanel';
import { RuleNode, ValidationError } from '../types/flow-types';
import { Rule, Condition } from '../../../../../shared/types';
import { validateRule } from '../utils/validation';
import { useDebounce } from '../utils/debounce';

interface RulePropertyPanelProps {
  selectedNode: RuleNode | null;
  onClose: () => void;
  onSave: (updatedRule: Rule) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onAddCondition?: () => void;
  availableAttributes: string[];
}

const RulePropertyPanel: React.FC<RulePropertyPanelProps> = ({
  selectedNode,
  onClose,
  onSave,
  onCancel,
  onDelete,
  onAddCondition,
  availableAttributes
}) => {
  const [editedRule, setEditedRule] = useState<Rule | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Initialize edited rule when node changes
  useEffect(() => {
    if (selectedNode) {
      setEditedRule({ ...selectedNode.data.rule });
      setIsDirty(false);
      setValidationErrors([]);
    }
  }, [selectedNode]);

  // Debounced validation (200ms delay)
  const debouncedValidate = useDebounce((rule: Rule) => {
    const errors = validateRule(rule);
    setValidationErrors(errors);
  }, 200);

  // Validate whenever rule changes
  useEffect(() => {
    if (editedRule) {
      debouncedValidate(editedRule);
    }
  }, [editedRule, debouncedValidate]);

  if (!selectedNode || !editedRule) {
    return null;
  }

  const handleNameChange = (value: string) => {
    const updated = { ...editedRule, name: value };
    setEditedRule(updated);
    setIsDirty(true);
  };

  const handleDescriptionChange = (value: string) => {
    const updated = { ...editedRule, description: value };
    setEditedRule(updated);
    setIsDirty(true);
  };

  const handlePriorityChange = (value: number) => {
    const updated = { ...editedRule, priority: value };
    setEditedRule(updated);
    setIsDirty(true);
  };

  const handleActiveToggle = () => {
    const updated = { ...editedRule, active: !editedRule.active };
    setEditedRule(updated);
    setIsDirty(true);
  };

  const handleConditionChange = (index: number, field: keyof Condition, value: any) => {
    const updatedConditions = [...editedRule.conditions];
    updatedConditions[index] = {
      ...updatedConditions[index],
      [field]: value
    };
    const updated = { ...editedRule, conditions: updatedConditions };
    setEditedRule(updated);
    setIsDirty(true);
  };

  const handleAddConditionClick = () => {
    // If onAddCondition is provided, use it to add a condition node in the flow
    if (onAddCondition) {
      onAddCondition();
    } else {
      // Otherwise, add condition to the rule directly
      const newCondition: Condition = {
        attribute: availableAttributes[0] || '',
        operator: '==',
        value: ''
      };
      const updated = {
        ...editedRule,
        conditions: [...editedRule.conditions, newCondition]
      };
      setEditedRule(updated);
      setIsDirty(true);
    }
  };

  const handleRemoveCondition = (index: number) => {
    const updatedConditions = editedRule.conditions.filter((_, i) => i !== index);
    const updated = { ...editedRule, conditions: updatedConditions };
    setEditedRule(updated);
    setIsDirty(true);
  };

  const handleSave = () => {
    // Check for blocking errors
    const blockingErrors = validationErrors.filter(e => e.severity === 'error');
    if (blockingErrors.length > 0) {
      return;
    }

    onSave(editedRule);
    setIsDirty(false);
  };

  const handleCancel = () => {
    setEditedRule({ ...selectedNode.data.rule });
    setIsDirty(false);
    setValidationErrors([]);
    onCancel();
  };

  const getOperatorOptions = () => {
    return ['==', '!=', '>', '<', '>=', '<=', 'in', 'not_in'];
  };

  const hasBlockingErrors = validationErrors.some(e => e.severity === 'error');

  return (
    <NodePropertyPanel
      selectedNode={selectedNode}
      onClose={onClose}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={onDelete}
      title="Rule Properties"
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

        {/* Editable: Name */}
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
            Rule Name *
          </label>
          <input
            type="text"
            value={editedRule.name}
            onChange={(e) => handleNameChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
            placeholder="Enter rule name..."
          />
        </div>

        {/* Editable: Description */}
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
            Description
          </label>
          <textarea
            value={editedRule.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            rows={3}
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
            placeholder="Describe when this rule should apply..."
          />
        </div>

        {/* Editable: Priority */}
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
            Priority *
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={editedRule.priority}
            onChange={(e) => handlePriorityChange(parseInt(e.target.value) || 0)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
          <p style={{ 
            fontSize: '11px', 
            color: '#6b7280', 
            marginTop: '4px',
            marginBottom: 0 
          }}>
            Higher priority rules are evaluated first (0-100)
          </p>
        </div>

        {/* Editable: Active Toggle */}
        <div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: '#374151'
            }}
          >
            <input
              type="checkbox"
              checked={editedRule.active}
              onChange={handleActiveToggle}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer'
              }}
            />
            <span>Active</span>
          </label>
          <p style={{ 
            fontSize: '11px', 
            color: '#6b7280', 
            marginTop: '4px',
            marginBottom: 0,
            marginLeft: '28px'
          }}>
            Inactive rules are not evaluated during classification
          </p>
        </div>

        {/* Conditions List */}
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151'
              }}
            >
              Conditions * (All must be true)
            </label>
            <button
              onClick={handleAddConditionClick}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 500
              }}
              title={onAddCondition ? 'Add a new condition node in the flow' : 'Add a new condition'}
            >
              + Add {onAddCondition ? 'Node' : ''}
            </button>
          </div>

          {editedRule.conditions.length === 0 ? (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#991b1b',
                textAlign: 'center'
              }}
            >
              No conditions defined. Add at least one condition.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {editedRule.conditions.map((condition, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                      Condition {index + 1}
                    </span>
                    <button
                      onClick={() => handleRemoveCondition(index)}
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  {/* Attribute */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      Attribute
                    </label>
                    <select
                      value={condition.attribute}
                      onChange={(e) => handleConditionChange(index, 'attribute', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '13px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    >
                      {availableAttributes.map((attr) => (
                        <option key={attr} value={attr}>
                          {attr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Operator */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      Operator
                    </label>
                    <select
                      value={condition.operator}
                      onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '13px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                    >
                      {getOperatorOptions().map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Value */}
                  <div>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      Value
                    </label>
                    <input
                      type="text"
                      value={typeof condition.value === 'object' ? JSON.stringify(condition.value) : condition.value}
                      onChange={(e) => {
                        let value: any = e.target.value;
                        // Try to parse as JSON for arrays
                        if (condition.operator === 'in' || condition.operator === 'not_in') {
                          try {
                            value = JSON.parse(value);
                          } catch {
                            // Keep as string if not valid JSON
                          }
                        }
                        handleConditionChange(index, 'value', value);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '13px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px'
                      }}
                      placeholder={condition.operator === 'in' || condition.operator === 'not_in' ? '["value1", "value2"]' : 'Enter value...'}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Info */}
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
          <strong>Action:</strong> {editedRule.action.type}
          {editedRule.action.targetCategory && (
            <span> → {editedRule.action.targetCategory}</span>
          )}
          {editedRule.action.confidenceAdjustment !== undefined && (
            <span> ({editedRule.action.confidenceAdjustment > 0 ? '+' : ''}{editedRule.action.confidenceAdjustment})</span>
          )}
          <div style={{ marginTop: '6px', fontSize: '11px' }}>
            Click on the action node to edit action details
          </div>
        </div>
      </div>
    </NodePropertyPanel>
  );
};

export default RulePropertyPanel;
