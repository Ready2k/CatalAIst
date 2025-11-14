import React, { useState, useEffect } from 'react';
import AudioRecorder from './AudioRecorder';
import AudioPlayer from './AudioPlayer';
import TranscriptDisplay from './TranscriptDisplay';
import { apiService } from '../../services/api';

interface StreamingModeControllerProps {
  onTranscriptionComplete: (text: string) => void;
  onCancel: () => void;
  currentQuestion?: string;
  onSwitchToNonStreaming?: () => void;
}

/**
 * StreamingModeController Component
 * 
 * Orchestrates the streaming conversational voice flow with automatic transitions.
 * Flow:
 * 1. Auto-start recording immediately
 * 2. Detect silence (2 seconds) and auto-stop
 * 3. Auto-transcribe audio
 * 4. Display transcript (read-only)
 * 5. Auto-submit transcript
 * 6. If question available: auto-play, then auto-start recording
 * 7. Continue until complete
 * 
 * This component is designed to be reusable and can be extracted into a standalone package.
 */
const StreamingModeController: React.FC<StreamingModeControllerProps> = ({
  onTranscriptionComplete,
  onCancel,
  currentQuestion,
  onSwitchToNonStreaming,
}) => {
  const [flowState, setFlowState] = useState<'recording' | 'transcribing' | 'reviewing' | 'playing-question'>('recording');
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [showFallbackOption, setShowFallbackOption] = useState(false);

  // Auto-submit after transcription is displayed
  useEffect(() => {
    if (flowState === 'reviewing' && transcription) {
      // Show transcript briefly (1 second) then auto-submit
      const timer = setTimeout(() => {
        onTranscriptionComplete(transcription);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [flowState, transcription, onTranscriptionComplete]);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setFlowState('transcribing');
    setError(null);
    
    try {
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      const response = await apiService.transcribeAudio(audioFile);
      
      if (response.transcription && response.transcription.length >= 10) {
        setTranscription(response.transcription);
        setFlowState('reviewing');
        // Auto-submit will happen via useEffect
      } else {
        setError('Transcription too short (minimum 10 characters). Please speak again.');
        setFlowState('recording');
      }
    } catch (err: any) {
      const newErrorCount = errorCount + 1;
      setErrorCount(newErrorCount);
      setError(err.message || 'Transcription failed. Please try again.');
      setFlowState('recording');
      
      // After 2 errors, offer to switch to non-streaming mode
      if (newErrorCount >= 2) {
        setShowFallbackOption(true);
      }
    }
  };

  const handleRecordingError = (err: Error) => {
    const newErrorCount = errorCount + 1;
    setErrorCount(newErrorCount);
    setError(err.message);
    
    // After 2 errors, offer to switch to non-streaming mode
    if (newErrorCount >= 2) {
      setShowFallbackOption(true);
    }
    // Stay in recording state to allow retry
  };

  const handlePlaybackComplete = () => {
    // After question finishes playing, auto-start recording
    setFlowState('recording');
  };

  const handlePlaybackError = (err: Error) => {
    console.warn('Playback error:', err);
    // Skip playback and go straight to recording
    setFlowState('recording');
  };

  const handleCancel = () => {
    setTranscription('');
    setError(null);
    onCancel();
  };

  // If there's a question to play, start with that
  useEffect(() => {
    if (currentQuestion) {
      setFlowState('playing-question');
    }
  }, [currentQuestion]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="streaming-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        // Close modal if clicking on backdrop
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '30px',
          borderRadius: '8px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 id="streaming-modal-title" style={{ margin: 0 }}>🎤 Voice Input (Streaming Mode)</h3>
          <span
            aria-label="Automatic mode"
            style={{
              padding: '4px 12px',
              backgroundColor: '#28a745',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            AUTO
          </span>
        </div>

        <div
          style={{
            padding: '10px',
            backgroundColor: '#e7f3ff',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '12px',
            color: '#004085',
          }}
        >
          💡 <strong>Streaming Mode:</strong> Speak naturally and continuously. Recording automatically stops after 2 seconds of silence. 
          Your response will be transcribed and submitted automatically for a conversational experience.
        </div>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              padding: '12px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              marginBottom: '15px',
              fontSize: '14px',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Fallback option after multiple errors */}
        {showFallbackOption && onSwitchToNonStreaming && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fff3cd',
              color: '#856404',
              borderRadius: '4px',
              marginBottom: '15px',
              fontSize: '14px',
            }}
          >
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
              Having trouble with streaming mode?
            </p>
            <p style={{ margin: '0 0 10px 0', fontSize: '13px' }}>
              You can switch to manual mode for more control over recording and transcription.
            </p>
            <button
              onClick={onSwitchToNonStreaming}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Switch to Manual Mode
            </button>
          </div>
        )}

        {/* Playing Question State */}
        {flowState === 'playing-question' && currentQuestion && (
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>
              Question:
            </p>
            <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              {currentQuestion}
            </div>
            <AudioPlayer
              text={currentQuestion}
              autoPlay={true}
              onPlaybackComplete={handlePlaybackComplete}
              onError={handlePlaybackError}
            />
          </div>
        )}

        {/* Recording State */}
        {flowState === 'recording' && (
          <div>
            <AudioRecorder
              mode="streaming"
              autoStart={true}
              onRecordingComplete={handleRecordingComplete}
              onError={handleRecordingError}
            />
          </div>
        )}

        {/* Transcribing State */}
        {flowState === 'transcribing' && (
          <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏳</div>
            <p style={{ color: '#666', fontSize: '16px' }}>Transcribing audio...</p>
            <p style={{ color: '#999', fontSize: '13px', marginTop: '10px' }}>
              This may take a few seconds
            </p>
          </div>
        )}

        {/* Reviewing State (brief display before auto-submit) */}
        {flowState === 'reviewing' && (
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>
              Transcription:
            </p>
            <div style={{ marginBottom: '15px' }}>
              <TranscriptDisplay
                text={transcription}
                editable={false}
                showCharacterCount={false}
              />
            </div>
            <div style={{ textAlign: 'center', color: '#28a745', fontSize: '14px', fontWeight: '500' }}>
              ✓ Submitting automatically...
            </div>
          </div>
        )}

        {/* Cancel Button (always visible) */}
        <button
          onClick={handleCancel}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#fff',
            color: '#6c757d',
            border: '1px solid #6c757d',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer',
            marginTop: '15px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default StreamingModeController;
