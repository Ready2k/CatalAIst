import {
  DecisionMatrix,
  Rule,
  Condition,
  Classification,
  DecisionMatrixEvaluation,
  TransformationCategory,
  Attribute
} from '../types';

/**
 * Service for evaluating decision matrix rules against classifications
 */
export class DecisionMatrixEvaluatorService {
  /**
   * Evaluate decision matrix rules against a classification
   * @param matrix - The decision matrix to apply
   * @param classification - The original LLM classification
   * @param extractedAttributes - Attributes extracted from the conversation
   * @returns Decision matrix evaluation with final classification
   */
  evaluateMatrix(
    matrix: DecisionMatrix,
    classification: Classification,
    extractedAttributes: { [key: string]: any }
  ): DecisionMatrixEvaluation {
    // Get active rules sorted by priority (highest first)
    const activeRules = matrix.rules
      .filter(rule => rule.active)
      .sort((a, b) => b.priority - a.priority);

    const triggeredRules: Array<{
      ruleId: string;
      ruleName: string;
      action: Rule['action'];
    }> = [];

    let finalClassification = { ...classification };
    let overridden = false;

    // Evaluate each rule in priority order
    for (const rule of activeRules) {
      if (this.evaluateConditions(rule.conditions, extractedAttributes)) {
        // Sanitize action to ensure targetCategory is a string
        const sanitizedAction = { ...rule.action };
        if (sanitizedAction.targetCategory && Array.isArray(sanitizedAction.targetCategory)) {
          sanitizedAction.targetCategory = sanitizedAction.targetCategory[0] as TransformationCategory;
          console.warn(`Rule "${rule.name}" had targetCategory as array, using first value: ${sanitizedAction.targetCategory}`);
        }
        
        triggeredRules.push({
          ruleId: rule.ruleId,
          ruleName: rule.name,
          action: sanitizedAction
        });

        // Apply the rule action
        const result = this.applyRuleAction(rule, finalClassification, extractedAttributes);
        finalClassification = result.classification;
        
        if (result.overridden) {
          overridden = true;
        }

        // If this is an override action, stop processing further rules
        if (rule.action.type === 'override') {
          break;
        }
      }
    }

    // Calculate weighted scores if no override occurred
    if (!overridden && triggeredRules.length > 0) {
      const weightedScores = this.calculateWeightedScores(matrix, extractedAttributes);
      
      // If weighted scores suggest a different category with high confidence, consider it
      const suggestedCategory = this.getSuggestedCategory(weightedScores);
      if (suggestedCategory && suggestedCategory !== finalClassification.category) {
        // Only override if the weighted score is significantly higher
        const currentScore = weightedScores[finalClassification.category] || 0;
        const suggestedScore = weightedScores[suggestedCategory] || 0;
        
        if (suggestedScore > currentScore + 0.2) {
          finalClassification = {
            ...finalClassification,
            category: suggestedCategory,
            rationale: `${finalClassification.rationale}\n\nDecision matrix weighted scoring suggested ${suggestedCategory} based on extracted attributes.`
          };
          overridden = true;
        }
      }
    }

    return {
      matrixVersion: matrix.version,
      originalClassification: classification,
      extractedAttributes,
      triggeredRules,
      finalClassification,
      overridden
    };
  }

  /**
   * Evaluate all conditions for a rule (AND logic)
   */
  private evaluateConditions(
    conditions: Condition[],
    attributes: { [key: string]: any }
  ): boolean {
    return conditions.every(condition => 
      this.evaluateCondition(condition, attributes)
    );
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: Condition,
    attributes: { [key: string]: any }
  ): boolean {
    const attributeValue = attributes[condition.attribute];
    
    // If attribute doesn't exist, condition fails
    if (attributeValue === undefined || attributeValue === null) {
      return false;
    }

    switch (condition.operator) {
      case '==':
        return attributeValue === condition.value;
      
      case '!=':
        return attributeValue !== condition.value;
      
      case '>':
        return Number(attributeValue) > Number(condition.value);
      
      case '<':
        return Number(attributeValue) < Number(condition.value);
      
      case '>=':
        return Number(attributeValue) >= Number(condition.value);
      
      case '<=':
        return Number(attributeValue) <= Number(condition.value);
      
      case 'in':
        if (!Array.isArray(condition.value)) {
          return false;
        }
        return condition.value.includes(attributeValue);
      
      case 'not_in':
        if (!Array.isArray(condition.value)) {
          return false;
        }
        return !condition.value.includes(attributeValue);
      
      default:
        return false;
    }
  }

