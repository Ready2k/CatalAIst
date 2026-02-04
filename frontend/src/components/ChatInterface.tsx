import React, { useState } from 'react';
import NonStreamingModeController from './voice/NonStreamingModeController';
import StreamingModeController from './voice/StreamingModeController';

interface ChatInterfaceProps {
  onSubmit: (description: string, subject?: string) => void;
  onVoiceRecord?: () => void;
  isProcessing?: boolean;
  showVoiceButton?: boolean;
  streamingMode?: boolean;
  voiceType?: string;
}

// Common business subjects
const COMMON_SUBJECTS = [
  'Finance',
  'Accounting',
  'Procurement',
  'Accounts Payable',
  'Accounts Receivable',
  'HR',
  'Human Resources',
  'Recruitment',
  'Onboarding',
  'Payroll',
  'Benefits',
  'Sales',
  'Marketing',
  'Customer Service',
  'Support',
  'IT',
  'Technology',
  'Infrastructure',
  'Security',
  'Operations',
  'Manufacturing',
  'Supply Chain',
  'Logistics',
  'Inventory',
  'Legal',
  'Compliance',
  'Risk Management',
  'Audit',
  'Product',
  'Engineering',
  'Development',
  'Quality Assurance',
  'Administration',
  'Facilities',
  'General Management'
].sort();

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSubmit,
  onVoiceRecord,
  isProcessing = false,
  showVoiceButton = true,
  streamingMode = false,
  voiceType,
}) => {
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [showCustomSubject, setShowCustomSubject] = useState(false);
  const [error, setError] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>(COMMON_SUBJECTS);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [wasProcessing, setWasProcessing] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [forceNonStreaming, setForceNonStreaming] = useState(false);

  // Load subjects from API on mount
  React.useEffect(() => {
    const loadSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const { apiService } = await import('../services/api');
        const subjects = await apiService.getSubjects();
        if (subjects.length > 0) {
          setAvailableSubjects(subjects);
        }
      } catch (error) {
        console.warn('Failed to load subjects from API, using defaults:', error);
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, []);

  // Clear form when processing completes
  React.useEffect(() => {
    if (wasProcessing && !isProcessing) {
      // Processing just finished, clear the form
      setDescription('');
      setSubject('');
      setCustomSubject('');
      setShowCustomSubject(false);
    }
    setWasProcessing(isProcessing);
  }, [isProcessing, wasProcessing]);

  const validateDescription = (text: string): boolean => {
    if (text.trim().length < 10) {
      setError('Please provide at least 10 characters');
      return false;
    }
    return true;
  };

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    if (value === 'custom') {
      setShowCustomSubject(true);
    } else {
      setShowCustomSubject(false);
      setCustomSubject('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (validateDescription(description)) {
      const finalSubject = showCustomSubject && customSubject.trim()
        ? customSubject.trim()
        : subject || undefined;

      // If custom subject was entered, save it to the backend
      if (showCustomSubject && customSubject.trim()) {
        try {
          const { apiService } = await import('../services/api');
          await apiService.addCustomSubject(customSubject.trim());
          // Add to local list for immediate use
          if (!availableSubjects.includes(customSubject.trim())) {
            setAvailableSubjects([...availableSubjects, customSubject.trim()].sort());
          }
        } catch (error) {
          console.warn('Failed to save custom subject:', error);
          // Continue anyway - subject will still be used for this session
        }
      }

      onSubmit(description, finalSubject);
      // Don't clear the input immediately - let the parent component handle it
      // This allows users to see their text while processing
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setDescription(text);
    setShowVoiceModal(false);
    // Auto-submit after voice input
    if (validateDescription(text)) {
      const finalSubject = showCustomSubject && customSubject.trim()
        ? customSubject.trim()
        : subject || undefined;
      onSubmit(text, finalSubject);
    }
  };

  const handleVoiceCancel = () => {
    setShowVoiceModal(false);
    setForceNonStreaming(false);
  };

  const handleSwitchToNonStreaming = () => {
    setForceNonStreaming(true);
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h2 style={{ marginBottom: '10px' }}>Describe Your Process</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Tell us about the business process or initiative you'd like to classify.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            Business Area / Subject (Optional)
          </label>
          <select
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            disabled={isProcessing || loadingSubjects}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: (isProcessing || loadingSubjects) ? 'not-allowed' : 'pointer'
            }}
          >
            <option value="">-- Auto-detect from description --</option>
            {availableSubjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="custom">✏️ Add Custom Subject...</option>
          </select>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            Helps group similar processes for consistency checking
          </div>
        </div>

        {showCustomSubject && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              Custom Subject Name
            </label>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="e.g., Research & Development"
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            Process Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: We currently manually review and approve expense reports by checking receipts against company policy..."
            disabled={isProcessing}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              fontSize: '14px',
              border: error ? '1px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          {error && (
            <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
              {error}
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            {description.length} characters (minimum 10 required)
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '12px 24px',
              backgroundColor: isProcessing ? '#6c757d' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isProcessing ? 'not-allowed' : 'pointer'
            }}
            onMouseOver={(e) => {
              if (!isProcessing) e.currentTarget.style.backgroundColor = '#0056b3';
            }}
            onMouseOut={(e) => {
              if (!isProcessing) e.currentTarget.style.backgroundColor = '#007bff';
            }}
          >
            {isProcessing ? 'Processing...' : 'Submit'}
          </button>

          {showVoiceButton && (
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              disabled={isProcessing}
              style={{
                padding: '12px 24px',
                backgroundColor: isProcessing ? '#6c757d' : '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                if (!isProcessing) e.currentTarget.style.backgroundColor = '#218838';
              }}
              onMouseOut={(e) => {
                if (!isProcessing) e.currentTarget.style.backgroundColor = '#28a745';
              }}
            >
              🎤 Voice
            </button>
          )}
        </div>
      </form>

      {/* Voice Modal */}
      {showVoiceModal && (
        (streamingMode && !forceNonStreaming) ? (
          <StreamingModeController
            onTranscriptionComplete={handleVoiceTranscription}
            onCancel={handleVoiceCancel}
            onSwitchToNonStreaming={handleSwitchToNonStreaming}
            voiceType={voiceType}
          />
        ) : (
          <NonStreamingModeController
            onTranscriptionComplete={handleVoiceTranscription}
            onCancel={handleVoiceCancel}
          />
        )
      )}
    </div>
  );
};

export default ChatInterface;
