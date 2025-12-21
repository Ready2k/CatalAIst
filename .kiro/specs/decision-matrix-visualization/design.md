# Design Document: Decision Matrix Visualization

## Overview

This document describes the design for an interactive visual editor for the CatalAIst decision matrix system using ReactFlow 11. The solution will transform the existing list-based admin interface into an intuitive node-based flow diagram that visualizes how attributes, conditions, rules, and actions connect to produce classification decisions.

The design leverages ReactFlow's node-based graph capabilities to create a visual representation where administrators can see and edit the decision logic through direct manipulation of nodes and edges. The visualization will integrate seamlessly with the existing decision matrix backend services and versioned storage system.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Interface Layer                     │
│  ┌────────────────────┐      ┌──────────────────────────┐  │
│  │ DecisionMatrixAdmin│◄────►│ DecisionMatrixFlowEditor │  │
│  │   (List View)      │      │     (Flow View)          │  │
│  └────────────────────┘      └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              ReactFlow Visualization Layer                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Custom Nodes │  │ Custom Edges │  │ Layout Engine   │  │
│  │  - Attribute │  │  - Condition │  │  - Dagre/Elk    │  │
│  │  - Rule      │  │  - Action    │  │  - Auto-layout  │  │
│  │  - Action    │  │  - Flow      │  │                 │  │
│  │  - Category  │  └──────────────┘  └─────────────────┘  │
│  └──────────────┘                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Node Property Panel (Side Panel)             │  │
│  │  - Edit weights, priorities, conditions, actions     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Transformation Layer                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  DecisionMatrix ◄──► ReactFlow Graph Converter       │  │
│  │  (Backend Model)     (Nodes + Edges)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │ Decision Matrix API  │  │ Versioned Storage        │    │
│  │ - GET /api/dm        │  │ - Save versions          │    │
│  │ - PUT /api/dm        │  │ - Load versions          │    │
│  └──────────────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```
frontend/src/components/
├── DecisionMatrixFlowEditor.tsx          # Main flow editor component
├── decision-matrix-flow/
│   ├── nodes/
│   │   ├── AttributeNode.tsx             # Attribute node component
│   │   ├── RuleNode.tsx                  # Rule node component
│   │   ├── ConditionNode.tsx             # Condition node component
│   │   ├── ActionNode.tsx                # Action node component
│   │   └── CategoryNode.tsx              # Category node component
│   ├── edges/
│   │   ├── ConditionEdge.tsx             # Custom edge for conditions
│   │   └── FlowEdge.tsx                  # Custom edge for flow
│   ├── panels/
│   │   ├── NodePropertyPanel.tsx         # Side panel for editing
│   │   ├── AttributePropertyPanel.tsx    # Attribute-specific editor
│   │   ├── RulePropertyPanel.tsx         # Rule-specific editor
│   │   └── ActionPropertyPanel.tsx       # Action-specific editor
│   ├── utils/
│   │   ├── matrixToFlow.ts               # Convert matrix to ReactFlow
│   │   ├── flowToMatrix.ts               # Convert ReactFlow to matrix
│   │   ├── layoutEngine.ts               # Auto-layout logic
│   │   └── validation.ts                 # Validation utilities
│   └── types/
│       └── flow-types.ts                 # TypeScript types for flow
└── DecisionMatrixAdmin.tsx               # Existing list view (updated)
```

## Components and Interfaces

### 1. DecisionMatrixFlowEditor Component

Main component that orchestrates the flow visualization.

**Props:**
```typescript
interface DecisionMatrixFlowEditorProps {
  matrix: DecisionMatrix;
  onSave: (matrix: DecisionMatrix) => Promise<void>;
  onCancel: () => void;
  readOnly?: boolean;
}
```

**State:**
```typescript
interface FlowEditorState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  isDirty: boolean;
  validationErrors: ValidationError[];
}
```

**Key Features:**
- Initializes ReactFlow with custom node types
- Manages node selection and property editing
- Handles save/cancel operations
- Provides zoom, pan, and minimap controls
- Implements auto-layout on initial load

### 2. Custom Node Components

#### AttributeNode

Represents a decision matrix attribute.

**Visual Design:**
```
┌─────────────────────────┐
│  📊 frequency           │
│  Weight: ████░░ 0.7     │
│  Type: categorical      │
└─────────────────────────┘
```

**Data:**
```typescript
interface AttributeNodeData {
  attribute: Attribute;
  isHighlighted: boolean;
}
```

