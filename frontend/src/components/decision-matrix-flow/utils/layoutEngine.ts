// Auto-layout engine using Dagre algorithm
import dagre from 'dagre';
import { Node } from '@xyflow/react';
import {
  FlowNode,
  CustomEdge,
  LayoutConfig,
  RuleNodeData,
  NODE_DIMENSIONS
} from '../types/flow-types';

/**
 * Default layout configuration
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  direction: 'LR', // Left to right
  nodeSpacing: 80, // Vertical spacing between nodes
  rankSpacing: 150 // Horizontal spacing between columns
};

/**
 * Apply dagre layout to nodes and edges
 * 
 * Layout strategy:
 * - Column 1: Attributes (left)
 * - Column 2: Conditions (middle-left)
 * - Column 3: Rules (middle)
 * - Column 4: Actions (middle-right)
 * - Column 5: Categories (right)
 * 
 * Vertical positioning:
 * - Attributes: evenly spaced
 * - Rules: sorted by priority (high to low, top to bottom)
 * - Categories: evenly spaced
 * - Conditions/Actions: aligned with their parent rules
 */
export const applyLayout = (
  nodes: FlowNode[],
  edges: CustomEdge[],
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): { nodes: FlowNode[]; edges: CustomEdge[] } => {
  // Create a new dagre graph
  const dagreGraph = new dagre.graphlib.Graph();
  
  // Set default edge label
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Configure graph layout
  dagreGraph.setGraph({
    rankdir: config.direction,
    nodesep: config.nodeSpacing,
    ranksep: config.rankSpacing,
    marginx: 50,
    marginy: 50
  });
  
  // Add nodes to dagre graph
  nodes.forEach(node => {
    const width = node.width || NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS]?.width || 200;
    const height = node.height || NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS]?.height || 80;
    
    dagreGraph.setNode(node.id, {
      width,
      height
    });
  });
  
  // Add edges to dagre graph
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  // Calculate layout
  dagre.layout(dagreGraph);
  
  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map(node => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // Dagre returns center position, ReactFlow uses top-left
    // So we need to adjust by half the width/height
    const width = node.width || NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS]?.width || 200;
    const height = node.height || NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS]?.height || 80;
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2
      }
    };
  });
  
  return {
    nodes: layoutedNodes,
    edges
  };
};

/**
 * Apply priority-based vertical sorting for rule nodes
 * This ensures higher priority rules appear at the top
 */
export const sortRuleNodesByPriority = (nodes: FlowNode[]): FlowNode[] => {
  // Separate rule nodes from other nodes
  const ruleNodes = nodes.filter(
    (node): node is Node<RuleNodeData, 'rule'> => node.type === 'rule'
  );
  const otherNodes = nodes.filter(node => node.type !== 'rule');
  
  // Sort rule nodes by priority (descending)
  const sortedRuleNodes = [...ruleNodes].sort((a, b) => {
    return b.data.rule.priority - a.data.rule.priority;
  });
  
  // Recalculate Y positions for sorted rule nodes
  const baseY = 100;
  const spacing = 150;
  
  const repositionedRuleNodes = sortedRuleNodes.map((node, index) => ({
    ...node,
    position: {
      ...node.position,
      y: baseY + index * spacing
    }
  }));
  
  return [...otherNodes, ...repositionedRuleNodes];
};

/**
 * Apply column-based positioning
 * Ensures nodes are arranged in logical columns:
 * Attributes → Conditions → Rules → Actions → Categories
 */
export const applyColumnBasedLayout = (
  nodes: FlowNode[],
  edges: CustomEdge[]
): { nodes: FlowNode[]; edges: CustomEdge[] } => {
  const columnWidth = 250;
  const baseX = 50;
  
  // Define column X positions
  const columns = {
    attribute: baseX,
    condition: baseX + columnWidth,
    rule: baseX + columnWidth * 2,
    action: baseX + columnWidth * 3,
    category: baseX + columnWidth * 4
  };
  
  // Group nodes by type
  const nodesByType: Record<string, FlowNode[]> = {
    attribute: [],
    condition: [],
    rule: [],
    action: [],
    category: []
  };
  
  nodes.forEach(node => {
    if (node.type && nodesByType[node.type]) {
      nodesByType[node.type].push(node);
    }
  });
  
  // Sort rule nodes by priority
  nodesByType.rule = nodesByType.rule.sort((a, b) => {
    const aRule = (a as Node<RuleNodeData, 'rule'>).data.rule;
    const bRule = (b as Node<RuleNodeData, 'rule'>).data.rule;
    return bRule.priority - aRule.priority;
  });
  
  // Position nodes in columns
  const positionedNodes: FlowNode[] = [];
  
  // Position attributes
  const attrSpacing = 120;
  nodesByType.attribute.forEach((node, index) => {
    positionedNodes.push({
      ...node,
      position: {
        x: columns.attribute,
        y: 50 + index * attrSpacing
      }
    });
  });
  
  // Position categories
  const catSpacing = 130;
  nodesByType.category.forEach((node, index) => {
    positionedNodes.push({
      ...node,
      position: {
        x: columns.category,
        y: 50 + index * catSpacing
      }
    });
  });
  
  // Position rules
  const ruleSpacing = 150;
  const ruleYPositions = new Map<string, number>();
  
  nodesByType.rule.forEach((node, index) => {
    const y = 50 + index * ruleSpacing;
    ruleYPositions.set(node.id, y);
    
    positionedNodes.push({
      ...node,
      position: {
        x: columns.rule,
        y
      }
    });
  });
  
  // Position conditions aligned with their parent rules
  nodesByType.condition.forEach(node => {
    const condNode = node as Node<{ parentRuleId: string }, 'condition'>;
    const parentRuleId = `rule-${condNode.data.parentRuleId}`;
    const parentY = ruleYPositions.get(parentRuleId) || 0;
    
    positionedNodes.push({
      ...node,
      position: {
        x: columns.condition,
        y: parentY
      }
    });
  });
  
  // Position actions aligned with their parent rules
  nodesByType.action.forEach(node => {
    const actionNode = node as Node<{ parentRuleId: string }, 'action'>;
    const parentRuleId = `rule-${actionNode.data.parentRuleId}`;
    const parentY = ruleYPositions.get(parentRuleId) || 0;
    
    positionedNodes.push({
      ...node,
      position: {
        x: columns.action,
        y: parentY
      }
    });
  });
  
  return {
    nodes: positionedNodes,
    edges
  };
};

/**
 * Main layout function that combines dagre and custom column-based layout
 * Uses column-based layout for better control over positioning
 */
export const layoutGraph = (
  nodes: FlowNode[],
  edges: CustomEdge[],
  useColumnLayout: boolean = true
): { nodes: FlowNode[]; edges: CustomEdge[] } => {
  if (useColumnLayout) {
    // Use custom column-based layout for more predictable positioning
    return applyColumnBasedLayout(nodes, edges);
  } else {
    // Use dagre auto-layout
    return applyLayout(nodes, edges);
  }
};

/**
 * Get bounding box of all nodes
 * Useful for fitting the view to show all nodes
 */
export const getNodesBoundingBox = (nodes: FlowNode[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} => {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  nodes.forEach(node => {
    const width = node.width || NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS]?.width || 200;
    const height = node.height || NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS]?.height || 80;
    
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};
