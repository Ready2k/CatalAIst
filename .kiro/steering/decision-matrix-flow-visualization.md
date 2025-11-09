# Decision Matrix Flow Visualization Guidelines

## Overview

The Decision Matrix Flow Visualization is an interactive, accessible flow diagram that visualizes decision matrix logic. It uses ReactFlow for rendering and includes comprehensive accessibility features.

## Architecture

### Component Structure

```
DecisionMatrixFlowEditor (Main Container)
├── ReactFlow (Flow Diagram)
│   ├── AttributeNode (Blue/Green/Purple)
│   ├── RuleNode (Indigo)
│   ├── ConditionNode (Cyan)
│   ├── ActionNode (Green/Blue/Amber)
│   └── CategoryNode (Rainbow)
├── Property Panels (Side Panels)
│   ├── AttributePropertyPanel
│   ├── RulePropertyPanel
│   └── ActionPropertyPanel
├── Help System
│   ├── WelcomeTour
│   ├── NodeLegend
│   ├── HelpPanel
│   └── ContextualTooltip
└── ValidationSummary
```

### Data Flow

1. **Matrix to Flow**: `matrixToFlow()` converts DecisionMatrix to FlowNode[] and CustomEdge[]
2. **Layout**: `layoutGraph()` positions nodes using column-based layout
3. **Rendering**: ReactFlow renders nodes and edges
4. **Editing**: Property panels modify node data
5. **Flow to Matrix**: `flowToMatrix()` converts back to DecisionMatrix
6. **Validation**: `validateMatrix()` ensures data integrity

## Key Principles

### 1. Accessibility First

**MUST** implement:
- Keyboard navigation for all interactions
- ARIA labels on all interactive elements
- Screen reader announcements for state changes
- WCAG AA compliant color contrast
- Visible focus indicators
- Minimum font size 11-12px

**Example**:
```typescript
<div
  data-node-id={nodeId}
  tabIndex={0}
  role="button"
  aria-label={`Attribute: ${name}, Type: ${type}, Weight: ${weight}`}
  style={{
    outline: selected ? `3px solid ${color}` : 'none',
    outlineOffset: '2px'
  }}
>
```

### 2. Responsive Design

**Breakpoints**:
- Mobile: < 768px
- Tablet: 768-1024px
- Desktop: > 1024px

**Adaptations**:
- Mobile: Full-screen panels, vertical toolbar, touch controls
- Tablet: 350px panels, optimized spacing
- Desktop: 400px panels, all features enabled

**Example**:
```typescript
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkScreenSize = () => {
    setIsMobile(window.innerWidth < 768);
  };
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  return () => window.removeEventListener('resize', checkScreenSize);
}, []);
```

### 3. Real-time Validation

**Validation Levels**:
- Error: Blocks saving, shown in red
- Warning: Allows saving, shown in yellow

**Validation Timing**:
- Debounced (200ms) for performance
- Triggered on node/edge changes
- Displayed in ValidationSummary panel

**Example**:
```typescript
const debouncedValidate = useDebounce((nodes, edges) => {
  const attributes = nodes.filter(n => n.type === 'attribute')
    .map(n => n.data.attribute);
  const rules = nodes.filter(n => n.type === 'rule')
    .map(n => n.data.rule);
  const errors = validateMatrix(attributes, rules);
  setValidationErrors(errors);
}, 200);
```

### 4. Performance Optimization

**Techniques**:
- React.memo for node components
- Debounced validation
- Optimized re-rendering
- Performance monitoring

**Example**:
```typescript
const AttributeNode = memo(({ data, selected }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.selected === nextProps.selected &&
         prevProps.data.attribute.weight === nextProps.data.attribute.weight;
});
```

## Common Patterns

### Adding a New Node Type

1. **Create Node Component** in `frontend/src/components/decision-matrix-flow/nodes/`:
```typescript
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

const MyNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      data-node-id={data.nodeId}
      tabIndex={0}
      role="button"
      aria-label={`My Node: ${data.label}`}
      style={{
        border: `2px solid ${color}`,
        outline: selected ? `3px solid ${color}` : 'none',
      }}
    >
      {/* Node content */}
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(MyNode);
```

2. **Add to nodeTypes** in `DecisionMatrixFlowEditor.tsx`:
```typescript
const nodeTypes = {
  attribute: AttributeNode,
  rule: RuleNode,
  myNode: MyNode, // Add here
};
```

3. **Update matrixToFlow** to create nodes of new type

4. **Update flowToMatrix** to handle new node type

5. **Add validation** in `validation.ts`

### Adding a Property Panel

