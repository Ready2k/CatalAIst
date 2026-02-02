import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AnalyticsService } from '../services/analytics.service';
import { SessionStorageService } from '../services/session-storage.service';
import { JsonStorageService } from '../services/storage.service';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { z } from 'zod';
import {
  SessionFilters,
  SessionFiltersSchema,
  PaginationParams,
  PaginationParamsSchema,
  TransformationCategory
} from '../types';

// Defensive check for schema availability
if (!SessionFiltersSchema || !PaginationParamsSchema) {
  console.error('CRITICAL: Zod schemas not loaded properly from shared types');
  console.error('SessionFiltersSchema:', SessionFiltersSchema);
  console.error('PaginationParamsSchema:', PaginationParamsSchema);
}

const router = Router();

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests', message: 'Please try again later' }
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50,
  message: { error: 'Too many search requests', message: 'Please slow down' }
});

const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many export requests', message: 'Export limit is 10 per hour' }
});

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const jsonStorage = new JsonStorageService(dataDir);
const sessionStorage = new SessionStorageService(jsonStorage);
const analyticsService = new AnalyticsService(jsonStorage, sessionStorage);

// Export analytics service for cache invalidation
export { analyticsService };

/**
 * GET /api/analytics/sessions
 * List sessions with filtering and pagination
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 4.1, 4.2, 4.3
 */
