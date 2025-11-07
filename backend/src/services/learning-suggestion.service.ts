import { randomUUID } from 'crypto';
import {
  LearningAnalysis,
  LearningSuggestion,
  Session,
  DecisionMatrix,
  Rule,
  Attribute
} from '../../../shared/types';
import { OpenAIService } from './openai.service';
import { JsonStorageService } from './storage.service';
import { SessionStorageService } from './session-storage.service';
import { VersionedStorageService } from './versioned-storage.service';

/**
 * AI-powered suggestion generation service
 * Analyzes patterns and generates improvement suggestions using LLM
 */
export class LearningSuggestionService {
  private openaiService: OpenAIService;
  private jsonStorage: JsonStorageService;
  private sessionStorage: SessionStorageService;
  private versionedStorage: VersionedStorageService;

  constructor(
    openaiService: OpenAIService,
    jsonStorage: JsonStorageService,
    sessionStorage: SessionStorageService,
    versionedStorage: VersionedStorageService
  ) {
    this.openaiService = openaiService;
    this.jsonStorage = jsonStorage;
    this.sessionStorage = sessionStorage;
    this.versionedStorage = versionedStorage;
  }

  /**
   * Generate suggestions based on analysis using LLM
   */
  async generateSuggestions(
    analysis: LearningAnalysis,
    apiKey: string
  ): Promise<LearningSuggestion[]> {
    // Get current decision matrix
    const currentMatrix = await this.versionedStorage.getLatestDecisionMatrix();
    
    if (!currentMatrix) {
      throw new Error('No active decision matrix found');
    }

    // Get example sessions for misclassifications
    const exampleSessions = await this.getExampleSessions(analysis);

    // Build prompt for LLM
    const prompt = this.buildSuggestionPrompt(analysis, currentMatrix, exampleSessions);

    // Call LLM
    const response = await this.openaiService.chat(
      [
        {
          role: 'system',
          content: 'You are an expert in business process transformation and decision rule optimization. Analyze classification patterns and suggest improvements to decision matrix rules.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      'gpt-4',
      apiKey
    );

    // Parse LLM response into suggestions
    const suggestions = this.parseSuggestions(response.content, analysis.analysisId);

    // Save suggestions
    for (const suggestion of suggestions) {
      await this.saveSuggestion(suggestion);
    }

    // Update analysis with suggestion IDs
    analysis.suggestions = suggestions.map(s => s.suggestionId);
    await this.jsonStorage.writeJson(
      `learning/analysis-${analysis.analysisId}.json`,
      analysis
    );

    return suggestions;
  }

  /**
   * Build prompt for LLM to generate suggestions
   */
  private buildSuggestionPrompt(
    analysis: LearningAnalysis,
    matrix: DecisionMatrix,
    exampleSessions: Session[]
  ): string {
    let prompt = `# Decision Matrix Improvement Analysis

## Current Performance
- Overall Agreement Rate: ${(analysis.findings.overallAgreementRate * 100).toFixed(1)}%
- Total Sessions Analyzed: ${analysis.dataRange.totalSessions}

## Agreement Rates by Category
`;

    for (const [category, rate] of Object.entries(analysis.findings.categoryAgreementRates)) {
      prompt += `- ${category}: ${(rate * 100).toFixed(1)}%\n`;
    }

    prompt += `\n## Common Misclassifications\n`;
    
    for (const misc of analysis.findings.commonMisclassifications.slice(0, 5)) {
      prompt += `- ${misc.from} → ${misc.to}: ${misc.count} occurrences\n`;
    }

    prompt += `\n## Identified Patterns\n`;
    
    for (const pattern of analysis.findings.identifiedPatterns) {
      prompt += `- ${pattern}\n`;
    }

    prompt += `\n## Current Decision Matrix (v${matrix.version})

### Attributes
`;
    
    for (const attr of matrix.attributes) {
      prompt += `- ${attr.name} (weight: ${attr.weight}): ${attr.description}\n`;
    }

    prompt += `\n### Active Rules (${matrix.rules.filter(r => r.active).length} total)
`;
    
    for (const rule of matrix.rules.filter(r => r.active).slice(0, 10)) {
      prompt += `\nRule: ${rule.name}
- Priority: ${rule.priority}
- Conditions: ${JSON.stringify(rule.conditions)}
- Action: ${rule.action.type} ${rule.action.targetCategory || ''}
- Rationale: ${rule.action.rationale}
`;
    }

    prompt += `\n## Example Misclassified Sessions (${exampleSessions.length} samples)
`;
    
    for (const session of exampleSessions.slice(0, 3)) {
      const conv = session.conversations[session.conversations.length - 1];
      prompt += `\nSession ${session.sessionId}:
- Process: ${conv.processDescription.substring(0, 200)}...
- Classified as: ${session.classification?.category}
- Should be: ${session.feedback?.correctedCategory}
- Confidence: ${session.classification?.confidence.toFixed(2)}
`;
    }

    prompt += `\n## Task

Based on this analysis, suggest 2-5 improvements to the decision matrix. For each suggestion, provide:

1. **Type**: One of: new_rule, modify_rule, adjust_weight, new_attribute
2. **Rationale**: Why this change would improve accuracy
3. **Impact Estimate**: 
   - Affected categories (list)
   - Expected improvement percentage (0-100)
   - Confidence level (0.0-1.0)
4. **Suggested Change**: Specific details of the change

Format your response as a JSON array of suggestions. Each suggestion should have this structure:

\`\`\`json
[
  {
    "type": "new_rule" | "modify_rule" | "adjust_weight" | "new_attribute",
    "rationale": "Explanation of why this change helps",
    "impactEstimate": {
      "affectedCategories": ["Category1", "Category2"],
      "expectedImprovementPercent": 15,
      "confidenceLevel": 0.8
    },
    "suggestedChange": {
      // For new_rule:
      "newRule": {
        "name": "Rule name",
        "description": "Rule description",
        "conditions": [{"attribute": "attr", "operator": "==", "value": "val"}],
        "action": {
          "type": "override",
          "targetCategory": "RPA",
          "rationale": "Why this action"
        },
        "priority": 10,
        "active": true
      },
      // For modify_rule:
      "ruleId": "existing-rule-uuid",
      "modifiedRule": { /* same structure as newRule */ },
      // For adjust_weight:
      "attributeName": "frequency",
      "newWeight": 0.8,
      // For new_attribute:
      "newAttribute": {
        "name": "attribute_name",
        "type": "categorical",
        "possibleValues": ["low", "medium", "high"],
        "weight": 0.5,
        "description": "Description"
      }
    }
  }
]
\`\`\`

Provide only the JSON array, no additional text.`;

    return prompt;
  }

  /**
   * Get example sessions for misclassifications
   */
  private async getExampleSessions(analysis: LearningAnalysis): Promise<Session[]> {
    const exampleIds = new Set<string>();
    
    // Collect example session IDs from misclassifications
    for (const misc of analysis.findings.commonMisclassifications) {
      for (const exampleId of misc.examples) {
        exampleIds.add(exampleId);
        if (exampleIds.size >= 5) break;
      }
      if (exampleIds.size >= 5) break;
    }

    // Load sessions
    const sessions: Session[] = [];
    
    for (const sessionId of exampleIds) {
      try {
        const session = await this.sessionStorage.loadSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      } catch (error) {
        console.error(`Error loading session ${sessionId}:`, error);
      }
    }

    return sessions;
  }

  /**
   * Parse LLM response into suggestion objects
   */
  private parseSuggestions(
    llmResponse: string,
    analysisId: string
  ): LearningSuggestion[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = llmResponse.trim();
      
      if (jsonStr.includes('```json')) {
        const match = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      } else if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }

      const parsed = JSON.parse(jsonStr);
      const suggestionsArray = Array.isArray(parsed) ? parsed : [parsed];

      return suggestionsArray.map(s => {
        // Generate rule ID if creating new rule
        if (s.type === 'new_rule' && s.suggestedChange.newRule) {
          s.suggestedChange.newRule.ruleId = randomUUID();
        }

        return {
          suggestionId: randomUUID(),
          createdAt: new Date().toISOString(),
          analysisId,
          type: s.type,
          status: 'pending',
          rationale: s.rationale,
          impactEstimate: s.impactEstimate,
          suggestedChange: s.suggestedChange
        } as LearningSuggestion;
      });
    } catch (error) {
      console.error('Error parsing LLM suggestions:', error);
      console.error('LLM Response:', llmResponse);
      
      // Return empty array if parsing fails
      return [];
    }
  }