1. **Create Panel Component** in `frontend/src/components/decision-matrix-flow/panels/`:
```typescript
const MyPropertyPanel: React.FC<Props> = ({
  selectedNode,
  onSave,
  onCancel,
  onClose
}) => {
  const [localData, setLocalData] = useState(selectedNode.data);
  const [isDirty, setIsDirty] = useState(false);

  return (
    <NodePropertyPanel
      selectedNode={selectedNode}
      onSave={() => onSave(localData)}
      onCancel={onCancel}
      onClose={onClose}
      title="Edit My Node"
      isDirty={isDirty}
    >
      {/* Form fields */}
    </NodePropertyPanel>
  );
};
```

2. **Add to DecisionMatrixFlowEditor**:
```typescript
{selectedNode && selectedNode.type === 'myNode' && (
  <MyPropertyPanel
    selectedNode={selectedNode}
    onSave={handleMyNodeSave}
    onCancel={handlePropertyPanelCancel}
    onClose={handlePropertyPanelClose}
  />
)}
```

### Adding Validation Rules

1. **Add validation function** in `validation.ts`:
```typescript
export const validateMyNode = (data: MyNodeData): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!data.requiredField) {
    errors.push({
      nodeId: data.nodeId,
      field: 'requiredField',
      message: 'Required field is missing',
      severity: 'error'
    });
  }
  
  return errors;
};
```

2. **Call in validateMatrix**:
```typescript
myNodes.forEach(node => {
  errors.push(...validateMyNode(node.data));
});
```

## Testing Guidelines

### Accessibility Testing

**Keyboard Navigation**:
- Tab through all interactive elements
- Use arrow keys to navigate nodes
- Press Enter to select nodes
- Press Escape to close panels

**Screen Reader Testing**:
- Test with NVDA (Windows) or VoiceOver (Mac)
- Verify all nodes have descriptive labels
- Check that state changes are announced

**Visual Testing**:
- Test color contrast with tools like WebAIM
- Verify focus indicators are visible
- Check font sizes meet minimum requirements

### Responsive Testing

**Breakpoints**:
- Test at 375px (mobile)
- Test at 768px (tablet)
- Test at 1024px (desktop)
- Test at 1920px (large desktop)

**Touch Testing**:
- Test on actual mobile devices
- Verify pinch-to-zoom works
- Check touch targets are large enough (44x44px minimum)

### Performance Testing

**Metrics to Monitor**:
- Initial render time (< 2 seconds)
- Node click response (< 100ms)
- Property update time (< 200ms)
- Validation time (< 200ms)

**Tools**:
- React DevTools Profiler
- Chrome Performance tab
- Built-in performanceMonitor utility

## Troubleshooting

### Blank Screen on Load

**Cause**: ReactFlow not rendering due to container height issue

**Solution**: Ensure ReactFlow is direct child of container with `height: 100%`

```typescript
// ❌ Wrong - extra wrapper
<div>
  <div role="application">
    <ReactFlow />
  </div>
</div>

// ✅ Correct - direct child
<div style={{ height: '100%' }}>
  <ReactFlow />
</div>
```

### Validation Errors

**Cause**: Passing wrong data structure to validateMatrix

**Solution**: Extract attributes and rules from nodes first

```typescript
// ❌ Wrong
const errors = validateMatrix(nodes, edges);

// ✅ Correct
const attributes = nodes
  .filter(n => n.type === 'attribute')
  .map(n => n.data.attribute);
const rules = nodes
  .filter(n => n.type === 'rule')
  .map(n => n.data.rule);
const errors = validateMatrix(attributes, rules);
```

### Layout Issues

**Cause**: Layout not applied to nodes

**Solution**: Call layoutGraph after creating nodes

```typescript
// ❌ Wrong
return { nodes, edges };

// ✅ Correct
const layouted = layoutGraph(nodes, edges, true);
return layouted;
```

### React Hooks Error

**Cause**: Hooks called conditionally

**Solution**: Move hooks before early returns

```typescript
// ❌ Wrong
if (!selectedNode) return null;
const [state, setState] = useState();

// ✅ Correct
const [state, setState] = useState();
if (!selectedNode) return null;
```

## Best Practices

### 1. Always Use TypeScript
- Define proper types for all data structures
- Use type guards for node type checking
- Avoid `any` types

### 2. Memoize Components
- Use React.memo for node components
- Provide custom comparison functions
- Prevent unnecessary re-renders

### 3. Debounce Expensive Operations
- Validation (200ms)
- Layout calculations
- API calls

### 4. Handle Errors Gracefully
- Provide fallback values
- Show user-friendly error messages
- Log errors for debugging

### 5. Test Accessibility
- Use keyboard for all interactions
- Test with screen readers
- Verify WCAG compliance

### 6. Optimize Performance
- Monitor render times
- Use performance budgets
- Profile with React DevTools

## Version History

- **v2.0.0** (2025-11-09): Initial release of flow visualization
  - Interactive flow diagram
  - Full accessibility support
  - Responsive design
  - Real-time validation
  - Help system
