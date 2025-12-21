import { randomUUID } from 'crypto';
import { 
  Session, 
  LearningAnalysis, 
  TransformationCategory 
} from '../types';
import { SessionStorageService } from './session-storage.service';
import { JsonStorageService } from './storage.service';

export interface AnalysisProgress {
  stage: 'collecting' | 'analyzing' | 'validating' | 'complete';
  message: string;
  current: number;
  total: number;
  percentage: number;
}

export interface ValidationTestResult {
  testId: string;
  testedAt: string;
  matrixVersion: string;
  sampleSize: number;
  samplePercentage: number;
  results: {
    totalTested: number;
    improved: number;
    unchanged: number;
    worsened: number;
    improvementRate: number;
    details: Array<{
      sessionId: string;
      originalCategory: string;
      originalConfidence: number;
      newCategory: string;
      newConfidence: number;
      correctCategory: string;
      wasCorrectBefore: boolean;
      isCorrectNow: boolean;
      outcome: 'improved' | 'unchanged' | 'worsened';
    }>;
  };
}

/**
 * Feedback analysis service for AI Learning Engine
 * Collects misclassifications, calculates agreement rates, and identifies patterns
 */
export class LearningAnalysisService {
  private sessionStorage: SessionStorageService;
  private jsonStorage: JsonStorageService;
  private readonly BATCH_SIZE = 100; // Process sessions in batches

  constructor(
    sessionStorage: SessionStorageService,
    jsonStorage: JsonStorageService
  ) {
    this.sessionStorage = sessionStorage;
    this.jsonStorage = jsonStorage;
  }

  /**
   * Collect sessions with feedback for analysis (with batching and progress)
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @param misclassificationsOnly - If true, only return sessions where feedback.confirmed === false
   * @param onProgress - Optional callback for progress updates
   */
  async collectSessionsWithFeedback(
    startDate?: Date,
    endDate?: Date,
    misclassificationsOnly: boolean = false,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<Session[]> {
    const sessionIds = await this.sessionStorage.listSessions();
    const sessionsWithFeedback: Session[] = [];
    
    let processed = 0;
    const total = sessionIds.length;

    // Process in batches to avoid memory issues
    for (let i = 0; i < sessionIds.length; i += this.BATCH_SIZE) {
      const batch = sessionIds.slice(i, i + this.BATCH_SIZE);
      
      for (const sessionId of batch) {
        try {
          const session = await this.sessionStorage.loadSession(sessionId);
          
          if (!session || !session.feedback || !session.classification) {
            processed++;
            continue;
          }

          // Filter by date range if provided
          if (startDate || endDate) {
            const sessionDate = new Date(session.createdAt);
            
            if (startDate && sessionDate < startDate) {
              processed++;
              continue;
            }
            
            if (endDate && sessionDate > endDate) {
              processed++;
              continue;
            }
          }

          // Filter by misclassifications only if requested
          if (misclassificationsOnly && session.feedback.confirmed === true) {
            processed++;
            continue;
          }

          sessionsWithFeedback.push(session);
          processed++;
        } catch (error) {
          console.error(`Error loading session ${sessionId}:`, error);
          processed++;
          // Continue with other sessions
        }
      }

      // Report progress
      if (onProgress) {
        onProgress({
          stage: 'collecting',
          message: `Collecting sessions: ${sessionsWithFeedback.length} found (${processed}/${total} checked)`,
          current: processed,
          total,
          percentage: Math.round((processed / total) * 100)
        });
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
   * Group sessions by subject for consistency analysis
   */
  groupSessionsBySubject(sessions: Session[]): Map<string, Session[]> {
    const grouped = new Map<string, Session[]>();

    for (const session of sessions) {
      const subject = session.subject || 'Unknown';
      
      if (!grouped.has(subject)) {
        grouped.set(subject, []);
      }
      
      grouped.get(subject)!.push(session);
    }

    return grouped;
  }

  /**
   * Analyze consistency within subject areas
   * Checks if similar processes in the same subject area get consistent classifications
   */
  analyzeSubjectConsistency(sessions: Session[]): Array<{
    subject: string;
    totalSessions: number;
    agreementRate: number;
    commonCategory: string;
    categoryDistribution: { [category: string]: number };
  }> {
    const grouped = this.groupSessionsBySubject(sessions);
    const results: Array<{
      subject: string;
      totalSessions: number;
      agreementRate: number;
      commonCategory: string;
      categoryDistribution: { [category: string]: number };
    }> = [];

    for (const [subject, subjectSessions] of grouped.entries()) {
      if (subjectSessions.length < 2) continue; // Need at least 2 sessions to analyze

      // Calculate agreement rate for this subject
      const confirmedCount = subjectSessions.filter(
        s => s.feedback?.confirmed === true
      ).length;
      const agreementRate = confirmedCount / subjectSessions.length;

      // Calculate category distribution
      const categoryDistribution: { [category: string]: number } = {};
      for (const session of subjectSessions) {
        if (session.classification) {
          const category = session.classification.category;
          categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
        }
      }

      // Find most common category
      const commonCategory = Object.entries(categoryDistribution)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

      results.push({
        subject,
        totalSessions: subjectSessions.length,
        agreementRate,
        commonCategory,
        categoryDistribution
      });
    }

    return results.sort((a, b) => b.totalSessions - a.totalSessions);
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

    // Pattern 5: Subject-based consistency issues
    const subjectConsistency = this.analyzeSubjectConsistency(sessions);
    const inconsistentSubjects = subjectConsistency.filter(s => s.agreementRate < 0.7 && s.totalSessions >= 3);
    
    if (inconsistentSubjects.length > 0) {
      for (const subject of inconsistentSubjects.slice(0, 3)) { // Top 3 most inconsistent
        patterns.push(
          `Subject "${subject.subject}": Low consistency (${(subject.agreementRate * 100).toFixed(0)}% agreement) across ${subject.totalSessions} sessions`
        );
      }
    }

    // Pattern 6: Subject-specific misclassification trends
    const grouped = this.groupSessionsBySubject(sessions);
    for (const [subject, subjectSessions] of grouped.entries()) {
      if (subjectSessions.length < 5) continue; // Need enough data
      
      const subjectMisclassifications = this.identifyMisclassifications(subjectSessions);
      if (subjectMisclassifications.length > 0 && subjectMisclassifications[0].count >= 2) {
        const top = subjectMisclassifications[0];
        patterns.push(
          `Subject "${subject}": Recurring misclassification ${top.from} → ${top.to} (${top.count} times)`
        );
      }
    }

    return patterns;
  }

  /**
   * Perform complete feedback analysis with progress tracking
   * @param triggeredBy - How the analysis was triggered
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @param misclassificationsOnly - If true, only analyze misclassifications
   * @param onProgress - Optional callback for progress updates
   */
  async analyzeFeedback(
    triggeredBy: 'automatic' | 'manual',
    startDate?: Date,
    endDate?: Date,
    misclassificationsOnly: boolean = false,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<LearningAnalysis> {
    // Stage 1: Collect sessions
    const sessions = await this.collectSessionsWithFeedback(
      startDate, 
      endDate, 
      misclassificationsOnly,
      onProgress
    );

    if (sessions.length === 0) {
      throw new Error('No sessions with feedback found in the specified date range');
    }

    // Stage 2: Analyze patterns
    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        message: 'Analyzing patterns and calculating metrics...',
        current: 0,
        total: 5,
        percentage: 0
      });
    }

    const overallAgreementRate = this.calculateOverallAgreementRate(sessions);
    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        message: 'Calculated overall agreement rate',
        current: 1,
        total: 5,
        percentage: 20
      });
    }

