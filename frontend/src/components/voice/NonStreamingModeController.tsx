import React, { useState } from 'react';
import AudioRecorder from './AudioRecorder';
import TranscriptDisplay from './TranscriptDisplay';
import { apiService } from '../../services/api';

interface NonStreamingModeControllerProps {
  onTranscriptionComplete: (text: string) => void;
  onCancel: () => void;
}

/**
 * NonStreamingModeController Component
 * 
 * Orchestrates the non-streaming voice flow with manual controls.
 * Flow:
 * 1. User clicks record button
 * 2. Records audio
 * 3. User clicks stop
 * 4. Audio is transcribed
 * 5. User can edit transcript
 * 6. User clicks "Use This Text" to submit or "Record Again" to retry
 * 
 * This component is designed to be reusable and can be extracted into a standalone package.
 */
const NonStreamingModeController: React.FC<NonStreamingModeControllerProps> = ({
  onTranscriptionComplete,
  onCancel,
}) => {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'transcribing' | 'reviewing'>('idle');
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setRecordingState('transcribing');
    setError(null);
    
    try {
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      const response = await apiService.transcribeAudio(audioFile);
      
      if (response.transcription && response.transcription.length >= 10) {
        setTranscription(response.transcription);
        setRecordingState('reviewing');
      } else {
        setError('Transcription too short (minimum 10 characters). Please record again.');
        setRecordingState('idle');
      }
    } catch (err: any) {
      setError(err.message || 'Transcription failed. Please try again.');
      setRecordingState('idle');
    }
  };

  const handleRecordingError = (err: Error) => {
    setError(err.message);
    setRecordingState('idle');
  };

  const handleTextChange = (newText: string) => {
    setTranscription(newText);
  };

  const handleUseText = () => {
    if (transcription.length >= 10) {
      onTranscriptionComplete(transcription);
    } else {
      setError('Transcription too short (minimum 10 characters).');
    }
  };

  const handleRecordAgain = () => {
    setTranscription('');
    setError(null);
    setRecordingState('idle');
  };

  const handleCancel = () => {
    setTranscription('');
    setError(null);
    setRecordingState('idle');
    onCancel();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
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
        <h3 id="voice-modal-title" style={{ marginTop: 0, marginBottom: '20px' }}>🎤 Voice Input</h3>

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

        {/* Recording State */}
        {(recordingState === 'idle' || recordingState === 'recording') && (
          <div>
            <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
              Click the button below to start recording your response. You can stop at any time.
            </p>
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
              💡 <strong>Tip:</strong> Speak clearly in a quiet environment. Maximum recording time: 5 minutes. 
              You'll be able to review and edit the transcript before submitting.
            </div>
            <AudioRecorder
              mode="non-streaming"
              autoStart={false}
              onRecordingComplete={handleRecordingComplete}
              onError={handleRecordingError}
            />
          </div>
        )}

        {/* Transcribing State */}
        {recordingState === 'transcribing' && (
          <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏳</div>
            <p style={{ color: '#666', fontSize: '16px' }}>Transcribing audio...</p>
            <p style={{ color: '#999', fontSize: '13px', marginTop: '10px' }}>
              This may take a few seconds
            </p>
          </div>
        )}

        {/* Reviewing State */}
        {recordingState === 'reviewing' && (
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>
              Transcription:
            </p>
            <div
              style={{
                padding: '8px',
                backgroundColor: '#d4edda',
                borderRadius: '4px',
                marginBottom: '10px',
                fontSize: '12px',
                color: '#155724',
              }}
            >
              ✓ Recording complete! Review and edit the text below, then click "Use This Text" to submit.
            </div>
            <div style={{ marginBottom: '20px' }}>
              <TranscriptDisplay
                text={transcription}
                editable={true}
                onTextChange={handleTextChange}
                showCharacterCount={true}
                minLength={10}
                maxLength={10000}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={handleUseText}
                disabled={transcription.length < 10}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: transcription.length >= 10 ? '#28a745' : '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: transcription.length >= 10 ? 'pointer' : 'not-allowed',
                }}
              >
                ✓ Use This Text
              </button>
              <button
                onClick={handleRecordAgain}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                🔄 Record Again
              </button>
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
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default NonStreamingModeController;
