# Validation System

This document describes the validation system for the decision matrix flow editor.

## Overview

The validation system ensures that the decision matrix maintains data integrity by validating:
- Attributes (weight range, unique names, type validity)
- Rules (has conditions, unique names, valid priority)
- Conditions (operator matches type, value matches type)
- Actions (required fields based on type)

## Components

### 1. Validation Utilities (`validation.ts`)

Core validation functions that check individual components:

```typescript
import { validateAttribute, validateRule, validateCondition, validateAction, validateMatrix } from './validation';

// Validate a single attribute
const errors = validateAttribute(attribute);

// Validate a single rule
const errors = validateRule(rule);

// Validate a condition against its attribute
const errors = validateCondition(condition, attribute);

// Validate an action
const errors = validateAction(action, ruleId);

// Validate entire matrix
const errors = validateMatrix(attributes, rules);
```

### 2. Node Validation Utilities (`nodeValidation.ts`)

Helper functions for applying validation to nodes:

```typescript
import { 
  getNodeValidationErrors, 
  nodeHasErrors, 
  nodeHasWarnings,
  getNodeBorderColor,
  applyValidationStyling 
} from './nodeValidation';

// Get errors for a specific node
const nodeErrors = getNodeValidationErrors(nodeId, allErrors);

// Check if node has errors
const hasErrors = nodeHasErrors(nodeId, allErrors);

// Apply validation styling to a node
const styledNode = applyValidationStyling(node, allErrors);
```

### 3. Property Panels

All property panels automatically validate their content:

- **AttributePropertyPanel**: Validates weight range (0-1)
- **RulePropertyPanel**: Validates name, priority, and conditions
- **ActionPropertyPanel**: Validates action type requirements

Features:
- Real-time validation as user types
- Inline error messages for specific fields
- Summary of all errors at the top
- Save button disabled when errors exist
- Distinguishes between errors (blocking) and warnings (non-blocking)

### 4. ValidationSummary Component

Displays a summary of all validation errors at the bottom of the editor:

```typescript
import { ValidationSummary } from '../panels';

<ValidationSummary 
  validationErrors={allErrors}
  onNodeClick={(nodeId) => {
    // Navigate to and select the node
  }}
/>
```

Features:
- Shows count of errors and warnings
- Lists all validation messages
- Provides "View Node" buttons to navigate to problematic nodes
- Sticky footer that stays visible while scrolling
- Color-coded (red for errors, amber for warnings)

## Validation Rules

### Attributes

| Rule | Severity | Message |
|------|----------|---------|
| Weight must be 0-1 | Error | "Weight must be between 0 and 1" |
| Name required | Error | "Attribute name cannot be empty" |
| Categorical needs values | Error | "Categorical attributes must have at least one possible value" |
| Duplicate names | Error | "Duplicate attribute name: {name}" |

### Rules

| Rule | Severity | Message |
|------|----------|---------|
| Must have conditions | Error | "Rule must have at least one condition" |
| Priority >= 0 | Error | "Priority must be a positive number" |
| Name required | Error | "Rule name cannot be empty" |
| Duplicate names | Warning | "Duplicate rule name: {name}" |

### Conditions

| Rule | Severity | Message |
|------|----------|---------|
| Attribute exists | Error | "Attribute {name} does not exist" |
| Operator matches type | Error | "Boolean attribute cannot use operator {op}" |
| Value matches type | Error | "Numeric attribute requires numeric value" |
| Array operators need arrays | Error | "Operator 'in' requires array value" |
| Value in possible values | Warning | "Value not in possible values" |

### Actions

| Rule | Severity | Message |
|------|----------|---------|
| Override needs category | Error | "Override action must specify a target category" |
| Adjust needs value | Error | "Adjust confidence action must specify adjustment" |
| Adjustment range | Error | "Confidence adjustment must be between -1 and 1" |
| Rationale required | Warning | "Action must have a rationale" |

## Usage in Flow Editor

When implementing the main flow editor (task 6), integrate validation as follows:

```typescript
import { validateMatrix, applyValidationStyling } from './utils';
import { ValidationSummary } from './panels';

const FlowEditor = () => {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Validate whenever matrix changes
  useEffect(() => {
    const errors = validateMatrix(attributes, rules);
    setValidationErrors(errors);
    
    // Apply validation styling to nodes
    const styledNodes = nodes.map(node => 
      applyValidationStyling(node, errors)
    );
    setNodes(styledNodes);
  }, [attributes, rules]);

  // Prevent save if errors exist
  const handleSave = () => {
    const blockingErrors = validationErrors.filter(e => e.severity === 'error');
    if (blockingErrors.length > 0) {
      alert('Please fix validation errors before saving');
      return;
    }
    // Save logic...
  };

  return (
    <>
      <ReactFlow nodes={nodes} edges={edges} />
      <ValidationSummary 
        validationErrors={validationErrors}
        onNodeClick={handleNodeClick}
      />
    </>
  );
};
```

## Visual Indicators

### Node Borders

- **No errors**: Default color (blue, green, etc.)
- **Warnings**: Amber border (#f59e0b) with glow
- **Errors**: Red border (#ef4444) with glow, thicker (3px)

### Property Panels

- **Error box**: Red background (#fef2f2) with red border
- **Warning box**: Amber background (#fffbeb) with amber border
- **Field errors**: Inline messages below fields
- **Save button**: Disabled (gray) when errors exist

### Validation Summary

- **Position**: Fixed at bottom of screen
- **Errors**: Red background with error icon (⚠️)
- **Warnings**: Amber background with warning icon (⚡)
- **Interactive**: Click "View Node" to navigate to problem

## Best Practices

1. **Validate early**: Run validation as user types, not just on save
2. **Be specific**: Show which field has the error
3. **Distinguish severity**: Use errors for blocking issues, warnings for suggestions
4. **Provide context**: Explain why something is invalid and how to fix it
5. **Visual feedback**: Use colors, borders, and icons consistently
6. **Don't block unnecessarily**: Allow saving with warnings, only block on errors

## Testing

Validation is tested in `__tests__/dataTransformation.test.ts`:

```bash
cd frontend
npm test -- validation
```

Test coverage includes:
- All validation rules
- Edge cases (empty values, boundary conditions)
- Round-trip validation (matrix → flow → matrix)
- Error message accuracy
