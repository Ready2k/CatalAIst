import { Router, Request, Response } from 'express';
import { DecisionMatrixService } from '../services/decision-matrix.service';
import { DecisionMatrixEvaluatorService } from '../services/decision-matrix-evaluator.service';
import { OpenAIService } from '../services/openai.service';
import { VersionedStorageService } from '../services/versioned-storage.service';
import { JsonStorageService } from '../services/storage.service';
import { AuditLogService } from '../services/audit-log.service';
import { DecisionMatrix, DecisionMatrixSchema } from '../../../shared/dist';

const router = Router();

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const jsonStorage = new JsonStorageService(dataDir);
const versionedStorage = new VersionedStorageService(jsonStorage);
const openAIService = new OpenAIService();
const decisionMatrixService = new DecisionMatrixService(openAIService, versionedStorage);
const evaluatorService = new DecisionMatrixEvaluatorService();
const auditLogService = new AuditLogService(dataDir);

/**
 * GET /api/decision-matrix
 * Get the current active decision matrix
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const matrix = await versionedStorage.getLatestDecisionMatrix();
    
    if (!matrix) {
      return res.status(404).json({
        error: 'No decision matrix found',
        message: 'Decision matrix has not been initialized yet'
      });
    }

    res.json(matrix);
  } catch (error) {
    console.error('Error fetching decision matrix:', error);
    res.status(500).json({
      error: 'Failed to fetch decision matrix',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/decision-matrix/versions
 * List all decision matrix versions
 */
router.get('/versions', async (req: Request, res: Response) => {
  try {
    const versions = await versionedStorage.listDecisionMatrixVersions();
    
    res.json({
      versions,
      count: versions.length
    });
  } catch (error) {
    console.error('Error listing decision matrix versions:', error);
    res.status(500).json({
      error: 'Failed to list versions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/decision-matrix/:version
 * Get a specific version of the decision matrix
 */
router.get('/:version', async (req: Request, res: Response) => {
  try {
    const { version } = req.params;
    const matrix = await versionedStorage.getDecisionMatrix(version);
    
    if (!matrix) {
      return res.status(404).json({
        error: 'Version not found',
        message: `Decision matrix version ${version} does not exist`
      });
    }

    res.json(matrix);
  } catch (error) {
    console.error('Error fetching decision matrix version:', error);
    res.status(500).json({
      error: 'Failed to fetch decision matrix version',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/decision-matrix
 * Update the decision matrix (creates a new version)
 * Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const { userId = 'admin' } = req.body;
    
    // Validate the request body
    const validationResult = DecisionMatrixSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid decision matrix format',
        details: validationResult.error.errors
      });
    }

    const matrix = validationResult.data;

    // Get the current latest version to determine the next version number
    const currentMatrix = await versionedStorage.getLatestDecisionMatrix();
    
    let newVersion: string;
    if (!currentMatrix) {
      newVersion = '1.0';
    } else {
      // Increment version (simple major.minor versioning)
      const [major, minor] = currentMatrix.version.split('.').map(Number);
      newVersion = `${major}.${minor + 1}`;
    }

    // Create the new matrix with updated metadata
    const newMatrix: DecisionMatrix = {
      ...matrix,
      version: newVersion,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      active: true
    } as DecisionMatrix;

    // Save the new version
    await versionedStorage.saveDecisionMatrix(newMatrix);

    // Log decision matrix update (using a generic log entry)
    await auditLogService.log({
      sessionId: 'system',
      timestamp: new Date().toISOString(),
      eventType: 'classification', // Using classification type for system events
      userId,
      data: {
        action: 'decision_matrix_update',
        previousVersion: currentMatrix?.version || 'none',
        newVersion,
        rulesCount: newMatrix.rules.length,
        attributesCount: newMatrix.attributes.length
      },
      piiScrubbed: false,
      metadata: {
        decisionMatrixVersion: newVersion
      }
    });

    res.status(201).json({
      message: 'Decision matrix updated successfully',
      version: newVersion,
      matrix: newMatrix
    });
  } catch (error) {
    console.error('Error updating decision matrix:', error);
    res.status(500).json({
      error: 'Failed to update decision matrix',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/decision-matrix/generate
 * Generate initial decision matrix using AI
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */
router.post('/generate', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { 
      apiKey, 
      model, 
      userId = 'admin',
      provider,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion
    } = req.body;

    // Validate credentials based on provider
    const detectedProvider = provider || (model?.startsWith('anthropic.claude') ? 'bedrock' : 'openai');
    
    if (detectedProvider === 'bedrock') {
      if (!awsAccessKeyId || !awsSecretAccessKey) {
        return res.status(400).json({
          error: 'Missing AWS credentials',
          message: 'AWS Access Key ID and Secret Access Key are required for Bedrock'
        });
      }
    } else {
      if (!apiKey) {
        return res.status(400).json({
          error: 'Missing API key',
          message: 'OpenAI API key is required to generate decision matrix'
        });
      }
    }

    // Check if matrix already exists
    const hasMatrix = await decisionMatrixService.hasInitialMatrix();
    if (hasMatrix) {
      return res.status(409).json({
        error: 'Matrix already exists',
        message: 'A decision matrix already exists. Use PUT /api/decision-matrix to update it.'
      });
    }

    // Build LLM config
    const llmConfig: any = {
      provider: detectedProvider,
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion: awsRegion || 'us-east-1'
    };

    // Generate the matrix
    const matrix = await decisionMatrixService.generateInitialMatrix(
      llmConfig,
      model || (detectedProvider === 'bedrock' ? 'anthropic.claude-3-5-sonnet-20241022-v2:0' : 'gpt-4')
    );

    // Log decision matrix generation
    await auditLogService.log({
      sessionId: 'system',
      timestamp: new Date().toISOString(),
      eventType: 'classification', // Using classification type for system events
      userId,
      data: {
        action: 'decision_matrix_generated',
        version: matrix.version,
        rulesCount: matrix.rules.length,
        attributesCount: matrix.attributes.length,
        generatedBy: 'ai'
      },
      modelPrompt: 'Decision matrix generation prompt',
      modelResponse: JSON.stringify(matrix),
      piiScrubbed: false,
      metadata: {
        modelVersion: model || (detectedProvider === 'bedrock' ? 'anthropic.claude-3-5-sonnet-20241022-v2:0' : 'gpt-4'),
        llmProvider: detectedProvider,
        latencyMs: Date.now() - startTime,
        decisionMatrixVersion: matrix.version
      }
    });

    res.status(201).json({
      message: 'Decision matrix generated successfully',
      matrix
    });
  } catch (error) {
    console.error('Error generating decision matrix:', error);
    res.status(500).json({
      error: 'Failed to generate decision matrix',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/decision-matrix/evaluate
 * Evaluate a classification against the decision matrix (internal use)
 */
router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const { classification, extractedAttributes } = req.body;

    if (!classification || !extractedAttributes) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both classification and extractedAttributes are required'
      });
    }

    // Get the current matrix
    const matrix = await versionedStorage.getLatestDecisionMatrix();
    
    if (!matrix) {
      return res.status(404).json({
        error: 'No decision matrix found',
        message: 'Decision matrix has not been initialized yet'
      });
    }

    // Evaluate the matrix
    const evaluation = evaluatorService.evaluateMatrix(
      matrix,
      classification,
      extractedAttributes
    );

    res.json(evaluation);
  } catch (error) {
    console.error('Error evaluating decision matrix:', error);
    res.status(500).json({
      error: 'Failed to evaluate decision matrix',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
