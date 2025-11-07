import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { SessionStorageService } from '../services/session-storage.service';
import { JsonStorageService } from '../services/storage.service';

const router = Router();

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const jsonStorage = new JsonStorageService(dataDir);
const sessionStorage = new SessionStorageService(jsonStorage);
const analyticsService = new AnalyticsService(jsonStorage, sessionStorage);

/**
 * GET /api/analytics/dashboard
 * Get analytics dashboard metrics (recalculated on-demand)
 * Requirements: 12.2, 12.3, 12.4, 13.5
 */
router.get('/dashboard', async (req: Request, res: Response) => {
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
router.get('/metrics', async (req: Request, res: Response) => {
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
router.post('/recalculate', async (req: Request, res: Response) => {
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