**Styling:**
- Size proportional to weight (0.7 weight = larger node)
- Color-coded by type (categorical=blue, numeric=green, boolean=purple)
- Shows weight as progress bar
- Handle on right side for outgoing connections

#### RuleNode

Represents a decision rule.

**Visual Design:**
```
┌─────────────────────────┐
│  ⚡ Priority: 85        │
│  High Frequency RPA     │
│  Conditions: 3          │
│  [●] Active             │
└─────────────────────────┘
```

**Data:**
```typescript
interface RuleNodeData {
  rule: Rule;
  isHighlighted: boolean;
}
```

**Styling:**
- Border thickness indicates priority (higher = thicker)
- Active rules: full color, inactive: grayscale + 50% opacity
- Vertical position based on priority (higher priority = higher position)
- Handles on left (conditions) and right (actions)

#### ConditionNode

Represents a rule condition.

**Visual Design:**
```
┌─────────────────────────┐
│  frequency == "daily"   │
└─────────────────────────┘
```

**Data:**
```typescript
interface ConditionNodeData {
  condition: Condition;
  parentRuleId: string;
}
```

**Styling:**
- Small, compact nodes
- Color matches connected attribute
- Shows operator and value clearly
- Handle on left (from attribute) and right (to rule)

#### ActionNode

Represents a rule action.

**Visual Design:**
```
┌─────────────────────────┐
│  🎯 Override            │
│  → RPA                  │
└─────────────────────────┘
```

**Data:**
```typescript
interface ActionNodeData {
  action: RuleAction;
  parentRuleId: string;
}
```

**Styling:**
- Override: green with target category
- Adjust Confidence: blue with +/- value
- Flag Review: yellow/warning color
- Handle on left (from rule) and right (to category)

#### CategoryNode

Represents a transformation category.

**Visual Design:**
```
┌─────────────────────────┐
│  🤖 RPA                 │
│  (Robotic Process       │
│   Automation)           │
└─────────────────────────┘
```

**Data:**
```typescript
interface CategoryNodeData {
  category: TransformationCategory;
  description: string;
}
```

**Styling:**
- Large, prominent nodes
- Fixed positions on right side of canvas
- Color-coded by category
- Handle on left for incoming connections

### 3. Node Property Panel

Side panel that appears when a node is selected.

**Layout:**
```
┌─────────────────────────────┐
│  Node Properties       [×]  │
├─────────────────────────────┤
│                             │
│  [Dynamic content based     │
│   on selected node type]    │
│                             │
│  ┌───────────────────────┐ │
│  │  Save Changes         │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │  Cancel               │ │
│  └───────────────────────┘ │
└─────────────────────────────┘
```

**Panels by Node Type:**

- **AttributePropertyPanel**: Edit weight (slider 0-1), description
- **RulePropertyPanel**: Edit name, description, priority (number input), active toggle, add/remove conditions
- **ActionPropertyPanel**: Edit action type (dropdown), target category, confidence adjustment, rationale

### 4. Data Transformation Layer

#### matrixToFlow.ts

Converts DecisionMatrix to ReactFlow graph structure.

**Algorithm:**
```typescript
function matrixToFlow(matrix: DecisionMatrix): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // 1. Create attribute nodes (left column)
  matrix.attributes.forEach((attr, index) => {
    nodes.push(createAttributeNode(attr, index));
  });
  
  // 2. Create category nodes (right column)
  const categories = ['Eliminate', 'Simplify', 'Digitise', 'RPA', 'AI Agent', 'Agentic AI'];
  categories.forEach((cat, index) => {
    nodes.push(createCategoryNode(cat, index));
  });
  
  // 3. For each rule, create rule node, condition nodes, and action node
  matrix.rules.forEach((rule, ruleIndex) => {
    // Create rule node (middle-left)
    const ruleNode = createRuleNode(rule, ruleIndex);
    nodes.push(ruleNode);
    
    // Create condition nodes for each condition
    rule.conditions.forEach((condition, condIndex) => {
      const condNode = createConditionNode(condition, rule.ruleId, condIndex);
      nodes.push(condNode);
      
      // Edge from attribute to condition
      edges.push(createEdge(
        `attr-${condition.attribute}`,
        condNode.id,
        'condition'
      ));
      
      // Edge from condition to rule
      edges.push(createEdge(
        condNode.id,
        ruleNode.id,
        'condition'
      ));
    });
    
    // Create action node
    const actionNode = createActionNode(rule.action, rule.ruleId);
    nodes.push(actionNode);
    
    // Edge from rule to action
    edges.push(createEdge(ruleNode.id, actionNode.id, 'flow'));
    
    // Edge from action to category
    const targetCategory = getTargetCategory(rule.action);
    if (targetCategory) {
      edges.push(createEdge(actionNode.id, `cat-${targetCategory}`, 'flow'));
    }
  });
  
  // 4. Apply auto-layout
  return applyLayout(nodes, edges);
}
```