  /**
   * Apply a rule action to the classification
   */
  private applyRuleAction(
    rule: Rule,
    classification: Classification,
    attributes: { [key: string]: any }
  ): { classification: Classification; overridden: boolean } {
    let newClassification = { ...classification };
    let overridden = false;

    switch (rule.action.type) {
      case 'override':
        if (rule.action.targetCategory) {
          newClassification = {
            ...classification,
            category: rule.action.targetCategory,
            rationale: `${classification.rationale}\n\nOverridden by decision matrix rule: ${rule.action.rationale}`
          };
          overridden = true;
        }
        break;

      case 'adjust_confidence':
        if (rule.action.confidenceAdjustment !== undefined) {
          const newConfidence = Math.max(
            0,
            Math.min(1, classification.confidence + rule.action.confidenceAdjustment)
          );
          newClassification = {
            ...classification,
            confidence: newConfidence,
            rationale: `${classification.rationale}\n\nConfidence adjusted by decision matrix rule: ${rule.action.rationale}`
          };
        }
        break;

      case 'flag_review':
        // Flag for manual review by setting confidence very low
        newClassification = {
          ...classification,
          confidence: 0.3,
          rationale: `${classification.rationale}\n\nFlagged for manual review: ${rule.action.rationale}`
        };
        break;
    }

    return { classification: newClassification, overridden };
  }

  /**
   * Calculate weighted scores for each category based on attributes
   */
  private calculateWeightedScores(
    matrix: DecisionMatrix,
    attributes: { [key: string]: any }
  ): { [category: string]: number } {
    const scores: { [category: string]: number } = {
      'Eliminate': 0,
      'Simplify': 0,
      'Digitise': 0,
      'RPA': 0,
      'AI Agent': 0,
      'Agentic AI': 0
    };

    // Calculate scores based on attribute values and weights
    // This is a simplified scoring mechanism
    
    // Business value scoring
    const businessValue = attributes['business_value'];
    if (businessValue === 'low') {
      scores['Eliminate'] += 0.3;
      scores['Simplify'] += 0.2;
    } else if (businessValue === 'medium') {
      scores['Simplify'] += 0.2;
      scores['Digitise'] += 0.3;
      scores['RPA'] += 0.2;
    } else if (businessValue === 'high' || businessValue === 'critical') {
      scores['RPA'] += 0.2;
      scores['AI Agent'] += 0.3;
      scores['Agentic AI'] += 0.3;
    }

    // Complexity scoring
    const complexity = attributes['complexity'];
    if (complexity === 'low') {
      scores['Simplify'] += 0.2;
      scores['Digitise'] += 0.3;
      scores['RPA'] += 0.3;
    } else if (complexity === 'medium') {
      scores['Digitise'] += 0.2;
      scores['RPA'] += 0.3;
      scores['AI Agent'] += 0.2;
    } else if (complexity === 'high' || complexity === 'very_high') {
      scores['AI Agent'] += 0.3;
      scores['Agentic AI'] += 0.3;
    }

    // Frequency scoring
    const frequency = attributes['frequency'];
    if (frequency === 'daily') {
      scores['RPA'] += 0.3;
      scores['AI Agent'] += 0.2;
      scores['Agentic AI'] += 0.2;
    } else if (frequency === 'weekly') {
      scores['RPA'] += 0.2;
      scores['AI Agent'] += 0.2;
    } else if (frequency === 'monthly' || frequency === 'quarterly') {
      scores['Digitise'] += 0.2;
      scores['RPA'] += 0.1;
    }

    // Risk scoring
    const risk = attributes['risk'];
    if (risk === 'critical' || risk === 'high') {
      // High risk reduces automation scores
      scores['RPA'] -= 0.2;
      scores['AI Agent'] -= 0.3;
      scores['Agentic AI'] -= 0.4;
      scores['Simplify'] += 0.2;
    } else if (risk === 'low') {
      scores['RPA'] += 0.2;
      scores['AI Agent'] += 0.2;
      scores['Agentic AI'] += 0.2;
    }

    // Normalize scores to 0-1 range
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      for (const category in scores) {
        scores[category] = Math.max(0, scores[category] / maxScore);
      }
    }

