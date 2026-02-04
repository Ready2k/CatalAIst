import {
  BedrockRuntimeClient,
  InvokeModelWithBidirectionalStreamCommand,
  InvokeModelWithBidirectionalStreamInput,
} from '@aws-sdk/client-bedrock-runtime';
import { NodeHttp2Handler } from '@smithy/node-http-handler';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { LLMProviderConfig } from './llm-provider.interface';

/**
 * Nova 2 Sonic WebSocket Service
 * 
 * Based on official AWS sample code from:
 * https://github.com/aws-samples/amazon-nova-samples/tree/main/speech-to-speech/amazon-nova-2-sonic
 * 
 * AUDIO FORMAT REQUIREMENTS:
 * - Input: PCM16, mono, 16kHz sample rate, base64 encoded
 * - Output: PCM16, mono, 24kHz sample rate, base64 encoded
 */

// Audio configuration types
type AudioType = 'SPEECH';
type AudioMediaType = 'audio/lpcm';
type TextMediaType = 'text/plain';

// Default configurations matching AWS sample
const DefaultInferenceConfiguration = {
  maxTokens: 1024,
  topP: 0.9,
  temperature: 0.7,
};

const DefaultAudioInputConfiguration = {
  audioType: 'SPEECH' as AudioType,
  encoding: 'base64',
  mediaType: 'audio/lpcm' as AudioMediaType,
  sampleRateHertz: 16000,
  sampleSizeBits: 16,
  channelCount: 1,
};

const DefaultAudioOutputConfiguration = {
  audioType: 'SPEECH' as AudioType,
  encoding: 'base64',
  mediaType: 'audio/lpcm' as AudioMediaType,
  sampleRateHertz: 24000,
  sampleSizeBits: 16,
  channelCount: 1,
  voiceId: 'tiffany',
};

const DefaultTextConfiguration = {
  mediaType: 'text/plain' as TextMediaType
};

const DefaultSystemPrompt = `You are CatalAIst, an AI assistant that helps classify business processes. Be conversational and helpful. Keep responses concise.`;


// Session data interface
interface SessionData {
  queue: any[];
  queueSignal: Subject<void>;
  closeSignal: Subject<void>;
  responseHandlers: Map<string, (data: any) => void>;
  promptName: string;
  audioContentId: string;
  systemPrompt: string;
  inferenceConfig: typeof DefaultInferenceConfiguration;
  isActive: boolean;
  isStreamEstablished: boolean; // Track if AWS stream is running
  isPromptStartSent: boolean;
  isAudioContentStartSent: boolean;
  silenceInterval?: NodeJS.Timeout;
  lastAudioActivity?: number;
  config: LLMProviderConfig;
  bedrockClient: BedrockRuntimeClient;
  modelId: string;
  voiceId?: string;
}

export class NovaSonicWebSocketService {
  private readonly DEFAULT_MODEL_ID = 'amazon.nova-2-sonic-v1:0';
  private readonly SUPPORTED_REGIONS = ['us-east-1', 'us-west-2', 'ap-northeast-1', 'eu-north-1'];

  private activeSessions = new Map<string, SessionData>();
  private sessionLastActivity = new Map<string, number>();
  private sessionCleanupInProgress = new Set<string>();

