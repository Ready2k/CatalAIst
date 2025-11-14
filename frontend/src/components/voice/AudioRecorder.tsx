import React, { useState, useRef, useEffect } from 'react';
import VoiceActivityDetector from './utils/VoiceActivityDetector';

interface AudioRecorderProps {
  mode: 'streaming' | 'non-streaming';
  autoStart?: boolean;
  onRecordingComplete: (audioBlob: Blob) => void;
  onError: (error: Error) => void;
}

/**
 * AudioRecorder Component
 * 
 * Enhanced audio recorder with support for both streaming and non-streaming modes.
 * Features:
 * - Streaming mode: Auto-start, VAD for auto-stop
 * - Non-streaming mode: Manual controls
 * - Real-time audio level visualization
 * - Recording time warnings (yellow at 4:00, red at 4:30)
 * - Improved error handling
 * 
 * This component is designed to be reusable and can be extracted into a standalone package.
 */
const AudioRecorder: React.FC<AudioRecorderProps> = ({
  mode,
  autoStart = false,
  onRecordingComplete,
  onError,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-start recording in streaming mode
  useEffect(() => {
    if (autoStart && mode === 'streaming') {
      startRecording();
    }
    
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    
    if (vadRef.current) {
      vadRef.current.cleanup();
      vadRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Validate recording has actual audio data (minimum ~1KB for a very short recording)
        if (audioBlob.size < 1000) {
          const err = new Error('Recording too short. Please speak for at least 1 second.');
          setError(err.message);
          onError(err);
          return;
        }
        
        onRecordingComplete(audioBlob);
        cleanup();
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          
          // Auto-stop at 5 minutes (300 seconds)
          if (newTime >= 300) {
            stopRecording();
            return 300;
          }
          
          return newTime;
        });
      }, 1000);

      // Initialize VAD for streaming mode
      if (mode === 'streaming' && VoiceActivityDetector.isSupported()) {
        try {
          vadRef.current = new VoiceActivityDetector({
            silenceThreshold: -50,
            silenceDuration: 2000,
            minRecordingDuration: 1000,
          });
          
          await vadRef.current.initialize(stream);
          vadRef.current.start(() => {
            // Silence detected - auto-stop recording
            stopRecording();
          });
          
          // Start audio level monitoring
          audioLevelIntervalRef.current = setInterval(() => {
            if (vadRef.current) {
              const level = vadRef.current.getAudioLevel();
              setAudioLevel(level);
            }
          }, 100);
          
        } catch (vadError) {
          console.warn('VAD initialization failed, continuing without auto-stop:', vadError);
          // Continue recording without VAD
        }
      }

    } catch (err: any) {
      const errorMsg = err.name === 'NotAllowedError' 
        ? 'Microphone access denied. Please allow microphone access to use voice input.'
        : 'Failed to access microphone. Please check your device settings.';
      
      setError(errorMsg);
      onError(new Error(errorMsg));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= 300) {
            stopRecording();
            return 300;
          }
          return newTime;
        });
      }, 1000);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (recordingTime >= 270) return '#dc3545'; // Red at 4:30
    if (recordingTime >= 240) return '#ffc107'; // Yellow at 4:00
    return '#28a745'; // Green
  };

  const showWarning = recordingTime >= 270;

  if (error) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          padding: '12px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          fontSize: '14px',
        }}
      >
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div role="region" aria-label="Audio recorder">
      {!isRecording ? (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={startRecording}
            aria-label="Start recording audio"
            style={{
              padding: '15px 30px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              fontSize: '32px',
              cursor: 'pointer',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}
            title="Start Recording"
          >
            🎤
          </button>
          <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
            Click to start recording
          </p>
        </div>
      ) : (
        <div>
          {/* Recording indicator */}
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <div
              aria-live="polite"
              aria-label={`Recording in progress. Time elapsed: ${formatTime(recordingTime)}`}
              style={{
                fontSize: '48px',
                marginBottom: '10px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            >
              🔴
            </div>
            
            {/* Timer */}
            <div
              aria-live="polite"
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: getTimerColor(),
                fontFamily: 'monospace',
                marginBottom: '5px',
              }}
            >
              {formatTime(recordingTime)}
            </div>
            
            {/* Warning message */}
            {showWarning && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  borderRadius: '4px',
                  fontSize: '13px',
                  marginBottom: '10px',
                }}
              >
                ⚠️ 30 seconds remaining
              </div>
            )}
            
            {/* Audio level visualization (waveform) */}
            {mode === 'streaming' && (
              <div style={{ marginBottom: '15px' }}>
                <div
                  style={{
                    width: '100%',
                    height: '40px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${audioLevel}%`,
                      height: '100%',
                      backgroundColor: '#28a745',
                      transition: 'width 0.1s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '5px' }}>
                  Audio Level: {Math.round(audioLevel)}%
                </div>
              </div>
            )}
            
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
              {mode === 'streaming' 
                ? 'Recording... (will auto-stop after 2 seconds of silence)'
                : 'Recording... (Max 5 minutes)'}
            </p>
          </div>
          
          {/* Controls */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {!isPaused ? (
              <>
                <button
                  onClick={stopRecording}
                  aria-label="Stop recording"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  ⏹️ Stop
                </button>
                {mode === 'non-streaming' && (
                  <button
                    onClick={pauseRecording}
                    aria-label="Pause recording"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#ffc107',
                      color: '#000',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    ⏸️ Pause
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={resumeRecording}
                aria-label="Resume recording"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                ▶️ Resume
              </button>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
};

export default AudioRecorder;
