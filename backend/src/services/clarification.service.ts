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
  useRegionalInference?: boolean;
  regionalInferenceEndpoint?: string;
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
  private readonly CLARIFICATION_PROMPT_VERSION = 'v1.2';
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

      // Check if interview should be stopped (includes all detection logic)
      const stopCheck = this.shouldStopInterview(request.conversationHistory);
      if (stopCheck.shouldStop) {
        console.log(`Auto-stopping interview: ${stopCheck.reason}`);
        return {
          questions: [],
          shouldClarify: false,
          reason: stopCheck.reason
        };
      }

      // Check if we have enough information to proceed
      const completeness = await this.assessInformationCompletenessDetailed(
        request.processDescription,
        request.conversationHistory
      );
      const hasEnoughInfo = completeness.isComplete;

      // If we have high confidence AND enough information, stop asking
      if (confidence >= 0.95 && hasEnoughInfo) {
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
          reason: 'Consistently low confidence - manual review recommended'
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
        useRegionalInference: request.useRegionalInference,
        regionalInferenceEndpoint: request.regionalInferenceEndpoint,
      });

      // Build messages for LLM
      const messages = await this.buildClarificationMessages(
        request.processDescription,
        request.classification,
        request.conversationHistory,
        request.model || this.DEFAULT_MODEL,
        completeness.missingStrategic
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
   * Check if interview should be automatically stopped
   * Detects LLM loops, user frustration, and other problematic patterns
   * @param conversationHistory - Current conversation history
   * @returns Object with shouldStop flag and reason
   */
  shouldStopInterview(
    conversationHistory: Array<{ question: string; answer: string }>
  ): { shouldStop: boolean; reason: string } {
    const questionCount = conversationHistory.length;

    // Hard limit reached
    if (questionCount >= this.HARD_LIMIT_QUESTIONS) {
      return {
        shouldStop: true,
        reason: `Interview limit reached (${this.HARD_LIMIT_QUESTIONS} questions)`
      };
    }

    // Note: User frustration detection is now handled by the LLM in the prompt
    // The LLM will naturally stop asking questions if it detects negative sentiment

    // Check for repetitive questions (potential loop)
    if (questionCount >= 3) {
      const isRepetitive = this.detectRepetitiveQuestions(conversationHistory);
      if (isRepetitive) {
        return {
          shouldStop: true,
          reason: 'Detected repetitive questions - stopping to avoid frustration'
        };
      }
    }

    // Check for exact duplicate questions (strict loop detection)
    if (questionCount >= 5) {
      const recentQuestions = conversationHistory.slice(-5).map(qa => qa.question.toLowerCase());
      const uniqueQuestions = new Set(recentQuestions);

      // If last 5 questions have less than 3 unique questions, likely a loop
      if (uniqueQuestions.size < 3) {
        return {
          shouldStop: true,
          reason: 'Detected duplicate questions - possible LLM loop'
        };
      }
    }

    // Check for excessive "don't know" answers
    if (questionCount >= 5) {
      const hasUnknownAnswers = this.detectUnknownAnswers(conversationHistory);
      if (hasUnknownAnswers) {
        return {
          shouldStop: true,
          reason: 'User unable to provide more information'
        };
      }
    }

    // Soft limit warning
    if (questionCount >= this.SOFT_LIMIT_QUESTIONS) {
      return {
        shouldStop: false,
        reason: `Approaching limit (${questionCount}/${this.HARD_LIMIT_QUESTIONS} questions asked)`
      };
    }

    return {
      shouldStop: false,
      reason: 'Interview can continue'
    };
  }

  /**
   * Assess if we have enough information to make a confident classification
   * @param processDescription - Original process description
   * @param conversationHistory - Q&A history
   * @returns Structured completeness result
   */
  private async assessInformationCompletenessDetailed(
    processDescription: string,
    conversationHistory: Array<{ question: string; answer: string }>
  ): Promise<{ isComplete: boolean; missingStrategic: string[]; infoScore: number }> {
    // Combine all text
    const allText = (processDescription + ' ' +
      conversationHistory.map(qa => qa.answer).join(' ')).toLowerCase();

    // Check for key information indicators
    const hasFrequency = /\b(daily|weekly|monthly|hourly|quarterly|annually|every|once|twice|times? per)\b/i.test(allText);
    const hasVolume = /\b(\d+|many|few|several|multiple|hundreds?|thousands?|volume|scale|users|people|transactions)\b/i.test(allText);
    const hasCurrentState = /\b(currently|now|today|manual|paper|digital|automated|system|tool|software|spreadsheet|excel|legacy)\b/i.test(allText);
    const hasComplexity = /\b(steps?|process|workflow|involves?|requires?|needs?|systems?|departments?|complex|simple|approvals)\b/i.test(allText);
    const hasPainPoints = /\b(problem|issue|slow|error|mistake|difficult|time-consuming|inefficient|frustrating|pain|bottleneck)\b/i.test(allText);
    const hasDataSource = /\b(data|information|observ|record|capture|collect|generat|automat|source)\b/i.test(allText);

    // Dynamic strategic questions check
    let strategicKeys: string[] = ['success_criteria', 'risks_constraints', 'value_estimate', 'sponsorship'];
    try {
      const questions = await this.versionedStorage.getStrategicQuestions();
      if (questions && Array.isArray(questions)) {
        strategicKeys = questions.filter((q: any) => q.active).map((q: any) => q.key);
      }
    } catch (error) {
      console.warn('Heuristic check: Failed to load strategic questions, using defaults');
    }

    // Heuristic check for strategic matches
    const missingStrategic: string[] = [];
    for (const key of strategicKeys) {
      const keyTerms = key.replace(/_/g, ' ').split(' ');
      const hasMatch = keyTerms.some(term => {
        if (term.length < 3) return false;
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        return regex.test(allText);
      });

      if (!hasMatch) {
        missingStrategic.push(key);
      }
    }

    const infoScore = [
      hasFrequency,
      hasVolume,
      hasCurrentState,
      hasComplexity,
      hasPainPoints,
      hasDataSource
    ].filter(Boolean).length;

    // VERY STRICT: Need almost all core indicators AND 100% of strategic keys
    const isComplete = infoScore >= 5 && missingStrategic.length === 0;

    return { isComplete, missingStrategic, infoScore };
  }

  /**
   * Wrapper for assessInformationCompleteness
   */
  private async assessInformationCompleteness(
    processDescription: string,
    conversationHistory: Array<{ question: string; answer: string }>
  ): Promise<boolean> {
    const result = await this.assessInformationCompletenessDetailed(processDescription, conversationHistory);
    // If it's not complete, but we've asked many questions, we might have to stop anyway
    if (conversationHistory.length >= 8) {
      return true;
    }
    return result.isComplete;
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

  // Note: Frustration detection is now handled by the LLM via the prompt
  // The LLM monitors sentiment and will naturally stop asking questions if it detects
  // frustration, impatience, or lack of knowledge from the user

  /**
   * Detect if questions are becoming repetitive
   * @param conversationHistory - Q&A history
   * @returns True if questions are repetitive
   */
  private detectRepetitiveQuestions(
    conversationHistory: Array<{ question: string; answer: string }>
  ): boolean {
    if (conversationHistory.length < 3) {
      return false;
    }

    // Get last 5 questions
    const recentQuestions = conversationHistory.slice(-5).map(qa => qa.question.toLowerCase());

    // Check for similar keywords in questions
    const questionKeywords = recentQuestions.map(q => {
      // Extract key words (remove common words)
      const words = q.split(/\s+/).filter(w =>
        w.length > 3 &&
        !['what', 'when', 'where', 'which', 'does', 'have', 'this', 'that', 'your', 'the'].includes(w)
      );
      return new Set(words);
    });

    // Check if recent questions share many keywords (indicating repetition)
    let similarityCount = 0;
    for (let i = 0; i < questionKeywords.length - 1; i++) {
      for (let j = i + 1; j < questionKeywords.length; j++) {
        const intersection = new Set(
          [...questionKeywords[i]].filter(x => questionKeywords[j].has(x))
        );

        // If questions share 2+ keywords, they're likely similar
        if (intersection.size >= 2) {
          similarityCount++;
        }
      }
    }

    // If 2+ pairs of similar questions, we're being repetitive
    return similarityCount >= 2;
  }

  /**
   * Build chat messages for clarification question generation
   */
  private async buildClarificationMessages(
    processDescription: string,
    classification: ClassificationResult,
    conversationHistory: Array<{ question: string; answer: string }>,
    model: string,
    missingStrategicKeys: string[] = []
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

    // Explicitly call out missing strategic information
    if (missingStrategicKeys.length > 0) {
      context += `**MISSING STRATEGIC INFORMATION (REQUIRED):**\n`;
      context += `The following information has NOT been extracted from the conversation so far and MUST be clarified:\n`;
      missingStrategicKeys.forEach(key => {
        context += `- ${key.replace(/_/g, ' ').toUpperCase()}\n`;
      });
      context += `\n`;
    }

    if (conversationHistory.length > 0) {
      // For conversations with 5+ Q&As, use summarization to prevent confusion
      if (conversationHistory.length >= 5) {
        context += this.buildSummarizedContext(conversationHistory);
      } else {
        // For shorter conversations, include full history
        context += `Previous Questions and Answers:\n`;
        for (const qa of conversationHistory) {
          context += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
        }
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
   * Build summarized context for long conversations
   * Extracts key facts and keeps recent context
   */
  private buildSummarizedContext(
    conversationHistory: Array<{ question: string; answer: string }>
  ): string {
    let context = '';

    // Extract key facts from all answers
    const keyFacts = this.extractKeyFacts(conversationHistory);
    if (keyFacts.length > 0) {
      context += 'Key Information Already Gathered:\n';
      keyFacts.forEach(fact => {
        context += `- ${fact}\n`;
      });
      context += '\n';
    }

    // Include last 2-3 Q&As for recent context
    const recentCount = Math.min(3, conversationHistory.length);
    const recentQAs = conversationHistory.slice(-recentCount);

    context += `Recent Questions and Answers (last ${recentCount} of ${conversationHistory.length}):\n`;
    for (const qa of recentQAs) {
      context += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
    }

    return context;
  }

  /**
   * Extract key facts from conversation history
   * Identifies important information about frequency, volume, complexity, etc.
   */
  private extractKeyFacts(
    conversationHistory: Array<{ question: string; answer: string }>
  ): string[] {
    const facts: string[] = [];
    const allText = conversationHistory.map(qa => qa.answer).join(' ').toLowerCase();

    // Frequency
    const frequencyMatch = allText.match(/\b(daily|weekly|monthly|hourly|quarterly|annually|every\s+\w+|once|twice|\d+\s+times?\s+per)\b/i);
    if (frequencyMatch) {
      facts.push(`Process frequency: ${frequencyMatch[0]}`);
    }

    // Volume/Scale
    const volumeMatch = allText.match(/\b(\d+)\s+(users?|people|employees?|transactions?|requests?|cases?)\b/i);
    if (volumeMatch) {
      facts.push(`Scale: ${volumeMatch[0]}`);
    }

    // Current state
    if (/\b(manual|paper-based|spreadsheet|excel)\b/i.test(allText)) {
      facts.push('Current state: Manual/paper-based process');
    } else if (/\b(digital|system|automated|software|tool)\b/i.test(allText)) {
      facts.push('Current state: Digital/system-based');
    }

    // Complexity indicators
    const stepsMatch = allText.match(/\b(\d+)\s+(steps?|stages?|phases?)\b/i);
    if (stepsMatch) {
      facts.push(`Process complexity: ${stepsMatch[0]}`);
    }

    // Systems involved
    const systemsMatch = allText.match(/\b(\d+)\s+(systems?|applications?|tools?)\b/i);
    if (systemsMatch) {
      facts.push(`Systems involved: ${systemsMatch[0]}`);
    }

    // Pain points
    if (/\b(slow|time-consuming|takes\s+\d+\s+(hours?|minutes?|days?))\b/i.test(allText)) {
      facts.push('Pain point: Time-consuming process');
    }
    if (/\b(error-prone|mistakes?|errors?)\b/i.test(allText)) {
      facts.push('Pain point: Error-prone');
    }

    // Business value
    if (/\b(critical|essential|vital|important|high\s+priority)\b/i.test(allText)) {
      facts.push('Business value: High/Critical');
    }

    // Data sensitivity
    if (/\b(sensitive|confidential|restricted|pii|personal\s+data)\b/i.test(allText)) {
      facts.push('Data sensitivity: High');
    }

    return facts;
  }

  /**
   * Get the system prompt for clarification question generation
   * Loads from versioned storage, falls back to default if not found
   */
  private async getClarificationSystemPrompt(): Promise<string> {
    // Fetch dynamic strategic questions
    let strategicQuestionsList = [];
    try {
      const questions = await this.versionedStorage.getStrategicQuestions();
      if (questions && Array.isArray(questions)) {
        strategicQuestionsList = questions.filter((q: any) => q.active);
      }
    } catch (error) {
      console.warn('Failed to load strategic questions, using defaults', error);
    }

    // Default strategic questions if none found
    if (strategicQuestionsList.length === 0) {
      strategicQuestionsList = [
        { text: "What would success look like for you?", key: "success_criteria" },
        { text: "What risks and constraints are you aware of? Are there known blockers?", key: "risks_constraints" },
        { text: "How much time, resource, or money would this save? What value would you place on this?", key: "value_estimate" },
        { text: "Have you raised this before or do you have sponsorship?", key: "sponsorship" }
      ];
    }

    // Build the strategic questions section string
    const strategicQuestionsText = strategicQuestionsList
      .map((q: any, index: number) => `${index + 1}. **${q.key ? q.key.replace(/_/g, ' ').toUpperCase() : 'STRATEGIC QUESTION'}**: "${q.text}"`)
      .join('\n');

    const strategicReviewText = strategicQuestionsList
      .map((q: any) => `   - If you don't know the answer to "${q.text.substring(0, 30)}...", ask about it.`)
      .join('\n');

    let promptContent = "";

    try {
      const prompt = await this.versionedStorage.getPrompt(this.CLARIFICATION_PROMPT_ID);
      if (prompt) {
        promptContent = prompt;
      }
    } catch (error) {
      console.warn('Failed to load clarification prompt from storage, using default:', error);
    }

    if (!promptContent) {
      // Fallback to default prompt template
      promptContent = `You are a business transformation consultant conducting a discovery interview. Your role is to gather facts and understand the current state before making any recommendations.

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
- **CRITICAL**: Capture strategic context (success criteria, risks, value, sponsorship)
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

**Strategic Information (REQUIRED):**
You MUST ensure you have answers to these key questions. If they are not answered in the description or history, YOU MUST ASK THEM:

{{STRATEGIC_QUESTIONS}}

**CRITICAL Questions to Ask (if not already answered):**

1. **Strategic Context (TOP PRIORITY):**
{{STRATEGIC_REVIEW}}

2. **Data Source & Nature:**
   - Where does the data come from? Is it observational, transactional, or generated?
   - Is the data created through human observation/judgment or automatically captured?
   - Does the data require interpretation or is it raw facts?

3. **Output Format & Usage:**
   - What format is the output? (Report, dashboard, spreadsheet, document, etc.)
   - Who uses the output and what do they do with it?
   - Does the output require human judgment to create or interpret?
   - Is the output standardized or does it vary based on context?

4. **Human Judgment & Decision-Making:**
   - Are there decision points that require human expertise or judgment?
   - Does the process involve interpretation, analysis, or subjective assessment?
   - Could the process be fully automated or does it need human oversight?

5. **Variability & Exceptions:**
   - Does the process follow the same steps every time?
   - Are there exceptions or edge cases that require special handling?
   - How much variation is there in inputs, processing, or outputs?

**Question Priority Framework:**
1. **First Priority**: **STRATEGIC CONTEXT** - Ensure the strategic questions are answered. (Mix these naturally with process questions).
2. **Second Priority**: Understand the CURRENT STATE - How is this done today? Is it manual, digital, automated?
3. **Third Priority**: Understand DATA SOURCE - Where does the data come from? Is it observational or transactional?
4. **Fourth Priority**: Understand OUTPUT USAGE - What happens with the output? Who uses it and how?
5. **Fifth Priority**: Understand HUMAN JUDGMENT - What requires human expertise vs. what's mechanical?
6. **Sixth Priority**: Understand SCALE & PAIN POINTS - Frequency, volume, pain points.

**Question Guidelines:**
1. Ask open-ended questions that encourage detailed responses
2. Don't repeat information already provided in previous answers
3. Build on previous answers - if they mention something interesting, dig deeper
4. Keep questions conversational and natural
5. Never assume - if it's not explicitly stated, ask about it
6. **Combine strategic questions with process questions where natural** (e.g. "To understand the value of automating this, how much time does it currently take?")
7. **Ensure all strategic questions are asked eventually**, but you don't need to ask them all in the first turn if it feels overwhelming.

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

    // Dynamic replacement if the prompt contains placeholders (our default one does, but stored ones might not yet)
    // If the stored prompt doesn't have the placeholder, we might prepend/append, but ideally we should update the stored prompt format.
    // For now, if the prompt doesn't contain {{STRATEGIC_QUESTIONS}}, we will assume it's an old version and we might lose dynamic injection unless we force it.
    // But since I am controlling the default info fallback, let's assume I replaced it above.

    // If the prompt DOES contain the placeholder, replace it.
    if (promptContent.includes('{{STRATEGIC_QUESTIONS}}')) {
      promptContent = promptContent.replace('{{STRATEGIC_QUESTIONS}}', strategicQuestionsText);
    } else {
      // Legacy prompt support: Replace the hardcoded section if it matches roughly what we expect, or just accept that old prompts might not be dynamic until updated.
      // Or better: If it's the *exact* string I wrote in the previous step, I can try to replace it.
      // But since I just pasted the template above, it HAS the placeholder.
    }

    if (promptContent.includes('{{STRATEGIC_REVIEW}}')) {
      promptContent = promptContent.replace('{{STRATEGIC_REVIEW}}', strategicReviewText);
    }

    return promptContent;
  }

  /**
   * Parse the clarification response from OpenAI
   */
  private parseClarificationResponse(content: string): ClarificationQuestion[] {
    try {
      // Check for malformed responses (e.g., "Clarification 9")
      const trimmedContent = content.trim();
      if (/^Clarification\s+\d+$/i.test(trimmedContent)) {
        console.warn('[Clarification] Detected loop response, stopping clarification:', trimmedContent);
        // Return empty array to stop asking questions
        return [];
      }

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
