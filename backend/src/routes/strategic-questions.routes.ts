import { Router, Request, Response } from 'express';
import { VersionedStorageService } from '../services/versioned-storage.service';
import { JsonStorageService } from '../services/storage.service';

const router = Router();

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const jsonStorage = new JsonStorageService(dataDir);
const versionedStorage = new VersionedStorageService(jsonStorage);

export interface StrategicQuestion {
    id: string;
    text: string;
    key?: string; // e.g., 'success_criteria'
    priority: 'High' | 'Medium' | 'Low';
    active: boolean;
}

// Default questions to seed if none exist
const DEFAULT_QUESTIONS: StrategicQuestion[] = [
    {
        id: 'success_criteria',
        key: 'success_criteria',
        text: 'What would success look like for you?',
        priority: 'High',
        active: true
    },
    {
        id: 'risks',
        key: 'risks_constraints',
        text: 'What risks and constraints are you aware of? Are there known blockers?',
        priority: 'High',
        active: true
    },
    {
        id: 'value',
        key: 'value_estimate',
        text: 'How much time, resource, or money would this save? What value would you place on this?',
        priority: 'High',
        active: true
    },
    {
        id: 'sponsorship',
        key: 'sponsorship',
        text: 'Have you raised this before or do you have sponsorship?',
        priority: 'High',
        active: true
    }
];

/**
 * GET /api/strategic-questions
 * Get latest strategic questions
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        let questions = await versionedStorage.getStrategicQuestions();

        // Seed defaults if empty
        if (!questions) {
            await versionedStorage.saveStrategicQuestions(DEFAULT_QUESTIONS);
            questions = DEFAULT_QUESTIONS;
        }

        res.json(questions);
    } catch (error) {
        console.error('Error fetching strategic questions:', error);
        res.status(500).json({ error: 'Failed to fetch strategic questions' });
    }
});

/**
 * PUT /api/strategic-questions
 * Update strategic questions list (creates new version)
 */
router.put('/', async (req: Request, res: Response) => {
    try {
        const questions = req.body;

        if (!Array.isArray(questions)) {
            return res.status(400).json({ error: 'Invalid format. Expected array of questions.' });
        }

        const version = await versionedStorage.saveStrategicQuestions(questions);

        res.json({
            message: 'Strategic questions updated successfully',
            version,
            count: questions.length
        });
    } catch (error) {
        console.error('Error updating strategic questions:', error);
        res.status(500).json({ error: 'Failed to update strategic questions' });
    }
});

export default router;
