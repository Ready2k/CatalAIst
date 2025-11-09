import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CategoryNodeData, NODE_COLORS, CATEGORY_DESCRIPTIONS } from '../types/flow-types';
import { ContextualTooltip } from '../help/ContextualTooltip';

const CategoryNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { category, isHighlighted } = data as CategoryNodeData;
  const description = CATEGORY_DESCRIPTIONS[category] || 'Classification category';

  // Get icon based on category
  const getCategoryIcon = () => {
    switch (category) {
      case 'Eliminate':
        return '🗑️';
      case 'Simplify':
        return '✂️';
      case 'Digitise':
        return '💻';
      case 'RPA':
        return '🤖';
      case 'AI Agent':
        return '🧠';
      case 'Agentic AI':
        return '🚀';
      default:
        return '📦';
    }
  };

  // Get color based on category (with fallback for custom categories)
  const nodeColor = NODE_COLORS.category[category] || '#94a3b8'; // gray fallback

  // Generate tooltip content
  const tooltipContent = `Category: ${category}

${description}

This is a final classification outcome. Rules can override the AI's suggestion to force this category.`;

  return (
    <ContextualTooltip content={tooltipContent} position="auto">
      <div
        data-node-type="category"
        data-node-id={(data as any).nodeId}
        tabIndex={0}
        role="button"
        aria-label={`Category: ${category}, ${description}`}
        className={`category-node ${selected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
        style={{
        background: 'white',
        border: `3px solid ${nodeColor}`,
        borderRadius: '10px',
        padding: '16px',
        minWidth: '200px',
        minHeight: '100px',
        boxShadow: selected ? '0 6px 16px rgba(0,0,0,0.2)' : '0 4px 10px rgba(0,0,0,0.12)',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        outline: selected ? `3px solid ${nodeColor}` : 'none',
        outlineOffset: '2px'
      }}
    >
      {/* Category icon and name */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '8px',
        justifyContent: 'center'
      }}>
        <span style={{ fontSize: '24px', marginRight: '8px' }}>
          {getCategoryIcon()}
        </span>
        <span style={{ 
          fontWeight: 700, 
          fontSize: '16px', 
          color: nodeColor,
          textAlign: 'center'
        }}>
          {category}
        </span>
      </div>

      {/* Description */}
      <div style={{ 
        fontSize: '12px', 
        color: '#6b7280', 
        textAlign: 'center',
        lineHeight: '1.4',
        fontStyle: 'italic'
      }}>
        {description}
      </div>

      {/* Handle for incoming connections (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        id="category-in"
        style={{
          background: nodeColor,
          width: '12px',
          height: '12px',
          border: '2px solid white'
        }}
      />
    </div>
    </ContextualTooltip>
  );
};

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: NodeProps, nextProps: NodeProps): boolean => {
  const prevData = prevProps.data as CategoryNodeData;
  const nextData = nextProps.data as CategoryNodeData;
  
  return (
    prevProps.selected === nextProps.selected &&
    prevData.isHighlighted === nextData.isHighlighted &&
    prevData.category === nextData.category
  );
};

export default memo(CategoryNode, arePropsEqual);
