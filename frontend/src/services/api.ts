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
  }

  getLLMConfig(): LLMConfig | null {
    return this.llmConfig;
  }

  clearSession() {
    this.apiKey = null;
    this.sessionId = null;
    this.llmConfig = null;
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
        throw {
          message: 'Authentication required. Please login again.',
          status: response.status,
        } as ApiError;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        throw {
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        } as ApiError;
      }

      return await response.json();
    } catch (error) {
      if ((error as ApiError).status) {
        throw error;
      }
      throw {
        message: 'Network error. Please check your connection.',
        status: 0,
      } as ApiError;
    }
  }

  // Session endpoints
  async createSession(apiKey: string, model?: string): Promise<{ sessionId: string; model: string }> {
    this.setApiKey(apiKey);
    const response = await this.request<{ sessionId: string; model: string }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ apiKey, model }),
    });
    this.setSessionId(response.sessionId);
    return response;
  }

  async listModels(apiKey: string): Promise<{ models: Array<{ id: string; created: number; ownedBy: string }> }> {
    const response = await fetch(`${API_BASE_URL}/api/sessions/models`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to list models' }));
      throw {
        message: errorData.message || 'Failed to list models',
        status: response.status,
      } as ApiError;
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
  async submitProcess(description: string): Promise<any> {
    if (!this.sessionId) {
      throw { message: 'No active session', status: 400 } as ApiError;
    }
    if (!this.llmConfig) {
      throw { message: 'No LLM configuration set', status: 401 } as ApiError;
    }

    const body: any = {
      description,
      sessionId: this.sessionId,
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

    return this.request('/api/process/submit', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Conversation endpoints
  async addConversation(response: string): Promise<any> {
    if (!this.sessionId) {
      throw { message: 'No active session', status: 400 } as ApiError;
    }
    if (!this.llmConfig) {
      throw { message: 'No LLM configuration set', status: 401 } as ApiError;
    }

    const body: any = {
      sessionId: this.sessionId,
      answers: [response],
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

  // Feedback endpoints
  async submitClassificationFeedback(
    confirmed: boolean,
    correctedCategory?: string
  ): Promise<void> {
    if (!this.sessionId) {
      throw { message: 'No active session', status: 400 } as ApiError;
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
      throw { message: 'No active session', status: 400 } as ApiError;
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
    if (!this.apiKey) {
      throw { message: 'No API key set', status: 401 } as ApiError;
    }

    if (!this.sessionId) {
      throw { message: 'No active session', status: 400 } as ApiError;
    }

    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('apiKey', this.apiKey);
    formData.append('sessionId', this.sessionId);

    const response = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Transcription failed' }));
      throw {
        message: errorData.message || 'Transcription failed',
        status: response.status,
      } as ApiError;
    }

    return await response.json();
  }

  async synthesizeSpeech(text: string): Promise<Blob> {
    if (!this.apiKey) {
      throw { message: 'No API key set', status: 401 } as ApiError;
    }

    if (!this.sessionId) {
      throw { message: 'No active session', status: 400 } as ApiError;
    }

    const response = await fetch(`${API_BASE_URL}/api/voice/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text,
        apiKey: this.apiKey,
        sessionId: this.sessionId
      }),
    });

    if (!response.ok) {
      throw {
        message: 'Speech synthesis failed',
        status: response.status,
      } as ApiError;
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
    if (!this.apiKey) {
      throw { message: 'No API key set', status: 401 } as ApiError;
    }
    return this.request('/api/decision-matrix/generate', {
      method: 'POST',
      body: JSON.stringify({ apiKey: this.apiKey }),
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

  async triggerAnalysis(): Promise<any> {
    if (!this.llmConfig) {
      throw { message: 'No LLM configuration set. Please configure your provider in the Configuration tab.', status: 400 } as ApiError;
    }

    const body: any = {
      provider: this.llmConfig.provider,
      model: this.llmConfig.model,
    };

    if (this.llmConfig.provider === 'openai') {
      if (!this.llmConfig.apiKey) {
        throw { message: 'OpenAI API key not found. Please reconfigure in the Configuration tab.', status: 400 } as ApiError;
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
}

export const apiService = new ApiService();