    const categoryAgreementRates = this.calculateAgreementRateByCategory(sessions);
    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        message: 'Calculated category agreement rates',
        current: 2,
        total: 5,
        percentage: 40
      });
    }

    const commonMisclassifications = this.identifyMisclassifications(sessions);
    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        message: 'Identified common misclassifications',
        current: 3,
        total: 5,
        percentage: 60
      });
    }

    const subjectConsistency = this.analyzeSubjectConsistency(sessions);
    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        message: 'Analyzed subject consistency',
        current: 4,
        total: 5,
        percentage: 80
      });
    }

    const identifiedPatterns = this.identifyPatterns(sessions, commonMisclassifications);
    if (onProgress) {
      onProgress({
        stage: 'analyzing',
        message: 'Identified patterns',
        current: 5,
        total: 5,
        percentage: 100
      });
    }

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
        identifiedPatterns,
        subjectConsistency
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

  /**
   * Calculate optimal sample size for validation testing
   * Ensures at least 10% of sessions, with a minimum of 10 and maximum of 1000
   */
  calculateSampleSize(totalSessions: number): number {
    const tenPercent = Math.ceil(totalSessions * 0.1);
    return Math.max(10, Math.min(1000, tenPercent));
  }

  /**
   * Get random sample of sessions for validation testing
   */
  getRandomSample<T>(array: T[], sampleSize: number): T[] {
    if (sampleSize >= array.length) {
      return [...array];
    }

    const shuffled = [...array];
    
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, sampleSize);
  }

  /**
   * Validate matrix improvements by re-testing a sample of sessions
   * This tests if the current matrix would classify the sampled sessions correctly
   * 
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @param matrixVersion - Version of matrix to test against
   * @param classificationService - Service to re-classify sessions
   * @param llmConfig - LLM configuration for re-classification
   * @param onProgress - Optional callback for progress updates
   */
  async validateMatrixImprovements(
    startDate: Date | undefined,
    endDate: Date | undefined,
    matrixVersion: string,
    classificationService: any, // ClassificationService
    llmConfig: {
      provider: 'openai' | 'bedrock';
      model?: string;
      apiKey?: string;
      awsAccessKeyId?: string;
      awsSecretAccessKey?: string;
      awsSessionToken?: string;
      awsRegion?: string;
    },
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<ValidationTestResult> {
    // Collect all sessions with feedback in date range (misclassifications only)
    const allSessions = await this.collectSessionsWithFeedback(
      startDate,
      endDate,
      true, // misclassifications only
      onProgress
    );

    if (allSessions.length === 0) {
      throw new Error('No misclassified sessions found in the specified date range');
    }

    // Calculate sample size (at least 10% of sessions)
    const sampleSize = this.calculateSampleSize(allSessions.length);
    const samplePercentage = Math.round((sampleSize / allSessions.length) * 100);

    // Get random sample
    const sampleSessions = this.getRandomSample(allSessions, sampleSize);

    if (onProgress) {
      onProgress({
        stage: 'validating',
        message: `Testing ${sampleSize} sessions (${samplePercentage}% sample)...`,
        current: 0,
        total: sampleSize,
        percentage: 0
      });
    }

    // Re-classify each session and compare results
    const details: ValidationTestResult['results']['details'] = [];
    let improved = 0;
    let unchanged = 0;
    let worsened = 0;

    for (let i = 0; i < sampleSessions.length; i++) {
      const session = sampleSessions[i];
      const originalCategory = session.classification!.category;
      const originalConfidence = session.classification!.confidence;
      const correctCategory = session.feedback!.correctedCategory!;

      try {
        // Get the last conversation's process description
        const lastConv = session.conversations[session.conversations.length - 1];
        
        // Build conversation history from all conversations
        const conversationHistory: Array<{ question: string; answer: string }> = [];
        for (const conv of session.conversations) {
          if (conv.clarificationQA && conv.clarificationQA.length > 0) {
            conversationHistory.push(...conv.clarificationQA);
          }
        }
        
        // Re-classify using current matrix with LLM credentials
        const newClassification = await classificationService.classify({
          processDescription: lastConv.processDescription,
          conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
          provider: llmConfig.provider,
          model: llmConfig.model,
          apiKey: llmConfig.apiKey,
          awsAccessKeyId: llmConfig.awsAccessKeyId,
          awsSecretAccessKey: llmConfig.awsSecretAccessKey,
          awsSessionToken: llmConfig.awsSessionToken,
          awsRegion: llmConfig.awsRegion
        });

        const newCategory = newClassification.category;
        const newConfidence = newClassification.confidence;

        const wasCorrectBefore = originalCategory === correctCategory;
        const isCorrectNow = newCategory === correctCategory;

        let outcome: 'improved' | 'unchanged' | 'worsened';
        
        if (!wasCorrectBefore && isCorrectNow) {
          outcome = 'improved';
          improved++;
        } else if (wasCorrectBefore && !isCorrectNow) {
          outcome = 'worsened';
          worsened++;
        } else {
          outcome = 'unchanged';
          unchanged++;
        }

        details.push({
          sessionId: session.sessionId,
          originalCategory,
          originalConfidence,
          newCategory,
          newConfidence,
          correctCategory,
          wasCorrectBefore,
          isCorrectNow,
          outcome
        });

        if (onProgress) {
          onProgress({
            stage: 'validating',
            message: `Testing session ${i + 1}/${sampleSize}...`,
            current: i + 1,
            total: sampleSize,
            percentage: Math.round(((i + 1) / sampleSize) * 100)
          });
        }
      } catch (error) {
        console.error(`Error re-classifying session ${session.sessionId}:`, error);
        // Skip this session and continue with others
        // Still report progress
        if (onProgress) {
          onProgress({
            stage: 'validating',
            message: `Testing session ${i + 1}/${sampleSize} (1 failed, continuing...)`,
            current: i + 1,
            total: sampleSize,
            percentage: Math.round(((i + 1) / sampleSize) * 100)
          });
        }
      }
    }

    const improvementRate = details.length > 0 
      ? Math.round((improved / details.length) * 100) 
      : 0;

    const result: ValidationTestResult = {
      testId: randomUUID(),
      testedAt: new Date().toISOString(),
      matrixVersion,
      sampleSize,
      samplePercentage,
      results: {
        totalTested: details.length,
        improved,
        unchanged,
        worsened,
        improvementRate,
        details
      }
    };

    // Save validation test result
    await this.saveValidationTest(result);

    return result;
  }

  /**
   * Save validation test result to storage
   */
  async saveValidationTest(result: ValidationTestResult): Promise<void> {
    const relativePath = `learning/validation-${result.testId}.json`;
    await this.jsonStorage.writeJson(relativePath, result);
  }

  /**
   * Load validation test result from storage
   */
  async loadValidationTest(testId: string): Promise<ValidationTestResult | null> {
    const relativePath = `learning/validation-${testId}.json`;
    
    try {
      const exists = await this.jsonStorage.exists(relativePath);
      if (!exists) {
        return null;
      }

      return await this.jsonStorage.readJson<ValidationTestResult>(relativePath);
    } catch (error) {
      console.error(`Error loading validation test ${testId}:`, error);
      return null;
    }
  }

  /**
   * List all validation tests
   */
  async listValidationTests(): Promise<string[]> {
    try {
      const files = await this.jsonStorage.listFiles('learning');
      return files
        .filter(f => f.startsWith('validation-') && f.endsWith('.json'))
        .map(f => f.replace('validation-', '').replace('.json', ''))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      console.error('Error listing validation tests:', error);
      return [];
    }
  }
}
