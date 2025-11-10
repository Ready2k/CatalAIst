import { Router, Request, Response } from 'express';
import { JsonStorageService } from '../services/storage.service';
import { SubjectsStorageService } from '../services/subjects-storage.service';

const router = Router();

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const jsonStorage = new JsonStorageService(dataDir);
const subjectsStorage = new SubjectsStorageService(jsonStorage);

/**
 * GET /api/subjects
 * Get all available subjects (default + custom)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const subjects = await subjectsStorage.getAllSubjects();
    
    res.json({
      subjects,
      count: subjects.length
    });
  } catch (error) {
    console.error('Error getting subjects:', error);
    res.status(500).json({
      error: 'Failed to get subjects',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/subjects/custom
 * Get only custom subjects
 */
router.get('/custom', async (req: Request, res: Response) => {
  try {
    const subjects = await subjectsStorage.getCustomSubjects();
    
    res.json({
      subjects,
      count: subjects.length
    });
  } catch (error) {
    console.error('Error getting custom subjects:', error);
    res.status(500).json({
      error: 'Failed to get custom subjects',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/subjects
 * Add a custom subject
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subject } = req.body;

    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({
        error: 'Invalid subject',
        message: 'Subject must be a non-empty string'
      });
    }

    await subjectsStorage.addCustomSubject(subject);

    res.json({
      message: 'Subject added successfully',
      subject: subject.trim()
    });
  } catch (error) {
    console.error('Error adding subject:', error);
    res.status(500).json({
      error: 'Failed to add subject',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/subjects/:subject
 * Remove a custom subject
 */
router.delete('/:subject', async (req: Request, res: Response) => {
  try {
    const { subject } = req.params;

    await subjectsStorage.removeCustomSubject(decodeURIComponent(subject));

    res.json({
      message: 'Subject removed successfully',
      subject
    });
  } catch (error) {
    console.error('Error removing subject:', error);
    res.status(500).json({
      error: 'Failed to remove subject',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
