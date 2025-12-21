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
import { Session, Conversation, Classification } from '../types';
import { analyticsService } from './analytics.routes';
import { AuthRequest } from '../middleware/auth.middleware';

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
      useRegionalInference,
      regionalInferenceEndpoint,
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

    // Perform classification (with LLM data for audit)
    const classificationStartTime = Date.now();
    const classificationResult = await classificationService.classifyWithRoutingAndLLMData({
      processDescription: scrubbedInput.scrubbedText,
      conversationHistory: [],
      model,
      provider: llmProvider,
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion,
      useRegionalInference,
      regionalInferenceEndpoint
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
        useRegionalInference,
        regionalInferenceEndpoint,
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
          awsRegion,
          useRegionalInference,
          regionalInferenceEndpoint
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
    
    // Determine session status based on user role
    // Regular users (profile type) get pending_admin_review status (blind evaluation)
    // Admins get completed status (they can see results immediately)
    const authReq = req as AuthRequest;
    const userRole = authReq.user?.role || 'user';
    session.status = userRole === 'admin' ? 'completed' : 'pending_admin_review';
    
    session.updatedAt = new Date().toISOString();
    await sessionStorage.saveSession(session);
    analyticsService.invalidateCache();

    // Log classification with decision matrix info and actual LLM data
    await auditLogService.logClassification(
      session.sessionId,
      userId,
      finalClassification,
      decisionMatrix?.version || null,
      decisionMatrixEvaluation,
      classificationResult.llmPrompt,
      classificationResult.llmResponse,
      false,
      {
        modelVersion: model,
        llmProvider,
        latencyMs: Date.now() - startTime,
        decisionMatrixVersion: decisionMatrix?.version,
        action: 'auto_classify',
        userRole
      }
    );

    // For regular users, don't return the classification (blind evaluation)
    // For admins, return the full classification
    if (userRole === 'admin') {
      res.json({
        sessionId: session.sessionId,
        classification: classificationToStore,
        decisionMatrixEvaluation,
        extractedAttributes,
        responseTime: Date.now() - startTime
      });
    } else {
      // Regular users get a thank you message without seeing the classification
      res.json({
        sessionId: session.sessionId,
        message: 'Thank you for your time. Your submission has been recorded and will be reviewed.',
        submitted: true,
        responseTime: Date.now() - startTime
      });
    }
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
      useRegionalInference,
      regionalInferenceEndpoint,
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

    // Perform classification (with LLM data for audit)
    const classificationStartTime = Date.now();
    const classificationResult = await classificationService.classifyWithRoutingAndLLMData({
      processDescription: latestConversation.processDescription,
      conversationHistory,
      model,
      provider: llmProvider,
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion,
      useRegionalInference,
      regionalInferenceEndpoint
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
        useRegionalInference,
        regionalInferenceEndpoint,
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
    
    // Determine session status based on user role (blind evaluation for regular users)
    const authReq = req as AuthRequest;
    const userRole = authReq.user?.role || 'user';
    session.status = userRole === 'admin' ? 'completed' : 'pending_admin_review';
    
    session.updatedAt = new Date().toISOString();
    await sessionStorage.saveSession(session);
    analyticsService.invalidateCache();

    // Log classification with decision matrix info and actual LLM data
    await auditLogService.logClassification(
      sessionId,
      userId,
      finalClassification,
      decisionMatrix?.version || null,
      decisionMatrixEvaluation,
      classificationResult.llmPrompt,
      classificationResult.llmResponse,
      false, // PII already scrubbed in input
      {
        modelVersion: model,
        llmProvider,
        latencyMs: Date.now() - startTime,
        decisionMatrixVersion: decisionMatrix?.version,
        action: forceClassify ? 'force_classify' : 'auto_classify',
        interviewSkipped: forceClassify,
        questionsAsked: conversationHistory.length,
        userRole
      }
    );

    // Return different responses based on user role
    if (userRole === 'admin') {
      res.json({
        action: 'auto_classify',
        classification: classificationToStore,
        decisionMatrixEvaluation,
        extractedAttributes,
        sessionId,
        responseTime: Date.now() - startTime
      });
    } else {
      // Regular users get a thank you message without seeing the classification
      res.json({
        action: 'submitted',
        sessionId,
        message: 'Thank you for your time. Your submission has been recorded and will be reviewed.',
        submitted: true,
        responseTime: Date.now() - startTime
      });
    }
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

    // Note: Loop detection is handled later after we attempt to generate new questions
    // This allows the LLM to naturally stop asking questions when it has enough information

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
      questions || [],  // Questions provided in this request (may be empty)
      answers,
      questions || [],
      scrubbedAnswers.map(sa => sa.scrubbedText),
      scrubbedAnswers.some(sa => sa.hasPII),
      undefined,
      undefined,
      {
        answerCount: answers.length,
        questionCount: questions ? questions.length : 0,
        conversationLength: latestConversation.clarificationQA.length
      }
    );

    // Perform classification with updated conversation history (with LLM data for audit)
    const classificationStartTime = Date.now();
    const classificationResult = await classificationService.classifyWithRoutingAndLLMData({
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
      // Detect clarification loops by checking recent audit logs
      const recentLogs = await auditLogService.getLogsBySession(sessionId);
      const clarificationLogs = recentLogs.filter(log => log.eventType === 'clarification');
      
      // Check for loop: Look at question/answer patterns
      const recentClarifications = clarificationLogs.slice(-3);
      
      // Count how many times we asked questions but got no new questions back
      let emptyQuestionRounds = 0;
      
      for (const log of recentClarifications) {
        const questionsInLog = log.data.questions?.length || 0;
        const answersInLog = log.data.answers?.length || 0;
        
        if (questionsInLog === 0 && answersInLog > 0) {
          emptyQuestionRounds++;
        }
      }
      
      // Detect loop if we have 2+ rounds where answers were given but no questions asked
      // This indicates the LLM is stuck and not generating new questions
      if (emptyQuestionRounds >= 2) {
        console.warn(`[Clarification Loop Detected] Session ${sessionId}: Empty question rounds: ${emptyQuestionRounds}. Stopping clarification.`);
        
        // Force auto-classify to break the loop
        classificationResult.action = 'auto_classify';
        
        // Log the loop detection
        await auditLogService.log({
          sessionId,
          timestamp: new Date().toISOString(),
          eventType: 'clarification',
          userId,
          data: {
            loopDetected: true,
            reason: 'Multiple consecutive answer-only responses - LLM not generating questions',
            emptyQuestionRounds,
            action: 'forced_auto_classify'
          },
          piiScrubbed: false,
          metadata: {
            modelVersion: model,
            llmProvider
          }
        });
        
        // Continue to auto-classify section below
      } else {
        // Generate clarification questions
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

        // Check if clarification service says to stop (shouldClarify = false or empty questions)
        if (!clarificationResponse.shouldClarify || clarificationResponse.questions.length === 0) {
          console.log(`[Clarification] Stopping clarification: ${clarificationResponse.reason}`);
          
          // Log that we're stopping clarification
          await auditLogService.log({
            sessionId,
            timestamp: new Date().toISOString(),
            eventType: 'clarification',
            userId,
            data: {
              stoppedClarification: true,
              reason: clarificationResponse.reason,
              action: 'auto_classify'
            },
            piiScrubbed: false,
            metadata: {
              modelVersion: model,
              llmProvider
            }
          });
          
          // Force auto-classify
          classificationResult.action = 'auto_classify';
          // Continue to auto-classify section below
        } else {
          // We have valid questions to ask
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
      }
    }

    // Check if manual review is needed
    if (classificationResult.action === 'manual_review') {
      // Save classification to session even for manual review
      const classificationToStore: Classification = {
        category: classificationResult.result.category,
        confidence: classificationResult.result.confidence,
        rationale: classificationResult.result.rationale,
        categoryProgression: classificationResult.result.categoryProgression,
        futureOpportunities: classificationResult.result.futureOpportunities,
        timestamp: new Date().toISOString(),
        modelUsed: model,
        llmProvider
      };

      session.classification = classificationToStore;
      session.status = 'manual_review';
      await sessionStorage.saveSession(session);
      analyticsService.invalidateCache();

      // Log classification for manual review
      await auditLogService.logClassification(
        sessionId,
        userId,
        classificationToStore,
        null,
        null,
        'Manual review required',
        JSON.stringify(classificationResult.result),
        false,
        {
          modelVersion: model,
          llmProvider,
          action: 'manual_review'
        }
      );

      return res.json({
        classification: classificationToStore,
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
    
    // Determine session status based on user role (blind evaluation for regular users)
    const authReq = req as AuthRequest;
    const userRole = authReq.user?.role || 'user';
    session.status = userRole === 'admin' ? 'completed' : 'pending_admin_review';
    
    session.updatedAt = new Date().toISOString();
    await sessionStorage.saveSession(session);
    analyticsService.invalidateCache();

    await auditLogService.logClassification(
      sessionId,
      userId,
      finalClassification,
      decisionMatrix?.version || null,
      decisionMatrixEvaluation,
      classificationResult.llmPrompt,
      classificationResult.llmResponse,
      false,
      {
        modelVersion: model,
        llmProvider,
        latencyMs: Date.now() - startTime,
        decisionMatrixVersion: decisionMatrix?.version,
        action: 'auto_classify',
        userRole
      }
    );

    // Return different responses based on user role
    if (userRole === 'admin') {
      res.json({
        classification: classificationToStore,
        decisionMatrixEvaluation,
        extractedAttributes,
        sessionId,
        responseTime: Date.now() - startTime
      });
    } else {
      // Regular users get a thank you message without seeing the classification
      res.json({
        sessionId,
        message: 'Thank you for your time. Your submission has been recorded and will be reviewed.',
        submitted: true,
        responseTime: Date.now() - startTime
      });
    }
  } catch (error) {
    console.error('Error recording clarification:', error);
    res.status(500).json({
      error: 'Failed to record clarification',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/process/reclassify
 * Admin endpoint to reclassify a session with current decision matrix
 * Useful after updating decision matrix rules or prompts
 * Requirements: Admin authentication, existing session
 */
router.post('/reclassify', async (req: Request, res: Response) => {
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
      userId = 'admin',
      model,
      useOriginalModel = true, // Use the model from original classification
      reason = 'Admin reclassification' // Reason for reclassification
    } = req.body;

    // Validate session ID
    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required for reclassification'
      });
    }

    // Load existing session
    const session = await sessionStorage.loadSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        sessionId
      });
    }

    // Check if session has a conversation
    const latestConversation = session.conversations[session.conversations.length - 1];
    if (!latestConversation) {
      return res.status(400).json({
        error: 'No conversation found',
        message: 'Session has no conversation to reclassify'
      });
    }

    // Store original classification for comparison
    const originalClassification = session.classification;
    if (!originalClassification) {
      return res.status(400).json({
        error: 'No classification found',
        message: 'Session has not been classified yet'
      });
    }

    // Determine which model to use
    const modelToUse = useOriginalModel ? session.modelUsed : (model || session.modelUsed);
    const llmProvider = provider || originalClassification.llmProvider || 'openai';

    // Validate credentials based on provider
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

    console.log(`[Reclassify] Starting reclassification for session ${sessionId}`);
    console.log(`[Reclassify] Original: ${originalClassification.category} (${originalClassification.confidence})`);
    console.log(`[Reclassify] Using model: ${modelToUse}, provider: ${llmProvider}`);

    // Perform new classification with LLM data
    const classificationStartTime = Date.now();
    const classificationWithLLM = await classificationService.classifyWithLLMData({
      processDescription: latestConversation.processDescription,
      conversationHistory: latestConversation.clarificationQA,
      model: modelToUse,
      provider: llmProvider,
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion
    });

    const classificationLatency = Date.now() - classificationStartTime;
    const newClassificationResult = classificationWithLLM.result;

    // Extract attributes for decision matrix
    const extractedAttributes = await classificationService.extractAttributes(
      latestConversation.processDescription,
      latestConversation.clarificationQA,
      {
        processDescription: latestConversation.processDescription,
        conversationHistory: latestConversation.clarificationQA,
        model: modelToUse,
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

    // Apply current decision matrix
    const decisionMatrix = await versionedStorage.getLatestDecisionMatrix();
    let decisionMatrixEvaluation = null;
    let finalClassification = newClassificationResult;

    if (decisionMatrix) {
      decisionMatrixEvaluation = evaluatorService.evaluateMatrix(
        decisionMatrix,
        {
          ...newClassificationResult,
          timestamp: new Date().toISOString(),
          modelUsed: modelToUse,
          llmProvider
        },
        attributeValues
      );

      finalClassification = decisionMatrixEvaluation.finalClassification;
      
      console.log(`[Reclassify] After decision matrix: ${finalClassification.category} (${finalClassification.confidence})`);
    }

    // Create new classification object
    const newClassificationToStore: Classification = {
      category: finalClassification.category,
      confidence: finalClassification.confidence,
      rationale: finalClassification.rationale,
      categoryProgression: finalClassification.categoryProgression,
      futureOpportunities: finalClassification.futureOpportunities,
      timestamp: new Date().toISOString(),
      modelUsed: modelToUse,
      llmProvider,
      decisionMatrixEvaluation: decisionMatrixEvaluation || undefined
    };

    // Update session with new classification
    session.classification = newClassificationToStore;
    session.updatedAt = new Date().toISOString();
    await sessionStorage.saveSession(session);
    analyticsService.invalidateCache();

    // Log reclassification with comparison
    await auditLogService.log({
      sessionId,
      timestamp: new Date().toISOString(),
      eventType: 'classification',
      userId,
      data: {
        reclassification: true,
        reason,
        originalClassification: {
          category: originalClassification.category,
          confidence: originalClassification.confidence,
          matrixVersion: originalClassification.decisionMatrixEvaluation?.matrixVersion
        },
        newClassification: {
          category: newClassificationToStore.category,
          confidence: newClassificationToStore.confidence,
          matrixVersion: decisionMatrix?.version
        },
        changed: originalClassification.category !== newClassificationToStore.category,
        confidenceDelta: newClassificationToStore.confidence - originalClassification.confidence
      },
      modelPrompt: classificationWithLLM.llmPrompt,
      modelResponse: classificationWithLLM.llmResponse,
      piiScrubbed: false,
      metadata: {
        modelVersion: modelToUse,
        llmProvider,
        latencyMs: classificationLatency,
        decisionMatrixVersion: decisionMatrix?.version
      }
    });

    // Determine if classification changed
    const categoryChanged = originalClassification.category !== newClassificationToStore.category;
    const confidenceDelta = newClassificationToStore.confidence - originalClassification.confidence;

    console.log(`[Reclassify] Complete - Changed: ${categoryChanged}, Confidence Δ: ${confidenceDelta.toFixed(3)}`);

    res.json({
      sessionId,
      reclassified: true,
      original: {
        category: originalClassification.category,
        confidence: originalClassification.confidence,
        matrixVersion: originalClassification.decisionMatrixEvaluation?.matrixVersion || 'none'
      },
      new: {
        category: newClassificationToStore.category,
        confidence: newClassificationToStore.confidence,
        matrixVersion: decisionMatrix?.version || 'none'
      },
      changed: categoryChanged,
      confidenceDelta,
      decisionMatrixEvaluation,
      extractedAttributes,
      responseTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Error reclassifying session:', error);
    res.status(500).json({
      error: 'Failed to reclassify session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
