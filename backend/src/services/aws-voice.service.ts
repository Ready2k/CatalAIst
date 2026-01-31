import {
    BedrockRuntimeClient,
    InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import https from 'https';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { LLMProviderConfig } from './llm-provider.interface';

/**
 * AWS Voice Service - Nova 2 Sonic Bidirectional Streaming
 * 
 * This service provides real-time conversational AI using Amazon Nova 2 Sonic's
 * bidirectional streaming capabilities for speech-to-speech interaction.
 * 
 * Features:
 * - Real-time speech input and output
 * - No S3 storage required (privacy-first)
 * - Natural conversation flow with turn-taking
 * - Multilingual support with automatic detection
 */
export class AWSVoiceService {
    private readonly TIMEOUT_MS = 30000; // 30 seconds
    private readonly MAX_RETRIES = 3;
    private readonly INITIAL_RETRY_DELAY_MS = 1000; // 1 second
    private readonly NOVA_SONIC_MODEL_ID = 'amazon.nova-2-sonic-v1:0';
    private readonly NOVA_SONIC_V1_MODEL_ID = 'amazon.nova-sonic-v1:0'; // Fallback option

    /**
     * Start a conversational session with Nova 2 Sonic
     * This replaces the traditional transcribe method with real-time streaming
     */
    async startConversation(
        config: LLMProviderConfig,
        systemPrompt?: string
    ): Promise<{
        sessionId: string;
        streamingEndpoint: string;
    }> {
        const sessionId = uuidv4();

        // For now, return session info - we'll implement WebSocket streaming next
        return {
            sessionId,
            streamingEndpoint: `/api/voice/stream/${sessionId}`
        };
    }

    /**
     * Process audio input through Nova 2 Sonic using Converse API
     * This provides speech-to-speech functionality
     */
    async processAudioStream(
        audioStream: Readable,
        config: LLMProviderConfig,
        systemPrompt?: string
    ): Promise<{ transcription: string; response: string; audioResponse?: Buffer }> {
        return this.withRetry(async () => {
            const bedrockClient = this.createBedrockClient(config);

            // Convert audio stream to base64 for Nova 2 Sonic
            const audioBuffer = await this.streamToBuffer(audioStream);
            const audioBase64 = audioBuffer.toString('base64');

            console.log('[Nova 2 Sonic] Processing speech-to-speech conversation...');

            try {
                // Try using Converse API first (may not work with audio input)
                const command = new InvokeModelWithResponseStreamCommand({
                    modelId: this.NOVA_SONIC_MODEL_ID,
                    contentType: 'application/json',
                    accept: 'application/json',
                    body: JSON.stringify({
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'audio',
                                        source: {
                                            type: 'base64',
                                            media_type: 'audio/wav',
                                            data: audioBase64
                                        }
                                    }
                                ]
                            }
                        ],
                        system: [
                            {
                                text: systemPrompt || this.getDefaultSystemPrompt()
                            }
                        ],
                        inferenceConfig: {
                            maxTokens: 1024,
                            temperature: 0.7,
                            topP: 0.9
                        },
                        additionalModelRequestFields: {
                            audio: {
                                format: 'mp3'
                            }
                        }
                    })
                });

                const response = await bedrockClient.send(command);

                if (!response.body) {
                    throw new Error('No response body from Nova 2 Sonic');
                }

                // Process the streaming response
                let transcription = '';
                let textResponse = '';
                let audioData: Buffer | undefined;

                for await (const chunk of response.body) {
                    if (chunk.chunk?.bytes) {
                        const chunkData = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes));

                        // Extract transcription if available
                        if (chunkData.inputTranscript) {
                            transcription = chunkData.inputTranscript;
                        }

                        // Extract text response
                        if (chunkData.message?.content) {
                            for (const content of chunkData.message.content) {
                                if (content.text) {
                                    textResponse += content.text;
                                }
                                // Extract audio data if available
                                if (content.audio?.data) {
                                    audioData = Buffer.from(content.audio.data, 'base64');
                                }
                            }
                        }
                    }
                }

                return {
                    transcription: transcription || 'Speech processed by Nova 2 Sonic',
                    response: textResponse || 'Response generated by Nova 2 Sonic',
                    audioResponse: audioData
                };

            } catch (error) {
                console.error('[Nova 2 Sonic] Error processing audio:', error);

                // Provide helpful error messages for common Nova 2 Sonic issues
                if (error instanceof Error) {
                    if (error.message.includes('ValidationException') && error.message.includes('model ID is not supported')) {
                        const region = config.awsRegion || 'us-east-1';
                        const supportedRegions = ['us-east-1', 'us-west-2', 'ap-northeast-1', 'eu-north-1'];
                        return {
                            transcription: 'Region not supported',
                            response: `Nova 2 Sonic is not available in region '${region}'. Supported regions: ${supportedRegions.join(', ')}. Please change your AWS region in the configuration.`,
                            audioResponse: undefined
                        };
                    }

                    if (error.message.includes('AccessDeniedException')) {
                        return {
                            transcription: 'Access denied',
                            response: 'Access denied to Nova 2 Sonic. Please ensure you have the required IAM permissions and that Nova 2 Sonic access has been granted to your AWS account.',
                            audioResponse: undefined
                        };
                    }
                }

                // For now, return a helpful message indicating the limitation
                return {
                    transcription: 'Audio input received',
                    response: 'Nova 2 Sonic requires bidirectional streaming API for full speech-to-speech functionality. This feature is currently being implemented.',
                    audioResponse: undefined
                };
            }
        });
    }

    /**
     * Synthesize speech using Nova 2 Sonic (fallback for text-only requests)
     */
    /**
     * Synthesize speech using Nova 2 Sonic
     * For TTS: Send text first, then silence frame to trigger turn-end
     */
    async synthesize(
        text: string,
        voice: string,
        config: LLMProviderConfig,
        customPrompt?: string
    ): Promise<Buffer> {
        console.log('[Nova 2 Sonic TTS] Starting synthesis...');
        console.log(`[Nova 2 Sonic TTS] Text: "${text}"`);
        console.log(`[Nova 2 Sonic TTS] Voice: ${voice}`);
        
        const { InvokeModelWithBidirectionalStreamCommand } = await import('@aws-sdk/client-bedrock-runtime');
        const bedrockClient = this.createBedrockClient(config);

        try {
            const promptName = `tts-prompt-${Date.now()}`;
            const textContentName = `text-${Date.now()}`;
            const audioContentName = `audio-${Date.now()}`;
            const systemContentName = `system-${Date.now()}`;
            
            // Map voice to valid Nova voice ID
            const effectiveVoiceId = voice === 'nova-sonic' || voice === 'sonic' ? 'matthew' : voice.toLowerCase();
            console.log(`[Nova 2 Sonic TTS] Using voice ID: ${effectiveVoiceId}`);

            // Signal to keep generator alive until we receive response
            let canFinish = false;
            const finishSignal = () => { canFinish = true; };

            // Create input stream generator
            async function* inputStream(): AsyncGenerator<any> {
                // 1. Session Start with HIGH sensitivity for TTS
                console.log('[Nova 2 Sonic TTS] → Event 1: sessionStart');
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                sessionStart: {
                                    inferenceConfiguration: {
                                        maxTokens: 2048,
                                        topP: 0.9,
                                        temperature: 0.7
                                    },
                                    turnDetectionConfiguration: {
                                        endpointingSensitivity: "HIGH"  // CRITICAL for TTS
                                    }
                                }
                            }
                        }))
                    }
                };

                // 2. Prompt Start with audio output config
                console.log('[Nova 2 Sonic TTS] → Event 2: promptStart');
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                promptStart: {
                                    promptName,
                                    textOutputConfiguration: {
                                        mediaType: "text/plain"
                                    },
                                    audioOutputConfiguration: {
                                        mediaType: "audio/lpcm",
                                        sampleRateHertz: 24000,  // 24kHz for better quality
                                        sampleSizeBits: 16,
                                        channelCount: 1,
                                        voiceId: effectiveVoiceId,  // CRITICAL - must be set!
                                        encoding: "base64",
                                        audioType: "SPEECH"
                                    }
                                }
                            }
                        }))
                    }
                };

                // 3-5. System message - INSTRUCTIONS ONLY
                console.log('[Nova 2 Sonic TTS] → Event 3: system contentStart');
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                contentStart: {
                                    promptName,
                                    contentName: systemContentName,
                                    type: "TEXT",
                                    interactive: false,
                                    role: "SYSTEM",
                                    textInputConfiguration: {
                                        mediaType: "text/plain"
                                    }
                                }
                            }
                        }))
                    }
                };

                // Use custom prompt if provided, otherwise use default
                const defaultPrompt = `You are a text-to-speech system. Your only job is to speak the user's text EXACTLY as written, word-for-word, without adding any commentary, questions, or additional words.`;
                const systemPrompt = customPrompt || defaultPrompt;
                
                console.log('[Nova 2 Sonic TTS] → Event 4: system textInput (instructions)');
                console.log(`[Nova 2 Sonic TTS]   Using prompt: ${customPrompt ? 'CUSTOM' : 'DEFAULT'}`);
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                textInput: {
                                    promptName,
                                    contentName: systemContentName,
                                    content: systemPrompt
                                }
                            }
                        }))
                    }
                };

                console.log('[Nova 2 Sonic TTS] → Event 5: system contentEnd');
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                contentEnd: {
                                    promptName,
                                    contentName: systemContentName
                                }
                            }
                        }))
                    }
                };

                // 6-8. USER text message - THE TEXT TO SPEAK
                console.log('[Nova 2 Sonic TTS] → Event 6: user text contentStart');
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                contentStart: {
                                    promptName,
                                    contentName: textContentName,
                                    type: "TEXT",
                                    interactive: true,
                                    role: "USER",
                                    textInputConfiguration: {
                                        mediaType: "text/plain"
                                    }
                                }
                            }
                        }))
                    }
                };

                console.log('[Nova 2 Sonic TTS] → Event 7: user textInput (the text to speak)');
                console.log(`[Nova 2 Sonic TTS]   Text: "${text}"`);
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                textInput: {
                                    promptName,
                                    contentName: textContentName,
                                    content: text
                                }
                            }
                        }))
                    }
                };

                console.log('[Nova 2 Sonic TTS] → Event 8: user text contentEnd');
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                contentEnd: {
                                    promptName,
                                    contentName: textContentName
                                }
                            }
                        }))
                    }
                };

                // 9-11. Silence "poke" to trigger turn-end
                // Use 16kHz for INPUT (matching working implementation)
                console.log('[Nova 2 Sonic TTS] → Event 9: audio contentStart (silence poke)');
                console.log('[Nova 2 Sonic TTS] → Event 9: audio contentStart (silence poke)');
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                contentStart: {
                                    promptName,
                                    contentName: audioContentName,
                                    type: "AUDIO",
                                    interactive: true,
                                    role: "USER",
                                    audioInputConfiguration: {
                                        mediaType: "audio/lpcm",
                                        sampleRateHertz: 16000,  // 16kHz for INPUT (working implementation uses this)
                                        sampleSizeBits: 16,
                                        channelCount: 1,
                                        audioType: "SPEECH",
                                        encoding: "base64"
                                    }
                                }
                            }
                        }))
                    }
                };

                // 100ms silence at 16kHz = 16000 samples/sec * 0.1 sec * 2 bytes/sample = 3200 bytes
                const SILENCE_DURATION_MS = 100;
                const SAMPLE_RATE = 16000;  // 16kHz for input
                const BYTES_PER_SAMPLE = 2; // 16-bit
                const SILENCE_BYTES = (SAMPLE_RATE * SILENCE_DURATION_MS / 1000) * BYTES_PER_SAMPLE;
                const silenceFrame = Buffer.alloc(SILENCE_BYTES, 0);
                
                console.log(`[Nova 2 Sonic TTS] → Event 10: audioInput (${SILENCE_BYTES} bytes silence)`);
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                audioInput: {
                                    promptName,
                                    contentName: audioContentName,
                                    content: silenceFrame.toString('base64')
                                }
                            }
                        }))
                    }
                };

                console.log('[Nova 2 Sonic TTS] → Event 11: audio contentEnd');
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                contentEnd: {
                                    promptName,
                                    contentName: audioContentName
                                }
                            }
                        }))
                    }
                };

                // Keep generator alive - wait for signal before closing
                console.log('[Nova 2 Sonic TTS] ✓ All 11 events sent, keeping stream alive...');
                while (!canFinish) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                // 12. Prompt End - send after we've received the response
                console.log('[Nova 2 Sonic TTS] → Event 12: promptEnd (closing gracefully)');
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                promptEnd: {
                                    promptName
                                }
                            }
                        }))
                    }
                };

                // 13. Session End
                console.log('[Nova 2 Sonic TTS] → Event 13: sessionEnd');
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                sessionEnd: {}
                            }
                        }))
                    }
                };
                
                console.log('[Nova 2 Sonic TTS] ✓ Stream closed gracefully');
            }

            const command = new InvokeModelWithBidirectionalStreamCommand({
                modelId: this.NOVA_SONIC_MODEL_ID,
                body: inputStream()
            });

            console.log('[Nova 2 Sonic TTS] Invoking model...');
            const response = await bedrockClient.send(command);

            if (!response.body) {
                throw new Error('No response body from Nova 2 Sonic');
            }

            const audioChunks: Buffer[] = [];
            const textChunks: string[] = [];
            let eventCount = 0;
            let audioEventCount = 0;
            let textEventCount = 0;
            let seenAudioOutput = false;
            let currentStage = 'UNKNOWN';
            let firstAudioContentBlock = true; // Track if this is the first audio content block

            console.log('[Nova 2 Sonic TTS] Processing response stream...');
            for await (const event of response.body) {
                if (event.chunk && event.chunk.bytes) {
                    const rawEvent = JSON.parse(Buffer.from(event.chunk.bytes).toString());
                    eventCount++;

                    const eventData = rawEvent.event || rawEvent;
                    const eventType = Object.keys(eventData)[0];
                    console.log(`[Nova 2 Sonic TTS] ← Event ${eventCount}: ${eventType}`);

                    // 1. STAGE DETECTION
                    if (eventData.contentStart && eventData.contentStart.role === 'ASSISTANT') {
                        if (eventData.contentStart.additionalModelFields) {
                            try {
                                const fields = JSON.parse(eventData.contentStart.additionalModelFields);
                                currentStage = fields.generationStage || 'UNKNOWN';
                            } catch (e) {
                                currentStage = 'UNKNOWN';
                            }
                        }
                        console.log(`[Nova 2 Sonic TTS]   → Content block started (stage: ${currentStage})`);
                    }

                    // 2. DATA COLLECTION - Only collect from the FIRST audio content block
                    if (eventData.audioOutput) {
                        if (firstAudioContentBlock) {
                            audioEventCount++;
                            seenAudioOutput = true;

                            const audioData = eventData.audioOutput.content || eventData.audioOutput;
                            if (audioData) {
                                const audioBuffer = Buffer.from(audioData, 'base64');
                                audioChunks.push(audioBuffer);
                                if (audioEventCount % 10 === 0) {
                                    console.log(`[Nova 2 Sonic TTS]   ✓ Audio chunk ${audioEventCount} received (FIRST BLOCK)`);
                                }
                            }
                        } else {
                            console.log(`[Nova 2 Sonic TTS]   ⏭️  Skipping audio from subsequent content block`);
                        }
                    }

                    // 3. Track when first audio content block ends
                    if (eventData.contentEnd && seenAudioOutput && firstAudioContentBlock) {
                        console.log(`[Nova 2 Sonic TTS]   🎯 First audio content block ended. Ignoring any subsequent audio.`);
                        firstAudioContentBlock = false;
                    }

                    if (eventData.textOutput) {
                        textEventCount++;
                        const textData = eventData.textOutput.content || eventData.textOutput;
                        if (textData) {
                            textChunks.push(textData);
                            console.log(`[Nova 2 Sonic TTS]   ✓ Text chunk ${textEventCount}: "${textData}" (${currentStage})`);
                        }
                    }

                    // 3. CLOSURE SIGNAL
                    // Close on completionEnd OR contentEnd after audio output
                    if (eventData.completionEnd) {
                        console.log(`[Nova 2 Sonic TTS]   ✓ Completion ended. Signaling generator to close.`);
                        finishSignal();
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } else if (eventData.contentEnd && seenAudioOutput) {
                        // Also close if we've seen audio and content ends
                        console.log(`[Nova 2 Sonic TTS]   ✓ Content ended after audio (${audioEventCount} chunks). Signaling generator to close.`);
                        finishSignal();
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            }

            if (audioChunks.length === 0) return Buffer.alloc(0);

            // Final WAV Combine
            const pcmBuffer = Buffer.concat(audioChunks);
            return this.createWavWithHeader(pcmBuffer, 24000);

        } catch (error) {
            console.error('[Nova 2 Sonic TTS] Error:', error);
            throw error;
        }
    }

    // Helper for WAV header
    private createWavWithHeader(pcmBuffer: Buffer, sampleRate: number): Buffer {
        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + pcmBuffer.length, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(1, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(sampleRate * 2, 28);
        header.writeUInt16LE(2, 32);
        header.writeUInt16LE(16, 34);
        header.write('data', 36);
        header.writeUInt32LE(pcmBuffer.length, 40);
        return Buffer.concat([header, pcmBuffer]);
    }

    /**
     * Map voice names to Amazon Polly voice IDs
     */
    private mapVoiceToPolly(voice: string): string {
        const voiceMap: Record<string, string> = {
            // OpenAI-style voices mapped to Polly
            'alloy': 'Matthew',
            'echo': 'Brian',
            'fable': 'Amy',
            'onyx': 'Matthew',
            'nova': 'Joanna',
            'shimmer': 'Emma',
            // Direct Polly voices
            'matthew': 'Matthew',
            'joanna': 'Joanna',
            'amy': 'Amy',
            'brian': 'Brian',
            'emma': 'Emma',
            'ruth': 'Ruth',
            // Nova Sonic fallback
            'nova-sonic': 'Matthew',
            'sonic': 'Matthew'
        };

        return voiceMap[voice.toLowerCase()] || 'Matthew';
    }

    /**
     * Map voice names to Nova 2 Sonic voice options
     */
    private mapVoiceToNovaSonic(voice: string): string {
        const voiceMap: Record<string, string> = {
            'nova-sonic': 'nova-sonic',
            'sonic': 'nova-sonic',
            'nova': 'nova-sonic',
            'ruth': 'nova-sonic',
            // Map other voices to Nova 2 Sonic as default
            'alloy': 'nova-sonic',
            'echo': 'nova-sonic',
            'fable': 'nova-sonic',
            'onyx': 'nova-sonic',
            'shimmer': 'nova-sonic',
            'joanna': 'nova-sonic',
            'matthew': 'nova-sonic',
            'amy': 'nova-sonic',
            'brian': 'nova-sonic',
            'emma': 'nova-sonic',
        };

        return voiceMap[voice.toLowerCase()] || 'nova-sonic';
    }

    /**
     * Get default system prompt for Nova 2 Sonic conversations
     */
    private getDefaultSystemPrompt(): string {
        return `You are a text-to-speech system. Your only job is to speak the user's text EXACTLY as written, word-for-word, without adding any commentary, questions, or additional words.`;
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
     * Convert stream to buffer
     */
    private async streamToBuffer(stream: Readable): Promise<Buffer> {
        const chunks: Buffer[] = [];

        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    /**
     * Retry logic with exponential backoff
     */
    private async withRetry<T>(
        operation: () => Promise<T>,
        attempt: number = 1
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (attempt >= this.MAX_RETRIES) {
                throw error;
            }

            // Check if error is retryable
            if (this.isRetryableError(error)) {
                const delay = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                await this.sleep(delay);
                return this.withRetry(operation, attempt + 1);
            }

            throw error;
        }
    }

    /**
     * Timeout wrapper for promises
     */
    private async withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number
    ): Promise<T> {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) =>
                setTimeout(
                    () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
                    timeoutMs
                )
            ),
        ]);
    }

    /**
     * Check if error is retryable
     */
    private isRetryableError(error: any): boolean {
        // Retry on throttling and server errors
        if (error?.name === 'ThrottlingException') {
            return true;
        }

        if (error?.$metadata?.httpStatusCode) {
            const status = error.$metadata.httpStatusCode;
            return status === 429 || status >= 500;
        }

        // Retry on timeout errors
        if (error?.message?.includes('timeout')) {
            return true;
        }

        // Retry on network errors
        if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
            return true;
        }

        return false;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Transcribe audio using Nova 2 Sonic bidirectional streaming
     * Uses the same pattern as the working test harness
     */
    async transcribe(
        audioStream: Readable,
        config: LLMProviderConfig
    ): Promise<{ transcription: string; duration: number }> {
        console.log('[Nova 2 Sonic] Transcribing audio using bidirectional streaming...');

        const { InvokeModelWithBidirectionalStreamCommand } = await import('@aws-sdk/client-bedrock-runtime');
        const bedrockClient = this.createBedrockClient(config);

        try {
            // Convert audio stream to buffer
            const audioBuffer = await this.streamToBuffer(audioStream);
            const audioBase64 = audioBuffer.toString('base64');

            const promptName = `prompt-${Date.now()}`;
            const audioContentName = `audio-${Date.now()}`;
            const systemContentName = `system-${Date.now()}`;

            // Create input stream generator (same pattern as test)
            async function* inputStream(): AsyncGenerator<any> {
                // 1. Session Start
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                sessionStart: {
                                    inferenceConfiguration: {
                                        maxTokens: 2048,
                                        topP: 0.9,
                                        temperature: 0.7
                                    },
                                    turnDetectionConfiguration: {
                                        endpointingSensitivity: "MEDIUM"
                                    }
                                }
                            }
                        }))
                    }
                };

                // 2. Prompt Start
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                promptStart: {
                                    promptName,
                                    textOutputConfiguration: {
                                        mediaType: "text/plain"
                                    },
                                    audioOutputConfiguration: {
                                        mediaType: "audio/lpcm",
                                        sampleRateHertz: 16000,
                                        sampleSizeBits: 16,
                                        channelCount: 1,
                                        voiceId: "matthew",
                                        encoding: "base64",
                                        audioType: "SPEECH"
                                    }
                                }
                            }
                        }))
                    }
                };

                // 3. System Content Start
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                contentStart: {
                                    promptName,
                                    contentName: systemContentName,
                                    type: "TEXT",
                                    interactive: false,
                                    role: "SYSTEM",
                                    textInputConfiguration: {
                                        mediaType: "text/plain"
                                    }
                                }
                            }
                        }))
                    }
                };

                // 4. System Text Input
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                textInput: {
                                    promptName,
                                    contentName: systemContentName,
                                    content: "You are a helpful assistant that transcribes audio."
                                }
                            }
                        }))
                    }
                };

                // 5. System Content End
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                contentEnd: {
                                    promptName,
                                    contentName: systemContentName
                                }
                            }
                        }))
                    }
                };

                // 6. User Audio Content Start
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                contentStart: {
                                    promptName,
                                    contentName: audioContentName,
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
                        }))
                    }
                };

                // 7. Audio Input (send actual audio data)
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                audioInput: {
                                    promptName,
                                    contentName: audioContentName,
                                    content: audioBase64
                                }
                            }
                        }))
                    }
                };

                // 8. User Audio Content End
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                contentEnd: {
                                    promptName,
                                    contentName: audioContentName
                                }
                            }
                        }))
                    }
                };

                // 9. Prompt End
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                promptEnd: {
                                    promptName
                                }
                            }
                        }))
                    }
                };

                // 10. Session End
                yield {
                    chunk: {
                        bytes: Buffer.from(JSON.stringify({
                            event: {
                                sessionEnd: {}
                            }
                        }))
                    }
                };
            }

            const command = new InvokeModelWithBidirectionalStreamCommand({
                modelId: this.NOVA_SONIC_MODEL_ID,
                body: inputStream()
            });

            const response = await bedrockClient.send(command);

            if (!response.body) {
                throw new Error('No response body from Nova 2 Sonic');
            }

            let transcription = '';
            const receivedEvents: any[] = [];

            // Process response stream
            for await (const event of response.body) {
                if (event.chunk && event.chunk.bytes) {
                    const rawEvent = JSON.parse(Buffer.from(event.chunk.bytes).toString());
                    receivedEvents.push(rawEvent);

                    // Extract transcription from text output
                    if (rawEvent.event?.textOutput) {
                        transcription += rawEvent.event.textOutput.content || '';
                    }
                }
            }

            console.log(`[Nova 2 Sonic] Received ${receivedEvents.length} events`);
            console.log(`[Nova 2 Sonic] Transcription: ${transcription}`);

            return {
                transcription: transcription || 'Audio processed successfully',
                duration: 0
            };

        } catch (error: any) {
            console.error('[Nova 2 Sonic] Transcription error:', error);

            // Provide helpful error messages
            if (error.name === 'AccessDeniedException') {
                throw new Error('Access denied to Nova 2 Sonic. Please check your AWS permissions.');
            } else if (error.name === 'ValidationException') {
                throw new Error('Model ID or Region might be incorrect, or you lack access to this model.');
            }

            throw error;
        }
    }
}