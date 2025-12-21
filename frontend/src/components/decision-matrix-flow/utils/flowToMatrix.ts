// Convert ReactFlow graph back to DecisionMatrix structure
import { Node } from 'reactflow';
import {
  DecisionMatrix,
  Attribute,
  Rule,
  Condition,
  RuleAction
} from '../../../../../shared/types';
import {
  FlowNode,
  CustomEdge,
  AttributeNodeData,
  RuleNodeData,
  ConditionNodeData,
  ActionNodeData
} from '../types/flow-types';

/**
 * Increment version string
 * Supports formats like "1.0", "1.0.0", "v1.0", etc.
 */
export const incrementVersion = (version: string): string => {
  // Remove 'v' prefix if present
  const cleanVersion = version.startsWith('v') ? version.slice(1) : version;
  
  // Split by dots
  const parts = cleanVersion.split('.');
  
  if (parts.length === 0) {
    return '1.0';
  }
  
  // Increment the last part
  const lastIndex = parts.length - 1;
  const lastPart = parseInt(parts[lastIndex], 10);
  
  if (isNaN(lastPart)) {
    // If last part is not a number, append .1
    return `${version}.1`;
  }
  
  parts[lastIndex] = String(lastPart + 1);
  
  return parts.join('.');
};

/**
 * Extract attributes from attribute nodes
 * Preserves original order from nodes
 */
const extractAttributes = (nodes: FlowNode[]): Attribute[] => {
  return nodes
    .filter((node): node is Node<AttributeNodeData, 'attribute'> => node.type === 'attribute')
    .map(node => node.data.attribute);
};

/**
 * Extract conditions for a specific rule
 */
const extractConditionsForRule = (
  ruleId: string,
  nodes: FlowNode[]
): Condition[] => {
  return nodes
    .filter((node): node is Node<ConditionNodeData, 'condition'> => 
      node.type === 'condition' && node.data.parentRuleId === ruleId
    )
    .map(node => node.data.condition);
};

/**
 * Extract action for a specific rule
 */
const extractActionForRule = (
  ruleId: string,
  nodes: FlowNode[]
): RuleAction | null => {
  const actionNode = nodes.find(
    (node): node is Node<ActionNodeData, 'action'> =>
      node.type === 'action' && node.data.parentRuleId === ruleId
  );
  
  return actionNode ? actionNode.data.action : null;
};

/**
 * Generate a UUID v4
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

/**
 * Extract rules from rule nodes
 */
const extractRules = (nodes: FlowNode[]): Rule[] => {
  const ruleNodes = nodes.filter(
    (node): node is Node<RuleNodeData, 'rule'> => node.type === 'rule'
  );
  
  return ruleNodes
    .map(node => {
      const ruleData = node.data.rule;
      
      // Find conditions for this rule
      const conditions = extractConditionsForRule(ruleData.ruleId, nodes);
      
      // Find action for this rule
      const action = extractActionForRule(ruleData.ruleId, nodes);
      
      // If no action found, use the original action from rule data
      const finalAction = action || ruleData.action;
      
      // Ensure ruleId is a valid UUID
      const validRuleId = (ruleData.ruleId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i))
        ? ruleData.ruleId
        : generateUUID();
      
      return {
        ...ruleData,
        ruleId: validRuleId,
        conditions,
        action: finalAction
      };
    })
    .sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)
};

/**
 * Convert ReactFlow graph back to DecisionMatrix structure
 * 
 * Algorithm:
 * 1. Extract attributes from attribute nodes
 * 2. Extract rules from rule nodes
 * 3. For each rule, find its conditions and action
 * 4. Reconstruct the decision matrix with updated version and metadata
 */
export const flowToMatrix = (
  nodes: FlowNode[],
  edges: CustomEdge[],
  originalMatrix: DecisionMatrix
): DecisionMatrix => {
  // Extract attributes
  const attributes = extractAttributes(nodes);
  
  // Extract rules with their conditions and actions
  const rules = extractRules(nodes);
  
  // Create updated matrix with incremented version
  const updatedMatrix: DecisionMatrix = {
    ...originalMatrix,
    version: incrementVersion(originalMatrix.version),
    createdAt: new Date().toISOString(),
    createdBy: 'admin', // Flow editor changes are always admin-created
    attributes,
    rules
  };
  
  return updatedMatrix;
};

/**
 * Validate that the flow graph can be converted to a valid matrix
 * Returns array of validation errors
 */
export interface FlowValidationError {
  type: 'missing_attribute' | 'missing_action' | 'invalid_rule' | 'orphaned_node';
  message: string;
  nodeId?: string;
}

export const validateFlowForConversion = (
  nodes: FlowNode[],
  edges: CustomEdge[]
): FlowValidationError[] => {
  const errors: FlowValidationError[] = [];
  
  // Get all attribute names
  const attributeNames = new Set(
    nodes
      .filter((node): node is Node<AttributeNodeData, 'attribute'> => node.type === 'attribute')
      .map(node => node.data.attribute.name)
  );
  
  // Check each rule
  const ruleNodes = nodes.filter(
    (node): node is Node<RuleNodeData, 'rule'> => node.type === 'rule'
  );
  
  ruleNodes.forEach(ruleNode => {
    const ruleId = ruleNode.data.rule.ruleId;
    
    // Check if rule has conditions
    const conditions = extractConditionsForRule(ruleId, nodes);
    if (conditions.length === 0) {
      errors.push({
        type: 'invalid_rule',
        message: `Rule "${ruleNode.data.rule.name}" has no conditions`,
        nodeId: ruleNode.id
      });
    }
    
    // Check if all condition attributes exist
    conditions.forEach(condition => {
      if (!attributeNames.has(condition.attribute)) {
        errors.push({
          type: 'missing_attribute',
          message: `Condition references non-existent attribute "${condition.attribute}"`,
          nodeId: ruleNode.id
        });
      }
    });
    
    // Check if rule has an action
    const action = extractActionForRule(ruleId, nodes);
    if (!action) {
      errors.push({
        type: 'missing_action',
        message: `Rule "${ruleNode.data.rule.name}" has no action`,
        nodeId: ruleNode.id
      });
    }
  });
  
  return errors;
};
