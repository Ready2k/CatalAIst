# Requirements Document

## Introduction

This document specifies the requirements for an interactive visual editor for the CatalAIst decision matrix system. The feature will enable administrators to visualize and edit the decision matrix rules, attributes, and logic flows using an interactive node-based graph interface powered by ReactFlow 11. This visualization will make the complex rule-based classification system more transparent, easier to understand, and simpler to modify.

## Glossary

- **Decision Matrix System**: The rule-based classification engine that evaluates business processes against attributes and rules to determine transformation categories
- **ReactFlow**: A React library for building node-based interactive graphs and diagrams (version 11+)
- **Visualization Component**: The React component that renders the decision matrix as an interactive flow diagram
- **Node**: A visual element in the flow diagram representing an attribute, condition, rule, or action
- **Edge**: A visual connection between nodes showing the flow of logic
- **Attribute Node**: A node representing a decision matrix attribute (e.g., frequency, complexity, risk)
- **Condition Node**: A node representing a condition that evaluates an attribute (e.g., frequency == "daily")
- **Rule Node**: A node representing a decision rule with priority and conditions
- **Action Node**: A node representing the outcome of a rule (override, adjust_confidence, flag_review)
- **Category Node**: A node representing a final transformation category (Eliminate, Simplify, Digitise, RPA, AI Agent, Agentic AI)
- **Admin Interface**: The administrative UI where users manage the decision matrix
- **Docker Environment**: The containerized production deployment environment

## Requirements

### Requirement 1: Interactive Flow Visualization

**User Story:** As an administrator, I want to see the decision matrix as an interactive flow diagram, so that I can understand how attributes, conditions, and rules connect to produce classification decisions.

#### Acceptance Criteria

1. WHEN the administrator navigates to the decision matrix admin page, THE Visualization Component SHALL render all active attributes as Attribute Nodes in the flow diagram
2. WHEN the administrator views the flow diagram, THE Visualization Component SHALL render all active rules as Rule Nodes with their priority displayed
3. WHEN the administrator views the flow diagram, THE Visualization Component SHALL render all rule conditions as Condition Nodes connected to their respective Attribute Nodes
4. WHEN the administrator views the flow diagram, THE Visualization Component SHALL render all rule actions as Action Nodes connected to their respective Rule Nodes
5. WHEN the administrator views the flow diagram, THE Visualization Component SHALL render all transformation categories as Category Nodes showing the final classification outcomes

### Requirement 2: Visual Rule Flow Representation

**User Story:** As an administrator, I want to see how data flows from attributes through conditions and rules to final classifications, so that I can understand the decision logic at a glance.

#### Acceptance Criteria

1. WHEN the flow diagram is rendered, THE Visualization Component SHALL display Edges connecting Attribute Nodes to Condition Nodes that evaluate those attributes
2. WHEN the flow diagram is rendered, THE Visualization Component SHALL display Edges connecting Condition Nodes to Rule Nodes that use those conditions
3. WHEN the flow diagram is rendered, THE Visualization Component SHALL display Edges connecting Rule Nodes to Action Nodes that execute when rules trigger
4. WHEN the flow diagram is rendered, THE Visualization Component SHALL display Edges connecting Action Nodes to Category Nodes that represent the final classification
5. WHEN a rule has multiple conditions, THE Visualization Component SHALL display all condition paths converging into the Rule Node

### Requirement 3: Node Interaction and Editing

**User Story:** As an administrator, I want to click on nodes to view and edit their properties, so that I can modify the decision matrix without editing raw JSON.

#### Acceptance Criteria

1. WHEN the administrator clicks on an Attribute Node, THE Visualization Component SHALL display a property panel showing the attribute's name, type, weight, description, and possible values
2. WHEN the administrator clicks on a Rule Node, THE Visualization Component SHALL display a property panel showing the rule's name, description, priority, active status, and conditions
3. WHEN the administrator clicks on an Action Node, THE Visualization Component SHALL display a property panel showing the action type, target category, confidence adjustment, and rationale
4. WHEN the administrator modifies a node property in the property panel, THE Visualization Component SHALL update the underlying decision matrix data structure
5. WHEN the administrator saves changes, THE Admin Interface SHALL persist the updated decision matrix as a new version

### Requirement 4: Visual Rule Priority Indication

**User Story:** As an administrator, I want to see rule priorities visually represented, so that I can understand which rules are evaluated first.

#### Acceptance Criteria

1. WHEN the flow diagram is rendered, THE Visualization Component SHALL display Rule Nodes with visual indicators of their priority level
2. WHEN multiple rules exist, THE Visualization Component SHALL arrange Rule Nodes vertically or use color coding to indicate priority order
3. WHEN the administrator hovers over a Rule Node, THE Visualization Component SHALL display a tooltip showing the exact priority number
4. WHEN the administrator modifies a rule priority, THE Visualization Component SHALL update the visual representation immediately
5. WHERE rules have the same priority, THE Visualization Component SHALL display them at the same visual level

