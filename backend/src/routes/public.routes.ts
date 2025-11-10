import { Router, Request, Response } from 'express';
import { OpenAIService } from '../services/openai.service';
import { BedrockService } from '../services/bedrock.service';

const router = Router();

const openaiService = new OpenAIService();
const bedrockService = new BedrockService();

/**
 * GET /api/public/models
 * List available models (OpenAI or Bedrock)
 * Public endpoint - no authentication required
 * Used during initial configuration before login
 */
router.get('/models', async (req: Request, res: Response) => {
  try {
    const provider = (req.query.provider as string) || 'openai';

    if (provider === 'openai') {
      const apiKey = req.headers['x-api-key'] as string;
      
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
      // Get AWS credentials from headers or query params
      const awsAccessKeyId = req.headers['x-aws-access-key-id'] as string || req.query.awsAccessKeyId as string;
      const awsSecretAccessKey = req.headers['x-aws-secret-access-key'] as string || req.query.awsSecretAccessKey as string;
      const awsSessionToken = req.headers['x-aws-session-token'] as string || req.query.awsSessionToken as string;
      const awsRegion = req.headers['x-aws-region'] as string || req.query.awsRegion as string || 'us-east-1';

      if (!awsAccessKeyId || !awsSecretAccessKey) {
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

      res.json({
        models
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

export default router;
