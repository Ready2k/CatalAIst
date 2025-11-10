import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { DecisionMatrix } from '../../../shared/types';
import {
  AttributeNode,
  RuleNode,
  ConditionNode,
  ActionNode,
  CategoryNode,
} from './decision-matrix-flow/nodes';
import {
  AttributePropertyPanel,
  RulePropertyPanel,
  ActionPropertyPanel,
  ValidationSummary,
} from './decision-matrix-flow/panels';
import {
  matrixToFlow,
  flowToMatrix,
  validateMatrix,
  useDebounce,
  performanceMonitor,
  usePerformanceMonitor,
  useMeasureInteraction,
} from './decision-matrix-flow/utils';
import {
  FlowNode,
  CustomEdge,
  ValidationError,
} from './decision-matrix-flow/types/flow-types';
import {
  WelcomeTour,
  NodeLegend,
  HelpPanel,
  shouldShowTour,
} from './decision-matrix-flow/help';

interface DecisionMatrixFlowEditorProps {
  matrix: DecisionMatrix;
  onSave: (matrix: DecisionMatrix) => Promise<void>;
  onCancel: () => void;
  readOnly?: boolean;
}

// Define custom node types for ReactFlow
// @ts-ignore - ReactFlow node type compatibility
const nodeTypes = {
  attribute: AttributeNode,
  rule: RuleNode,
  condition: ConditionNode,
  action: ActionNode,
  category: CategoryNode,
};