### Requirement 5: Active/Inactive Rule Visualization

**User Story:** As an administrator, I want to see which rules are active or inactive, so that I can understand which rules are currently being applied.

#### Acceptance Criteria

1. WHEN the flow diagram is rendered, THE Visualization Component SHALL display active Rule Nodes with full opacity and color
2. WHEN the flow diagram is rendered, THE Visualization Component SHALL display inactive Rule Nodes with reduced opacity or grayscale styling
3. WHEN the administrator clicks on a Rule Node, THE Visualization Component SHALL provide a toggle control to activate or deactivate the rule
4. WHEN a rule is deactivated, THE Visualization Component SHALL update the visual styling of the Rule Node and its connected Edges
5. WHEN a rule is activated, THE Visualization Component SHALL restore the normal visual styling of the Rule Node and its connected Edges

### Requirement 6: Attribute Weight Visualization

**User Story:** As an administrator, I want to see attribute weights visually represented, so that I can understand which attributes have more influence on classifications.

#### Acceptance Criteria

1. WHEN the flow diagram is rendered, THE Visualization Component SHALL display Attribute Nodes with visual indicators of their weight value
2. WHEN an attribute has a higher weight, THE Visualization Component SHALL display the Attribute Node with increased size or visual prominence
3. WHEN the administrator hovers over an Attribute Node, THE Visualization Component SHALL display a tooltip showing the exact weight value
4. WHEN the administrator modifies an attribute weight, THE Visualization Component SHALL update the visual representation immediately
5. WHERE an attribute has a weight of 0, THE Visualization Component SHALL display the Attribute Node with minimal visual prominence

### Requirement 7: Layout and Navigation

**User Story:** As an administrator, I want to pan, zoom, and rearrange the flow diagram, so that I can focus on specific parts of the decision matrix.

#### Acceptance Criteria

1. WHEN the administrator uses the mouse wheel, THE Visualization Component SHALL zoom in or out of the flow diagram
2. WHEN the administrator clicks and drags on the canvas, THE Visualization Component SHALL pan the view to show different areas of the diagram
3. WHEN the administrator clicks and drags a node, THE Visualization Component SHALL allow repositioning of that node
4. WHEN the administrator double-clicks on the canvas, THE Visualization Component SHALL reset the view to fit all nodes
5. WHEN the diagram is large, THE Visualization Component SHALL provide a minimap for navigation

### Requirement 8: Rule Condition Display

**User Story:** As an administrator, I want to see the conditions for each rule clearly displayed, so that I can understand when rules will trigger.

#### Acceptance Criteria

1. WHEN a Rule Node is displayed, THE Visualization Component SHALL show the number of conditions associated with that rule
2. WHEN the administrator clicks on a Rule Node, THE Visualization Component SHALL display all conditions in the property panel with their attribute, operator, and value
3. WHEN a condition uses an "in" or "not_in" operator, THE Visualization Component SHALL display the array of values clearly
4. WHEN multiple conditions exist for a rule, THE Visualization Component SHALL indicate that all conditions must be met (AND logic)
5. WHEN the administrator modifies a condition, THE Visualization Component SHALL validate the operator and value against the attribute type

### Requirement 9: Action Type Visualization

**User Story:** As an administrator, I want to see what actions rules perform, so that I can understand the impact of each rule.

#### Acceptance Criteria

1. WHEN an Action Node is displayed, THE Visualization Component SHALL use distinct visual styling for override, adjust_confidence, and flag_review action types
2. WHEN an action is an override, THE Visualization Component SHALL display the target category prominently
3. WHEN an action is a confidence adjustment, THE Visualization Component SHALL display the adjustment value with a plus or minus sign
4. WHEN an action is a flag_review, THE Visualization Component SHALL use a warning or alert visual indicator
5. WHEN the administrator hovers over an Action Node, THE Visualization Component SHALL display the action rationale in a tooltip

### Requirement 10: Docker Compatibility

**User Story:** As a system administrator, I want the visualization feature to work in Docker deployments, so that production environments can use the visual editor.

#### Acceptance Criteria

1. WHEN the frontend is built using npm run build, THE build process SHALL include ReactFlow 11 library in the bundled assets
2. WHEN the Docker container is built, THE frontend Dockerfile SHALL successfully compile the Visualization Component
3. WHEN the application runs in Docker, THE Visualization Component SHALL render correctly in the nginx-served frontend
4. WHEN the application runs in Docker, THE Visualization Component SHALL have the same functionality as in local development
5. WHEN the Docker image is built, THE final image size SHALL not increase by more than 500KB due to ReactFlow dependencies

### Requirement 11: Data Persistence

**User Story:** As an administrator, I want my changes to the decision matrix to be saved with version control, so that I can track modifications and revert if needed.

#### Acceptance Criteria

