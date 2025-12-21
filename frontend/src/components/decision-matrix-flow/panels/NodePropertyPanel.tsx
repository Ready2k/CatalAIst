import React, { useEffect, useCallback } from 'react';
import { FlowNode } from '../types/flow-types';

interface NodePropertyPanelProps {
  selectedNode: FlowNode | null;
  onClose: () => void;
  onSave: (node: FlowNode) => void;
  onCancel: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
  title: string;
  isDirty: boolean;
  hasErrors?: boolean;
}

const NodePropertyPanel: React.FC<NodePropertyPanelProps> = ({
  selectedNode,
  onClose,
  onSave,
  onCancel,
  onDelete,
  children,
  title,
  isDirty,
  hasErrors = false
}) => {
  // Handle escape key to close panel
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (isDirty) {
        const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
        if (confirmClose) {
          onClose();
        }
      } else {
        onClose();
      }
    }
  }, [isDirty, onClose]);

  useEffect(() => {
    if (selectedNode) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [selectedNode, handleEscapeKey]);

  // Detect screen size for responsive design (must be before early return)
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Don't render if no node is selected
  if (!selectedNode) {
    return null;
  }

  const handleSaveClick = () => {
    onSave(selectedNode);
  };

  const handleCancelClick = () => {
    if (isDirty) {
      const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (confirmCancel) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  const handleCloseClick = () => {
    if (isDirty) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (confirmClose) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: isMobile ? '100%' : (isTablet ? '350px' : '400px'),
        backgroundColor: 'white',
        boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        animation: 'slideIn 0.3s ease-out'
      }}
      role="dialog"
      aria-label={`${title} property editor`}
      aria-modal="true"
    >
      {/* Header */}
      <div
        style={{
          padding: isMobile ? '12px 16px' : '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f9fafb'
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: '#1f2937'
          }}
        >
          {title}
        </h3>
        <button
          onClick={handleCloseClick}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '0',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Close (Esc)"
        >
          ×
        </button>
      </div>

      {/* Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '16px' : '20px',
          WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
        }}
      >
        {children}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          padding: isMobile ? '12px 16px' : '16px 20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '8px' : '12px',
          backgroundColor: '#f9fafb'
        }}
      >
        {onDelete && (
          <button
            onClick={() => {
              const confirmed = window.confirm('Are you sure you want to delete this node? This action cannot be undone.');
              if (confirmed) {
                onDelete();
              }
            }}
            style={{
              padding: '10px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
            }}
            title="Delete this node"
          >
            🗑️ Delete
          </button>
        )}
        <button
          onClick={handleSaveClick}
          disabled={!isDirty || hasErrors}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: (isDirty && !hasErrors) ? '#3b82f6' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: (isDirty && !hasErrors) ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
            opacity: (isDirty && !hasErrors) ? 1 : 0.6
          }}
          onMouseEnter={(e) => {
            if (isDirty && !hasErrors) {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }
          }}
          onMouseLeave={(e) => {
            if (isDirty && !hasErrors) {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }
          }}
          title={hasErrors ? 'Fix validation errors before saving' : 'Save changes'}
        >
          Save Changes
        </button>
        <button
          onClick={handleCancelClick}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          Cancel
        </button>
      </div>

      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default NodePropertyPanel;