  /**
   * Save suggestion to storage
   */
  async saveSuggestion(suggestion: LearningSuggestion): Promise<void> {
    const relativePath = `learning/suggestion-${suggestion.suggestionId}.json`;
    await this.jsonStorage.writeJson(relativePath, suggestion);
  }

  /**
   * Load suggestion from storage
   */
  async loadSuggestion(suggestionId: string): Promise<LearningSuggestion | null> {
    const relativePath = `learning/suggestion-${suggestionId}.json`;
    
    try {
      const exists = await this.jsonStorage.exists(relativePath);
      if (!exists) {
        return null;
      }

      return await this.jsonStorage.readJson<LearningSuggestion>(relativePath);
    } catch (error) {
      console.error(`Error loading suggestion ${suggestionId}:`, error);
      return null;
    }
  }

  /**
   * List all suggestions with optional status filter
   */
  async listSuggestions(status?: LearningSuggestion['status']): Promise<LearningSuggestion[]> {
    try {
      const files = await this.jsonStorage.listFiles('learning');
      const suggestionFiles = files
        .filter(f => f.startsWith('suggestion-') && f.endsWith('.json'))
        .sort()
        .reverse(); // Most recent first

      const suggestions: LearningSuggestion[] = [];

      for (const file of suggestionFiles) {
        const suggestionId = file.replace('suggestion-', '').replace('.json', '');
        const suggestion = await this.loadSuggestion(suggestionId);
        
        if (suggestion && (!status || suggestion.status === status)) {
          suggestions.push(suggestion);
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error listing suggestions:', error);
      return [];
    }
  }

  /**
   * Update suggestion status
   */
  async updateSuggestionStatus(
    suggestionId: string,
    status: LearningSuggestion['status'],
    reviewedBy?: string,
    reviewNotes?: string
  ): Promise<LearningSuggestion> {
    const suggestion = await this.loadSuggestion(suggestionId);
    
    if (!suggestion) {
      throw new Error(`Suggestion ${suggestionId} not found`);
    }

    suggestion.status = status;
    suggestion.reviewedBy = reviewedBy;
    suggestion.reviewedAt = new Date().toISOString();
    suggestion.reviewNotes = reviewNotes;

    await this.saveSuggestion(suggestion);
    
    return suggestion;
  }
}
