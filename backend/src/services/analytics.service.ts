import { randomUUID } from 'crypto';
import { JsonStorageService } from './storage.service';
import { SessionStorageService } from './session-storage.service';
import { AnalyticsMetrics, AnalyticsMetricsSchema, Session } from '../../../shared/types';

/**
 * Analytics service for calculating system performance metrics
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.4, 13.5
 */
export class AnalyticsService {
  private jsonStorage: JsonStorageService;
  private sessionStorage: SessionStorageService;
  private metricsPath = 'analytics/metrics.json';

  constructor(jsonStorage: JsonStorageService, sessionStorage: SessionStorageService) {
    this.jsonStorage = jsonStorage;
    this.sessionStorage = sessionStorage;
  }

  /**
   * Calculate all metrics from session data
   * Requirements: 12.1, 12.2, 12.5, 13.4
   */
  async calculateMetrics(): Promise<AnalyticsMetrics> {
    const sessionIds = await this.sessionStorage.listSessions();
    const sessions: Session[] = [];

    // Load all sessions
    for (const sessionId of sessionIds) {
      try {
        const session = await this.sessionStorage.loadSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      } catch (error) {
        console.error(`Failed to load session ${sessionId}:`, error);
        // Continue with other sessions
      }
    }

    // Calculate overall agreement rate
    const overallAgreementRate = this.calculateOverallAgreementRate(sessions);

    // Calculate agreement rate by category
    const agreementRateByCategory = this.calculateAgreementRateByCategory(sessions);

    // Calculate user satisfaction rate
    const userSatisfactionRate = this.calculateUserSatisfactionRate(sessions);

    // Calculate average classification time
    const averageClassificationTimeMs = this.calculateAverageClassificationTime(sessions);

    // Total sessions processed
    const totalSessions = sessions.length;

    // Check if alert should be triggered (agreement rate < 80%)
    const alertTriggered = overallAgreementRate < 0.8;

    const metrics: AnalyticsMetrics = {
      metricId: randomUUID(),
      calculatedAt: new Date().toISOString(),
      overallAgreementRate,
      agreementRateByCategory,
      userSatisfactionRate,
      totalSessions,
      averageClassificationTimeMs,
      alertTriggered
    };

    // Validate metrics
    AnalyticsMetricsSchema.parse(metrics);

    return metrics;
  }

  /**
   * Calculate overall agreement rate
   * Agreement rate = percentage of classifications that match human expert evaluation
   * (confirmed classifications / total classifications with feedback)
   * Requirements: 12.1, 12.5
   */
  private calculateOverallAgreementRate(sessions: Session[]): number {
    const sessionsWithFeedback = sessions.filter(
      s => s.classification && s.feedback
    );

    if (sessionsWithFeedback.length === 0) {
      return 1.0; // No feedback yet, assume 100%
    }

    const confirmedCount = sessionsWithFeedback.filter(
      s => s.feedback!.confirmed
    ).length;

    return confirmedCount / sessionsWithFeedback.length;
  }

  /**
   * Calculate agreement rate by category
   * Requirements: 12.5
   */
  private calculateAgreementRateByCategory(sessions: Session[]): { [category: string]: number } {
    const categories = [
      'Eliminate',
      'Simplify',
      'Digitise',
      'RPA',
      'AI Agent',
      'Agentic AI'
    ];

    const agreementRates: { [category: string]: number } = {};

    for (const category of categories) {
      const sessionsInCategory = sessions.filter(
        s => s.classification && s.feedback && s.classification.category === category
      );

      if (sessionsInCategory.length === 0) {
        agreementRates[category] = 1.0; // No data yet, assume 100%
        continue;
      }

      const confirmedCount = sessionsInCategory.filter(
        s => s.feedback!.confirmed
      ).length;

      agreementRates[category] = confirmedCount / sessionsInCategory.length;
    }

    return agreementRates;
  }

  /**
   * Calculate user satisfaction rate (thumbs up percentage)
   * Requirements: 13.4
   */
  private calculateUserSatisfactionRate(sessions: Session[]): number {
    const sessionsWithRating = sessions.filter(s => s.userRating);

    if (sessionsWithRating.length === 0) {
      return 1.0; // No ratings yet, assume 100%
    }

    const thumbsUpCount = sessionsWithRating.filter(
      s => s.userRating!.rating === 'up'
    ).length;

    return thumbsUpCount / sessionsWithRating.length;
  }

  /**
   * Calculate average classification time
   * Time from session creation to classification completion
   * Requirements: 13.4
   */
  private calculateAverageClassificationTime(sessions: Session[]): number {
    const sessionsWithClassification = sessions.filter(s => s.classification);

    if (sessionsWithClassification.length === 0) {
      return 0;
    }

    let totalTimeMs = 0;

    for (const session of sessionsWithClassification) {
      const createdAt = new Date(session.createdAt).getTime();
      const classifiedAt = new Date(session.classification!.timestamp).getTime();
      const timeMs = classifiedAt - createdAt;
      
      // Only count positive times (in case of clock skew)
      if (timeMs > 0) {
        totalTimeMs += timeMs;
      }
    }

    return totalTimeMs / sessionsWithClassification.length;
  }

  /**
   * Save metrics to storage
   * Requirements: 12.2, 13.5
   */
  async saveMetrics(metrics: AnalyticsMetrics): Promise<void> {
    await this.jsonStorage.writeJson(this.metricsPath, metrics);
  }

  /**
   * Load metrics from storage
   * Requirements: 12.2, 13.5
   */
  async loadMetrics(): Promise<AnalyticsMetrics | null> {
    try {
      const exists = await this.jsonStorage.exists(this.metricsPath);
      if (!exists) {
        return null;
      }

      const metrics = await this.jsonStorage.readJson<AnalyticsMetrics>(this.metricsPath);
      return AnalyticsMetricsSchema.parse(metrics);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      return null;
    }
  }

  /**
   * Calculate and save metrics
   * Requirements: 12.2, 12.3, 12.4, 13.5
   */
  async recalculateAndSave(): Promise<AnalyticsMetrics> {
    const metrics = await this.calculateMetrics();
    await this.saveMetrics(metrics);
    return metrics;
  }

  /**
   * Get dashboard metrics (recalculate on-demand)
   * Requirements: 12.2, 12.3, 12.4, 13.5
   */
  async getDashboardMetrics(): Promise<AnalyticsMetrics> {
    return await this.recalculateAndSave();
  }
}
