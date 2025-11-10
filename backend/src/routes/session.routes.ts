import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SessionStorageService } from '../services/session-storage.service';
import { ClassificationService } from '../services/classification.service';
import { ClarificationService } from '../services/clarification.service';
import { DecisionMatrixEvaluatorService } from '../services/decision-matrix-evaluator.service';
import { AuditLogService } from '../services/audit-log.service';
import { PIIService } from '../services/pii.service';
import { OpenAIService } from '../services/openai.service';
import { JsonStorageService } from '../services/storage.service';
import { VersionedStorageService } from '../services/versioned-storage.service';
import { Session, Conversation, Classification, Feedback, UserRating } from '../../../shared/types';

const router = Router();

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const jsonStorage = new JsonStorageService(dataDir);
const sessionStorage = new SessionStorageService(jsonStorage);
const versionedStorage = new VersionedStorageService(jsonStorage);
const classificationService = new ClassificationService(versionedStorage);
const clarificationService = new ClarificationService(versionedStorage);
const evaluatorService = new DecisionMatrixEvaluatorService();
const auditLogService = new AuditLogService(dataDir);
const piiService = new PIIService(dataDir);
const openaiService = new OpenAIService();

/**
 * GET /api/sessions/models
 * List available models (OpenAI or Bedrock)
 * Requirements: 9.2
 */
router.get('/models', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const provider = (req.query.provider as string) || 'openai';

    if (provider === 'openai') {
      if (!apiKey) {
        return res.status(400).json({
          error: 'Missing API key',
          message: 'OpenAI API key is required'
        });
      }

      const models = await openaiService.listModels({ provider: 'openai', apiKey });
      
      // Filter to only show relevant models for classification
      const relevantModels = models.filter(model => 
        model.id.includes('gpt-4') || 
        model.id.includes('gpt-3.5') ||
        model.id.includes('o1')
      );

      res.json({
        models: relevantModels
      });
    } else if (provider === 'bedrock') {
      // Return static list of Bedrock models
      // In a real implementation, you could query AWS Bedrock API for available models
      const bedrockModels = [
        { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', created: 0, ownedBy: 'anthropic' },
        { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', created: 0, ownedBy: 'anthropic' },
        { id: 'anthropic.claude-3-opus-20240229-v1:0', created: 0, ownedBy: 'anthropic' },
        { id: 'anthropic.claude-3-sonnet-20240229-v1:0', created: 0, ownedBy: 'anthropic' },
        { id: 'anthropic.claude-3-haiku-20240307-v1:0', created: 0, ownedBy: 'anthropic' }
      ];

      res.json({
        models: bedrockModels
      });
    } else {
      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Provider must be "openai" or "bedrock"'
      });
    }
  } catch (error) {
    console.error('Error listing models:', error);
    res.status(500).json({
      error: 'Failed to list models',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/sessions
 * Create a new session
 * Requirements: 9.1, 9.3, 10.1
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      apiKey, 
      model = 'gpt-4', 
      userId = 'anonymous',
      provider = 'openai',
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion
    } = req.body;

    // Validate credentials based on provider
    if (provider === 'bedrock') {
      // For Bedrock, validate AWS credentials
      if (!awsAccessKeyId || !awsSecretAccessKey) {
        return res.status(400).json({
          error: 'Missing AWS credentials',
          message: 'AWS Access Key ID and Secret Access Key are required for Bedrock'
        });
      }
      
      // Validate AWS Access Key ID format (basic check)
      if (!awsAccessKeyId.startsWith('AKIA') && !awsAccessKeyId.startsWith('ASIA')) {
        return res.status(400).json({
          error: 'Invalid AWS credentials format',
          message: 'AWS Access Key ID should start with "AKIA" or "ASIA"'
        });
      }
    } else {
      // For OpenAI, validate API key
      if (!apiKey) {
        return res.status(400).json({
          error: 'Missing API key',
          message: 'OpenAI API key is required'
        });
      }

      // Validate API key format (basic check)
      if (!apiKey.startsWith('sk-')) {
        return res.status(400).json({
          error: 'Invalid API key format',
          message: 'OpenAI API key should start with "sk-"'
        });
      }
    }

    const sessionId = uuidv4();
    const session: Session = {
      sessionId,
      initiativeId: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      modelUsed: model,
      conversations: []
    };

    await sessionStorage.saveSession(session);

    // Store credentials in memory (not persisted)
    // In a real implementation, this would be stored in a secure session store
    res.json({
      sessionId,
      model,
      provider,
      message: 'Session created successfully'
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      error: 'Failed to create session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/sessions/:id
 * Get session details
 * Requirements: 10.2
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await sessionStorage.loadSession(id);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId: id
      });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      error: 'Failed to fetch session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/sessions/:id/conversations
 * Add a new conversation to an existing session
 * Requirements: 10.1, 10.2, 10.3
 */
router.post('/:id/conversations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { processDescription, userId = 'anonymous' } = req.body;

    if (!processDescription || processDescription.length < 10) {
      return res.status(400).json({
        error: 'Invalid process description',
        message: 'Process description must be at least 10 characters'
      });
    }

    const session = await sessionStorage.loadSession(id);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId: id
      });
    }

    const conversation: Conversation = {
      conversationId: uuidv4(),
      timestamp: new Date().toISOString(),
      processDescription,
      clarificationQA: []
    };

    session.conversations.push(conversation);
    session.updatedAt = new Date().toISOString();

    await sessionStorage.saveSession(session);

    res.json({
      message: 'Conversation added successfully',
      conversationId: conversation.conversationId,
      session
    });
  } catch (error) {
    console.error('Error adding conversation:', error);
    res.status(500).json({
      error: 'Failed to add conversation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/sessions/:id
 * End session and clear API key
 * Requirements: 9.5
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await sessionStorage.loadSession(id);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId: id
      });
    }

    session.status = 'completed';
    session.updatedAt = new Date().toISOString();

    await sessionStorage.saveSession(session);

    // In a real implementation, clear API key from secure session store

    res.json({
      message: 'Session ended successfully',
      sessionId: id
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      error: 'Failed to end session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