#### flowToMatrix.ts

Converts ReactFlow graph back to DecisionMatrix.

**Algorithm:**
```typescript
function flowToMatrix(nodes: Node[], edges: Edge[], originalMatrix: DecisionMatrix): DecisionMatrix {
  // Extract attributes from attribute nodes
  const attributes = nodes
    .filter(n => n.type === 'attribute')
    .map(n => n.data.attribute);
  
  // Extract rules from rule nodes
  const rules = nodes
    .filter(n => n.type === 'rule')
    .map(n => {
      const ruleNode = n;
      const ruleData = n.data.rule;
      
      // Find condition nodes for this rule
      const conditionNodes = nodes.filter(cn => 
        cn.type === 'condition' && cn.data.parentRuleId === ruleData.ruleId
      );
      
      // Reconstruct conditions
      const conditions = conditionNodes.map(cn => cn.data.condition);
      
      // Find action node for this rule
      const actionNode = nodes.find(an => 
        an.type === 'action' && an.data.parentRuleId === ruleData.ruleId
      );
      
      return {
        ...ruleData,
        conditions,
        action: actionNode?.data.action || ruleData.action
      };
    });
  
  return {
    ...originalMatrix,
    attributes,
    rules,
    version: incrementVersion(originalMatrix.version),
    createdAt: new Date().toISOString(),
    createdBy: 'admin'
  };
}
```

#### layoutEngine.ts

Implements auto-layout using Dagre algorithm.

**Layout Strategy:**
```
Column 1: Attributes (left)
Column 2: Conditions (middle-left)
Column 3: Rules (middle)
Column 4: Actions (middle-right)
Column 5: Categories (right)

Vertical positioning:
- Attributes: evenly spaced
- Rules: sorted by priority (high to low, top to bottom)
- Categories: evenly spaced
- Conditions/Actions: aligned with their parent rules
```

**Implementation:**
```typescript
function applyLayout(nodes: Node[], edges: Edge[]): { nodes: Node[], edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ 
    rankdir: 'LR',  // Left to right
    ranksep: 150,   // Horizontal spacing
    nodesep: 80     // Vertical spacing
  });
  
  // Add nodes to dagre
  nodes.forEach(node => {
    dagreGraph.setNode(node.id, { 
      width: node.width || 200, 
      height: node.height || 80 
    });
  });
  
  // Add edges to dagre
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
  
  // Calculate layout
  dagre.layout(dagreGraph);
  
  // Apply positions to nodes
  const layoutedNodes = nodes.map(node => {
    const position = dagreGraph.node(node.id);
    return {
      ...node,
      position: { x: position.x, y: position.y }
    };
  });
  
  return { nodes: layoutedNodes, edges };
}
```

## Data Models

### ReactFlow Node Types

```typescript
type NodeType = 'attribute' | 'rule' | 'condition' | 'action' | 'category';

interface BaseNodeData {
  label: string;
  isHighlighted: boolean;
}

interface AttributeNodeData extends BaseNodeData {
  attribute: Attribute;
}

interface RuleNodeData extends BaseNodeData {
  rule: Rule;
}

interface ConditionNodeData extends BaseNodeData {
  condition: Condition;
  parentRuleId: string;
}

interface ActionNodeData extends BaseNodeData {
  action: RuleAction;
  parentRuleId: string;
}

interface CategoryNodeData extends BaseNodeData {
  category: TransformationCategory;
  description: string;
}
```

### ReactFlow Edge Types

```typescript
type EdgeType = 'condition' | 'flow';

interface ConditionEdgeData {
  operator: string;
  animated: boolean;
}

interface FlowEdgeData {
  animated: boolean;
  label?: string;
}
```

## Error Handling

### Validation Rules

