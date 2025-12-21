import { randomUUID } from 'crypto';
import { JsonStorageService } from './storage.service';
import { Session, SessionSchema, Conversation } from '../types';

/**
 * Session storage service with ID generation and error handling
 */
export class SessionStorageService {
  private jsonStorage: JsonStorageService;
  private sessionCache: Map<string, Session>;

  constructor(jsonStorage: JsonStorageService) {
    this.jsonStorage = jsonStorage;
    this.sessionCache = new Map();
  }

  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    return randomUUID();
  }

  /**
   * Generate a new conversation ID
   */
  generateConversationId(): string {
    return randomUUID();
  }

  /**
   * Create a new session
   */
  async createSession(initiativeId: string, modelUsed: string): Promise<Session> {
    const sessionId = this.generateSessionId();
    const now = new Date().toISOString();

    const session: Session = {
      sessionId,
      initiativeId,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      modelUsed,
      conversations: []
    };

    await this.saveSession(session);
    return session;
  }

  /**
   * Save a session to storage
   */
  async saveSession(session: Session): Promise<void> {
    try {
      // Validate session data
      SessionSchema.parse(session);

      // Update timestamp
      session.updatedAt = new Date().toISOString();

      // Save to file
      const relativePath = `sessions/${session.sessionId}.json`;
      await this.jsonStorage.writeJson(relativePath, session);

      // Update cache
      this.sessionCache.set(session.sessionId, session);
    } catch (error) {
      console.error('Failed to save session:', error);
      throw new Error(`Failed to save session ${session.sessionId}: ${error}`);
    }
  }

  /**
   * Load a session from storage
   */
  async loadSession(sessionId: string): Promise<Session | null> {
    // Check cache first
    if (this.sessionCache.has(sessionId)) {
      return this.sessionCache.get(sessionId)!;
    }

    const relativePath = `sessions/${sessionId}.json`;
    
    try {
      const exists = await this.jsonStorage.exists(relativePath);
      if (!exists) {
        return null;
      }

      const sessionData = await this.jsonStorage.readJson<Session>(relativePath);
      
      // Validate session data
      const session = SessionSchema.parse(sessionData);

      // Cache the session
      this.sessionCache.set(sessionId, session);

      return session;
    } catch (error: any) {
      // Handle corrupted file errors gracefully
      if (error.name === 'SyntaxError' || error.name === 'ZodError') {
        console.error(`Corrupted session file for ${sessionId}:`, error);
        throw new Error(`Session file ${sessionId} is corrupted and cannot be loaded`);
      }
      
      console.error('Failed to load session:', error);
      throw error;
    }
  }

  /**
   * Update an existing session
   */
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
    const session = await this.loadSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Apply updates
    const updatedSession: Session = {
      ...session,
      ...updates,
      sessionId, // Ensure sessionId cannot be changed
      updatedAt: new Date().toISOString()
    };

    await this.saveSession(updatedSession);
    return updatedSession;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const relativePath = `sessions/${sessionId}.json`;
    
    try {
      await this.jsonStorage.delete(relativePath);
      this.sessionCache.delete(sessionId);
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw new Error(`Failed to delete session ${sessionId}: ${error}`);
    }
  }

  /**
   * List all session IDs
   */
  async listSessions(): Promise<string[]> {
    try {
      const files = await this.jsonStorage.listFiles('sessions');
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort()
        .reverse(); // Most recent first (by UUID timestamp component)
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  }

  /**
   * Get all sessions (for admin review)
   */
  async getAllSessions(): Promise<Session[]> {
    try {
      const sessionIds = await this.listSessions();
      const sessions: Session[] = [];
      
      for (const sessionId of sessionIds) {
        try {
          const session = await this.loadSession(sessionId);
          if (session) {
            sessions.push(session);
          }
        } catch (error) {
          console.error(`Failed to load session ${sessionId}:`, error);
          // Continue with other sessions
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      return [];
    }
  }

  /**
   * Check if a session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    if (this.sessionCache.has(sessionId)) {
      return true;
    }

    const relativePath = `sessions/${sessionId}.json`;
    return await this.jsonStorage.exists(relativePath);
  }

  /**
   * Clear the session cache
   */
  clearCache(): void {
    this.sessionCache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.sessionCache.size;
  }

  /**
   * Add a new conversation to a session
   * @param sessionId - Session ID
   * @param processDescription - Process description for this conversation
   * @returns Updated session with new conversation
   */
  async addConversation(
    sessionId: string,
    processDescription: string
  ): Promise<Session> {
    const session = await this.loadSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const conversation: Conversation = {
      conversationId: this.generateConversationId(),
      timestamp: new Date().toISOString(),
      processDescription,
      clarificationQA: []
    };

    session.conversations.push(conversation);
    await this.saveSession(session);
    
    return session;
  }

  /**
   * Add a clarification Q&A pair to the most recent conversation
   * @param sessionId - Session ID
   * @param question - Clarification question
   * @param answer - User's answer
   * @returns Updated session
   */
  async addClarificationQA(
    sessionId: string,
    question: string,
    answer: string
  ): Promise<Session> {
    const session = await this.loadSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.conversations.length === 0) {
      throw new Error(`No conversations found in session ${sessionId}`);
    }

    // Add to the most recent conversation
    const currentConversation = session.conversations[session.conversations.length - 1];
    currentConversation.clarificationQA.push({ question, answer });

    await this.saveSession(session);
    
    return session;
  }

  /**
   * Get all clarification Q&A pairs from the current conversation
   * @param sessionId - Session ID
   * @returns Array of Q&A pairs
   */
  async getCurrentConversationQA(
    sessionId: string
  ): Promise<Array<{ question: string; answer: string }>> {
    const session = await this.loadSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.conversations.length === 0) {
      return [];
    }

    const currentConversation = session.conversations[session.conversations.length - 1];
    return currentConversation.clarificationQA;
  }

  /**
   * Get all conversation history for context memory
   * @param sessionId - Session ID
   * @returns Array of all conversations with their Q&A pairs
   */
  async getConversationHistory(sessionId: string): Promise<Conversation[]> {
    const session = await this.loadSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return session.conversations;
  }

  /**
   * Get the current (most recent) conversation
   * @param sessionId - Session ID
   * @returns Current conversation or null if no conversations exist
   */
  async getCurrentConversation(sessionId: string): Promise<Conversation | null> {
    const session = await this.loadSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.conversations.length === 0) {
      return null;
    }

    return session.conversations[session.conversations.length - 1];
  }

  /**
   * Build classification context from all conversations
   * Combines all process descriptions and Q&A pairs for context memory
   * @param sessionId - Session ID
   * @returns Combined context string
   */
  async buildClassificationContext(sessionId: string): Promise<string> {
    const conversations = await this.getConversationHistory(sessionId);
    
    if (conversations.length === 0) {
      return '';
    }

    let context = '';
    
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      
      if (i > 0) {
        context += '\n\n--- Previous Conversation ---\n';
      }
      
      context += `Process Description: ${conv.processDescription}\n`;
      
      if (conv.clarificationQA.length > 0) {
        context += '\nClarification Q&A:\n';
        for (const qa of conv.clarificationQA) {
          context += `Q: ${qa.question}\nA: ${qa.answer}\n`;
        }
      }
    }
    
    return context;
  }
}
