import { Router, Request, Response } from 'express';
import { DecisionMatrixService } from '../services/decision-matrix.service';
import { DecisionMatrixEvaluatorService } from '../services/decision-matrix-evaluator.service';
import { OpenAIService } from '../services/openai.service';
import { VersionedStorageService } from '../services/versioned-storage.service';
import { JsonStorageService } from '../services/storage.service';
import { AuditLogService } from '../services/audit-log.service';
import { DecisionMatrix, DecisionMatrixSchema } from '../types';

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
 * GET /api/decision-matrix/export
 * Export the current decision matrix as JSON file
 * Admin only
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { version } = req.query;
    
    let matrix: DecisionMatrix | null;
    
    if (version) {
      // Export specific version
      matrix = await versionedStorage.getDecisionMatrix(version as string);
    } else {
      // Export latest version
      matrix = await versionedStorage.getLatestDecisionMatrix();
    }
    
    if (!matrix) {
      return res.status(404).json({
        error: 'Decision matrix not found',
        message: version 
          ? `Version ${version} does not exist`
          : 'No decision matrix has been initialized yet'
      });
    }

    // Add export metadata
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.body.userId || 'admin',
      systemVersion: '3.0.0',
      matrix
    };

    // Set headers for file download
    const filename = `decision-matrix-v${matrix.version}-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Log export
    await auditLogService.log({
      sessionId: 'system',
      timestamp: new Date().toISOString(),
      eventType: 'classification',
      userId: req.body.userId || 'admin',
      data: {
        action: 'decision_matrix_exported',
        version: matrix.version,
        filename
      },
      piiScrubbed: false,
      metadata: {
        decisionMatrixVersion: matrix.version
      }
    });

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting decision matrix:', error);
    res.status(500).json({
      error: 'Failed to export decision matrix',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/decision-matrix/export/all-versions
 * Export all decision matrix versions as a single JSON file
 * Admin only
 */
router.get('/export/all-versions', async (req: Request, res: Response) => {
  try {
    const versions = await versionedStorage.listDecisionMatrixVersions();
    
    if (versions.length === 0) {
      return res.status(404).json({
        error: 'No decision matrices found',
        message: 'No decision matrix versions exist'
      });
    }

    // Load all versions
    const matrices: DecisionMatrix[] = [];
    for (const version of versions) {
      const matrix = await versionedStorage.getDecisionMatrix(version);
      if (matrix) {
        matrices.push(matrix);
      }
    }

    // Create export package
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.body.userId || 'admin',
      systemVersion: '3.0.0',
      versionsCount: matrices.length,
      matrices
    };

    // Set headers for file download
    const filename = `decision-matrices-all-versions-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Log export
    await auditLogService.log({
      sessionId: 'system',
      timestamp: new Date().toISOString(),
      eventType: 'classification',
      userId: req.body.userId || 'admin',
      data: {
        action: 'decision_matrices_exported_all',
        versionsCount: matrices.length,
        filename
      },
      piiScrubbed: false
    });

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting all decision matrix versions:', error);
    res.status(500).json({
      error: 'Failed to export decision matrices',
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

/**
 * POST /api/decision-matrix/import
 * Import a decision matrix from JSON file
 * Admin only
 * 
 * Security validations:
 * - Validates JSON structure against DecisionMatrixSchema
 * - Checks for required fields
 * - Sanitizes version numbers
 * - Prevents overwriting without explicit permission
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { matrix: importedMatrix, replaceExisting = false, userId = 'admin' } = req.body;

    // Validation 1: Check if matrix data exists
    if (!importedMatrix) {
      return res.status(400).json({
        error: 'Missing matrix data',
        message: 'Please provide a matrix object to import'
      });
    }

    // Validation 2: Extract matrix from export format if needed
    const matrixData = importedMatrix.matrix || importedMatrix;

    // Validation 3: Check for suspicious properties that could be harmful
    // Recursively check for prototype pollution in the entire object tree
    const checkForSuspiciousKeys = (obj: any, path: string = 'root'): string[] => {
      const suspiciousKeys = ['__proto__', 'constructor', 'prototype'];
      const found: string[] = [];
      
      if (obj && typeof obj === 'object') {
        const ownKeys = Object.keys(obj);
        
        // Check current level
        for (const key of ownKeys) {
          if (suspiciousKeys.includes(key)) {
            found.push(`${path}.${key}`);
          }
        }
        
        // Recursively check nested objects and arrays
        for (const key of ownKeys) {
          if (obj[key] && typeof obj[key] === 'object') {
            found.push(...checkForSuspiciousKeys(obj[key], `${path}.${key}`));
          }
        }
      }
      
      return found;
    };
    
    const suspiciousProperties = checkForSuspiciousKeys(matrixData);
    
    if (suspiciousProperties.length > 0) {
      console.error('Found suspicious keys in import:', suspiciousProperties);
      return res.status(400).json({
        error: 'Invalid matrix data',
        message: `Matrix contains potentially harmful properties at: ${suspiciousProperties.join(', ')}`
      });
    }

    // Validation 4: Validate against schema (comprehensive structure validation)
    const validationResult = DecisionMatrixSchema.safeParse(matrixData);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid decision matrix format',
        message: 'The imported file does not contain a valid decision matrix',
        details: validationResult.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      });
    }

    const matrix = validationResult.data;

    // Validation 5: Check reasonable limits to prevent DoS
    if (matrix.rules.length > 1000) {
      return res.status(400).json({
        error: 'Matrix too large',
        message: 'Decision matrix cannot have more than 1000 rules'
      });
    }

    if (matrix.attributes.length > 100) {
      return res.status(400).json({
        error: 'Matrix too large',
        message: 'Decision matrix cannot have more than 100 attributes'
      });
    }

    // Validation 6: Check if matrix already exists
    const currentMatrix = await versionedStorage.getLatestDecisionMatrix();
    
    if (currentMatrix && !replaceExisting) {
      return res.status(409).json({
        error: 'Matrix already exists',
        message: 'A decision matrix already exists. Set replaceExisting=true to import anyway.',
        currentVersion: currentMatrix.version,
        importedVersion: matrix.version
      });
    }

    // Determine new version number
    let newVersion: string;
    if (!currentMatrix) {
      // No existing matrix, use imported version or default to 1.0
      newVersion = matrix.version || '1.0';
    } else {
      // Increment from current version
      const [major, minor] = currentMatrix.version.split('.').map(Number);
      newVersion = `${major}.${minor + 1}`;
    }

    // Create the new matrix with sanitized metadata
    const newMatrix: DecisionMatrix = {
      ...matrix,
      version: newVersion,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      description: matrix.description 
        ? `${matrix.description.substring(0, 500)} (Imported from v${matrix.version})`
        : `Imported from v${matrix.version}`,
      active: true
    } as DecisionMatrix;

    // Save the imported matrix
    await versionedStorage.saveDecisionMatrix(newMatrix);

    // Log import for audit trail
    await auditLogService.log({
      sessionId: 'system',
      timestamp: new Date().toISOString(),
      eventType: 'classification',
      userId,
      data: {
        action: 'decision_matrix_imported',
        importedVersion: matrix.version,
        newVersion,
        previousVersion: currentMatrix?.version || 'none',
        rulesCount: newMatrix.rules.length,
        attributesCount: newMatrix.attributes.length,
        replaceExisting
      },
      piiScrubbed: false,
      metadata: {
        decisionMatrixVersion: newVersion
      }
    });

    res.status(201).json({
      message: 'Decision matrix imported successfully',
      importedVersion: matrix.version,
      newVersion,
      matrix: newMatrix
    });
  } catch (error) {
    console.error('Error importing decision matrix:', error);
    res.status(500).json({
      error: 'Failed to import decision matrix',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
