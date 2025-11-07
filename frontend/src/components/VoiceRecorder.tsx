import React, { useState, useRef } from 'react';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  onCancel: () => void;
  onTranscribe: (audioBlob: Blob) => Promise<string>;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscription,
  onCancel,
  onTranscribe,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        // Transcribe the audio
        setIsTranscribing(true);
        setError('');
        try {
          const text = await onTranscribe(audioBlob);
          setTranscription(text);
        } catch (err: any) {
          setError(err.message || 'Transcription failed');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) { // 5 minutes max
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      setError('Microphone access denied. Please allow microphone access to use voice input.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleConfirm = () => {
    if (transcription) {
      onTranscription(transcription);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onCancel();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0 }}>Voice Input</h3>

        {error && (
          <div style={{
            padding: '10px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            {error}
          </div>
        )}

        {!isRecording && !transcription && !isTranscribing && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Click the button below to start recording your process description.
            </p>
            <button
              onClick={startRecording}
              style={{
                padding: '15px 30px',
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                fontSize: '32px',
                cursor: 'pointer',
                width: '80px',
                height: '80px'
              }}
            >
              🎤
            </button>
          </div>
        )}

        {isRecording && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '15px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              🔴
            </div>
            <p style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
              {formatTime(recordingTime)}
            </p>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Recording... (Max 5 minutes)
            </p>
            <button
              onClick={stopRecording}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Stop Recording
            </button>
          </div>
        )}

        {isTranscribing && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#666' }}>Transcribing audio...</p>
          </div>
        )}

        {transcription && !isTranscribing && (
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Transcription:</p>
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              marginBottom: '20px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {transcription}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Use This Text
              </button>
              <button
                onClick={() => {
                  setTranscription('');
                  setRecordingTime(0);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Record Again
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleCancel}
          style={{
            marginTop: '15px',
            width: '100%',
            padding: '10px',
            backgroundColor: '#fff',
            color: '#6c757d',
            border: '1px solid #6c757d',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default VoiceRecorder;