1. WHEN the administrator saves changes from the Visualization Component, THE Admin Interface SHALL create a new version of the decision matrix
2. WHEN a new version is created, THE Admin Interface SHALL increment the version number appropriately
3. WHEN the administrator saves changes, THE Admin Interface SHALL persist the updated matrix to the versioned storage system
4. WHEN the administrator loads a previous version, THE Visualization Component SHALL render that version's structure
5. WHEN changes are saved, THE Admin Interface SHALL update the createdAt timestamp and createdBy field

### Requirement 12: Performance and Responsiveness

**User Story:** As an administrator, I want the visualization to load and respond quickly, so that I can work efficiently with complex decision matrices.

#### Acceptance Criteria

1. WHEN the decision matrix has up to 50 rules, THE Visualization Component SHALL render the complete flow diagram within 2 seconds
2. WHEN the administrator interacts with nodes, THE Visualization Component SHALL respond to clicks and drags within 100 milliseconds
3. WHEN the administrator modifies node properties, THE Visualization Component SHALL update the visual representation within 200 milliseconds
4. WHEN the decision matrix is large, THE Visualization Component SHALL use virtualization or lazy loading to maintain performance
5. WHEN the browser window is resized, THE Visualization Component SHALL adjust the layout responsively

### Requirement 13: Validation and Error Handling

**User Story:** As an administrator, I want to be notified of invalid configurations, so that I can maintain a functional decision matrix.

#### Acceptance Criteria

1. WHEN the administrator creates a condition with an invalid operator for an attribute type, THE Visualization Component SHALL display an error message
2. WHEN the administrator sets an attribute weight outside the 0-1 range, THE Visualization Component SHALL display a validation error
3. WHEN the administrator creates a rule without any conditions, THE Visualization Component SHALL display a warning
4. WHEN the administrator creates an override action without a target category, THE Visualization Component SHALL display an error message
5. WHEN validation errors exist, THE Admin Interface SHALL prevent saving the decision matrix until errors are resolved

### Requirement 14: Integration with Existing Admin Interface

**User Story:** As an administrator, I want to switch between the visual editor and the existing list-based editor, so that I can use whichever interface suits my needs.

#### Acceptance Criteria

1. WHEN the administrator is on the decision matrix admin page, THE Admin Interface SHALL provide a toggle to switch between list view and flow view
2. WHEN the administrator switches to flow view, THE Visualization Component SHALL load and display the current decision matrix
3. WHEN the administrator switches back to list view, THE Admin Interface SHALL display the existing DecisionMatrixAdmin component
4. WHEN changes are made in either view, THE Admin Interface SHALL keep both views synchronized with the same underlying data
5. WHEN the administrator saves changes in either view, THE Admin Interface SHALL persist the changes using the same versioning system

### Requirement 15: Interactive Help and Onboarding

**User Story:** As a first-time administrator, I want guided help and explanations, so that I can understand how to use the decision matrix visual editor effectively.

#### Acceptance Criteria

1. WHEN the administrator opens the flow view for the first time, THE Visualization Component SHALL automatically launch a welcome tour explaining key concepts
2. WHEN the administrator hovers over any node, THE Visualization Component SHALL display a contextual tooltip explaining that node's purpose and properties
3. WHEN the administrator clicks the help button, THE Admin Interface SHALL display a help panel with comprehensive documentation and examples
4. WHEN the flow view is displayed, THE Visualization Component SHALL show a collapsible legend explaining all node types and visual indicators
5. WHEN the administrator clicks "Start Tutorial", THE Visualization Component SHALL launch an interactive tutorial mode with guided exercises

### Requirement 16: Visual Legend and Documentation

**User Story:** As an administrator, I want a persistent visual reference, so that I can quickly understand what different nodes and colors represent.

#### Acceptance Criteria

1. WHEN the flow view is displayed, THE Visualization Component SHALL show a legend panel identifying all node types with icons and descriptions
2. WHEN the administrator clicks on a legend item, THE Visualization Component SHALL highlight all nodes of that type in the diagram
3. WHEN the administrator collapses the legend, THE Visualization Component SHALL minimize it to a small icon that can be re-expanded
4. WHEN the administrator clicks "Show Full Guide" in the legend, THE Admin Interface SHALL open the comprehensive help panel
5. WHERE node types use color coding, THE legend SHALL explain the color scheme and what each color represents

### Requirement 17: Contextual Tooltips

**User Story:** As an administrator, I want helpful tooltips on all interactive elements, so that I can learn the interface without reading lengthy documentation.

#### Acceptance Criteria

1. WHEN the administrator hovers over an Attribute Node, THE Visualization Component SHALL display a tooltip showing the attribute name, type, weight, and description
2. WHEN the administrator hovers over a Rule Node, THE Visualization Component SHALL display a tooltip showing the rule name, priority, conditions summary, and active status
3. WHEN the administrator hovers over an Action Node, THE Visualization Component SHALL display a tooltip showing the action type, target, and rationale
4. WHEN the administrator hovers over any button or control, THE Visualization Component SHALL display a tooltip explaining its function
5. WHEN tooltips are displayed, THE Visualization Component SHALL position them to avoid obscuring important content
