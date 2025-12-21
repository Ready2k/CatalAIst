# Flow View Connection Editing - Quick Guide

## ✅ Connection Editing is Already Working!

The flow view **already supports** full connection editing. Here's how to use it:

## 🎯 What You Can Do

### 1. Create Connections (Drag & Drop)
```
Attribute Node → Condition Node
   (source)         (target)
```

**Steps:**
1. Find the **small circle on the right side** of an attribute node
2. **Click and hold** on that circle (handle)
3. **Drag** toward a condition node
4. **Drop** on the **left side circle** of the condition node
5. ✅ Connection created!

### 2. Delete Connections (Select & Delete)
```
Click Edge → Press Delete/Backspace → ✅ Removed
```

**Steps:**
1. **Click on the connection line** (it will highlight/select)
2. **Press Delete or Backspace** key
3. ✅ Connection deleted!

### 3. Reconnect (Delete + Create)
```
Old: Attribute A → Condition
New: Attribute B → Condition
```

**Steps:**
1. **Delete** the old connection (click edge, press Delete)
2. **Create** new connection (drag from different attribute)
3. ✅ Condition now checks the new attribute!

## 🎨 Visual Indicators

### Node Handles (Connection Points)
- **Attribute nodes**: Small circle on **right side** (source)
- **Condition nodes**: Small circle on **left side** (target)
- **Color**: Matches the node color
- **Size**: 10px for attributes, 8px for conditions

### Connection States
- **Normal**: Gray line (#94a3b8)
- **Selected**: Highlighted (click to select)
- **Creating**: Line follows cursor while dragging
- **Invalid**: Rejected with screen reader announcement

## 🚫 Connection Rules (By Design)

### ✅ Allowed Connections
- Attribute → Condition (ONLY valid connection type)

### ❌ Not Allowed
- Attribute → Rule (use condition as intermediary)
- Attribute → Action (use rule as intermediary)
- Condition → Condition (not supported)
- Rule → Attribute (wrong direction)
- Any other combination

**Why?** The decision matrix logic requires:
1. Attributes feed into Conditions
2. Conditions feed into Rules
3. Rules trigger Actions
4. Actions affect Categories

This structure ensures proper evaluation flow.

## 🎹 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Tab** | Navigate between nodes |
| **Arrow Keys** | Navigate connected nodes |
| **Enter** | Select/edit focused node |
| **Escape** | Deselect node/close panel |
| **Delete/Backspace** | Delete selected edge |

## 📱 Mobile/Touch Support

On mobile devices:
- **Tap** to select nodes/edges
- **Long press** might be needed for dragging
- **Pinch to zoom** for better precision
- **Two-finger pan** to move around

## 🔧 Configuration Details

The flow editor is configured with:

```typescript
nodesConnectable={!readOnly}        // Enable connection creation
edgesFocusable={!readOnly}          // Enable edge selection
edgesReconnectable={!readOnly}      // Enable reconnection
connectionMode="loose"              // Flexible connection creation
deleteKeyCode={['Backspace', 'Delete']} // Edge deletion keys
```

## 🎓 Learning Path

### Beginner
1. **Start the Welcome Tour** (🎓 Tour button)
2. **View the Legend** (📖 Legend button)
3. **Try creating one connection** (attribute → condition)
4. **Try deleting that connection** (click edge, press Delete)

### Intermediate
1. **Add a new rule** (➕ Add Rule button)
2. **Add conditions to the rule** (+ Add Node in rule panel)
3. **Connect attributes to conditions** (drag & drop)
4. **Edit condition values** (click condition, edit in panel)

### Advanced
1. **Reorganize rule logic** by reconnecting conditions
2. **Use "Show All" toggle** to see unused attributes
3. **Create complex rules** with multiple conditions
4. **Test with validation** before saving

## 🐛 Troubleshooting

### "I can't drag from an attribute"
- ✅ Make sure you're clicking on the **small circle** on the right edge
- ✅ Try zooming in (use mouse wheel or controls)
- ✅ Check you're not in read-only mode

### "The connection disappears when I drop"
- ✅ Make sure you're dropping on a **condition node** (cyan color)
- ✅ Drop on the **left side circle** of the condition
- ✅ Check the screen reader announcement for error message

### "I can't delete an edge"
- ✅ **Click the edge first** to select it (should highlight)
- ✅ **Then press Delete or Backspace** (not while clicking)
- ✅ Make sure you're not in read-only mode

### "Nothing happens when I try to connect"
- ✅ Check you're connecting **attribute → condition** (only valid type)
- ✅ Try refreshing the page
- ✅ Check browser console for errors

## 💡 Pro Tips

1. **Use "Reset View"** button to reposition after adding nodes
2. **Use "Show All"** to see which attributes aren't connected
3. **Delete unused conditions** to keep the flow clean
4. **Save frequently** - changes are only persisted on save
5. **Use validation panel** to catch errors before saving
6. **Screen reader users**: Listen for connection announcements

## 📊 Example Workflow

### Creating a New Rule with Conditions

```
1. Click "➕ Add Rule"
   → New rule appears with default action

2. Click the rule node
   → Property panel opens

3. Click "+ Add Node" in panel
   → New condition appears near rule

4. Drag from "Frequency" attribute
   → Drop on the new condition
   → Condition now checks "Frequency"

5. Click the condition node
   → Edit operator and value in panel

6. Repeat steps 3-5 for more conditions

7. Click "Save Changes"
   → New rule is persisted to database
```

## 🎯 Common Use Cases

### Change which attribute a condition checks
1. Click the edge connecting attribute to condition
2. Press Delete
3. Drag from a different attribute to the condition
4. Save changes

### Add a condition to an existing rule
1. Click the rule node
2. Click "+ Add Node" in property panel
3. Drag from an attribute to the new condition
4. Edit the condition details
5. Save changes

### Remove a condition from a rule
1. Click the condition node
2. Click "🗑️ Delete" in property panel
3. Confirm deletion
4. Save changes

---

**Last Updated:** November 12, 2025
**Version:** 2.1.0+

**Note:** Connection editing has been available since v2.1.0. This guide documents the existing functionality with enhanced configuration for easier use.
