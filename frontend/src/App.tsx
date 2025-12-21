import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import LLMConfiguration, { LLMConfig } from './components/LLMConfiguration';
import ChatInterface from './components/ChatInterface';
import VoiceRecorder from './components/VoiceRecorder';
import ClarificationQuestions from './components/ClarificationQuestions';
import ClassificationResult from './components/ClassificationResult';
import FeedbackCapture from './components/FeedbackCapture';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import DecisionMatrixAdmin from './components/DecisionMatrixAdmin';
import LearningAdmin from './components/LearningAdmin';
import PromptAdmin from './components/PromptAdmin';
import AuditTrail from './components/AuditTrail';
import UserManagement from './components/UserManagement';
import AdminReview from './components/AdminReview';
import { apiService } from './services/api';
import { Classification, TransformationCategory } from '../../shared/types';

type AppView = 'main' | 'analytics' | 'decision-matrix' | 'learning' | 'prompts' | 'audit' | 'configuration' | 'users' | 'admin-review';
type WorkflowState = 'input' | 'clarification' | 'result' | 'feedback' | 'submitted';

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');

  const [hasConfig, setHasConfig] = useState(false);
  const [llmConfig, setLLMConfig] = useState<LLMConfig | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('main');
  const [workflowState, setWorkflowState] = useState<WorkflowState>('input');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Voice configuration state
  const [voiceConfig, setVoiceConfig] = useState<{
    enabled: boolean;
    voiceType: string;
    streamingMode: boolean;
    provider?: string;
    // OpenAI credentials
    apiKey?: string;
    // AWS credentials
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
    awsSessionToken?: string;
    awsRegion?: string;
  } | null>(null);
  
  // Derived voice enabled flag for convenience
  const voiceEnabled = voiceConfig?.enabled || false;
  
  // Workflow data
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [classification, setClassification] = useState<Classification | null>(null);

  // Check for existing auth token and voice config on mount
  useEffect(() => {
    const token = sessionStorage.getItem('authToken');
    const storedUsername = sessionStorage.getItem('username');
    const storedRole = sessionStorage.getItem('userRole');
    const storedVoiceConfig = sessionStorage.getItem('voiceConfig');
    
    if (token && storedUsername) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
      setUserRole(storedRole || 'user');
      
      // Restore voice configuration if available
      if (storedVoiceConfig) {
        try {
          const parsedVoiceConfig = JSON.parse(storedVoiceConfig);
          setVoiceConfig(parsedVoiceConfig);
        } catch (err) {
          console.warn('Failed to parse stored voice config:', err);
        }
      }
    }
  }, []);

  const handleLoginSuccess = (token: string, user: string) => {
    setIsAuthenticated(true);
    setUsername(user);
    const role = sessionStorage.getItem('userRole') || 'user';
    setUserRole(role);
  };

  const handleLogout = async () => {
    // Delete active session from backend before clearing local state
    const sessionId = apiService.getSessionId();
    if (sessionId) {
      try {
        await apiService.deleteSession(sessionId);
      } catch (err) {
        console.warn('Failed to delete session on logout:', err);
        // Continue with logout even if session deletion fails
      }
    }
    
    sessionStorage.clear();
    setIsAuthenticated(false);
    setUsername('');
    setUserRole('');
    setHasConfig(false);
    setLLMConfig(null);
    setVoiceConfig(null); // Clear voice configuration
    apiService.clearSession();
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Helper function to determine if voice button should be shown
  const shouldShowVoiceButton = (): boolean => {
    return hasConfig && 
           voiceConfig !== null && 
           voiceConfig.enabled && 
           (workflowState === 'input' || workflowState === 'clarification');
  };

  const handleConfigSubmit = async (config: LLMConfig) => {
    setError('');
    setIsProcessing(true);
    try {
      // Set LLM config first so createSession can use it
      apiService.setLLMConfig(config);
      
      // Create session with appropriate credentials
      if (config.provider === 'openai' && config.apiKey) {
        await apiService.createSession(config.apiKey, config.model);
      } else {
        // For Bedrock, createSession will use the config we just set
        await apiService.createSession('', config.model);
      }
      
      setLLMConfig(config);
      setHasConfig(true);
      
      // Set voice configuration based on provider and settings
      if (config.voiceEnabled) {
        // Voice is enabled for this provider
        setVoiceConfig({
          enabled: true,
          voiceType: config.voiceType || (config.provider === 'bedrock' ? 'nova-sonic' : 'alloy'),
          streamingMode: config.streamingMode || false,
          provider: config.provider,
          // Store credentials for voice API calls
          ...(config.provider === 'openai' ? {
            apiKey: config.apiKey
          } : {
            awsAccessKeyId: config.awsAccessKeyId,
            awsSecretAccessKey: config.awsSecretAccessKey,
            awsSessionToken: config.awsSessionToken,
            awsRegion: config.awsRegion
          })
        });
        // Store in session storage for persistence (without credentials)
        sessionStorage.setItem('voiceConfig', JSON.stringify({
          enabled: true,
          voiceType: config.voiceType || (config.provider === 'bedrock' ? 'nova-sonic' : 'alloy'),
          streamingMode: config.streamingMode || false,
          provider: config.provider
        }));
      } else {
        // Voice is disabled
        setVoiceConfig({
          enabled: false,
          voiceType: config.provider === 'bedrock' ? 'nova-sonic' : 'alloy',
          streamingMode: false,
          provider: config.provider
        });
        // Clear voice config from session storage
        sessionStorage.removeItem('voiceConfig');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessSubmit = async (description: string, subject?: string) => {
    setError('');
    setIsProcessing(true);
    try {
      const response = await apiService.submitProcess(description, subject);
      
      console.log('Submit response:', response);
      
      // Check if user submitted (blind evaluation for regular users)
      if (response.submitted) {
        setWorkflowState('submitted');
      }
      // Check if we need clarification
      else if (response.clarificationQuestions && response.clarificationQuestions.length > 0) {
        setClarificationQuestions(response.clarificationQuestions);
        setQuestionCount(response.totalQuestions || response.clarificationQuestions.length);
        setWorkflowState('clarification');
      } 
      // Admin users get classification results
      else if (response.classification) {
        setClassification(response.classification);
        setWorkflowState('result');
      } else {
        // Unexpected response format
        console.warn('Unexpected response format:', response);
        setError('Received unexpected response from server. Please check console for details.');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to submit process');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClarificationAnswer = async (answer: string | string[]) => {
    setError('');
    setIsProcessing(true);
    try {
      // Convert single answer to array for consistency
      const answers = Array.isArray(answer) ? answer : [answer];
      
      // Send the answers along with the questions that were asked
      const response = await apiService.addConversation(answers, clarificationQuestions);
      
      // Update question count
      setQuestionCount(prev => prev + answers.length);
      
      // Check if user submitted (blind evaluation for regular users)
      if (response.submitted) {
        setWorkflowState('submitted');
      }
      // Check if we need more clarification
      else if (response.clarificationQuestions && response.clarificationQuestions.length > 0) {
        setClarificationQuestions(response.clarificationQuestions);
      } 
      // Admin users get classification results
      else if (response.classification) {
        setClassification(response.classification);
        setWorkflowState('result');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipInterview = async () => {
    setError('');
    setIsProcessing(true);
    try {
      // Force classification with current information
      const response = await apiService.forceClassification();
      
      if (response.classification) {
        setClassification(response.classification);
        setWorkflowState('result');
      } else {
        setError('Failed to classify. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to skip interview');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartFresh = async () => {
    // Confirm with user before clearing session
    if (!window.confirm('Are you sure you want to start fresh? This will clear your current session and all progress.')) {
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      // Delete current session from backend
      const sessionId = apiService.getSessionId();
      if (sessionId) {
        await apiService.deleteSession(sessionId);
      }
      
      // Clear local state
      setClarificationQuestions([]);
      setQuestionCount(0);
      setClassification(null);
      setWorkflowState('input');
      
      // Create new session
      if (llmConfig) {
        if (llmConfig.provider === 'openai' && llmConfig.apiKey) {
          await apiService.createSession(llmConfig.apiKey, llmConfig.model);
        } else {
          await apiService.createSession('', llmConfig.model);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start fresh');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceTranscribe = async (audioBlob: Blob): Promise<string> => {
    if (!hasConfig) {
      throw new Error('Please configure your LLM provider in the Configuration tab before using voice input.');
    }
    if (!llmConfig?.provider || (llmConfig.provider !== 'openai' && llmConfig.provider !== 'bedrock')) {
      throw new Error('Voice transcription is only available with OpenAI or AWS Bedrock providers.');
    }
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
    const response = await apiService.transcribeAudio(audioFile);
    return response.transcription;
  };

  const handleVoiceSynthesize = async (text: string): Promise<Blob> => {
    if (!llmConfig?.provider || (llmConfig.provider !== 'openai' && llmConfig.provider !== 'bedrock')) {
      throw new Error('Voice synthesis is only available with OpenAI or AWS Bedrock providers.');
    }
    // Use the configured voice type from voiceConfig, or fall back to provider defaults
    const voice = voiceConfig?.voiceType || (llmConfig.provider === 'bedrock' ? 'nova-sonic' : 'alloy');
    return await apiService.synthesizeSpeech(text, voice);
  };

  const handleVoiceRecordComplete = (text: string) => {
    setShowVoiceRecorder(false);
    if (workflowState === 'input') {
      handleProcessSubmit(text);
    } else if (workflowState === 'clarification') {
      handleClarificationAnswer(text);
    }
  };

  const handleFeedbackConfirm = async () => {
    setError('');
    try {
      await apiService.submitClassificationFeedback(true);
      // Don't change workflow state yet - let the user rate first
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    }
  };

  const handleFeedbackCorrect = async (correctedCategory: TransformationCategory) => {
    setError('');
    try {
      await apiService.submitClassificationFeedback(false, correctedCategory);
      // Don't change workflow state yet - let the user rate first
    } catch (err: any) {
      setError(err.message || 'Failed to submit correction');
    }
  };

  const handleRating = async (rating: 'up' | 'down', comments?: string) => {
    setError('');
    try {
      await apiService.submitRating(rating, comments);
      // Now transition to feedback complete state
      setWorkflowState('feedback');
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating');
    }
  };

  const resetWorkflow = async () => {
    // Create a new session for the next classification
    if (llmConfig) {
      try {
        if (llmConfig.provider === 'openai' && llmConfig.apiKey) {
          await apiService.createSession(llmConfig.apiKey, llmConfig.model);
        } else {
          await apiService.createSession('', llmConfig.model);
        }
        console.log('[App] Created new session for next classification');
      } catch (err) {
        console.error('[App] Failed to create new session:', err);
      }
    }
    
    setWorkflowState('input');
    setClarificationQuestions([]);
    setQuestionCount(0);
    setClassification(null);
    setError('');
  };

  const renderNavigation = () => (
    <nav style={{
      backgroundColor: '#343a40',
      padding: '15px 20px',
      marginBottom: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '24px' }}>
            CatalAIst
          </h1>
          <div style={{ color: '#adb5bd', fontSize: '14px' }}>
            Welcome, <strong style={{ color: '#fff' }}>{username}</strong>
            {userRole === 'admin' && (
              <span style={{ 
                marginLeft: '8px', 
                padding: '2px 8px', 
                backgroundColor: '#ffc107', 
                color: '#000', 
                borderRadius: '3px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ADMIN
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentView('main')}
            style={{
              padding: '8px 16px',
              backgroundColor: currentView === 'main' ? '#007bff' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Classifier
          </button>
          <button
            onClick={() => setCurrentView('configuration')}
            style={{
              padding: '8px 16px',
              backgroundColor: currentView === 'configuration' ? '#007bff' : 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Configuration
          </button>
          {userRole === 'admin' && (
            <>
              <button
                onClick={() => setCurrentView('analytics')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentView === 'analytics' ? '#007bff' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Analytics
              </button>
              <button
                onClick={() => setCurrentView('decision-matrix')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentView === 'decision-matrix' ? '#007bff' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Decision Matrix
              </button>
              <button
                onClick={() => setCurrentView('learning')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentView === 'learning' ? '#007bff' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                AI Learning
              </button>
              <button
                onClick={() => setCurrentView('prompts')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentView === 'prompts' ? '#007bff' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Prompts
              </button>
              <button
                onClick={() => setCurrentView('audit')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentView === 'audit' ? '#007bff' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Audit Trail
              </button>
              <button
                onClick={() => setCurrentView('admin-review')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentView === 'admin-review' ? '#007bff' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Admin Review
              </button>
              <button
                onClick={() => setCurrentView('users')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: currentView === 'users' ? '#007bff' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Users
              </button>
            </>
          )}
          <div style={{ 
            width: '1px', 
            height: '30px', 
            backgroundColor: '#6c757d',
            margin: '0 5px'
          }} />
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {renderNavigation()}

      {error && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 20px',
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {currentView === 'configuration' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <LLMConfiguration onConfigSubmit={handleConfigSubmit} />
          {hasConfig && llmConfig && (
            <div style={{
              maxWidth: '600px',
              margin: '20px auto',
              padding: '20px',
              backgroundColor: '#d4edda',
              color: '#155724',
              borderRadius: '4px',
            }}>
              <div style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 'bold' }}>
                ✓ Configuration saved successfully!
              </div>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                <strong>Provider:</strong> {llmConfig.provider === 'openai' ? 'OpenAI' : 'AWS Bedrock'}
              </div>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                <strong>Model:</strong> {llmConfig.model}
              </div>
              {llmConfig.provider === 'bedrock' && llmConfig.awsRegion && (
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  <strong>Region:</strong> {llmConfig.awsRegion}
                </div>
              )}
              {llmConfig.voiceEnabled && (
                <>
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                    <strong>Voice:</strong> {llmConfig.voiceType === 'nova-sonic' ? 'Nova 2 Sonic' : 
                      llmConfig.voiceType === 'sonic' ? 'Nova 2 Sonic' :
                      llmConfig.voiceType === 'nova' ? 'Nova 2 Sonic' :
                      llmConfig.voiceType === 'ruth' ? 'Nova 2 Sonic (Ruth)' :
                      llmConfig.voiceType ? llmConfig.voiceType.charAt(0).toUpperCase() + llmConfig.voiceType.slice(1) : 'Default'} 
                    {llmConfig.provider === 'bedrock' && ' (Nova 2 Sonic)'}
                    {llmConfig.provider === 'openai' && ' (OpenAI TTS)'}
                  </div>
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                    <strong>Voice Mode:</strong> {llmConfig.streamingMode ? 'Streaming (Auto-play)' : 'Manual Control'}
                  </div>
                </>
              )}
              <div style={{ fontSize: '12px', marginTop: '12px', color: '#0c5460', paddingTop: '12px', borderTop: '1px solid #c3e6cb' }}>
                You can now use the Classifier. To change the configuration, update the form above.
              </div>
            </div>
          )}
        </div>
      )}

      {currentView === 'main' && (
        <>
          {!hasConfig ? (
            <div style={{
              maxWidth: '800px',
              margin: '50px auto',
              padding: '40px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <h2 style={{ marginTop: 0, color: '#343a40' }}>Welcome to CatalAIst</h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>
                An intelligent process classification system that helps you categorize and understand your business processes.
              </p>
              <div style={{
                padding: '20px',
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: 0, color: '#856404' }}>
                  ⚠️ To get started, please configure your LLM provider (OpenAI or AWS Bedrock) in the Configuration tab.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('configuration')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
              >
                Go to Configuration
              </button>
            </div>
          ) : (
            <>
              {workflowState === 'input' && (
                <ChatInterface
                  onSubmit={handleProcessSubmit}
                  onVoiceRecord={() => setShowVoiceRecorder(true)}
                  isProcessing={isProcessing}
                  showVoiceButton={shouldShowVoiceButton()}
                  streamingMode={voiceConfig?.streamingMode || false}
                />
              )}

          {workflowState === 'clarification' && (
            <ClarificationQuestions
              questions={clarificationQuestions}
              currentQuestionIndex={questionCount - clarificationQuestions.length}
              totalQuestions={questionCount}
              onAnswer={handleClarificationAnswer}
              onSkipInterview={handleSkipInterview}
              onStartFresh={handleStartFresh}
              onVoiceRecord={() => setShowVoiceRecorder(true)}
              isProcessing={isProcessing}
              showVoiceButton={shouldShowVoiceButton()}
              streamingMode={voiceConfig?.streamingMode || false}
            />
          )}

          {workflowState === 'result' && classification && (
            <>
              <ClassificationResult
                classification={classification}
                onSynthesize={voiceEnabled ? handleVoiceSynthesize : undefined}
                voiceEnabled={voiceEnabled}
                autoPlayVoice={false}
              />
              <FeedbackCapture
                currentCategory={classification.category}
                onConfirm={handleFeedbackConfirm}
                onCorrect={handleFeedbackCorrect}
                onRating={handleRating}
                isProcessing={isProcessing}
              />
            </>
          )}

              {workflowState === 'submitted' && (
                <div style={{
                  maxWidth: '800px',
                  margin: '50px auto',
                  padding: '40px',
                  backgroundColor: '#d4edda',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '2px solid #28a745'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>✓</div>
                  <h2 style={{ marginTop: 0, marginBottom: '15px', color: '#155724' }}>
                    Thank You!
                  </h2>
                  <p style={{ fontSize: '18px', color: '#155724', marginBottom: '30px' }}>
                    Your submission has been recorded and will be reviewed by an administrator.
                  </p>
                  <button
                    onClick={resetWorkflow}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                  >
                    Submit Another Process
                  </button>
                </div>
              )}

              {workflowState === 'feedback' && (
                <>
                  <div style={{
                    maxWidth: '800px',
                    margin: '20px auto',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <button
                      onClick={resetWorkflow}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Start New Classification
                    </button>
                  </div>
                  
                  {classification && (
                    <div style={{
                      maxWidth: '800px',
                      margin: '20px auto',
                      padding: '20px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}>
                      <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#495057' }}>
                        Previous Classification
                      </h3>
                      <ClassificationResult
                        classification={classification}
                        onSynthesize={voiceEnabled ? handleVoiceSynthesize : undefined}
                        voiceEnabled={voiceEnabled}
                        autoPlayVoice={false}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {currentView === 'analytics' && (
        <AnalyticsDashboard
          onLoadAnalytics={() => apiService.getAnalytics()}
        />
      )}

      {currentView === 'decision-matrix' && (
        <DecisionMatrixAdmin
          onLoadMatrix={() => apiService.getDecisionMatrix()}
          onLoadVersions={() => apiService.getDecisionMatrixVersions()}
          onLoadVersion={(version) => apiService.getDecisionMatrixVersion(version)}
          onUpdateMatrix={(matrix) => apiService.updateDecisionMatrix(matrix)}
          onGenerateMatrix={() => apiService.generateDecisionMatrix()}
          onExportMatrix={(version) => apiService.exportDecisionMatrix(version)}
          onExportAllVersions={() => apiService.exportAllDecisionMatrixVersions()}
          onImportMatrix={(matrixData, replaceExisting) => apiService.importDecisionMatrix(matrixData, replaceExisting)}
        />
      )}

      {currentView === 'learning' && (
        <LearningAdmin
          onLoadSuggestions={() => apiService.getSuggestions()}
          onApproveSuggestion={(id) => apiService.approveSuggestion(id)}
          onRejectSuggestion={(id, notes) => apiService.rejectSuggestion(id, notes)}
          onTriggerAnalysis={(options) => apiService.triggerAnalysis(options)}
          onValidateMatrix={(options) => apiService.validateMatrix(options)}
        />
      )}

      {currentView === 'prompts' && (
        <PromptAdmin
          onLoadPrompts={() => apiService.getPrompts()}
          onLoadPrompt={(id) => apiService.getPrompt(id)}
          onUpdatePrompt={(id, content) => apiService.updatePrompt(id, content)}
        />
      )}

      {currentView === 'audit' && (
        <AuditTrail
          onLoadAuditLogs={(date) => apiService.getAuditLogs(date)}
        />
      )}

      {currentView === 'users' && userRole === 'admin' && (
        <UserManagement
          onLoadUsers={() => apiService.getUsers()}
          onDeleteUser={(userId) => apiService.deleteUser(userId)}
          onChangeRole={(userId, newRole) => apiService.changeUserRole(userId, newRole)}
          onResetPassword={(userId, newPassword) => apiService.resetUserPassword(userId, newPassword)}
          currentUserId={sessionStorage.getItem('userId') || ''}
        />
      )}

      {currentView === 'admin-review' && userRole === 'admin' && (
        <AdminReview
          onLoadPendingReviews={() => apiService.getPendingReviews()}
          onSubmitReview={(sessionId, approved, correctedCategory, reviewNotes) => 
            apiService.submitAdminReview(sessionId, approved, correctedCategory, reviewNotes)
          }
          onLoadStats={() => apiService.getAdminReviewStats()}
        />
      )}

      {showVoiceRecorder && hasConfig && (
        <VoiceRecorder
          onTranscription={handleVoiceRecordComplete}
          onCancel={() => setShowVoiceRecorder(false)}
          onTranscribe={handleVoiceTranscribe}
        />
      )}
    </div>
  );
}

export default App;
