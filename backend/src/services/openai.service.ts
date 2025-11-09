import OpenAI from 'openai';
import {
  ILLMProvider,
  ChatMessage,
  ChatCompletionResponse,
  TranscriptionResponse,
  ModelInfo,
  LLMProviderConfig,
} from './llm-provider.interface';

// Re-export for backward compatibility
export { ChatMessage, ChatCompletionResponse, TranscriptionResponse, ModelInfo };

export class OpenAIService implements ILLMProvider {
  private readonly TIMEOUT_MS = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY_MS = 1000; // 1 second

  // Supported OpenAI models
  private readonly SUPPORTED_MODELS = [
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4o',
    'o1-preview',
    'o1-mini',
  ];

  /**
   * Create a chat completion with retry logic and timeout handling
   * @param messages - Array of chat messages
   * @param model - Model to use (e.g., 'gpt-4', 'gpt-3.5-turbo')
   * @param config - LLM provider configuration
   * @returns Chat completion response
   */
  async chat(
    messages: ChatMessage[],
    model: string,
    config: LLMProviderConfig
  ): Promise<ChatCompletionResponse> {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    return this.withRetry(async () => {
      const client = new OpenAI({ apiKey });
      
      const completion = await this.withTimeout(
        client.chat.completions.create({
          model,
          messages,
        }),
        this.TIMEOUT_MS
      );

      if (!completion.choices[0]?.message?.content) {
        throw new Error('No content in OpenAI response');
      }

      return {
        content: completion.choices[0].message.content,
        model: completion.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    });
  }

  /**
   * Transcribe audio using OpenAI Whisper
   * @param audioFile - Audio file buffer, blob, or stream
   * @param config - LLM provider configuration
   * @returns Transcription response
   */
  async transcribe(
    audioFile: any,
    config: LLMProviderConfig
  ): Promise<TranscriptionResponse> {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    return this.withRetry(async () => {
      const client = new OpenAI({ apiKey });

      // Whisper can handle longer files, so use a longer timeout (2 minutes)
      const transcription = await this.withTimeout(
        client.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
        }),
        120000 // 2 minutes for audio transcription
      );

      return {
        transcription: transcription.text,
        duration: 0, // Whisper API doesn't return duration
      };
    });
  }

  /**
   * Synthesize speech from text using OpenAI TTS
   * @param text - Text to synthesize
   * @param voice - Voice to use
   * @param config - LLM provider configuration
   * @returns Audio stream
   */
  async synthesize(
    text: string,
    voice: string,
    config: LLMProviderConfig
  ): Promise<Buffer> {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    return this.withRetry(async () => {
      const client = new OpenAI({ apiKey });

      const response = await this.withTimeout(
        client.audio.speech.create({
          model: 'tts-1',
          voice,
          input: text,
        }),
        this.TIMEOUT_MS
      );

      // Convert response to buffer
      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    });
  }

  /**
   * List available models from OpenAI
   * @param config - LLM provider configuration
   * @returns Array of model information
   */
  async listModels(config: LLMProviderConfig): Promise<ModelInfo[]> {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    return this.withRetry(async () => {
      const client = new OpenAI({ apiKey });

      const response = await this.withTimeout(
        client.models.list(),
        this.TIMEOUT_MS
      );

      return response.data.map((model) => ({
        id: model.id,
        created: model.created,
        ownedBy: model.owned_by,
      }));
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
    // Retry on network errors, rate limits, and server errors
    if (error?.status) {
      return error.status === 429 || error.status >= 500;
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
   * Check if a model is supported by OpenAI
   */
  isModelSupported(model: string): boolean {
    return this.SUPPORTED_MODELS.some(
      (supportedModel) =>
        model === supportedModel || model.startsWith(supportedModel)
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
