// API service for backend communication

// Use empty string for relative URLs - nginx will proxy /api to backend
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export interface ApiError {
  message: string;
  status: number;
}

export interface LLMConfig {
  provider: 'openai' | 'bedrock';
  model: string;
  // OpenAI
  apiKey?: string;
  // AWS Bedrock
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
  useRegionalInference?: boolean;
  regionalInferenceEndpoint?: string;
}

class ApiService {
  private apiKey: string | null = null;
  private sessionId: string | null = null;
  private llmConfig: LLMConfig | null = null;

  /**
   * Get auth token from sessionStorage
   */
  private getAuthToken(): string | null {
    return sessionStorage.getItem('authToken');
  }

  /**
   * Get default headers including auth token
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API errors including auth failures
   */
  private async handleResponse(response: Response) {
    if (response.status === 401 || response.status === 403) {
      // Clear auth and redirect to login
      sessionStorage.clear();
      window.location.reload();
      throw new Error('Authentication required. Please login again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  setSessionId(id: string) {
    this.sessionId = id;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  setLLMConfig(config: LLMConfig) {
    this.llmConfig = config;
    if (config.apiKey) {
      this.apiKey = config.apiKey;
    }
    // Store credentials in sessionStorage for reclassify and other admin operations
    sessionStorage.setItem('llmCredentials', JSON.stringify(config));
  }

  getLLMConfig(): LLMConfig | null {
    return this.llmConfig;
  }

  clearSession() {
    this.apiKey = null;
    this.sessionId = null;
    this.llmConfig = null;
    // Clear credentials from sessionStorage
    sessionStorage.removeItem('llmCredentials');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Legacy API key support (for backward compatibility)
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle auth errors
      if (response.status === 401 || response.status === 403) {
        sessionStorage.clear();
        window.location.reload();
        const authError: ApiError = {
          message: 'Authentication required. Please login again.',
          status: response.status,
        };
        throw authError;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        const apiError: ApiError = {
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        };
        throw apiError;
      }

      return await response.json();
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      const networkError: ApiError = {
        message: 'Network error. Please check your connection.',
        status: 0,
      };
      throw networkError;
    }
  }

  // Session endpoints
  async createSession(apiKey: string, model?: string): Promise<{ sessionId: string; model: string }> {
    this.setApiKey(apiKey);
    
    // Build request body based on current LLM config
    const body: any = { model };
    
    if (this.llmConfig) {
      body.provider = this.llmConfig.provider;
      
      if (this.llmConfig.provider === 'openai') {
        body.apiKey = this.llmConfig.apiKey || apiKey;
      } else if (this.llmConfig.provider === 'bedrock') {
        body.awsAccessKeyId = this.llmConfig.awsAccessKeyId;
        body.awsSecretAccessKey = this.llmConfig.awsSecretAccessKey;
        body.awsSessionToken = this.llmConfig.awsSessionToken;
        body.awsRegion = this.llmConfig.awsRegion;
        body.useRegionalInference = this.llmConfig.useRegionalInference;
        body.regionalInferenceEndpoint = this.llmConfig.regionalInferenceEndpoint;
      }
    } else {
      // Fallback to OpenAI if no config set
      body.provider = 'openai';
      body.apiKey = apiKey;
    }
    
    const response = await this.request<{ sessionId: string; model: string }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.setSessionId(response.sessionId);
    return response;
  }

  async listModels(
    provider: 'openai' | 'bedrock',
    credentials: {
      apiKey?: string;
      awsAccessKeyId?: string;
      awsSecretAccessKey?: string;
      awsSessionToken?: string;
      awsRegion?: string;
      useRegionalInference?: boolean;
      regionalInferenceEndpoint?: string;
    }
  ): Promise<{ models: Array<{ 
    id: string; 
    created: number; 
    ownedBy: string;
    supportsOnDemand?: boolean;
    requiresProvisioned?: boolean;
    isInferenceProfile?: boolean;
    modelType?: 'foundation' | 'inference-profile';
  }> }> {
    const headers: Record<string, string> = {};
    
    if (provider === 'openai') {
      if (!credentials.apiKey) {
        throw new Error('API key is required for OpenAI');
      }
      headers['X-API-Key'] = credentials.apiKey;
    } else if (provider === 'bedrock') {
      if (!credentials.awsAccessKeyId || !credentials.awsSecretAccessKey) {
        throw new Error('AWS credentials are required for Bedrock');
      }
      headers['x-aws-access-key-id'] = credentials.awsAccessKeyId;
      headers['x-aws-secret-access-key'] = credentials.awsSecretAccessKey;
      if (credentials.awsSessionToken) {
        headers['x-aws-session-token'] = credentials.awsSessionToken;
      }
      if (credentials.awsRegion) {
        headers['x-aws-region'] = credentials.awsRegion;
      }
      if (credentials.useRegionalInference) {
        headers['x-use-regional-inference'] = 'true';
      }
      if (credentials.regionalInferenceEndpoint) {
        headers['x-regional-inference-endpoint'] = credentials.regionalInferenceEndpoint;
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/public/models?provider=${provider}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to list models' }));
      const apiError: ApiError = {
        message: errorData.message || 'Failed to list models',
        status: response.status,
      };
      throw apiError;
    }

    return await response.json();
  }

  async getSession(sessionId: string): Promise<any> {
    return this.request(`/api/sessions/${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.request(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    this.clearSession();
  }

  // Process submission
  async submitProcess(description: string, subject?: string): Promise<any> {
    if (!this.sessionId) {
      const error: ApiError = { message: 'No active session', status: 400 };
      throw error;
    }
    if (!this.llmConfig) {
      const error: ApiError = { message: 'No LLM configuration set', status: 401 };
      throw error;
    }

    const body: any = {
      description,
      sessionId: this.sessionId,
      model: this.llmConfig.model,
      provider: this.llmConfig.provider,
    };

    // Add subject if provided
    if (subject) {
      body.subject = subject;
    }

    if (this.llmConfig.provider === 'openai') {
      body.apiKey = this.llmConfig.apiKey;
    } else {
      body.awsAccessKeyId = this.llmConfig.awsAccessKeyId;
      body.awsSecretAccessKey = this.llmConfig.awsSecretAccessKey;
      body.awsSessionToken = this.llmConfig.awsSessionToken;
      body.awsRegion = this.llmConfig.awsRegion;
    }

    return this.request('/api/process/submit', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Conversation endpoints
  async addConversation(responses: string | string[], questions?: string[]): Promise<any> {
    if (!this.sessionId) {
      const error: ApiError = { message: 'No active session', status: 400 };
      throw error;
    }
    if (!this.llmConfig) {
      const error: ApiError = { message: 'No LLM configuration set', status: 401 };
      throw error;
    }

    // Convert single response to array for consistency
    const answers = Array.isArray(responses) ? responses : [responses];

    const body: any = {
      sessionId: this.sessionId,
      answers,
      questions: questions || [], // Send the questions that were asked
      model: this.llmConfig.model,
      provider: this.llmConfig.provider,
    };

    if (this.llmConfig.provider === 'openai') {
      body.apiKey = this.llmConfig.apiKey;
    } else {
      body.awsAccessKeyId = this.llmConfig.awsAccessKeyId;
      body.awsSecretAccessKey = this.llmConfig.awsSecretAccessKey;
      body.awsSessionToken = this.llmConfig.awsSessionToken;
      body.awsRegion = this.llmConfig.awsRegion;
    }

    return this.request('/api/process/clarify', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Force classification (skip interview)
  async forceClassification(): Promise<any> {
    if (!this.sessionId) {
      const error: ApiError = { message: 'No active session', status: 400 };
      throw error;
    }
    if (!this.llmConfig) {
      const error: ApiError = { message: 'No LLM configuration set', status: 401 };
      throw error;
    }

    const body: any = {
      sessionId: this.sessionId,
      model: this.llmConfig.model,
      provider: this.llmConfig.provider,
      forceClassify: true, // Skip clarification and force classification
    };

    if (this.llmConfig.provider === 'openai') {
      body.apiKey = this.llmConfig.apiKey;
    } else {
      body.awsAccessKeyId = this.llmConfig.awsAccessKeyId;
      body.awsSecretAccessKey = this.llmConfig.awsSecretAccessKey;
      body.awsSessionToken = this.llmConfig.awsSessionToken;
      body.awsRegion = this.llmConfig.awsRegion;
    }

    return this.request('/api/process/classify', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Feedback endpoints
  async submitClassificationFeedback(
    confirmed: boolean,
    correctedCategory?: string
  ): Promise<void> {
    if (!this.sessionId) {
      const error: ApiError = { message: 'No active session', status: 400 };
      throw error;
    }
    await this.request('/api/feedback/classification', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: this.sessionId,
        confirmed,
        correctedCategory,
      }),
    });
  }

  async submitRating(rating: 'up' | 'down', comments?: string): Promise<void> {
    if (!this.sessionId) {
      const error: ApiError = { message: 'No active session', status: 400 };
      throw error;
    }
    await this.request('/api/feedback/rating', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: this.sessionId,
        rating,
        comments,
      }),
    });
  }

  // Voice endpoints
  async transcribeAudio(audioFile: File): Promise<{ transcription: string }> {
    if (!this.llmConfig) {
      const error: ApiError = { message: 'No LLM configuration available. Please configure your provider in the Configuration tab.', status: 401 };
      throw error;
    }

    if (!this.sessionId) {
      const error: ApiError = { message: 'No active session. Please reconfigure your LLM provider in the Configuration tab.', status: 400 };
      throw error;
    }

    console.log('Transcribing audio with:', {
      provider: this.llmConfig.provider,
      hasSessionId: !!this.sessionId,
      sessionId: this.sessionId
    });

    // Use WebSocket for Bedrock (Nova 2 Sonic), HTTP for OpenAI
    if (this.llmConfig.provider === 'bedrock') {
      return this.transcribeAudioWithNovaSonic(audioFile);
    } else {
      return this.transcribeAudioWithHTTP(audioFile);
    }
  }

  /**
   * Transcribe audio using Nova 2 Sonic WebSocket (for Bedrock)
   */
  private async transcribeAudioWithNovaSonic(audioFile: File): Promise<{ transcription: string }> {
    const { novaSonicService } = await import('./nova-sonic-websocket.service');
    
    if (!this.llmConfig || this.llmConfig.provider !== 'bedrock') {
      throw new Error('Bedrock configuration required for Nova 2 Sonic');
    }

    if (!this.llmConfig.awsAccessKeyId || !this.llmConfig.awsSecretAccessKey) {
      const error: ApiError = { message: 'No AWS credentials configured. Please reconfigure your provider.', status: 401 };
      throw error;
    }

    try {
      // Connect to Nova 2 Sonic if not already connected
      if (!novaSonicService.isConnectedToNovaSonic()) {
        await novaSonicService.connect({
          awsAccessKeyId: this.llmConfig.awsAccessKeyId,
          awsSecretAccessKey: this.llmConfig.awsSecretAccessKey,
          awsSessionToken: this.llmConfig.awsSessionToken,
          awsRegion: this.llmConfig.awsRegion || 'us-east-1',
          systemPrompt: 'You are a helpful assistant for voice transcription and conversation.',
          userId: 'voice-user'
        });
      }

      // Process audio file through WebSocket
      const result = await novaSonicService.processAudioFile(audioFile);
      
      if (!result.transcription || result.transcription.length < 10) {
        throw new Error('Transcription too short (minimum 10 characters). Please speak more clearly.');
      }

      return result;

    } catch (error) {
      console.error('[Nova 2 Sonic] Transcription error:', error);
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('ValidationException') && error.message.includes('model ID is not supported')) {
          const region = this.llmConfig.awsRegion || 'us-east-1';
          throw new Error(
            `Nova 2 Sonic is not available in region '${region}'. ` +
            `Supported regions: us-east-1, us-west-2, ap-northeast-1, eu-north-1. ` +
            `Please change your AWS region in the Configuration tab.`
          );
        }
        
        if (error.message.includes('AccessDeniedException')) {
          throw new Error(
            `Access denied to Nova 2 Sonic. Please ensure you have the required IAM permissions ` +
            `and that Nova 2 Sonic access has been granted to your AWS account.`
          );
        }
      }
      
      throw error;
    }
  }

  /**
   * Transcribe audio using HTTP API (for OpenAI)
   */
  private async transcribeAudioWithHTTP(audioFile: File): Promise<{ transcription: string }> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('sessionId', this.sessionId!);
    formData.append('provider', this.llmConfig!.provider);
    
    // Add provider-specific credentials
    if (this.llmConfig!.provider === 'openai') {
      const apiKey = this.apiKey || this.llmConfig!.apiKey;
      if (!apiKey) {
        const error: ApiError = { message: 'No OpenAI API key configured. Please reconfigure your provider.', status: 401 };
        throw error;
      }
      formData.append('apiKey', apiKey);
    } else if (this.llmConfig!.provider === 'bedrock') {
      if (!this.llmConfig!.awsAccessKeyId || !this.llmConfig!.awsSecretAccessKey) {
        const error: ApiError = { message: 'No AWS credentials configured. Please reconfigure your provider.', status: 401 };
        throw error;
      }
      formData.append('awsAccessKeyId', this.llmConfig!.awsAccessKeyId);
      formData.append('awsSecretAccessKey', this.llmConfig!.awsSecretAccessKey);
      if (this.llmConfig!.awsSessionToken) {
        formData.append('awsSessionToken', this.llmConfig!.awsSessionToken);
      }
      formData.append('awsRegion', this.llmConfig!.awsRegion || 'us-east-1');
    }

    // Get auth token for protected endpoint
    const token = this.getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Transcription failed' }));
      console.error('Transcription API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      const apiError: ApiError = {
        message: errorData.message || errorData.error || 'Transcription failed',
        status: response.status,
      };
      throw apiError;
    }

    return await response.json();
  }

  async synthesizeSpeech(text: string, voice?: string): Promise<Blob> {
    if (!this.llmConfig) {
      const error: ApiError = { message: 'No LLM configuration available. Please configure your provider in the Configuration tab.', status: 401 };
      throw error;
    }

    if (!this.sessionId) {
      const error: ApiError = { message: 'No active session. Please reconfigure your LLM provider in the Configuration tab.', status: 400 };
      throw error;
    }

    // Get auth token for protected endpoint
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const requestBody: any = {
      text,
      sessionId: this.sessionId,
      provider: this.llmConfig.provider,
      voice: voice || (this.llmConfig.provider === 'bedrock' ? 'nova-sonic' : 'alloy')
    };

    // Add provider-specific credentials
    if (this.llmConfig.provider === 'openai') {
      const apiKey = this.apiKey || this.llmConfig.apiKey;
      if (!apiKey) {
        const error: ApiError = { message: 'No OpenAI API key configured. Please reconfigure your provider.', status: 401 };
        throw error;
      }
      requestBody.apiKey = apiKey;
    } else if (this.llmConfig.provider === 'bedrock') {
      if (!this.llmConfig.awsAccessKeyId || !this.llmConfig.awsSecretAccessKey) {
        const error: ApiError = { message: 'No AWS credentials configured. Please reconfigure your provider.', status: 401 };
        throw error;
      }
      requestBody.awsAccessKeyId = this.llmConfig.awsAccessKeyId;
      requestBody.awsSecretAccessKey = this.llmConfig.awsSecretAccessKey;
      if (this.llmConfig.awsSessionToken) {
        requestBody.awsSessionToken = this.llmConfig.awsSessionToken;
      }
      requestBody.awsRegion = this.llmConfig.awsRegion || 'us-east-1';
    }

    const response = await fetch(`${API_BASE_URL}/api/voice/synthesize`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const apiError: ApiError = {
        message: 'Speech synthesis failed',
        status: response.status,
      };
      throw apiError;
    }

    return await response.blob();
  }

  // Analytics endpoints
  async getAnalytics(): Promise<any> {
    const response = await this.request<any>('/api/analytics/dashboard');
    return response.metrics || response;
  }

  // Decision Matrix endpoints
  async getDecisionMatrix(): Promise<any> {
    return this.request('/api/decision-matrix');
  }

  async getDecisionMatrixVersions(): Promise<any> {
    return this.request('/api/decision-matrix/versions');
  }

  async getDecisionMatrixVersion(version: string): Promise<any> {
    return this.request(`/api/decision-matrix/${version}`);
  }

  async updateDecisionMatrix(matrix: any): Promise<any> {
    return this.request('/api/decision-matrix', {
      method: 'PUT',
      body: JSON.stringify(matrix),
    });
  }

  async generateDecisionMatrix(): Promise<any> {
    // Check if we have either OpenAI API key or Bedrock credentials
    if (!this.apiKey && !this.llmConfig) {
      const error: ApiError = { message: 'No API key or credentials set', status: 401 };
      throw error;
    }

    // Build request body based on provider
    const body: any = {};
    
    if (this.llmConfig) {
      // Use LLM config (supports both OpenAI and Bedrock)
      body.provider = this.llmConfig.provider;
      body.model = this.llmConfig.model;
      
      if (this.llmConfig.provider === 'bedrock') {
        body.awsAccessKeyId = this.llmConfig.awsAccessKeyId;
        body.awsSecretAccessKey = this.llmConfig.awsSecretAccessKey;
        body.awsSessionToken = this.llmConfig.awsSessionToken;
        body.awsRegion = this.llmConfig.awsRegion;
      } else {
        body.apiKey = this.llmConfig.apiKey || this.apiKey;
      }
    } else {
      // Fallback to legacy OpenAI-only mode
      body.apiKey = this.apiKey;
    }

    return this.request('/api/decision-matrix/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async exportDecisionMatrix(version?: string): Promise<Blob> {
    const params = version ? `?version=${version}` : '';
    const token = this.getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/decision-matrix/export${params}`,
      { headers }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Export failed' }));
      const apiError: ApiError = {
        message: errorData.message || 'Export failed',
        status: response.status,
      };
      throw apiError;
    }

    return await response.blob();
  }

  async exportAllDecisionMatrixVersions(): Promise<Blob> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/decision-matrix/export/all-versions`,
      { headers }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Export failed' }));
      const apiError: ApiError = {
        message: errorData.message || 'Export failed',
        status: response.status,
      };
      throw apiError;
    }

    return await response.blob();
  }

  async importDecisionMatrix(matrixData: any, replaceExisting: boolean = false): Promise<any> {
    return this.request('/api/decision-matrix/import', {
      method: 'POST',
      body: JSON.stringify({
        matrix: matrixData,
        replaceExisting,
        userId: sessionStorage.getItem('username') || 'admin'
      }),
    });
  }

  // Learning endpoints
  async getSuggestions(): Promise<any> {
    const response = await this.request<any>('/api/learning/suggestions');
    // Backend returns { suggestions: [...], count: N }, but frontend expects array
    return response.suggestions || response;
  }

  async approveSuggestion(suggestionId: string): Promise<void> {
    await this.request(`/api/learning/suggestions/${suggestionId}/approve`, {
      method: 'POST',
    });
  }

  async rejectSuggestion(suggestionId: string, notes?: string): Promise<void> {
    await this.request(`/api/learning/suggestions/${suggestionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async triggerAnalysis(options: {
    startDate?: string;
    endDate?: string;
    misclassificationsOnly?: boolean;
  } = {}): Promise<any> {
    if (!this.llmConfig) {
      const error: ApiError = { message: 'No LLM configuration set. Please configure your provider in the Configuration tab.', status: 400 };
      throw error;
    }

    const body: any = {
      provider: this.llmConfig.provider,
      model: this.llmConfig.model,
      userId: sessionStorage.getItem('username') || 'admin',
      misclassificationsOnly: options.misclassificationsOnly ?? true
    };

    if (options.startDate) body.startDate = options.startDate;
    if (options.endDate) body.endDate = options.endDate;

    if (this.llmConfig.provider === 'openai') {
      if (!this.llmConfig.apiKey) {
        const error: ApiError = { message: 'OpenAI API key not found. Please reconfigure in the Configuration tab.', status: 400 };
        throw error;
      }
      body.apiKey = this.llmConfig.apiKey;
    } else if (this.llmConfig.provider === 'bedrock') {
      body.awsAccessKeyId = this.llmConfig.awsAccessKeyId;
      body.awsSecretAccessKey = this.llmConfig.awsSecretAccessKey;
      body.awsSessionToken = this.llmConfig.awsSessionToken;
      body.awsRegion = this.llmConfig.awsRegion;
    }

    const response = await this.request<any>('/api/learning/analyze', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    // Backend returns { message, analysis, suggestions, suggestionCount }
    // Return just the analysis object
    return response.analysis;
  }

  // Prompt endpoints
  async getPrompts(): Promise<any> {
    const response = await this.request<any>('/api/prompts');
    // Backend returns { prompts: [...], count: N }, but frontend expects array with name and updatedAt
    const prompts = response.prompts || response;
    return prompts.map((p: any) => ({
      id: p.id,
      name: this.formatPromptName(p.id),
      content: p.content,
      version: p.version,
      updatedAt: new Date().toISOString() // Backend doesn't track this
    }));
  }

  async getPrompt(id: string): Promise<any> {
    const response = await this.request<any>(`/api/prompts/${id}`);
    // Backend returns { id, content, version, ... }, frontend expects { id, name, content, version, updatedAt }
    return {
      id: response.id,
      name: this.formatPromptName(response.id),
      content: response.content,
      version: response.version,
      updatedAt: new Date().toISOString() // Backend doesn't return this, use current time
    };
  }

  async updatePrompt(id: string, content: string): Promise<any> {
    const response = await this.request<any>(`/api/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
    // Backend returns { message, promptId, version, createdAt, createdBy }
    return {
      id: response.promptId || id,
      name: this.formatPromptName(response.promptId || id),
      content: content,
      version: response.version,
      updatedAt: response.createdAt || new Date().toISOString()
    };
  }

  // Audit endpoints
  async getAuditLogs(date?: string): Promise<any> {
    const dateParam = date || new Date().toISOString().split('T')[0];
    const response = await this.request<any>(`/api/audit/logs?date=${dateParam}`);
    return response.logs || [];
  }

  async getAuditLogsBySession(sessionId: string): Promise<any> {
    const response = await this.request<any>(`/api/audit/logs/${sessionId}`);
    return response.logs || [];
  }

  async getAvailableAuditDates(): Promise<string[]> {
    const response = await this.request<any>('/api/audit/dates');
    return response.dates || [];
  }

  private formatPromptName(id: string): string {
    return id.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  // User Management endpoints
  async getUsers(): Promise<any[]> {
    const response = await this.request<any>('/api/auth/users');
    return response.users || [];
  }

  async changeUserRole(userId: string, newRole: 'admin' | 'user'): Promise<void> {
    await this.request(`/api/auth/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    await this.request(`/api/auth/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword })
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.request(`/api/auth/users/${userId}`, {
      method: 'DELETE'
    });
  }

  // Subjects endpoints
  async getSubjects(): Promise<string[]> {
    const response = await this.request<{ subjects: string[]; count: number }>('/api/subjects');
    return response.subjects || [];
  }

  async addCustomSubject(subject: string): Promise<void> {
    await this.request('/api/subjects', {
      method: 'POST',
      body: JSON.stringify({ subject })
    });
  }

  async removeCustomSubject(subject: string): Promise<void> {
    await this.request(`/api/subjects/${encodeURIComponent(subject)}`, {
      method: 'DELETE'
    });
  }

  // Enhanced Analytics endpoints
  async getSessionsList(
    filters: any,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.category) params.append('category', filters.category);
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.model) params.append('model', filters.model);
    if (filters.status) params.append('status', filters.status);
    if (filters.searchText) params.append('searchText', filters.searchText);

    return this.request(`/api/analytics/sessions?${params.toString()}`);
  }

  async getSessionDetail(sessionId: string): Promise<any> {
    return this.request(`/api/analytics/sessions/${sessionId}`);
  }

  async getFilterOptions(): Promise<any> {
    return this.request('/api/analytics/filters/options');
  }

  async exportSessionsCSV(filters: any): Promise<Blob> {
    const params = new URLSearchParams();

    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.category) params.append('category', filters.category);
    if (filters.subject) params.append('subject', filters.subject);
    if (filters.model) params.append('model', filters.model);
    if (filters.status) params.append('status', filters.status);
    if (filters.searchText) params.append('searchText', filters.searchText);

    const token = this.getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/analytics/sessions/export?${params.toString()}`,
      { headers }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Export failed' }));
      const apiError: ApiError = {
        message: errorData.message || 'Export failed',
        status: response.status,
      };
      throw apiError;
    }

    return await response.blob();
  }

  // Matrix validation endpoints
  async validateMatrix(options: {
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any> {
    if (!this.llmConfig) {
      throw new Error('LLM configuration not set');
    }

    const body: any = {
      provider: this.llmConfig.provider,
      model: this.llmConfig.model,
      userId: sessionStorage.getItem('username') || 'admin'
    };

    if (options.startDate) body.startDate = options.startDate;
    if (options.endDate) body.endDate = options.endDate;

    // Add credentials based on provider
    if (this.llmConfig.provider === 'openai') {
      body.apiKey = this.llmConfig.apiKey;
    } else {
      body.awsAccessKeyId = this.llmConfig.awsAccessKeyId;
      body.awsSecretAccessKey = this.llmConfig.awsSecretAccessKey;
      body.awsSessionToken = this.llmConfig.awsSessionToken;
      body.awsRegion = this.llmConfig.awsRegion;
    }

    const response = await this.request<any>('/api/learning/validate-matrix', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return response.result;
  }

  async getValidationTests(): Promise<any[]> {
    const response = await this.request<any>('/api/learning/validation-tests');
    return response.tests || [];
  }

  async getValidationTest(testId: string): Promise<any> {
    return this.request(`/api/learning/validation-tests/${testId}`);
  }

  // Admin Review Methods

  async getPendingReviews(page: number = 1, limit: number = 20): Promise<{
    sessions: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.request(`/api/admin/pending-reviews?page=${page}&limit=${limit}`);
  }

  async submitAdminReview(
    sessionId: string,
    approved: boolean,
    correctedCategory?: string,
    reviewNotes?: string
  ): Promise<void> {
    await this.request(`/api/admin/review/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify({
        approved,
        correctedCategory,
        reviewNotes,
        userId: sessionStorage.getItem('username') || 'admin'
      })
    });
  }

  async getAdminReviewStats(): Promise<{
    pendingCount: number;
    reviewedCount: number;
    approvedCount: number;
    correctedCount: number;
    approvalRate: number;
  }> {
    return this.request('/api/admin/review-stats');
  }
}

export const apiService = new ApiService();
