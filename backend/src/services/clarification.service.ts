import { OpenAIService, ChatMessage } from './openai.service';
import { VersionedStorageService } from './versioned-storage.service';
import { JsonStorageService } from './storage.service';
import { ClassificationResult } from './classification.service';

export interface ClarificationQuestion {
  question: string;
  purpose: string; // What attribute or aspect this question aims to clarify
}

export interface ClarificationRequest {
  processDescription: string;
  classification: ClassificationResult;
  conversationHistory: Array<{ question: string; answer: string }>;
  apiKey: string;
  model?: string;
}

export interface ClarificationResponse {
  questions: ClarificationQuestion[];
  shouldClarify: boolean;
  reason: string;
}

/**
 * Service for generating and managing clarification questions
 */
export class ClarificationService {
  private openAIService: OpenAIService;
  private versionedStorage: VersionedStorageService;
  private readonly DEFAULT_MODEL = 'gpt-4';
  private readonly CLARIFICATION_PROMPT_ID = 'clarification';
  private readonly MAX_QUESTIONS_PER_SESSION = 5;
  private readonly MIN_QUESTIONS = 1;
  private readonly MAX_QUESTIONS = 2;

  constructor(versionedStorage?: VersionedStorageService) {
    this.openAIService = new OpenAIService();
    this.versionedStorage = versionedStorage || new VersionedStorageService(new JsonStorageService());
  }

