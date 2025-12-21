// TypeScript types for ReactFlow decision matrix visualization
import { Node, Edge } from '@xyflow/react';
import { 
  Attribute, 
  Rule, 
  Condition, 
  RuleAction, 
  TransformationCategory
} from '../../../../../shared/types';

// Node Types
export type FlowNodeType = 'attribute' | 'rule' | 'condition' | 'action' | 'category';

// Base Node Data
export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  isHighlighted: boolean;
}

// Attribute Node Data
export interface AttributeNodeData extends BaseNodeData {
  attribute: Attribute;
}

// Rule Node Data
export interface RuleNodeData extends BaseNodeData {
  rule: Rule;
}

// Condition Node Data
export interface ConditionNodeData extends BaseNodeData {
  condition: Condition;
  parentRuleId: string;
}

// Action Node Data
export interface ActionNodeData extends BaseNodeData {
  action: RuleAction;
  parentRuleId: string;
}

// Category Node Data
export interface CategoryNodeData extends BaseNodeData {
  category: TransformationCategory;
  description: string;
}

// Union type for all node data
export type FlowNodeData = 
  | AttributeNodeData 
  | RuleNodeData 
  | ConditionNodeData 
  | ActionNodeData 
  | CategoryNodeData;

// Custom Node Types
export type AttributeNode = Node<AttributeNodeData, 'attribute'>;
export type RuleNode = Node<RuleNodeData, 'rule'>;
export type ConditionNode = Node<ConditionNodeData, 'condition'>;
export type ActionNode = Node<ActionNodeData, 'action'>;
export type CategoryNode = Node<CategoryNodeData, 'category'>;

export type FlowNode = AttributeNode | RuleNode | ConditionNode | ActionNode | CategoryNode;

// Edge Types
export type FlowEdgeType = 'condition' | 'flow';

// Condition Edge Data
export interface ConditionEdgeData extends Record<string, unknown> {
  operator?: string;
  animated: boolean;
}

// Flow Edge Data
export interface FlowEdgeDataType extends Record<string, unknown> {
  animated: boolean;
  label?: string;
}

// Union type for all edge data
export type FlowEdgeData = ConditionEdgeData | FlowEdgeDataType;

// Custom Edge Types
export type ConditionEdge = Edge<ConditionEdgeData>;
export type FlowEdge = Edge<FlowEdgeDataType>;

export type CustomEdge = ConditionEdge | FlowEdge;

// Validation Error
export interface ValidationError {
  nodeId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// Flow Editor State
export interface FlowEditorState {
  nodes: FlowNode[];
  edges: CustomEdge[];
  selectedNode: FlowNode | null;
  isDirty: boolean;
  validationErrors: ValidationError[];
}

// Layout Configuration
export interface LayoutConfig {
  direction: 'LR' | 'TB' | 'RL' | 'BT';
  nodeSpacing: number;
  rankSpacing: number;
}

// Conversion Result
export interface MatrixToFlowResult {
  nodes: FlowNode[];
  edges: CustomEdge[];
}

// Category Descriptions
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Eliminate': 'Remove unnecessary processes',
  'Simplify': 'Streamline complexity',
  'Digitise': 'Convert to digital',
  'RPA': 'Robotic Process Automation',
  'AI Agent': 'AI with human oversight',
  'Agentic AI': 'Autonomous AI systems',
  'Eliminate or Simplify': 'Low-value processes can be considered for elimination or simplification'
};

// Node Colors by Type
export const NODE_COLORS = {
  attribute: {
    categorical: '#3b82f6', // blue
    numeric: '#10b981',     // green
    boolean: '#8b5cf6'      // purple
  },
  rule: {
    active: '#6366f1',      // indigo
    inactive: '#9ca3af'     // gray
  },
  condition: '#06b6d4',     // cyan
  action: {
    override: '#10b981',    // green
    adjust_confidence: '#3b82f6', // blue
    flag_review: '#f59e0b'  // amber
  },
  category: {
    'Eliminate': '#ef4444',      // red
    'Simplify': '#f97316',       // orange
    'Digitise': '#eab308',       // yellow
    'RPA': '#10b981',            // green
    'AI Agent': '#3b82f6',       // blue
    'Agentic AI': '#8b5cf6',     // purple
    'Eliminate or Simplify': '#f59e0b'  // amber (combination category)
  } as Record<string, string>
};

// Node Dimensions
export const NODE_DIMENSIONS = {
  attribute: { width: 200, height: 80 },
  rule: { width: 220, height: 100 },
  condition: { width: 180, height: 60 },
  action: { width: 180, height: 70 },
  category: { width: 200, height: 100 }
};