1. **Attribute Validation:**
   - Weight must be between 0 and 1
   - Name must be unique
   - Type must be valid (categorical, numeric, boolean)
   - Categorical attributes must have possibleValues

2. **Rule Validation:**
   - Must have at least one condition
   - Priority must be a positive number
   - Rule name must be unique
   - All condition attributes must exist in the matrix

3. **Condition Validation:**
   - Operator must be valid for attribute type
   - Value must match attribute type
   - For 'in'/'not_in', value must be an array
   - For numeric operators (>, <, >=, <=), attribute must be numeric

4. **Action Validation:**
   - Override actions must have a targetCategory
   - Adjust confidence actions must have confidenceAdjustment between -1 and 1
   - All actions must have a rationale

### Error Display

```typescript
interface ValidationError {
  nodeId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}
```

Errors are displayed:
- As red borders on invalid nodes
- In the property panel when node is selected
- In a validation summary panel at the bottom
- Blocking save operation until resolved

## Testing Strategy

### Unit Tests

1. **Data Transformation Tests:**
   - Test matrixToFlow conversion with various matrix structures
   - Test flowToMatrix conversion preserves all data
   - Test round-trip conversion (matrix → flow → matrix)
   - Test edge cases (empty rules, no conditions, etc.)

2. **Validation Tests:**
   - Test all validation rules
   - Test error message generation
   - Test validation state management

3. **Layout Tests:**
   - Test layout algorithm with different graph sizes
   - Test node positioning logic
   - Test edge routing

### Integration Tests

1. **Component Integration:**
   - Test DecisionMatrixFlowEditor renders correctly
   - Test node selection and property panel display
   - Test save/cancel operations
   - Test switching between list and flow views

2. **API Integration:**
   - Test loading matrix from backend
   - Test saving updated matrix
   - Test version management

### Visual Regression Tests

1. **Node Rendering:**
   - Test each node type renders correctly
   - Test active/inactive styling
   - Test priority visualization
   - Test weight visualization

2. **Layout:**
   - Test auto-layout produces consistent results
   - Test manual node repositioning
   - Test zoom and pan operations

### Docker Environment Tests

1. **Build Tests:**
   - Test frontend builds successfully with ReactFlow
   - Test Docker image builds without errors
   - Test bundle size is within acceptable limits

2. **Runtime Tests:**
   - Test visualization works in Docker container
   - Test all interactions work in production build
   - Test performance in Docker environment

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading:**
   - Load node components on demand
   - Defer property panel rendering until node selected

2. **Memoization:**
   - Memoize node and edge components with React.memo
   - Memoize expensive calculations (layout, validation)

3. **Virtualization:**
   - For matrices with >100 nodes, implement viewport-based rendering
   - Only render nodes visible in current viewport

4. **Debouncing:**
   - Debounce property updates (300ms)
   - Debounce layout recalculation (500ms)

### Performance Targets

- Initial render: < 2 seconds for 50 rules
- Node interaction: < 100ms response time
- Property update: < 200ms visual feedback
- Save operation: < 1 second
- Bundle size increase: < 500KB gzipped

## Integration Points

### With Existing DecisionMatrixAdmin

```typescript
// Updated DecisionMatrixAdmin component
const DecisionMatrixAdmin: React.FC<Props> = (props) => {
  const [viewMode, setViewMode] = useState<'list' | 'flow'>('list');
  
  return (
    <div>
      <ViewToggle value={viewMode} onChange={setViewMode} />
      
      {viewMode === 'list' ? (
        <DecisionMatrixListView {...props} />
      ) : (
        <DecisionMatrixFlowEditor 
          matrix={matrix}
          onSave={handleSave}
          onCancel={() => setViewMode('list')}
        />
      )}
    </div>
  );
};
```

### With Backend API

No changes required to backend API. The flow editor uses the same endpoints:
- `GET /api/decision-matrix` - Load current matrix
- `PUT /api/decision-matrix` - Save updated matrix
- `GET /api/decision-matrix/versions` - List versions
- `GET /api/decision-matrix/:version` - Load specific version

## Dependencies

### New NPM Packages

```json
{
  "dependencies": {
    "@xyflow/react": "^12.0.0",
    "dagre": "^0.8.5"
  },
  "devDependencies": {
    "@types/dagre": "^0.7.52"
  }
}
```

Note: ReactFlow 11+ is published as `@xyflow/react` (formerly `reactflow`)

### Bundle Size Impact

