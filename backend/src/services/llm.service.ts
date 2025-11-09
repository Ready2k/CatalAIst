import {
  ILLMProvider,
  ChatMessage,
  ChatCompletionResponse,
  TranscriptionResponse,
  ModelInfo,
  LLMProviderConfig,
} from './llm-provider.interface';
import { OpenAIService } from './openai.service';
import { BedrockService } from './bedrock.service';

/**
 * LLM Service - Factory and facade for multiple LLM providers
 * Supports OpenAI and AWS Bedrock
 */
export class LLMService {
  private openAIService: OpenAIService;
  private bedrockService: BedrockService;

  constructor() {
    this.openAIService = new OpenAIService();
    this.bedrockService = new BedrockService();
  }

  /**
   * Get the appropriate provider based on configuration
   */
  private getProvider(config: LLMProviderConfig): ILLMProvider {
    switch (config.provider) {
      case 'openai':
        return this.openAIService;
      case 'bedrock':
        return this.bedrockService;
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  /**
   * Create a chat completion using the configured provider
   */
  async chat(
    messages: ChatMessage[],
    model: string,
    config: LLMProviderConfig
  ): Promise<ChatCompletionResponse> {
    const provider = this.getProvider(config);
    return provider.chat(messages, model, config);
  }

  /**
   * Transcribe audio (OpenAI only)
   */
  async transcribe(
    audioFile: any,
    config: LLMProviderConfig
  ): Promise<TranscriptionResponse> {
    if (config.provider !== 'openai') {
      throw new Error('Transcription is only supported with OpenAI provider');
    }
    const provider = this.getProvider(config);
    if (!provider.transcribe) {
      throw new Error('Provider does not support transcription');
    }
    return provider.transcribe(audioFile, config);
  }

  /**
   * Synthesize speech (OpenAI only)
   */
  async synthesize(
    text: string,
    voice: string,
    config: LLMProviderConfig
  ): Promise<Buffer> {
    if (config.provider !== 'openai') {
      throw new Error('Speech synthesis is only supported with OpenAI provider');
    }
    const provider = this.getProvider(config);
    if (!provider.synthesize) {
      throw new Error('Provider does not support speech synthesis');
    }
    return provider.synthesize(text, voice, config);
  }

  /**
   * List available models for the configured provider
   */
  async listModels(config: LLMProviderConfig): Promise<ModelInfo[]> {
    const provider = this.getProvider(config);
    return provider.listModels(config);
  }

  /**
   * Check if a model is supported by the configured provider
   */
  isModelSupported(model: string, config: LLMProviderConfig): boolean {
    const provider = this.getProvider(config);
    return provider.isModelSupported(model);
  }

  /**
   * Detect provider from model name
   */
  detectProvider(model: string): 'openai' | 'bedrock' {
    if (model.startsWith('anthropic.claude')) {
      return 'bedrock';
    }
    if (model.startsWith('gpt-') || model.startsWith('o1-')) {
      return 'openai';
    }
    // Default to OpenAI for backward compatibility
    return 'openai';
  }

  /**
   * Build config from request parameters
   */
  buildConfig(params: {
    provider?: 'openai' | 'bedrock';
    model?: string;
    apiKey?: string;
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
    awsSessionToken?: string;
    awsRegion?: string;
  }): LLMProviderConfig {
    // Auto-detect provider from model if not specified
    const provider = params.provider || (params.model ? this.detectProvider(params.model) : 'openai');

    return {
      provider,
      apiKey: params.apiKey,
      awsAccessKeyId: params.awsAccessKeyId,
      awsSecretAccessKey: params.awsSecretAccessKey,
      awsSessionToken: params.awsSessionToken,
      awsRegion: params.awsRegion || 'us-east-1',
    };
  }
}

// Re-export types for convenience
export {
  ChatMessage,
  ChatCompletionResponse,
  TranscriptionResponse,
  ModelInfo,
  LLMProviderConfig,
};
