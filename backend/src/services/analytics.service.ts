import { randomUUID } from 'crypto';
import { z } from 'zod';
import { JsonStorageService } from './storage.service';
import { SessionStorageService } from './session-storage.service';
import { 
  AnalyticsMetrics, 
  AnalyticsMetricsSchema, 
  Session,
  SessionFilters,
  SessionFiltersSchema,
  PaginationParams,
  PaginationParamsSchema,
  SessionListItem,
  SessionListResponse,
  SessionListResponseSchema,
  FilterOptions,
  FilterOptionsSchema,
  FilteredMetrics,
  FilteredMetricsSchema,
  TransformationCategory
} from '../types';

// Defensive check for schema availability
if (!SessionFiltersSchema || !PaginationParamsSchema || !FilterOptionsSchema) {
  console.error('CRITICAL: Zod schemas not loaded properly in analytics.service.ts');
  console.error('SessionFiltersSchema:', SessionFiltersSchema);
  console.error('PaginationParamsSchema:', PaginationParamsSchema);
  console.error('FilterOptionsSchema:', FilterOptionsSchema);
}

// Cache interfaces
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Analytics service for calculating system performance metrics
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.4, 13.5
 */
export class AnalyticsService {
  private jsonStorage: JsonStorageService;
  private sessionStorage: SessionStorageService;
  private metricsPath = 'analytics/metrics.json';

  // In-memory caches
  private filterOptionsCache: CacheEntry<FilterOptions> | null = null;
  private sessionListCache: Map<string, CacheEntry<SessionListResponse>> = new Map();
  
  // Cache TTLs in milliseconds
  private readonly FILTER_OPTIONS_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly SESSION_LIST_TTL = 1 * 60 * 1000; // 1 minute

  constructor(jsonStorage: JsonStorageService, sessionStorage: SessionStorageService) {
    this.jsonStorage = jsonStorage;
    this.sessionStorage = sessionStorage;
  }

  /**
   * Invalidate all caches (called when new session is created)
   * Requirements: 8.3
   */
  public invalidateCache(): void {
    this.filterOptionsCache = null;
    this.sessionListCache.clear();
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid<T>(entry: CacheEntry<T> | null, ttl: number): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < ttl;
  }

