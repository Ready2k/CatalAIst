import { LLMService, ChatMessage, LLMProviderConfig } from './llm.service';
import { VersionedStorageService } from './versioned-storage.service';
import { JsonStorageService } from './storage.service';

export interface ClassificationResult {
  category: 'Eliminate' | 'Simplify' | 'Digitise' | 'RPA' | 'AI Agent' | 'Agentic AI';
  confidence: number;
  rationale: string;
  categoryProgression: string;
  futureOpportunities: string;
}

export interface ClassificationWithLLMData {
  result: ClassificationResult;
  llmPrompt: string;
  llmResponse: string;
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
  [key: string]: AttributeValue;
}

export interface ClassificationRequest {
  processDescription: string;
  conversationHistory?: Array<{ question: string; answer: string }>;
  model?: string;
  // LLM Provider config
  provider?: 'openai' | 'bedrock';
  apiKey?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
  useRegionalInference?: boolean;
  regionalInferenceEndpoint?: string;
}

export class ClassificationService {
  private llmService: LLMService;
  private versionedStorage: VersionedStorageService;
  private readonly DEFAULT_MODEL = 'gpt-4';
  private readonly CLASSIFICATION_PROMPT_ID = 'classification';
  private readonly ATTRIBUTE_EXTRACTION_PROMPT_ID = 'attribute-extraction';

