import { OpenAIService, ChatMessage } from './openai.service';
import { VersionedStorageService } from './versioned-storage.service';
import { JsonStorageService } from './storage.service';

export interface ClassificationResult {
  category: 'Eliminate' | 'Simplify' | 'Digitise' | 'RPA' | 'AI Agent' | 'Agentic AI';
  confidence: number;
  rationale: string;
  categoryProgression: string;
  futureOpportunities: string;
}

export type ConfidenceAction = 'auto_classify' | 'clarify' | 'manual_review';

export interface ClassificationWithAction {
  result: ClassificationResult;
  action: ConfidenceAction;
}

export interface AttributeValue {
  value: string;
  explanation: string;
}

export interface ExtractedAttributes {
  frequency: AttributeValue;
  business_value: AttributeValue;
  complexity: AttributeValue;
  risk: AttributeValue;
  user_count: AttributeValue;
  data_sensitivity: AttributeValue;
}

export interface ClassificationRequest {
  processDescription: string;
  conversationHistory?: Array<{ question: string; answer: string }>;
  model?: string;
  apiKey: string;
}

export class ClassificationService {
  private openAIService: OpenAIService;
  private versionedStorage: VersionedStorageService;
  private readonly DEFAULT_MODEL = 'gpt-4';
  private readonly CLASSIFICATION_PROMPT_ID = 'classification';
  private readonly ATTRIBUTE_EXTRACTION_PROMPT_ID = 'attribute-extraction';
  
  // Supported models for classification
  private readonly SUPPORTED_MODELS = [
    'gpt-3.5-turbo',
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4o',
    'o1-preview',
    'o1-mini',
  ];

  constructor(versionedStorage?: VersionedStorageService) {
    this.openAIService = new OpenAIService();
    this.versionedStorage = versionedStorage || new VersionedStorageService(new JsonStorageService());
  }

  /**
   * Classify a business process into transformation categories
   * @param request - Classification request with process description and context
   * @returns Classification result with category, confidence, and rationale
   */
  async classify(request: ClassificationRequest): Promise<ClassificationResult> {
    try {
      const model = request.model || this.DEFAULT_MODEL;
      
      // Validate model is supported
      if (!this.isModelSupported(model)) {
        throw new Error(
          `Unsupported model: ${model}. Supported models: ${this.SUPPORTED_MODELS.join(', ')}`
        );
      }

      const messages = await this.buildClassificationMessages(
        request.processDescription,
        request.conversationHistory,
        model
      );

      const response = await this.openAIService.chat(
        messages,
        model,
        request.apiKey
      );

      return this.parseClassificationResponse(response.content);
    } catch (error) {
      throw this.handleClassificationError(error);
    }
  }

  /**
   * Classify with confidence-based routing
   * @param request - Classification request
   * @returns Classification result with recommended action
   */
  async classifyWithRouting(request: ClassificationRequest): Promise<ClassificationWithAction> {
    const result = await this.classify(request);
    const action = this.determineAction(result.confidence);
    
    return {
      result,
      action
    };
  }

  /**
   * Determine action based on confidence score
   * @param confidence - Confidence score (0-1)
   * @returns Recommended action
   */
  determineAction(confidence: number): ConfidenceAction {
    // Made more conservative - require higher confidence for auto-classification
    if (confidence > 0.90) {
      return 'auto_classify';
    } else if (confidence >= 0.5) {
      return 'clarify';
    } else {
      return 'manual_review';
    }
  }

