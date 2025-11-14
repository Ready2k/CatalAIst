import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';

interface AudioPlayerProps {
  text: string;
  voiceType?: string;
  autoPlay?: boolean;
  onPlaybackComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * AudioPlayer Component
 * 
 * Plays TTS audio with full playback controls.
 * Features:
 * - Play/Pause/Stop/Repeat controls
 * - Progress bar showing playback position
 * - Time display (current / total)
 * - Auto-play functionality
 * - Error handling for playback failures
 * 
 * This component is designed to be reusable and can be extracted into a standalone package.
 */
const AudioPlayer: React.FC<AudioPlayerProps> = ({
  text,
  voiceType = 'alloy',
  autoPlay = false,
  onPlaybackComplete,
  onError,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate audio on mount or when text changes
  useEffect(() => {
    if (text) {
      generateAudio();
    }
    
    return () => {
      // Cleanup: revoke audio URL and stop playback
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Auto-play when audio is ready
  useEffect(() => {
    if (autoPlay && audioUrl && !isPlaying && !error) {
      handlePlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, autoPlay]);

  const generateAudio = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const audioBlob = await apiService.synthesizeSpeech(text);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Create audio element
      const audio = new Audio(url);
      audioRef.current = audio;
      
      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        if (onPlaybackComplete) {
          onPlaybackComplete();
        }
      });
      
      audio.addEventListener('error', (e) => {
        const errorMsg = 'Audio playback failed';
        setError(errorMsg);
        setIsPlaying(false);
        if (onError) {
          onError(new Error(errorMsg));
        }
      });
      
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to generate audio';
      setError(errorMsg);
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = () => {
    if (!audioRef.current) return;
    
    audioRef.current.play().then(() => {
      setIsPlaying(true);
      
      // Start progress tracking
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 100);
    }).catch((err) => {
      const errorMsg = 'Failed to play audio';
      setError(errorMsg);
      if (onError) {
        onError(new Error(errorMsg));
      }
    });
  };

  const handlePause = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };

  const handleRepeat = () => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    handlePlay();
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" style={{ padding: '15px', textAlign: 'center', color: '#6c757d' }}>
        <div style={{ marginBottom: '8px' }}>⏳ Generating audio...</div>
      </div>
    );
  }

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
          fontSize: '13px',
        }}
      >
        ⚠️ {error}
      </div>
    );
  }

  if (!audioUrl) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Audio player"
      style={{
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
      }}
    >
      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            aria-label="Play audio"
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Play"
          >
            ▶️ Play
          </button>
        ) : (
          <button
            onClick={handlePause}
            aria-label="Pause audio"
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Pause"
          >
            ⏸️ Pause
          </button>
        )}
        
        <button
          onClick={handleStop}
          aria-label="Stop audio"
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Stop"
        >
          ⏹️ Stop
        </button>
        
        <button
          onClick={handleRepeat}
          aria-label="Repeat audio from beginning"
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Repeat"
        >
          🔁 Repeat
        </button>
        
        {/* Time display */}
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#6c757d', fontFamily: 'monospace' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      
      {/* Progress bar */}
      <div
        onClick={handleProgressClick}
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#dee2e6',
          borderRadius: '4px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: isPlaying ? '#28a745' : '#6c757d',
            borderRadius: '4px',
            transition: 'width 0.1s linear',
          }}
        />
      </div>
    </div>
  );
};

export default AudioPlayer;
