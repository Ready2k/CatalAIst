import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ActionNodeData, NODE_COLORS } from '../types/flow-types';
import { ContextualTooltip } from '../help/ContextualTooltip';

const ActionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { action, isHighlighted } = data as ActionNodeData;
  const { type, targetCategory, confidenceAdjustment, rationale } = action;

  // Get icon and color based on action type
  const getActionIcon = () => {
    switch (type) {
      case 'override':
        return '🎯';
      case 'adjust_confidence':
        return '📊';
      case 'flag_review':
        return '⚠️';
      default:
        return '•';
    }
  };

  const getActionColor = () => {
    const actionColors = NODE_COLORS.action;
    if (type === 'override') return actionColors.override;
    if (type === 'adjust_confidence') return actionColors.adjust_confidence;
    if (type === 'flag_review') return actionColors.flag_review;
    return actionColors.override; // fallback
  };

  // Format action description
  const getActionDescription = () => {
    switch (type) {
      case 'override':
        return `→ ${targetCategory}`;
      case 'adjust_confidence':
        const sign = confidenceAdjustment && confidenceAdjustment > 0 ? '+' : '';
        return `${sign}${confidenceAdjustment?.toFixed(2)}`;
      case 'flag_review':
        return 'Manual Review';
      default:
        return '';
    }
  };

  // Get action type label
  const getActionTypeLabel = () => {
    switch (type) {
      case 'override':
        return 'Override';
      case 'adjust_confidence':
        return 'Adjust Confidence';
      case 'flag_review':
        return 'Flag Review';
      default:
        return type;
    }
  };

  const nodeColor = getActionColor();

  // Generate tooltip content
  const getTooltipContent = () => {
    let content = `Action: ${getActionTypeLabel()}\n\n`;
    
    switch (type) {
      case 'override':
        content += `This action forces the classification to ${targetCategory}, ignoring the AI's suggestion.\n\nUse override actions when you have specific business requirements that must be followed.`;
        break;
      case 'adjust_confidence':
        const adjustment = confidenceAdjustment || 0;
        content += `This action ${adjustment > 0 ? 'boosts' : 'reduces'} the AI's confidence by ${Math.abs(adjustment).toFixed(2)}.\n\nUse confidence adjustments to fine-tune classifications without completely overriding them.`;
        break;
      case 'flag_review':
        content += `This action marks the process for manual review by a human.\n\nUse flag_review for edge cases or high-risk processes that need human judgment.`;
        break;
    }
    
    if (rationale) {
      content += `\n\nRationale: ${rationale}`;
    }
    
    return content;
  };

  return (
    <ContextualTooltip content={getTooltipContent()} position="auto">
      <div
        data-node-type="action"
        data-node-id={(data as any).nodeId}
        tabIndex={0}
        role="button"
        aria-label={`Action: ${getActionTypeLabel()}, ${getActionDescription()}`}
        className={`action-node ${selected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
        style={{
        background: 'white',
        border: `2px solid ${nodeColor}`,
        borderRadius: '8px',
        padding: '10px 12px',
        minWidth: '180px',
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        outline: selected ? `3px solid ${nodeColor}` : 'none',
        outlineOffset: '2px'
      }}
    >
      {/* Action type header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px', marginRight: '6px' }}>
          {getActionIcon()}
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: nodeColor
          }}
        >
          {getActionTypeLabel()}
        </span>
      </div>

      {/* Action description */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginBottom: '6px'
      }}>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: 700, 
          color: '#1f2937'
        }}>
          {getActionDescription()}
        </span>
      </div>

      {/* Rationale hint */}
      {rationale && (
        <div style={{ 
          fontSize: '11px', 
          color: '#9ca3af', 
          marginTop: '4px',
          fontStyle: 'italic',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {rationale}
        </div>
      )}

      {/* Handle for incoming connections (left side - from rule) */}
      <Handle
        type="target"
        position={Position.Left}
        id="action-in"
        style={{
          background: nodeColor,
          width: '10px',
          height: '10px',
          border: '2px solid white'
        }}
      />

      {/* Handle for outgoing connections (right side - to category) */}
      <Handle
        type="source"
        position={Position.Right}
        id="action-out"
        style={{
          background: nodeColor,
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
  const prevData = prevProps.data as ActionNodeData;
  const nextData = nextProps.data as ActionNodeData;
  
  return (
    prevProps.selected === nextProps.selected &&
    prevData.isHighlighted === nextData.isHighlighted &&
    prevData.action.type === nextData.action.type &&
    prevData.action.targetCategory === nextData.action.targetCategory &&
    prevData.action.confidenceAdjustment === nextData.action.confidenceAdjustment &&
    prevData.action.rationale === nextData.action.rationale
  );
};

export default memo(ActionNode, arePropsEqual);
