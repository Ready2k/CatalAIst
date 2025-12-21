# Decision Matrix Flow Utilities

This directory contains utility functions for transforming decision matrix data to and from ReactFlow graph structures.

## Files

### matrixToFlow.ts
Converts a DecisionMatrix to ReactFlow nodes and edges.

**Key Functions:**
- `matrixToFlow(matrix: DecisionMatrix)`: Main conversion function
- `generateAttributeNodeId()`, `generateRuleNodeId()`, etc.: Node ID generation
- `createAttributeNode()`, `createRuleNode()`, etc.: Node creation helpers

**Algorithm:**
1. Create attribute nodes (left column)
2. Create category nodes (right column)
3. For each rule:
   - Create rule node
   - Create condition nodes for each condition
   - Create edges from attributes to conditions
   - Create edges from conditions to rule
   - Create action node
   - Create edge from rule to action
   - Create edge from action to category (if applicable)

### flowToMatrix.ts
Converts ReactFlow graph back to DecisionMatrix structure.

**Key Functions:**
- `flowToMatrix(nodes, edges, originalMatrix)`: Main conversion function
- `incrementVersion(version)`: Version string increment logic
- `validateFlowForConversion(nodes, edges)`: Validation before conversion

**Algorithm:**
1. Extract attributes from attribute nodes
2. Extract rules from rule nodes
3. For each rule, find its conditions and action
4. Reconstruct the decision matrix with updated version and metadata

### layoutEngine.ts
Auto-layout engine using Dagre algorithm.

**Key Functions:**
- `layoutGraph(nodes, edges)`: Main layout function
- `applyLayout(nodes, edges, config)`: Dagre-based layout
- `applyColumnBasedLayout(nodes, edges)`: Custom column-based layout
- `sortRuleNodesByPriority(nodes)`: Priority-based vertical sorting
- `getNodesBoundingBox(nodes)`: Calculate bounding box for fit-to-view

**Layout Strategy:**
- Column 1: Attributes (left)
- Column 2: Conditions (middle-left)
- Column 3: Rules (middle)
- Column 4: Actions (middle-right)
- Column 5: Categories (right)

Rules are sorted by priority (highest first, top to bottom).

### validation.ts
Validation utilities for decision matrix flow.

**Key Functions:**
- `validateAttribute(attribute)`: Validate attribute properties
- `validateRule(rule)`: Validate rule properties
- `validateCondition(condition, attribute)`: Validate condition against attribute type
- `validateAction(action, ruleId)`: Validate action properties
- `validateMatrix(attributes, rules)`: Validate entire matrix
- `hasBlockingErrors(errors)`: Check for blocking errors
- `groupErrorsByNode(errors)`: Group errors by node ID

**Validation Rules:**
- Attribute weight must be 0-1
- Rules must have at least one condition
- Operators must match attribute types
- Override actions must have target category
- Confidence adjustments must be -1 to 1

## Usage Example

```typescript
import { matrixToFlow, flowToMatrix, layoutGraph } from './utils';

// Convert matrix to flow
const { nodes, edges } = matrixToFlow(decisionMatrix);

// Apply layout
const { nodes: layoutedNodes, edges: layoutedEdges } = layoutGraph(nodes, edges);

// Later, convert back to matrix
const updatedMatrix = flowToMatrix(layoutedNodes, layoutedEdges, originalMatrix);
```

## Testing

Tests are located in `__tests__/dataTransformation.test.ts`.

Run tests:
```bash
cd frontend
npm test -- dataTransformation.test.ts
```

All tests verify:
- Matrix to flow conversion
- Flow to matrix conversion
- Round-trip conversion (matrix → flow → matrix)
- Version increment logic
- Layout application
- Data preservation
