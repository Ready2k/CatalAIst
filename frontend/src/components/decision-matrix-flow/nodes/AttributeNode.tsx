import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { AttributeNodeData, NODE_COLORS } from '../types/flow-types';
import { ContextualTooltip } from '../help/ContextualTooltip';

const AttributeNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { attribute, isHighlighted } = data as AttributeNodeData;
  const { name, type, weight, description, possibleValues } = attribute;

  // Get color based on attribute type
  const getTypeColor = () => {
    return NODE_COLORS.attribute[type];
  };

  // Calculate visual weight representation (0-1 scale)
  const weightPercentage = Math.round(weight * 100);

  // Generate tooltip content
  const tooltipContent = `Attribute: ${name}

This measures ${description || 'a characteristic of the process'}.
Higher weight = more influence on classification.

Type: ${type}
Current weight: ${weight.toFixed(2)} (${weight > 0.7 ? 'high' : weight > 0.4 ? 'medium' : 'low'} influence)${possibleValues ? `\nPossible values: ${possibleValues.join(', ')}` : ''}

Click to edit weight and description.`;

  return (
    <ContextualTooltip content={tooltipContent} position="auto">
      <div
        data-node-type="attribute"
        data-node-id={(data as any).nodeId}
        tabIndex={0}
        role="button"
        aria-label={`Attribute: ${name}, Type: ${type}, Weight: ${weight.toFixed(2)}`}
        className={`attribute-node ${selected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
        style={{
        background: 'white',
        border: `2px solid ${getTypeColor()}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '200px',
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        outline: selected ? `3px solid ${getTypeColor()}` : 'none',
        outlineOffset: '2px'
      }}
    >
      {/* Header with icon and name */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px', marginRight: '6px' }}>📊</span>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>
          {name}
        </span>
      </div>

      {/* Type badge */}
      <div style={{ marginBottom: '8px' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: getTypeColor(),
            color: 'white'
          }}
        >
          {type}
        </span>
      </div>

      {/* Weight indicator with progress bar */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '4px'
        }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
            Weight:
          </span>
          <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>
            {weight.toFixed(2)}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${weightPercentage}%`,
              height: '100%',
              backgroundColor: getTypeColor(),
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      {/* Description tooltip hint */}
      {description && (
        <div style={{ 
          fontSize: '11px', 
          color: '#9ca3af', 
          marginTop: '6px',
          fontStyle: 'italic',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {description}
        </div>
      )}

      {/* Handle for outgoing connections (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        id="attribute-out"
        isConnectable={true}
        style={{
          background: getTypeColor(),
          width: '10px',
          height: '10px',
          border: '2px solid white'
        }}
      />
    </div>
    </ContextualTooltip>
  );
};

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: NodeProps, nextProps: NodeProps): boolean => {
  const prevData = prevProps.data as AttributeNodeData;
  const nextData = nextProps.data as AttributeNodeData;
  
  return (
    prevProps.selected === nextProps.selected &&
    prevData.isHighlighted === nextData.isHighlighted &&
    prevData.attribute.name === nextData.attribute.name &&
    prevData.attribute.weight === nextData.attribute.weight &&
    prevData.attribute.description === nextData.attribute.description &&
    prevData.attribute.type === nextData.attribute.type
  );
};

export default memo(AttributeNode, arePropsEqual);
