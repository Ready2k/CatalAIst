import React, { useState } from 'react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: (
      <>
        <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          What is the Decision Matrix?
        </h4>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          The decision matrix is a rule-based system that works alongside AI to classify business processes. 
          Think of it as a way to add your business expertise to the AI's intelligence.
        </p>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          How It Works
        </h4>
        <ol style={{ marginBottom: '12px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>AI Analyzes</strong> - The AI reads process descriptions and suggests a category</li>
          <li><strong>Rules Apply</strong> - Your custom rules check if adjustments are needed</li>
          <li><strong>Final Decision</strong> - The system combines AI + rules for the best outcome</li>
        </ol>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Why Use Rules?
        </h4>
        <ul style={{ marginBottom: '12px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Certainty</strong>: Guarantee specific outcomes for critical processes</li>
          <li><strong>Compliance</strong>: Enforce business policies (e.g., "high risk = manual review")</li>
          <li><strong>Expertise</strong>: Codify your team's knowledge</li>
          <li><strong>Consistency</strong>: Ensure similar processes are classified the same way</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Your First Rule
        </h4>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Try creating a rule like: "If data_sensitivity = 'restricted' → Flag for manual review"
        </p>
        <p style={{ marginBottom: 0, lineHeight: '1.6' }}>
          This ensures sensitive data is always reviewed by a human.
        </p>
      </>
    )
  },
  {
    id: 'node-types',
    title: 'Understanding Node Types',
    content: (
      <>
        <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          📊 Attributes
        </h4>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Process characteristics extracted by AI:
        </p>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>frequency</strong>: How often it runs</li>
          <li><strong>complexity</strong>: How complicated it is</li>
          <li><strong>risk</strong>: Potential impact if automated</li>
          <li><strong>business_value</strong>: Importance to business</li>
          <li><strong>user_count</strong>: Number of people affected</li>
          <li><strong>data_sensitivity</strong>: Data security level</li>
        </ul>
        <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
          <strong>Weight</strong>: Controls how much this attribute influences decisions (0-1)
        </p>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          ⚡ Rules
        </h4>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Your custom logic for classification:
        </p>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Priority</strong>: Higher numbers = evaluated first (0-100)</li>
          <li><strong>Conditions</strong>: When does this rule apply? (AND logic)</li>
          <li><strong>Actions</strong>: What should happen when triggered?</li>
          <li><strong>Active/Inactive</strong>: Toggle rules on/off without deleting</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          ◆ Conditions
        </h4>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Checks that must be true for a rule to trigger:
        </p>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Operators</strong>: ==, !=, &gt;, &lt;, &gt;=, &lt;=, in, not_in</li>
          <li><strong>Example</strong>: frequency == "daily"</li>
          <li>All conditions must be true (AND logic)</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          🎯 Actions
        </h4>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          What happens when a rule triggers:
        </p>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Override</strong>: Force a specific category</li>
          <li><strong>Adjust Confidence</strong>: Boost/reduce AI confidence (±0.5)</li>
          <li><strong>Flag Review</strong>: Mark for manual review</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          🤖 Categories
        </h4>
        <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
          Final classification outcomes:
        </p>
        <ul style={{ marginBottom: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Eliminate</strong>: Remove unnecessary processes</li>
          <li><strong>Simplify</strong>: Streamline complexity</li>
          <li><strong>Digitise</strong>: Convert to digital</li>
          <li><strong>RPA</strong>: Automate repetitive tasks</li>
          <li><strong>AI Agent</strong>: AI with human oversight</li>
          <li><strong>Agentic AI</strong>: Autonomous AI</li>
        </ul>
      </>
    )
  },
  {
    id: 'editing',
    title: 'Editing Rules',
    content: (
      <>
        <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Selecting Nodes
        </h4>
        <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
          Click any node to open its property panel on the right. You can edit weights, priorities, 
          conditions, and actions directly.
        </p>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Creating Connections
        </h4>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Drag from Attribute to Condition</strong>: Click and drag from an attribute's handle (right side) to a condition's handle (left side)</li>
          <li>This connects the attribute to the condition, making the condition check that attribute</li>
          <li>You can only connect attributes to conditions (other connections are not allowed)</li>
          <li>When you create a connection, the condition automatically updates to reference the new attribute</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Deleting Connections
        </h4>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Click on an edge (connection line) to select it</li>
          <li>Press Delete or Backspace to remove the connection</li>
          <li>You can also delete nodes, which will remove all their connections</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Adding and Deleting Nodes
        </h4>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Add Rule</strong>: Click "➕ Add Rule" in the toolbar to create a new rule</li>
          <li><strong>Add Condition</strong>: Open a rule's property panel and click "+ Add Node" to create a new condition</li>
          <li><strong>Delete Node</strong>: Open a node's property panel and click "🗑️ Delete" (not available for attributes and categories)</li>
          <li>Deleting a rule also deletes all its conditions and action</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Editing Attributes
        </h4>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Adjust weight using the slider (0-1)</li>
          <li>Higher weight = more influence on classification</li>
          <li>Add or update description for clarity</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Editing Rules
        </h4>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Change priority to control evaluation order</li>
          <li>Toggle active/inactive to enable/disable rules</li>
          <li>Add or remove conditions</li>
          <li>Modify the action type and parameters</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Navigation
        </h4>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Zoom</strong>: Mouse wheel or zoom controls</li>
          <li><strong>Pan</strong>: Click and drag on empty space</li>
          <li><strong>Move Nodes</strong>: Click and drag individual nodes</li>
          <li><strong>Fit View</strong>: Double-click empty space or use fit button</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Saving Changes
        </h4>
        <p style={{ marginBottom: 0, lineHeight: '1.6' }}>
          Click "Save Changes" to persist your modifications. All changes are versioned, 
          so you can always revert to a previous version if needed.
        </p>
      </>
    )
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    content: (
      <>
        <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Rule Priority Strategy
        </h4>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Use high priorities (90-100) for critical business rules</li>
          <li>Use medium priorities (50-89) for general guidelines</li>
          <li>Use low priorities (1-49) for edge cases and exceptions</li>
          <li>Leave gaps between priorities for future insertions</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          When to Use Override vs Adjust Confidence
        </h4>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Override</strong>: When you're 100% certain of the outcome (e.g., compliance rules)</li>
          <li><strong>Adjust Confidence</strong>: When you want to nudge the AI without forcing a decision</li>
          <li><strong>Flag Review</strong>: When human judgment is needed (e.g., high-risk processes)</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Attribute Weights
        </h4>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Start with equal weights (0.5) and adjust based on results</li>
          <li>Increase weight for attributes that strongly indicate a category</li>
          <li>Decrease weight for attributes with high variability</li>
          <li>Set weight to 0 to effectively ignore an attribute</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Testing Your Rules
        </h4>
        <ul style={{ marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Start with a few high-confidence rules</li>
          <li>Test with real process descriptions</li>
          <li>Monitor classification results and adjust</li>
          <li>Use inactive rules to test without affecting production</li>
        </ul>
        
        <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
          Avoiding Common Pitfalls
        </h4>
        <ul style={{ marginBottom: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Don't create too many override rules - let the AI learn</li>
          <li>Avoid conflicting rules with the same priority</li>
          <li>Keep conditions simple and focused</li>
          <li>Document your rationale for complex rules</li>
          <li>Regularly review and prune unused rules</li>
        </ul>
      </>
    )
  }
];

export const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));

  if (!isOpen) return null;

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
    setActiveSection(sectionId);
  };

  // Filter sections based on search query
  const filteredSections = searchQuery
    ? HELP_SECTIONS.filter(section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : HELP_SECTIONS;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 9998
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '500px',
          maxWidth: '90vw',
          backgroundColor: 'white',
          boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
              Help Guide
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px',
                color: '#6b7280'
              }}
            >
              ×
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredSections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            
            return (
              <div key={section.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    border: 'none',
                    background: activeSection === section.id ? '#f3f4f6' : 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#1f2937'
                  }}
                >
                  <span>{section.title}</span>
                  <span style={{ fontSize: '20px', color: '#6b7280' }}>
                    {isExpanded ? '−' : '+'}
                  </span>
                </button>

                {/* Section Content */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '16px 20px',
                      fontSize: '14px',
                      color: '#374151',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    {section.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            fontSize: '12px',
            color: '#6b7280',
            textAlign: 'center'
          }}
        >
          Need more help? Contact your system administrator.
        </div>
      </div>
    </>
  );
};
