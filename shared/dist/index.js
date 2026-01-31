"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilteredMetricsSchema = exports.FilterOptionsSchema = exports.SessionListResponseSchema = exports.SessionListItemSchema = exports.PaginationParamsSchema = exports.SessionFiltersSchema = exports.AnalyticsMetricsSchema = exports.PIIMappingSchema = exports.AudioTranscriptionSchema = exports.LearningAnalysisSchema = exports.LearningSuggestionSchema = exports.DecisionMatrixSchema = exports.AttributeSchema = exports.RuleSchema = exports.RuleActionSchema = exports.ConditionSchema = exports.AuditLogEntrySchema = exports.SessionSchema = exports.AdminReviewSchema = exports.UserRatingSchema = exports.FeedbackSchema = exports.ClassificationSchema = exports.DecisionMatrixEvaluationSchema = exports.ConversationSchema = exports.TransformationCategorySchema = void 0;
// Shared TypeScript types for CatalAIst
const zod_1 = require("zod");
// Zod Validation Schemas
exports.TransformationCategorySchema = zod_1.z.enum([
    'Eliminate',
    'Simplify',
    'Digitise',
    'RPA',
    'AI Agent',
    'Agentic AI'
]);
exports.ConversationSchema = zod_1.z.object({
    conversationId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    processDescription: zod_1.z.string().min(10),
    subject: zod_1.z.string().optional(),
    clarificationQA: zod_1.z.array(zod_1.z.object({
        question: zod_1.z.string(),
        answer: zod_1.z.string()
    }))
});
exports.DecisionMatrixEvaluationSchema = zod_1.z.lazy(() => zod_1.z.object({
    matrixVersion: zod_1.z.string(),
    originalClassification: exports.ClassificationSchema,
    extractedAttributes: zod_1.z.record(zod_1.z.any()),
    triggeredRules: zod_1.z.array(zod_1.z.object({
        ruleId: zod_1.z.string(),
        ruleName: zod_1.z.string(),
        action: exports.RuleActionSchema
    })),
    finalClassification: exports.ClassificationSchema,
    overridden: zod_1.z.boolean()
}));
exports.ClassificationSchema = zod_1.z.object({
    category: exports.TransformationCategorySchema,
    confidence: zod_1.z.number().min(0).max(1),
    rationale: zod_1.z.string(),
    categoryProgression: zod_1.z.string(),
    futureOpportunities: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    modelUsed: zod_1.z.string(),
    llmProvider: zod_1.z.string(),
    decisionMatrixEvaluation: exports.DecisionMatrixEvaluationSchema.optional()
});
exports.FeedbackSchema = zod_1.z.object({
    confirmed: zod_1.z.boolean(),
    correctedCategory: exports.TransformationCategorySchema.optional(),
    timestamp: zod_1.z.string().datetime()
});
exports.UserRatingSchema = zod_1.z.object({
    rating: zod_1.z.enum(['up', 'down']),
    comments: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime()
});
exports.AdminReviewSchema = zod_1.z.object({
    reviewed: zod_1.z.boolean(),
    reviewedBy: zod_1.z.string().optional(),
    reviewedAt: zod_1.z.string().datetime().optional(),
    approved: zod_1.z.boolean().optional(),
    correctedCategory: exports.TransformationCategorySchema.optional(),
    reviewNotes: zod_1.z.string().optional()
});
exports.SessionSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    initiativeId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    status: zod_1.z.enum(['active', 'completed', 'manual_review', 'pending_admin_review']),
    modelUsed: zod_1.z.string(),
    subject: zod_1.z.string().optional(),
    conversations: zod_1.z.array(exports.ConversationSchema),
    classification: exports.ClassificationSchema.optional(),
    feedback: exports.FeedbackSchema.optional(),
    userRating: exports.UserRatingSchema.optional(),
    adminReview: exports.AdminReviewSchema.optional()
});
exports.AuditLogEntrySchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    eventType: zod_1.z.enum(['input', 'clarification', 'classification', 'feedback', 'rating']),
    userId: zod_1.z.string(),
    data: zod_1.z.any(),
    modelPrompt: zod_1.z.string().optional(),
    modelResponse: zod_1.z.string().optional(),
    piiScrubbed: zod_1.z.boolean(),
    metadata: zod_1.z.object({
        modelVersion: zod_1.z.string().optional(),
        latencyMs: zod_1.z.number().optional(),
        llmProvider: zod_1.z.string().optional(),
        llmConfigId: zod_1.z.string().optional(),
        decisionMatrixVersion: zod_1.z.string().optional()
    })
});
exports.ConditionSchema = zod_1.z.object({
    attribute: zod_1.z.string(),
    operator: zod_1.z.enum(['==', '!=', '>', '<', '>=', '<=', 'in', 'not_in']),
    value: zod_1.z.any()
});
exports.RuleActionSchema = zod_1.z.object({
    type: zod_1.z.enum(['override', 'adjust_confidence', 'flag_review']),
    targetCategory: exports.TransformationCategorySchema.optional(),
    confidenceAdjustment: zod_1.z.number().optional(),
    rationale: zod_1.z.string()
});
exports.RuleSchema = zod_1.z.object({
    ruleId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    conditions: zod_1.z.array(exports.ConditionSchema),
    action: exports.RuleActionSchema,
    priority: zod_1.z.number().int().min(0),
    active: zod_1.z.boolean()
});
exports.AttributeSchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: zod_1.z.enum(['categorical', 'numeric', 'boolean']),
    possibleValues: zod_1.z.array(zod_1.z.string()).optional(),
    weight: zod_1.z.number().min(0).max(1),
    description: zod_1.z.string()
});
exports.DecisionMatrixSchema = zod_1.z.object({
    version: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    createdBy: zod_1.z.enum(['ai', 'admin']),
    description: zod_1.z.string(),
    attributes: zod_1.z.array(exports.AttributeSchema),
    rules: zod_1.z.array(exports.RuleSchema),
    active: zod_1.z.boolean()
});
exports.LearningSuggestionSchema = zod_1.z.object({
    suggestionId: zod_1.z.string().uuid(),
    createdAt: zod_1.z.string().datetime(),
    analysisId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['new_rule', 'modify_rule', 'adjust_weight', 'new_attribute']),
    status: zod_1.z.enum(['pending', 'approved', 'rejected', 'applied']),
    rationale: zod_1.z.string(),
    impactEstimate: zod_1.z.object({
        affectedCategories: zod_1.z.array(zod_1.z.string()),
        expectedImprovementPercent: zod_1.z.number().min(0).max(100),
        confidenceLevel: zod_1.z.number().min(0).max(1)
    }),
    suggestedChange: zod_1.z.object({
        newRule: exports.RuleSchema.optional(),
        ruleId: zod_1.z.string().uuid().optional(),
        modifiedRule: exports.RuleSchema.optional(),
        attributeName: zod_1.z.string().optional(),
        newWeight: zod_1.z.number().min(0).max(1).optional(),
        newAttribute: exports.AttributeSchema.optional()
    }),
    reviewedBy: zod_1.z.string().optional(),
    reviewedAt: zod_1.z.string().datetime().optional(),
    reviewNotes: zod_1.z.string().optional()
});
exports.LearningAnalysisSchema = zod_1.z.object({
    analysisId: zod_1.z.string().uuid(),
    triggeredBy: zod_1.z.enum(['automatic', 'manual']),
    triggeredAt: zod_1.z.string().datetime(),
    dataRange: zod_1.z.object({
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime(),
        totalSessions: zod_1.z.number().int().min(0)
    }),
    findings: zod_1.z.object({
        overallAgreementRate: zod_1.z.number().min(0).max(1),
        categoryAgreementRates: zod_1.z.record(zod_1.z.number().min(0).max(1)),
        commonMisclassifications: zod_1.z.array(zod_1.z.object({
            from: zod_1.z.string(),
            to: zod_1.z.string(),
            count: zod_1.z.number().int().min(0),
            examples: zod_1.z.array(zod_1.z.string().uuid())
        })),
        identifiedPatterns: zod_1.z.array(zod_1.z.string()),
        subjectConsistency: zod_1.z.array(zod_1.z.object({
            subject: zod_1.z.string(),
            totalSessions: zod_1.z.number().int().min(0),
            agreementRate: zod_1.z.number().min(0).max(1),
            commonCategory: zod_1.z.string(),
            categoryDistribution: zod_1.z.record(zod_1.z.number().int().min(0))
        })).optional()
    }),
    suggestions: zod_1.z.array(zod_1.z.string().uuid())
});
exports.AudioTranscriptionSchema = zod_1.z.object({
    transcriptionId: zod_1.z.string().uuid(),
    sessionId: zod_1.z.string().uuid(),
    audioFilePath: zod_1.z.string(),
    transcription: zod_1.z.string(),
    durationSeconds: zod_1.z.number().min(0),
    timestamp: zod_1.z.string().datetime()
});
exports.PIIMappingSchema = zod_1.z.object({
    mappingId: zod_1.z.string().uuid(),
    sessionId: zod_1.z.string().uuid(),
    mappings: zod_1.z.array(zod_1.z.object({
        token: zod_1.z.string(),
        originalValue: zod_1.z.string(),
        type: zod_1.z.enum(['email', 'phone', 'ssn', 'credit_card'])
    })),
    createdAt: zod_1.z.string().datetime(),
    accessLog: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        timestamp: zod_1.z.string(),
        purpose: zod_1.z.string()
    }))
});
exports.AnalyticsMetricsSchema = zod_1.z.object({
    metricId: zod_1.z.string().uuid(),
    calculatedAt: zod_1.z.string().datetime(),
    overallAgreementRate: zod_1.z.number().min(0).max(1),
    agreementRateByCategory: zod_1.z.record(zod_1.z.number().min(0).max(1)),
    userSatisfactionRate: zod_1.z.number().min(0).max(1),
    totalSessions: zod_1.z.number().int().min(0),
    averageClassificationTimeMs: zod_1.z.number().min(0),
    alertTriggered: zod_1.z.boolean()
});
// Enhanced Analytics Schemas
exports.SessionFiltersSchema = zod_1.z.object({
    dateFrom: zod_1.z.string().optional().refine((val) => {
        if (!val)
            return true;
        // Accept both ISO datetime and date-only formats
        return !isNaN(Date.parse(val));
    }, { message: 'Invalid date format' }),
    dateTo: zod_1.z.string().optional().refine((val) => {
        if (!val)
            return true;
        // Accept both ISO datetime and date-only formats
        return !isNaN(Date.parse(val));
    }, { message: 'Invalid date format' }),
    category: exports.TransformationCategorySchema.optional(),
    subject: zod_1.z.string().optional(),
    model: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'completed', 'manual_review']).optional(),
    searchText: zod_1.z.string().max(500).optional()
});
exports.PaginationParamsSchema = zod_1.z.object({
    page: zod_1.z.number().int().min(1),
    limit: zod_1.z.number().int().min(1).max(100)
});
exports.SessionListItemSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    createdAt: zod_1.z.string().datetime(),
    subject: zod_1.z.string().optional(),
    category: exports.TransformationCategorySchema.optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    status: zod_1.z.string(),
    modelUsed: zod_1.z.string(),
    feedbackConfirmed: zod_1.z.boolean().optional(),
    userRating: zod_1.z.enum(['up', 'down']).optional(),
    requiresAttention: zod_1.z.boolean(),
    triggeredRulesCount: zod_1.z.number().int().min(0).optional(),
    hasDecisionMatrix: zod_1.z.boolean().optional()
});
exports.SessionListResponseSchema = zod_1.z.object({
    sessions: zod_1.z.array(exports.SessionListItemSchema),
    total: zod_1.z.number().int().min(0),
    page: zod_1.z.number().int().min(1),
    limit: zod_1.z.number().int().min(1),
    totalPages: zod_1.z.number().int().min(0)
});
exports.FilterOptionsSchema = zod_1.z.object({
    subjects: zod_1.z.array(zod_1.z.string()),
    models: zod_1.z.array(zod_1.z.string()),
    categories: zod_1.z.array(exports.TransformationCategorySchema),
    statuses: zod_1.z.array(zod_1.z.string())
});
exports.FilteredMetricsSchema = zod_1.z.object({
    totalCount: zod_1.z.number().int().min(0),
    averageConfidence: zod_1.z.number().min(0).max(1),
    agreementRate: zod_1.z.number().min(0).max(1),
    categoryDistribution: zod_1.z.record(zod_1.z.number().int().min(0))
});
// Export validation utilities
__exportStar(require("./validation"), exports);
// Export voice types
__exportStar(require("./voice.types"), exports);
