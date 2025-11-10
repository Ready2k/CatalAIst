import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockClient,
  ListFoundationModelsCommand,
  FoundationModelSummary,
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
    });
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
   * List available Bedrock models
   */
  async listModels(config: LLMProviderConfig): Promise<ModelInfo[]> {
    try {
      const client = this.createBedrockClient(config);
      
      const command = new ListFoundationModelsCommand({
        byProvider: 'Anthropic', // Filter to Anthropic models (Claude)
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

      // Log all Anthropic models and their statuses for debugging
      // Note: AWS console may show different names than API model IDs
      // e.g., "Claude 3.7 Sonnet" in console = "anthropic.claude-3-5-sonnet-20241022-v2:0" in API
      const anthropicModels = response.modelSummaries.filter(m => 
        m.modelId?.startsWith('anthropic.claude')
      );
      console.log(`[Bedrock] Found ${anthropicModels.length} Anthropic Claude models:`);
      anthropicModels.forEach(m => {
        console.log(`[Bedrock]   - ${m.modelId}: ${m.modelLifecycle?.status || 'UNKNOWN'}`);
      });

      // Convert Bedrock model summaries to ModelInfo format
      // Include all Claude models regardless of status (AWS marks older models as LEGACY but they still work)
      // Filter out models that require provisioned throughput (like Claude Haiku 4.5)
      const filteredModels = response.modelSummaries
        .filter((model: FoundationModelSummary) => {
          if (!model.modelId || !model.modelId.startsWith('anthropic.claude')) {
            return false;
          }
          
          // Check if model requires provisioned throughput
          const requiresProvisioned = model.inferenceTypesSupported?.includes('PROVISIONED') && 
                                      !model.inferenceTypesSupported?.includes('ON_DEMAND');
          
          if (requiresProvisioned) {
            console.log(`[Bedrock]   Skipping ${model.modelId} (requires Provisioned Throughput)`);
            return false;
          }
          
          return true;
        })
        .map((model: FoundationModelSummary) => ({
          id: model.modelId!,
          created: 0, // Bedrock doesn't provide creation timestamp
          ownedBy: model.providerName?.toLowerCase() || 'anthropic',
        }))
        .sort((a: ModelInfo, b: ModelInfo) => {
          // Sort by version (newer first)
          const versionA = this.extractVersion(a.id);
          const versionB = this.extractVersion(b.id);
          return versionB.localeCompare(versionA);
        });

      console.log(`[Bedrock] Returning ${filteredModels.length} Claude models (all statuses included)`);
      
      if (filteredModels.length === 0) {
        console.warn('[Bedrock] No Claude models found! This might indicate:');
        console.warn('[Bedrock]   - No Anthropic models available in your region');
        console.warn('[Bedrock]   - Model access needs to be requested in AWS Bedrock console');
        console.warn('[Bedrock]   - IAM permissions might be insufficient');
      }
      
      // Log a summary of statuses
      const statusCounts: Record<string, number> = {};
      anthropicModels.forEach(m => {
        const status = m.modelLifecycle?.status || 'UNKNOWN';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log(`[Bedrock] Status breakdown:`, statusCounts);
      
      return filteredModels;
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
   * Get fallback model list when API call fails
   */
  private getFallbackModels(): ModelInfo[] {
    return this.SUPPORTED_MODELS.map((modelId, index) => ({
      id: modelId,
      created: Date.now() - index * 86400000, // Fake timestamps
      ownedBy: 'anthropic',
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
   * Since we dynamically fetch models, we accept any Anthropic Claude model
   */
  isModelSupported(model: string): boolean {
    // Accept any Anthropic Claude model from Bedrock
    return model.startsWith('anthropic.claude');
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
