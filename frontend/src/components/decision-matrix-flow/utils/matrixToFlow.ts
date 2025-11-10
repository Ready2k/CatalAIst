// Convert DecisionMatrix to ReactFlow graph structure
import {
  DecisionMatrix,
  Attribute,
  Rule,
  Condition,
  RuleAction,
  TransformationCategory
} from '../../../../../shared/types';
import {
  FlowNode,
  CustomEdge,
  AttributeNodeData,
  RuleNodeData,
  ConditionNodeData,
  ActionNodeData,
  CategoryNodeData,
  MatrixToFlowResult,
  CATEGORY_DESCRIPTIONS,
  NODE_DIMENSIONS
} from '../types/flow-types';
import { layoutGraph } from './layoutEngine';

// Node ID generation functions
export const generateAttributeNodeId = (attributeName: string): string => {
  return `attr-${attributeName}`;
};

export const generateRuleNodeId = (ruleId: string): string => {
  return `rule-${ruleId}`;
};

export const generateConditionNodeId = (ruleId: string, conditionIndex: number): string => {
  return `cond-${ruleId}-${conditionIndex}`;
};

export const generateActionNodeId = (ruleId: string): string => {
  return `action-${ruleId}`;
};

export const generateCategoryNodeId = (category: TransformationCategory): string => {
  return `cat-${category}`;
};

// Edge ID generation
export const generateEdgeId = (source: string, target: string): string => {
  return `edge-${source}-${target}`;
};

// Create attribute node
const createAttributeNode = (attribute: Attribute, index: number): FlowNode => {
  const nodeId = generateAttributeNodeId(attribute.name);
  
  return {
    id: nodeId,
    type: 'attribute',
    position: { x: 0, y: index * 120 }, // Temporary position, will be updated by layout
    data: {
      label: attribute.name,
      attribute,
      isHighlighted: false,
      nodeId
    } as AttributeNodeData,
    ...NODE_DIMENSIONS.attribute
  };
};

// Create rule node
const createRuleNode = (rule: Rule, index: number): FlowNode => {
  const nodeId = generateRuleNodeId(rule.ruleId);
  
  return {
    id: nodeId,
    type: 'rule',
    position: { x: 0, y: index * 150 }, // Temporary position, will be updated by layout
    data: {
      label: rule.name,
      rule,
      isHighlighted: false,
      nodeId
    } as RuleNodeData,
    ...NODE_DIMENSIONS.rule
  };
};

// Create condition node
const createConditionNode = (
  condition: Condition,
  ruleId: string,
  conditionIndex: number
): FlowNode => {
  const nodeId = generateConditionNodeId(ruleId, conditionIndex);
  const label = formatConditionLabel(condition);
  
  return {
    id: nodeId,
    type: 'condition',
    position: { x: 0, y: 0 }, // Temporary position, will be updated by layout
    data: {
      label,
      condition,
      parentRuleId: ruleId,
      isHighlighted: false,
      nodeId
    } as ConditionNodeData,
    ...NODE_DIMENSIONS.condition
  };
};

// Format condition label for display
const formatConditionLabel = (condition: Condition): string => {
  let valueStr: string;
  
  if (Array.isArray(condition.value)) {
    valueStr = `[${condition.value.join(', ')}]`;
  } else if (typeof condition.value === 'string') {
    valueStr = `"${condition.value}"`;
  } else {
    valueStr = String(condition.value);
  }
  
  return `${condition.attribute} ${condition.operator} ${valueStr}`;
};

// Create action node
const createActionNode = (action: RuleAction, ruleId: string): FlowNode => {
  const nodeId = generateActionNodeId(ruleId);
  const label = formatActionLabel(action);
  
  return {
    id: nodeId,
    type: 'action',
    position: { x: 0, y: 0 }, // Temporary position, will be updated by layout
    data: {
      label,
      action,
      parentRuleId: ruleId,
      isHighlighted: false,
      nodeId
    } as ActionNodeData,
    ...NODE_DIMENSIONS.action
  };
};

// Format action label for display
const formatActionLabel = (action: RuleAction): string => {
  switch (action.type) {
    case 'override':
      return `Override → ${action.targetCategory}`;
    case 'adjust_confidence':
      const sign = (action.confidenceAdjustment || 0) >= 0 ? '+' : '';
      return `Adjust ${sign}${action.confidenceAdjustment}`;
    case 'flag_review':
      return 'Flag for Review';
    default:
      return action.type;
  }
};

