import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ConditionNodeData, NODE_COLORS } from '../types/flow-types';
import { ContextualTooltip } from '../help/ContextualTooltip';

const ConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { condition, isHighlighted } = data as ConditionNodeData;
  const { attribute, operator, value } = condition;

  // Format value display for arrays (in/not_in operators)
  const formatValue = (val: any, op: string): string => {
    if (op === 'in' || op === 'not_in') {
      if (Array.isArray(val)) {
        return `[${val.join(', ')}]`;
      }
    }
    if (typeof val === 'string') {
      return `"${val}"`;
    }
    return String(val);
  };

  // Use cyan color for condition nodes
  const nodeColor = NODE_COLORS.condition;

  // Generate tooltip content
  const tooltipContent = `Condition: ${attribute} ${operator} ${formatValue(value, operator)}

This condition checks if the ${attribute} attribute matches the specified criteria.

The rule will only trigger if ALL conditions are met (AND logic).`;

  return (
    <ContextualTooltip content={tooltipContent} position="auto">
      <div
        data-node-type="condition"
        data-node-id={(data as any).nodeId}
        tabIndex={0}
        role="button"
        aria-label={`Condition: ${attribute} ${operator} ${formatValue(value, operator)}`}
        className={`condition-node ${selected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
        style={{
        background: 'white',
        border: `2px solid ${nodeColor}`,
        borderRadius: '6px',
        padding: '8px 12px',
        minWidth: '180px',
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        outline: selected ? `3px solid ${nodeColor}` : 'none',
        outlineOffset: '2px'
      }}
    >
      {/* Condition expression */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '4px'
      }}>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: '#1f2937',
          fontFamily: 'monospace'
        }}>
          {attribute}
        </span>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: 500, 
          color: nodeColor,
          fontFamily: 'monospace'
        }}>
          {operator}
        </span>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: '#374151',
          fontFamily: 'monospace',
          wordBreak: 'break-word'
        }}>
          {formatValue(value, operator)}
        </span>
      </div>

      {/* Handle for incoming connections (left side - from attribute) */}
      <Handle
        type="target"
        position={Position.Left}
        id="condition-in"
        style={{
          background: nodeColor,
          width: '8px',
          height: '8px',
          border: '2px solid white'
        }}
      />

      {/* Handle for outgoing connections (right side - to rule) */}
      <Handle
        type="source"
        position={Position.Right}
        id="condition-out"
        style={{
          background: nodeColor,
          width: '8px',
          height: '8px',
          border: '2px solid white'
        }}
      />
    </div>
    </ContextualTooltip>
  );
};

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: NodeProps, nextProps: NodeProps): boolean => {
  const prevData = prevProps.data as ConditionNodeData;
  const nextData = nextProps.data as ConditionNodeData;
  
  return (
    prevProps.selected === nextProps.selected &&
    prevData.isHighlighted === nextData.isHighlighted &&
    prevData.condition.attribute === nextData.condition.attribute &&
    prevData.condition.operator === nextData.condition.operator &&
    JSON.stringify(prevData.condition.value) === JSON.stringify(nextData.condition.value)
  );
};

export default memo(ConditionNode, arePropsEqual);
