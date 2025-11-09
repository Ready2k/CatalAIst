import React, { useState, useEffect } from 'react';
import NodePropertyPanel from './NodePropertyPanel';
import { AttributeNode, ValidationError } from '../types/flow-types';
import { Attribute } from '../../../../../shared/types';
import { validateAttribute } from '../utils/validation';
import { useDebounce } from '../utils/debounce';

interface AttributePropertyPanelProps {
  selectedNode: AttributeNode | null;
  onClose: () => void;
  onSave: (updatedAttribute: Attribute) => void;
  onCancel: () => void;
}

const AttributePropertyPanel: React.FC<AttributePropertyPanelProps> = ({
  selectedNode,
  onClose,
  onSave,
  onCancel
}) => {
  const [editedAttribute, setEditedAttribute] = useState<Attribute | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Initialize edited attribute when node changes
  useEffect(() => {
    if (selectedNode) {
      setEditedAttribute({ ...selectedNode.data.attribute });
      setIsDirty(false);
      setValidationErrors([]);
    }
  }, [selectedNode]);

  // Debounced validation (200ms delay)
  const debouncedValidate = useDebounce((attribute: Attribute) => {
    const errors = validateAttribute(attribute);
    setValidationErrors(errors);
  }, 200);

  // Validate whenever attribute changes
  useEffect(() => {
    if (editedAttribute) {
      debouncedValidate(editedAttribute);
    }
  }, [editedAttribute, debouncedValidate]);

  if (!selectedNode || !editedAttribute) {
    return null;
  }

  const handleWeightChange = (value: number) => {
    setEditedAttribute({
      ...editedAttribute,
      weight: value
    });
    setIsDirty(true);
  };

  const handleDescriptionChange = (value: string) => {
    setEditedAttribute({
      ...editedAttribute,
      description: value
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    // Check for blocking errors
    const blockingErrors = validationErrors.filter(e => e.severity === 'error');
    if (blockingErrors.length > 0) {
      return;
    }

    onSave(editedAttribute);
    setIsDirty(false);
  };

  const handleCancel = () => {
    setEditedAttribute({ ...selectedNode.data.attribute });
    setIsDirty(false);
    setValidationErrors([]);
    onCancel();
  };

  const hasBlockingErrors = validationErrors.some(e => e.severity === 'error');
  const weightErrors = validationErrors.filter(e => e.field === 'weight');

  return (
    <NodePropertyPanel
      selectedNode={selectedNode}
      onClose={onClose}
      onSave={handleSave}
      onCancel={handleCancel}
      title="Attribute Properties"
      isDirty={isDirty}
      hasErrors={hasBlockingErrors}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Validation Errors Summary */}
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
        {/* Read-only: Name */}
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
            Name
          </label>
          <input
            type="text"
            value={editedAttribute.name}
            disabled
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              cursor: 'not-allowed'
            }}
          />
          <p style={{ 
            fontSize: '11px', 
            color: '#6b7280', 
            marginTop: '4px',
            marginBottom: 0 
          }}>
            Attribute name cannot be changed
          </p>
        </div>

        {/* Read-only: Type */}
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
            Type
          </label>
          <input
            type="text"
            value={editedAttribute.type}
            disabled
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              cursor: 'not-allowed',
              textTransform: 'capitalize'
            }}
          />
        </div>

        {/* Read-only: Possible Values (for categorical) */}
        {editedAttribute.type === 'categorical' && editedAttribute.possibleValues && (
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
              Possible Values
            </label>
            <div
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                minHeight: '40px'
              }}
            >
              {editedAttribute.possibleValues.map((value, index) => (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    margin: '2px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Editable: Weight (slider) */}
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
            Weight
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={editedAttribute.weight}
              onChange={(e) => handleWeightChange(parseFloat(e.target.value))}
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
              min="0"
              max="1"
              step="0.01"
              value={editedAttribute.weight}
              onChange={(e) => handleWeightChange(parseFloat(e.target.value))}
              style={{
                width: '70px',
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
            Higher weight = more influence on classification (0-1)
          </p>
          {weightErrors.length > 0 && (
            <div style={{ marginTop: '6px' }}>
              {weightErrors.map((error, index) => (
                <p key={index} style={{ 
                  fontSize: '12px', 
                  color: error.severity === 'error' ? '#ef4444' : '#f59e0b', 
                  marginTop: '4px',
                  marginBottom: 0,
                  fontWeight: 500
                }}>
                  {error.severity === 'error' ? '⚠️' : '⚡'} {error.message}
                </p>
              ))}
            </div>
          )}
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
            value={editedAttribute.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
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
            placeholder="Describe what this attribute represents..."
          />
          <p style={{ 
            fontSize: '11px', 
            color: '#6b7280', 
            marginTop: '4px',
            marginBottom: 0 
          }}>
            Explain what this attribute measures and how it's used
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
          <strong>💡 Tip:</strong> Adjust the weight to control how much this attribute 
          influences the classification decision. Higher weights mean this attribute 
          has more impact on the final category.
        </div>
      </div>
    </NodePropertyPanel>
  );
};

export default AttributePropertyPanel;