router.get('/sessions', authenticateToken, requireRole('admin'), generalLimiter, async (req: AuthRequest, res: Response) => {
  try {
    // Run cleanup for stale sessions (2 hour timeout)
    // We don't await this to keep the response fast, it runs in the background
    sessionStorage.cleanupStaleSessions(2 * 60 * 60 * 1000).catch(err =>
      console.error('[Session Cleanup] Background cleanup failed:', err)
    );

    // Parse and validate filters
    const filters: any = {};

    if (req.query.dateFrom) {
      filters.dateFrom = req.query.dateFrom as string;
    }
    if (req.query.dateTo) {
      filters.dateTo = req.query.dateTo as string;
    }
    if (req.query.category) {
      filters.category = req.query.category as TransformationCategory;
    }
    if (req.query.subject) {
      filters.subject = req.query.subject as string;
    }
    if (req.query.model) {
      filters.model = req.query.model as string;
    }
    if (req.query.status) {
      filters.status = req.query.status as 'active' | 'completed' | 'manual_review';
    }
    if (req.query.searchText) {
      const searchText = req.query.searchText as string;
      if (searchText.length > 500) {
        return res.status(400).json({
          error: 'Invalid search text',
          message: 'Search text must be 500 characters or less'
        });
      }
      filters.searchText = searchText;
    }

    // Validate filters
    const filtersValidation = SessionFiltersSchema.safeParse(filters);
    if (!filtersValidation.success) {
      return res.status(400).json({
        error: 'Invalid filter parameters',
        details: filtersValidation.error.errors
      });
    }

    // Parse and validate pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (page < 1) {
      return res.status(400).json({
        error: 'Invalid pagination',
        message: 'Page must be 1 or greater'
      });
    }

    // Allow higher limits for metrics calculation (up to 10000)
    // Normal pagination should use 100 or less
    if (limit < 1 || limit > 10000) {
      return res.status(400).json({
        error: 'Invalid pagination',
        message: 'Limit must be between 1 and 10000'
      });
    }

    const paginationValidation = PaginationParamsSchema.safeParse({ page, limit });
    if (!paginationValidation.success) {
      return res.status(400).json({
        error: 'Invalid pagination parameters',
        details: paginationValidation.error.errors
      });
    }

    // Apply search rate limiter if search text is present
    if (filters.searchText) {
      await new Promise((resolve, reject) => {
        searchLimiter(req as any, res as any, (err?: any) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });
    }

    // Get sessions
    const result = await analyticsService.listSessions(
      filtersValidation.data,
      { page, limit }
    );

    res.json(result);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({
      error: 'Failed to list sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analytics/sessions/:sessionId
 * Get detailed session information
 * Requirements: 3.1, 3.2
 */
router.get('/sessions/:sessionId', authenticateToken, requireRole('admin'), generalLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Validate sessionId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return res.status(400).json({
        error: 'Invalid session ID',
        message: 'Session ID must be a valid UUID'
      });
    }

    const session = await analyticsService.getSessionDetail(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId
      });
    }

    res.json(session);
  } catch (error) {
    console.error('Error getting session detail:', error);
    res.status(500).json({
      error: 'Failed to get session detail',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analytics/filters/options
 * Get available filter options from existing sessions
 * Requirements: 2.1
 */
router.get('/filters/options', authenticateToken, requireRole('admin'), generalLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const options = await analyticsService.getFilterOptions();
    res.json(options);
  } catch (error) {
    console.error('Error getting filter options:', error);
    res.status(500).json({
      error: 'Failed to get filter options',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analytics/sessions/export
 * Export sessions to CSV format
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
router.get('/sessions/export', authenticateToken, requireRole('admin'), exportLimiter, async (req: AuthRequest, res: Response) => {
  try {
    // Parse and validate filters (same as /sessions endpoint)
    const filters: any = {};

    if (req.query.dateFrom) {
      filters.dateFrom = req.query.dateFrom as string;
    }
    if (req.query.dateTo) {
      filters.dateTo = req.query.dateTo as string;
    }
    if (req.query.category) {
      filters.category = req.query.category as TransformationCategory;
    }
    if (req.query.subject) {
      filters.subject = req.query.subject as string;
    }
    if (req.query.model) {
      filters.model = req.query.model as string;
    }
    if (req.query.status) {
      filters.status = req.query.status as 'active' | 'completed' | 'manual_review';
    }
    if (req.query.searchText) {
      const searchText = req.query.searchText as string;
      if (searchText.length > 500) {
        return res.status(400).json({
          error: 'Invalid search text',
          message: 'Search text must be 500 characters or less'
        });
      }
      filters.searchText = searchText;
    }

    // Validate filters
    const filtersValidation = SessionFiltersSchema.safeParse(filters);
    if (!filtersValidation.success) {
      return res.status(400).json({
        error: 'Invalid filter parameters',
        details: filtersValidation.error.errors
      });
    }

    // Generate CSV
    const csv = await analyticsService.exportSessionsToCSV(filtersValidation.data);

    // Set CSV headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `sessions-export-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting sessions:', error);
    res.status(500).json({
      error: 'Failed to export sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analytics/dashboard
 * Get analytics dashboard metrics (recalculated on-demand)
 * Requirements: 12.2, 12.3, 12.4, 13.5
 */
router.get('/dashboard', authenticateToken, requireRole('admin'), generalLimiter, async (req: AuthRequest, res: Response) => {
  try {
    // Recalculate metrics on-demand
    const metrics = await analyticsService.getDashboardMetrics();

    // Check if alert should be triggered
    if (metrics.alertTriggered) {
      console.warn(
        `ALERT: Agreement rate (${(metrics.overallAgreementRate * 100).toFixed(1)}%) is below 80% threshold`
      );
    }

    res.json({
      metrics,
      alert: metrics.alertTriggered ? {
        message: 'Agreement rate is below 80% threshold',
        overallAgreementRate: metrics.overallAgreementRate,
        threshold: 0.8
      } : null
    });
  } catch (error) {
    console.error('Error calculating analytics:', error);
    res.status(500).json({
      error: 'Failed to calculate analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analytics/metrics
 * Get cached metrics without recalculation
 */
router.get('/metrics', authenticateToken, requireRole('admin'), generalLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await analyticsService.loadMetrics();

    if (!metrics) {
      return res.status(404).json({
        error: 'No metrics available',
        message: 'Metrics have not been calculated yet. Use /api/analytics/dashboard to calculate.'
      });
    }

    res.json({ metrics });
  } catch (error) {
    console.error('Error loading metrics:', error);
    res.status(500).json({
      error: 'Failed to load metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/analytics/recalculate
 * Manually trigger metrics recalculation
 */
router.post('/recalculate', authenticateToken, requireRole('admin'), generalLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await analyticsService.recalculateAndSave();

    res.json({
      message: 'Metrics recalculated successfully',
      metrics
    });
  } catch (error) {
    console.error('Error recalculating metrics:', error);
    res.status(500).json({
      error: 'Failed to recalculate metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
