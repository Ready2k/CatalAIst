import { Router, Request, Response } from 'express';
import { SessionStorageService } from '../services/session-storage.service';
import { AuditLogService } from '../services/audit-log.service';
import { PIIService } from '../services/pii.service';
import { JsonStorageService } from '../services/storage.service';
import { Feedback, UserRating } from '../../../shared/dist';
import { analyticsService } from './analytics.routes';

const router = Router();

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const jsonStorage = new JsonStorageService(dataDir);
const sessionStorage = new SessionStorageService(jsonStorage);
const auditLogService = new AuditLogService(dataDir);
const piiService = new PIIService(dataDir);

/**
 * POST /api/feedback/classification
 * Submit feedback on classification (confirm or correct)
 * Requirements: 4.1, 4.2, 4.3, 5.3, 13.1, 13.2, 13.3, 21.2
 */
router.post('/classification', async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      confirmed,
      correctedCategory,
      userId = 'anonymous'
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required'
      });
    }

    if (typeof confirmed !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid confirmed value',
        message: 'confirmed must be a boolean'
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

    console.log('[Feedback] Session loaded:', sessionId);
    console.log('[Feedback] Session has classification:', !!session.classification);
    console.log('[Feedback] Session status:', session.status);
    console.log('[Feedback] Session keys:', Object.keys(session));

    if (!session.classification) {
      console.error('[Feedback] No classification found in session!');
      console.error('[Feedback] Session data:', JSON.stringify(session, null, 2));
      return res.status(400).json({
        error: 'No classification found',
        message: 'Session does not have a classification yet'
      });
    }

    // Validate corrected category if provided
    if (!confirmed && correctedCategory) {
      const validCategories = [
        'Eliminate',
        'Simplify',
        'Digitise',
        'RPA',
        'AI Agent',
        'Agentic AI'
      ];
      
      if (!validCategories.includes(correctedCategory)) {
        return res.status(400).json({
          error: 'Invalid category',
          message: `Category must be one of: ${validCategories.join(', ')}`
        });
      }
    }

    // Create feedback
    const feedback: Feedback = {
      confirmed,
      correctedCategory: !confirmed ? correctedCategory : undefined,
      timestamp: new Date().toISOString()
    };

    // Update session
    session.feedback = feedback;
    session.updatedAt = new Date().toISOString();
    await sessionStorage.saveSession(session);
    analyticsService.invalidateCache();

    // Log feedback
    await auditLogService.logFeedback(
      sessionId,
      userId,
      {
        ...feedback,
        originalCategory: session.classification.category
      },
      false, // No PII in feedback
      {
        originalCategory: session.classification.category,
        originalConfidence: session.classification.confidence
      }
    );

    res.json({
      message: 'Feedback recorded successfully',
      sessionId,
      feedback
    });
  } catch (error) {
    console.error('Error recording feedback:', error);
    res.status(500).json({
      error: 'Failed to record feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/feedback/rating
 * Submit user satisfaction rating (thumbs up/down)
 * Requirements: 4.1, 4.2, 5.3, 13.1, 13.2, 21.2
 */
router.post('/rating', async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      rating,
      comments,
      userId = 'anonymous'
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required'
      });
    }

    if (!rating || !['up', 'down'].includes(rating)) {
      return res.status(400).json({
        error: 'Invalid rating',
        message: 'Rating must be "up" or "down"'
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

    // Scrub PII from comments if provided
    let scrubbedComments: string | undefined;
    let hasPII = false;

    if (comments) {
      const scrubResult = await piiService.scrubAndStore(comments, sessionId, userId);
      scrubbedComments = scrubResult.scrubbedText;
      hasPII = scrubResult.hasPII;
    }

    // Create rating
    const userRating: UserRating = {
      rating,
      comments: scrubbedComments,
      timestamp: new Date().toISOString()
    };

    // Update session
    session.userRating = userRating;
    session.updatedAt = new Date().toISOString();
    await sessionStorage.saveSession(session);
    analyticsService.invalidateCache();

    // Log rating
    await auditLogService.logRating(
      sessionId,
      userId,
      { rating, comments },
      scrubbedComments,
      hasPII,
      {
        hasClassification: !!session.classification,
        hasFeedback: !!session.feedback
      }
    );

    res.json({
      message: 'Rating recorded successfully',
      sessionId,
      rating: userRating
    });
  } catch (error) {
    console.error('Error recording rating:', error);
    res.status(500).json({
      error: 'Failed to record rating',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feedback/session/:sessionId
 * Get all feedback for a session
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await sessionStorage.loadSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId
      });
    }

    res.json({
      sessionId,
      feedback: session.feedback || null,
      rating: session.userRating || null,
      classification: session.classification || null
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      error: 'Failed to fetch feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