  /**
   * Initialize a new Nova 2 Sonic session
   */
  async initializeSession(
    config: LLMProviderConfig,
    systemPrompt?: string,
    voiceId?: string
  ): Promise<{ sessionId: string }> {
    const sessionId = uuidv4();

    const region = config.awsRegion || 'us-east-1';
    if (!this.SUPPORTED_REGIONS.includes(region)) {
      throw new Error(
        `Nova 2 Sonic is not available in region '${region}'. ` +
        `Supported regions: ${this.SUPPORTED_REGIONS.join(', ')}.`
      );
    }

    if (!config.awsAccessKeyId || !config.awsSecretAccessKey) {
      throw new Error('AWS credentials are required for Nova 2 Sonic');
    }

    const bedrockClient = this.createBedrockClient(config);

    const modelId = config.modelId || process.env.NOVA_SONIC_MODEL_ID || this.DEFAULT_MODEL_ID;
    console.log(`[Nova 2 Sonic] Initializing session with modelId: '${modelId}'`);

    const session: SessionData = {
      queue: [],
      queueSignal: new Subject<void>(),
      closeSignal: new Subject<void>(),
      responseHandlers: new Map(),
      promptName: uuidv4(),
      audioContentId: uuidv4(),
      systemPrompt: systemPrompt || DefaultSystemPrompt,
      inferenceConfig: { ...DefaultInferenceConfiguration },
      isActive: true,
      isStreamEstablished: false,
      isPromptStartSent: false,
      isAudioContentStartSent: false,
      silenceInterval: undefined,
      lastAudioActivity: Date.now(),
      config,
      bedrockClient,
      modelId,
      voiceId: voiceId || config.voiceId,
    };

    this.activeSessions.set(sessionId, session);
    this.updateSessionActivity(sessionId);

    console.log(`[Nova 2 Sonic] Session ${sessionId} initialized in region ${region}`);
    return { sessionId };
  }

  /**
   * Start bidirectional streaming for a session
   */
  async startBidirectionalStream(
    sessionId: string,
    callbacks: {
      onTextResponse?: (text: string) => void;
      onAudioResponse?: (audioData: Buffer) => void;
      onTranscription?: (text: string) => void;
      onError?: (error: Error) => void;
      onStreamComplete?: () => void;
    }
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.isStreamEstablished) {
      console.log(`[Nova 2 Sonic] Stream already established for session ${sessionId}`);
      return;
    }

    if (callbacks.onTextResponse) {
      session.responseHandlers.set('textOutput', callbacks.onTextResponse);
    }
    if (callbacks.onAudioResponse) {
      session.responseHandlers.set('audioOutput', callbacks.onAudioResponse);
    }
    if (callbacks.onTranscription) {
      session.responseHandlers.set('transcription', callbacks.onTranscription);
    }
    if (callbacks.onError) {
      session.responseHandlers.set('error', callbacks.onError);
    }
    if (callbacks.onStreamComplete) {
      session.responseHandlers.set('streamComplete', callbacks.onStreamComplete);
    }

