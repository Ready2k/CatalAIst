import React, { useState, useEffect } from 'react';

interface WelcomeTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  title: string;
  content: string;
  highlightSelector?: string;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to the Decision Matrix Visual Editor!',
    content: `This tool helps you see and customize how CatalAIst classifies business processes. The AI provides intelligent suggestions, and you can add rules to ensure classifications match your business needs.`,
    position: 'center'
  },
  {
    title: 'Attributes',
    content: `These are ATTRIBUTES - characteristics of your business processes.

Examples: frequency, complexity, risk, business_value

The AI extracts these from conversations, and they flow through your rules to determine the final classification.`,
    highlightSelector: '[data-node-type="attribute"]',
    position: 'right'
  },
  {
    title: 'Rules',
    content: `These are RULES - your custom logic for classification.

Each rule has:
• Priority (higher = evaluated first)
• Conditions (when does this rule apply?)
• Actions (what should happen?)

Rules let you override AI suggestions when you know better.`,
    highlightSelector: '[data-node-type="rule"]',
    position: 'right'
  },
  {
    title: 'Categories',
    content: `These are CATEGORIES - the final classification outcomes.

• Eliminate - Remove unnecessary processes
• Simplify - Streamline complexity
• Digitise - Convert to digital
• RPA - Automate repetitive tasks
• AI Agent - AI with human oversight
• Agentic AI - Autonomous AI

Rules can override the AI to force a specific category.`,
    highlightSelector: '[data-node-type="category"]',
    position: 'left'
  },
  {
    title: 'Editing',
    content: `Click any node to edit its properties.

Try it now: Click on a rule to see its conditions and actions. You can adjust priorities, add conditions, or change actions.

All changes are versioned - you can always revert!`,
    position: 'center'
  }
];

const TOUR_COMPLETED_KEY = 'catalai-tour-completed';

export const WelcomeTour: React.FC<WelcomeTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElements, setHighlightedElements] = useState<HTMLElement[]>([]);

  useEffect(() => {
    if (!isOpen) {
      clearHighlights();
      return;
    }

    const step = TOUR_STEPS[currentStep];
    if (step.highlightSelector) {
      highlightElements(step.highlightSelector);
    } else {
      clearHighlights();
    }

    return () => clearHighlights();
  }, [isOpen, currentStep]);

  const highlightElements = (selector: string) => {
    clearHighlights();
    const elements = document.querySelectorAll(selector);
    const elementsArray = Array.from(elements) as HTMLElement[];
    
    elementsArray.forEach(el => {
      el.style.outline = '3px solid #3b82f6';
      el.style.outlineOffset = '4px';
      el.style.zIndex = '1000';
    });
    
    setHighlightedElements(elementsArray);
  };

  const clearHighlights = () => {
    highlightedElements.forEach(el => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.zIndex = '';
    });
    setHighlightedElements([]);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    clearHighlights();
    onClose();
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          pointerEvents: 'auto'
        }}
        onClick={handleSkip}
      />

      {/* Tour Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          zIndex: 9999,
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
            {step.title}
          </h2>
          <div style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
            Step {currentStep + 1} of {TOUR_STEPS.length}
          </div>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '24px', fontSize: '15px', lineHeight: '1.6', color: '#374151', whiteSpace: 'pre-line' }}>
          {step.content}
        </div>

        {/* Progress Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          {TOUR_STEPS.map((_, index) => (
            <div
              key={index}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: index === currentStep ? '#3b82f6' : '#d1d5db',
                transition: 'background-color 0.2s'
              }}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <button
            onClick={handleSkip}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#6b7280',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Skip Tour
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            {!isFirstStep && (
              <button
                onClick={handleBack}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                ← Back
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              {isLastStep ? 'Finish Tour' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export const shouldShowTour = (): boolean => {
  return localStorage.getItem(TOUR_COMPLETED_KEY) !== 'true';
};

export const resetTour = (): void => {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
};
