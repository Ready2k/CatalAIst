// API service for backend communication

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export interface ApiError {
  message: string;
  status: number;
}

class ApiService {
  private apiKey: string | null = null;
  private sessionId: string | null = null;

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

  clearSession() {
    this.apiKey = null;
    this.sessionId = null;
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

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

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
    if (!this.apiKey) {
      throw { message: 'No API key set', status: 401 } as ApiError;
    }
    return this.request('/api/process/submit', {
      method: 'POST',
      body: JSON.stringify({
        description,
        sessionId: this.sessionId,
        apiKey: this.apiKey,
      }),
    });
  }

  // Conversation endpoints
  async addConversation(response: string): Promise<any> {
    if (!this.sessionId) {
      throw { message: 'No active session', status: 400 } as ApiError;
    }
    if (!this.apiKey) {
      throw { message: 'No API key set', status: 401 } as ApiError;
    }
    return this.request('/api/process/clarify', {
      method: 'POST',
      body: JSON.stringify({ 
        sessionId: this.sessionId,
        answers: [response],
        apiKey: this.apiKey
      }),
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
    return this.request('/api/learning/analyze', {
      method: 'POST',
    });
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
}

export const apiService = new ApiService();
