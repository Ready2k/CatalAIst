/**
 * Common interface for LLM providers (OpenAI, AWS Bedrock, etc.)
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface TranscriptionResponse {
  transcription: string;
  duration: number;
}

export interface ModelInfo {
  id: string;
  created: number;
  ownedBy: string;
  // Additional metadata for filtering
  supportsOnDemand?: boolean;
  requiresProvisioned?: boolean;
  isInferenceProfile?: boolean;
  modelType?: 'foundation' | 'inference-profile';
}

export interface LLMProviderConfig {
  provider: 'openai' | 'bedrock';
  apiKey?: string; // For OpenAI
  awsAccessKeyId?: string; // For AWS Bedrock
  awsSecretAccessKey?: string; // For AWS Bedrock
  awsSessionToken?: string; // For AWS Bedrock (optional)
  awsRegion?: string; // For AWS Bedrock
  useRegionalInference?: boolean; // For AWS Bedrock regional inference
  regionalInferenceEndpoint?: string; // Custom regional inference endpoint
  modelId?: string; // Specific model ID
}

/**
 * Interface that all LLM providers must implement
 */
export interface ILLMProvider {
  /**
   * Create a chat completion
   */
  chat(
    messages: ChatMessage[],
    model: string,
    config: LLMProviderConfig
  ): Promise<ChatCompletionResponse>;

  /**
   * Transcribe audio (if supported)
   */
  transcribe?(
    audioFile: any,
    config: LLMProviderConfig
  ): Promise<TranscriptionResponse>;

  /**
   * Synthesize speech (if supported)
   */
  synthesize?(
    text: string,
    voice: string,
    config: LLMProviderConfig
  ): Promise<Buffer>;

  /**
   * List available models
   */
  listModels(config: LLMProviderConfig): Promise<ModelInfo[]>;

  /**
   * Check if a model is supported by this provider
   */
  isModelSupported(model: string): boolean;
}
