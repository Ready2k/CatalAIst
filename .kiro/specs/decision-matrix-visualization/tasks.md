  # Implementation Plan

- [x] 1. Set up ReactFlow dependencies and project structure
  - Install @xyflow/react and dagre packages in frontend/package.json
  - Create directory structure for flow components (nodes, edges, panels, utils, help)
  - Set up TypeScript types for flow-specific data structures
  - Verify Docker build works with new dependencies
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 2. Implement data transformation utilities
  - [x] 2.1 Create matrixToFlow converter
    - Write function to convert DecisionMatrix to ReactFlow nodes and edges
    - Create node ID generation logic for attributes, rules, conditions, actions, categories
    - Implement edge creation logic connecting nodes based on relationships
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 2.2 Create flowToMatrix converter
    - Write function to convert ReactFlow graph back to DecisionMatrix structure
    - Extract attributes, rules, conditions, and actions from nodes
    - Implement version increment logic
    - Handle timestamp and metadata updates
    - _Requirements: 11.1, 11.2, 11.3, 11.5_
  
  - [x] 2.3 Implement layout engine
    - Integrate dagre library for auto-layout
    - Configure left-to-right layout with appropriate spacing
    - Implement column-based positioning (attributes → conditions → rules → actions → categories)
    - Add priority-based vertical sorting for rule nodes
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 2.4 Write unit tests for data transformation
    - Test matrixToFlow with various matrix structures
    - Test flowToMatrix preserves all data correctly
    - Test round-trip conversion (matrix → flow → matrix)
    - Test edge cases (empty rules, no conditions, single attribute)
    - _Requirements: 1.1-1.5, 11.1-11.5_

- [x] 3. Create custom node components
  - [x] 3.1 Implement AttributeNode component
    - Create node UI with attribute name, type badge, and weight indicator
    - Implement visual weight representation (progress bar or size scaling)
    - Add color coding by attribute type (categorical=blue, numeric=green, boolean=purple)
    - Add handle for outgoing connections
    - _Requirements: 1.1, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 3.2 Implement RuleNode component
    - Create node UI with rule name, priority badge, and condition count
    - Implement priority-based visual styling (border thickness)
    - Add active/inactive state styling (full color vs grayscale)
    - Add handles for incoming (conditions) and outgoing (actions) connections
    - _Requirements: 1.2, 4.1, 4.2, 5.1, 5.2_
  
  - [x] 3.3 Implement ConditionNode component
    - Create compact node UI showing attribute, operator, and value
    - Implement color matching with connected attribute
    - Add handles for incoming (attribute) and outgoing (rule) connections
    - Format value display for arrays (in/not_in operators)
    - _Requirements: 1.3, 2.1, 8.1, 8.3_
  
  - [x] 3.4 Implement ActionNode component
    - Create node UI with action type icon and description
    - Implement distinct styling for override, adjust_confidence, and flag_review types
    - Display target category for override actions
    - Display adjustment value for confidence actions
    - Add handles for incoming (rule) and outgoing (category) connections
    - _Requirements: 1.4, 9.1, 9.2, 9.3, 9.4_
  
  - [x] 3.5 Implement CategoryNode component
    - Create large, prominent node UI with category name and description
    - Implement category-specific color coding
    - Position nodes in fixed right column layout
    - Add handle for incoming connections
    - _Requirements: 1.5, 2.4_

- [x] 4. Implement node property panels
  - [x] 4.1 Create base NodePropertyPanel component
    - Build side panel layout with header, content area, and action buttons
    - Implement panel show/hide logic based on node selection
    - Add save and cancel buttons
    - Implement close button and escape key handler
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 4.2 Create AttributePropertyPanel
    - Build form for editing attribute weight (slider 0-1)
    - Add description text area
    - Display read-only fields (name, type, possible values)
    - Implement weight validation
    - _Requirements: 3.1, 6.3, 6.4, 13.2_
  
  - [x] 4.3 Create RulePropertyPanel
    - Build form for editing rule name and description
    - Add priority number input with validation
    - Implement active/inactive toggle
    - Display conditions list with add/remove functionality
    - Link to action editing
    - _Requirements: 3.2, 4.3, 4.4, 5.3, 8.2, 8.5_
  
  - [x] 4.4 Create ActionPropertyPanel
    - Build form for editing action type (dropdown)
    - Add conditional fields based on action type (target category, confidence adjustment)
    - Add rationale text area
    - Implement validation for required fields
    - _Requirements: 3.3, 9.2, 9.3, 13.4_

