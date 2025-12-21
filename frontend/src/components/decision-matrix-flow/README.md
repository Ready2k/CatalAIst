# Decision Matrix Flow Visualization

This directory contains the ReactFlow-based visual editor for the CatalAIst decision matrix system.

## Directory Structure

```
decision-matrix-flow/
├── nodes/              # Custom node components
│   ├── AttributeNode.tsx
│   ├── RuleNode.tsx
│   ├── ConditionNode.tsx
│   ├── ActionNode.tsx
│   └── CategoryNode.tsx
├── edges/              # Custom edge components
│   ├── ConditionEdge.tsx
│   └── FlowEdge.tsx
├── panels/             # Property editing panels
│   ├── NodePropertyPanel.tsx
│   ├── AttributePropertyPanel.tsx
│   ├── RulePropertyPanel.tsx
│   └── ActionPropertyPanel.tsx
├── utils/              # Utility functions
│   ├── matrixToFlow.ts       # Convert DecisionMatrix to ReactFlow graph
│   ├── flowToMatrix.ts       # Convert ReactFlow graph to DecisionMatrix
│   ├── layoutEngine.ts       # Auto-layout using Dagre
│   └── validation.ts         # Validation utilities
├── help/               # Help and onboarding components
│   ├── WelcomeTour.tsx
│   ├── HelpPanel.tsx
│   ├── NodeLegend.tsx
│   ├── ContextualTooltip.tsx
│   └── InteractiveTutorial.tsx
├── types/              # TypeScript type definitions
│   └── flow-types.ts
└── README.md           # This file
```

## Dependencies

- **@xyflow/react** (v12.0.0): ReactFlow library for node-based graphs
- **dagre** (v0.8.5): Graph layout algorithm

## Key Concepts

### Node Types

1. **AttributeNode**: Represents decision matrix attributes (frequency, complexity, etc.)
2. **RuleNode**: Represents decision rules with priority and conditions
3. **ConditionNode**: Represents rule conditions (attribute comparisons)
4. **ActionNode**: Represents rule actions (override, adjust_confidence, flag_review)
5. **CategoryNode**: Represents transformation categories (Eliminate, Simplify, etc.)

### Data Flow

```
DecisionMatrix → matrixToFlow() → ReactFlow Graph → User Edits → flowToMatrix() → DecisionMatrix
```

### Layout Strategy

The auto-layout engine arranges nodes in columns:
- Column 1: Attributes (left)
- Column 2: Conditions (middle-left)
- Column 3: Rules (middle)
- Column 4: Actions (middle-right)
- Column 5: Categories (right)

Rules are sorted vertically by priority (highest at top).

## Usage

The main entry point is `DecisionMatrixFlowEditor.tsx` which will be created in the parent directory.

```typescript
import DecisionMatrixFlowEditor from './decision-matrix-flow/DecisionMatrixFlowEditor';

<DecisionMatrixFlowEditor
  matrix={decisionMatrix}
  onSave={handleSave}
  onCancel={handleCancel}
  readOnly={false}
/>
```

## Development Status

✅ Task 1: Dependencies and project structure setup (COMPLETE)
⏳ Task 2: Data transformation utilities (PENDING)
⏳ Task 3: Custom node components (PENDING)
⏳ Task 4: Property panels (PENDING)
⏳ Task 5: Validation system (PENDING)
⏳ Task 6: Main editor component (PENDING)
⏳ Task 7: Help and onboarding (PENDING)
⏳ Task 8: Integration with DecisionMatrixAdmin (PENDING)
⏳ Task 9: Performance optimizations (PENDING)
⏳ Task 10: Docker compatibility testing (PENDING)
⏳ Task 11: End-to-end testing (PENDING)
⏳ Task 12: Polish and accessibility (PENDING)

## References

- [ReactFlow Documentation](https://reactflow.dev/)
- [Dagre Layout Algorithm](https://github.com/dagrejs/dagre)
- Design Document: `.kiro/specs/decision-matrix-visualization/design.md`
- Requirements: `.kiro/specs/decision-matrix-visualization/requirements.md`
