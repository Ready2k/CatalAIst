import { Router, Request, Response } from 'express';
import { JsonStorageService } from '../services/storage.service';
import { SessionStorageService } from '../services/session-storage.service';
import { OpenAIService } from '../services/openai.service';
import { VersionedStorageService } from '../services/versioned-storage.service';
import { LearningAnalysisService } from '../services/learning-analysis.service';
import { LearningSuggestionService } from '../services/learning-suggestion.service';
import { AuditLogService } from '../services/audit-log.service';
import { DecisionMatrix } from '../../../shared/types';

const router = Router();

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const jsonStorage = new JsonStorageService(dataDir);
const sessionStorage = new SessionStorageService(jsonStorage);
const openaiService = new OpenAIService();
const versionedStorage = new VersionedStorageService(jsonStorage);
const auditLogService = new AuditLogService(dataDir);
const learningAnalysisService = new LearningAnalysisService(
  sessionStorage,
  jsonStorage
);
const learningSuggestionService = new LearningSuggestionService(
  openaiService,
  jsonStorage,
  sessionStorage,
  versionedStorage
);

/**
 * GET /api/learning/suggestions
 * Get all suggestions, optionally filtered by status
 */
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as any;
    
    const suggestions = await learningSuggestionService.listSuggestions(status);
    
    res.json({
      suggestions,
      count: suggestions.length
    });
  } catch (error: any) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({
      error: 'Failed to fetch suggestions',
      message: error.message
    });
  }
});

/**
 * GET /api/learning/suggestions/:id
 * Get a specific suggestion by ID
 */
router.get('/suggestions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const suggestion = await learningSuggestionService.loadSuggestion(id);
    
    if (!suggestion) {
      return res.status(404).json({
        error: 'Suggestion not found',
        suggestionId: id
      });
    }
    
    res.json(suggestion);
  } catch (error: any) {
    console.error('Error fetching suggestion:', error);
    res.status(500).json({
      error: 'Failed to fetch suggestion',
      message: error.message
    });
  }
});

/**
 * POST /api/learning/suggestions/:id/approve
 * Approve a suggestion and apply it to the decision matrix
 * Requirements: 24.6, 25.5, 25.6
 */
router.post('/suggestions/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewedBy = 'admin', reviewNotes } = req.body;
    
    // Load suggestion
    const suggestion = await learningSuggestionService.loadSuggestion(id);
    
    if (!suggestion) {
      return res.status(404).json({
        error: 'Suggestion not found',
        suggestionId: id
      });
    }
    
    if (suggestion.status !== 'pending') {
      return res.status(400).json({
        error: 'Suggestion has already been reviewed',
        currentStatus: suggestion.status
      });
    }
    
    // Update suggestion status to approved
    await learningSuggestionService.updateSuggestionStatus(
      id,
      'approved',
      reviewedBy,
      reviewNotes
    );
    
    // Apply the suggestion to decision matrix
    const updatedMatrix = await applySuggestionToMatrix(suggestion);
    
    // Update suggestion status to applied
    const appliedSuggestion = await learningSuggestionService.updateSuggestionStatus(
      id,
      'applied',
      reviewedBy,
      reviewNotes
    );

    // Log suggestion approval and application
    await auditLogService.log({
      sessionId: 'system',
      timestamp: new Date().toISOString(),
      eventType: 'classification', // Using classification type for system events
      userId: reviewedBy,
      data: {
        action: 'learning_suggestion_approved',
        suggestionId: id,
        suggestionType: suggestion.type,
        analysisId: suggestion.analysisId,
        newMatrixVersion: updatedMatrix.version,
        reviewNotes
      },
      piiScrubbed: false,
      metadata: {
        decisionMatrixVersion: updatedMatrix.version
      }
    });
    
    res.json({
      message: 'Suggestion approved and applied',
      suggestion: appliedSuggestion,
      newMatrixVersion: updatedMatrix.version
    });
  } catch (error: any) {
    console.error('Error approving suggestion:', error);
    res.status(500).json({
      error: 'Failed to approve suggestion',
      message: error.message
    });
  }
});