- [x] 5. Implement validation system
  - [x] 5.1 Create validation utility functions
    - Write attribute validation (weight range, unique names, type validity)
    - Write rule validation (has conditions, unique names, valid priority)
    - Write condition validation (operator matches type, value matches type)
    - Write action validation (required fields based on type)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [x] 5.2 Integrate validation into property panels
    - Display validation errors inline in property panels
    - Highlight invalid nodes with red borders
    - Prevent saving when validation errors exist
    - Show validation summary at bottom of editor
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 6. Build main DecisionMatrixFlowEditor component
  - [x] 6.1 Create base flow editor structure
    - Set up ReactFlow component with custom node types
    - Initialize nodes and edges from decision matrix
    - Implement node selection handling
    - Add zoom, pan, and fit-view controls
    - _Requirements: 1.1-1.5, 7.1, 7.2, 7.4_
  
  - [x] 6.2 Implement node interaction handlers
    - Handle node click for property panel display
    - Handle node drag for manual repositioning
    - Update node positions in state
    - Implement node hover effects
    - _Requirements: 3.1, 3.2, 3.3, 7.3, 12.2_
  
  - [x] 6.3 Implement save and cancel operations
    - Convert flow graph back to decision matrix on save
    - Call API to persist updated matrix
    - Handle version increment
    - Implement cancel with unsaved changes warning
    - _Requirements: 3.5, 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 6.4 Add minimap and controls
    - Integrate ReactFlow minimap for navigation
    - Add zoom controls (in, out, fit)
    - Add reset view button
    - Position controls in bottom-right corner
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [x] 7. Implement help and onboarding system
  - [x] 7.1 Create WelcomeTour component
    - Build 5-step guided tour with overlay and highlights
    - Implement step navigation (next, back, skip)
    - Add tour completion tracking (localStorage)
    - Create tour content for each step (overview, attributes, rules, categories, editing)
    - _Requirements: 15.1_
  
  - [x] 7.2 Create NodeLegend component
    - Build collapsible legend panel with all node types
    - Add icons and descriptions for each node type
    - Implement node highlighting on legend item click
    - Add "Show Full Guide" button
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  
  - [x] 7.3 Implement contextual tooltips
    - Create reusable ContextualTooltip component
    - Add tooltips to all node types with relevant information
    - Add tooltips to all buttons and controls
    - Implement smart positioning to avoid content obscuring
    - _Requirements: 15.2, 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [x] 7.4 Create HelpPanel component
    - Build slide-out help panel with navigation
    - Create help content sections (getting started, node types, editing, best practices)
    - Add search functionality for help content
    - Implement collapsible sections
    - _Requirements: 15.3, 15.4_
  
  - [ ]* 7.5 Create InteractiveTutorial component
    - Build tutorial mode with sample decision matrix
    - Create guided exercise for creating a rule
    - Implement step-by-step instructions with validation
    - Add completion celebration and summary
    - _Requirements: 15.5_

- [x] 8. Integrate with existing DecisionMatrixAdmin
  - [x] 8.1 Update DecisionMatrixAdmin component
    - Add view mode state (list vs flow)
    - Create view toggle buttons
    - Implement conditional rendering based on view mode
    - Ensure data synchronization between views
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [x] 8.2 Add help button and tour trigger
    - Add help button to admin interface header
    - Add "Start Tour" button for first-time users
    - Add "Show Legend" toggle button
    - Implement help menu with all help options
    - _Requirements: 15.1, 15.3, 15.4, 16.3_
  
  - [x] 8.3 Ensure consistent save behavior
    - Use same API endpoints for both views
    - Maintain version history across views
    - Show success/error messages consistently
    - Reload data after save in both views
    - _Requirements: 14.5, 11.1, 11.2, 11.3_

- [x] 9. Implement performance optimizations
  - [x] 9.1 Add React.memo to node components
    - Memoize AttributeNode, RuleNode, ConditionNode, ActionNode, CategoryNode
    - Implement custom comparison functions for memo
    - Memoize edge components
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 9.2 Implement debouncing for updates
    - Debounce property panel updates (300ms)
    - Debounce layout recalculation (500ms)
    - Debounce validation checks (200ms)
    - _Requirements: 12.2, 12.3_
  
  - [x] 9.3 Add performance monitoring
    - Measure initial render time
    - Measure interaction response times
    - Log performance metrics in development mode
    - Add performance budget checks
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 10. Test and validate Docker compatibility
  - [x] 10.1 Test frontend build with ReactFlow
    - Run npm run build in frontend directory
    - Verify no build errors
    - Check bundle size increase (should be < 500KB gzipped)
    - _Requirements: 10.1, 10.5_
  
  - [x] 10.2 Test Docker image build
    - Build Docker image using docker-compose
    - Verify frontend Dockerfile completes successfully
    - Check final image size
    - _Requirements: 10.2, 10.5_
  
  - [x] 10.3 Test runtime in Docker
    - Start containers with docker-compose up
    - Access flow editor in browser
    - Test all interactions (zoom, pan, edit, save)
    - Verify performance matches local development
    - _Requirements: 10.3, 10.4_

- [ ] 11. End-to-end integration testing
  - [ ]* 11.1 Test complete workflow
    - Load existing decision matrix
    - Switch to flow view
    - Edit attribute weight
    - Modify rule priority
    - Add new condition to rule
    - Change action type
    - Save changes
    - Verify new version created
    - Switch back to list view and verify changes
    - _Requirements: 1.1-1.5, 3.1-3.5, 11.1-11.5, 14.1-14.5_
  
  - [ ]* 11.2 Test help system
    - Complete welcome tour
    - Interact with legend
    - Hover over nodes to see tooltips
    - Open help panel and navigate sections
    - Complete interactive tutorial
    - _Requirements: 15.1-15.5, 16.1-16.5, 17.1-17.5_
  
  - [ ]* 11.3 Test validation and error handling
    - Attempt to set invalid attribute weight
    - Try to create rule without conditions
    - Test invalid operator for attribute type
    - Verify error messages display correctly
    - Confirm save is blocked with errors
    - _Requirements: 13.1-13.5_

- [x] 12. Polish and accessibility
  - [x] 12.1 Implement keyboard navigation
    - Add tab navigation through nodes
    - Implement arrow key navigation between connected nodes
    - Add Enter key to select/edit node
    - Add Escape key to deselect/close panels
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 12.2 Add ARIA labels and screen reader support
    - Add ARIA labels to all nodes
    - Implement focus management
    - Add screen reader announcements for node selection
    - Test with screen reader software
    - _Requirements: 12.1, 12.2_
  
  - [x] 12.3 Ensure visual accessibility
    - Verify color contrast meets WCAG AA standards
    - Test with color-blind simulation tools
    - Ensure minimum font size 14px
    - Add visible focus indicators
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 12.4 Responsive design adjustments
    - Test on different screen sizes
    - Adjust layout for smaller screens
    - Ensure property panel is usable on tablets
    - Test touch interactions on mobile devices
    - _Requirements: 12.5_
