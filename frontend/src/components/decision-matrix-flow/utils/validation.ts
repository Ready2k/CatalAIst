// Validation utilities for decision matrix flow
import {
  Attribute,
  Rule,
  Condition,
  RuleAction
} from '../../../../../shared/types';
import { ValidationError } from '../types/flow-types';

/**
 * Validate attribute
 */
export const validateAttribute = (attribute: Attribute): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Weight must be between 0 and 1
  if (attribute.weight < 0 || attribute.weight > 1) {
    errors.push({
      nodeId: `attr-${attribute.name}`,
      field: 'weight',
      message: `Weight must be between 0 and 1 (current: ${attribute.weight})`,
      severity: 'error'
    });
  }
  
  // Name must not be empty
  if (!attribute.name || attribute.name.trim() === '') {
    errors.push({
      nodeId: `attr-${attribute.name}`,
      field: 'name',
      message: 'Attribute name cannot be empty',
      severity: 'error'
    });
  }
  
  // Categorical attributes must have possible values
  if (attribute.type === 'categorical' && (!attribute.possibleValues || attribute.possibleValues.length === 0)) {
    errors.push({
      nodeId: `attr-${attribute.name}`,
      field: 'possibleValues',
      message: 'Categorical attributes must have at least one possible value',
      severity: 'error'
    });
  }
  
  return errors;
};

/**
 * Validate rule
 */
export const validateRule = (rule: Rule): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Rule must have at least one condition
  if (!rule.conditions || rule.conditions.length === 0) {
    errors.push({
      nodeId: `rule-${rule.ruleId}`,
      field: 'conditions',
      message: 'Rule must have at least one condition',
      severity: 'error'
    });
  }
  
  // Priority must be a positive number
  if (rule.priority < 0) {
    errors.push({
      nodeId: `rule-${rule.ruleId}`,
      field: 'priority',
      message: `Priority must be a positive number (current: ${rule.priority})`,
      severity: 'error'
    });
  }
  
  // Name must not be empty
  if (!rule.name || rule.name.trim() === '') {
    errors.push({
      nodeId: `rule-${rule.ruleId}`,
      field: 'name',
      message: 'Rule name cannot be empty',
      severity: 'error'
    });
  }
  
  return errors;
};

/**
 * Validate condition against attribute type
 */
export const validateCondition = (
  condition: Condition,
  attribute: Attribute | undefined
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!attribute) {
    errors.push({
      nodeId: `cond-${condition.attribute}`,
      field: 'attribute',
      message: `Attribute "${condition.attribute}" does not exist`,
      severity: 'error'
    });
    return errors;
  }
  
  // Validate operator matches attribute type
  const numericOperators = ['>', '<', '>=', '<='];
  const arrayOperators = ['in', 'not_in'];
  
  if (attribute.type === 'numeric') {
    // Numeric attributes can use ==, !=, >, <, >=, <=
    // Value must be a number
    if (typeof condition.value !== 'number' && !arrayOperators.includes(condition.operator)) {
      errors.push({
        nodeId: `cond-${condition.attribute}`,
        field: 'value',
        message: `Numeric attribute requires numeric value (got ${typeof condition.value})`,
        severity: 'error'
      });
    }
  } else if (attribute.type === 'boolean') {
    // Boolean attributes should only use == or !=
    if (numericOperators.includes(condition.operator)) {
      errors.push({
        nodeId: `cond-${condition.attribute}`,
        field: 'operator',
        message: `Boolean attribute cannot use operator "${condition.operator}"`,
        severity: 'error'
      });
    }
    
    // Value must be boolean
    if (typeof condition.value !== 'boolean' && !arrayOperators.includes(condition.operator)) {
      errors.push({
        nodeId: `cond-${condition.attribute}`,
        field: 'value',
        message: `Boolean attribute requires boolean value (got ${typeof condition.value})`,
        severity: 'error'
      });
    }
  } else if (attribute.type === 'categorical') {
    // Categorical attributes should not use numeric operators
    if (numericOperators.includes(condition.operator)) {
      errors.push({
        nodeId: `cond-${condition.attribute}`,
        field: 'operator',
        message: `Categorical attribute cannot use operator "${condition.operator}"`,
        severity: 'error'
      });
    }
    
    // For 'in' and 'not_in', value must be an array
    if (arrayOperators.includes(condition.operator)) {
      if (!Array.isArray(condition.value)) {
        errors.push({
          nodeId: `cond-${condition.attribute}`,
          field: 'value',
          message: `Operator "${condition.operator}" requires array value`,
          severity: 'error'
        });
      }
    } else {
      // For other operators, value should be in possibleValues
      if (attribute.possibleValues && !attribute.possibleValues.includes(String(condition.value))) {
        errors.push({
          nodeId: `cond-${condition.attribute}`,
          field: 'value',
          message: `Value "${condition.value}" is not in possible values: [${attribute.possibleValues.join(', ')}]`,
          severity: 'warning'
        });
      }
    }
  }
  
  // Validate array operators have array values
  if (arrayOperators.includes(condition.operator) && !Array.isArray(condition.value)) {
    errors.push({
      nodeId: `cond-${condition.attribute}`,
      field: 'value',
      message: `Operator "${condition.operator}" requires array value`,
      severity: 'error'
    });
  }
  
  return errors;
};