  /**
   * Generate cache key for session list
   */
  private getSessionListCacheKey(filters: SessionFilters, pagination: PaginationParams): string {
    return JSON.stringify({ filters, pagination });
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

  /**
   * List sessions with filtering and pagination
   * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 8.2
   */
  async listSessions(
    filters: SessionFilters,
    pagination: PaginationParams
  ): Promise<SessionListResponse> {
    // Validate inputs
    SessionFiltersSchema.parse(filters);
    PaginationParamsSchema.parse(pagination);

    // Check cache first
    const cacheKey = this.getSessionListCacheKey(filters, pagination);
    const cachedEntry = this.sessionListCache.get(cacheKey);
    
    if (this.isCacheValid(cachedEntry || null, this.SESSION_LIST_TTL)) {
      return cachedEntry!.data;
    }

    // Load all sessions
    const sessionIds = await this.sessionStorage.listSessions();
    const allSessions: Session[] = [];

    for (const sessionId of sessionIds) {
      try {
        const session = await this.sessionStorage.loadSession(sessionId);
        if (session) {
          allSessions.push(session);
        }
      } catch (error) {
        console.error(`Failed to load session ${sessionId}:`, error);
        // Continue with other sessions
      }
    }

    // Apply filters
    let filteredSessions = this.applyFilters(allSessions, filters);

    // Calculate total before pagination
    const total = filteredSessions.length;
    const totalPages = Math.ceil(total / pagination.limit);

    // Apply pagination
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    filteredSessions = filteredSessions.slice(startIndex, endIndex);

    // Convert to SessionListItem format with memoized computed properties
    const sessions: SessionListItem[] = filteredSessions.map(session => 
      this.sessionToListItem(session)
    );

    const response: SessionListResponse = {
      sessions,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages
    };

    // Validate response
    SessionListResponseSchema.parse(response);

    // Cache the response
    this.sessionListCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    return response;
  }

  /**
   * Apply filters to sessions
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
   */
  private applyFilters(sessions: Session[], filters: SessionFilters): Session[] {
    let filtered = sessions;

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(s => new Date(s.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(s => new Date(s.createdAt) <= toDate);
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(s => 
        s.classification && s.classification.category === filters.category
      );
    }

    // Subject filter
    if (filters.subject) {
      filtered = filtered.filter(s => s.subject === filters.subject);
    }

    // Model filter
    if (filters.model) {
      filtered = filtered.filter(s => s.modelUsed === filters.model);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }

    // Search text filter (case-insensitive)
    if (filters.searchText && filters.searchText.trim().length > 0) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(s => {
        // Search in process descriptions
        const processDescMatch = s.conversations.some(conv => 
          conv.processDescription.toLowerCase().includes(searchLower)
        );

        // Search in classification rationale
        const rationaleMatch = s.classification && 
          s.classification.rationale.toLowerCase().includes(searchLower);

        // Search in feedback comments
        const commentsMatch = s.userRating && s.userRating.comments &&
          s.userRating.comments.toLowerCase().includes(searchLower);

        return processDescMatch || rationaleMatch || commentsMatch;
      });
    }

    return filtered;
  }

  /**
   * Convert Session to SessionListItem with memoized computed properties
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.4
   */
  private sessionToListItem(session: Session): SessionListItem {
    // Memoize computed properties for performance
    const triggeredRulesCount = session.classification?.decisionMatrixEvaluation?.triggeredRules?.length || 0;
    const hasDecisionMatrix = !!session.classification?.decisionMatrixEvaluation;

    // Memoize requiresAttention calculation
    const requiresAttention = !!(
      (session.feedback && !session.feedback.confirmed) ||
      (session.userRating && session.userRating.rating === 'down') ||
      session.status === 'manual_review' ||
      (session.classification && session.classification.confidence < 0.6)
    );

    return {
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      subject: session.subject,
      category: session.classification?.category,
      confidence: session.classification?.confidence,
      status: session.status,
      modelUsed: session.modelUsed,
      feedbackConfirmed: session.feedback?.confirmed,
      userRating: session.userRating?.rating,
      requiresAttention: requiresAttention,
      triggeredRulesCount: triggeredRulesCount,
      hasDecisionMatrix: hasDecisionMatrix
    };
  }

  /**
   * Get detailed session information
   * Requirements: 3.1
   */
  async getSessionDetail(sessionId: string): Promise<Session | null> {
    try {
      return await this.sessionStorage.loadSession(sessionId);
    } catch (error) {
      console.error(`Failed to load session detail ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Get available filter options from existing sessions with caching
   * Requirements: 2.1, 8.1
   */
  async getFilterOptions(): Promise<FilterOptions> {
    // Check cache first
    if (this.isCacheValid(this.filterOptionsCache, this.FILTER_OPTIONS_TTL)) {
      return this.filterOptionsCache!.data;
    }

    const sessionIds = await this.sessionStorage.listSessions();
    const sessions: Session[] = [];

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

    // Extract unique values
    const subjects = new Set<string>();
    const models = new Set<string>();
    const categories = new Set<TransformationCategory>();
    const statuses = new Set<string>();

    for (const session of sessions) {
      if (session.subject) {
        subjects.add(session.subject);
      }
      models.add(session.modelUsed);
      if (session.classification) {
        categories.add(session.classification.category);
      }
      statuses.add(session.status);
    }

    const options: FilterOptions = {
      subjects: Array.from(subjects).sort(),
      models: Array.from(models).sort(),
      categories: Array.from(categories).sort(),
      statuses: Array.from(statuses).sort()
    };

    // Validate options
    if (!FilterOptionsSchema) {
      console.error('FilterOptionsSchema is undefined - skipping validation');
    } else {
      FilterOptionsSchema.parse(options);
    }

    // Cache the options
    this.filterOptionsCache = {
      data: options,
      timestamp: Date.now()
    };

    return options;
  }

  /**
   * Calculate metrics for filtered sessions
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  async calculateFilteredMetrics(filters: SessionFilters): Promise<FilteredMetrics> {
    // Validate filters
    SessionFiltersSchema.parse(filters);

    // Load all sessions
    const sessionIds = await this.sessionStorage.listSessions();
    const allSessions: Session[] = [];

    for (const sessionId of sessionIds) {
      try {
        const session = await this.sessionStorage.loadSession(sessionId);
        if (session) {
          allSessions.push(session);
        }
      } catch (error) {
        console.error(`Failed to load session ${sessionId}:`, error);
        // Continue with other sessions
      }
    }

    // Apply filters
    const filteredSessions = this.applyFilters(allSessions, filters);

    // Calculate metrics
    const totalCount = filteredSessions.length;

    // Average confidence
    const sessionsWithConfidence = filteredSessions.filter(s => s.classification);
    const averageConfidence = sessionsWithConfidence.length > 0
      ? sessionsWithConfidence.reduce((sum, s) => sum + s.classification!.confidence, 0) / sessionsWithConfidence.length
      : 0;

    // Agreement rate
    const sessionsWithFeedback = filteredSessions.filter(s => s.classification && s.feedback);
    const confirmedCount = sessionsWithFeedback.filter(s => s.feedback!.confirmed).length;
    const agreementRate = sessionsWithFeedback.length > 0
      ? confirmedCount / sessionsWithFeedback.length
      : 1.0;

    // Category distribution
    const categoryDistribution: { [category: string]: number } = {};
    for (const session of filteredSessions) {
      if (session.classification) {
        const category = session.classification.category;
        categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
      }
    }

    const metrics: FilteredMetrics = {
      totalCount,
      averageConfidence,
      agreementRate,
      categoryDistribution
    };

    // Validate metrics
    FilteredMetricsSchema.parse(metrics);

    return metrics;
  }

  /**
   * Export sessions to CSV format
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async exportSessionsToCSV(filters: SessionFilters): Promise<string> {
    // Validate filters
    SessionFiltersSchema.parse(filters);

    // Load all sessions
    const sessionIds = await this.sessionStorage.listSessions();
    const allSessions: Session[] = [];

    for (const sessionId of sessionIds) {
      try {
        const session = await this.sessionStorage.loadSession(sessionId);
        if (session) {
          allSessions.push(session);
        }
      } catch (error) {
        console.error(`Failed to load session ${sessionId}:`, error);
        // Continue with other sessions
      }
    }

    // Apply filters
    let filteredSessions = this.applyFilters(allSessions, filters);

    // Limit to 10,000 sessions per export
    if (filteredSessions.length > 10000) {
      filteredSessions = filteredSessions.slice(0, 10000);
    }

    // Sort by createdAt descending (most recent first)
    filteredSessions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // CSV header
    const headers = [
      'sessionId',
      'createdAt',
      'subject',
      'category',
      'confidence',
      'status',
      'modelUsed',
      'feedbackConfirmed',
      'userRating',
      'triggeredRulesCount'
    ];

    // Build CSV rows
    const rows: string[] = [headers.join(',')];

    for (const session of filteredSessions) {
      const triggeredRulesCount = session.classification?.decisionMatrixEvaluation?.triggeredRules?.length || 0;
      
      const row = [
        this.escapeCsvValue(session.sessionId),
        this.escapeCsvValue(session.createdAt),
        this.escapeCsvValue(session.subject || ''),
        this.escapeCsvValue(session.classification?.category || ''),
        session.classification?.confidence?.toString() || '',
        this.escapeCsvValue(session.status),
        this.escapeCsvValue(session.modelUsed),
        session.feedback?.confirmed?.toString() || '',
        this.escapeCsvValue(session.userRating?.rating || ''),
        triggeredRulesCount.toString()
      ];

      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Escape CSV value to handle commas, quotes, and newlines
   */
  private escapeCsvValue(value: string): string {
    if (!value) {
      return '';
    }

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }
}
