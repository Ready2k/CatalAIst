import React, { useState, useEffect, useRef } from 'react';
import AudioRecorder from './AudioRecorder';
import AudioPlayer from './AudioPlayer';
import TranscriptDisplay from './TranscriptDisplay';
import { apiService } from '../../services/api';
import { novaSonicService } from '../../services/nova-sonic-websocket.service';

interface StreamingModeControllerProps {
  onTranscriptionComplete: (text: string) => void;
  onCancel: () => void;
  currentQuestion?: string;
  onSwitchToNonStreaming?: () => void;
}

/**
 * StreamingModeController Component
 * 
 * Orchestrates the streaming conversational voice flow with Nova 2 Sonic.
 * Flow:
 * 1. Connect to Nova 2 Sonic WebSocket
 * 2. Auto-start recording immediately
 * 3. Stream audio chunks to backend
 * 4. Receive real-time transcription
 * 5. Detect silence (VAD) and auto-stop
 * 6. Auto-submit transcript
 */
const StreamingModeController: React.FC<StreamingModeControllerProps> = ({
  onTranscriptionComplete,
  onCancel,
  currentQuestion,
  onSwitchToNonStreaming,
}) => {
  const [flowState, setFlowState] = useState<'initializing' | 'recording' | 'processing' | 'reviewing' | 'playing-question'>('initializing');
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [showFallbackOption, setShowFallbackOption] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Refs to track state in callbacks
  const transcriptionRef = useRef('');

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

  // Connect to Nova 2 Sonic on mount
  useEffect(() => {
    const connect = async () => {
      try {
        const config = apiService.getLLMConfig();

        if (!config || config.provider !== 'bedrock' || !config.awsAccessKeyId || !config.awsSecretAccessKey) {
          throw new Error('Missing AWS Bedrock credentials. Please configure in Settings.');
        }

        await novaSonicService.connect({
          awsAccessKeyId: config.awsAccessKeyId,
          awsSecretAccessKey: config.awsSecretAccessKey,
          awsSessionToken: config.awsSessionToken,
          awsRegion: config.awsRegion || 'us-east-1',
          systemPrompt: 'You are a helpful assistant. Just transcribe what the user says.',
          userId: 'voice-user-streaming'
        }, {
          onTranscription: (text) => {
            // Nova sends segments, we append them
            // Note: In a real convo, Nova might send " You: Hello" then " You: World".
            // Implementation detail: Nova 2 Sonic test page appends with newlines.
            // For a form input, we might want to just concatenate.
            // Let's assume we append with space if needed.
            setTranscription(prev => {
              const newText = prev ? prev + ' ' + text : text;
              transcriptionRef.current = newText;
              return newText;
            });
          },
          onTextResponse: (text) => {
            // Ignoring AI response for now as we just want transcription for the form
            // Or we could log it
            console.log('[Nova] AI Response:', text);
          },
          onError: (err) => {
            console.error('[Nova] Error:', err);
            handleError(err);
          },
          onConnected: () => {
            setIsConnected(true);
            if (currentQuestion) {
              setFlowState('playing-question');
            } else {
              setFlowState('recording');
            }
          },
          onDisconnected: () => {
            setIsConnected(false);
          }
        });

      } catch (err: any) {
        handleError(err);
      }
    };

    connect();

    return () => {
      novaSonicService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // If there's a question to play, start with that
  useEffect(() => {
    // This effect handles updates to currentQuestion if needed, 
    // but the initial flow is handled in onConnected
  }, [currentQuestion]);

  const handleError = (err: Error) => {
    const newErrorCount = errorCount + 1;
    setErrorCount(newErrorCount);
    setError(err.message || 'Connection failed.');

    // After 2 errors, offer to switch to non-streaming mode
    if (newErrorCount >= 2) {
      setShowFallbackOption(true);
    }
  };

  const handleAudioData = (audioData: ArrayBuffer) => {
    console.log('[StreamingMode] Validating Audio Data:', audioData.byteLength);
    if (isConnected) {
      console.log('[StreamingMode] Sending chunk:', audioData.byteLength);
      novaSonicService.sendAudioChunk(audioData);
    }
  };

  const handleRecordingComplete = (audioBlob: Blob) => {
    // VAD stopped recording
    // With Nova Sonic, we might want to wait a brief moment for final transcription messages
    setFlowState('processing');

    setTimeout(() => {
      if (transcriptionRef.current.length >= 2) { // Minimal validation
        setFlowState('reviewing');
      } else {
        // Only error if we really got nothing (silence)
        // If the user said "Hi", that's short but valid?
        // Let's stick to the 10 char rule from elsewhere if strict, but maybe relax for streaming
        if (transcriptionRef.current.length === 0) {
          setError('No speech detected. Please try again.');
          // Reset to allow retry?
          // Since recording stopped, we need to restart it?
          // But flowState 'recording' mounts AudioRecorder with autoStart=true
          // So setting it back to 'recording' should restart.
          setFlowState('recording');
        } else {
          setFlowState('reviewing');
        }
      }
    }, 1500); // Wait 1.5s for final network packets
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
    novaSonicService.disconnect();
    onCancel();
  };

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
            LIVE
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
          💡 <strong>Nova 2 Sonic:</strong> Speak naturally. Your speech is transcribed in real-time.
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

        {/* Initializing State */}
        {flowState === 'initializing' && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Connecting to Nova 2 Sonic...</p>
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
        {flowState === 'recording' && isConnected && (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <TranscriptDisplay
                text={transcription}
                editable={false}
                showCharacterCount={false}
              />
            </div>
            <AudioRecorder
              mode="streaming"
              autoStart={true}
              onRecordingComplete={handleRecordingComplete}
              onAudioData={handleAudioData}
              onError={handleError}
            />
          </div>
        )}

        {/* Processing State */}
        {flowState === 'processing' && (
          <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏳</div>
            <p style={{ color: '#666', fontSize: '16px' }}>Finalizing...</p>
          </div>
        )}

        {/* Reviewing State (brief display before auto-submit) */}
        {flowState === 'reviewing' && (
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>
              Final Transcription:
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