    try {
      const asyncIterable = this.createSessionAsyncIterable(sessionId);
      console.log(`[Nova 2 Sonic] Starting bidirectional stream for session ${sessionId}...`);

      const response = await session.bedrockClient.send(
        new InvokeModelWithBidirectionalStreamCommand({
          modelId: session.modelId,
          body: asyncIterable,
        })
      );

      console.log(`[Nova 2 Sonic] Stream established for session ${sessionId}`);
      session.isStreamEstablished = true;

      // key: Start silence generation immediately to keep session open
      this.startSilenceGeneration(sessionId);

      await this.processResponseStream(sessionId, response);

    } catch (error: any) {
      console.error(`[Nova 2 Sonic] Error in session ${sessionId}:`, error);
      console.error(`[Nova 2 Sonic] Error details: Name: ${error.name}, Message: ${error.message}`);
      try {
        console.error(`[Nova 2 Sonic] Error JSON: ${JSON.stringify(error, null, 2)}`);
      } catch (e) {
        console.error(`[Nova 2 Sonic] Error could not be stringified`);
      }

      this.dispatchEvent(sessionId, 'error', error);
      if (session.isActive) {
        await this.closeSession(sessionId);
      }
    }
  }


  /**
   * Setup initial session events
   */
  setupInitialEvents(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    console.log(`[Nova 2 Sonic] Setting up initial events for session ${sessionId}`);

    // 1. Session Start (Only if stream is not yet established OR we are just starting and haven't sent it)
    // Actually, we must ensure it's the very first event.
    // If stream is established (meaning we are mid-conversation), we DEFINITELY skip this.
    // If stream is NOT established, we add it.
    if (!session.isStreamEstablished) {
      this.addEventToQueue(sessionId, {
        sessionStart: {
          inferenceConfiguration: session.inferenceConfig,
          turnDetectionConfiguration: {
            endpointingSensitivity: "MEDIUM" // Adjust based on needs, MEDIUM is a good balance
          }
        },
      });
    }

    // 2. Prompt Start (Only if not sent for this turn)
    if (!session.isPromptStartSent) {
      this.addEventToQueue(sessionId, {
        promptStart: {
          promptName: session.promptName,
          textOutputConfiguration: DefaultTextConfiguration,
          audioOutputConfiguration: {
            ...DefaultAudioOutputConfiguration,
            ...(session.voiceId ? { voiceId: session.voiceId } : {})
          },
        },
      });
      session.isPromptStartSent = true;

      // 3. System Prompt (Only if new prompt/turn?)
      // Usually system prompt is attached to the first turn or prompts. 
      // We will send it for every new prompt start just to be safe/consistent with previous logic, 
      // unless it's strictly once per session. AWS samples often send it per prompt.
      const systemContentId = uuidv4();

      this.addEventToQueue(sessionId, {
        contentStart: {
          promptName: session.promptName,
          contentName: systemContentId,
          type: 'TEXT',
          interactive: false,
          role: 'SYSTEM',
          textInputConfiguration: DefaultTextConfiguration,
        },
      });

      this.addEventToQueue(sessionId, {
        textInput: {
          promptName: session.promptName,
          contentName: systemContentId,
          content: session.systemPrompt,
        },
      });

      this.addEventToQueue(sessionId, {
        contentEnd: {
          promptName: session.promptName,
          contentName: systemContentId,
        },
      });
    }

    console.log(`[Nova 2 Sonic] Initial events queued for session ${sessionId}`);
  }

  /**
   * Start audio content block
   */
  startAudioContent(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.isAudioContentStartSent) return;

    console.log(`[Nova 2 Sonic] Starting audio content for session ${sessionId}`);

    this.addEventToQueue(sessionId, {
      contentStart: {
        promptName: session.promptName,
        contentName: session.audioContentId,
        type: 'AUDIO',
        interactive: true,
        role: 'USER',
        audioInputConfiguration: DefaultAudioInputConfiguration,
      },
    });

    session.isAudioContentStartSent = true;
  }

  /**
   * Stream audio chunk
   */
  streamAudioChunk(sessionId: string, audioData: Buffer): void {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) {
      console.warn(`[Nova 2 Sonic] Cannot stream audio: session ${sessionId} not active`);
      return;
    }

    // Ignore empty audio buffers
    if (audioData.length === 0) {
      return;
    }

    if (!session.isAudioContentStartSent) {
      this.startAudioContent(sessionId);
    }

    session.lastAudioActivity = Date.now();

    const base64Audio = audioData.toString('base64');

    this.addEventToQueue(sessionId, {
      audioInput: {
        promptName: session.promptName,
        contentName: session.audioContentId,
        content: base64Audio,
      },
    });

    this.updateSessionActivity(sessionId);
  }

  /**
   * End audio content block
   */
  async endAudioContent(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isAudioContentStartSent) return;

    console.log(`[Nova 2 Sonic] Ending audio content for session ${sessionId}`);

    this.addEventToQueue(sessionId, {
      contentEnd: {
        promptName: session.promptName,
        contentName: session.audioContentId,
      },
    });

    // Send promptEnd to trigger generation after audio
    this.addEventToQueue(sessionId, {
      promptEnd: {
        promptName: session.promptName,
      },
    });
    session.promptName = require('uuid').v4();
    session.isPromptStartSent = false;

    session.audioContentId = uuidv4();
    session.isAudioContentStartSent = false;
  }

  /**
   * Send text message
   */
  async sendTextMessage(sessionId: string, text: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new Error(`Session ${sessionId} not active`);
    }

    console.log(`[Nova 2 Sonic] Sending text for session ${sessionId}: "${text.substring(0, 50)}..."`);

    const textContentId = uuidv4();

    // Ensure audio content matches (should be running)
    if (!session.isAudioContentStartSent) {
      this.startAudioContent(sessionId);
    }

    this.addEventToQueue(sessionId, {
      contentStart: {
        promptName: session.promptName,
        contentName: textContentId,
        type: 'TEXT',
        interactive: true,
        role: 'USER',
        textInputConfiguration: DefaultTextConfiguration,
      },
    });

    this.addEventToQueue(sessionId, {
      textInput: {
        promptName: session.promptName,
        contentName: textContentId,
        content: text,
      },
    });

    this.addEventToQueue(sessionId, {
      contentEnd: {
        promptName: session.promptName,
        contentName: textContentId,
      },
    });
    console.log(`[Nova 2 Sonic] DEBUG: Added text events for session ${sessionId}`);

    // NO promptEnd for text-only turns in continuous mode
    // The continuous audio stream keeps the session alive.
    // If we wanted to force a turn end, we might need promptEnd, 
    // but the official sample relies on the model responding to the textInput event.

    // session.promptName = uuidv4(); // Do not reset prompt name in continuous mode
    this.updateSessionActivity(sessionId);
  }


  /**
   * Process audio chunk with callbacks (convenience method)
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

    if (callbacks) {
      if (callbacks.onTextResponse) {
        session.responseHandlers.set('textOutput', callbacks.onTextResponse);
      }
      if (callbacks.onAudioResponse) {
        session.responseHandlers.set('audioOutput', callbacks.onAudioResponse);
      }
      if (callbacks.onTranscription) {
        session.responseHandlers.set('transcription', callbacks.onTranscription);
      }
      if (callbacks.onError) {
        session.responseHandlers.set('error', callbacks.onError);
      }
    }

    // Initialize/Start Stream if needed
    if (!session.isStreamEstablished) {
      this.setupInitialEvents(sessionId);
      this.startBidirectionalStream(sessionId, callbacks || {}).catch(err => {
        console.error(`[Nova 2 Sonic] Stream error:`, err);
        callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)));
      });
      await new Promise(resolve => setTimeout(resolve, 200));
    } else if (!session.isPromptStartSent) {
      // Stream is established, but we need a new prompt start
      this.setupInitialEvents(sessionId);
    }

    // Convert audio to PCM if it looks like a media file (WebM/Ogg) or if it's the first chunk of a file upload
    // Simple heuristic: WebM/Ogg start with specific bytes, but for now we assume all file uploads (isComplete=true on first chunk) need conversion
    let pcmData = audioData;

    // Check for EBML header (WebM/MKV starts with 0x1A 0x45 0xDF 0xA3) or Ogg (0x4F 0x67 0x67 0x53)
    // Or just convert if it's a "complete" single chunk which usually implies a file
    const isMediaFile = audioData.length > 0 && (
      (audioData[0] === 0x1A && audioData[1] === 0x45 && audioData[2] === 0xDF && audioData[3] === 0xA3) ||
      (audioData[0] === 0x4F && audioData[1] === 0x67 && audioData[2] === 0x67 && audioData[3] === 0x53)
    );

    if (isMediaFile) {
      console.log(`[Nova 2 Sonic] Detected media file header. Converting to PCM 16kHz...`);
      try {
        pcmData = await this.convertAudioToPcm(audioData);
        console.log(`[Nova 2 Sonic] Converted ${audioData.length} bytes to ${pcmData.length} bytes PCM`);
      } catch (err) {
        console.error(`[Nova 2 Sonic] conversion error:`, err);
        throw new Error('Failed to convert audio format. Please ensure ffmpeg is installed.');
      }
    }

    this.streamAudioChunk(sessionId, pcmData);

    if (isComplete) {
      await this.endAudioContent(sessionId);
    }
  }

  /**
   * Convert audio buffer to PCM 16kHz mono using ffmpeg
   */
  private async convertAudioToPcm(audioBuffer: Buffer): Promise<Buffer> {
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      // ffmpeg -i pipe:0 -f s16le -ac 1 -ar 16000 pipe:1
      const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',       // Read from stdin
        '-f', 's16le',        // Output format: signed 16-bit little-endian PCM
        '-ac', '1',           // Audio channels: 1 (mono)
        '-ar', '16000',       // Audio rate: 16000 Hz
        'pipe:1'              // Write to stdout
      ]);

      const chunks: Buffer[] = [];
      let errorData = '';
      let hasError = false;

      const handleError = (err: Error) => {
        if (hasError) return;
        hasError = true;
        console.error('[Nova 2 Sonic] FFmpeg error:', err);
        reject(err);
      };

      ffmpeg.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      ffmpeg.stderr.on('data', (data: Buffer) => {
        errorData += data.toString();
      });

      ffmpeg.on('error', (err: Error) => {
        if (err.message.includes('ENOENT')) {
          handleError(new Error('FFmpeg not found. Please install ffmpeg to use voice features.'));
        } else {
          handleError(err);
        }
      });

      if (ffmpeg.stdin) {
        ffmpeg.stdin.on('error', (err: Error) => {
          // EPIPE is expected if ffmpeg fails to spawn but we try to write
          if ((err as any).code !== 'EPIPE') {
            handleError(err);
          }
        });
      }

      ffmpeg.on('close', (code: number) => {
        if (hasError) return;

        if (code !== 0) {
          console.error('[Nova 2 Sonic] FFmpeg error log:', errorData);
          handleError(new Error(`FFmpeg exited with code ${code}`));
        } else {
          resolve(Buffer.concat(chunks));
        }
      });

      // Write audio data to stdin
      try {
        if (ffmpeg.stdin && !hasError) {
          ffmpeg.stdin.write(audioBuffer);
          ffmpeg.stdin.end();
        }
      } catch (err) {
        handleError(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  /**
   * Process text message with callbacks (convenience method)
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

    if (callbacks) {
      if (callbacks.onTextResponse) {
        session.responseHandlers.set('textOutput', callbacks.onTextResponse);
      }
      if (callbacks.onAudioResponse) {
        session.responseHandlers.set('audioOutput', callbacks.onAudioResponse);
      }
      if (callbacks.onError) {
        session.responseHandlers.set('error', callbacks.onError);
      }
    }

    // Initialize/Start Stream if needed
    if (!session.isStreamEstablished) {
      this.setupInitialEvents(sessionId);
      this.startBidirectionalStream(sessionId, callbacks || {}).catch(err => {
        console.error(`[Nova 2 Sonic] Stream error:`, err);
        callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)));
      });
      await new Promise(resolve => setTimeout(resolve, 200));
    } else if (!session.isPromptStartSent) {
      // Stream is established, but we need a new prompt start
      this.setupInitialEvents(sessionId);
    }

    await this.sendTextMessage(sessionId, text);
  }

  /**
   * Close session gracefully
   */
  async closeSession(sessionId: string): Promise<void> {
    if (this.sessionCleanupInProgress.has(sessionId)) {
      return;
    }

    this.sessionCleanupInProgress.add(sessionId);

    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) return;

      console.log(`[Nova 2 Sonic] Closing session ${sessionId}`);

      this.stopSilenceGeneration(sessionId);

      // If stream is established, attempt graceful close
      if (session.isStreamEstablished) {
        if (session.isAudioContentStartSent) {
          await this.endAudioContent(sessionId);
        }

        this.addEventToQueue(sessionId, {
          sessionEnd: {},
        });

        // Give time for events to flush to the stream
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      session.isActive = false;
      session.isStreamEstablished = false;
      session.closeSignal.next();
      session.closeSignal.complete();

      this.activeSessions.delete(sessionId);
      this.sessionLastActivity.delete(sessionId);

      session.responseHandlers.clear();

      console.log(`[Nova 2 Sonic] Session ${sessionId} closed`);

    } catch (error) {
      console.error(`[Nova 2 Sonic] Error closing session ${sessionId}:`, error);
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.isActive = false;
        this.activeSessions.delete(sessionId);
        this.sessionLastActivity.delete(sessionId);
      }
    } finally {
      this.sessionCleanupInProgress.delete(sessionId);
    }
  }

  /**
   * Start generating continuous silence to keep session open
   */
  startSilenceGeneration(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    if (session.silenceInterval) {
      clearInterval(session.silenceInterval);
    }

    console.log(`[Nova 2 Sonic] Starting silence generation for session ${sessionId}`);

    // Ensure audio content is started
    if (!session.isAudioContentStartSent) {
      this.startAudioContent(sessionId);
    }

    // 20ms chunk at 16kHz
    // 16000 samples/sec * 0.02 sec = 320 samples
    // 16-bit = 2 bytes/sample => 640 bytes
    const CHUNK_SIZE = 640;
    const SILENCE_CHUNK = Buffer.alloc(CHUNK_SIZE, 0); // Perfect silence

    session.silenceInterval = setInterval(() => {
      const now = Date.now();
      // Only send silence if there has been NO audio activity for at least 2 seconds.
      // Bedrock Nova Sonic needs input to keep the session alive, but sending zeros
      // during active speech (even in 20ms gaps) can break transcription.
      if (session.lastAudioActivity && (now - session.lastAudioActivity) < 2000) {
        return;
      }

      if (session.isActive && session.isStreamEstablished) {
        const base64Audio = SILENCE_CHUNK.toString('base64');
        this.addEventToQueue(sessionId, {
          audioInput: {
            promptName: session.promptName,
            contentName: session.audioContentId, // Reuse continuous content ID
            content: base64Audio,
          },
        });
      }
    }, 500); // 500ms interval (plenty to keep AWS alive)
  }

  /**
   * Stop silence generation
   */
  stopSilenceGeneration(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    if (session.silenceInterval) {
      clearInterval(session.silenceInterval);
      session.silenceInterval = undefined;
      console.log(`[Nova 2 Sonic] Stopped silence generation for session ${sessionId}`);
    }
  }


  /**
   * Create async iterable for bidirectional stream (AWS sample pattern)
   */
  private createSessionAsyncIterable(
    sessionId: string
  ): AsyncIterable<InvokeModelWithBidirectionalStreamInput> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        [Symbol.asyncIterator]: () => ({
          next: async () => ({ value: undefined, done: true }),
        }),
      };
    }

    return {
      [Symbol.asyncIterator]: () => {
        console.log(`[Nova 2 Sonic] AsyncIterator created for session ${sessionId}`);

        return {
          next: async (): Promise<IteratorResult<InvokeModelWithBidirectionalStreamInput>> => {
            try {
              if (!session.isActive || !this.activeSessions.has(sessionId)) {
                console.log(`[Nova 2 Sonic] Iterator closing for session ${sessionId}`);
                return { value: undefined, done: true };
              }

              if (session.queue.length === 0) {
                try {
                  await Promise.race([
                    firstValueFrom(session.queueSignal.pipe(take(1))),
                    firstValueFrom(session.closeSignal.pipe(take(1))).then(() => {
                      throw new Error('Stream closed');
                    }),
                  ]);
                } catch (error) {
                  if (error instanceof Error && error.message === 'Stream closed') {
                    return { value: undefined, done: true };
                  }
                  if (!session.isActive) {
                    return { value: undefined, done: true };
                  }
                }
              }

              if (session.queue.length === 0 || !session.isActive) {
                return { value: undefined, done: true };
              }

              const nextEvent = session.queue.shift();

              // Wrap event in 'event' property as expected by Nova Sonic InputChunk
              const payload = { event: nextEvent };
              const jsonString = JSON.stringify(payload);

              // Debug logging for specific events (excluding raw audio chunks and silence)
              const eventKeys = Object.keys(nextEvent);
              if (eventKeys.includes('audioInput')) {
                // Only log real audio content (roughly), or skip logging for audioInput altogether
                // unless it is an error or something special.
                // We will silence all audioInput logs to prevent log flooding.
                // console.log(`[Nova 2 Sonic] Sending ---> audioInput chunk (${nextEvent.audioInput.content.length} chars)`);
              } else {
                console.log(`[Nova 2 Sonic] Sending ---> ${jsonString}`);
              }

              return {
                value: {
                  chunk: {
                    bytes: new TextEncoder().encode(jsonString),
                  },
                },
                done: false,
              };

            } catch (error) {
              console.error(`[Nova 2 Sonic] Iterator error for session ${sessionId}:`, error);
              session.isActive = false;
              return { value: undefined, done: true };
            }
          },

          return: async (): Promise<IteratorResult<InvokeModelWithBidirectionalStreamInput>> => {
            session.isActive = false;
            return { value: undefined, done: true };
          },

          throw: async (error: any): Promise<IteratorResult<InvokeModelWithBidirectionalStreamInput>> => {
            session.isActive = false;
            throw error;
          },
        };
      },
    };
  }

  /**
   * Process response stream from Nova 2 Sonic
   */
  private async processResponseStream(sessionId: string, response: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      for await (const event of response.body) {
        if (!session.isActive) {
          console.log(`[Nova 2 Sonic] Session ${sessionId} inactive, stopping`);
          break;
        }

        if (event.chunk?.bytes) {
          try {
            this.updateSessionActivity(sessionId);
            const textResponse = new TextDecoder().decode(event.chunk.bytes);

            try {
              const jsonResponse = JSON.parse(textResponse);

              if (jsonResponse.event?.contentStart) {
                this.dispatchEvent(sessionId, 'contentStart', jsonResponse.event.contentStart);
              } else if (jsonResponse.event?.textOutput) {
                const text = jsonResponse.event.textOutput.content || jsonResponse.event.textOutput;
                console.log(`[Nova 2 Sonic] Text output: "${String(text).substring(0, 100)}..."`);
                this.dispatchEvent(sessionId, 'textOutput', text);
              } else if (jsonResponse.event?.audioOutput) {
                const audioBase64 = jsonResponse.event.audioOutput.content || jsonResponse.event.audioOutput;
                const audioBuffer = Buffer.from(audioBase64, 'base64');
                console.log(`[Nova 2 Sonic] Audio output: ${audioBuffer.length} bytes`);
                this.dispatchEvent(sessionId, 'audioOutput', audioBuffer);
              } else if (jsonResponse.event?.contentEnd) {
                this.dispatchEvent(sessionId, 'contentEnd', jsonResponse.event.contentEnd);
              } else if (jsonResponse.event?.transcript) {
                // Dispatch transcript events
                const transcript = jsonResponse.event.transcript.content || jsonResponse.event.transcript;
                console.log(`[Nova 2 Sonic] [${new Date().toISOString().split('T')[1]}] Transcript segment: "${transcript}" (length: ${transcript.length})`);
                this.dispatchEvent(sessionId, 'transcription', transcript);
              } else {
                const eventKeys = Object.keys(jsonResponse.event || {});
                if (eventKeys.length > 0) {
                  // Catch-all logging for debug
                  console.log(`[Nova 2 Sonic] Event Received: ${eventKeys[0]}`);
                  if (eventKeys[0] !== 'usageEvent') {
                    console.log(`[Nova 2 Sonic] UNKNOWN EVENT PAYLOAD:`, JSON.stringify(jsonResponse.event[eventKeys[0]]));
                  }
                }
              }

            } catch (parseError) {
              console.log(`[Nova 2 Sonic] JSON Parse Error. Raw text: ${textResponse.substring(0, 200)}`);
            }

          } catch (decodeError) {
            console.error(`[Nova 2 Sonic] Decode error:`, decodeError);
          }
        } else if (event.modelStreamErrorException) {
          console.error(`[Nova 2 Sonic] Model error:`, event.modelStreamErrorException);
          this.dispatchEvent(sessionId, 'error', new Error(event.modelStreamErrorException.message || 'Model error'));
        } else if (event.internalServerException) {
          console.error(`[Nova 2 Sonic] Server error:`, event.internalServerException);
          this.dispatchEvent(sessionId, 'error', new Error(event.internalServerException.message || 'Server error'));
        }
      }

      console.log(`[Nova 2 Sonic] Stream complete for session ${sessionId}`);
      this.dispatchEvent(sessionId, 'streamComplete', { timestamp: new Date().toISOString() });

    } catch (error) {
      console.error(`[Nova 2 Sonic] Response stream error:`, error);
      this.dispatchEvent(sessionId, 'error', error instanceof Error ? error : new Error(String(error)));
    }
  }


  /**
   * Add event to session queue
   */
  private addEventToQueue(sessionId: string, event: any): void {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) return;

    this.updateSessionActivity(sessionId);
    session.queue.push(event);
    session.queueSignal.next();
  }

  /**
   * Dispatch event to handlers
   */
  private dispatchEvent(sessionId: string, eventType: string, data: any): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const handler = session.responseHandlers.get(eventType);
    if (handler) {
      try {
        handler(data);
      } catch (e) {
        console.error(`[Nova 2 Sonic] Handler error for ${eventType}:`, e);
      }
    }
  }

  /**
   * Create Bedrock client with HTTP/2
   */
  private createBedrockClient(config: LLMProviderConfig): BedrockRuntimeClient {
    const nodeHttp2Handler = new NodeHttp2Handler({
      requestTimeout: 300000,
      sessionTimeout: 300000,
      disableConcurrentStreams: false,
      maxConcurrentStreams: 20,
    });

    const clientConfig: any = {
      region: config.awsRegion || 'us-east-1',
      credentials: {
        accessKeyId: config.awsAccessKeyId!,
        secretAccessKey: config.awsSecretAccessKey!,
      },
      requestHandler: nodeHttp2Handler,
    };

    if (config.awsSessionToken) {
      clientConfig.credentials.sessionToken = config.awsSessionToken;
    }

    return new BedrockRuntimeClient(clientConfig);
  }

  private updateSessionActivity(sessionId: string): void {
    this.sessionLastActivity.set(sessionId, Date.now());
  }

  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  getActiveSessionIds(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  isSessionActive(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    return !!session && session.isActive;
  }

  getSessionInfo(sessionId: string): {
    config: LLMProviderConfig;
    systemPrompt: string;
    isActive: boolean;
  } | undefined {
    const session = this.activeSessions.get(sessionId);
    if (!session) return undefined;

    return {
      config: session.config,
      systemPrompt: session.systemPrompt,
      isActive: session.isActive,
    };
  }

  async cleanup(): Promise<void> {
    const sessionIds = this.getActiveSessionIds();

    for (const sessionId of sessionIds) {
      try {
        await this.closeSession(sessionId);
      } catch (error) {
        console.error(`[Nova 2 Sonic] Cleanup error for ${sessionId}:`, error);
      }
    }

    console.log(`[Nova 2 Sonic] Cleaned up ${sessionIds.length} sessions`);
  }
}
