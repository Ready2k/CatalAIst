/**
 * Voice Interface Type Definitions
 * 
 * This file contains all type definitions for the voice interface module.
 * Designed to be reusable across projects and extractable into an NPM package.
 */

/**
 * Supported voice types for TTS
 */
export type VoiceType = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * Voice provider types
 */
export type VoiceProvider = 'openai' | 'aws' | 'azure';

/**
 * Voice operation modes
 */
export type VoiceMode = 'streaming' | 'non-streaming';

/**
 * Voice configuration for a session
 */
export interface VoiceConfiguration {
  enabled: boolean;
  provider: VoiceProvider;
  voiceType: VoiceType;
  streamingMode: boolean;
  apiKey?: string;
  // AWS-specific
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
}

/**
 * Voice interaction record (question or answer)
 */
export interface VoiceInteraction {
  sessionId: string;
  timestamp: string;
  type: 'question' | 'answer';
  text: string;
  audioUrl?: string;
  transcription?: string;
  mode: VoiceMode;
  duration: number; // seconds
  confidence?: number; // 0-1 for transcription confidence
}

/**
 * Voice session metadata
 */
export interface VoiceSession {
  sessionId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  mode: VoiceMode;
  voiceType: VoiceType;
  provider: VoiceProvider;
  interactions: VoiceInteraction[];
  totalDuration: number; // seconds
  errorCount: number;
}

/**
 * Transcription result from STT
 */
export interface TranscriptionResult {
  transcription: string;
  confidence: number; // 0-1
  duration: number; // seconds
  language?: string;
}

/**
 * TTS synthesis request
 */
export interface SynthesisRequest {
  text: string;
  voice: VoiceType;
  speed?: number; // 0.25 - 4.0
  format?: 'mp3' | 'wav' | 'ogg';
}

/**
 * Voice error types
 */
export enum VoiceErrorCode {
  MICROPHONE_ACCESS_DENIED = 'VOICE_001',
  TRANSCRIPTION_FAILED = 'VOICE_002',
  TTS_GENERATION_FAILED = 'VOICE_003',
  RECORDING_TOO_SHORT = 'VOICE_004',
  TRANSCRIPTION_TOO_SHORT = 'VOICE_005',
  NETWORK_TIMEOUT = 'VOICE_006',
  UNSUPPORTED_BROWSER = 'VOICE_007',
  AUDIO_PLAYBACK_FAILED = 'VOICE_008',
  VAD_INITIALIZATION_FAILED = 'VOICE_009',
  STREAMING_MODE_ERROR = 'VOICE_010'
}

/**
 * Voice error with code and user message
 */
export interface VoiceError {
  code: VoiceErrorCode;
  message: string;
  userMessage: string;
  recoverable: boolean;
}

/**
 * Voice activity detection configuration
 */
export interface VADConfig {
  silenceThreshold: number; // dB
  silenceDuration: number; // ms
  minRecordingDuration: number; // ms
  fftSize: number;
  smoothingTimeConstant: number;
  checkInterval: number; // ms
}

/**
 * Audio recording state
 */
export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // seconds
  audioLevel: number; // 0-100
}

/**
 * Audio playback state
 */
export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number; // seconds
  duration: number; // seconds
  progress: number; // 0-100
}
