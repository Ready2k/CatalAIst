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
  private readonly MIN_QUESTIONS = 2;
  private readonly MAX_QUESTIONS = 3;

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
      
      if (confidence > 0.90) {
        return {
          questions: [],
          shouldClarify: false,
          reason: 'High confidence classification (>0.90), no clarification needed'
        };
      }

      if (confidence < 0.5) {
        return {
          questions: [],
          shouldClarify: false,
          reason: 'Low confidence classification (<0.5), flagged for manual review'
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
    
    // Adjust number of questions based on how many have been asked
    const questionsToGenerate = conversationHistory.length === 0 
      ? this.MAX_QUESTIONS  // First round: ask more questions
      : Math.min(this.MAX_QUESTIONS - 1, remainingQuestions); // Subsequent rounds: fewer questions
    
    context += `Generate ${questionsToGenerate} clarifying questions.`;

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
    return `You are a business transformation consultant conducting a discovery interview. Your role is to gather facts and understand the current state before making any recommendations.

**Context:**
You will be provided with:
1. A process description
2. A current classification with confidence score
3. Previous questions and answers (if any)

**Your Goal:**
Generate 2-3 discovery questions that will:
- Uncover the CURRENT STATE of the process (manual, paper-based, digital, partially automated, etc.)
- Understand what EXISTS today vs. what they WANT to achieve
- Extract concrete facts about frequency, volume, users, complexity, and pain points
- Avoid making assumptions - ask about anything not explicitly stated
- Feel like a natural consultant interview, not an interrogation
- Build on previous answers to dig deeper

**Business Attributes to Consider:**
When generating questions, consider extracting information about:
- **Frequency**: How often the process runs (hourly, daily, weekly, monthly, etc.)
- **Business Value**: Impact on revenue, customer satisfaction, or compliance (critical, high, medium, low)
- **Complexity**: Number of steps, systems involved, decision points (very high, high, medium, low, very low)
- **Risk**: Impact if the process fails or changes (critical, high, medium, low)
- **User Count**: Number of people involved or affected (1-5, 6-20, 21-50, 51-100, 100+)
- **Data Sensitivity**: Level of data sensitivity (public, internal, confidential, restricted)

**CRITICAL Questions to Ask (if not already answered):**

1. **Data Source & Nature:**
   - Where does the data come from? Is it observational, transactional, or generated?
   - Is the data created through human observation/judgment or automatically captured?
   - Does the data require interpretation or is it raw facts?

2. **Output Format & Usage:**
   - What format is the output? (Report, dashboard, spreadsheet, document, etc.)
   - Who uses the output and what do they do with it?
   - Does the output require human judgment to create or interpret?
   - Is the output standardized or does it vary based on context?

3. **Human Judgment & Decision-Making:**
   - Are there decision points that require human expertise or judgment?
   - Does the process involve interpretation, analysis, or subjective assessment?
   - Could the process be fully automated or does it need human oversight?

4. **Variability & Exceptions:**
   - Does the process follow the same steps every time?
   - Are there exceptions or edge cases that require special handling?
   - How much variation is there in inputs, processing, or outputs?

**Question Priority Framework:**
1. **First Priority**: Understand the CURRENT STATE - How is this done today? Is it manual, digital, automated?
2. **Second Priority**: Understand DATA SOURCE - Where does the data come from? Is it observational or transactional?
3. **Third Priority**: Understand OUTPUT USAGE - What happens with the output? Who uses it and how?
4. **Fourth Priority**: Understand HUMAN JUDGMENT - What requires human expertise vs. what's mechanical?
5. **Fifth Priority**: Understand SCALE - How often? How many people? How many transactions?
6. **Sixth Priority**: Understand PAIN POINTS - What's broken? What takes too long? What's error-prone?

**Question Guidelines:**
1. Ask open-ended questions that encourage detailed responses
2. Don't repeat information already provided in previous answers
3. Build on previous answers - if they mention something interesting, dig deeper
4. Keep questions conversational and natural
5. Never assume - if it's not explicitly stated, ask about it
6. **ALWAYS ask about data source and output usage if not clear**
7. **ALWAYS ask about human judgment requirements if the process involves reports, analysis, or decisions**
8. **Be skeptical of automation potential** - dig into what makes the process complex

**Response Format:**
Provide your response as a JSON array of question objects:
[
  {
    "question": "<the clarifying question>",
    "purpose": "<what attribute or aspect this question aims to clarify>"
  }
]

Generate 2-3 questions maximum. Respond ONLY with the JSON array, no additional text.`;
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
