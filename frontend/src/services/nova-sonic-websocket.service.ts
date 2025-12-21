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
    this.callbacks = callbacks;

    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/nova-sonic/stream`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[Nova 2 Sonic] WebSocket connected');
          
          // Send initialization message
          this.send({
            type: 'initialize',
            awsAccessKeyId: config.awsAccessKeyId,
            awsSecretAccessKey: config.awsSecretAccessKey,
            awsSessionToken: config.awsSessionToken,
            awsRegion: config.awsRegion || 'us-east-1',
            systemPrompt: config.systemPrompt,
            userId: config.userId || 'anonymous'
          });
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message, resolve, reject);
          } catch (error) {
            console.error('[Nova 2 Sonic] Error parsing message:', error);
            this.callbacks.onError?.(new Error('Failed to parse WebSocket message'));
          }
        };

        this.ws.onclose = (event) => {
          console.log('[Nova 2 Sonic] WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.sessionId = null;
          this.callbacks.onDisconnected?.();

          // Attempt reconnection if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect(config);
          }
        };

        this.ws.onerror = (error) => {
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

    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(audioData);
    const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    const base64Audio = btoa(binaryString);

    this.send({
      type: 'audio_chunk',
      audio: base64Audio,
      isComplete
    });
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
          responseText = text;
          hasReceivedResponse = true;
          // Also call original callback if it exists
          originalOnTextResponse?.(text);
        };

        // Set up temporary error callback
        const originalOnError = this.callbacks.onError;
        this.callbacks.onError = (error: Error) => {
          // Restore original callbacks
          this.callbacks.onTranscription = originalOnTranscription;
          this.callbacks.onTextResponse = originalOnTextResponse;
          this.callbacks.onError = originalOnError;
          
          // Call original error callback if it exists
          originalOnError?.(error);
          reject(error);
        };

        // Convert audio file to ArrayBuffer
        const arrayBuffer = await audioFile.arrayBuffer();
        
        // Send audio chunk (complete file)
        await this.sendAudioChunk(arrayBuffer, true);

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
            
            // Return the AI's response as "transcription" for compatibility
            // In reality, Nova 2 Sonic processed the audio and responded directly
            resolve({ transcription: `[Audio processed] ${responseText}` });
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