/**
 * Validate action
 */
export const validateAction = (action: RuleAction, ruleId: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Override actions must have a target category
  if (action.type === 'override' && !action.targetCategory) {
    errors.push({
      nodeId: `action-${ruleId}`,
      field: 'targetCategory',
      message: 'Override action must specify a target category',
      severity: 'error'
    });
  }
  
  // Adjust confidence actions must have a confidence adjustment
  if (action.type === 'adjust_confidence') {
    if (action.confidenceAdjustment === undefined || action.confidenceAdjustment === null) {
      errors.push({
        nodeId: `action-${ruleId}`,
        field: 'confidenceAdjustment',
        message: 'Adjust confidence action must specify a confidence adjustment',
        severity: 'error'
      });
    } else if (action.confidenceAdjustment < -1 || action.confidenceAdjustment > 1) {
      errors.push({
        nodeId: `action-${ruleId}`,
        field: 'confidenceAdjustment',
        message: `Confidence adjustment must be between -1 and 1 (current: ${action.confidenceAdjustment})`,
        severity: 'error'
      });
    }
  }
  
  // All actions must have a rationale
  if (!action.rationale || action.rationale.trim() === '') {
    errors.push({
      nodeId: `action-${ruleId}`,
      field: 'rationale',
      message: 'Action must have a rationale',
      severity: 'warning'
    });
  }
  
  return errors;
};

/**
 * Validate entire decision matrix
 */
export const validateMatrix = (
  attributes: Attribute[],
  rules: Rule[]
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Create attribute lookup map
  const attributeMap = new Map<string, Attribute>();
  attributes.forEach(attr => attributeMap.set(attr.name, attr));
  
  // Check for duplicate attribute names
  const attributeNames = new Set<string>();
  attributes.forEach(attr => {
    if (attributeNames.has(attr.name)) {
      errors.push({
        nodeId: `attr-${attr.name}`,
        field: 'name',
        message: `Duplicate attribute name: "${attr.name}"`,
        severity: 'error'
      });
    }
    attributeNames.add(attr.name);
  });
  
  // Validate each attribute
  attributes.forEach(attr => {
    errors.push(...validateAttribute(attr));
  });
  
  // Check for duplicate rule names
  const ruleNames = new Set<string>();
  rules.forEach(rule => {
    if (ruleNames.has(rule.name)) {
      errors.push({
        nodeId: `rule-${rule.ruleId}`,
        field: 'name',
        message: `Duplicate rule name: "${rule.name}"`,
        severity: 'warning'
      });
    }
    ruleNames.add(rule.name);
  });
  
  // Validate each rule
  rules.forEach(rule => {
    errors.push(...validateRule(rule));
    
    // Validate conditions
    rule.conditions.forEach(condition => {
      const attribute = attributeMap.get(condition.attribute);
      errors.push(...validateCondition(condition, attribute));
    });
    
    // Validate action
    errors.push(...validateAction(rule.action, rule.ruleId));
  });
  
  return errors;
};

/**
 * Check if there are any blocking errors (severity: 'error')
 */
export const hasBlockingErrors = (errors: ValidationError[]): boolean => {
  return errors.some(error => error.severity === 'error');
};

/**
 * Group errors by node ID
 */
export const groupErrorsByNode = (
  errors: ValidationError[]
): Map<string, ValidationError[]> => {
  const grouped = new Map<string, ValidationError[]>();
  
  errors.forEach(error => {
    const nodeErrors = grouped.get(error.nodeId) || [];
    nodeErrors.push(error);
    grouped.set(error.nodeId, nodeErrors);
  });
  
  return grouped;
};
