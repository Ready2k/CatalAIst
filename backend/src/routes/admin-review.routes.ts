import { Router, Request, Response } from 'express';
import { SessionStorageService } from '../services/session-storage.service';
import { AuditLogService } from '../services/audit-log.service';
import { JsonStorageService } from '../services/storage.service';
import { Session, AdminReview, TransformationCategory } from '../types';
import { analyticsService } from './analytics.routes';

const router = Router();

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const jsonStorage = new JsonStorageService(dataDir);
const sessionStorage = new SessionStorageService(jsonStorage);
const auditLogService = new AuditLogService(dataDir);

/**
 * GET /api/admin/pending-reviews
 * Get all sessions pending admin review
 * Requirements: Admin review workflow
 */
router.get('/pending-reviews', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // Get all sessions
    const allSessions: Session[] = await sessionStorage.getAllSessions();

    // Filter for pending admin review
    const pendingSessions: Session[] = allSessions.filter((session: Session) =>
      session.status === 'pending_admin_review' &&
      (!session.adminReview || !session.adminReview.reviewed)
    );

    // Sort by creation date (oldest first)
    pendingSessions.sort((a: Session, b: Session) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Paginate
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedSessions = pendingSessions.slice(startIndex, endIndex);

    res.json({
      sessions: paginatedSessions,
      total: pendingSessions.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(pendingSessions.length / limitNum)
    });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({
      error: 'Failed to fetch pending reviews',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/review/:sessionId
 * Submit admin review for a session
 * Requirements: Admin review workflow
 */
router.post('/review/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const {
      approved,
      correctedCategory,
      reviewNotes,
      userId = 'admin'
    } = req.body;

    // Validate input
    if (typeof approved !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'approved field is required and must be a boolean'
      });
    }

    // Load session
    const session = await sessionStorage.loadSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId
      });
    }

    // Check if session is pending review
    if (session.status !== 'pending_admin_review') {
      return res.status(400).json({
        error: 'Invalid session status',
        message: 'Session is not pending admin review'
      });
    }

    // Create admin review
    const adminReview: AdminReview = {
      reviewed: true,
      reviewedBy: userId,
      reviewedAt: new Date().toISOString(),
      approved,
      correctedCategory,
      reviewNotes
    };

    // Update session
    session.adminReview = adminReview;
    session.status = 'completed';
    session.updatedAt = new Date().toISOString();

    // If corrected, update the classification
    if (!approved && correctedCategory && session.classification) {
      session.classification.category = correctedCategory;
      session.classification.rationale = `Admin corrected from ${session.classification.category} to ${correctedCategory}. ${reviewNotes || ''}`;
    }

    await sessionStorage.saveSession(session);

    // Invalidate analytics cache
    analyticsService.invalidateCache();

    // Log admin review
    await auditLogService.log({
      sessionId,
      timestamp: new Date().toISOString(),
      eventType: 'feedback',
      userId,
      data: {
        adminReview: true,
        approved,
        correctedCategory,
        reviewNotes,
        originalCategory: session.classification?.category
      },
      piiScrubbed: false,
      metadata: {
        modelVersion: session.modelUsed
      }
    });

    res.json({
      message: 'Admin review submitted successfully',
      session
    });
  } catch (error) {
    console.error('Error submitting admin review:', error);
    res.status(500).json({
      error: 'Failed to submit admin review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/review-stats
 * Get statistics about admin reviews
 * Requirements: Admin review workflow
 */
router.get('/review-stats', async (req: Request, res: Response) => {
  try {
    const allSessions: Session[] = await sessionStorage.getAllSessions();

    const pendingCount = allSessions.filter((s: Session) =>
      s.status === 'pending_admin_review' &&
      (!s.adminReview || !s.adminReview.reviewed)
    ).length;

    const reviewedCount = allSessions.filter((s: Session) =>
      s.adminReview && s.adminReview.reviewed
    ).length;

    const approvedCount = allSessions.filter((s: Session) =>
      s.adminReview && s.adminReview.reviewed && s.adminReview.approved
    ).length;

    const correctedCount = allSessions.filter((s: Session) =>
      s.adminReview && s.adminReview.reviewed && !s.adminReview.approved
    ).length;

    res.json({
      pendingCount,
      reviewedCount,
      approvedCount,
      correctedCount,
      approvalRate: reviewedCount > 0 ? approvedCount / reviewedCount : 0
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({
      error: 'Failed to fetch review stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