  /**
   * Generate clarifying questions based on classification confidence
   * @param request - Clarification request with process description and classification
   * @returns Clarification response with questions or skip signal
   */
  async generateQuestions(request: ClarificationRequest): Promise<ClarificationResponse> {
    try {
      // Check if we've reached the question limit
      const questionCount = request.conversationHistory.length;
      if (questionCount >= this.MAX_QUESTIONS_PER_SESSION) {
        return {
          questions: [],
          shouldClarify: false,
          reason: `Maximum question limit (${this.MAX_QUESTIONS_PER_SESSION}) reached`
        };
      }

      // Check confidence level to determine if clarification is needed
      const confidence = request.classification.confidence;
      
      if (confidence > 0.85) {
        return {
          questions: [],
          shouldClarify: false,
          reason: 'High confidence classification (>0.85), no clarification needed'
        };
      }

      if (confidence < 0.6) {
        return {
          questions: [],
          shouldClarify: false,
          reason: 'Low confidence classification (<0.6), flagged for manual review'
        };
      }

      // Generate clarification questions for medium confidence (0.6-0.85)
      const model = request.model || this.DEFAULT_MODEL;
      const messages = await this.buildClarificationMessages(
        request.processDescription,
        request.classification,
        request.conversationHistory,
        model
      );

      const response = await this.openAIService.chat(
        messages,
        model,
        request.apiKey
      );

      const questions = this.parseClarificationResponse(response.content);

      return {
        questions,
        shouldClarify: questions.length > 0,
        reason: `Medium confidence (${confidence.toFixed(2)}), generating ${questions.length} clarifying question(s)`
      };
    } catch (error) {
      throw new Error(
        `Failed to generate clarification questions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if more questions can be asked in this session
   * @param conversationHistory - Current conversation history
   * @returns True if more questions can be asked
   */
  canAskMoreQuestions(conversationHistory: Array<{ question: string; answer: string }>): boolean {
    return conversationHistory.length < this.MAX_QUESTIONS_PER_SESSION;
  }

  /**
   * Get remaining question count for session
   * @param conversationHistory - Current conversation history
   * @returns Number of questions remaining
   */
  getRemainingQuestionCount(conversationHistory: Array<{ question: string; answer: string }>): number {
    return Math.max(0, this.MAX_QUESTIONS_PER_SESSION - conversationHistory.length);
  }

  /**
   * Build chat messages for clarification question generation
   */
  private async buildClarificationMessages(
    processDescription: string,
    classification: ClassificationResult,
    conversationHistory: Array<{ question: string; answer: string }>,
    model: string
  ): Promise<ChatMessage[]> {
    const isO1Model = model.startsWith('o1');
    const systemPrompt = await this.getClarificationSystemPrompt();
    
    const messages: ChatMessage[] = [];

    if (!isO1Model) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Build context with process description, classification, and conversation history
    let context = `Process Description:\n${processDescription}\n\n`;
    context += `Current Classification:\n`;
    context += `- Category: ${classification.category}\n`;
    context += `- Confidence: ${classification.confidence.toFixed(2)}\n`;
    context += `- Rationale: ${classification.rationale}\n\n`;

    if (conversationHistory.length > 0) {
      context += `Previous Questions and Answers:\n`;
      for (const qa of conversationHistory) {
        context += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
      }
    }

    const remainingQuestions = this.getRemainingQuestionCount(conversationHistory);
    context += `\nRemaining questions allowed: ${remainingQuestions}\n`;
    context += `Generate ${this.MIN_QUESTIONS}-${this.MAX_QUESTIONS} clarifying questions.`;

    const userPrompt = isO1Model
      ? `${systemPrompt}\n\n${context}`
      : context;

    messages.push({
      role: 'user',
      content: userPrompt
    });

    return messages;
  }

  /**
   * Get the system prompt for clarification question generation
   * Loads from versioned storage, falls back to default if not found
   */
  private async getClarificationSystemPrompt(): Promise<string> {
    try {
      const prompt = await this.versionedStorage.getPrompt(this.CLARIFICATION_PROMPT_ID);
      if (prompt) {
        return prompt;
      }
    } catch (error) {
      console.warn('Failed to load clarification prompt from storage, using default:', error);
    }

    // Fallback to default prompt
    return `You are an expert in business transformation and process analysis. Your task is to generate clarifying questions that will help improve the confidence of a business process classification.

**Context:**
You will be provided with:
1. A process description
2. A current classification with confidence score
3. Previous questions and answers (if any)

**Your Goal:**
Generate 1-2 targeted clarifying questions that will:
- Help increase classification confidence
- Extract missing business attributes needed for decision matrix evaluation
- Avoid redundancy with previous questions
- Be specific and actionable

**Business Attributes to Consider:**
When generating questions, consider extracting information about:
- **Frequency**: How often the process runs (hourly, daily, weekly, monthly, etc.)
- **Business Value**: Impact on revenue, customer satisfaction, or compliance (critical, high, medium, low)
- **Complexity**: Number of steps, systems involved, decision points (very high, high, medium, low, very low)
- **Risk**: Impact if the process fails or changes (critical, high, medium, low)
- **User Count**: Number of people involved or affected (1-5, 6-20, 21-50, 51-100, 100+)
- **Data Sensitivity**: Level of data sensitivity (public, internal, confidential, restricted)

**Question Guidelines:**
1. Ask about specific aspects that are unclear or missing
2. Focus on attributes that would help distinguish between transformation categories
3. Avoid yes/no questions - ask for details and context
4. Don't repeat information already provided in previous answers
5. Keep questions concise and easy to understand
6. Prioritize questions that address the classification uncertainty

**Response Format:**
Provide your response as a JSON array of question objects:
[
  {
    "question": "<the clarifying question>",
    "purpose": "<what attribute or aspect this question aims to clarify>"
  }
]

Generate 1-2 questions maximum. Respond ONLY with the JSON array, no additional text.`;
  }

  /**
   * Parse the clarification response from OpenAI
   */
  private parseClarificationResponse(content: string): ClarificationQuestion[] {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Validate and filter questions
      const questions: ClarificationQuestion[] = [];
      for (const item of parsed) {
        if (item.question && typeof item.question === 'string') {
          questions.push({
            question: item.question,
            purpose: item.purpose || 'General clarification'
          });
        }
      }

      // Limit to MAX_QUESTIONS
      return questions.slice(0, this.MAX_QUESTIONS);
    } catch (error) {
      throw new Error(
        `Failed to parse clarification response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