/**
 * POST /api/learning/suggestions/:id/reject
 * Reject a suggestion
 */
router.post('/suggestions/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewedBy, reviewNotes } = req.body;
    
    // Load suggestion
    const suggestion = await learningSuggestionService.loadSuggestion(id);
    
    if (!suggestion) {
      return res.status(404).json({
        error: 'Suggestion not found',
        suggestionId: id
      });
    }
    
    if (suggestion.status !== 'pending') {
      return res.status(400).json({
        error: 'Suggestion has already been reviewed',
        currentStatus: suggestion.status
      });
    }
    
    // Update suggestion status to rejected
    const rejectedSuggestion = await learningSuggestionService.updateSuggestionStatus(
      id,
      'rejected',
      reviewedBy,
      reviewNotes
    );
    
    res.json({
      message: 'Suggestion rejected',
      suggestion: rejectedSuggestion
    });
  } catch (error: any) {
    console.error('Error rejecting suggestion:', error);
    res.status(500).json({
      error: 'Failed to reject suggestion',
      message: error.message
    });
  }
});

/**
 * POST /api/learning/analyze
 * Manually trigger learning analysis
 * Requirements: 12.4, 24.1, 25.1, 25.2, 25.3, 25.4
 */
router.post('/analyze', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { 
      provider = 'openai',
      model,
      apiKey, 
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion,
      startDate, 
      endDate, 
      userId = 'admin' 
    } = req.body;
    
    // Validate credentials based on provider
    if (provider === 'openai' && !apiKey) {
      return res.status(400).json({
        error: 'API key is required',
        message: 'Please provide an OpenAI API key to generate suggestions'
      });
    }
    
    if (provider === 'bedrock' && (!awsAccessKeyId || !awsSecretAccessKey)) {
      return res.status(400).json({
        error: 'AWS credentials are required',
        message: 'Please provide AWS credentials to generate suggestions with Bedrock'
      });
    }
    
    // Parse dates if provided
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    // Perform analysis
    const analysis = await learningAnalysisService.analyzeFeedback('manual', start, end);
    
    // Generate suggestions using LLM
    const llmConfig = {
      provider,
      model,
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion
    };
    
    const suggestions = await learningSuggestionService.generateSuggestions(
      analysis,
      llmConfig
    );

    // Log learning analysis
    await auditLogService.log({
      sessionId: 'system',
      timestamp: new Date().toISOString(),
      eventType: 'classification', // Using classification type for system events
      userId,
      data: {
        action: 'learning_analysis_triggered',
        analysisId: analysis.analysisId,
        triggeredBy: 'manual',
        overallAgreementRate: analysis.findings.overallAgreementRate,
        suggestionsGenerated: suggestions.length,
        dataRange: analysis.dataRange
      },
      modelPrompt: 'Learning analysis prompt',
      modelResponse: JSON.stringify(suggestions),
      piiScrubbed: false,
      metadata: {
        llmProvider: 'openai',
        latencyMs: Date.now() - startTime
      }
    });
    
    res.json({
      message: 'Analysis completed',
      analysis,
      suggestions,
      suggestionCount: suggestions.length
    });
  } catch (error: any) {
    console.error('Error performing analysis:', error);
    res.status(500).json({
      error: 'Failed to perform analysis',
      message: error.message
    });
  }
});

/**
 * GET /api/learning/analyses
 * Get all learning analyses
 */
router.get('/analyses', async (req: Request, res: Response) => {
  try {
    const analysisIds = await learningAnalysisService.listAnalyses();
    
    const analyses = [];
    for (const id of analysisIds) {
      const analysis = await learningAnalysisService.loadAnalysis(id);
      if (analysis) {
        analyses.push(analysis);
      }
    }
    
    res.json({
      analyses,
      count: analyses.length
    });
  } catch (error: any) {
    console.error('Error fetching analyses:', error);
    res.status(500).json({
      error: 'Failed to fetch analyses',
      message: error.message
    });
  }
});

