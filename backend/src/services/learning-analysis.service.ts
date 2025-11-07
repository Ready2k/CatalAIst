import { randomUUID } from 'crypto';
import { 
  Session, 
  LearningAnalysis, 
  TransformationCategory 
} from '../../../shared/types';
import { SessionStorageService } from './session-storage.service';
import { JsonStorageService } from './storage.service';

/**
 * Feedback analysis service for AI Learning Engine
 * Collects misclassifications, calculates agreement rates, and identifies patterns
 */
export class LearningAnalysisService {
  private sessionStorage: SessionStorageService;
  private jsonStorage: JsonStorageService;

  constructor(
    sessionStorage: SessionStorageService,
    jsonStorage: JsonStorageService
  ) {
    this.sessionStorage = sessionStorage;
    this.jsonStorage = jsonStorage;
  }

  /**
   * Collect all sessions with feedback for analysis
   */
  async collectSessionsWithFeedback(
    startDate?: Date,
    endDate?: Date
  ): Promise<Session[]> {
    const sessionIds = await this.sessionStorage.listSessions();
    const sessionsWithFeedback: Session[] = [];

    for (const sessionId of sessionIds) {
      try {
        const session = await this.sessionStorage.loadSession(sessionId);
        
        if (!session || !session.feedback || !session.classification) {
          continue;
        }

        // Filter by date range if provided
        if (startDate || endDate) {
          const sessionDate = new Date(session.createdAt);
          
          if (startDate && sessionDate < startDate) {
            continue;
          }
          
          if (endDate && sessionDate > endDate) {
            continue;
          }
        }

        sessionsWithFeedback.push(session);
      } catch (error) {
        console.error(`Error loading session ${sessionId}:`, error);
        // Continue with other sessions
      }
    }

    return sessionsWithFeedback;
  }

  /**
   * Calculate overall agreement rate
   * Agreement = classification confirmed by user
   */
  calculateOverallAgreementRate(sessions: Session[]): number {
    if (sessions.length === 0) {
      return 0;
    }

    const confirmedCount = sessions.filter(
      s => s.feedback?.confirmed === true
    ).length;

    return confirmedCount / sessions.length;
  }

  /**
   * Calculate agreement rate by category
   */
  calculateAgreementRateByCategory(
    sessions: Session[]
  ): { [category: string]: number } {
    const categoryStats: {
      [category: string]: { total: number; confirmed: number };
    } = {};

    // Initialize all categories
    const categories: TransformationCategory[] = [
      'Eliminate',
      'Simplify',
      'Digitise',
      'RPA',
      'AI Agent',
      'Agentic AI'
    ];

    categories.forEach(cat => {
      categoryStats[cat] = { total: 0, confirmed: 0 };
    });

    // Count sessions by category
    for (const session of sessions) {
      if (!session.classification || !session.feedback) {
        continue;
      }

      const category = session.classification.category;
      categoryStats[category].total++;

      if (session.feedback.confirmed) {
        categoryStats[category].confirmed++;
      }
    }

    // Calculate rates
    const rates: { [category: string]: number } = {};
    
    for (const category of categories) {
      const stats = categoryStats[category];
      rates[category] = stats.total > 0 ? stats.confirmed / stats.total : 0;
    }

    return rates;
  }