- @xyflow/react: ~250KB gzipped
- dagre: ~50KB gzipped
- Total impact: ~300KB gzipped

## Accessibility

1. **Keyboard Navigation:**
   - Tab through nodes
   - Arrow keys to navigate between connected nodes
   - Enter to select/edit node
   - Escape to deselect

2. **Screen Reader Support:**
   - ARIA labels on all nodes
   - Announce node selection
   - Describe node connections

3. **Visual Accessibility:**
   - High contrast mode support
   - Color-blind friendly palette
   - Minimum font size 14px
   - Focus indicators on all interactive elements

## User Guidance and Help System

### Interactive Help Features

1. **Welcome Tour (First-Time Users):**
   - Automatic guided tour on first visit
   - Step-by-step walkthrough of key features
   - Can be replayed anytime via "Help" button

2. **Contextual Help Tooltips:**
   - Hover over any UI element to see explanation
   - "?" icons next to complex features
   - Keyboard shortcut hints

3. **Node Type Legend:**
   - Persistent legend panel (collapsible)
   - Shows what each node type represents
   - Color coding explanation
   - Visual examples

4. **Interactive Tutorial Mode:**
   - "Learn by doing" mode with sample data
   - Guided exercises: "Try editing this rule"
   - Safe sandbox environment

5. **Help Panel:**
   - Slide-out panel with comprehensive guide
   - Searchable help content
   - Video tutorials (optional)
   - FAQ section

### Help Content Structure

```
frontend/src/components/decision-matrix-flow/help/
├── WelcomeTour.tsx              # First-time user tour
├── HelpPanel.tsx                # Main help panel
├── NodeLegend.tsx               # Visual legend for node types
├── ContextualTooltip.tsx        # Reusable tooltip component
├── TutorialMode.tsx             # Interactive tutorial
└── help-content/
    ├── getting-started.md       # Basic concepts
    ├── node-types.md            # Node type explanations
    ├── editing-rules.md         # How to edit rules
    └── best-practices.md        # Decision matrix best practices
```

### Welcome Tour Steps

**Step 1: Overview**
```
"Welcome to the Decision Matrix Visual Editor!

This tool helps you see and customize how CatalAIst classifies 
business processes. The AI provides intelligent suggestions, and 
you can add rules to ensure classifications match your business needs."

[Next →]
```

**Step 2: Attributes (highlights left column)**
```
"These are ATTRIBUTES - characteristics of your business processes.

Examples: frequency, complexity, risk, business_value

The AI extracts these from conversations, and they flow through 
your rules to determine the final classification."

[← Back] [Next →]
```

**Step 3: Rules (highlights middle section)**
```
"These are RULES - your custom logic for classification.

Each rule has:
• Priority (higher = evaluated first)
• Conditions (when does this rule apply?)
• Actions (what should happen?)

Rules let you override AI suggestions when you know better."

[← Back] [Next →]
```

**Step 4: Categories (highlights right column)**
```
"These are CATEGORIES - the final classification outcomes.

• Eliminate - Remove unnecessary processes
• Simplify - Streamline complexity
• Digitise - Convert to digital
• RPA - Automate repetitive tasks
• AI Agent - AI with human oversight
• Agentic AI - Autonomous AI

Rules can override the AI to force a specific category."

[← Back] [Next →]
```

**Step 5: Editing (highlights property panel)**
```
"Click any node to edit its properties.

Try it now: Click on a rule to see its conditions and actions.
You can adjust priorities, add conditions, or change actions.

All changes are versioned - you can always revert!"

[← Back] [Finish Tour]
```

### Node Legend Component

**Visual Design:**
```
┌─────────────────────────────────────┐
│  Legend                        [−]  │
├─────────────────────────────────────┤
│  📊 Attribute                       │
│     Process characteristics         │
│     Size = weight importance        │
│                                     │
│  ⚡ Rule                            │
│     Your custom logic               │
│     Border = priority level         │
│     Gray = inactive                 │
│                                     │
│  ◆ Condition                        │
│     When rule applies               │
│     (frequency == "daily")          │
│                                     │
│  🎯 Action                          │
│     What happens                    │
│     Override / Adjust / Flag        │
│                                     │
│  🤖 Category                        │
│     Final classification            │
│     6 transformation types          │
│                                     │
│  [?] Show Full Guide                │
└─────────────────────────────────────┘
```

### Contextual Help Examples

