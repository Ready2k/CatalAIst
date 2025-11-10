import { v4 as uuidv4 } from 'uuid';
import { OpenAIService } from './openai.service';
import { LLMService, LLMProviderConfig } from './llm.service';
import { VersionedStorageService } from './versioned-storage.service';
import { DecisionMatrix, Attribute, Rule, TransformationCategory } from '../../../shared/types';

/**
 * Service for managing decision matrix generation and operations
 */
export class DecisionMatrixService {
  private openAIService: OpenAIService;
  private llmService: LLMService;
  private versionedStorage: VersionedStorageService;
  private readonly DECISION_MATRIX_GENERATION_PROMPT_ID = 'decision-matrix-generation';

  constructor(openAIService: OpenAIService, versionedStorage: VersionedStorageService) {
    this.openAIService = openAIService;
    this.llmService = new LLMService();
    this.versionedStorage = versionedStorage;
  }

  /**
   * Generate initial decision matrix using AI
   * Creates a baseline decision matrix with default attributes and rules
   */
  async generateInitialMatrix(llmConfig: LLMProviderConfig, model: string = 'gpt-4'): Promise<DecisionMatrix> {
    const prompt = await this.getDecisionMatrixGenerationPrompt();
    
    const response = await this.llmService.chat(
      [
        {
          role: 'system',
          content: 'You are an expert in business transformation and process automation. Generate a decision matrix for classifying business initiatives.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model,
      llmConfig
    );

    // Parse the LLM response to extract the decision matrix structure
    const matrixData = this.parseMatrixResponse(response.content);
    
    // Create the decision matrix object
    const matrix: DecisionMatrix = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      createdBy: 'ai',
      description: matrixData.description || 'AI-generated baseline decision matrix for transformation category classification',
      attributes: matrixData.attributes,
      rules: matrixData.rules,
      active: true
    };

    // Save the matrix
    await this.versionedStorage.saveDecisionMatrix(matrix);

    return matrix;
  }

  /**
   * Get the decision matrix generation prompt
   * Loads from versioned storage, falls back to default if not found
   */
  private async getDecisionMatrixGenerationPrompt(): Promise<string> {
    try {
      const prompt = await this.versionedStorage.getPrompt(this.DECISION_MATRIX_GENERATION_PROMPT_ID);
      if (prompt) {
        return prompt;
      }
    } catch (error) {
      console.warn('Failed to load decision matrix generation prompt from storage, using default:', error);
    }

    // Fallback to default prompt (should not happen after initialization)
    return `Generate a comprehensive decision matrix for classifying business initiatives into six transformation categories:
1. Eliminate - Remove unnecessary processes
2. Simplify - Streamline and reduce complexity
3. Digitise - Convert manual/offline to digital
4. RPA - Robotic Process Automation for repetitive tasks
5. AI Agent - AI-powered assistance with human oversight
6. Agentic AI - Autonomous AI decision-making

The decision matrix should include:

1. **Attributes** - Key characteristics to evaluate (with weights 0-1):
   - frequency: How often the process runs (categorical: daily, weekly, monthly, quarterly, yearly)
   - business_value: Impact on business outcomes (categorical: low, medium, high, critical)
   - complexity: Process complexity level (categorical: low, medium, high, very_high)
   - risk: Risk level if automated (categorical: low, medium, high, critical)
   - user_count: Number of users affected (numeric)
   - data_sensitivity: Sensitivity of data handled (categorical: public, internal, confidential, restricted)

2. **Rules** - Condition-based logic to guide classification:
   - Each rule should have conditions (attribute + operator + value)
   - Actions can be: override (force category), adjust_confidence (+/- adjustment), flag_review
   - Include priority (higher = evaluated first)
   - Provide clear rationale for each rule

Generate rules that follow transformation best practices:
- High-risk or critical data sensitivity should flag for review
- High-frequency + low-complexity + low-risk favors RPA
- High-complexity + high-value favors AI Agent or Agentic AI
- Low-value processes should be considered for Eliminate or Simplify
- Manual processes with no automation potential should be Digitise

Return ONLY a valid JSON object with this structure:
{
  "description": "Brief description of the matrix",
  "attributes": [
    {
      "name": "attribute_name",
      "type": "categorical|numeric|boolean",
      "possibleValues": ["value1", "value2"] (only for categorical),
      "weight": 0.0-1.0,
      "description": "What this attribute measures"
    }
  ],
  "rules": [
    {
      "ruleId": "uuid",
      "name": "Rule name",
      "description": "What this rule does",
      "conditions": [
        {
          "attribute": "attribute_name",
          "operator": "==|!=|>|<|>=|<=|in|not_in",
          "value": "value or array for in/not_in"
        }
      ],
      "action": {
        "type": "override|adjust_confidence|flag_review",
        "targetCategory": "category name" (only for override),
        "confidenceAdjustment": +/- number (only for adjust_confidence),
        "rationale": "Why this action is taken"
      },
      "priority": number (0-100, higher = first),
      "active": true
    }
  ]
}

Generate at least 6 attributes and 10-15 rules covering various scenarios.`;
  }

  /**
   * Parse the LLM response to extract decision matrix data
   */
  private parseMatrixResponse(content: string): { description: string; attributes: Attribute[]; rules: Rule[] } {
    try {
      // Extract JSON from the response (handle markdown code blocks)
      let jsonStr = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Validate and transform the data
      const attributes: Attribute[] = parsed.attributes.map((attr: any) => ({
        name: attr.name,
        type: attr.type,
        possibleValues: attr.possibleValues,
        weight: attr.weight,
        description: attr.description
      }));

      const rules: Rule[] = parsed.rules.map((rule: any) => ({
        ruleId: rule.ruleId || uuidv4(),
        name: rule.name,
        description: rule.description,
        conditions: rule.conditions,
        action: rule.action,
        priority: rule.priority,
        active: rule.active !== false // Default to true
      }));

      return {
        description: parsed.description,
        attributes,
        rules
      };
    } catch (error) {
      throw new Error(`Failed to parse decision matrix from LLM response: ${error}`);
    }
  }

  /**
   * Check if initial matrix exists
   */
  async hasInitialMatrix(): Promise<boolean> {
    const matrix = await this.versionedStorage.getLatestDecisionMatrix();
    return matrix !== null;
  }

  /**
   * Get or generate initial matrix
   * If no matrix exists, generates one. Otherwise returns existing.
   */
  async ensureInitialMatrix(llmConfig: LLMProviderConfig, model: string = 'gpt-4'): Promise<DecisionMatrix> {
    const existing = await this.versionedStorage.getLatestDecisionMatrix();
    
    if (existing) {
      return existing;
    }

    return await this.generateInitialMatrix(llmConfig, model);
  }
}
