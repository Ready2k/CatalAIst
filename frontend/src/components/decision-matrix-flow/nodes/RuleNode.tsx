import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { RuleNodeData, NODE_COLORS } from '../types/flow-types';
import { ContextualTooltip } from '../help/ContextualTooltip';

const RuleNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { rule, isHighlighted } = data as RuleNodeData;
  const { name, priority, conditions, active, description } = rule;

  // Calculate border thickness based on priority (higher priority = thicker border)
  // Priority range typically 0-100, map to 2-6px border
  const borderThickness = Math.min(2 + (priority / 25), 6);

  // Get color based on active state
  const nodeColor = active ? NODE_COLORS.rule.active : NODE_COLORS.rule.inactive;
  const opacity = active ? 1 : 0.5;

  // Generate tooltip content
  const conditionsSummary = conditions.map(c => `• ${c.attribute} ${c.operator} ${JSON.stringify(c.value)}`).join('\n');
  const tooltipContent = `Rule: ${name} (Priority: ${priority})

${description || 'Custom classification rule'}

This rule triggers when:
${conditionsSummary}

Status: ${active ? '✓ Active' : '✗ Inactive'}

Click to edit conditions or change priority.`;

  return (
    <ContextualTooltip content={tooltipContent} position="auto">
      <div
        data-node-type="rule"
        data-node-id={(data as any).nodeId}
        tabIndex={0}
        role="button"
        aria-label={`Rule: ${name}, Priority: ${priority}, ${active ? 'Active' : 'Inactive'}, ${conditions.length} conditions`}
        className={`rule-node ${selected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${!active ? 'inactive' : ''}`}
        style={{
        background: 'white',
        border: `${borderThickness}px solid ${nodeColor}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '220px',
        opacity,
        filter: active ? 'none' : 'grayscale(100%)',
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        outline: selected ? `3px solid ${nodeColor}` : 'none',
        outlineOffset: '2px'
      }}
    >
      {/* Priority badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '18px', marginRight: '6px' }}>⚡</span>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: nodeColor,
              color: 'white'
            }}
          >
            Priority: {priority}
          </span>
        </div>
        {/* Active indicator */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: active ? '#10b981' : '#ef4444',
              marginRight: '4px'
            }}
          />
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Rule name */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937' }}>
          {name}
        </span>
      </div>

      {/* Condition count */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
          Conditions:
        </span>
        <span
          style={{
            marginLeft: '6px',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#f3f4f6',
            color: '#374151'
          }}
        >
          {conditions.length}
        </span>
      </div>

      {/* Handle for incoming connections (left side - from conditions) */}
      <Handle
        type="target"
        position={Position.Left}
        id="rule-in"
        style={{
          background: nodeColor,
          width: '10px',
          height: '10px',
          border: '2px solid white',
          top: '50%'
        }}
      />

      {/* Handle for outgoing connections (right side - to actions) */}
      <Handle
        type="source"
        position={Position.Right}
        id="rule-out"
        style={{
          background: nodeColor,
          width: '10px',
          height: '10px',
          border: '2px solid white',
          top: '50%'
        }}
      />
    </div>
    </ContextualTooltip>
  );
};

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: NodeProps, nextProps: NodeProps): boolean => {
  const prevData = prevProps.data as RuleNodeData;
  const nextData = nextProps.data as RuleNodeData;
  
  return (
    prevProps.selected === nextProps.selected &&
    prevData.isHighlighted === nextData.isHighlighted &&
    prevData.rule.name === nextData.rule.name &&
    prevData.rule.priority === nextData.rule.priority &&
    prevData.rule.active === nextData.rule.active &&
    prevData.rule.conditions.length === nextData.rule.conditions.length &&
    prevData.rule.description === nextData.rule.description
  );
};

export default memo(RuleNode, arePropsEqual);
