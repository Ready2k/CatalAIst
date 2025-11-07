import React, { useState, useRef, useEffect } from 'react';

interface VoicePlayerProps {
  text: string;
  onSynthesize: (text: string) => Promise<Blob>;
  autoPlay?: boolean;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({
  text,
  onSynthesize,
  autoPlay = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (autoPlay) {
      playAudio();
    }
    
    return () => {
      // Cleanup audio URL on unmount
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [autoPlay]);

  const playAudio = async () => {
    setIsLoading(true);
    setError('');

    try {
      const audioBlob = await onSynthesize(text);
      
      // Revoke previous URL if exists
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to play audio');
    } finally {
      setIsLoading(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      border: '1px solid #ddd'
    }}>
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        style={{ display: 'none' }}
      />

      {error && (
        <span style={{ color: '#dc3545', fontSize: '14px' }}>
          {error}
        </span>
      )}

      {!error && (
        <>
          <button
            onClick={isPlaying ? stopAudio : playAudio}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              backgroundColor: isPlaying ? '#dc3545' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {isLoading ? '⏳' : isPlaying ? '⏹️ Stop' : '▶️ Play'}
          </button>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {isPlaying ? 'Playing...' : 'Audio available'}
          </span>
        </>
      )}
    </div>
  );
};

export default VoicePlayer;
