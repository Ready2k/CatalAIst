import React, { useState } from 'react';
import ApiKeyInput from './components/ApiKeyInput';
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
import { apiService } from './services/api';
import { Classification, TransformationCategory } from '../../shared/types';

type AppView = 'main' | 'analytics' | 'decision-matrix' | 'learning' | 'prompts' | 'audit';
type WorkflowState = 'input' | 'clarification' | 'result' | 'feedback';

function App() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('main');
  const [workflowState, setWorkflowState] = useState<WorkflowState>('input');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Workflow data
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [classification, setClassification] = useState<Classification | null>(null);

  const handleApiKeySubmit = async (apiKey: string) => {
    setError('');
    setIsProcessing(true);
    try {
      await apiService.createSession(apiKey);
      setHasApiKey(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessSubmit = async (description: string) => {
    setError('');
    setIsProcessing(true);
    try {
      const response = await apiService.submitProcess(description);
      
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
      const response = await apiService.addConversation(answer);
      
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

  const handleVoiceTranscribe = async (audioBlob: Blob): Promise<string> => {
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
    const response = await apiService.transcribeAudio(audioFile);
    return response.transcription;
  };

  const handleVoiceSynthesize = async (text: string): Promise<Blob> => {
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

  const resetWorkflow = () => {
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
        <h1 style={{ margin: 0, color: '#fff', fontSize: '24px' }}>
          CatalAIst
        </h1>
        <div style={{ display: 'flex', gap: '15px' }}>
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
        </div>
      </div>
    </nav>
  );

  if (!hasApiKey) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <ApiKeyInput onApiKeySubmit={handleApiKeySubmit} />
        {error && (
          <div style={{
            maxWidth: '500px',
            margin: '20px auto',
            padding: '15px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }

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

      {currentView === 'main' && (
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

      {showVoiceRecorder && (
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
