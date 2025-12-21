import React, { useState } from 'react';

interface NodeLegendProps {
  onShowFullGuide: () => void;
  onHighlightNodes?: (nodeType: string | null) => void;
}

interface LegendItem {
  type: string;
  icon: string;
  label: string;
  description: string;
  color: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    type: 'attribute',
    icon: '📊',
    label: 'Attribute',
    description: 'Process characteristics. Size = weight importance',
    color: '#3b82f6'
  },
  {
    type: 'rule',
    icon: '⚡',
    label: 'Rule',
    description: 'Your custom logic. Border = priority level. Gray = inactive',
    color: '#8b5cf6'
  },
  {
    type: 'condition',
    icon: '◆',
    label: 'Condition',
    description: 'When rule applies (e.g., frequency == "daily")',
    color: '#6b7280'
  },
  {
    type: 'action',
    icon: '🎯',
    label: 'Action',
    description: 'What happens: Override / Adjust / Flag',
    color: '#10b981'
  },
  {
    type: 'category',
    icon: '🤖',
    label: 'Category',
    description: 'Final classification (6 transformation types)',
    color: '#f59e0b'
  }
];

export const NodeLegend: React.FC<NodeLegendProps> = ({ onShowFullGuide, onHighlightNodes }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const handleItemClick = (type: string) => {
    if (onHighlightNodes) {
      onHighlightNodes(hoveredType === type ? null : type);
      setHoveredType(hoveredType === type ? null : type);
    }
  };

  if (isCollapsed) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          padding: '12px',
          cursor: 'pointer',
          zIndex: 1000,
          border: '1px solid #e5e7eb'
        }}
        onClick={() => setIsCollapsed(false)}
        title="Show Legend"
      >
        <div style={{ fontSize: '20px' }}>📖</div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        padding: '16px',
        width: '280px',
        zIndex: 1000,
        border: '1px solid #e5e7eb'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
          Legend
        </h3>
        <button
          onClick={() => setIsCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            color: '#6b7280'
          }}
          title="Collapse Legend"
        >
          −
        </button>
      </div>

      {/* Legend Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {LEGEND_ITEMS.map((item) => (
          <div
            key={item.type}
            onClick={() => handleItemClick(item.type)}
            onMouseEnter={() => onHighlightNodes && onHighlightNodes(item.type)}
            onMouseLeave={() => onHighlightNodes && onHighlightNodes(null)}
            style={{
              display: 'flex',
              gap: '12px',
              padding: '8px',
              borderRadius: '6px',
              cursor: onHighlightNodes ? 'pointer' : 'default',
              backgroundColor: hoveredType === item.type ? '#f3f4f6' : 'transparent',
              transition: 'background-color 0.2s',
              border: hoveredType === item.type ? `2px solid ${item.color}` : '2px solid transparent'
            }}
          >
            <div style={{ fontSize: '20px', flexShrink: 0 }}>
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937', marginBottom: '2px' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show Full Guide Button */}
      <button
        onClick={onShowFullGuide}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #3b82f6',
          borderRadius: '6px',
          backgroundColor: 'white',
          color: '#3b82f6',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        <span>?</span>
        <span>Show Full Guide</span>
      </button>
    </div>
  );
};
