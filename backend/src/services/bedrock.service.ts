import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
  ConverseCommand,
  ConverseCommandInput,
  Message,
  ContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockClient,
  ListFoundationModelsCommand,
  ListInferenceProfilesCommand,
  FoundationModelSummary,
  InferenceProfileSummary,
} from '@aws-sdk/client-bedrock';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import https from 'https';
import {
  ILLMProvider,
  ChatMessage,
  ChatCompletionResponse,
  ModelInfo,
  LLMProviderConfig,
} from './llm-provider.interface';

/**
 * AWS Bedrock LLM Provider Implementation
 * Supports Claude models via AWS Bedrock
 */
export class BedrockService implements ILLMProvider {
  private readonly TIMEOUT_MS = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY_MS = 1000; // 1 second

  // Fallback models (used when API call fails)
  // This list is only used as a fallback and doesn't restrict which models can be used
  private readonly SUPPORTED_MODELS = [
    'anthropic.claude-haiku-4-5-20251001-v1:0',
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-5-sonnet-20240620-v1:0',
    'anthropic.claude-3-5-haiku-20241022-v1:0',
    'anthropic.claude-3-opus-20240229-v1:0',
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-haiku-20240307-v1:0',
    'anthropic.claude-v2:1',
    'anthropic.claude-v2',
    'anthropic.claude-instant-v1',
    // Amazon Nova models (require Converse API)
    'amazon.nova-micro-v1:0',
    'amazon.nova-lite-v1:0',
    'amazon.nova-pro-v1:0',
  ];

  /**
   * Create a chat completion using AWS Bedrock
   */
  async chat(
    messages: ChatMessage[],
    model: string,
    config: LLMProviderConfig
  ): Promise<ChatCompletionResponse> {
    return this.withRetry(async () => {
      const client = this.createClient(config);

      // Check if this is a Nova model or newer model that requires Converse API
      if (this.shouldUseConverseAPI(model)) {
        return this.chatWithConverse(messages, model, client);
      } else {
        return this.chatWithInvokeModel(messages, model, client);
      }
    });
  }

  /**
   * Determine if we should use the Converse API for this model
   */
  private shouldUseConverseAPI(model: string): boolean {
    // Nova models require Converse API
    if (model.includes('nova')) {
      return true;
    }
    
    // Newer Claude models work better with Converse API
    if (model.includes('claude-3-5') || model.includes('claude-haiku-4')) {
      return true;
    }
    
    // Inference profiles (regional models) work better with Converse API
    if (model.startsWith('us.') || model.startsWith('eu.') || model.startsWith('ap.')) {
      return true;
    }
    
    return false;
  }

  /**
   * Chat using the newer Converse API (recommended for Nova and newer models)
   */
  private async chatWithConverse(
    messages: ChatMessage[],
    model: string,
    client: BedrockRuntimeClient
  ): Promise<ChatCompletionResponse> {
    // Convert messages to Converse format
    const { system, messages: converseMessages } = this.convertToConverseFormat(messages);

    const input: ConverseCommandInput = {
      modelId: model,
      messages: converseMessages,
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.7,
      },
    };

    if (system) {
      input.system = [{ text: system }];
    }

    const command = new ConverseCommand(input);
    