// Create category node
const createCategoryNode = (category: TransformationCategory, index: number): FlowNode => {
  const nodeId = generateCategoryNodeId(category);
  const description = CATEGORY_DESCRIPTIONS[category];
  
  return {
    id: nodeId,
    type: 'category',
    position: { x: 0, y: index * 130 }, // Temporary position, will be updated by layout
    data: {
      label: category,
      category,
      description,
      isHighlighted: false,
      nodeId
    } as CategoryNodeData,
    ...NODE_DIMENSIONS.category
  };
};

// Create edge
const createEdge = (
  source: string,
  target: string,
  type: 'condition' | 'flow',
  animated: boolean = false
): CustomEdge => {
  return {
    id: generateEdgeId(source, target),
    source,
    target,
    type,
    animated,
    data: { animated }
  };
};

// Get target category from action
const getTargetCategory = (action: RuleAction): TransformationCategory | null => {
  if (action.type === 'override' && action.targetCategory) {
    return action.targetCategory;
  }
  return null;
};

/**
 * Convert DecisionMatrix to ReactFlow graph structure
 * 
 * Algorithm:
 * 1. Create attribute nodes (left column)
 * 2. Create category nodes (right column)
 * 3. For each rule:
 *    - Create rule node
 *    - Create condition nodes for each condition
 *    - Create edges from attributes to conditions
 *    - Create edges from conditions to rule
 *    - Create action node
 *    - Create edge from rule to action
 *    - Create edge from action to category (if applicable)
 */
export const matrixToFlow = (matrix: DecisionMatrix): MatrixToFlowResult => {
  const nodes: FlowNode[] = [];
  const edges: CustomEdge[] = [];
  
  // 1. Create attribute nodes (left column)
  // Show all attributes so users can see what's available
  matrix.attributes.forEach((attr, index) => {
    nodes.push(createAttributeNode(attr, index));
  });
  
  // 2. Create category nodes (right column)
  // Always show all 6 standard categories, plus any custom ones referenced in actions
  const standardCategories: TransformationCategory[] = [
    'Eliminate',
    'Simplify',
    'Digitise',
    'RPA',
    'AI Agent',
    'Agentic AI'
  ];
  
  const referencedCategories = new Set<TransformationCategory>(standardCategories);
  
  // Add any custom categories referenced in actions
  matrix.rules.forEach(rule => {
    if (rule.action.type === 'override' && rule.action.targetCategory) {
      referencedCategories.add(rule.action.targetCategory);
    }
  });
  
  const categories = Array.from(referencedCategories).sort();
  categories.forEach((cat, index) => {
    nodes.push(createCategoryNode(cat, index));
  });
  
  // 3. For each rule, create rule node, condition nodes, and action node
  matrix.rules.forEach((rule, ruleIndex) => {
    // Create rule node
    const ruleNode = createRuleNode(rule, ruleIndex);
    nodes.push(ruleNode);
    
    // Create condition nodes for each condition
    rule.conditions.forEach((condition, condIndex) => {
      const condNode = createConditionNode(condition, rule.ruleId, condIndex);
      nodes.push(condNode);
      
      // Edge from attribute to condition
      const attrNodeId = generateAttributeNodeId(condition.attribute);
      edges.push(createEdge(attrNodeId, condNode.id, 'condition'));
      
      // Edge from condition to rule
      edges.push(createEdge(condNode.id, ruleNode.id, 'condition'));
    });
    
    // Create action node
    const actionNode = createActionNode(rule.action, rule.ruleId);
    nodes.push(actionNode);
    
    // Edge from rule to action
    edges.push(createEdge(ruleNode.id, actionNode.id, 'flow'));
    
    // Edge from action to category (if applicable)
    const targetCategory = getTargetCategory(rule.action);
    if (targetCategory) {
      const catNodeId = generateCategoryNodeId(targetCategory);
      edges.push(createEdge(actionNode.id, catNodeId, 'flow'));
    }
  });
  
  // Apply layout to position nodes properly
  const layouted = layoutGraph(nodes, edges, true);
  
  return layouted;
};
