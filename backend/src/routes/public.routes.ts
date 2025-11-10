import { Router, Request, Response } from 'express';
import { OpenAIService } from '../services/openai.service';
import { BedrockService } from '../services/bedrock.service';
import { AuditLogService } from '../services/audit-log.service';

const router = Router();

const dataDir = process.env.DATA_DIR || './data';
const openaiService = new OpenAIService();
const bedrockService = new BedrockService();
const auditLogService = new AuditLogService(dataDir);

/**
 * GET /api/public/models
 * List available models (OpenAI or Bedrock)
 * Public endpoint - no authentication required
 * Used during initial configuration before login
 */
router.get('/models', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const provider = (req.query.provider as string) || 'openai';
  const awsRegion = req.headers['x-aws-region'] as string || req.query.awsRegion as string || 'us-east-1';
  
  try {
    if (provider === 'openai') {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        // Log failed attempt
        await auditLogService.log({
          sessionId: 'public',
          timestamp: new Date().toISOString(),
          eventType: 'model_list_error',
          userId: 'anonymous',
          data: {
            provider: 'openai',
            error: 'Missing API key',
            ipAddress: req.ip
          },
          piiScrubbed: false
        });
        
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

      // Log successful fetch
      await auditLogService.log({
        sessionId: 'public',
        timestamp: new Date().toISOString(),
        eventType: 'model_list_success',
        userId: 'anonymous',
        data: {
          provider: 'openai',
          modelCount: relevantModels.length,
          models: relevantModels.map(m => m.id),
          duration: Date.now() - startTime,
          ipAddress: req.ip
        },
        piiScrubbed: false
      });

      res.json({
        models: relevantModels
      });
    } else if (provider === 'bedrock') {
      // Get AWS credentials from headers or query params
      const awsAccessKeyId = req.headers['x-aws-access-key-id'] as string || req.query.awsAccessKeyId as string;
      const awsSecretAccessKey = req.headers['x-aws-secret-access-key'] as string || req.query.awsSecretAccessKey as string;
      const awsSessionToken = req.headers['x-aws-session-token'] as string || req.query.awsSessionToken as string;

      if (!awsAccessKeyId || !awsSecretAccessKey) {
        // Log failed attempt
        await auditLogService.log({
          sessionId: 'public',
          timestamp: new Date().toISOString(),
          eventType: 'model_list_error',
          userId: 'anonymous',
          data: {
            provider: 'bedrock',
            region: awsRegion,
            error: 'Missing AWS credentials',
            ipAddress: req.ip
          },
          piiScrubbed: false
        });
        
        return res.status(400).json({
          error: 'Missing AWS credentials',
          message: 'AWS Access Key ID and Secret Access Key are required for Bedrock'
        });
      }

      // Fetch models dynamically from AWS Bedrock
      const models = await bedrockService.listModels({
        provider: 'bedrock',
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken,
        awsRegion
      });

      // Log successful fetch
      await auditLogService.log({
        sessionId: 'public',
        timestamp: new Date().toISOString(),
        eventType: 'model_list_success',
        userId: 'anonymous',
        data: {
          provider: 'bedrock',
          region: awsRegion,
          modelCount: models.length,
          models: models.map(m => m.id),
          duration: Date.now() - startTime,
          ipAddress: req.ip
        },
        piiScrubbed: false
      });

      res.json({
        models
      });
    } else {
      // Log invalid provider
      await auditLogService.log({
        sessionId: 'public',
        timestamp: new Date().toISOString(),
        eventType: 'model_list_error',
        userId: 'anonymous',
        data: {
          provider,
          error: 'Invalid provider',
          ipAddress: req.ip
        },
        piiScrubbed: false
      });
      
      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Provider must be "openai" or "bedrock"'
      });
    }
  } catch (error) {
    console.error('Error listing models:', error);
    
    // Log the error with full details
    await auditLogService.log({
      sessionId: 'public',
      timestamp: new Date().toISOString(),
      eventType: 'model_list_error',
      userId: 'anonymous',
      data: {
        provider,
        region: awsRegion,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
        ipAddress: req.ip
      },
      piiScrubbed: false
    });
    
    res.status(500).json({
      error: 'Failed to list models',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
