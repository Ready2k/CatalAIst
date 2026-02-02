import React, { useState, useRef, useEffect } from 'react';
import VoiceActivityDetector from './utils/VoiceActivityDetector';

interface AudioRecorderProps {
  mode: 'streaming' | 'non-streaming';
  autoStart?: boolean;
  onRecordingComplete?: (audioBlob: Blob) => void;
  onAudioData?: (audioData: ArrayBuffer) => void;
  onError: (error: Error) => void;
}

/**
 * AudioRecorder Component
 * 
 * Enhanced audio recorder with support for both streaming and non-streaming modes.
 * Features:
 * - Streaming mode: Real-time 16kHz PCM audio chunk streaming via AudioContext
 * - Non-streaming mode: MediaRecorder (WebM)
 * - Real-time audio level visualization
 * - Recording time warnings
 * - Improved error handling
 */
const AudioRecorder: React.FC<AudioRecorderProps> = ({
  mode,
  autoStart = false,
  onRecordingComplete,
  onAudioData,
  onError,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // MediaRecorder refs (Non-streaming)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // AudioContext refs (Streaming)
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Common refs
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

    // Cleanup AudioContext (Streaming)
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Cleanup MediaRecorder (Non-streaming)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setError(null);

      // Request microphone access
      // For streaming (Nova Sonic), we need 16kHz mono
      const constraints = mode === 'streaming'
        ? {
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true
          }
        }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (mode === 'streaming' && onAudioData) {
        // --- Streaming Mode (AudioContext + PCM) ---
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // Ensure AudioContext is running (browsers may suspend it until gesture)
        if (audioContext.state === 'suspended') {
          console.log('[AudioRecorder] Resuming AudioContext...');
          await audioContext.resume();
        }
        console.log('[AudioRecorder] AudioContext State:', audioContext.state);

        // Use ScriptProcessor for PCM extraction (Buffer: 4096 = ~256ms at 16kHz)
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!isRecording) return;

          const inputData = e.inputBuffer.getChannelData(0);

          // Calculate volume for meter
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          // Update level locally since VAD might be optional or separate
          setAudioLevel(Math.min(100, rms * 400)); // Scale for visibility

          // Convert Float32 to Int16 PCM
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            // Clamp and scale
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Send chunk
          // console.log('[AudioRecorder] Emitting PCM chunk:', pcmData.byteLength);
          onAudioData(pcmData.buffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination); // Required for script processor to run

        setIsRecording(true);
        setIsPaused(false);
        setRecordingTime(0);

      } else {
        // --- Non-Streaming Mode (MediaRecorder) ---
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

          // Validate recording
          if (audioBlob.size < 1000) {
            const err = new Error('Recording too short. Please speak for at least 1 second.');
            setError(err.message);
            onError(err);
            return;
          }

          if (onRecordingComplete) {
            onRecordingComplete(audioBlob);
          }
          cleanup();
        };

        mediaRecorder.start();
        setIsRecording(true);
        setIsPaused(false);
        setRecordingTime(0);
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;

          // Auto-stop at 5 minutes
          if (newTime >= 300) {
            stopRecording();
            return 300;
          }

          return newTime;
        });
      }, 1000);

      // Initialize VAD for streaming mode auto-stop logic
      if (mode === 'streaming' && VoiceActivityDetector.isSupported()) {
        try {
          vadRef.current = new VoiceActivityDetector({
            silenceThreshold: -50,
            silenceDuration: 3000,
            minRecordingDuration: 1000,
          });

          await vadRef.current.initialize(stream);
          vadRef.current.start(() => {
            // Silence detected - auto-stop recording
            stopRecording();
          });

        } catch (vadError) {
          console.warn('VAD initialization failed, continuing without auto-stop:', vadError);
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
    // MediaRecorder stop
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    // AudioContext stop
    if (audioContextRef.current && isRecording) {
      // Signal cleanup but allow one last processing tick if needed
      // Actual cleanup happens in cleanup() called by parent or on unmount
      if (onRecordingComplete && mode === 'streaming') {
        // For streaming, we might not have a blob, but we signal completion
        onRecordingComplete(new Blob([], { type: 'audio/pcm' }));
      }
    }

    setIsRecording(false);
    setIsPaused(false);
  };

  const pauseRecording = () => {
    if (isRecording && !isPaused) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.pause();
      }
      if (audioContextRef.current) {
        // For AudioContext, we just rely on the 'isRecording' check in onaudioprocess
        // or we could suspend the context
        audioContextRef.current.suspend();
      }
      setIsPaused(true);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (isRecording && isPaused) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.resume();
      }
      if (audioContextRef.current) {
        audioContextRef.current.resume();
      }
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
              {mode === 'streaming' && (
                <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '5px' }}>
                  Live Audio Level
                </div>
              )}
            </div>

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