  /**
   * Identify common misclassification patterns
   */
  identifyMisclassifications(sessions: Session[]): Array<{
    from: string;
    to: string;
    count: number;
    examples: string[];
  }> {
    const misclassificationMap: {
      [key: string]: { count: number; examples: string[] };
    } = {};

    for (const session of sessions) {
      if (
        !session.classification ||
        !session.feedback ||
        session.feedback.confirmed ||
        !session.feedback.correctedCategory
      ) {
        continue;
      }

      const from = session.classification.category;
      const to = session.feedback.correctedCategory;
      const key = `${from}->${to}`;

      if (!misclassificationMap[key]) {
        misclassificationMap[key] = { count: 0, examples: [] };
      }

      misclassificationMap[key].count++;
      
      // Keep up to 5 examples
      if (misclassificationMap[key].examples.length < 5) {
        misclassificationMap[key].examples.push(session.sessionId);
      }
    }

    // Convert to array and sort by count
    return Object.entries(misclassificationMap)
      .map(([key, data]) => {
        const [from, to] = key.split('->');
        return {
          from,
          to,
          count: data.count,
          examples: data.examples
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Identify patterns in misclassifications
   * Returns human-readable pattern descriptions
   */
  identifyPatterns(
    sessions: Session[],
    misclassifications: Array<{
      from: string;
      to: string;
      count: number;
      examples: string[];
    }>
  ): string[] {
    const patterns: string[] = [];

    // Pattern 1: Most common misclassification
    if (misclassifications.length > 0) {
      const top = misclassifications[0];
      patterns.push(
        `Most common misclassification: ${top.from} → ${top.to} (${top.count} occurrences)`
      );
    }

    // Pattern 2: Over-classification (classifying too high)
    const overClassifications = misclassifications.filter(m => {
      const categories = ['Eliminate', 'Simplify', 'Digitise', 'RPA', 'AI Agent', 'Agentic AI'];
      const fromIdx = categories.indexOf(m.from);
      const toIdx = categories.indexOf(m.to);
      return fromIdx > toIdx;
    });

    if (overClassifications.length > 0) {
      const total = overClassifications.reduce((sum, m) => sum + m.count, 0);
      patterns.push(
        `Over-classification tendency: ${total} cases where system classified higher than correct category`
      );
    }

    // Pattern 3: Under-classification (classifying too low)
    const underClassifications = misclassifications.filter(m => {
      const categories = ['Eliminate', 'Simplify', 'Digitise', 'RPA', 'AI Agent', 'Agentic AI'];
      const fromIdx = categories.indexOf(m.from);
      const toIdx = categories.indexOf(m.to);
      return fromIdx < toIdx;
    });

    if (underClassifications.length > 0) {
      const total = underClassifications.reduce((sum, m) => sum + m.count, 0);
      patterns.push(
        `Under-classification tendency: ${total} cases where system classified lower than correct category`
      );
    }

    // Pattern 4: Low confidence correlations
    const lowConfidenceMisclassifications = sessions.filter(
      s =>
        s.classification &&
        s.feedback &&
        !s.feedback.confirmed &&
        s.classification.confidence < 0.7
    );

    if (lowConfidenceMisclassifications.length > 0) {
      patterns.push(
        `${lowConfidenceMisclassifications.length} misclassifications had confidence < 0.7, suggesting uncertainty`
      );
    }

    return patterns;
  }

  /**
   * Perform complete feedback analysis
   */
  async analyzeFeedback(
    triggeredBy: 'automatic' | 'manual',
    startDate?: Date,
    endDate?: Date
  ): Promise<LearningAnalysis> {
    const sessions = await this.collectSessionsWithFeedback(startDate, endDate);

    const overallAgreementRate = this.calculateOverallAgreementRate(sessions);
    const categoryAgreementRates = this.calculateAgreementRateByCategory(sessions);
    const commonMisclassifications = this.identifyMisclassifications(sessions);
    const identifiedPatterns = this.identifyPatterns(sessions, commonMisclassifications);

    const analysis: LearningAnalysis = {
      analysisId: randomUUID(),
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      dataRange: {
        startDate: startDate?.toISOString() || sessions[sessions.length - 1]?.createdAt || new Date().toISOString(),
        endDate: endDate?.toISOString() || sessions[0]?.createdAt || new Date().toISOString(),
        totalSessions: sessions.length
      },
      findings: {
        overallAgreementRate,
        categoryAgreementRates,
        commonMisclassifications,
        identifiedPatterns
      },
      suggestions: [] // Will be populated by suggestion generation service
    };

    // Save analysis
    await this.saveAnalysis(analysis);

    return analysis;
  }

  /**
   * Save analysis to storage
   */
  async saveAnalysis(analysis: LearningAnalysis): Promise<void> {
    const relativePath = `learning/analysis-${analysis.analysisId}.json`;
    await this.jsonStorage.writeJson(relativePath, analysis);
  }

  /**
   * Load analysis from storage
   */
  async loadAnalysis(analysisId: string): Promise<LearningAnalysis | null> {
    const relativePath = `learning/analysis-${analysisId}.json`;
    
    try {
      const exists = await this.jsonStorage.exists(relativePath);
      if (!exists) {
        return null;
      }

      return await this.jsonStorage.readJson<LearningAnalysis>(relativePath);
    } catch (error) {
      console.error(`Error loading analysis ${analysisId}:`, error);
      return null;
    }
  }

  /**
   * List all analyses
   */
  async listAnalyses(): Promise<string[]> {
    try {
      const files = await this.jsonStorage.listFiles('learning');
      return files
        .filter(f => f.startsWith('analysis-') && f.endsWith('.json'))
        .map(f => f.replace('analysis-', '').replace('.json', ''))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      console.error('Error listing analyses:', error);
      return [];
    }
  }

  /**
   * Check if agreement rate is below threshold for any category
   */
  async checkAgreementThreshold(threshold: number = 0.8): Promise<{
    belowThreshold: boolean;
    categories: string[];
    overallRate: number;
  }> {
    const sessions = await this.collectSessionsWithFeedback();
    const overallRate = this.calculateOverallAgreementRate(sessions);
    const categoryRates = this.calculateAgreementRateByCategory(sessions);

    const categoriesBelowThreshold = Object.entries(categoryRates)
      .filter(([_, rate]) => rate < threshold && rate > 0) // Exclude categories with no data
      .map(([category, _]) => category);

    return {
      belowThreshold: categoriesBelowThreshold.length > 0 || overallRate < threshold,
      categories: categoriesBelowThreshold,
      overallRate
    };
  }
}
