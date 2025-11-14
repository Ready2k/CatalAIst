import React from 'react';
import { VoiceType } from '../../../../shared/types/voice.types';

interface VoiceSettingsProps {
  voiceType: VoiceType;
  streamingMode: boolean;
  onVoiceTypeChange: (voice: VoiceType) => void;
  onStreamingModeChange: (enabled: boolean) => void;
}

/**
 * VoiceSettings Component
 * 
 * Renders voice configuration options within the LLM Configuration page.
 * This component is designed to be reusable and can be extracted into a standalone package.
 * 
 * Features:
 * - Voice type selection (6 OpenAI TTS voices)
 * - Streaming mode toggle
 * - Descriptive help text
 * - Matches LLMConfiguration styling
 */
const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  voiceType,
  streamingMode,
  onVoiceTypeChange,
  onStreamingModeChange,
}) => {
  const voiceOptions: Array<{ value: VoiceType; label: string; description: string }> = [
    { value: 'alloy', label: 'Alloy', description: 'Balanced, clear (default)' },
    { value: 'echo', label: 'Echo', description: 'Warm, friendly' },
    { value: 'fable', label: 'Fable', description: 'Expressive, engaging' },
    { value: 'onyx', label: 'Onyx', description: 'Deep, authoritative' },
    { value: 'nova', label: 'Nova', description: 'Bright, energetic' },
    { value: 'shimmer', label: 'Shimmer', description: 'Soft, calm' },
  ];

  return (
    <div
      style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '18px', color: '#333' }}>
        🎤 Voice Settings
      </h3>

      {/* Voice Type Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="voiceType" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Voice Type
        </label>
        <select
          id="voiceType"
          value={voiceType}
          onChange={(e) => onVoiceTypeChange(e.target.value as VoiceType)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxSizing: 'border-box',
            backgroundColor: '#fff',
            cursor: 'pointer',
          }}
        >
          {voiceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description}
            </option>
          ))}
        </select>
        <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
          Select the voice for text-to-speech playback
        </div>
      </div>

      {/* Streaming Mode Toggle */}
      <div style={{ marginBottom: '10px' }}>
        <label
          htmlFor="streamingMode"
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            id="streamingMode"
            type="checkbox"
            checked={streamingMode}
            onChange={(e) => onStreamingModeChange(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              marginRight: '10px',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
            Auto-play questions (Streaming Mode)
          </span>
        </label>
        <div style={{ color: '#666', fontSize: '12px', marginTop: '8px', marginLeft: '28px' }}>
          <strong>Streaming Mode:</strong> Questions are automatically spoken and recording starts
          immediately after playback. Creates a natural, conversational experience like a phone call.
        </div>
        <div style={{ color: '#666', fontSize: '12px', marginTop: '5px', marginLeft: '28px' }}>
          <strong>Non-Streaming Mode:</strong> You control when to play questions and when to record
          responses. Allows you to review and edit transcriptions before submitting.
        </div>
      </div>

      {/* Info Box */}
      <div
        style={{
          marginTop: '15px',
          padding: '12px',
          backgroundColor: '#d1ecf1',
          borderRadius: '4px',
          border: '1px solid #bee5eb',
        }}
      >
        <div style={{ fontSize: '13px', color: '#0c5460' }}>
          <strong>💡 Tip:</strong> Try streaming mode for a faster, more natural conversation. Use
          non-streaming mode if you prefer to review transcriptions before sending.
        </div>
        <div style={{ fontSize: '12px', color: '#0c5460', marginTop: '8px' }}>
          📚 <a 
            href="https://github.com/your-repo/docs/VOICE_FEATURES_GUIDE.md" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#0c5460', textDecoration: 'underline' }}
          >
            View complete voice features guide
          </a> | <a 
            href="https://github.com/your-repo/docs/VOICE_TROUBLESHOOTING.md" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#0c5460', textDecoration: 'underline' }}
          >
            Troubleshooting help
          </a>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettings;
