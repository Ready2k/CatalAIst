import { LLMService, ChatMessage, LLMProviderConfig } from './llm.service';
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
  // LLM Provider config
  provider?: 'openai' | 'bedrock';
  apiKey?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
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
  private llmService: LLMService;
  private versionedStorage: VersionedStorageService;
  private readonly DEFAULT_MODEL = 'gpt-4';
  private readonly CLARIFICATION_PROMPT_ID = 'clarification';
  private readonly SOFT_LIMIT_QUESTIONS = 8; // Soft limit - warn but allow
  private readonly HARD_LIMIT_QUESTIONS = 15; // Hard limit - stop interview
  private readonly MIN_QUESTIONS = 1;
  private readonly MAX_QUESTIONS = 3;

  constructor(versionedStorage?: VersionedStorageService) {
    this.llmService = new LLMService();
    this.versionedStorage = versionedStorage || new VersionedStorageService(new JsonStorageService());
  }

  /**
   * Generate clarifying questions based on classification confidence and conversation quality
   * @param request - Clarification request with process description and classification
   * @returns Clarification response with questions or skip signal
   */
  async generateQuestions(request: ClarificationRequest): Promise<ClarificationResponse> {
    try {
      const questionCount = request.conversationHistory.length;
      const confidence = request.classification.confidence;
      
      // Hard limit - stop the interview
      if (questionCount >= this.HARD_LIMIT_QUESTIONS) {
        return {
          questions: [],
          shouldClarify: false,
          reason: `Interview limit reached (${this.HARD_LIMIT_QUESTIONS} questions). Proceeding with available information.`
        };
      }

      // Check if we have enough information to proceed
      const hasEnoughInfo = this.assessInformationCompleteness(
        request.processDescription,
        request.conversationHistory
      );

      // If we have high confidence AND enough information, stop asking
      if (confidence > 0.90 && hasEnoughInfo) {
        return {
          questions: [],
          shouldClarify: false,
          reason: 'High confidence classification with sufficient information'
        };
      }

      // If confidence is very low, flag for manual review instead of asking more questions
      if (confidence < 0.5 && questionCount >= 3) {
        return {
          questions: [],
          shouldClarify: false,
          reason: 'Low confidence after multiple questions - flagged for manual review'
        };
      }

      // Check for "I don't know" patterns in recent answers
      const hasUnknownAnswers = this.detectUnknownAnswers(request.conversationHistory);
      
      // If user doesn't know and we've asked enough, proceed with what we have
      if (hasUnknownAnswers && questionCount >= 5) {
        return {
          questions: [],
          shouldClarify: false,
          reason: 'User unable to provide more information - proceeding with available data'
        };
      }

      // Generate clarification questions
      const model = request.model || this.DEFAULT_MODEL;
      
      // Build LLM config
      const config = this.llmService.buildConfig({
        provider: request.provider,
        model,
        apiKey: request.apiKey,
        awsAccessKeyId: request.awsAccessKeyId,
        awsSecretAccessKey: request.awsSecretAccessKey,
        awsSessionToken: request.awsSessionToken,
        awsRegion: request.awsRegion,
      });

      const messages = await this.buildClarificationMessages(
        request.processDescription,
        request.classification,
        request.conversationHistory,
        model
      );

      const response = await this.llmService.chat(messages, model, config);

      const questions = this.parseClarificationResponse(response.content);

      // If no questions generated, we're done
      if (questions.length === 0) {
        return {
          questions: [],
          shouldClarify: false,
          reason: 'No additional clarification needed'
        };
      }

      // Soft limit warning
      let reason = `Confidence: ${confidence.toFixed(2)}, generating ${questions.length} question(s)`;
      if (questionCount >= this.SOFT_LIMIT_QUESTIONS) {
        reason += ` (${questionCount + questions.length}/${this.HARD_LIMIT_QUESTIONS} questions asked)`;
      }

      return {
        questions,
        shouldClarify: true,
        reason
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
    return conversationHistory.length < this.HARD_LIMIT_QUESTIONS;
  }

  /**
   * Get remaining question count for session
   * @param conversationHistory - Current conversation history
   * @returns Number of questions remaining
   */
  getRemainingQuestionCount(conversationHistory: Array<{ question: string; answer: string }>): number {
    return Math.max(0, this.HARD_LIMIT_QUESTIONS - conversationHistory.length);
  }

  /**
   * Assess if we have enough information to make a confident classification
   * @param processDescription - Original process description
   * @param conversationHistory - Q&A history
   * @returns True if we have sufficient information
   */
  private assessInformationCompleteness(
    processDescription: string,
    conversationHistory: Array<{ question: string; answer: string }>
  ): boolean {
    // Combine all text
    const allText = processDescription + ' ' + 
      conversationHistory.map(qa => qa.answer).join(' ');
    
    // Check for key information indicators
    const hasFrequency = /\b(daily|weekly|monthly|hourly|quarterly|annually|every|once|twice|times? per)\b/i.test(allText);
    const hasVolume = /\b(\d+|many|few|several|multiple|hundreds?|thousands?)\b/i.test(allText);
    const hasCurrentState = /\b(currently|now|today|manual|paper|digital|automated|system|tool|software|spreadsheet|excel)\b/i.test(allText);
    const hasComplexity = /\b(steps?|process|workflow|involves?|requires?|needs?|systems?|departments?|complex|simple)\b/i.test(allText);
    const hasPainPoints = /\b(problem|issue|slow|error|mistake|difficult|time-consuming|inefficient|frustrating)\b/i.test(allText);
    const hasDataSource = /\b(data|information|observ|record|capture|collect|generat|automat)\b/i.test(allText);
    
    const infoScore = [
      hasFrequency,
      hasVolume,
      hasCurrentState,
      hasComplexity,
      hasPainPoints,
      hasDataSource
    ].filter(Boolean).length;
    
    // Need at least 4 out of 6 key indicators
    return infoScore >= 4;
  }

  /**
   * Detect if user is giving "I don't know" type answers
   * @param conversationHistory - Q&A history
   * @returns True if recent answers indicate lack of knowledge
   */
  private detectUnknownAnswers(
    conversationHistory: Array<{ question: string; answer: string }>
  ): boolean {
    if (conversationHistory.length === 0) {
      return false;
    }
    
    // Check last 3 answers
    const recentAnswers = conversationHistory.slice(-3);
    const unknownPatterns = [
      /\b(don'?t know|not sure|unsure|no idea|can'?t say|unclear|uncertain)\b/i,
      /\b(i don'?t|we don'?t|don'?t have|no information)\b/i,
      /^(no|nope|n\/a|na|unknown|idk)$/i
    ];
    
    let unknownCount = 0;
    for (const qa of recentAnswers) {
      const answer = qa.answer.toLowerCase().trim();
      if (unknownPatterns.some(pattern => pattern.test(answer))) {
        unknownCount++;
      }
    }
    
    // If 2 out of last 3 answers are "don't know", user likely can't provide more info
    return unknownCount >= 2;
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
    const questionCount = conversationHistory.length;
    
    context += `\nQuestions asked so far: ${questionCount}\n`;
    
    // Adjust number of questions based on conversation progress
    let questionsToGenerate: number;
    if (questionCount === 0) {
      questionsToGenerate = this.MAX_QUESTIONS; // First round: 2-3 questions
    } else if (questionCount < 5) {
      questionsToGenerate = 2; // Early rounds: 2 questions
    } else if (questionCount < 8) {
      questionsToGenerate = 1; // Later rounds: 1 question at a time
    } else {
      questionsToGenerate = 1; // Final rounds: 1 question only
    }
    
    context += `\n**IMPORTANT INSTRUCTIONS:**\n`;
    context += `- You have asked ${questionCount} questions so far\n`;
    context += `- Generate ${questionsToGenerate} question(s) ONLY if you need critical missing information\n`;
    context += `- If the user has said "I don't know" or similar, try rephrasing or move on\n`;
    context += `- If you have enough information to classify confidently, return an empty array []\n`;
    context += `- Focus on the MOST CRITICAL missing information only\n`;
    context += `- After ${this.SOFT_LIMIT_QUESTIONS} questions, only ask if absolutely necessary\n`;

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
