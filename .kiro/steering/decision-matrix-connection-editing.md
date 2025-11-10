# Decision Matrix Flow Editor - Connection Editing

## Overview

The Decision Matrix Flow Editor now supports full connection editing capabilities, allowing users to visually create, modify, and delete connections between nodes in the flow diagram.

## New Capabilities ✅

### Connection Management
- **Create connections** by dragging from attributes to conditions
- **Delete connections** by selecting edges and pressing Delete/Backspace
- **Real-time validation** prevents invalid connections
- **Automatic updates** to condition logic when connections change

### Node Management
- **Add rules** via toolbar button (➕ Add Rule)
- **Add conditions** via rule property panel (+ Add Node button)
- **Delete nodes** via property panel (🗑️ Delete button)
- **Automatic cleanup** when deleting rules (removes conditions and actions)

### Visual Feedback
- **Screen reader announcements** for all connection changes
- **Validation messages** for invalid connection attempts
- **Dirty state tracking** shows unsaved changes
- **Confirmation dialogs** prevent accidental deletions

## Connection Rules

### Valid Connections
- ✅ Attribute → Condition (only valid connection type)
- ❌ All other connection types are rejected

### Connection Behavior
1. User drags from attribute handle to condition handle
2. System validates the connection type
3. If valid:
   - Edge is created
   - Condition updates to reference the new attribute
   - Screen reader announces the change
   - Dirty flag is set
4. If invalid:
   - Connection is rejected
   - Screen reader announces why

## Node Creation

### Adding a Rule
```typescript
// Creates:
// 1. Rule node with default settings
// 2. Action node (linked to rule)
// 3. Edge from rule to action
// 4. Opens property panel for editing
```

**Default Rule Properties:**
- Name: "New Rule N"
- Priority: 50
- Active: true
- Conditions: [] (empty, user adds via connections)
- Action: adjust_confidence (0)

### Adding a Condition
```typescript
// Creates:
// 1. Condition node with placeholder values
// 2. Edge from condition to rule
// 3. Positioned near the rule
// 4. Ready to connect to an attribute
```

**Default Condition Properties:**
- Attribute: "Select Attribute" (placeholder)
- Operator: "equals"
- Value: "" (empty)

## Node Deletion

### Deletable Nodes
- ✅ Rules (also deletes conditions and action)
- ✅ Conditions (individual)
- ✅ Actions (individual)
- ❌ Attributes (part of matrix structure)
- ❌ Categories (part of matrix structure)

### Deletion Process
1. User clicks "🗑️ Delete" in property panel
2. Confirmation dialog appears
3. If confirmed:
   - Node is removed
   - All connected edges are removed
   - Related nodes are removed (for rules)
   - Screen reader announces deletion
   - Dirty flag is set

## Implementation Details

### ReactFlow Configuration
```typescript
<ReactFlow
  nodesConnectable={!readOnly}  // Enable connection creation
  connectionMode="loose"         // Allow flexible connections
  isValidConnection={(connection) => {
    // Only allow attribute -> condition
    return sourceNode?.type === 'attribute' && 
           targetNode?.type === 'condition';
  }}
  onConnect={onConnect}          // Handle new connections
  onEdgesDelete={onEdgesDelete}  // Handle edge deletion
/>
```

### Connection Handler
```typescript
const onConnect = useCallback((connection: any) => {
  const sourceNode = allNodes.find(n => n.id === connection.source);
  const targetNode = allNodes.find(n => n.id === connection.target);
  
  // Update condition to reference new attribute
  setAllNodes((nds) =>
    nds.map((node) => {
      if (node.id === targetNode.id) {
        return {
          ...node,
          data: {
            ...node.data,
            condition: {
              ...conditionData.condition,
              attribute: attributeData.attribute.name
            }
          }
        };
      }
      return node;
    })
  );
  
  // Add edge
  setEdges((eds) => [...eds, newEdge]);
  setIsDirty(true);
}, [allNodes, readOnly]);
```

### Node Handles
All connectable nodes must have handles:

**Attribute Node:**
```typescript
<Handle
  type="source"
  position={Position.Right}
  id="attribute-out"
  isConnectable={true}
/>
```

**Condition Node:**
```typescript
<Handle
  type="target"
  position={Position.Left}
  id="condition-in"
  isConnectable={true}
/>
```

## User Workflow

### Creating a New Rule with Conditions

1. Click "➕ Add Rule" in toolbar
2. New rule appears with default action
3. Click "+ Add Node" in rule property panel
4. New condition node appears
5. Drag from an attribute to the condition
6. Edit condition operator and value in property panel
7. Repeat steps 3-6 for additional conditions
8. Click "Save Changes" to persist

### Modifying Existing Connections

1. Click on an edge to select it
2. Press Delete or Backspace
3. Drag from a different attribute to the condition
4. Condition automatically updates
5. Click "Save Changes" to persist

### Deleting a Rule

1. Click on the rule node
2. Click "🗑️ Delete" in property panel
3. Confirm deletion
4. Rule, conditions, and action are removed
5. Click "Save Changes" to persist

## Accessibility

### Keyboard Support
- Tab to navigate between nodes
- Enter to select a node
- Escape to deselect
- Delete/Backspace to remove selected edge
- Arrow keys to navigate between connected nodes

### Screen Reader Announcements
- "Connected [attribute] to condition. Condition now checks [attribute]."
- "Disconnected [attribute] from condition. Condition may need updating."
- "Added new rule: [name]. You can now add conditions by connecting attributes to the rule."
- "Added new condition to rule. Connect an attribute to this condition to complete it."
- "Deleted rule and its related conditions and action."
- "Invalid connection. You can only connect attributes to conditions."

## Validation

### Connection Validation
- Prevents connecting non-attribute nodes to conditions
- Prevents connecting to non-condition nodes
- Validates in real-time during drag operation

### Save Validation
- Checks for validation errors before saving
- Blocks save if critical errors exist
- Shows validation summary panel
- Highlights problematic nodes

## Best Practices

### When to Use Connection Editing
- ✅ Quickly changing which attribute a condition checks
- ✅ Experimenting with different rule configurations
- ✅ Visualizing rule dependencies
- ✅ Teaching users how rules work

### When to Use Property Panel
- ✅ Editing condition operators and values
- ✅ Changing rule priorities and descriptions
- ✅ Modifying action types and parameters
- ✅ Fine-tuning attribute weights

### Tips
- Start by adding the rule, then add conditions
- Connect attributes to conditions before editing condition details
- Use the "Show All" toggle to see unused attributes
- Delete unused conditions to keep the flow clean
- Save frequently to avoid losing work

## Future Enhancements

Potential future additions:
- Drag to reorder conditions within a rule
- Copy/paste nodes
- Duplicate rules
- Undo/redo functionality
- Multi-select for bulk operations
- Connection labels showing condition details
- Visual indicators for rule priority
- Collapsible rule groups

---

**Last Updated:** November 10, 2025
**Version:** 2.1.0