    try {
      const response = await this.withTimeout(
        client.send(command),
        this.TIMEOUT_MS
      );

      return this.parseConverseResponse(response, model);
    } catch (error: any) {
      // Handle provisioned throughput errors
      if (error.message?.includes('on-demand throughput') || 
          error.message?.includes('provisioned throughput') ||
          error.name === 'ValidationException') {
        throw new Error(
          `Model ${model} requires Provisioned Throughput. ` +
          `This model is not available with On-Demand access. ` +
          `Please select a different model or configure Provisioned Throughput in AWS Bedrock console.`
        );
      }
      throw error;
    }
  }

  /**
   * Chat using the legacy InvokeModel API (for older Claude models)
   */
  private async chatWithInvokeModel(
    messages: ChatMessage[],
    model: string,
    client: BedrockRuntimeClient
  ): Promise<ChatCompletionResponse> {
    // Convert messages to Claude format
    const { system, messages: claudeMessages } = this.convertToClaude(messages);

    // Build request body for Claude
    const requestBody: any = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      messages: claudeMessages,
    };

    if (system) {
      requestBody.system = system;
    }

    const input: InvokeModelCommandInput = {
      modelId: model,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    };

    const command = new InvokeModelCommand(input);
    
    try {
      const response = await this.withTimeout(
        client.send(command),
        this.TIMEOUT_MS
      );

      if (!response.body) {
        throw new Error('No response body from Bedrock');
      }
      
      return this.parseBedrockResponse(response, model);
    } catch (error: any) {
      // Handle provisioned throughput errors
      if (error.message?.includes('on-demand throughput') || 
          error.message?.includes('provisioned throughput') ||
          error.name === 'ValidationException') {
        throw new Error(
          `Model ${model} requires Provisioned Throughput. ` +
          `This model is not available with On-Demand access. ` +
          `Please select a different model or configure Provisioned Throughput in AWS Bedrock console.`
        );
      }
      throw error;
    }
  }

  /**
   * Parse Bedrock response
   */
  private parseBedrockResponse(response: any, model: string): ChatCompletionResponse {
    if (!response.body) {
      throw new Error('No response body from Bedrock');
    }

    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    if (!responseBody.content || responseBody.content.length === 0) {
      throw new Error('No content in Bedrock response');
    }

    // Extract text from content blocks
    const content = responseBody.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return {
      content,
      model: responseBody.model || model,
      usage: {
        promptTokens: responseBody.usage?.input_tokens || 0,
        completionTokens: responseBody.usage?.output_tokens || 0,
        totalTokens:
          (responseBody.usage?.input_tokens || 0) +
          (responseBody.usage?.output_tokens || 0),
      },
    };
  }

  /**
   * Parse Converse API response
   */
  private parseConverseResponse(response: any, model: string): ChatCompletionResponse {
    if (!response.output) {
      throw new Error('No output in Converse response');
    }

    // Extract content from the message
    const message = response.output.message;
    if (!message || !message.content || message.content.length === 0) {
      throw new Error('No content in Converse response');
    }

    // Extract text from content blocks
    const content = message.content
      .filter((block: ContentBlock) => block.text)
      .map((block: ContentBlock) => block.text)
      .join('\n');

    return {
      content,
      model: model,
      usage: {
        promptTokens: response.usage?.inputTokens || 0,
        completionTokens: response.usage?.outputTokens || 0,
        totalTokens:
          (response.usage?.inputTokens || 0) +
          (response.usage?.outputTokens || 0),
      },
    };
  }

  /**
   * Convert standard chat messages to Converse API format
   */
  private convertToConverseFormat(messages: ChatMessage[]): {
    system?: string;
    messages: Message[];
  } {
    let system: string | undefined;
    const converseMessages: Message[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        // System messages are handled separately in Converse API
        system = message.content;
      } else {
        converseMessages.push({
          role: message.role as 'user' | 'assistant',
          content: [{ text: message.content }],
        });
      }
    }

    return { system, messages: converseMessages };
  }

  /**
   * List available Bedrock models
   */
  async listModels(config: LLMProviderConfig): Promise<ModelInfo[]> {
    console.log('[Bedrock] listModels called with config:', {
      provider: config.provider,
      awsRegion: config.awsRegion,
      useRegionalInference: config.useRegionalInference,
      regionalInferenceEndpoint: config.regionalInferenceEndpoint,
      hasAwsAccessKeyId: !!config.awsAccessKeyId,
      hasAwsSecretAccessKey: !!config.awsSecretAccessKey
    });
    
    try {
      const client = this.createBedrockClient(config);
      
      // If regional inference is enabled, fetch inference profiles instead of foundation models
      if (config.useRegionalInference) {
        console.log('[Bedrock] Regional inference enabled - fetching inference profiles');
        return await this.listInferenceProfiles(client);
      } else {
        console.log('[Bedrock] Regional inference disabled - fetching foundation models');
        return await this.listFoundationModels(client);
      }
    } catch (error) {
      console.error('[Bedrock] Error listing models:', error);
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('[Bedrock] Error name:', error.name);
        console.error('[Bedrock] Error message:', error.message);
        if ((error as any).$metadata) {
          console.error('[Bedrock] AWS Error metadata:', JSON.stringify((error as any).$metadata, null, 2));
        }
        if ((error as any).Code) {
          console.error('[Bedrock] AWS Error code:', (error as any).Code);
        }
      }
      
      console.warn('[Bedrock] Falling back to static model list');
      return this.getFallbackModels();
    }
  }

  /**
   * List inference profiles for regional inference
   */
  private async listInferenceProfiles(client: BedrockClient): Promise<ModelInfo[]> {
    try {
      const command = new ListInferenceProfilesCommand({});
      
      const response = await this.withTimeout(
        client.send(command),
        this.TIMEOUT_MS
      );

      if (!response.inferenceProfileSummaries || response.inferenceProfileSummaries.length === 0) {
        console.warn('[Bedrock] No inference profiles returned from Bedrock API, falling back to foundation models');
        return await this.listFoundationModels(client);
      }

      console.log(`[Bedrock] API returned ${response.inferenceProfileSummaries.length} inference profiles`);

      // Log all available inference profiles
      const allProfiles = response.inferenceProfileSummaries;
      console.log(`[Bedrock] Found ${allProfiles.length} inference profiles:`);
      
      allProfiles.forEach(profile => {
        console.log(`[Bedrock]   - ${profile.inferenceProfileId}: ${profile.status || 'UNKNOWN'} (${profile.type || 'UNKNOWN'})`);
      });

      // Convert inference profiles to ModelInfo format
      const filteredProfiles = response.inferenceProfileSummaries
        .filter((profile: InferenceProfileSummary) => {
          if (!profile.inferenceProfileId) {
            return false;
          }
          
          // Only include ACTIVE profiles
          if (profile.status !== 'ACTIVE') {
            console.log(`[Bedrock]   Skipping ${profile.inferenceProfileId} (status: ${profile.status})`);
            return false;
          }
          
          return true;
        })
        .map((profile: InferenceProfileSummary) => ({
          id: profile.inferenceProfileId!,
          created: profile.createdAt ? new Date(profile.createdAt).getTime() : 0,
          ownedBy: this.extractProviderFromInferenceProfile(profile.inferenceProfileId!),
          supportsOnDemand: true, // Inference profiles typically support on-demand
          requiresProvisioned: false,
          isInferenceProfile: true,
          modelType: 'inference-profile' as const,
        }))
        .sort((a: ModelInfo, b: ModelInfo) => {
          // Sort by provider first, then by region prefix
          const providerA = a.ownedBy;
          const providerB = b.ownedBy;
          
          if (providerA !== providerB) {
            return providerA.localeCompare(providerB);
          }
          
          // Sort by region prefix (us, eu, etc.)
          const regionA = a.id.split('.')[0];
          const regionB = b.id.split('.')[0];
          return regionA.localeCompare(regionB);
        });

      console.log(`[Bedrock] Returning ${filteredProfiles.length} active inference profiles`);
      
      if (filteredProfiles.length === 0) {
        console.warn('[Bedrock] No active inference profiles found! This might indicate:');
        console.warn('[Bedrock]   - No inference profiles available in your region');
        console.warn('[Bedrock]   - Inference profiles need to be enabled in AWS Bedrock console');
        console.warn('[Bedrock]   - IAM permissions might be insufficient for inference profiles');
      }
      
      return filteredProfiles;
    } catch (error) {
      console.error('[Bedrock] Error fetching inference profiles:', error);
      console.warn('[Bedrock] Inference profiles not available, falling back to foundation models');
      return await this.listFoundationModels(client);
    }
  }

  /**
   * List foundation models (regular models)
   */
  private async listFoundationModels(client: BedrockClient): Promise<ModelInfo[]> {
    const command = new ListFoundationModelsCommand({
      // Remove provider filter to get all available models
      // byProvider: 'Anthropic', // Removed - now supports all providers
    });
    
    const response = await this.withTimeout(
      client.send(command),
      this.TIMEOUT_MS
    );

    if (!response.modelSummaries || response.modelSummaries.length === 0) {
      console.warn('[Bedrock] No models returned from Bedrock API, using fallback list');
      return this.getFallbackModels();
    }

    console.log(`[Bedrock] API returned ${response.modelSummaries.length} total models`);

    // Log all available models and their statuses for debugging
    const allModels = response.modelSummaries;
    console.log(`[Bedrock] Found ${allModels.length} total models from all providers:`);
    
    // Group models by provider for better logging
    const modelsByProvider: Record<string, FoundationModelSummary[]> = {};
    allModels.forEach(m => {
      const provider = m.providerName || 'Unknown';
      if (!modelsByProvider[provider]) {
        modelsByProvider[provider] = [];
      }
      modelsByProvider[provider].push(m);
    });

    Object.entries(modelsByProvider).forEach(([provider, models]) => {
      console.log(`[Bedrock]   ${provider}: ${models.length} models`);
      models.forEach(m => {
        console.log(`[Bedrock]     - ${m.modelId}: ${m.modelLifecycle?.status || 'UNKNOWN'}`);
      });
    });

    // Convert Bedrock model summaries to ModelInfo format
    // Include ALL models - let the frontend filter based on user preference
    const filteredModels = response.modelSummaries
      .filter((model: FoundationModelSummary) => {
        if (!model.modelId) {
          return false;
        }
        
        // Log model type for debugging
        const supportsOnDemand = model.inferenceTypesSupported?.includes('ON_DEMAND');
        const requiresProvisioned = model.inferenceTypesSupported?.includes('PROVISIONED') && 
                                    !model.inferenceTypesSupported?.includes('ON_DEMAND');
        
        console.log(`[Bedrock]   ${model.modelId}: OnDemand=${supportsOnDemand}, RequiresProvisioned=${requiresProvisioned}`);
        
        return true; // Include all models
      })
      .map((model: FoundationModelSummary) => {
        const supportsOnDemand = model.inferenceTypesSupported?.includes('ON_DEMAND') || false;
        const supportsProvisioned = model.inferenceTypesSupported?.includes('PROVISIONED') || false;
        const requiresProvisioned = supportsProvisioned && !supportsOnDemand;
        
        return {
          id: model.modelId!,
          created: 0, // Bedrock doesn't provide creation timestamp
          ownedBy: model.providerName?.toLowerCase() || 'anthropic',
          supportsOnDemand,
          requiresProvisioned,
          isInferenceProfile: false,
          modelType: 'foundation' as const,
        };
      })
      .sort((a: ModelInfo, b: ModelInfo) => {
        // Sort by provider first, then by version/name
        const providerA = a.ownedBy;
        const providerB = b.ownedBy;
        
        if (providerA !== providerB) {
          return providerA.localeCompare(providerB);
        }
        
        // Within same provider, sort by version (newer first)
        const versionA = this.extractVersion(a.id);
        const versionB = this.extractVersion(b.id);
        return versionB.localeCompare(versionA);
      });

    console.log(`[Bedrock] Returning ${filteredModels.length} models from all providers`);
    
    return filteredModels;
  }

  /**
   * Extract provider name from inference profile ID
   */
  private extractProviderFromInferenceProfile(profileId: string): string {
    // Inference profile IDs are like: us.anthropic.claude-3-sonnet-20240229-v1:0
    const parts = profileId.split('.');
    if (parts.length >= 2) {
      return parts[1]; // Extract 'anthropic' from 'us.anthropic.claude...'
    }
    return 'unknown';
  }

  /**
   * Get fallback model list when API call fails
   */
  private getFallbackModels(): ModelInfo[] {
    return this.SUPPORTED_MODELS.map((modelId, index) => ({
      id: modelId,
      created: Date.now() - index * 86400000, // Fake timestamps
      ownedBy: 'anthropic',
      supportsOnDemand: true, // Assume fallback models support on-demand
      requiresProvisioned: false,
      isInferenceProfile: false,
      modelType: 'foundation' as const,
    }));
  }

  /**
   * Extract version string from model ID for sorting
   */
  private extractVersion(modelId: string): string {
    const match = modelId.match(/(\d{8})/);
    return match ? match[1] : '0';
  }

  /**
   * Check if a model is supported
   * Accept any Bedrock model (not just Anthropic Claude)
   */
  isModelSupported(model: string): boolean {
    // Accept inference profile IDs (e.g., us.anthropic.claude-3-sonnet-20240229-v1:0)
    if (/^(us|eu|ap|ca)\.[a-zA-Z0-9-]+\.[a-zA-Z0-9-_.]+/.test(model)) {
      return true;
    }
    
    // Accept regular Bedrock model format (provider.model-name)
    // This includes Anthropic Claude, Amazon Titan, AI21 Jurassic, Cohere Command, Amazon Nova, etc.
    return (
      model.includes('.') && (
        model.startsWith('anthropic.') ||
        model.startsWith('amazon.') ||
        model.startsWith('ai21.') ||
        model.startsWith('cohere.') ||
        model.startsWith('meta.') ||
        model.startsWith('mistral.') ||
        // Accept any model that follows Bedrock naming convention
        /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-_.]+/.test(model)
      )
    );
  }

  /**
   * Create Bedrock Runtime client with credentials (for invoking models)
   */
  private createClient(config: LLMProviderConfig): BedrockRuntimeClient {
    if (!config.awsAccessKeyId || !config.awsSecretAccessKey) {
      throw new Error('AWS credentials are required for Bedrock');
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

    // Support for regional inference endpoints
    if (config.useRegionalInference && config.regionalInferenceEndpoint) {
      console.log(`[Bedrock] Using regional inference endpoint: ${config.regionalInferenceEndpoint}`);
      clientConfig.endpoint = config.regionalInferenceEndpoint;
    } else if (config.useRegionalInference) {
      // Auto-generate regional inference endpoint based on region
      const region = config.awsRegion || 'us-east-1';
      const regionalEndpoint = `https://bedrock-runtime.${region}.amazonaws.com`;
      console.log(`[Bedrock] Using auto-generated regional inference endpoint: ${regionalEndpoint}`);
      clientConfig.endpoint = regionalEndpoint;
    }

    // Handle self-signed certificates (common in corporate environments)
    // Check if we should disable certificate validation
    const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';
    
    if (!rejectUnauthorized) {
      console.warn('WARNING: TLS certificate validation is disabled. This should only be used in development/testing with trusted networks.');
      
      // Create custom HTTPS agent that accepts self-signed certificates
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true,
      });

      // Configure the client to use the custom agent
      clientConfig.requestHandler = new NodeHttpHandler({
        httpsAgent,
        connectionTimeout: 30000,
        socketTimeout: 30000,
      });
    }

    return new BedrockRuntimeClient(clientConfig);
  }

  /**
   * Create Bedrock client with credentials (for listing models)
   */
  private createBedrockClient(config: LLMProviderConfig): BedrockClient {
    if (!config.awsAccessKeyId || !config.awsSecretAccessKey) {
      throw new Error('AWS credentials are required for Bedrock');
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

    // Support for regional inference endpoints (for model listing)
    if (config.useRegionalInference) {
      // For model listing, we always need to use the control plane endpoint
      // The regionalInferenceEndpoint is only for runtime operations, not model listing
      const region = config.awsRegion || 'us-east-1';
      const controlPlaneEndpoint = `https://bedrock.${region}.amazonaws.com`;
      console.log(`[Bedrock] Using control plane endpoint for model listing: ${controlPlaneEndpoint}`);
      clientConfig.endpoint = controlPlaneEndpoint;
    }

    // Handle self-signed certificates (common in corporate environments)
    const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';
    
    if (!rejectUnauthorized) {
      console.warn('WARNING: TLS certificate validation is disabled. This should only be used in development/testing with trusted networks.');
      
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

    return new BedrockClient(clientConfig);
  }

  /**
   * Convert standard chat messages to Claude format
   */
  private convertToClaude(messages: ChatMessage[]): {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    let system: string | undefined;
    const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const message of messages) {
      if (message.role === 'system') {
        // Claude uses a separate system parameter
        system = message.content;
      } else {
        claudeMessages.push({
          role: message.role as 'user' | 'assistant',
          content: message.content,
        });
      }
    }

    return { system, messages: claudeMessages };
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
}