  constructor(versionedStorage?: VersionedStorageService) {
    this.llmService = new LLMService();
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

      // Validate model is supported
      if (!this.llmService.isModelSupported(model, config)) {
        throw new Error(`Unsupported model: ${model} for provider: ${config.provider}`);
      }

      const messages = await this.buildClassificationMessages(
        request.processDescription,
        request.conversationHistory,
        model
      );

      const response = await this.llmService.chat(messages, model, config);

      return this.parseClassificationResponse(response.content);
    } catch (error) {
      throw this.handleClassificationError(error);
    }
  }

  /**
   * Classify with LLM prompt and response data for audit logging
   * @param request - Classification request with process description and context
   * @returns Classification result with LLM prompt and response
   */
  async classifyWithLLMData(request: ClassificationRequest): Promise<ClassificationWithLLMData> {
    try {
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

      // Validate model is supported
      if (!this.llmService.isModelSupported(model, config)) {
        throw new Error(`Unsupported model: ${model} for provider: ${config.provider}`);
      }

      const messages = await this.buildClassificationMessages(
        request.processDescription,
        request.conversationHistory,
        model
      );

      const response = await this.llmService.chat(messages, model, config);

      // Build prompt string for logging
      const promptString = messages.map(m => `[${m.role}]: ${m.content}`).join('\n\n');

      return {
        result: this.parseClassificationResponse(response.content),
        llmPrompt: promptString,
        llmResponse: response.content
      };
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
    const action = this.determineAction(
      result.confidence,
      request.processDescription,
      request.conversationHistory || []
    );

    return {
      result,
      action
    };
  }

  /**
   * Classify with confidence-based routing and LLM data for audit logging
   * @param request - Classification request
   * @returns Classification result with recommended action and LLM data
   */
  async classifyWithRoutingAndLLMData(request: ClassificationRequest): Promise<ClassificationWithAction & { llmPrompt: string; llmResponse: string }> {
    const classificationWithLLM = await this.classifyWithLLMData(request);
    const action = this.determineAction(
      classificationWithLLM.result.confidence,
      request.processDescription,
      request.conversationHistory || []
    );

    return {
      result: classificationWithLLM.result,
      action,
      llmPrompt: classificationWithLLM.llmPrompt,
      llmResponse: classificationWithLLM.llmResponse
    };
  }

  /**
   * Determine action based on confidence score and description quality
   * @param confidence - Confidence score (0-1)
   * @param processDescription - The process description
   * @param conversationHistory - Previous Q&A exchanges
   * @returns Recommended action
   */
  determineAction(
    confidence: number,
    processDescription: string,
    conversationHistory: Array<{ question: string; answer: string }>
  ): ConfidenceAction {
    const quality = this.assessDescriptionQuality(processDescription, conversationHistory);

    // Low confidence always goes to manual review
    if (confidence < 0.5) {
      return 'manual_review';
    }

    // Poor or Marginal quality description always needs clarification to ensure discovery
    if (quality === 'poor' || quality === 'marginal') {
      return 'clarify';
    }

    // High confidence (>= 0.98) skips clarification only if quality is 'good'
    if (confidence >= 0.98) {
      return 'auto_classify';
    }

    // Anything else (including high confidence but not quite 0.98) triggers clarification
    return 'clarify';

    // Fallback
    return 'auto_classify';
  }

  /**
   * Assess the quality of a process description
   * @param description - Process description
   * @param conversationHistory - Previous Q&A exchanges
   * @returns Quality assessment: 'good', 'marginal', or 'poor'
   */
  private assessDescriptionQuality(
    description: string,
    conversationHistory: Array<{ question: string; answer: string }>
  ): 'good' | 'marginal' | 'poor' {
    // If we've already had a long conversation, consider quality improved
    // but we still want to ensure strategic info is there.
    if (conversationHistory.length >= 3) {
      return 'good';
    }

    const wordCount = description.trim().split(/\s+/).length;
    const allText = (description + ' ' + conversationHistory.map(qa => qa.answer).join(' ')).toLowerCase();

    // Check for key information indicators
    const hasFrequencyInfo = /\b(daily|weekly|monthly|hourly|quarterly|annually|every|once|twice|times? per)\b/i.test(allText);
    const hasVolumeInfo = /\b(\d+|many|few|several|multiple|hundreds?|thousands?|transactions|users|people)\b/i.test(allText);
    const hasCurrentStateInfo = /\b(currently|now|today|manual|paper|digital|automated|system|tool|software|spreadsheet|excel|legacy)\b/i.test(allText);
    const hasComplexityInfo = /\b(steps?|process|workflow|involves?|requires?|needs?|systems?|departments?|approvals)\b/i.test(allText);
    const hasPainPointInfo = /\b(problem|issue|slow|error|mistake|difficult|time-consuming|inefficient|frustrating|pain|bottleneck)\b/i.test(allText);

    // Strategic Information Indicators
    const hasSuccessCriteria = /\b(success|outcome|goal|achieve|benefit|metric|kpi|target)\b/i.test(allText);
    const hasValueInfo = /\b(save|cost|money|revenue|value|hours|roi|investment)\b/i.test(allText);
    const hasRiskInfo = /\b(risk|constraint|blocker|dependency|security|compliance|safety)\b/i.test(allText);
    const hasSponsorship = /\b(sponsor|owner|stakeholder|manager|legal|budget|approved|buy-in)\b/i.test(allText);

    const coreScore = [
      hasFrequencyInfo,
      hasVolumeInfo,
      hasCurrentStateInfo,
      hasComplexityInfo,
      hasPainPointInfo
    ].filter(Boolean).length;

    const strategicScore = [
      hasSuccessCriteria,
      hasValueInfo,
      hasRiskInfo,
      hasSponsorship
    ].filter(Boolean).length;

    // Poor: Very brief OR lacks most core information OR lacks ANY strategic information (discovery first!)
    if (wordCount < 30 || coreScore < 3 || strategicScore < 1) {
      return 'poor';
    }

    // Good: Detailed AND has most core information AND has most strategic information
    if (wordCount > 100 && coreScore >= 4 && strategicScore >= 3) {
      return 'good';
    }

    // Marginal: Everything in between
    return 'marginal';
  }

  /**
   * Extract business attributes from conversation
   * @param processDescription - Process description
   * @param conversationHistory - Conversation history with Q&A
   * @param request - Classification request with LLM config
   * @returns Extracted attributes
   */
  async extractAttributes(
    processDescription: string,
    conversationHistory: Array<{ question: string; answer: string }>,
    request: ClassificationRequest
  ): Promise<ExtractedAttributes> {
    try {
      const modelToUse = request.model || this.DEFAULT_MODEL;

      // Build LLM config
      const config = this.llmService.buildConfig({
        provider: request.provider,
        model: modelToUse,
        apiKey: request.apiKey,
        awsAccessKeyId: request.awsAccessKeyId,
        awsSecretAccessKey: request.awsSecretAccessKey,
        awsSessionToken: request.awsSessionToken,
        awsRegion: request.awsRegion,
        useRegionalInference: request.useRegionalInference,
        regionalInferenceEndpoint: request.regionalInferenceEndpoint,
      });

      // Validate model is supported
      if (!this.llmService.isModelSupported(modelToUse, config)) {
        throw new Error(`Unsupported model: ${modelToUse} for provider: ${config.provider}`);
      }

      const messages = await this.buildAttributeExtractionMessages(
        processDescription,
        conversationHistory,
        modelToUse
      );

      const response = await this.llmService.chat(messages, modelToUse, config);

      return await this.parseAttributeExtractionResponse(response.content);
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
    let templatePrompt = '';
    try {
      const prompt = await this.versionedStorage.getPrompt(this.ATTRIBUTE_EXTRACTION_PROMPT_ID);
      if (prompt) {
        templatePrompt = prompt;
      }
    } catch (error) {
      console.warn('Failed to load attribute extraction prompt from storage, using default:', error);
    }

    // Fetch dynamic strategic questions
    let strategicQuestions = [];
    try {
      const questions = await this.versionedStorage.getStrategicQuestions();
      if (questions && Array.isArray(questions)) {
        strategicQuestions = questions.filter((q: any) => q.active);
      }
    } catch (error) {
      console.warn('Failed to load strategic questions for extraction prompt, using defaults:', error);
    }

    // Default strategic questions if none found
    if (strategicQuestions.length === 0) {
      strategicQuestions = [
        { text: "What would success look like for you?", key: "success_criteria" },
        { text: "What risks and constraints are you aware of?", key: "risks_constraints" },
        { text: "How much time, resource, or money would this save?", key: "value_estimate" },
        { text: "Have you raised this before or do you have sponsorship?", key: "sponsorship" }
      ];
    }

    // Build the dynamic attributes section for the prompt
    let dynamicAttributesPrompt = '';
    let responseFormatJson = '';

    strategicQuestions.forEach((q: any, index: number) => {
      const key = q.key || `custom_attribute_${index}`;
      dynamicAttributesPrompt += `${index + 7}. **${key}**: ${q.text}\n   - Values: Free text description or "unknown"\n\n`;
      responseFormatJson += `  "${key}": {\n    "value": "<description or 'unknown'>",\n    "explanation": "<explanation>"\n  }${index < strategicQuestions.length - 1 ? ',' : ''}\n`;
    });

    const strategicRequirements = `**Strategic Information:**\n${dynamicAttributesPrompt}`;

    const defaultPrompt = `You are an expert in business process analysis. Your task is to extract key business attributes from a conversation about a business process or initiative.

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

${strategicRequirements}

**Instructions:**
- Extract attributes based on explicit information in the conversation
- Make reasonable inferences when information is implied but not stated
- Mark attributes as "unknown" if there is insufficient information
- Provide a brief explanation for each extracted value

**Response Format:**
Provide your response as a JSON object:
{
  "frequency": {
    "value": "<value>",
    "explanation": "<explanation>"
  },
  "business_value": {
    "value": "<value>",
    "explanation": "<explanation>"
  },
  "complexity": {
    "value": "<value>",
    "explanation": "<explanation>"
  },
  "risk": {
    "value": "<value>",
    "explanation": "<explanation>"
  },
  "user_count": {
    "value": "<value>",
    "explanation": "<explanation>"
  },
  "data_sensitivity": {
    "value": "<value>",
    "explanation": "<explanation>"
  },
${responseFormatJson}}

Respond ONLY with the JSON object, no additional text.`;

    if (!templatePrompt) {
      return defaultPrompt;
    }

    // If using custom prompt, ensure strategic questions are included
    if (templatePrompt.includes('{{STRATEGIC_QUESTIONS}}')) {
      return templatePrompt.replace('{{STRATEGIC_QUESTIONS}}', strategicRequirements);
    } else if (!templatePrompt.includes('Strategic Information')) {
      // Automatically append strategic requirements if they seem to be missing
      return `${templatePrompt}\n\n${strategicRequirements}\n\nRespond ONLY with the JSON object, no additional text.`;
    }

    return templatePrompt;
  }

  /**
   * Parse the attribute extraction response from OpenAI
   */
  private async parseAttributeExtractionResponse(content: string): Promise<ExtractedAttributes> {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Required core attributes (including those critical for decision matrix)
      const coreAttributes = [
        'frequency',
        'business_value',
        'complexity',
        'risk',
        'user_count',
        'data_sensitivity',
        'data_source',
        'output_type',
        'judgment_required',
        'current_state'
      ];

      // Fetch dynamic strategic keys to ensure they are included in result
      let strategicKeys = [
        'success_criteria',
        'risks_constraints',
        'value_estimate',
        'sponsorship'
      ];
      try {
        const questions = await this.versionedStorage.getStrategicQuestions();
        if (questions && Array.isArray(questions)) {
          strategicKeys = questions.filter((q: any) => q.active).map((q: any) => q.key);
        }
      } catch (error) {
        console.warn('Failed to load strategic questions for parser, using defaults');
      }

      const allExpectedKeys = [...coreAttributes, ...strategicKeys];

      // Robust parsing: Handle flat JSON or nested objects
      const result: any = {};
      for (const attr of allExpectedKeys) {
        const val = parsed[attr];

        if (val !== undefined && val !== null) {
          if (typeof val === 'object' && val.value !== undefined) {
            // Nested object format: { value: "...", explanation: "..." }
            result[attr] = {
              value: val.value || 'unknown',
              explanation: val.explanation || 'Extracted from conversation'
            };
          } else {
            // Flat format or simple string
            result[attr] = {
              value: String(val),
              explanation: 'Extracted from conversation (flat format)'
            };
          }
        } else {
          // Check for aliases (e.g., "judgement_required" vs "judgment_required")
          const aliasKey = this.findAliasKey(attr, parsed);
          if (aliasKey) {
            const aliasVal = parsed[aliasKey];
            if (typeof aliasVal === 'object' && aliasVal.value !== undefined) {
              result[attr] = aliasVal;
            } else {
              result[attr] = {
                value: String(aliasVal),
                explanation: 'Extracted via alias'
              };
            }
          } else {
            console.warn(`[Attribute Extraction] Missing attribute "${attr}", defaulting to unknown`);
            result[attr] = {
              value: 'unknown',
              explanation: 'Insufficient information provided'
            };
          }
        }
      }

      // Include any other keys returned by LLM (extra context)
      for (const key of Object.keys(parsed)) {
        if (!result[key]) {
          const val = parsed[key];
          result[key] = typeof val === 'object' && val.value !== undefined
            ? val
            : { value: String(val), explanation: 'Additional extracted field' };
        }
      }

      return result as ExtractedAttributes;
    } catch (error) {
      console.error('[Attribute Extraction] Parse error:', error);
      throw new Error(
        `Failed to parse attribute extraction response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Helper to find value by potential key aliases
   */
  private findAliasKey(key: string, data: any): string | null {
    const aliases: { [key: string]: string[] } = {
      'judgment_required': ['judgement_required', 'judgement', 'judgment'],
      'business_value': ['value', 'impact', 'priority'],
      'success_criteria': ['success'],
      'risks_constraints': ['risks', 'constraints', 'blockers'],
      'current_state': ['automation_level', 'process_state']
    };

    const list = aliases[key] || [];
    for (const alias of list) {
      if (data[alias] !== undefined) return alias;
    }

    return null;
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

    // Build context with smart summarization for long conversations
    let contextText = `Process Description:\n${processDescription}\n\n`;

    if (conversationHistory && conversationHistory.length > 0) {
      // For conversations with 5+ Q&As, use summarization to prevent confusion
      if (conversationHistory.length >= 5) {
        contextText += this.buildSummarizedContext(conversationHistory);
      } else {
        // For shorter conversations, include full history
        contextText += 'Clarification Questions and Answers:\n';
        for (const qa of conversationHistory) {
          contextText += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
        }
      }
    }

    // Add the classification request
    const userPrompt = isO1Model
      ? `${systemPrompt}\n\n${contextText}\nBased on the above information, please classify this business process.`
      : `${contextText}\nBased on the above information, please classify this business process.`;

    messages.push({
      role: 'user',
      content: userPrompt,
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
      context += 'Key Information Gathered:\n';
      keyFacts.forEach(fact => {
        context += `- ${fact}\n`;
      });
      context += '\n';
    }

    // Include last 2-3 Q&As for recent context
    const recentCount = Math.min(3, conversationHistory.length);
    const recentQAs = conversationHistory.slice(-recentCount);

    context += `Recent Clarifications (last ${recentCount} of ${conversationHistory.length}):\n`;
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
   * Get the system prompt for classification
   * Loads from versioned storage, falls back to default if not found
   */
  private async getClassificationSystemPrompt(): Promise<string> {
    let promptContent = '';
    try {
      const prompt = await this.versionedStorage.getPrompt(this.CLASSIFICATION_PROMPT_ID);
      if (prompt) {
        promptContent = prompt;
      }
    } catch (error) {
      console.warn('Failed to load classification prompt from storage, using default:', error);
    }

    // Fetch dynamic strategic questions
    let strategicQuestions = [];
    try {
      const questions = await this.versionedStorage.getStrategicQuestions();
      if (questions && Array.isArray(questions)) {
        strategicQuestions = questions.filter((q: any) => q.active);
      }
    } catch (error) {
      console.warn('Failed to load strategic questions for classification prompt, using defaults');
    }

    if (strategicQuestions.length === 0) {
      strategicQuestions = [
        { text: "What would success look like for you?", key: "success_criteria" },
        { text: "What risks and constraints are you aware of?", key: "risks_constraints" },
        { text: "How much time, resource, or money would this save?", key: "value_estimate" },
        { text: "Have you raised this before or do you have sponsorship?", key: "sponsorship" }
      ];
    }

    const strategicRequirements = strategicQuestions.map((q: any, i: number) =>
      `  * ${q.key}: ${q.text}`
    ).join('\n');

    const discoveryRules = `
**Confidence Scoring:**
- 0.95-1.0: High confidence - ONLY when you have explicit, detailed information about ALL of these:
  * Current state (manual/paper-based/digital/automated) - explicitly stated, not assumed
  * Process frequency and volume - specific numbers provided
  * Number of users/stakeholders involved - explicitly stated
  * Complexity (steps, systems, decision points) - clearly described
  * Business value and impact - explicitly mentioned
  * Pain points and inefficiencies - clearly articulated
${strategicRequirements}
- 0.5-0.90: Medium confidence - Use this when ANY of the above information is missing, vague, or assumed. Clarification questions MUST be asked.
- 0.0-0.5: Low confidence - Very vague, contradictory, or insufficient information, requires manual review

**CRITICAL RULES:**
1. NEVER assume the answer to any strategic question - if the user hasn't explicitly stated it, you MUST consider it missing.
2. NEVER assume the current state - if they don't explicitly say "it's currently manual" or "we have a digital system", you MUST ask.
3. NEVER assume complexity, frequency, or user count - these must be explicitly stated.
4. If you're missing ANY of the key information listed above (including strategic questions), your confidence MUST be 0.85 or lower to trigger clarification.
5. Default to asking questions rather than making assumptions.
6. The goal is DISCOVERY first, classification second.
`;

    if (!promptContent) {
      // Use the full default prompt
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

${discoveryRules}

Respond ONLY with the JSON object, no additional text.`;
    }

    // If using custom prompt, ensure discovery rules are included
    if (promptContent.includes('{{STRATEGIC_QUESTIONS}}')) {
      return promptContent.replace('{{STRATEGIC_QUESTIONS}}', strategicRequirements);
    } else if (!promptContent.includes('Confidence Scoring')) {
      // Automatically append discovery rules if they seem to be missing
      return `${promptContent}\n\n${discoveryRules}\n\nRespond ONLY with the JSON object, no additional text.`;
    }

    return promptContent;
  }

  /**
   * Parse the classification response from OpenAI
   */
  private parseClassificationResponse(content: string): ClassificationResult {
    try {
      console.log('[Classification] Raw LLM response:', content.substring(0, 500));

      // Check for malformed responses (e.g., "Clarification 9")
      const trimmedContent = content.trim();
      if (/^Clarification\s+\d+$/i.test(trimmedContent)) {
        console.error('[Classification] Detected clarification loop response:', trimmedContent);
        throw new Error('LLM returned clarification loop response instead of classification. This may indicate the model is confused or has been asked too many questions.');
      }

      // Extract JSON from response (handle cases where model adds extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[Classification] No JSON found in response. Full content:', content);
        throw new Error('No JSON found in response');
      }

      console.log('[Classification] Extracted JSON:', jsonMatch[0].substring(0, 300));
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
