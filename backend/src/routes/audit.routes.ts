import { Router, Request, Response } from 'express';
import { AuditLogService } from '../services/audit-log.service';

const router = Router();

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const auditLogService = new AuditLogService(dataDir);

/**
 * GET /api/audit/logs
 * Get audit logs for a specific date
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    
    // Default to today if no date provided
    const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];
    
    const logs = await auditLogService.getLogsByDate(targetDate);
    
    res.json({
      date: targetDate,
      logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      error: 'Failed to fetch audit logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/audit/logs/:sessionId
 * Get all audit logs for a specific session
 */
router.get('/logs/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const logs = await auditLogService.getLogsBySession(sessionId);
    
    if (logs.length === 0) {
      return res.status(404).json({
        error: 'No logs found',
        sessionId
      });
    }
    
    res.json({
      sessionId,
      logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching session logs:', error);
    res.status(500).json({
      error: 'Failed to fetch session logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/audit/dates
 * Get list of dates that have audit logs
 */
router.get('/dates', async (req: Request, res: Response) => {
  try {
    const dates = await auditLogService.getAvailableDates();
    
    res.json({
      dates,
      count: dates.length
    });
  } catch (error) {
    console.error('Error fetching available dates:', error);
    res.status(500).json({
      error: 'Failed to fetch available dates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