    return scores;
  }

  /**
   * Get the suggested category based on weighted scores
   */
  private getSuggestedCategory(scores: { [category: string]: number }): TransformationCategory | null {
    let maxScore = 0;
    let suggestedCategory: TransformationCategory | null = null;

    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        suggestedCategory = category as TransformationCategory;
      }
    }

    // Only suggest if score is above threshold
    return maxScore > 0.5 ? suggestedCategory : null;
  }

  /**
   * Extract attributes from conversation context using simple heuristics
   * This is a fallback when LLM extraction is not available
   */
  extractAttributesFromContext(
    processDescription: string,
    clarificationQA: Array<{ question: string; answer: string }>
  ): { [key: string]: any } {
    const attributes: { [key: string]: any } = {};
    
    const fullText = `${processDescription} ${clarificationQA.map(qa => `${qa.question} ${qa.answer}`).join(' ')}`.toLowerCase();

    // Frequency detection
    if (fullText.includes('daily') || fullText.includes('every day')) {
      attributes['frequency'] = 'daily';
    } else if (fullText.includes('weekly') || fullText.includes('every week')) {
      attributes['frequency'] = 'weekly';
    } else if (fullText.includes('monthly') || fullText.includes('every month')) {
      attributes['frequency'] = 'monthly';
    } else if (fullText.includes('quarterly')) {
      attributes['frequency'] = 'quarterly';
    } else if (fullText.includes('yearly') || fullText.includes('annually')) {
      attributes['frequency'] = 'yearly';
    }

    // Business value detection
    if (fullText.includes('critical') || fullText.includes('essential') || fullText.includes('vital')) {
      attributes['business_value'] = 'critical';
    } else if (fullText.includes('high value') || fullText.includes('important')) {
      attributes['business_value'] = 'high';
    } else if (fullText.includes('low value') || fullText.includes('minor')) {
      attributes['business_value'] = 'low';
    } else {
      attributes['business_value'] = 'medium';
    }

    // Complexity detection
    if (fullText.includes('very complex') || fullText.includes('extremely complex')) {
      attributes['complexity'] = 'very_high';
    } else if (fullText.includes('complex') || fullText.includes('complicated')) {
      attributes['complexity'] = 'high';
    } else if (fullText.includes('simple') || fullText.includes('straightforward')) {
      attributes['complexity'] = 'low';
    } else {
      attributes['complexity'] = 'medium';
    }

    // Risk detection
    if (fullText.includes('critical risk') || fullText.includes('high risk')) {
      attributes['risk'] = 'critical';
    } else if (fullText.includes('risky') || fullText.includes('risk')) {
      attributes['risk'] = 'high';
    } else if (fullText.includes('low risk') || fullText.includes('safe')) {
      attributes['risk'] = 'low';
    } else {
      attributes['risk'] = 'medium';
    }

    // User count detection (simple number extraction)
    const userMatch = fullText.match(/(\d+)\s*(users?|people|employees)/);
    if (userMatch) {
      attributes['user_count'] = parseInt(userMatch[1]);
    }

    // Data sensitivity detection
    if (fullText.includes('confidential') || fullText.includes('sensitive')) {
      attributes['data_sensitivity'] = 'confidential';
    } else if (fullText.includes('restricted') || fullText.includes('classified')) {
      attributes['data_sensitivity'] = 'restricted';
    } else if (fullText.includes('internal')) {
      attributes['data_sensitivity'] = 'internal';
    } else {
      attributes['data_sensitivity'] = 'public';
    }

    return attributes;
  }
}