**On Attribute Node Hover:**
```
"Attribute: frequency

This measures how often the process runs.
Higher weight = more influence on classification.

Current weight: 0.7 (high influence)

Click to edit weight and description."
```

**On Rule Node Hover:**
```
"Rule: High Frequency RPA (Priority: 85)

This rule triggers when:
• frequency == "daily"
• complexity == "low"
• risk == "low"

Action: Boost RPA confidence by +0.2

Status: ✓ Active

Click to edit conditions or change priority."
```

**On Action Node Hover:**
```
"Action: Override → RPA

This action forces the classification to RPA,
ignoring the AI's suggestion.

Use override actions when you have specific
business requirements that must be followed.

Rationale: High-frequency, low-risk processes
are ideal candidates for RPA automation."
```

### Help Panel Content

**Getting Started Section:**
```markdown
# Getting Started

## What is the Decision Matrix?

The decision matrix is a rule-based system that works alongside 
AI to classify business processes. Think of it as a way to add 
your business expertise to the AI's intelligence.

## How It Works

1. **AI Analyzes** - The AI reads process descriptions and suggests a category
2. **Rules Apply** - Your custom rules check if adjustments are needed
3. **Final Decision** - The system combines AI + rules for the best outcome

## Why Use Rules?

- **Certainty**: Guarantee specific outcomes for critical processes
- **Compliance**: Enforce business policies (e.g., "high risk = manual review")
- **Expertise**: Codify your team's knowledge
- **Consistency**: Ensure similar processes are classified the same way

## Your First Rule

Try creating a rule like:
"If data_sensitivity = 'restricted' → Flag for manual review"

This ensures sensitive data is always reviewed by a human.
```

**Node Types Section:**
```markdown
# Understanding Node Types

## 📊 Attributes
Process characteristics extracted by AI:
- frequency: How often it runs
- complexity: How complicated it is
- risk: Potential impact if automated
- business_value: Importance to business
- user_count: Number of people affected
- data_sensitivity: Data security level

**Weight**: Controls how much this attribute influences decisions (0-1)

## ⚡ Rules
Your custom logic for classification:
- **Priority**: Higher numbers = evaluated first (0-100)
- **Conditions**: When does this rule apply? (AND logic)
- **Actions**: What should happen when triggered?
- **Active/Inactive**: Toggle rules on/off without deleting

## ◆ Conditions
Checks that must be true for a rule to trigger:
- Operators: ==, !=, >, <, >=, <=, in, not_in
- Example: frequency == "daily"
- All conditions must be true (AND logic)

## 🎯 Actions
What happens when a rule triggers:
- **Override**: Force a specific category
- **Adjust Confidence**: Boost/reduce AI confidence (±0.5)
- **Flag Review**: Mark for manual review

## 🤖 Categories
Final classification outcomes:
- Eliminate, Simplify, Digitise, RPA, AI Agent, Agentic AI
```

### Interactive Tutorial Mode

**Tutorial Scenario:**
```
"Let's create a rule together!

Scenario: Your company policy requires all processes handling 
restricted data to be manually reviewed before automation.

Step 1: We'll create a rule called 'Restricted Data Review'
Step 2: Add condition: data_sensitivity == 'restricted'
Step 3: Set action: Flag for Review
Step 4: Set priority: 100 (highest - always check first)

Ready? Click 'Start Tutorial' to begin."
```

### Help Button Placement

```
┌─────────────────────────────────────────────────────────┐
│  Decision Matrix Visual Editor          [?] Help  [×]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [List View] [Flow View]  [🎓 Start Tour] [📖 Legend]  │
│                                                          │
│  [Flow diagram area...]                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Help Menu Options:**
- 🎓 Start Welcome Tour
- 📖 Show Legend
- 📚 Open Help Guide
- 🎯 Interactive Tutorial
- ⌨️ Keyboard Shortcuts
- 💡 Tips & Best Practices

## Future Enhancements

1. **Rule Simulation:**
   - Input test attributes and see which rules trigger
   - Highlight active paths in the flow

2. **Rule Templates:**
   - Pre-built rule patterns
   - Drag-and-drop rule creation

3. **Collaborative Editing:**
   - Real-time multi-user editing
   - Change tracking and conflict resolution

4. **Export/Import:**
   - Export flow as image (PNG/SVG)
   - Import rules from CSV/Excel

5. **Analytics:**
   - Show rule trigger frequency
   - Identify unused rules
   - Suggest optimizations
