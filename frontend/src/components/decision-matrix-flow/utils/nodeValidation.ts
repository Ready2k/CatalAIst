// Utilities for node validation and styling
import { ValidationError } from '../types/flow-types';
import { FlowNode } from '../types/flow-types';

/**
 * Get validation errors for a specific node
 */
export const getNodeValidationErrors = (
  nodeId: string,
  allErrors: ValidationError[]
): ValidationError[] => {
  return allErrors.filter(error => error.nodeId === nodeId);
};

/**
 * Check if a node has validation errors
 */
export const nodeHasErrors = (
  nodeId: string,
  allErrors: ValidationError[]
): boolean => {
  return allErrors.some(error => error.nodeId === nodeId && error.severity === 'error');
};

/**
 * Check if a node has validation warnings
 */
export const nodeHasWarnings = (
  nodeId: string,
  allErrors: ValidationError[]
): boolean => {
  return allErrors.some(error => error.nodeId === nodeId && error.severity === 'warning');
};

/**
 * Get border color for a node based on validation state
 */
export const getNodeBorderColor = (
  nodeId: string,
  allErrors: ValidationError[],
  defaultColor: string
): string => {
  if (nodeHasErrors(nodeId, allErrors)) {
    return '#ef4444'; // red for errors
  }
  if (nodeHasWarnings(nodeId, allErrors)) {
    return '#f59e0b'; // amber for warnings
  }
  return defaultColor;
};

/**
 * Get border width for a node based on validation state
 */
export const getNodeBorderWidth = (
  nodeId: string,
  allErrors: ValidationError[]
): string => {
  if (nodeHasErrors(nodeId, allErrors)) {
    return '3px'; // thicker border for errors
  }
  return '2px';
};

/**
 * Apply validation styling to a node
 */
export const applyValidationStyling = (
  node: FlowNode,
  allErrors: ValidationError[]
): FlowNode => {
  const hasError = nodeHasErrors(node.id, allErrors);
  const hasWarning = nodeHasWarnings(node.id, allErrors);

  if (!hasError && !hasWarning) {
    return node;
  }

  return {
    ...node,
    style: {
      ...node.style,
      borderColor: hasError ? '#ef4444' : '#f59e0b',
      borderWidth: hasError ? '3px' : '2px',
      boxShadow: hasError 
        ? '0 0 0 3px rgba(239, 68, 68, 0.2)' 
        : '0 0 0 3px rgba(245, 158, 11, 0.2)'
    }
  };
};

/**
 * Group validation errors by severity
 */
export const groupErrorsBySeverity = (
  errors: ValidationError[]
): { errors: ValidationError[]; warnings: ValidationError[] } => {
  return {
    errors: errors.filter(e => e.severity === 'error'),
    warnings: errors.filter(e => e.severity === 'warning')
  };
};
