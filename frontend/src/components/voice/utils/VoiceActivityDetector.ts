/**
 * VoiceActivityDetector
 * 
 * Utility class to detect silence in audio streams for auto-stop functionality.
 * Uses Web Audio API to analyze audio frequency data and determine when the user has stopped speaking.
 * 
 * This utility is designed to be reusable and can be extracted into a standalone package.
 */

export interface VADConfig {
  silenceThreshold: number;      // dB (default: -50)
  silenceDuration: number;       // ms (default: 2000)
  minRecordingDuration: number;  // ms (default: 1000)
  fftSize: number;               // FFT size for frequency analysis (default: 2048)
  smoothingTimeConstant: number; // Smoothing for analyser (default: 0.8)
  checkInterval: number;         // ms between VAD checks (default: 100)
}

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  private config: VADConfig;
  private lastSoundTime: number = Date.now();
  private recordingStartTime: number = Date.now();
  private checkIntervalId: NodeJS.Timeout | null = null;
  
  private onSilenceDetected: (() => void) | null = null;
  private onSoundDetected: (() => void) | null = null;

  constructor(config?: Partial<VADConfig>) {
    this.config = {
      silenceThreshold: config?.silenceThreshold ?? -50,
      silenceDuration: config?.silenceDuration ?? 2000,
      minRecordingDuration: config?.minRecordingDuration ?? 1000,
      fftSize: config?.fftSize ?? 2048,
      smoothingTimeConstant: config?.smoothingTimeConstant ?? 0.8,
      checkInterval: config?.checkInterval ?? 100,
    };
  }

  /**
   * Initialize the VAD with a media stream
   */
  async initialize(stream: MediaStream): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
      
      // Connect media stream to analyser
      this.mediaStream = stream;
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      
      // Reset timers
      this.lastSoundTime = Date.now();
      this.recordingStartTime = Date.now();
      
    } catch (error) {
      console.error('Failed to initialize VoiceActivityDetector:', error);
      throw new Error('VAD initialization failed. Web Audio API may not be supported.');
    }
  }

  /**
   * Start monitoring for silence
   */
  start(onSilenceDetected: () => void, onSoundDetected?: () => void): void {
    if (!this.analyser) {
      throw new Error('VAD not initialized. Call initialize() first.');
    }
    
    this.onSilenceDetected = onSilenceDetected;
    this.onSoundDetected = onSoundDetected || null;
    
    // Start checking for silence at regular intervals
    this.checkIntervalId = setInterval(() => {
      this.checkForSilence();
    }, this.config.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stop();
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.mediaStream = null;
    this.onSilenceDetected = null;
    this.onSoundDetected = null;
  }

  /**
   * Check if silence is detected
   */
  private checkForSilence(): void {
    if (!this.analyser) return;
    
    // Don't check for silence until minimum recording duration has passed
    const recordingDuration = Date.now() - this.recordingStartTime;
    if (recordingDuration < this.config.minRecordingDuration) {
      return;
    }
    
    const isSilent = this.detectSilence();
    
    if (isSilent && this.onSilenceDetected) {
      this.onSilenceDetected();
    } else if (!isSilent && this.onSoundDetected) {
      this.onSoundDetected();
    }
  }

  /**
   * Detect if current audio is silent
   */
  private detectSilence(): boolean {
    if (!this.analyser) return false;
    
    // Get frequency data
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    // Calculate average amplitude
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    
    // Convert to decibels
    const db = average > 0 ? 20 * Math.log10(average / 255) : -Infinity;
    
    // Check if sound is above threshold
    if (db > this.config.silenceThreshold) {
      this.lastSoundTime = Date.now();
      return false;
    }
    
    // Check if silence duration has been exceeded
    const silenceDuration = Date.now() - this.lastSoundTime;
    return silenceDuration > this.config.silenceDuration;
  }

  /**
   * Get current audio level (0-100)
   */
  getAudioLevel(): number {
    if (!this.analyser) return 0;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    
    // Normalize to 0-100
    return Math.min(100, (average / 255) * 100);
  }

  /**
   * Check if browser supports Web Audio API
   */
  static isSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }
}

export default VoiceActivityDetector;
