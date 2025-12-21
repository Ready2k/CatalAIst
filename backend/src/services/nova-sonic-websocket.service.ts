import {
  BedrockRuntimeClient,
  InvokeModelWithBidirectionalStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import * as https from 'https';
import { v4 as uuidv4 } from 'uuid';
import { LLMProviderConfig } from './llm-provider.interface';

/**
 * Nova 2 Sonic WebSocket Service
 * 
 * Real implementation using persistent bidirectional streaming
 * Based on working Voice_S2S implementation patterns
 * 
 * AUDIO FORMAT REQUIREMENTS:
 * - Format: PCM16 (16-bit signed integer, little-endian)
 * - Sample Rate: 16,000 Hz (16 kHz)
 * - Channels: 1 (mono)
 * - Encoding: Base64 for transmission
 * 
 * STREAMING PATTERN:
 * - Persistent bidirectional stream per session
 * - Audio chunks queued and processed continuously
 * - Stream stays open for multi-turn conversation
 * - Proper turn-taking detection by Nova 2 Sonic
 */
export class NovaSonicWebSocketService {
  private readonly NOVA_SONIC_MODEL_ID = 'amazon.nova-2-sonic-v1:0';
  private readonly SUPPORTED_REGIONS = ['us-east-1', 'us-west-2', 'ap-northeast-1', 'eu-north-1'];
  
  private bedrockClient: BedrockRuntimeClient | null = null;
  private activeSessions = new Map<string, {
    config: LLMProviderConfig;
    systemPrompt?: string;
    createdAt: Date;
    inputStream: AsyncGenerator<any> | null;
    outputStream: AsyncIterable<any> | null;
    isStreaming: boolean;
    audioQueue: Buffer[];
    textQueue: string[];
    currentPromptName?: string;
    currentContentName?: string;
    eventCallback?: (event: any) => void;
  }>();

  // 100ms of silence (16kHz * 0.1s * 2 bytes/sample = 3200 bytes)
  private readonly SILENCE_FRAME = Buffer.alloc(3200, 0);

  /**
   * Initialize a new Nova 2 Sonic session with persistent bidirectional stream
   */
  async initializeSession(
    config: LLMProviderConfig,
    systemPrompt?: string
  ): Promise<{
    sessionId: string;
  }> {
    const sessionId = uuidv4();
    
    try {
      // Validate AWS region for Nova 2 Sonic support
      const region = config.awsRegion || 'us-east-1';
      if (!this.SUPPORTED_REGIONS.includes(region)) {
        throw new Error(
          `Nova 2 Sonic is not available in region '${region}'. ` +
          `Supported regions: ${this.SUPPORTED_REGIONS.join(', ')}. ` +
          `Please change your AWS region to one of the supported regions.`
        );
      }

      this.bedrockClient = this.createBedrockClient(config);
      
      // Initialize session with persistent stream structure
      this.activeSessions.set(sessionId, {
        config,
        systemPrompt,
        createdAt: new Date(),
        inputStream: null,
        outputStream: null,
        isStreaming: false,
        audioQueue: [],
        textQueue: [],
        currentPromptName: undefined,
        currentContentName: undefined,
        eventCallback: undefined
      });

      console.log(`[Nova 2 Sonic] Session ${sessionId} initialized in region ${region}`);
      
      return { sessionId };
      
    } catch (error) {
      console.error('[Nova 2 Sonic] Failed to initialize session:', error);
      throw error;
    }
  }

  /**
   * Start persistent bidirectional stream for a session
   */
  private async startBidirectionalStream(sessionId: string, eventCallback: (event: any) => void): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !this.bedrockClient) {
      throw new Error(`Session ${sessionId} not found or client not initialized`);
    }

    if (session.isStreaming) {
      console.log(`[Nova 2 Sonic] Session ${sessionId} already has active stream`);
      return;
    }

    try {
      session.eventCallback = eventCallback;
      session.isStreaming = true;
      session.currentPromptName = `prompt-${Date.now()}`;

      console.log(`[Nova 2 Sonic] Starting persistent bidirectional stream for session ${sessionId}`);

      // Create persistent input stream generator
      session.inputStream = this.createPersistentInputStream(sessionId);

      // Create the bidirectional stream command
      const command = new InvokeModelWithBidirectionalStreamCommand({
        modelId: this.NOVA_SONIC_MODEL_ID,
        body: session.inputStream,
      });

      // Execute the stream command
      const response = await this.bedrockClient.send(command);
      session.outputStream = response.body || null;

      // Process output events continuously
      if (session.outputStream) {
        this.processOutputEvents(sessionId, session.outputStream);
      }

    } catch (error) {
      session.isStreaming = false;
      console.error(`[Nova 2 Sonic] Error starting bidirectional stream:`, error);
      throw error;
    }
  }

  /**
   * Create persistent input stream generator (like Voice_S2S)
   */
  private async* createPersistentInputStream(sessionId: string): AsyncGenerator<any> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.error(`[Nova 2 Sonic] Session ${sessionId} not found in createPersistentInputStream`);
      return;
    }

    const promptName = session.currentPromptName || `prompt-${Date.now()}`;
    
    console.log(`[Nova 2 Sonic] Creating persistent input stream for session ${sessionId}`);

    try {
      // 1. Session Start Event
      const sessionStartEvent = {
        event: {
          sessionStart: {
            inferenceConfiguration: {
              maxTokens: 2048,
              topP: 0.9,
              temperature: 0.7
            },
            turnDetectionConfiguration: {
              endpointingSensitivity: "HIGH"  // Let Nova 2 Sonic detect when user finishes speaking
            }
          }
        }
      };
      yield { chunk: { bytes: Buffer.from(JSON.stringify(sessionStartEvent)) } };
      console.log(`[Nova 2 Sonic] Sent session start for ${sessionId}`);

      // 2. Prompt Start Event
      const promptStartEvent = {
        event: {
          promptStart: {
            promptName: promptName,
            textOutputConfiguration: {
              mediaType: "text/plain"
            },
            audioOutputConfiguration: {
              mediaType: "audio/lpcm",
              sampleRateHertz: 24000,  // Nova 2 Sonic outputs at 24kHz
              sampleSizeBits: 16,
              channelCount: 1,
              voiceId: "matthew",
              encoding: "base64",
              audioType: "SPEECH"
            }
          }
        }
      };
      yield { chunk: { bytes: Buffer.from(JSON.stringify(promptStartEvent)) } };
      console.log(`[Nova 2 Sonic] Sent prompt start for ${sessionId}`);

      // 3. System Content
      const systemContentName = `system-${Date.now()}`;
      
      // System Content Start
      const systemContentStartEvent = {
        event: {
          contentStart: {
            promptName: promptName,
            contentName: systemContentName,
            type: "TEXT",
            interactive: false,
            role: "SYSTEM",
            textInputConfiguration: {
              mediaType: "text/plain"
            }
          }
        }
      };
      yield { chunk: { bytes: Buffer.from(JSON.stringify(systemContentStartEvent)) } };

      // System Text Input
      const systemPromptText = session.systemPrompt || this.getDefaultSystemPrompt();
      const systemTextInputEvent = {
        event: {
          textInput: {
            promptName: promptName,
            contentName: systemContentName,
            content: systemPromptText
          }
        }
      };
      yield { chunk: { bytes: Buffer.from(JSON.stringify(systemTextInputEvent)) } };

      // System Content End
      const systemContentEndEvent = {
        event: {
          contentEnd: {
            promptName: promptName,
            contentName: systemContentName
          }
        }
      };
      yield { chunk: { bytes: Buffer.from(JSON.stringify(systemContentEndEvent)) } };
      console.log(`[Nova 2 Sonic] Sent system content for ${sessionId}`);

      // 4. Process queued content continuously - THIS IS THE KEY DIFFERENCE
      // Keep the stream open and process audio/text as it comes in
      console.log(`[Nova 2 Sonic] 🚀 Starting processing loop for session ${sessionId}`);
      
      while (session.isStreaming) {
        console.log(`[Nova 2 Sonic] � PrPocessing loop - Text queue: ${session.textQueue.length}, Audio queue: ${session.audioQueue.length}`);
        
        // Process text queue first (higher priority)
        while (session.textQueue.length > 0) {
          const text = session.textQueue.shift();
          if (text) {
            console.log(`[Nova 2 Sonic] 📝 Processing text from queue: "${text.substring(0, 50)}..."`);
            yield* this.generateTextContent(promptName, text, session);
          }
        }

        // Process audio queue - send chunks as they arrive
        while (session.audioQueue.length > 0) {
          const audioBuffer = session.audioQueue.shift();
          if (audioBuffer) {
            console.log(`[Nova 2 Sonic] 🔄 Processing audio from queue: ${audioBuffer.length} bytes`);
            yield* this.generateAudioContent(promptName, audioBuffer, session);
          }
        }

        // CRITICAL: Don't end the stream immediately - wait for more input or Nova 2 Sonic to respond
        // This allows Nova 2 Sonic to use its turn detection to know when the user is done speaking
        await new Promise(resolve => setTimeout(resolve, 50)); // Short wait to check for more input
      }

      // Only end the stream when the session is explicitly closed
      console.log(`[Nova 2 Sonic] Ending persistent stream for session ${sessionId}`);
      
    } catch (error) {
      console.error(`[Nova 2 Sonic] Error in persistent input stream for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Generate text content events
   */
  private async* generateTextContent(promptName: string, text: string, session: any): AsyncGenerator<any> {
    const textContentName = `text-${Date.now()}`;
    
    // Close audio content if open
    if (session.currentContentName) {
      const audioEndEvent = {
        event: {
          contentEnd: {
            promptName: promptName,
            contentName: session.currentContentName
          }
        }
      };
      yield { chunk: { bytes: Buffer.from(JSON.stringify(audioEndEvent)) } };
      session.currentContentName = undefined;
    }

    // Text Content Start
    const textContentStartEvent = {
      event: {
        contentStart: {
          promptName: promptName,
          contentName: textContentName,
          type: "TEXT",
          interactive: true,
          role: "USER",
          textInputConfiguration: {
            mediaType: "text/plain"
          }
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(textContentStartEvent)) } };

    // Text Input
    const textInputEvent = {
      event: {
        textInput: {
          promptName: promptName,
          contentName: textContentName,
          content: text
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(textInputEvent)) } };

    // Text Content End
    const textContentEndEvent = {
      event: {
        contentEnd: {
          promptName: promptName,
          contentName: textContentName
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(textContentEndEvent)) } };
    console.log(`[Nova 2 Sonic] Sent text content: "${text.substring(0, 50)}..."`);

    // Send silence frame after text
    const silenceContentName = `audio-silence-${Date.now()}`;
    const silenceStartEvent = {
      event: {
        contentStart: {
          promptName: promptName,
          contentName: silenceContentName,
          type: "AUDIO",
          interactive: true,
          role: "USER",
          audioInputConfiguration: {
            mediaType: "audio/lpcm",
            sampleRateHertz: 16000,
            sampleSizeBits: 16,
            channelCount: 1,
            audioType: "SPEECH",
            encoding: "base64"
          }
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(silenceStartEvent)) } };

    const silenceInputEvent = {
      event: {
        audioInput: {
          promptName: promptName,
          contentName: silenceContentName,
          content: this.SILENCE_FRAME.toString('base64')
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(silenceInputEvent)) } };

    const silenceEndEvent = {
      event: {
        contentEnd: {
          promptName: promptName,
          contentName: silenceContentName
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(silenceEndEvent)) } };
  }

  /**
   * Generate audio content events for PCM16 data
   */
  private async* generateAudioContent(promptName: string, audioBuffer: Buffer, session: any): AsyncGenerator<any> {
    // Detailed audio analysis and logging
    console.log(`[Nova 2 Sonic] 🎤 AUDIO ANALYSIS for session ${session ? 'active' : 'inactive'}:`);
    console.log(`  📊 Buffer size: ${audioBuffer.length} bytes`);
    console.log(`  🔢 Sample count: ${audioBuffer.length / 2} samples`);
    console.log(`  ⏱️  Duration: ${(audioBuffer.length / 2 / 16000).toFixed(3)} seconds`);
    
    // Validate PCM16 format
    if (audioBuffer.length % 2 !== 0) {
      console.warn(`  ⚠️  Audio buffer length ${audioBuffer.length} is not even - may not be valid PCM16`);
    }

    // Analyze audio levels and content
    const audioLevels = this.analyzeAudioLevels(audioBuffer);
    console.log(`  🔊 Audio levels:`, audioLevels);

    // Check for silence or very low levels
    if (audioLevels.maxAmplitude < 100) {
      console.warn(`  🔇 WARNING: Very low audio levels detected (max: ${audioLevels.maxAmplitude})`);
      console.warn(`     This may indicate microphone issues or very quiet speech`);
    }

    // Check for clipping
    if (audioLevels.maxAmplitude > 30000) {
      console.warn(`  📢 WARNING: Audio clipping detected (max: ${audioLevels.maxAmplitude})`);
      console.warn(`     Audio may be too loud and distorted`);
    }

    // Start Audio Content if not open
    if (!session.currentContentName) {
      const newContentName = `audio-${Date.now()}`;
      session.currentContentName = newContentName;

      const audioStartEvent = {
        event: {
          contentStart: {
            promptName: promptName,
            contentName: newContentName,
            type: "AUDIO",
            interactive: true,
            role: "USER",
            audioInputConfiguration: {
              mediaType: "audio/lpcm",
              sampleRateHertz: 16000,  // PCM16 at 16kHz
              sampleSizeBits: 16,
              channelCount: 1,
              audioType: "SPEECH",
              encoding: "base64"
            }
          }
        }
      };
      yield { chunk: { bytes: Buffer.from(JSON.stringify(audioStartEvent)) } };
      console.log(`  🎵 Started PCM16 audio content: ${newContentName}`);
    }

    // Audio Input - send PCM16 data
    const audioInputEvent = {
      event: {
        audioInput: {
          promptName: promptName,
          contentName: session.currentContentName,
          content: audioBuffer.toString('base64')
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(audioInputEvent)) } };
    console.log(`  📤 Sent PCM16 audio chunk: ${audioBuffer.length} bytes (${audioLevels.rmsLevel.toFixed(1)} RMS)`);

    // CRITICAL FIX: Close audio content after sending the chunk to signal completion
    // This tells Nova 2 Sonic that the user is done speaking and it should respond
    const audioEndEvent = {
      event: {
        contentEnd: {
          promptName: promptName,
          contentName: session.currentContentName
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(audioEndEvent)) } };
    console.log(`  🔚 Closed PCM16 audio content: ${session.currentContentName}`);
    session.currentContentName = undefined; // Reset for next audio input
  }

  /**
   * Analyze audio levels and characteristics
   */
  private analyzeAudioLevels(audioBuffer: Buffer): {
    maxAmplitude: number;
    minAmplitude: number;
    rmsLevel: number;
    averageLevel: number;
    silencePercentage: number;
    peakCount: number;
  } {
    let maxAmplitude = 0;
    let minAmplitude = 0;
    let sumSquares = 0;
    let sumAbsolute = 0;
    let silentSamples = 0;
    let peakCount = 0;
    
    const sampleCount = audioBuffer.length / 2;
    const silenceThreshold = 50; // Threshold for considering a sample "silent"
    const peakThreshold = 1000; // Threshold for considering a sample a "peak"
    
    for (let i = 0; i < audioBuffer.length; i += 2) {
      // Read 16-bit signed integer (little-endian)
      const sample = audioBuffer.readInt16LE(i);
      const absoluteSample = Math.abs(sample);
      
      maxAmplitude = Math.max(maxAmplitude, absoluteSample);
      minAmplitude = Math.min(minAmplitude, sample);
      sumSquares += sample * sample;
      sumAbsolute += absoluteSample;
      
      if (absoluteSample < silenceThreshold) {
        silentSamples++;
      }
      
      if (absoluteSample > peakThreshold) {
        peakCount++;
      }
    }
    
    const rmsLevel = Math.sqrt(sumSquares / sampleCount);
    const averageLevel = sumAbsolute / sampleCount;
    const silencePercentage = (silentSamples / sampleCount) * 100;
    
    return {
      maxAmplitude,
      minAmplitude,
      rmsLevel,
      averageLevel,
      silencePercentage,
      peakCount
    };
  }

  /**
   * Process output events from Nova 2 Sonic
   */
  private async processOutputEvents(sessionId: string, outputStream: AsyncIterable<any>): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      for await (const chunk of outputStream) {
        if (!session.isStreaming) break;

        if (chunk.chunk?.bytes) {
          try {
            const eventData = JSON.parse(Buffer.from(chunk.chunk.bytes).toString());
            const event = eventData.event || eventData;
            const eventType = Object.keys(event)[0];

            console.log(`[Nova 2 Sonic] Received event type: ${eventType} for session ${sessionId}`);

            // Handle different event types
            if (event.textOutput) {
              const content = event.textOutput.content;
              console.log(`[Nova 2 Sonic] Text response: ${content}`);
              session.eventCallback?.({ type: 'text_response', text: content });
            }

            if (event.audioOutput) {
              const audioBytes = Buffer.from(event.audioOutput.content, 'base64');
              console.log(`[Nova 2 Sonic] Audio response: ${audioBytes.length} bytes`);
              session.eventCallback?.({ type: 'audio_response', audioData: audioBytes });
            }

            if (event.usageEvent) {
              console.log(`[Nova 2 Sonic] Usage:`, JSON.stringify(event.usageEvent));
            }

          } catch (parseError) {
            console.error(`[Nova 2 Sonic] Error parsing event data:`, parseError);
          }
        }
      }
    } catch (error) {
      console.error(`[Nova 2 Sonic] Error processing output events:`, error);
      session.eventCallback?.({ type: 'error', error: error instanceof Error ? error : new Error('Unknown error') });
    }
  }

  /**
   * Process audio chunk using persistent bidirectional streaming
   */
  async processAudioChunk(
    sessionId: string, 
    audioData: Buffer, 
    isComplete: boolean = false,
    callbacks?: {
      onTranscription?: (text: string) => void;
      onTextResponse?: (text: string) => void;
      onAudioResponse?: (audioData: Buffer) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    console.log(`[Nova 2 Sonic] 🎤 PROCESSING AUDIO CHUNK: ${audioData.length} bytes for session ${sessionId}`);

    try {
      // Start persistent bidirectional stream if not already started
      if (!session.isStreaming) {
        console.log(`[Nova 2 Sonic] 🚀 STARTING BIDIRECTIONAL STREAM`);
        await this.startBidirectionalStream(sessionId, (event) => {
          if (event.type === 'text_response') {
            callbacks?.onTextResponse?.(event.text);
          } else if (event.type === 'audio_response') {
            callbacks?.onAudioResponse?.(event.audioData);
          } else if (event.type === 'error') {
            callbacks?.onError?.(event.error);
          }
        });
      }

      // Add audio to queue for processing by the generator
      session.audioQueue.push(audioData);
      console.log(`[Nova 2 Sonic] 📥 ADDED TO AUDIO QUEUE: ${audioData.length} bytes (queue size: ${session.audioQueue.length})`);

      // Force the generator to process the queue by triggering it
      // The generator should be running in the background and will pick up the audio
      console.log(`[Nova 2 Sonic] ⚡ AUDIO QUEUED FOR PROCESSING`);

    } catch (error) {
      console.error(`[Nova 2 Sonic] ❌ ERROR PROCESSING AUDIO:`, error);
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Process text message using persistent bidirectional streaming
   */
  async processTextMessage(
    sessionId: string, 
    text: string,
    callbacks?: {
      onTextResponse?: (text: string) => void;
      onAudioResponse?: (audioData: Buffer) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    console.log(`[Nova 2 Sonic] Processing text message for session ${sessionId}: "${text}"`);

    try {
      // Start persistent bidirectional stream if not already started
      if (!session.isStreaming) {
        await this.startBidirectionalStream(sessionId, (event) => {
          if (event.type === 'text_response') {
            callbacks?.onTextResponse?.(event.text);
          } else if (event.type === 'audio_response') {
            callbacks?.onAudioResponse?.(event.audioData);
          } else if (event.type === 'error') {
            callbacks?.onError?.(event.error);
          }
        });
      }

      // Add text to queue for processing
      session.textQueue.push(text);

    } catch (error) {
      console.error(`[Nova 2 Sonic] Error processing text message:`, error);
      callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Get default system prompt for Nova 2 Sonic conversations
   */
  private getDefaultSystemPrompt(): string {
    return `You are CatalAIst, an AI assistant that helps classify business processes into transformation categories. 

Your role is to analyze business processes and classify them into one of these 6 categories:
- **Eliminate** - Remove unnecessary processes
- **Simplify** - Streamline and reduce complexity  
- **Digitise** - Convert manual to digital
- **RPA** - Robotic Process Automation
- **AI Agent** - AI-powered assistance
- **Agentic AI** - Autonomous AI decision-making

Ask clarifying questions to better understand the process before making a classification. Be conversational and helpful.`;
  }

  /**
   * Close a Nova 2 Sonic session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn(`[Nova 2 Sonic] Session ${sessionId} not found for closing`);
      return;
    }

    try {
      // Mark session as not streaming
      session.isStreaming = false;
      
      // Remove from active sessions
      this.activeSessions.delete(sessionId);
      
      console.log(`[Nova 2 Sonic] Session ${sessionId} closed`);
      
    } catch (error) {
      console.error(`[Nova 2 Sonic] Error closing session ${sessionId}:`, error);
      // Still remove from active sessions even if closing failed
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Create Bedrock client for Nova 2 Sonic
   */
  private createBedrockClient(config: LLMProviderConfig): BedrockRuntimeClient {
    if (!config.awsAccessKeyId || !config.awsSecretAccessKey) {
      throw new Error('AWS credentials are required for Nova 2 Sonic');
    }

    const clientConfig: any = {
      region: config.awsRegion || 'us-east-1',
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
      },
    };

    if (config.awsSessionToken) {
      clientConfig.credentials.sessionToken = config.awsSessionToken;
    }

    // Handle self-signed certificates
    const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';
    
    if (!rejectUnauthorized) {
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true,
      });

      clientConfig.requestHandler = new NodeHttpHandler({
        httpsAgent,
        connectionTimeout: 30000,
        socketTimeout: 30000,
      });
    }

    return new BedrockRuntimeClient(clientConfig);
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get active session IDs
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Clean up all active sessions
   */
  async cleanup(): Promise<void> {
    const sessionIds = this.getActiveSessionIds();
    
    for (const sessionId of sessionIds) {
      try {
        await this.closeSession(sessionId);
      } catch (error) {
        console.error(`[Nova 2 Sonic] Error cleaning up session ${sessionId}:`, error);
      }
    }
    
    console.log(`[Nova 2 Sonic] Cleaned up ${sessionIds.length} sessions`);
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): {
    config: LLMProviderConfig;
    systemPrompt?: string;
    createdAt: Date;
  } | undefined {
    const session = this.activeSessions.get(sessionId);
    if (!session) return undefined;
    
    return {
      config: session.config,
      systemPrompt: session.systemPrompt,
      createdAt: session.createdAt
    };
  }
}
