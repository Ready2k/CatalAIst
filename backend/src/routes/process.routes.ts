import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SessionStorageService } from '../services/session-storage.service';
import { ClassificationService } from '../services/classification.service';
import { ClarificationService } from '../services/clarification.service';
import { DecisionMatrixEvaluatorService } from '../services/decision-matrix-evaluator.service';
import { AuditLogService } from '../services/audit-log.service';
import { PIIService } from '../services/pii.service';
import { JsonStorageService } from '../services/storage.service';
import { VersionedStorageService } from '../services/versioned-storage.service';
import { SubjectExtractionService } from '../services/subject-extraction.service';
import { Session, Conversation, Classification } from '../../../shared/types';
import { analyticsService } from './analytics.routes';

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
const subjectExtractionService = new SubjectExtractionService();

/**
 * POST /api/process/submit
 * Submit a process description for classification
 * Requirements: 1.1, 1.3, 2.1, 3.1, 5.1, 21.2
 */
router.post('/submit', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { 
      description, 
      sessionId, 
      subject: manualSubject, // User-provided subject (optional)
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion,
      provider,
      userId = 'anonymous',
      model = 'gpt-4'
    } = req.body;

    // Validate input
    if (!description || description.length < 10) {
      return res.status(400).json({
        error: 'Invalid description',
        message: 'Process description must be at least 10 characters'
      });
    }

    // Validate credentials based on provider
    if (provider === 'bedrock') {
      if (!awsAccessKeyId || !awsSecretAccessKey) {
        return res.status(400).json({
          error: 'Missing AWS credentials',
          message: 'AWS Access Key ID and Secret Access Key are required for Bedrock'
        });
      }
    } else if (!apiKey) {
      return res.status(400).json({
        error: 'Missing API key',
        message: 'OpenAI API key is required'
      });
    }

    // Scrub PII from input
    const scrubbedInput = await piiService.scrubAndStore(description, sessionId || 'temp', userId);

    // Create or load session
    let session: Session;
    let isNewSession = false;

    if (sessionId) {
      const existingSession = await sessionStorage.loadSession(sessionId);
      if (!existingSession) {
        return res.status(404).json({
          error: 'Session not found',
          sessionId
        });
      }
      session = existingSession;
    } else {
      // Create new session
      isNewSession = true;
      session = {
        sessionId: uuidv4(),
        initiativeId: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        modelUsed: model,
        conversations: []
      };
    }

    // Determine LLM provider
    const llmProvider = provider || (model.startsWith('anthropic.claude') ? 'bedrock' : 'openai');

    // Determine subject: use manual subject if provided, otherwise auto-extract
    let subject: string | undefined = manualSubject;
    
    if (!subject) {
      // Auto-extract subject from process description
      try {
        subject = await subjectExtractionService.extractSubject(
          scrubbedInput.scrubbedText,
          {
            provider: llmProvider,
            model,
            apiKey,
            awsAccessKeyId,
            awsSecretAccessKey,
            awsSessionToken,
            awsRegion
          }
        );
        console.log(`Auto-extracted subject: ${subject}`);
      } catch (error) {
        console.warn('Failed to extract subject, continuing without it:', error);
      }
    } else {
      console.log(`Using manual subject: ${subject}`);
    }

    // Create conversation
    const conversation: Conversation = {
      conversationId: uuidv4(),
      timestamp: new Date().toISOString(),
      processDescription: scrubbedInput.scrubbedText,
      subject,
      clarificationQA: []
    };
    session.conversations.push(conversation);

    // Store subject at session level too
    if (subject && !session.subject) {
      session.subject = subject;
    }

    // Log user input
    await auditLogService.logUserInput(
      session.sessionId,
      userId,
      description,
      scrubbedInput.scrubbedText,
      scrubbedInput.hasPII,
      {
        modelVersion: model,
        llmProvider,
        latencyMs: Date.now() - startTime,
        subject
      }
    );

    // Save session
    await sessionStorage.saveSession(session);
    
    // Invalidate analytics cache on new session
    analyticsService.invalidateCache();

    // Perform classification
    const classificationStartTime = Date.now();
    const classificationResult = await classificationService.classifyWithRouting({
      processDescription: scrubbedInput.scrubbedText,
      conversationHistory: [],
      model,
      provider: llmProvider,
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion
    });

    const classificationLatency = Date.now() - classificationStartTime;

    // Check if clarification is needed
    if (classificationResult.action === 'clarify') {
      // Generate clarification questions
      const clarificationResponse = await clarificationService.generateQuestions({
        processDescription: scrubbedInput.scrubbedText,
        classification: classificationResult.result,
        conversationHistory: [],
        provider: llmProvider,
        apiKey,
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken,
        awsRegion,
        model
      });

      const questionTexts = clarificationResponse.questions.map(q => q.question);

      // If no questions were generated, proceed to classification instead
      if (questionTexts.length === 0) {
        console.log('No clarification questions generated, proceeding to classification');
        // Continue to classification below
      } else {
        // Scrub PII from questions
        const scrubbedQuestions = await Promise.all(
          questionTexts.map(q => piiService.scrubOnly(q))
        );

        // Log clarification
        await auditLogService.logClarification(
          session.sessionId,
          userId,
          questionTexts,
          [],
          scrubbedQuestions.map(sq => sq.scrubbedText),
          [],
          scrubbedQuestions.some(sq => sq.hasPII),
          undefined,
          undefined,
          {
            modelVersion: model,
            llmProvider,
            latencyMs: classificationLatency,
            action: 'clarify'
          }
        );

        return res.json({
          sessionId: session.sessionId,
          clarificationQuestions: scrubbedQuestions.map(sq => sq.scrubbedText),
          totalQuestions: questionTexts.length,
          responseTime: Date.now() - startTime
        });
      }
    }

    // Check if manual review is needed
    if (classificationResult.action === 'manual_review') {
      session.status = 'manual_review';
      await sessionStorage.saveSession(session);
      analyticsService.invalidateCache();

      return res.json({
        sessionId: session.sessionId,
        classification: classificationResult.result,
        requiresManualReview: true,
        message: 'Classification confidence is too low. Manual review required.',
        responseTime: Date.now() - startTime
      });
    }

    // Auto-classify: Try to extract attributes and apply decision matrix
    let extractedAttributes = null;
    let decisionMatrixEvaluation = null;
    let finalClassification = classificationResult.result;
    let decisionMatrix = null;

    try {
      extractedAttributes = await classificationService.extractAttributes(
        scrubbedInput.scrubbedText,
        [],
        {
          processDescription: scrubbedInput.scrubbedText,
          conversationHistory: [],
          model,
          provider: llmProvider,
          apiKey,
          awsAccessKeyId,
          awsSecretAccessKey,
          awsSessionToken,
          awsRegion
        }
      );

      // Convert extracted attributes to simple key-value format
      const attributeValues: { [key: string]: any } = {};
      for (const [key, value] of Object.entries(extractedAttributes)) {
        attributeValues[key] = value.value;
      }

      // Get decision matrix and evaluate
      decisionMatrix = await versionedStorage.getLatestDecisionMatrix();

      if (decisionMatrix) {
        decisionMatrixEvaluation = evaluatorService.evaluateMatrix(
          decisionMatrix,
          {
            ...classificationResult.result,
            timestamp: new Date().toISOString(),
            modelUsed: model,
            llmProvider
          },
          attributeValues
        );

        finalClassification = decisionMatrixEvaluation.finalClassification;
      }
    } catch (attrError) {
      // Attribute extraction failed, but we can still return the classification
      console.warn('Attribute extraction failed, using classification without decision matrix:', attrError);
    }

    // Update session with classification
    const classificationToStore: Classification = {
      category: finalClassification.category,
      confidence: finalClassification.confidence,
      rationale: finalClassification.rationale,
      categoryProgression: finalClassification.categoryProgression,
      futureOpportunities: finalClassification.futureOpportunities,
      timestamp: new Date().toISOString(),
      modelUsed: model,
      llmProvider,
      decisionMatrixEvaluation: decisionMatrixEvaluation || undefined
    };
    
    session.classification = classificationToStore;
    session.status = 'completed';
    session.updatedAt = new Date().toISOString();
    await sessionStorage.saveSession(session);
    analyticsService.invalidateCache();

    // Log classification with decision matrix info
    await auditLogService.logClassification(
      session.sessionId,
      userId,
      finalClassification,
      decisionMatrix?.version || null,
      decisionMatrixEvaluation,
      'Classification prompt',
      JSON.stringify(classificationResult.result),
      false,
      {
        modelVersion: model,
        llmProvider,
        latencyMs: Date.now() - startTime,
        decisionMatrixVersion: decisionMatrix?.version,
        action: 'auto_classify'
      }
    );

    res.json({
      sessionId: session.sessionId,
      classification: classificationToStore,
      decisionMatrixEvaluation,
      extractedAttributes,
      responseTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Error submitting process:', error);
    res.status(500).json({
      error: 'Failed to submit process',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/process/classify
 * Classify a process with full workflow orchestration
 * Requirements: 2.1, 2.2, 3.1, 3.4, 5.2, 20.1, 21.2, 21.3, 21.4
 */
router.post('/classify', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const {
      sessionId,
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion,
      provider,
      userId = 'anonymous',
      model = 'gpt-4',
      forceClassify = false
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required'
      });
    }

    // Validate credentials based on provider
    const llmProvider = provider || (model.startsWith('anthropic.claude') ? 'bedrock' : 'openai');
    if (llmProvider === 'bedrock') {
      if (!awsAccessKeyId || !awsSecretAccessKey) {
        return res.status(400).json({
          error: 'Missing AWS credentials',
          message: 'AWS Access Key ID and Secret Access Key are required for Bedrock'
        });
      }
    } else if (!apiKey) {
      return res.status(400).json({
        error: 'Missing API key',
        message: 'OpenAI API key is required'
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

    // Get the latest conversation
    const latestConversation = session.conversations[session.conversations.length - 1];
    if (!latestConversation) {
      return res.status(400).json({
        error: 'No conversation found',
        message: 'Please submit a process description first'
      });
    }

    // Build conversation history
    const conversationHistory = latestConversation.clarificationQA;

    // Perform classification
    const classificationStartTime = Date.now();
    const classificationResult = await classificationService.classifyWithRouting({
      processDescription: latestConversation.processDescription,
      conversationHistory,
      model,
      provider: llmProvider,
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion
    });

    const classificationLatency = Date.now() - classificationStartTime;

    // Check if clarification is needed (unless force classify is enabled)
    if (classificationResult.action === 'clarify' && !forceClassify) {
      // Generate clarification questions
      const clarificationResponse = await clarificationService.generateQuestions({
        processDescription: latestConversation.processDescription,
        classification: classificationResult.result,
        conversationHistory,
        provider: llmProvider,
        apiKey,
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken,
        awsRegion,
        model
      });

      const questionTexts = clarificationResponse.questions.map(q => q.question);

      // Scrub PII from questions
      const scrubbedQuestions = await Promise.all(
        questionTexts.map(q => piiService.scrubOnly(q))
      );

      // Log clarification
      await auditLogService.logClarification(
        sessionId,
        userId,
        questionTexts,
        [],
        scrubbedQuestions.map(sq => sq.scrubbedText),
        [],
        scrubbedQuestions.some(sq => sq.hasPII),
        undefined,
        undefined,
        {
          modelVersion: model,
          llmProvider,
          latencyMs: classificationLatency,
          action: 'clarify'
        }
      );

      return res.json({
        action: 'clarify',
        questions: scrubbedQuestions.map(sq => sq.scrubbedText),
        classification: classificationResult.result,
        sessionId
      });
    }

    // Check if manual review is needed (unless force classify is enabled)
    if (classificationResult.action === 'manual_review' && !forceClassify) {
      session.status = 'manual_review';
      await sessionStorage.saveSession(session);
      analyticsService.invalidateCache();

      return res.json({
        action: 'manual_review',
        classification: classificationResult.result,
        message: 'Classification confidence is too low. Manual review required.',
        sessionId
      });
    }

    // Auto-classify: Try to extract attributes and apply decision matrix
    let extractedAttributes = null;
    let decisionMatrixEvaluation = null;
    let finalClassification = classificationResult.result;
    let decisionMatrix = null;

    try {
      extractedAttributes = await classificationService.extractAttributes(
        latestConversation.processDescription,
        conversationHistory,
        {
          processDescription: latestConversation.processDescription,
          conversationHistory,
          model,
          provider: llmProvider,
          apiKey,
          awsAccessKeyId,
          awsSecretAccessKey,
          awsSessionToken,
          awsRegion
        }
      );

      // Convert extracted attributes to simple key-value format
      const attributeValues: { [key: string]: any } = {};
      for (const [key, value] of Object.entries(extractedAttributes)) {
        attributeValues[key] = value.value;
      }

      // Get decision matrix and evaluate
      decisionMatrix = await versionedStorage.getLatestDecisionMatrix();

      if (decisionMatrix) {
        decisionMatrixEvaluation = evaluatorService.evaluateMatrix(
          decisionMatrix,
          {
            ...classificationResult.result,
            timestamp: new Date().toISOString(),
            modelUsed: model,
            llmProvider
          },
          attributeValues
        );

        finalClassification = decisionMatrixEvaluation.finalClassification;
      }
    } catch (attrError) {
      // Attribute extraction failed, but we can still return the classification
      console.warn('Attribute extraction failed, using classification without decision matrix:', attrError);
    }

    // Update session with classification
    const classificationToStore: Classification = {
      category: finalClassification.category,
      confidence: finalClassification.confidence,
      rationale: finalClassification.rationale,
      categoryProgression: finalClassification.categoryProgression,
      futureOpportunities: finalClassification.futureOpportunities,
      timestamp: new Date().toISOString(),
      modelUsed: model,
      llmProvider,
      decisionMatrixEvaluation: decisionMatrixEvaluation || undefined
    };
    
    session.classification = classificationToStore;
    session.status = 'completed';
    session.updatedAt = new Date().toISOString();
    await sessionStorage.saveSession(session);
    analyticsService.invalidateCache();

    // Log classification with decision matrix info
    await auditLogService.logClassification(
      sessionId,
      userId,
      finalClassification,
      decisionMatrix?.version || null,
      decisionMatrixEvaluation,
      'Classification prompt', // In real implementation, include actual prompt
      JSON.stringify(classificationResult.result),
      false, // PII already scrubbed in input
      {
        modelVersion: model,
        llmProvider,
        latencyMs: Date.now() - startTime,
        decisionMatrixVersion: decisionMatrix?.version,
        action: forceClassify ? 'force_classify' : 'auto_classify',
        interviewSkipped: forceClassify,
        questionsAsked: conversationHistory.length
      }
    );

    res.json({
      action: 'auto_classify',
      classification: classificationToStore,
      decisionMatrixEvaluation,
      extractedAttributes,
      sessionId,
      responseTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Error classifying process:', error);
    res.status(500).json({
      error: 'Failed to classify process',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/process/clarify
 * Submit answers to clarification questions
 * Requirements: 2.4, 10.3, 10.4, 21.2
 */
router.post('/clarify', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const {
      sessionId,
      answers,
      questions,
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion,
      provider,
      userId = 'anonymous',
      model = 'gpt-4'
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required'
      });
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        error: 'Invalid answers',
        message: 'Answers array is required'
      });
    }

    // Validate credentials based on provider
    const llmProvider = provider || (model.startsWith('anthropic.claude') ? 'bedrock' : 'openai');
    if (llmProvider === 'bedrock') {
      if (!awsAccessKeyId || !awsSecretAccessKey) {
        return res.status(400).json({
          error: 'Missing AWS credentials',
          message: 'AWS Access Key ID and Secret Access Key are required for Bedrock'
        });
      }
    } else if (!apiKey) {
      return res.status(400).json({
        error: 'Missing API key',
        message: 'OpenAI API key is required'
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

    // Get the latest conversation
    const latestConversation = session.conversations[session.conversations.length - 1];
    if (!latestConversation) {
      return res.status(400).json({
        error: 'No conversation found',
        message: 'No active conversation in this session'
      });
    }

    // Scrub PII from answers
    const scrubbedAnswers = await Promise.all(
      answers.map(a => piiService.scrubAndStore(a, sessionId, userId))
    );

    // Add Q&A to conversation
    for (let i = 0; i < answers.length; i++) {
      // Use provided questions if available, otherwise use placeholder
      const question = questions && questions[i] ? questions[i] : `Clarification ${latestConversation.clarificationQA.length + 1}`;
      
      latestConversation.clarificationQA.push({
        question,
        answer: scrubbedAnswers[i].scrubbedText
      });
    }

    session.updatedAt = new Date().toISOString();
    await sessionStorage.saveSession(session);
    analyticsService.invalidateCache();

    // Log clarification responses
    await auditLogService.logClarification(
      sessionId,
      userId,
      [],
      answers,
      [],
      scrubbedAnswers.map(sa => sa.scrubbedText),
      scrubbedAnswers.some(sa => sa.hasPII),
      undefined,
      undefined,
      {
        answerCount: answers.length
      }
    );

    // Perform classification with updated conversation history
    const classificationStartTime = Date.now();
    const classificationResult = await classificationService.classifyWithRouting({
      processDescription: latestConversation.processDescription,
      conversationHistory: latestConversation.clarificationQA,
      model,
      provider: llmProvider,
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion
    });

    const classificationLatency = Date.now() - classificationStartTime;

    // Check if more clarification is needed
    if (classificationResult.action === 'clarify') {
      const clarificationResponse = await clarificationService.generateQuestions({
        processDescription: latestConversation.processDescription,
        classification: classificationResult.result,
        conversationHistory: latestConversation.clarificationQA,
        provider: llmProvider,
        apiKey,
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken,
        awsRegion,
        model
      });

      const questionTexts = clarificationResponse.questions.map(q => q.question);
      const scrubbedQuestions = await Promise.all(
        questionTexts.map(q => piiService.scrubOnly(q))
      );

      await auditLogService.logClarification(
        sessionId,
        userId,
        questionTexts,
        [],
        scrubbedQuestions.map(sq => sq.scrubbedText),
        [],
        scrubbedQuestions.some(sq => sq.hasPII),
        undefined,
        undefined,
        {
          modelVersion: model,
          llmProvider,
          latencyMs: classificationLatency,
          action: 'clarify'
        }
      );

      return res.json({
        clarificationQuestions: scrubbedQuestions.map(sq => sq.scrubbedText),
        totalQuestions: questionTexts.length,
        sessionId
      });
    }

    // Check if manual review is needed
    if (classificationResult.action === 'manual_review') {
      session.status = 'manual_review';
      await sessionStorage.saveSession(session);
      analyticsService.invalidateCache();

      return res.json({
        classification: classificationResult.result,
        requiresManualReview: true,
        message: 'Classification confidence is too low. Manual review required.',
        sessionId
      });
    }

    // Auto-classify
    const extractedAttributes = await classificationService.extractAttributes(
      latestConversation.processDescription,
      latestConversation.clarificationQA,
      {
        processDescription: latestConversation.processDescription,
        conversationHistory: latestConversation.clarificationQA,
        model,
        provider: llmProvider,
        apiKey,
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken,
        awsRegion
      }
    );

    const attributeValues: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(extractedAttributes)) {
      attributeValues[key] = value.value;
    }

    const decisionMatrix = await versionedStorage.getLatestDecisionMatrix();
    let decisionMatrixEvaluation = null;
    let finalClassification = classificationResult.result;

    if (decisionMatrix) {
      decisionMatrixEvaluation = evaluatorService.evaluateMatrix(
        decisionMatrix,
        {
          ...classificationResult.result,
          timestamp: new Date().toISOString(),
          modelUsed: model,
          llmProvider
        },
        attributeValues
      );

      finalClassification = decisionMatrixEvaluation.finalClassification;
    }

    const classificationToStore: Classification = {
      category: finalClassification.category,
      confidence: finalClassification.confidence,
      rationale: finalClassification.rationale,
      categoryProgression: finalClassification.categoryProgression,
      futureOpportunities: finalClassification.futureOpportunities,
      timestamp: new Date().toISOString(),
      modelUsed: model,
      llmProvider,
      decisionMatrixEvaluation: decisionMatrixEvaluation || undefined
    };
    
    session.classification = classificationToStore;
    session.status = 'completed';
    session.updatedAt = new Date().toISOString();
    await sessionStorage.saveSession(session);
    analyticsService.invalidateCache();

    await auditLogService.logClassification(
      sessionId,
      userId,
      finalClassification,
      decisionMatrix?.version || null,
      decisionMatrixEvaluation,
      'Classification prompt',
      JSON.stringify(classificationResult.result),
      false,
      {
        modelVersion: model,
        llmProvider,
        latencyMs: Date.now() - startTime,
        decisionMatrixVersion: decisionMatrix?.version,
        action: 'auto_classify'
      }
    );

    res.json({
      classification: classificationToStore,
      decisionMatrixEvaluation,
      extractedAttributes,
      sessionId,
      responseTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Error recording clarification:', error);
    res.status(500).json({
      error: 'Failed to record clarification',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
