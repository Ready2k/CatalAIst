/**
 * Nova 2 Sonic WebSocket Service for Frontend
 * 
 * Handles real-time bidirectional streaming with Nova 2 Sonic model
 * via WebSocket connection to the backend.
 */

export interface NovaSonicConfig {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsSessionToken?: string;
  awsRegion?: string;
  systemPrompt?: string;
  userId?: string;
  modelId?: string;
}

export interface NovaSonicCallbacks {
  onTranscription?: (text: string) => void;
  onTextResponse?: (text: string) => void;
  onAudioResponse?: (audioData: ArrayBuffer) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export class NovaSonicWebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private callbacks: NovaSonicCallbacks = {};
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000; // Start with 1 second

  constructor(private baseUrl: string = '') {
    // Use empty string for relative URLs - nginx will proxy
    this.baseUrl = baseUrl || '';
  }

  /**
   * Connect to Nova 2 Sonic WebSocket and initialize session
   */
  async connect(config: NovaSonicConfig, callbacks: NovaSonicCallbacks = {}): Promise<void> {
    // Ensure any existing connection is closed
    this.disconnect();

    this.callbacks = callbacks;

    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection
        // Direct connection to backend (port 4000) in dev to generate bypass unstable proxy
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isFrontendPort = window.location.port === '4001' || window.location.port === '3000';

        let wsUrl;
        if (isDev && isFrontendPort) {
          console.log('[Nova 2 Sonic] Dev environment detected, bypassing proxy -> port 4000');
          wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:4000/api/nova-sonic/stream`;
        } else {
          wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/nova-sonic/stream`;
        }

        const ws = new WebSocket(wsUrl);
        this.ws = ws;

        ws.onopen = () => {
          console.log('[Nova 2 Sonic] WebSocket connected');

          // Send initialization message
          this.send({
            type: 'initialize',
            awsAccessKeyId: config.awsAccessKeyId,
            awsSecretAccessKey: config.awsSecretAccessKey,
            awsSessionToken: config.awsSessionToken,
            awsRegion: config.awsRegion || 'us-east-1',
            systemPrompt: config.systemPrompt,
            userId: config.userId || 'anonymous',
            modelId: config.modelId
          });
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message, resolve, reject);
          } catch (error) {
            console.error('[Nova 2 Sonic] Error parsing message:', error);
            this.callbacks.onError?.(new Error('Failed to parse WebSocket message'));
          }
        };

        ws.onclose = (event) => {
          console.log('[Nova 2 Sonic] WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.sessionId = null;
          this.callbacks.onDisconnected?.();

          // Attempt reconnection if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect(config);
          }
        };

        ws.onerror = (error) => {
          console.error('[Nova 2 Sonic] WebSocket error:', error);
          this.callbacks.onError?.(new Error('WebSocket connection error'));
          reject(new Error('Failed to connect to Nova 2 Sonic WebSocket'));
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any, resolve?: () => void, reject?: (error: Error) => void): void {
    switch (message.type) {
      case 'initialized':
        this.sessionId = message.sessionId;
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset on successful connection
        console.log('[Nova 2 Sonic] Session initialized:', this.sessionId);
        this.callbacks.onConnected?.();
        resolve?.();
        break;

      case 'transcription':
        this.callbacks.onTranscription?.(message.text);
        break;

      case 'text_response':
        this.callbacks.onTextResponse?.(message.text);
        break;

      case 'audio_response':
        try {
          // Convert base64 to ArrayBuffer
          const binaryString = atob(message.audio);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          this.callbacks.onAudioResponse?.(bytes.buffer);
        } catch (error) {
          console.error('[Nova 2 Sonic] Error processing audio response:', error);
          this.callbacks.onError?.(new Error('Failed to process audio response'));
        }
        break;

      case 'error':
        console.error('[Nova 2 Sonic] Server error:', message.error);
        this.callbacks.onError?.(new Error(message.error));
        reject?.(new Error(message.error));
        break;

      case 'conversation_ended':
        console.log('[Nova 2 Sonic] Conversation ended');
        this.disconnect();
        break;

      default:
        console.warn('[Nova 2 Sonic] Unknown message type:', message.type);
    }
  }

  /**
   * Send audio chunk to Nova 2 Sonic
   */
  async sendAudioChunk(audioData: ArrayBuffer, isComplete: boolean = false): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to Nova 2 Sonic');
    }

    // Convert ArrayBuffer to base64 using a manual loop (matches working test page logic)
    // This is more robust for large buffers than Array.from or spread operators
    const bytes = new Uint8Array(audioData);
    let binaryString = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binaryString);

    this.send({
      type: 'audio_chunk',
      audio: base64Audio,
      isComplete
    });
    console.log(`[NovaSonicService] Sent chunk: ${audioData.byteLength} bytes, isComplete: ${isComplete}`);
  }

  /**
   * Send text message to Nova 2 Sonic
   */
  async sendTextMessage(text: string): Promise<void> {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to Nova 2 Sonic');
    }

    this.send({
      type: 'text_message',
      text
    });
  }

  /**
   * Process audio file (convert to chunks and send)
   * Automatically converts input audio to 16kHz mono PCM
   */
  async processAudioFile(audioFile: File): Promise<{ transcription: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        // Set up temporary callbacks to capture response
        let responseText = '';
        let hasReceivedResponse = false;
        const originalOnTranscription = this.callbacks.onTranscription;
        const originalOnTextResponse = this.callbacks.onTextResponse;

        // Nova 2 Sonic doesn't send separate transcription for audio input
        // Instead, it directly processes and responds with text
        this.callbacks.onTextResponse = (text: string) => {
          console.log('[Nova 2 Sonic] Received response text:', text);
          // Also call original callback if it exists
          originalOnTextResponse?.(text);

          // Restore original callbacks
          this.callbacks.onTranscription = originalOnTranscription;
          this.callbacks.onTextResponse = originalOnTextResponse;
          this.callbacks.onError = originalOnError;

          resolve({ transcription: text });
        };

        // Also listen for transcription events
        this.callbacks.onTranscription = (text: string) => {
          console.log('[Nova 2 Sonic] Received transcription:', text);
          // For file processing, we might get partials. 
          // If we want to wait for the full response, we might need to wait for a specific event
          // checking if it's a final transcript? 
          // For now, let's assume any transcription usually indicates success
          // But Nova Sonic sends text_response for the AI answer, which serves as confirming understanding.
          // Let's resolve on transcription too if textResponse isn't coming.

          originalOnTranscription?.(text);
          // Note: We might get multiple partials. Resolving on first partial might be premature.
          // But usually we want the final text. 
          // Since the main app manual mode expects a single return, this is tricky with streaming.
          // Let's update a buffer and wait for a short silence or "done" signal?
          // Actually, let's keep it simple: If we get text response (AI answer), that's the end.
          // If we only get transcription, we might need to wait.
          // Ideally, backend sends 'completion' or we wait for 'text_response'.
        };

        // Set up temporary error callback
        const originalOnError = this.callbacks.onError;
        this.callbacks.onError = (error: Error) => {
          console.error('[Nova 2 Sonic] Error during file processing:', error);

          // Restore original callbacks
          this.callbacks.onTranscription = originalOnTranscription;
          this.callbacks.onTextResponse = originalOnTextResponse;
          this.callbacks.onError = originalOnError;

          // Call original error callback if it exists
          originalOnError?.(error);
          reject(error);
        };

        // --- Audio Conversion Logic ---
        const arrayBuffer = await audioFile.arrayBuffer();

        // Decode and convert to PCM 16kHz
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass({ sampleRate: 16000 });

        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        console.log(`[Nova 2 Sonic] Audio Context Sample Rate: ${audioCtx.sampleRate}Hz`);
        console.log(`[Nova 2 Sonic] Decoded Buffer Sample Rate: ${audioBuffer.sampleRate}Hz`);

        if (audioBuffer.sampleRate !== 16000) {
          console.warn(`[Nova 2 Sonic] SAMPLING RATE MISMATCH! Expected 16000Hz, got ${audioBuffer.sampleRate}Hz. Audio will be pitch-shifted and likely unintelligible.`);
        }

        // Get mono channel data
        let inputData = audioBuffer.getChannelData(0);

        // Active Resampling Logic
        if (audioBuffer.sampleRate !== 16000) {
          console.log(`[Nova 2 Sonic] Resampling from ${audioBuffer.sampleRate}Hz to 16000Hz...`);

          // Calculate new length
          const ratio = 16000 / audioBuffer.sampleRate;
          const newLength = Math.round(inputData.length * ratio);

          // Use OfflineAudioContext for high-quality resampling
          const offlineCtx = new OfflineAudioContext(1, newLength, 16000);
          const source = offlineCtx.createBufferSource();

          source.buffer = audioBuffer;
          source.connect(offlineCtx.destination);
          source.start(0);

          const resampledBuffer = await offlineCtx.startRendering();
          inputData = resampledBuffer.getChannelData(0);

          console.log(`[Nova 2 Sonic] Resampling complete. New length: ${inputData.length} samples.`);
        }

        // Convert to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Calculate RMS (Root Mean Square) for volume
        let sumSquares = 0;
        for (let i = 0; i < pcmData.length; i++) {
          // Normalize Int16 to -1..1 for RMS calculation
          const floatVal = pcmData[i] / 32768.0;
          sumSquares += floatVal * floatVal;
        }
        const rms = Math.sqrt(sumSquares / pcmData.length);
        const durationSec = pcmData.length / 16000;

        console.log(`[Nova 2 Sonic] Processed Audio Stats:`);
        console.log(`   - Duration: ${durationSec.toFixed(2)}s`);
        console.log(`   - RMS Level: ${rms.toFixed(4)}`);

        if (rms < 0.01) {
          console.warn(`[Nova 2 Sonic] ⚠️ AUDIO IS EXTREMELY QUIET (RMS < 0.01). The model may ignore this as silence.`);
        }

        // Validate PCM data (check for silence)
        let zeroCount = 0;
        const sampleSize = Math.min(pcmData.length, 1000);
        for (let i = 0; i < sampleSize; i++) {
          if (pcmData[i] === 0) zeroCount++;
        }
        console.log(`[Nova 2 Sonic] Manual Mode Audio: ${pcmData.byteLength} bytes. Silence check (first ${sampleSize}): ${zeroCount} zeros.`);

        if (zeroCount === sampleSize && pcmData.length > 0) {
          console.warn('[Nova 2 Sonic] WARNING: Audio appears to be completely silent!');
        }

        // Send audio in chunks to mimic streaming behavior (more robust than one large payload)
        // PADDING: REMOVED to match Test App (padding confuses VAD/model)
        const paddedPcmData = pcmData;

        console.log(`[Nova 2 Sonic] Starting upload. Total samples: ${paddedPcmData.length}`);

        const chunkSize = 4096;
        let sentBytes = 0;

        for (let offset = 0; offset < paddedPcmData.length; offset += chunkSize) {
          const end = Math.min(offset + chunkSize, paddedPcmData.length);
          const chunk = paddedPcmData.slice(offset, end);

          // Convert to Base64 manually to match streaming protocol
          const chunkBuffer = new Uint8Array(chunk.buffer);
          let binary = '';
          for (let j = 0; j < chunkBuffer.byteLength; j++) {
            binary += String.fromCharCode(chunkBuffer[j]);
          }
          const base64Chunk = btoa(binary);

          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'audio_chunk',
              audio: base64Chunk,
              isComplete: false
            }));
          }
          sentBytes += chunk.byteLength;

          // THROTTLE: Wait 250ms PER CHUNK to mimic realtime streaming
          // 4096 samples @ 16kHz = ~256ms. Sending faster triggers aggressive filtering.
          await new Promise(r => setTimeout(r, 250));
        }

        console.log(`[Nova 2 Sonic] Upload complete. Sent ${sentBytes} bytes.`);

        // Send completion signal with empty payload
        await this.sendAudioChunk(new ArrayBuffer(0), true);

        // Close context to free resources
        await audioCtx.close();

        // Wait for response (with timeout)
        const timeout = setTimeout(() => {
          // Restore original callbacks
          this.callbacks.onTranscription = originalOnTranscription;
          this.callbacks.onTextResponse = originalOnTextResponse;
          this.callbacks.onError = originalOnError;
          reject(new Error('Transcription timeout - no response received from Nova 2 Sonic'));
        }, 30000); // 30 second timeout

        // Check for response periodically
        const checkResult = () => {
          if (hasReceivedResponse && responseText) {
            clearTimeout(timeout);
            // Restore original callbacks
            this.callbacks.onTranscription = originalOnTranscription;
            this.callbacks.onTextResponse = originalOnTextResponse;
            this.callbacks.onError = originalOnError;

            resolve({ transcription: responseText });
          } else {
            setTimeout(checkResult, 100);
          }
        };

        checkResult();

      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to process audio file'));
      }
    });
  }

  /**
   * Disconnect from Nova 2 Sonic
   */
  disconnect(): void {
    console.log('[Nova 2 Sonic] Disconnecting previous session...');
    if (this.ws) {
      // Send end conversation message if connected
      if (this.isConnected) {
        this.send({
          type: 'end_conversation'
        });
      }

      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.sessionId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Send message to WebSocket
   */
  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('[Nova 2 Sonic] Cannot send message - WebSocket not open');
      this.callbacks.onError?.(new Error('WebSocket connection not available'));
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private async attemptReconnect(config: NovaSonicConfig): Promise<void> {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`[Nova 2 Sonic] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.connect(config, this.callbacks);
      } catch (error) {
        console.error('[Nova 2 Sonic] Reconnection failed:', error);

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.callbacks.onError?.(new Error('Failed to reconnect to Nova 2 Sonic after multiple attempts'));
        }
      }
    }, delay);
  }

  /**
   * Get connection status
   */
  isConnectedToNovaSonic(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
}

// Export singleton instance
export const novaSonicService = new NovaSonicWebSocketService();