import React from 'react';
import { VoiceType } from '../../../../shared/types/voice.types';

interface VoiceSettingsProps {
  voiceType: VoiceType;
  streamingMode: boolean;
  onVoiceTypeChange: (voice: VoiceType) => void;
  onStreamingModeChange: (enabled: boolean) => void;
  provider?: 'openai' | 'bedrock';
  voiceService?: 'nova-sonic' | 'polly';
  onVoiceServiceChange?: (service: 'nova-sonic' | 'polly') => void;
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
  provider = 'openai',
  voiceService = 'nova-sonic',
  onVoiceServiceChange,
}) => {
  // Provider-specific voice options
  const getVoiceOptions = () => {
    if (provider === 'bedrock') {
      if (voiceService === 'polly') {
        return [
          { value: 'joanna' as VoiceType, label: 'Joanna', description: 'US English Female (Neural)' },
          { value: 'matthew' as VoiceType, label: 'Matthew', description: 'US English Male (Neural)' },
          { value: 'amy' as VoiceType, label: 'Amy', description: 'British English Female (Neural)' },
          { value: 'brian' as VoiceType, label: 'Brian', description: 'British English Male (Neural)' },
          { value: 'emma' as VoiceType, label: 'Emma', description: 'British English Female (Neural)' },
          { value: 'arthur' as VoiceType, label: 'Arthur', description: 'British English Male (Neural)' },
          { value: 'kendra' as VoiceType, label: 'Kendra', description: 'US English Female (Neural)' },
        ];
      }
      // Default to Nova 2 Sonic
      return [
        { value: 'nova-sonic' as VoiceType, label: 'Nova 2 Sonic', description: 'Amazon\'s latest conversational AI voice (recommended)' },
        { value: 'ruth' as VoiceType, label: 'Ruth', description: 'Natural, expressive voice via Nova 2 Sonic' },
        { value: 'joanna' as VoiceType, label: 'Joanna', description: 'Warm, friendly female via Nova 2 Sonic' },
        { value: 'matthew' as VoiceType, label: 'Matthew', description: 'Clear, professional male via Nova 2 Sonic' },
        { value: 'amy' as VoiceType, label: 'Amy', description: 'British English female via Nova 2 Sonic' },
        { value: 'brian' as VoiceType, label: 'Brian', description: 'British English male via Nova 2 Sonic' },
        { value: 'emma' as VoiceType, label: 'Emma', description: 'British English female via Nova 2 Sonic' },
      ];
    } else {
      return [
        { value: 'alloy' as VoiceType, label: 'Alloy', description: 'Balanced, clear (default)' },
        { value: 'echo' as VoiceType, label: 'Echo', description: 'Warm, friendly' },
        { value: 'fable' as VoiceType, label: 'Fable', description: 'Expressive, engaging' },
        { value: 'onyx' as VoiceType, label: 'Onyx', description: 'Deep, authoritative' },
        { value: 'nova' as VoiceType, label: 'Nova', description: 'Bright, energetic' },
        { value: 'shimmer' as VoiceType, label: 'Shimmer', description: 'Soft, calm' },
      ];
    }
  };

  const voiceOptions = getVoiceOptions();

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
        🎤 Voice Settings {provider === 'bedrock' && `(${voiceService === 'polly' ? 'Polly' : 'Nova 2 Sonic'})`}
      </h3>

      {/* Service Selection (Bedrock Only) */}
      {provider === 'bedrock' && onVoiceServiceChange && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>AWS Voice Service</label>
          <div style={{ display: 'flex', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="voiceService"
                value="nova-sonic"
                checked={voiceService === 'nova-sonic'}
                onChange={() => onVoiceServiceChange('nova-sonic')}
                style={{ marginRight: '5px' }}
              />
              Nova 2 Sonic (Chat & Voice)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="voiceService"
                value="polly"
                checked={voiceService === 'polly'}
                onChange={() => onVoiceServiceChange('polly')}
                style={{ marginRight: '5px' }}
              />
              Polly & Transcribe (Standard)
            </label>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            {voiceService === 'nova-sonic'
              ? 'GenAI Speech-to-Speech: Best for conversational fluidity.'
              : 'Discrete Services: Uses Transcribe for input and Polly for output. Good for precision.'}
          </div>
        </div>
      )}

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
          {provider === 'bedrock'
            ? (voiceService === 'polly'
              ? 'Select an Amazon Polly neural voice'
              : 'Select the voice for Nova 2 Sonic conversational AI')
            : 'Select the voice for OpenAI text-to-speech playback'
          }
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
          <strong>Streaming Mode:</strong> {provider === 'bedrock'
            ? 'Enables real-time conversational AI with Nova 2 Sonic. Natural turn-taking and immediate responses create a seamless conversation experience.'
            : 'Questions are automatically spoken and recording starts immediately after playback. Creates a natural, conversational experience like a phone call.'
          }
        </div>
        <div style={{ color: '#666', fontSize: '12px', marginTop: '5px', marginLeft: '28px' }}>
          <strong>Non-Streaming Mode:</strong> {provider === 'bedrock'
            ? 'Manual control over voice interactions. You control when to speak and when to listen, with full review capabilities.'
            : 'You control when to play questions and when to record responses. Allows you to review and edit transcriptions before submitting.'
          }
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
          <strong>💡 Tip:</strong> {provider === 'bedrock'
            ? (voiceService === 'polly'
              ? 'Standard mode uses Amazon Transcribe for accurate speech-to-text and Amazon Polly for high-quality text-to-speech. Good for discrete tasks.'
              : 'Nova 2 Sonic provides real-time conversational AI with speech-to-speech capabilities, natural turn-taking, and superior voice quality.')
            : 'Try streaming mode for a faster, more natural conversation. Use non-streaming mode if you prefer to review transcriptions before sending.'
          }
        </div>
        <div style={{ fontSize: '12px', color: '#0c5460', marginTop: '8px' }}>
          {provider === 'bedrock'
            ? (voiceService === 'polly'
              ? '🤖 Powered by Amazon Transcribe & Polly'
              : '🤖 Powered by Amazon Nova 2 Sonic - Advanced conversational AI')
            : '🤖 Powered by OpenAI Whisper (STT) and TTS-1 (TTS)'
          }
        </div>
      </div>
    </div>
  );
};

export default VoiceSettings;