const DecisionMatrixFlowEditorInner: React.FC<DecisionMatrixFlowEditorProps> = ({
  matrix,
  onSave,
  onCancel,
  readOnly = false,
}) => {
  const { fitView } = useReactFlow();
  
  // Performance monitoring
  usePerformanceMonitor('DecisionMatrixFlowEditor');
  const measureInteraction = useMeasureInteraction();
  
  // Responsive design - detect screen size
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Initialize nodes and edges from decision matrix
  const initialFlow = useMemo(() => {
    performanceMonitor.startMeasure('initial-render');
    
    // Auto-fix invalid categories in the matrix before converting to flow
    const fixedMatrix = {
      ...matrix,
      rules: matrix.rules.map(rule => ({
        ...rule,
        action: rule.action.type === 'override' && (rule.action.targetCategory as string) === 'Eliminate or Simplify'
          ? { ...rule.action, targetCategory: 'Eliminate' as any }
          : rule.action
      }))
    };
    
    const flow = matrixToFlow(fixedMatrix);
    performanceMonitor.endMeasure('initial-render');
    return flow;
  }, [matrix]);
  
  const [allNodes, setAllNodes] = useState<FlowNode[]>(initialFlow.nodes);
  const [edges, setEdges] = useState<CustomEdge[]>(initialFlow.edges);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState('');
  const [showUnusedNodes, setShowUnusedNodes] = useState(false);
  
  // Filter nodes based on showUnusedNodes toggle
  const nodes = useMemo(() => {
    if (showUnusedNodes) {
      return allNodes;
    }
    
    // Filter out unused nodes
    const usedNodeIds = new Set<string>();
    
    // All edges reference used nodes
    edges.forEach(edge => {
      usedNodeIds.add(edge.source);
      usedNodeIds.add(edge.target);
    });
    
    // Filter nodes to only show used ones
    return allNodes.filter(node => usedNodeIds.has(node.id));
  }, [allNodes, edges, showUnusedNodes]);

  // Debounced validation (200ms delay)
  const debouncedValidate = useDebounce((currentNodes: FlowNode[], currentEdges: CustomEdge[]) => {
    // Extract attributes and rules from nodes
    const attributes = currentNodes
      .filter(node => node.type === 'attribute')
      .map(node => (node.data as any).attribute)
      .filter(Boolean);
    
    const rules = currentNodes
      .filter(node => node.type === 'rule')
      .map(node => (node.data as any).rule)
      .filter(Boolean);
    
    const errors = validateMatrix(attributes, rules);
    setValidationErrors(errors);
  }, 200);

  // Validate matrix whenever nodes change
  useEffect(() => {
    debouncedValidate(allNodes, edges);
  }, [allNodes, edges, debouncedValidate]);

  // Fit view on initial load
  useEffect(() => {
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
      
      // Check performance budgets after initial render
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          performanceMonitor.checkBudgets([
            { name: 'initial-render', budget: 2000 }, // 2 seconds for initial render
            { name: 'node-click', budget: 100 }, // 100ms for node interaction
            { name: 'property-update', budget: 200 }, // 200ms for property updates
          ]);
          performanceMonitor.logSummary();
        }, 1000);
      }
    }, 100);
  }, [fitView]);

  // Check if tour should be shown on first load
  useEffect(() => {
    if (shouldShowTour()) {
      setShowTour(true);
    }
  }, []);

  // Handle node changes (position, selection, etc.)
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setAllNodes((nds) => applyNodeChanges(changes, nds) as FlowNode[]);
      setIsDirty(true);
    },
    []
  );

  // Handle edge changes
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds) as CustomEdge[]);
      setIsDirty(true);
    },
    []
  );

  // Handle new connection creation
  const onConnect = useCallback(
    (connection: any) => {
      if (readOnly) return;
      
      const sourceNode = allNodes.find(n => n.id === connection.source);
      const targetNode = allNodes.find(n => n.id === connection.target);
      
      if (!sourceNode || !targetNode) return;
      
      // Only allow attribute -> condition connections
      if (sourceNode.type === 'attribute' && targetNode.type === 'condition') {
        // Update the condition to reference the new attribute
        const conditionData = targetNode.data as any;
        const attributeData = sourceNode.data as any;
        
        setAllNodes((nds) =>
          nds.map((node) => {
            if (node.id === targetNode.id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  condition: {
                    ...conditionData.condition,
                    attribute: attributeData.attribute.name
                  }
                }
              };
            }
            return node;
          })
        );
        
        // Add the edge
        const newEdge: CustomEdge = {
          id: `edge-${connection.source}-${connection.target}`,
          source: connection.source,
          target: connection.target,
          type: 'condition',
          animated: false,
          data: { animated: false }
        };
        
        setEdges((eds) => [...eds, newEdge]);
        setIsDirty(true);
        
        setScreenReaderAnnouncement(
          `Connected ${attributeData.attribute.name} to condition. Condition now checks ${attributeData.attribute.name}.`
        );
      } else {
        // Invalid connection
        setScreenReaderAnnouncement(
          `Invalid connection. You can only connect attributes to conditions.`
        );
      }
    },
    [allNodes, readOnly]
  );

  // Handle edge deletion
  const onEdgesDelete = useCallback(
    (edgesToDelete: any[]) => {
      if (readOnly) return;
      
      edgesToDelete.forEach(edge => {
        const sourceNode = allNodes.find(n => n.id === edge.source);
        const targetNode = allNodes.find(n => n.id === edge.target);
        
        if (sourceNode?.type === 'attribute' && targetNode?.type === 'condition') {
          setScreenReaderAnnouncement(
            `Disconnected ${(sourceNode.data as any).attribute.name} from condition. Condition may need updating.`
          );
        }
      });
      
      setIsDirty(true);
    },
    [allNodes, readOnly]
  );

  // Handle node click for property panel display
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!readOnly) {
        measureInteraction('node-click', () => {
          setSelectedNode(node as FlowNode);
          
          // Announce node selection to screen readers
          const flowNode = node as FlowNode;
          let announcement = '';
          
          switch (flowNode.type) {
            case 'attribute':
              const attrData = flowNode.data as any;
              announcement = `Selected attribute: ${attrData.attribute.name}, type: ${attrData.attribute.type}, weight: ${attrData.attribute.weight.toFixed(2)}. Property panel opened.`;
              break;
            case 'rule':
              const ruleData = flowNode.data as any;
              announcement = `Selected rule: ${ruleData.rule.name}, priority: ${ruleData.rule.priority}, ${ruleData.rule.active ? 'active' : 'inactive'}, ${ruleData.rule.conditions.length} conditions. Property panel opened.`;
              break;
            case 'action':
              const actionData = flowNode.data as any;
              announcement = `Selected action: ${actionData.action.type}. Property panel opened.`;
              break;
            case 'condition':
              const condData = flowNode.data as any;
              announcement = `Selected condition: ${condData.condition.attribute} ${condData.condition.operator} ${JSON.stringify(condData.condition.value)}`;
              break;
            case 'category':
              const catData = flowNode.data as any;
              announcement = `Selected category: ${catData.category}`;
              break;
          }
          
          setScreenReaderAnnouncement(announcement);
        });
      }
    },
    [readOnly, measureInteraction]
  );

  // Handle pane click to deselect node
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle node mouse enter for hover effects
  const onNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setAllNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? ({ ...n, data: { ...n.data, isHighlighted: true } } as FlowNode)
            : n
        )
      );
    },
    []
  );

  // Handle node mouse leave to remove hover effects
  const onNodeMouseLeave = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setAllNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? ({ ...n, data: { ...n.data, isHighlighted: false } } as FlowNode)
            : n
        )
      );
    },
    []
  );

  // Handle attribute save
  const handleAttributeSave = useCallback(
    (updatedAttribute: any) => {
      if (!selectedNode) return;
      measureInteraction('property-update', () => {
        // @ts-ignore - Type assertion needed for complex union types
        setAllNodes((nds) =>
          nds.map((node) =>
            node.id === selectedNode.id
              ? { ...node, data: { ...node.data, attribute: updatedAttribute } }
              : node
          )
        );
        setIsDirty(true);
        setSelectedNode(null);
      });
    },
    [selectedNode, measureInteraction]
  );

  // Handle rule save
  const handleRuleSave = useCallback(
    (updatedRule: any) => {
      if (!selectedNode) return;
      measureInteraction('property-update', () => {
        // @ts-ignore - Type assertion needed for complex union types
        setAllNodes((nds) =>
          nds.map((node) =>
            node.id === selectedNode.id
              ? { ...node, data: { ...node.data, rule: updatedRule } }
              : node
          )
        );
        setIsDirty(true);
        setSelectedNode(null);
      });
    },
    [selectedNode, measureInteraction]
  );

  // Handle action save
  const handleActionSave = useCallback(
    (updatedAction: any) => {
      if (!selectedNode) return;
      measureInteraction('property-update', () => {
        // @ts-ignore - Type assertion needed for complex union types
        setAllNodes((nds) =>
          nds.map((node) =>
            node.id === selectedNode.id
              ? { ...node, data: { ...node.data, action: updatedAction } }
              : node
          )
        );
        setIsDirty(true);
        setSelectedNode(null);
      });
    },
    [selectedNode, measureInteraction]
  );

  // Handle property panel close
  const handlePropertyPanelClose = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle property panel cancel
  const handlePropertyPanelCancel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key - deselect node or close panels
      if (event.key === 'Escape') {
        if (selectedNode) {
          setSelectedNode(null);
          event.preventDefault();
        }
      }

      // Enter key - select/edit focused node
      if (event.key === 'Enter') {
        const focusedElement = document.activeElement;
        if (focusedElement && focusedElement.hasAttribute('data-node-id')) {
          const nodeId = focusedElement.getAttribute('data-node-id');
          const node = nodes.find(n => n.id === nodeId);
          if (node && !readOnly) {
            setSelectedNode(node);
            event.preventDefault();
          }
        }
      }

      // Arrow key navigation between connected nodes
      if (selectedNode && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        
        let targetNodeId: string | null = null;

        if (event.key === 'ArrowRight') {
          // Navigate to connected nodes on the right (outgoing edges)
          const outgoingEdge = edges.find(e => e.source === selectedNode.id);
          if (outgoingEdge) {
            targetNodeId = outgoingEdge.target;
          }
        } else if (event.key === 'ArrowLeft') {
          // Navigate to connected nodes on the left (incoming edges)
          const incomingEdge = edges.find(e => e.target === selectedNode.id);
          if (incomingEdge) {
            targetNodeId = incomingEdge.source;
          }
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          // Navigate to nodes of the same type (up/down)
          const sameTypeNodes = nodes.filter(n => n.type === selectedNode.type);
          const currentIndex = sameTypeNodes.findIndex(n => n.id === selectedNode.id);
          
          if (event.key === 'ArrowUp' && currentIndex > 0) {
            targetNodeId = sameTypeNodes[currentIndex - 1].id;
          } else if (event.key === 'ArrowDown' && currentIndex < sameTypeNodes.length - 1) {
            targetNodeId = sameTypeNodes[currentIndex + 1].id;
          }
        }

        if (targetNodeId) {
          const targetNode = nodes.find(n => n.id === targetNodeId);
          if (targetNode) {
            setSelectedNode(targetNode);
            // Focus the target node element
            const nodeElement = document.querySelector(`[data-node-id="${targetNodeId}"]`);
            if (nodeElement instanceof HTMLElement) {
              nodeElement.focus();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, nodes, edges, readOnly]);

  // Handle adding a new rule
  const handleAddRule = useCallback(() => {
    const newRuleId = `rule-${Date.now()}`;
    const ruleCount = allNodes.filter(n => n.type === 'rule').length;
    
    // Create new rule
    const newRule: any = {
      ruleId: newRuleId,
      name: `New Rule ${ruleCount + 1}`,
      description: 'New rule description',
      priority: 50,
      active: true,
      conditions: [],
      action: {
        type: 'adjust_confidence',
        confidenceAdjustment: 0
      }
    };
    
    // Create rule node
    const ruleNode: FlowNode = {
      id: `rule-${newRuleId}`,
      type: 'rule',
      position: { x: 400, y: ruleCount * 150 },
      data: {
        label: newRule.name,
        rule: newRule,
        isHighlighted: false,
        nodeId: `rule-${newRuleId}`
      } as any,
      width: 220,
      height: 100
    };
    
    // Create action node
    const actionNode: FlowNode = {
      id: `action-${newRuleId}`,
      type: 'action',
      position: { x: 700, y: ruleCount * 150 },
      data: {
        label: 'Adjust Confidence',
        action: newRule.action,
        parentRuleId: newRuleId,
        isHighlighted: false,
        nodeId: `action-${newRuleId}`
      } as any,
      width: 180,
      height: 70
    };
    
    // Create edge from rule to action
    const ruleToActionEdge: CustomEdge = {
      id: `edge-rule-${newRuleId}-action-${newRuleId}`,
      source: `rule-${newRuleId}`,
      target: `action-${newRuleId}`,
      type: 'flow',
      animated: false,
      data: { animated: false }
    };
    
    setAllNodes((nds) => [...nds, ruleNode, actionNode]);
    setEdges((eds) => [...eds, ruleToActionEdge]);
    setIsDirty(true);
    setSelectedNode(ruleNode);
    
    setScreenReaderAnnouncement(
      `Added new rule: ${newRule.name}. You can now add conditions by connecting attributes to the rule.`
    );
  }, [allNodes]);

  // Handle adding a condition to a rule
  const handleAddCondition = useCallback((ruleId: string) => {
    const ruleNode = allNodes.find(n => n.type === 'rule' && (n.data as any).rule.ruleId === ruleId);
    if (!ruleNode) return;
    
    const existingConditions = allNodes.filter(
      n => n.type === 'condition' && (n.data as any).parentRuleId === ruleId
    );
    
    const conditionIndex = existingConditions.length;
    
    // Create new condition with placeholder values
    const newCondition: any = {
      attribute: 'Select Attribute',
      operator: 'equals',
      value: ''
    };
    
    // Create condition node
    const conditionNode: FlowNode = {
      id: `cond-${ruleId}-${conditionIndex}`,
      type: 'condition',
      position: { 
        x: ruleNode.position.x - 250, 
        y: ruleNode.position.y + (conditionIndex * 80) 
      },
      data: {
        label: 'Select Attribute = ""',
        condition: newCondition,
        parentRuleId: ruleId,
        isHighlighted: false,
        nodeId: `cond-${ruleId}-${conditionIndex}`
      } as any,
      width: 180,
      height: 60
    };
    
    // Create edge from condition to rule
    const condToRuleEdge: CustomEdge = {
      id: `edge-cond-${ruleId}-${conditionIndex}-rule-${ruleId}`,
      source: `cond-${ruleId}-${conditionIndex}`,
      target: `rule-${ruleId}`,
      type: 'condition',
      animated: false,
      data: { animated: false }
    };
    
    setAllNodes((nds) => [...nds, conditionNode]);
    setEdges((eds) => [...eds, condToRuleEdge]);
    setIsDirty(true);
    
    setScreenReaderAnnouncement(
      `Added new condition to rule. Connect an attribute to this condition to complete it.`
    );
  }, [allNodes]);

  // Handle deleting a node
  const handleDeleteNode = useCallback((nodeId: string) => {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Prevent deleting attribute and category nodes
    if (node.type === 'attribute' || node.type === 'category') {
      setScreenReaderAnnouncement(
        `Cannot delete ${node.type} nodes. These are part of the matrix structure.`
      );
      return;
    }
    
    // If deleting a rule, also delete its conditions and action
    if (node.type === 'rule') {
      const ruleId = (node.data as any).rule.ruleId;
      const relatedNodeIds = allNodes
        .filter(n => 
          (n.type === 'condition' && (n.data as any).parentRuleId === ruleId) ||
          (n.type === 'action' && (n.data as any).parentRuleId === ruleId)
        )
        .map(n => n.id);
      
      setAllNodes((nds) => nds.filter(n => n.id !== nodeId && !relatedNodeIds.includes(n.id)));
      setEdges((eds) => eds.filter(e => 
        e.source !== nodeId && 
        e.target !== nodeId &&
        !relatedNodeIds.includes(e.source) &&
        !relatedNodeIds.includes(e.target)
      ));
      
      setScreenReaderAnnouncement(`Deleted rule and its related conditions and action.`);
    } else {
      // Delete single node and its edges
      setAllNodes((nds) => nds.filter(n => n.id !== nodeId));
      setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
      
      setScreenReaderAnnouncement(`Deleted ${node.type} node.`);
    }
    
    setIsDirty(true);
    setSelectedNode(null);
  }, [allNodes]);

  // Handle save operation
  const handleSave = useCallback(async () => {
    // Check for validation errors
    if (validationErrors.some((error) => error.severity === 'error')) {
      alert('Please fix all validation errors before saving.');
      return;
    }

    // Check for invalid categories
    const validCategories = ['Eliminate', 'Simplify', 'Digitise', 'RPA', 'AI Agent', 'Agentic AI'];
    const invalidCategories: string[] = [];
    
    allNodes.forEach(node => {
      if (node.type === 'action') {
        const action = (node.data as any).action;
        if (action.type === 'override' && action.targetCategory) {
          if (!validCategories.includes(action.targetCategory)) {
            invalidCategories.push(action.targetCategory);
          }
        }
      }
    });
    
    if (invalidCategories.length > 0) {
      const uniqueInvalid = [...new Set(invalidCategories)];
      alert(`Cannot save: The following categories are not valid: ${uniqueInvalid.join(', ')}\n\nValid categories are: ${validCategories.join(', ')}\n\nPlease edit the action nodes to use valid categories.`);
      return;
    }

    setIsSaving(true);
    try {
      // Convert flow back to decision matrix with performance tracking
      await performanceMonitor.measureAsync('save-operation', async () => {
        const updatedMatrix = flowToMatrix(allNodes, edges, matrix);
        await onSave(updatedMatrix);
      });
      
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save decision matrix:', error);
      alert('Failed to save decision matrix. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [allNodes, edges, matrix, validationErrors, onSave]);

  // Handle cancel operation
  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) {
        return;
      }
    }
    onCancel();
  }, [isDirty, onCancel]);

  // Handle fit view button
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Main ReactFlow component */}
      <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          // @ts-ignore - ReactFlow node type compatibility
          nodeTypes={nodeTypes}
          fitView
          minZoom={isMobile ? 0.2 : 0.1}
          maxZoom={isMobile ? 1.5 : 2}
          nodesDraggable={!readOnly && !isMobile}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          panOnScroll={!isMobile}
          panOnDrag={!isMobile}
          zoomOnScroll={!isMobile}
          zoomOnPinch={isMobile}
          zoomOnDoubleClick={!isMobile}
          connectionMode="loose"
          defaultEdgeOptions={{
            animated: false,
            style: { stroke: '#94a3b8', strokeWidth: isMobile ? 1.5 : 2 },
          }}
          isValidConnection={(connection) => {
            // Only allow attribute -> condition connections
            const sourceNode = allNodes.find(n => n.id === connection.source);
            const targetNode = allNodes.find(n => n.id === connection.target);
            
            if (!sourceNode || !targetNode) return false;
            
            // Allow attribute -> condition
            if (sourceNode.type === 'attribute' && targetNode.type === 'condition') {
              return true;
            }
            
            return false;
          }}
          aria-label="Decision matrix flow diagram. Use arrow keys to navigate between connected nodes, Enter to select, Escape to deselect. Drag from attribute nodes to condition nodes to create connections."
        >
        {/* Background pattern */}
        <Background color="#e2e8f0" gap={16} />
        
        {/* Zoom, pan, and fit-view controls */}
        <Controls
          showInteractive={false}
          position="bottom-right"
        />
        
        {/* Minimap for navigation */}
        {/* Only show minimap on larger screens */}
        {!isMobile && (
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'attribute':
                  return '#3b82f6';
                case 'rule':
                  return '#6366f1';
                case 'condition':
                  return '#06b6d4';
                case 'action':
                  return '#10b981';
                case 'category':
                  return '#8b5cf6';
                default:
                  return '#94a3b8';
              }
            }}
            position="bottom-left"
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          />
        )}
      </ReactFlow>

      {/* Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: isMobile ? 8 : 16,
          left: isMobile ? 8 : 16,
          right: selectedNode && !isMobile ? 420 : (isMobile ? 8 : 16),
          zIndex: 10,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 8 : 12,
          alignItems: isMobile ? 'stretch' : 'center',
          backgroundColor: 'white',
          padding: isMobile ? '8px 12px' : '12px 16px',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 600, flex: isMobile ? 'none' : 1 }}>
          {isMobile ? 'DM Flow Editor' : 'Decision Matrix Flow Editor'}
        </h2>

        {/* Help Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: isMobile ? 8 : 12, 
          flexWrap: 'wrap',
          justifyContent: isMobile ? 'space-between' : 'flex-start'
        }}>
        <button
          onClick={() => setShowTour(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
          title="Start Welcome Tour"
          aria-label="Start welcome tour to learn about the decision matrix flow editor"
        >
          🎓 Tour
        </button>

        <button
          onClick={() => setShowLegend(!showLegend)}
          style={{
            padding: '8px 16px',
            backgroundColor: showLegend ? '#3b82f6' : '#f1f5f9',
            color: showLegend ? 'white' : '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
          title="Toggle Legend"
          aria-label={showLegend ? 'Hide node type legend' : 'Show node type legend'}
          aria-pressed={showLegend}
        >
          📖 Legend
        </button>

        <button
          onClick={() => setShowHelp(!showHelp)}
          style={{
            padding: '8px 16px',
            backgroundColor: showHelp ? '#3b82f6' : '#f1f5f9',
            color: showHelp ? 'white' : '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
          title="Open Help Panel"
          aria-label={showHelp ? 'Close help panel' : 'Open help panel'}
          aria-pressed={showHelp}
        >
          ❓ Help
        </button>
        
        <button
          onClick={handleFitView}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
          aria-label="Reset view to fit all nodes in the viewport"
        >
          {isMobile ? 'Reset' : 'Reset View'}
        </button>

        <button
          onClick={() => setShowUnusedNodes(!showUnusedNodes)}
          style={{
            padding: '8px 16px',
            backgroundColor: showUnusedNodes ? '#3b82f6' : '#f1f5f9',
            color: showUnusedNodes ? 'white' : '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
          title={showUnusedNodes ? 'Hide unused nodes' : 'Show unused nodes'}
          aria-label={showUnusedNodes ? 'Hide unused attributes and categories' : 'Show all attributes and categories including unused ones'}
          aria-pressed={showUnusedNodes}
        >
          {isMobile ? (showUnusedNodes ? '👁️' : '👁️‍🗨️') : (showUnusedNodes ? 'Hide Unused' : 'Show All')}
        </button>
        
        {!readOnly && (
          <>
            <button
              onClick={handleAddRule}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
              title="Add new rule"
              aria-label="Add a new rule to the decision matrix"
            >
              {isMobile ? '➕ Rule' : '➕ Add Rule'}
            </button>
          </>
        )}
        </div>

        {!readOnly && (
          <div style={{ 
            display: 'flex', 
            gap: isMobile ? 8 : 12,
            width: isMobile ? '100%' : 'auto'
          }}>
            <button
              onClick={handleSave}
              disabled={isSaving || validationErrors.some((e) => e.severity === 'error')}
              style={{
                padding: '8px 16px',
                backgroundColor: isSaving ? '#94a3b8' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
                opacity: validationErrors.some((e) => e.severity === 'error') ? 0.5 : 1,
              }}
              aria-label={isSaving ? 'Saving changes to decision matrix' : 'Save changes to decision matrix'}
              aria-disabled={isSaving || validationErrors.some((e) => e.severity === 'error')}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              onClick={handleCancel}
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                backgroundColor: 'white',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
              aria-label="Cancel editing and return to list view"
              aria-disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Node Property Panel */}
      {selectedNode && !readOnly && (
        <>
          {selectedNode.type === 'attribute' && (
            <AttributePropertyPanel
              selectedNode={selectedNode as any}
              onSave={handleAttributeSave}
              onCancel={handlePropertyPanelCancel}
              onClose={handlePropertyPanelClose}
            />
          )}
          {selectedNode.type === 'rule' && (
            <RulePropertyPanel
              selectedNode={selectedNode as any}
              onSave={handleRuleSave}
              onCancel={handlePropertyPanelCancel}
              onClose={handlePropertyPanelClose}
              onDelete={() => handleDeleteNode(selectedNode.id)}
              onAddCondition={() => handleAddCondition((selectedNode.data as any).rule.ruleId)}
              availableAttributes={matrix.attributes.map(attr => attr.name)}
            />
          )}
          {selectedNode.type === 'action' && (
            <ActionPropertyPanel
              selectedNode={selectedNode as any}
              onSave={handleActionSave}
              onCancel={handlePropertyPanelCancel}
              onClose={handlePropertyPanelClose}
            />
          )}
        </>
      )}

      {/* Validation Summary */}
      {validationErrors.length > 0 && (
        <ValidationSummary
          validationErrors={validationErrors}
          onNodeClick={(nodeId: string) => {
            const node = allNodes.find((n) => n.id === nodeId);
            if (node) {
              setSelectedNode(node);
            }
          }}
        />
      )}

      {/* Dirty state indicator */}
      {isDirty && !readOnly && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: selectedNode ? 420 : 16,
            zIndex: 9,
            backgroundColor: '#fef3c7',
            color: '#92400e',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            border: '1px solid #fcd34d',
          }}
        >
          Unsaved changes
        </div>
      )}

      {/* Welcome Tour */}
      <WelcomeTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
      />

      {/* Node Legend */}
      {showLegend && (
        <NodeLegend
          onShowFullGuide={() => {
            setShowLegend(false);
            setShowHelp(true);
          }}
          onHighlightNodes={(nodeType: string | null) => {
            // Highlight nodes of this type
            setAllNodes((nds) =>
              nds.map((n) =>
                nodeType && n.type === nodeType
                  ? ({ ...n, data: { ...n.data, isHighlighted: true } } as FlowNode)
                  : ({ ...n, data: { ...n.data, isHighlighted: false } } as FlowNode)
              )
            );
          }}
        />
      )}

      {/* Help Panel */}
      <HelpPanel
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      >
        {screenReaderAnnouncement}
      </div>
    </div>
  );
};

// Wrapper component with ReactFlowProvider
const DecisionMatrixFlowEditor: React.FC<DecisionMatrixFlowEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <DecisionMatrixFlowEditorInner {...props} />
    </ReactFlowProvider>
  );
};

export default DecisionMatrixFlowEditor;