  /**
   * Extract business attributes from conversation
   * @param processDescription - Process description
   * @param conversationHistory - Conversation history with Q&A
   * @param apiKey - OpenAI API key
   * @param model - Model to use (optional)
   * @returns Extracted attributes
   */
  async extractAttributes(
    processDescription: string,
    conversationHistory: Array<{ question: string; answer: string }>,
    apiKey: string,
    model?: string
  ): Promise<ExtractedAttributes> {
    try {
      const modelToUse = model || this.DEFAULT_MODEL;
      
      // Validate model is supported
      if (!this.isModelSupported(modelToUse)) {
        throw new Error(
          `Unsupported model: ${modelToUse}. Supported models: ${this.SUPPORTED_MODELS.join(', ')}`
        );
      }

      const messages = await this.buildAttributeExtractionMessages(
        processDescription,
        conversationHistory,
        modelToUse
      );

      const response = await this.openAIService.chat(
        messages,
        modelToUse,
        apiKey
      );

      return this.parseAttributeExtractionResponse(response.content);
    } catch (error) {
      throw new Error(
        `Attribute extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Build chat messages for attribute extraction
   */
  private async buildAttributeExtractionMessages(
    processDescription: string,
    conversationHistory: Array<{ question: string; answer: string }>,
    model: string
  ): Promise<ChatMessage[]> {
    const isO1Model = model.startsWith('o1');
    const systemPrompt = await this.getAttributeExtractionPrompt();
    
    const messages: ChatMessage[] = [];

    if (!isO1Model) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Build conversation context
    let conversationContext = `Process Description:\n${processDescription}\n\n`;
    
    if (conversationHistory.length > 0) {
      conversationContext += 'Conversation History:\n';
      for (const qa of conversationHistory) {
        conversationContext += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
      }
    }

    const userPrompt = isO1Model
      ? `${systemPrompt}\n\n${conversationContext}`
      : conversationContext;

    messages.push({
      role: 'user',
      content: userPrompt,
    });

    return messages;
  }

  /**
   * Get the attribute extraction prompt
   * Loads from versioned storage, falls back to default if not found
   */
  private async getAttributeExtractionPrompt(): Promise<string> {
    try {
      const prompt = await this.versionedStorage.getPrompt(this.ATTRIBUTE_EXTRACTION_PROMPT_ID);
      if (prompt) {
        return prompt;
      }
    } catch (error) {
      console.warn('Failed to load attribute extraction prompt from storage, using default:', error);
    }

    // Fallback to default prompt
    return `You are an expert in business process analysis. Your task is to extract key business attributes from a conversation about a business process or initiative.

Extract the following attributes based on the information provided:

1. **frequency**: How often the process is executed
   - Values: "hourly", "daily", "weekly", "monthly", "quarterly", "annually", "ad-hoc"
   - If not explicitly stated, infer from context

2. **business_value**: The business impact or value of the process
   - Values: "critical", "high", "medium", "low"
   - Consider: revenue impact, customer satisfaction, compliance requirements

3. **complexity**: The technical and operational complexity
   - Values: "very_high", "high", "medium", "low", "very_low"
   - Consider: number of steps, systems involved, decision points, exceptions

4. **risk**: The risk level if the process fails or is changed
   - Values: "critical", "high", "medium", "low"
   - Consider: financial impact, regulatory compliance, customer impact

5. **user_count**: Approximate number of users or people involved
   - Values: "1-5", "6-20", "21-50", "51-100", "100+"
   - Include both direct users and those affected by the process

6. **data_sensitivity**: Level of data sensitivity involved
   - Values: "public", "internal", "confidential", "restricted"
   - Consider: PII, financial data, trade secrets, regulatory data

**Instructions:**
- Extract attributes based on explicit information in the conversation
- Make reasonable inferences when information is implied but not stated
- Mark attributes as "unknown" if there is insufficient information
- Provide a brief explanation for each extracted value

**Response Format:**
Provide your response as a JSON object:
{
  "frequency": {
    "value": "<one of the frequency values or 'unknown'>",
    "explanation": "<brief explanation of how this was determined>"
  },
  "business_value": {
    "value": "<one of the business_value values or 'unknown'>",
    "explanation": "<brief explanation>"
  },
  "complexity": {
    "value": "<one of the complexity values or 'unknown'>",
    "explanation": "<brief explanation>"
  },
  "risk": {
    "value": "<one of the risk values or 'unknown'>",
    "explanation": "<brief explanation>"
  },
  "user_count": {
    "value": "<one of the user_count values or 'unknown'>",
    "explanation": "<brief explanation>"
  },
  "data_sensitivity": {
    "value": "<one of the data_sensitivity values or 'unknown'>",
    "explanation": "<brief explanation>"
  }
}

Respond ONLY with the JSON object, no additional text.`;
  }

  /**
   * Parse the attribute extraction response from OpenAI
   */
  private parseAttributeExtractionResponse(content: string): ExtractedAttributes {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      const requiredAttributes = [
        'frequency',
        'business_value',
        'complexity',
        'risk',
        'user_count',
        'data_sensitivity'
      ];

      for (const attr of requiredAttributes) {
        if (!parsed[attr] || !parsed[attr].value) {
          throw new Error(`Missing required attribute: ${attr}`);
        }
      }

      return parsed as ExtractedAttributes;
    } catch (error) {
      throw new Error(
        `Failed to parse attribute extraction response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a model is supported for classification
   */
  private isModelSupported(model: string): boolean {
    return this.SUPPORTED_MODELS.some(
      (supportedModel) =>
        model === supportedModel || model.startsWith(supportedModel)
    );
  }

  /**
   * Build chat messages for classification
   */
  private async buildClassificationMessages(
    processDescription: string,
    conversationHistory?: Array<{ question: string; answer: string }>,
    model?: string
  ): Promise<ChatMessage[]> {
    // O1 models don't support system messages, so we need to adapt
    const isO1Model = model?.startsWith('o1');
    const systemPrompt = await this.getClassificationSystemPrompt();
    
    const messages: ChatMessage[] = [];

    if (!isO1Model) {
      // Standard models support system messages
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      for (const qa of conversationHistory) {
        messages.push({ role: 'assistant', content: qa.question });
        messages.push({ role: 'user', content: qa.answer });
      }
    }

    // Add the process description
    const userPrompt = isO1Model
      ? `${systemPrompt}\n\nPlease classify the following business process:\n\n${processDescription}`
      : `Please classify the following business process:\n\n${processDescription}`;

    messages.push({
      role: 'user',
      content: userPrompt,
    });

    return messages;
  }

  /**
   * Get the system prompt for classification
   * Loads from versioned storage, falls back to default if not found
   */
  private async getClassificationSystemPrompt(): Promise<string> {
    try {
      const prompt = await this.versionedStorage.getPrompt(this.CLASSIFICATION_PROMPT_ID);
      if (prompt) {
        return prompt;
      }
    } catch (error) {
      console.warn('Failed to load classification prompt from storage, using default:', error);
    }

    // Fallback to default prompt
    return `You are an expert in business transformation and process optimization. Your task is to classify business initiatives into one of six transformation categories, evaluated in sequential order:

1. **Eliminate**: Remove the process entirely as it adds no value
2. **Simplify**: Streamline the process by removing unnecessary steps
3. **Digitise**: Convert manual or offline steps to digital
4. **RPA**: Automate repetitive, rule-based tasks with Robotic Process Automation
5. **AI Agent**: Deploy AI to handle tasks requiring judgment or pattern recognition
6. **Agentic AI**: Implement autonomous AI systems that can make decisions and take actions

**Classification Guidelines:**
- Evaluate categories in the order listed above (Eliminate → Simplify → Digitise → RPA → AI Agent → Agentic AI)
- Choose the most appropriate category based on the process characteristics
- Explain why the process fits the selected category and not the preceding ones
- Identify potential for progression to higher categories in the future

**Category Sequence Explanation:**
The categories represent a progression from manual to autonomous:
- **Eliminate** is always the first consideration - if a process adds no value, it should be removed entirely
- **Simplify** comes next - before digitizing or automating, remove unnecessary complexity
- **Digitise** is the foundation for automation - manual processes must be digital before they can be automated
- **RPA** handles rule-based, repetitive tasks that follow predictable patterns
- **AI Agent** adds intelligence for tasks requiring judgment, pattern recognition, or natural language understanding
- **Agentic AI** represents full autonomy where AI systems can make decisions and take actions independently

**Response Format:**
Provide your response as a JSON object with the following structure:
{
  "category": "<one of the six categories>",
  "confidence": <number between 0 and 1>,
  "rationale": "<explanation of why this category was chosen>",
  "categoryProgression": "<explanation of why this category and not preceding ones>",
  "futureOpportunities": "<potential for progression to higher categories>"
}

**Confidence Scoring:**
- 0.90-1.0: High confidence - ONLY when you have explicit, detailed information about ALL of these:
  * Current state (manual/paper-based/digital/automated) - explicitly stated, not assumed
  * Process frequency and volume - specific numbers provided
  * Number of users/stakeholders involved - explicitly stated
  * Complexity (steps, systems, decision points) - clearly described
  * Business value and impact - explicitly mentioned
  * Pain points and inefficiencies - clearly articulated
- 0.5-0.90: Medium confidence - Use this when ANY key information is missing, vague, or assumed. Clarification questions MUST be asked.
- 0.0-0.5: Low confidence - Very vague, contradictory, or insufficient information, requires manual review

**CRITICAL RULES:**
1. NEVER assume the current state - if they don't explicitly say "it's currently manual" or "we have a digital system", you MUST ask
2. NEVER assume complexity, frequency, or user count - these must be explicitly stated
3. If you're making ANY assumptions to reach your classification, your confidence MUST be 0.6-0.85 or lower
4. Default to asking questions rather than making assumptions
5. The goal is DISCOVERY first, classification second

Respond ONLY with the JSON object, no additional text.`;
  }

  /**
   * Parse the classification response from OpenAI
   */
  private parseClassificationResponse(content: string): ClassificationResult {
    try {
      // Extract JSON from response (handle cases where model adds extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.category || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid response format: missing required fields');
      }

      // Validate category
      const validCategories = [
        'Eliminate',
        'Simplify',
        'Digitise',
        'RPA',
        'AI Agent',
        'Agentic AI',
      ];
      if (!validCategories.includes(parsed.category)) {
        throw new Error(`Invalid category: ${parsed.category}`);
      }

      // Validate confidence range
      if (parsed.confidence < 0 || parsed.confidence > 1) {
        throw new Error(`Invalid confidence score: ${parsed.confidence}`);
      }

      return {
        category: parsed.category,
        confidence: parsed.confidence,
        rationale: parsed.rationale || '',
        categoryProgression: parsed.categoryProgression || '',
        futureOpportunities: parsed.futureOpportunities || '',
      };
    } catch (error) {
      throw new Error(
        `Failed to parse classification response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle classification errors with appropriate error messages
   */
  private handleClassificationError(error: any): Error {
    // Timeout errors
    if (error?.message?.includes('timeout')) {
      return new Error(
        'Classification request timed out. Please try again or flag for manual review.'
      );
    }

    // API key errors
    if (error?.status === 401) {
      return new Error('Invalid OpenAI API key. Please check your credentials.');
    }

    // Rate limit errors
    if (error?.status === 429) {
      return new Error(
        'OpenAI API rate limit exceeded. Please try again in a few moments.'
      );
    }

    // Model not found errors
    if (error?.status === 404) {
      return new Error(
        'The requested model is not available. Please select a different model.'
      );
    }

    // Server errors
    if (error?.status && error.status >= 500) {
      return new Error(
        'OpenAI service is currently unavailable. Please try again later or flag for manual review.'
      );
    }

    // Parsing errors
    if (error?.message?.includes('parse')) {
      return new Error(
        'Failed to parse classification response. Please try again or flag for manual review.'
      );
    }

    // Generic error
    return new Error(
      `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
