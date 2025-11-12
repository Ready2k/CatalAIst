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
import { apiService } from './services/api';
import { Classification, TransformationCategory } from '../../shared/types';

type AppView = 'main' | 'analytics' | 'decision-matrix' | 'learning' | 'prompts' | 'audit' | 'configuration' | 'users';
type WorkflowState = 'input' | 'clarification' | 'result' | 'feedback';

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
  const [voiceEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Workflow data
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [classification, setClassification] = useState<Classification | null>(null);

  // Check for existing auth token on mount
  useEffect(() => {
    const token = sessionStorage.getItem('authToken');
    const storedUsername = sessionStorage.getItem('username');
    const storedRole = sessionStorage.getItem('userRole');
    
    if (token && storedUsername) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
      setUserRole(storedRole || 'user');
    }
  }, []);

  const handleLoginSuccess = (token: string, user: string) => {
    setIsAuthenticated(true);
    setUsername(user);
    const role = sessionStorage.getItem('userRole') || 'user';
    setUserRole(role);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
    setUsername('');
    setUserRole('');
    setHasConfig(false);
    setLLMConfig(null);
    apiService.clearSession();
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

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
      
      // Check if we need clarification
      if (response.clarificationQuestions && response.clarificationQuestions.length > 0) {
        setClarificationQuestions(response.clarificationQuestions);
        setQuestionCount(response.totalQuestions || response.clarificationQuestions.length);
        setWorkflowState('clarification');
      } else if (response.classification) {
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

  const handleClarificationAnswer = async (answer: string) => {
    setError('');
    setIsProcessing(true);
    try {
      // Send the answer along with the questions that were asked
      const response = await apiService.addConversation(answer, clarificationQuestions);
      
      // Check if we need more clarification
      if (response.clarificationQuestions && response.clarificationQuestions.length > 0) {
        setClarificationQuestions(response.clarificationQuestions);
      } else if (response.classification) {
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

  const handleVoiceTranscribe = async (audioBlob: Blob): Promise<string> => {
    if (!hasConfig) {
      throw new Error('Please configure your LLM provider in the Configuration tab before using voice input.');
    }
    if (llmConfig?.provider !== 'openai') {
      throw new Error('Voice transcription is only available with OpenAI provider.');
    }
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
    const response = await apiService.transcribeAudio(audioFile);
    return response.transcription;
  };

  const handleVoiceSynthesize = async (text: string): Promise<Blob> => {
    if (llmConfig?.provider !== 'openai') {
      throw new Error('Voice synthesis is only available with OpenAI provider.');
    }
    return await apiService.synthesizeSpeech(text);
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
      setWorkflowState('feedback');
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    }
  };

  const handleFeedbackCorrect = async (correctedCategory: TransformationCategory) => {
    setError('');
    try {
      await apiService.submitClassificationFeedback(false, correctedCategory);
      setWorkflowState('feedback');
    } catch (err: any) {
      setError(err.message || 'Failed to submit correction');
    }
  };

  const handleRating = async (rating: 'up' | 'down', comments?: string) => {
    setError('');
    try {
      await apiService.submitRating(rating, comments);
      // Reset to start new session
      resetWorkflow();
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
          {userRole === 'admin' && (
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
                  showVoiceButton={true}
                />
              )}

          {workflowState === 'clarification' && (
            <ClarificationQuestions
              questions={clarificationQuestions}
              currentQuestionIndex={questionCount - clarificationQuestions.length}
              totalQuestions={questionCount}
              onAnswer={handleClarificationAnswer}
              onSkipInterview={handleSkipInterview}
              onVoiceRecord={() => setShowVoiceRecorder(true)}
              isProcessing={isProcessing}
              showVoiceButton={true}
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
        />
      )}

      {currentView === 'learning' && (
        <LearningAdmin
          onLoadSuggestions={() => apiService.getSuggestions()}
          onApproveSuggestion={(id) => apiService.approveSuggestion(id)}
          onRejectSuggestion={(id, notes) => apiService.rejectSuggestion(id, notes)}
          onTriggerAnalysis={() => apiService.triggerAnalysis()}
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