/**
 * GET /api/learning/analyses/:id
 * Get a specific analysis by ID
 */
router.get('/analyses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const analysis = await learningAnalysisService.loadAnalysis(id);
    
    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found',
        analysisId: id
      });
    }
    
    // Load associated suggestions
    const suggestions = [];
    for (const suggestionId of analysis.suggestions) {
      const suggestion = await learningSuggestionService.loadSuggestion(suggestionId);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }
    
    res.json({
      analysis,
      suggestions
    });
  } catch (error: any) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch analysis',
      message: error.message
    });
  }
});

/**
 * GET /api/learning/check-threshold
 * Check if agreement rate is below threshold (for automatic triggers)
 */
router.get('/check-threshold', async (req: Request, res: Response) => {
  try {
    const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 0.8;
    
    const result = await learningAnalysisService.checkAgreementThreshold(threshold);
    
    res.json({
      belowThreshold: result.belowThreshold,
      categories: result.categories,
      overallRate: result.overallRate,
      threshold,
      recommendation: result.belowThreshold 
        ? 'Analysis recommended - agreement rate below threshold'
        : 'No action needed - agreement rate acceptable'
    });
  } catch (error: any) {
    console.error('Error checking threshold:', error);
    res.status(500).json({
      error: 'Failed to check threshold',
      message: error.message
    });
  }
});

/**
 * Helper function to apply suggestion to decision matrix
 */
async function applySuggestionToMatrix(suggestion: any): Promise<DecisionMatrix> {
  const currentMatrix = await versionedStorage.getLatestDecisionMatrix();
  
  if (!currentMatrix) {
    throw new Error('No active decision matrix found');
  }
  
  // Clone the matrix
  const updatedMatrix = JSON.parse(JSON.stringify(currentMatrix));
  
  // Apply changes based on suggestion type
  switch (suggestion.type) {
    case 'new_rule':
      if (suggestion.suggestedChange.newRule) {
        updatedMatrix.rules.push(suggestion.suggestedChange.newRule);
      }
      break;
      
    case 'modify_rule':
      if (suggestion.suggestedChange.ruleId && suggestion.suggestedChange.modifiedRule) {
        const ruleIndex = updatedMatrix.rules.findIndex(
          (r: any) => r.ruleId === suggestion.suggestedChange.ruleId
        );
        if (ruleIndex !== -1) {
          updatedMatrix.rules[ruleIndex] = suggestion.suggestedChange.modifiedRule;
        }
      }
      break;
      
    case 'adjust_weight':
      if (suggestion.suggestedChange.attributeName && suggestion.suggestedChange.newWeight !== undefined) {
        const attrIndex = updatedMatrix.attributes.findIndex(
          (a: any) => a.name === suggestion.suggestedChange.attributeName
        );
        if (attrIndex !== -1) {
          updatedMatrix.attributes[attrIndex].weight = suggestion.suggestedChange.newWeight;
        }
      }
      break;
      
    case 'new_attribute':
      if (suggestion.suggestedChange.newAttribute) {
        updatedMatrix.attributes.push(suggestion.suggestedChange.newAttribute);
      }
      break;
  }
  
  // Determine new version number
  const [major, minor] = currentMatrix.version.split('.').map(Number);
  const newVersion = `${major}.${minor + 1}`;
  
  // Save updated matrix (creates new version)
  const newMatrix: DecisionMatrix = {
    ...updatedMatrix,
    version: newVersion,
    createdAt: new Date().toISOString(),
    createdBy: 'admin',
    description: `Applied learning suggestion: ${suggestion.rationale.substring(0, 100)}`,
    active: true
  };
  
  await versionedStorage.saveDecisionMatrix(newMatrix);
  
  return newMatrix;
}

export default router;
