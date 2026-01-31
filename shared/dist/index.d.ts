import { z } from 'zod';
export type TransformationCategory = 'Eliminate' | 'Simplify' | 'Digitise' | 'RPA' | 'AI Agent' | 'Agentic AI';
export interface Session {
    sessionId: string;
    initiativeId: string;
    createdAt: string;
    updatedAt: string;
    status: 'active' | 'completed' | 'manual_review' | 'pending_admin_review';
    modelUsed: string;
    subject?: string;
    conversations: Conversation[];
    classification?: Classification;
    feedback?: Feedback;
    userRating?: UserRating;
    adminReview?: AdminReview;
}
export interface Conversation {
    conversationId: string;
    timestamp: string;
    processDescription: string;
    subject?: string;
    clarificationQA: Array<{
        question: string;
        answer: string;
    }>;
}
export interface Classification {
    category: TransformationCategory;
    confidence: number;
    rationale: string;
    categoryProgression: string;
    futureOpportunities: string;
    timestamp: string;
    modelUsed: string;
    llmProvider: string;
    decisionMatrixEvaluation?: DecisionMatrixEvaluation;
}
export interface Feedback {
    confirmed: boolean;
    correctedCategory?: TransformationCategory;
    timestamp: string;
}
export interface UserRating {
    rating: 'up' | 'down';
    comments?: string;
    timestamp: string;
}
export interface AdminReview {
    reviewed: boolean;
    reviewedBy?: string;
    reviewedAt?: string;
    approved?: boolean;
    correctedCategory?: TransformationCategory;
    reviewNotes?: string;
}
export interface AuditLogEntry {
    sessionId: string;
    timestamp: string;
    eventType: 'input' | 'clarification' | 'classification' | 'feedback' | 'rating' | 'model_list_success' | 'model_list_error';
    userId: string;
    data: any;
    modelPrompt?: string;
    modelResponse?: string;
    piiScrubbed: boolean;
    metadata?: {
        modelVersion?: string;
        latencyMs?: number;
        llmProvider?: string;
        llmConfigId?: string;
        decisionMatrixVersion?: string;
    };
}
export interface DecisionMatrix {
    version: string;
    createdAt: string;
    createdBy: 'ai' | 'admin';
    description: string;
    attributes: Attribute[];
    rules: Rule[];
    active: boolean;
}
export interface Attribute {
    name: string;
    type: 'categorical' | 'numeric' | 'boolean';
    possibleValues?: string[];
    weight: number;
    description: string;
}
export interface Rule {
    ruleId: string;
    name: string;
    description: string;
    conditions: Condition[];
    action: RuleAction;
    priority: number;
    active: boolean;
}
export interface Condition {
    attribute: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
    value: any;
}
export interface RuleAction {
    type: 'override' | 'adjust_confidence' | 'flag_review';
    targetCategory?: TransformationCategory;
    confidenceAdjustment?: number;
    rationale: string;
}
export interface DecisionMatrixEvaluation {
    matrixVersion: string;
    originalClassification: Classification;
    extractedAttributes: {
        [key: string]: any;
    };
    triggeredRules: Array<{
        ruleId: string;
        ruleName: string;
        action: RuleAction;
    }>;
    finalClassification: Classification;
    overridden: boolean;
}
export interface LearningSuggestion {
    suggestionId: string;
    createdAt: string;
    analysisId: string;
    type: 'new_rule' | 'modify_rule' | 'adjust_weight' | 'new_attribute';
    status: 'pending' | 'approved' | 'rejected' | 'applied';
    rationale: string;
    impactEstimate: {
        affectedCategories: string[];
        expectedImprovementPercent: number;
        confidenceLevel: number;
    };
    suggestedChange: {
        newRule?: Rule;
        ruleId?: string;
        modifiedRule?: Rule;
        attributeName?: string;
        newWeight?: number;
        newAttribute?: Attribute;
    };
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
}
export interface LearningAnalysis {
    analysisId: string;
    triggeredBy: 'automatic' | 'manual';
    triggeredAt: string;
    dataRange: {
        startDate: string;
        endDate: string;
        totalSessions: number;
    };
    findings: {
        overallAgreementRate: number;
        categoryAgreementRates: {
            [category: string]: number;
        };
        commonMisclassifications: Array<{
            from: string;
            to: string;
            count: number;
            examples: string[];
        }>;
        identifiedPatterns: string[];
        subjectConsistency?: Array<{
            subject: string;
            totalSessions: number;
            agreementRate: number;
            commonCategory: string;
            categoryDistribution: {
                [category: string]: number;
            };
        }>;
    };
    suggestions: string[];
}
export interface AudioTranscription {
    transcriptionId: string;
    sessionId: string;
    audioFilePath: string;
    transcription: string;
    durationSeconds: number;
    timestamp: string;
}
export interface PIIMapping {
    mappingId: string;
    sessionId: string;
    mappings: Array<{
        token: string;
        originalValue: string;
        type: 'email' | 'phone' | 'ssn' | 'credit_card';
    }>;
    createdAt: string;
    accessLog: Array<{
        userId: string;
        timestamp: string;
        purpose: string;
    }>;
}
export interface AnalyticsMetrics {
    metricId: string;
    calculatedAt: string;
    overallAgreementRate: number;
    agreementRateByCategory: {
        [category: string]: number;
    };
    userSatisfactionRate: number;
    totalSessions: number;
    averageClassificationTimeMs: number;
    alertTriggered: boolean;
}
export interface SessionFilters {
    dateFrom?: string;
    dateTo?: string;
    category?: TransformationCategory;
    subject?: string;
    model?: string;
    status?: 'active' | 'completed' | 'manual_review';
    searchText?: string;
}
export interface PaginationParams {
    page: number;
    limit: number;
}
export interface SessionListItem {
    sessionId: string;
    createdAt: string;
    subject?: string;
    category?: TransformationCategory;
    confidence?: number;
    status: string;
    modelUsed: string;
    feedbackConfirmed?: boolean;
    userRating?: 'up' | 'down';
    requiresAttention: boolean;
    triggeredRulesCount?: number;
    hasDecisionMatrix?: boolean;
}
export interface SessionListResponse {
    sessions: SessionListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface FilterOptions {
    subjects: string[];
    models: string[];
    categories: TransformationCategory[];
    statuses: string[];
}
export interface FilteredMetrics {
    totalCount: number;
    averageConfidence: number;
    agreementRate: number;
    categoryDistribution: {
        [category: string]: number;
    };
}
export declare const TransformationCategorySchema: z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>;
export declare const ConversationSchema: z.ZodObject<{
    conversationId: z.ZodString;
    timestamp: z.ZodString;
    processDescription: z.ZodString;
    subject: z.ZodOptional<z.ZodString>;
    clarificationQA: z.ZodArray<z.ZodObject<{
        question: z.ZodString;
        answer: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        answer: string;
        question: string;
    }, {
        answer: string;
        question: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
    timestamp: string;
    processDescription: string;
    clarificationQA: {
        answer: string;
        question: string;
    }[];
    subject?: string | undefined;
}, {
    conversationId: string;
    timestamp: string;
    processDescription: string;
    clarificationQA: {
        answer: string;
        question: string;
    }[];
    subject?: string | undefined;
}>;
export declare const DecisionMatrixEvaluationSchema: z.ZodType<DecisionMatrixEvaluation>;
export declare const ClassificationSchema: z.ZodObject<{
    category: z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>;
    confidence: z.ZodNumber;
    rationale: z.ZodString;
    categoryProgression: z.ZodString;
    futureOpportunities: z.ZodString;
    timestamp: z.ZodString;
    modelUsed: z.ZodString;
    llmProvider: z.ZodString;
    decisionMatrixEvaluation: z.ZodOptional<z.ZodType<DecisionMatrixEvaluation, z.ZodTypeDef, DecisionMatrixEvaluation>>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    category: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI";
    confidence: number;
    rationale: string;
    categoryProgression: string;
    futureOpportunities: string;
    modelUsed: string;
    llmProvider: string;
    decisionMatrixEvaluation?: DecisionMatrixEvaluation | undefined;
}, {
    timestamp: string;
    category: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI";
    confidence: number;
    rationale: string;
    categoryProgression: string;
    futureOpportunities: string;
    modelUsed: string;
    llmProvider: string;
    decisionMatrixEvaluation?: DecisionMatrixEvaluation | undefined;
}>;
export declare const FeedbackSchema: z.ZodObject<{
    confirmed: z.ZodBoolean;
    correctedCategory: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confirmed: boolean;
    timestamp: string;
    correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
}, {
    confirmed: boolean;
    timestamp: string;
    correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
}>;
export declare const UserRatingSchema: z.ZodObject<{
    rating: z.ZodEnum<["up", "down"]>;
    comments: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    rating: "up" | "down";
    timestamp: string;
    comments?: string | undefined;
}, {
    rating: "up" | "down";
    timestamp: string;
    comments?: string | undefined;
}>;
export declare const AdminReviewSchema: z.ZodObject<{
    reviewed: z.ZodBoolean;
    reviewedBy: z.ZodOptional<z.ZodString>;
    reviewedAt: z.ZodOptional<z.ZodString>;
    approved: z.ZodOptional<z.ZodBoolean>;
    correctedCategory: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
    reviewNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reviewed: boolean;
    correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    approved?: boolean | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: string | undefined;
    reviewNotes?: string | undefined;
}, {
    reviewed: boolean;
    correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    approved?: boolean | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: string | undefined;
    reviewNotes?: string | undefined;
}>;
export declare const SessionSchema: z.ZodObject<{
    sessionId: z.ZodString;
    initiativeId: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    status: z.ZodEnum<["active", "completed", "manual_review", "pending_admin_review"]>;
    modelUsed: z.ZodString;
    subject: z.ZodOptional<z.ZodString>;
    conversations: z.ZodArray<z.ZodObject<{
        conversationId: z.ZodString;
        timestamp: z.ZodString;
        processDescription: z.ZodString;
        subject: z.ZodOptional<z.ZodString>;
        clarificationQA: z.ZodArray<z.ZodObject<{
            question: z.ZodString;
            answer: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            answer: string;
            question: string;
        }, {
            answer: string;
            question: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        conversationId: string;
        timestamp: string;
        processDescription: string;
        clarificationQA: {
            answer: string;
            question: string;
        }[];
        subject?: string | undefined;
    }, {
        conversationId: string;
        timestamp: string;
        processDescription: string;
        clarificationQA: {
            answer: string;
            question: string;
        }[];
        subject?: string | undefined;
    }>, "many">;
    classification: z.ZodOptional<z.ZodObject<{
        category: z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>;
        confidence: z.ZodNumber;
        rationale: z.ZodString;
        categoryProgression: z.ZodString;
        futureOpportunities: z.ZodString;
        timestamp: z.ZodString;
        modelUsed: z.ZodString;
        llmProvider: z.ZodString;
        decisionMatrixEvaluation: z.ZodOptional<z.ZodType<DecisionMatrixEvaluation, z.ZodTypeDef, DecisionMatrixEvaluation>>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        category: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI";
        confidence: number;
        rationale: string;
        categoryProgression: string;
        futureOpportunities: string;
        modelUsed: string;
        llmProvider: string;
        decisionMatrixEvaluation?: DecisionMatrixEvaluation | undefined;
    }, {
        timestamp: string;
        category: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI";
        confidence: number;
        rationale: string;
        categoryProgression: string;
        futureOpportunities: string;
        modelUsed: string;
        llmProvider: string;
        decisionMatrixEvaluation?: DecisionMatrixEvaluation | undefined;
    }>>;
    feedback: z.ZodOptional<z.ZodObject<{
        confirmed: z.ZodBoolean;
        correctedCategory: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        confirmed: boolean;
        timestamp: string;
        correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    }, {
        confirmed: boolean;
        timestamp: string;
        correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    }>>;
    userRating: z.ZodOptional<z.ZodObject<{
        rating: z.ZodEnum<["up", "down"]>;
        comments: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        rating: "up" | "down";
        timestamp: string;
        comments?: string | undefined;
    }, {
        rating: "up" | "down";
        timestamp: string;
        comments?: string | undefined;
    }>>;
    adminReview: z.ZodOptional<z.ZodObject<{
        reviewed: z.ZodBoolean;
        reviewedBy: z.ZodOptional<z.ZodString>;
        reviewedAt: z.ZodOptional<z.ZodString>;
        approved: z.ZodOptional<z.ZodBoolean>;
        correctedCategory: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
        reviewNotes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        reviewed: boolean;
        correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        approved?: boolean | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: string | undefined;
        reviewNotes?: string | undefined;
    }, {
        reviewed: boolean;
        correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        approved?: boolean | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: string | undefined;
        reviewNotes?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    status: "active" | "completed" | "manual_review" | "pending_admin_review";
    initiativeId: string;
    modelUsed: string;
    createdAt: string;
    updatedAt: string;
    conversations: {
        conversationId: string;
        timestamp: string;
        processDescription: string;
        clarificationQA: {
            answer: string;
            question: string;
        }[];
        subject?: string | undefined;
    }[];
    classification?: {
        timestamp: string;
        category: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI";
        confidence: number;
        rationale: string;
        categoryProgression: string;
        futureOpportunities: string;
        modelUsed: string;
        llmProvider: string;
        decisionMatrixEvaluation?: DecisionMatrixEvaluation | undefined;
    } | undefined;
    feedback?: {
        confirmed: boolean;
        timestamp: string;
        correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    } | undefined;
    subject?: string | undefined;
    userRating?: {
        rating: "up" | "down";
        timestamp: string;
        comments?: string | undefined;
    } | undefined;
    adminReview?: {
        reviewed: boolean;
        correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        approved?: boolean | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: string | undefined;
        reviewNotes?: string | undefined;
    } | undefined;
}, {
    sessionId: string;
    status: "active" | "completed" | "manual_review" | "pending_admin_review";
    initiativeId: string;
    modelUsed: string;
    createdAt: string;
    updatedAt: string;
    conversations: {
        conversationId: string;
        timestamp: string;
        processDescription: string;
        clarificationQA: {
            answer: string;
            question: string;
        }[];
        subject?: string | undefined;
    }[];
    classification?: {
        timestamp: string;
        category: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI";
        confidence: number;
        rationale: string;
        categoryProgression: string;
        futureOpportunities: string;
        modelUsed: string;
        llmProvider: string;
        decisionMatrixEvaluation?: DecisionMatrixEvaluation | undefined;
    } | undefined;
    feedback?: {
        confirmed: boolean;
        timestamp: string;
        correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    } | undefined;
    subject?: string | undefined;
    userRating?: {
        rating: "up" | "down";
        timestamp: string;
        comments?: string | undefined;
    } | undefined;
    adminReview?: {
        reviewed: boolean;
        correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        approved?: boolean | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: string | undefined;
        reviewNotes?: string | undefined;
    } | undefined;
}>;
export declare const AuditLogEntrySchema: z.ZodObject<{
    sessionId: z.ZodString;
    timestamp: z.ZodString;
    eventType: z.ZodEnum<["input", "clarification", "classification", "feedback", "rating"]>;
    userId: z.ZodString;
    data: z.ZodAny;
    modelPrompt: z.ZodOptional<z.ZodString>;
    modelResponse: z.ZodOptional<z.ZodString>;
    piiScrubbed: z.ZodBoolean;
    metadata: z.ZodObject<{
        modelVersion: z.ZodOptional<z.ZodString>;
        latencyMs: z.ZodOptional<z.ZodNumber>;
        llmProvider: z.ZodOptional<z.ZodString>;
        llmConfigId: z.ZodOptional<z.ZodString>;
        decisionMatrixVersion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        llmProvider?: string | undefined;
        modelVersion?: string | undefined;
        latencyMs?: number | undefined;
        llmConfigId?: string | undefined;
        decisionMatrixVersion?: string | undefined;
    }, {
        llmProvider?: string | undefined;
        modelVersion?: string | undefined;
        latencyMs?: number | undefined;
        llmConfigId?: string | undefined;
        decisionMatrixVersion?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    timestamp: string;
    eventType: "rating" | "input" | "clarification" | "classification" | "feedback";
    userId: string;
    piiScrubbed: boolean;
    metadata: {
        llmProvider?: string | undefined;
        modelVersion?: string | undefined;
        latencyMs?: number | undefined;
        llmConfigId?: string | undefined;
        decisionMatrixVersion?: string | undefined;
    };
    data?: any;
    modelPrompt?: string | undefined;
    modelResponse?: string | undefined;
}, {
    sessionId: string;
    timestamp: string;
    eventType: "rating" | "input" | "clarification" | "classification" | "feedback";
    userId: string;
    piiScrubbed: boolean;
    metadata: {
        llmProvider?: string | undefined;
        modelVersion?: string | undefined;
        latencyMs?: number | undefined;
        llmConfigId?: string | undefined;
        decisionMatrixVersion?: string | undefined;
    };
    data?: any;
    modelPrompt?: string | undefined;
    modelResponse?: string | undefined;
}>;
export declare const ConditionSchema: z.ZodObject<{
    attribute: z.ZodString;
    operator: z.ZodEnum<["==", "!=", ">", "<", ">=", "<=", "in", "not_in"]>;
    value: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    attribute: string;
    operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
    value?: any;
}, {
    attribute: string;
    operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
    value?: any;
}>;
export declare const RuleActionSchema: z.ZodObject<{
    type: z.ZodEnum<["override", "adjust_confidence", "flag_review"]>;
    targetCategory: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
    confidenceAdjustment: z.ZodOptional<z.ZodNumber>;
    rationale: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "override" | "adjust_confidence" | "flag_review";
    rationale: string;
    targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    confidenceAdjustment?: number | undefined;
}, {
    type: "override" | "adjust_confidence" | "flag_review";
    rationale: string;
    targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    confidenceAdjustment?: number | undefined;
}>;
export declare const RuleSchema: z.ZodObject<{
    ruleId: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    conditions: z.ZodArray<z.ZodObject<{
        attribute: z.ZodString;
        operator: z.ZodEnum<["==", "!=", ">", "<", ">=", "<=", "in", "not_in"]>;
        value: z.ZodAny;
    }, "strip", z.ZodTypeAny, {
        attribute: string;
        operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
        value?: any;
    }, {
        attribute: string;
        operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
        value?: any;
    }>, "many">;
    action: z.ZodObject<{
        type: z.ZodEnum<["override", "adjust_confidence", "flag_review"]>;
        targetCategory: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
        confidenceAdjustment: z.ZodOptional<z.ZodNumber>;
        rationale: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "override" | "adjust_confidence" | "flag_review";
        rationale: string;
        targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        confidenceAdjustment?: number | undefined;
    }, {
        type: "override" | "adjust_confidence" | "flag_review";
        rationale: string;
        targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        confidenceAdjustment?: number | undefined;
    }>;
    priority: z.ZodNumber;
    active: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    description: string;
    active: boolean;
    ruleId: string;
    action: {
        type: "override" | "adjust_confidence" | "flag_review";
        rationale: string;
        targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        confidenceAdjustment?: number | undefined;
    };
    name: string;
    conditions: {
        attribute: string;
        operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
        value?: any;
    }[];
    priority: number;
}, {
    description: string;
    active: boolean;
    ruleId: string;
    action: {
        type: "override" | "adjust_confidence" | "flag_review";
        rationale: string;
        targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        confidenceAdjustment?: number | undefined;
    };
    name: string;
    conditions: {
        attribute: string;
        operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
        value?: any;
    }[];
    priority: number;
}>;
export declare const AttributeSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["categorical", "numeric", "boolean"]>;
    possibleValues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    weight: z.ZodNumber;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    type: "boolean" | "categorical" | "numeric";
    name: string;
    weight: number;
    possibleValues?: string[] | undefined;
}, {
    description: string;
    type: "boolean" | "categorical" | "numeric";
    name: string;
    weight: number;
    possibleValues?: string[] | undefined;
}>;
export declare const DecisionMatrixSchema: z.ZodObject<{
    version: z.ZodString;
    createdAt: z.ZodString;
    createdBy: z.ZodEnum<["ai", "admin"]>;
    description: z.ZodString;
    attributes: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodEnum<["categorical", "numeric", "boolean"]>;
        possibleValues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        weight: z.ZodNumber;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description: string;
        type: "boolean" | "categorical" | "numeric";
        name: string;
        weight: number;
        possibleValues?: string[] | undefined;
    }, {
        description: string;
        type: "boolean" | "categorical" | "numeric";
        name: string;
        weight: number;
        possibleValues?: string[] | undefined;
    }>, "many">;
    rules: z.ZodArray<z.ZodObject<{
        ruleId: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        conditions: z.ZodArray<z.ZodObject<{
            attribute: z.ZodString;
            operator: z.ZodEnum<["==", "!=", ">", "<", ">=", "<=", "in", "not_in"]>;
            value: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            attribute: string;
            operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
            value?: any;
        }, {
            attribute: string;
            operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
            value?: any;
        }>, "many">;
        action: z.ZodObject<{
            type: z.ZodEnum<["override", "adjust_confidence", "flag_review"]>;
            targetCategory: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
            confidenceAdjustment: z.ZodOptional<z.ZodNumber>;
            rationale: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "override" | "adjust_confidence" | "flag_review";
            rationale: string;
            targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
            confidenceAdjustment?: number | undefined;
        }, {
            type: "override" | "adjust_confidence" | "flag_review";
            rationale: string;
            targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
            confidenceAdjustment?: number | undefined;
        }>;
        priority: z.ZodNumber;
        active: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        description: string;
        active: boolean;
        ruleId: string;
        action: {
            type: "override" | "adjust_confidence" | "flag_review";
            rationale: string;
            targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
            confidenceAdjustment?: number | undefined;
        };
        name: string;
        conditions: {
            attribute: string;
            operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
            value?: any;
        }[];
        priority: number;
    }, {
        description: string;
        active: boolean;
        ruleId: string;
        action: {
            type: "override" | "adjust_confidence" | "flag_review";
            rationale: string;
            targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
            confidenceAdjustment?: number | undefined;
        };
        name: string;
        conditions: {
            attribute: string;
            operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
            value?: any;
        }[];
        priority: number;
    }>, "many">;
    active: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    description: string;
    active: boolean;
    createdAt: string;
    version: string;
    createdBy: "ai" | "admin";
    attributes: {
        description: string;
        type: "boolean" | "categorical" | "numeric";
        name: string;
        weight: number;
        possibleValues?: string[] | undefined;
    }[];
    rules: {
        description: string;
        active: boolean;
        ruleId: string;
        action: {
            type: "override" | "adjust_confidence" | "flag_review";
            rationale: string;
            targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
            confidenceAdjustment?: number | undefined;
        };
        name: string;
        conditions: {
            attribute: string;
            operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
            value?: any;
        }[];
        priority: number;
    }[];
}, {
    description: string;
    active: boolean;
    createdAt: string;
    version: string;
    createdBy: "ai" | "admin";
    attributes: {
        description: string;
        type: "boolean" | "categorical" | "numeric";
        name: string;
        weight: number;
        possibleValues?: string[] | undefined;
    }[];
    rules: {
        description: string;
        active: boolean;
        ruleId: string;
        action: {
            type: "override" | "adjust_confidence" | "flag_review";
            rationale: string;
            targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
            confidenceAdjustment?: number | undefined;
        };
        name: string;
        conditions: {
            attribute: string;
            operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
            value?: any;
        }[];
        priority: number;
    }[];
}>;
export declare const LearningSuggestionSchema: z.ZodObject<{
    suggestionId: z.ZodString;
    createdAt: z.ZodString;
    analysisId: z.ZodString;
    type: z.ZodEnum<["new_rule", "modify_rule", "adjust_weight", "new_attribute"]>;
    status: z.ZodEnum<["pending", "approved", "rejected", "applied"]>;
    rationale: z.ZodString;
    impactEstimate: z.ZodObject<{
        affectedCategories: z.ZodArray<z.ZodString, "many">;
        expectedImprovementPercent: z.ZodNumber;
        confidenceLevel: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        affectedCategories: string[];
        expectedImprovementPercent: number;
        confidenceLevel: number;
    }, {
        affectedCategories: string[];
        expectedImprovementPercent: number;
        confidenceLevel: number;
    }>;
    suggestedChange: z.ZodObject<{
        newRule: z.ZodOptional<z.ZodObject<{
            ruleId: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            conditions: z.ZodArray<z.ZodObject<{
                attribute: z.ZodString;
                operator: z.ZodEnum<["==", "!=", ">", "<", ">=", "<=", "in", "not_in"]>;
                value: z.ZodAny;
            }, "strip", z.ZodTypeAny, {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }, {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }>, "many">;
            action: z.ZodObject<{
                type: z.ZodEnum<["override", "adjust_confidence", "flag_review"]>;
                targetCategory: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
                confidenceAdjustment: z.ZodOptional<z.ZodNumber>;
                rationale: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            }, {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            }>;
            priority: z.ZodNumber;
            active: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        }, {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        }>>;
        ruleId: z.ZodOptional<z.ZodString>;
        modifiedRule: z.ZodOptional<z.ZodObject<{
            ruleId: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            conditions: z.ZodArray<z.ZodObject<{
                attribute: z.ZodString;
                operator: z.ZodEnum<["==", "!=", ">", "<", ">=", "<=", "in", "not_in"]>;
                value: z.ZodAny;
            }, "strip", z.ZodTypeAny, {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }, {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }>, "many">;
            action: z.ZodObject<{
                type: z.ZodEnum<["override", "adjust_confidence", "flag_review"]>;
                targetCategory: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
                confidenceAdjustment: z.ZodOptional<z.ZodNumber>;
                rationale: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            }, {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            }>;
            priority: z.ZodNumber;
            active: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        }, {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        }>>;
        attributeName: z.ZodOptional<z.ZodString>;
        newWeight: z.ZodOptional<z.ZodNumber>;
        newAttribute: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodEnum<["categorical", "numeric", "boolean"]>;
            possibleValues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            weight: z.ZodNumber;
            description: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            description: string;
            type: "boolean" | "categorical" | "numeric";
            name: string;
            weight: number;
            possibleValues?: string[] | undefined;
        }, {
            description: string;
            type: "boolean" | "categorical" | "numeric";
            name: string;
            weight: number;
            possibleValues?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        ruleId?: string | undefined;
        newRule?: {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        } | undefined;
        modifiedRule?: {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        } | undefined;
        attributeName?: string | undefined;
        newWeight?: number | undefined;
        newAttribute?: {
            description: string;
            type: "boolean" | "categorical" | "numeric";
            name: string;
            weight: number;
            possibleValues?: string[] | undefined;
        } | undefined;
    }, {
        ruleId?: string | undefined;
        newRule?: {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        } | undefined;
        modifiedRule?: {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        } | undefined;
        attributeName?: string | undefined;
        newWeight?: number | undefined;
        newAttribute?: {
            description: string;
            type: "boolean" | "categorical" | "numeric";
            name: string;
            weight: number;
            possibleValues?: string[] | undefined;
        } | undefined;
    }>;
    reviewedBy: z.ZodOptional<z.ZodString>;
    reviewedAt: z.ZodOptional<z.ZodString>;
    reviewNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "new_rule" | "modify_rule" | "adjust_weight" | "new_attribute";
    status: "pending" | "approved" | "rejected" | "applied";
    rationale: string;
    createdAt: string;
    suggestionId: string;
    analysisId: string;
    impactEstimate: {
        affectedCategories: string[];
        expectedImprovementPercent: number;
        confidenceLevel: number;
    };
    suggestedChange: {
        ruleId?: string | undefined;
        newRule?: {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        } | undefined;
        modifiedRule?: {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        } | undefined;
        attributeName?: string | undefined;
        newWeight?: number | undefined;
        newAttribute?: {
            description: string;
            type: "boolean" | "categorical" | "numeric";
            name: string;
            weight: number;
            possibleValues?: string[] | undefined;
        } | undefined;
    };
    reviewedBy?: string | undefined;
    reviewedAt?: string | undefined;
    reviewNotes?: string | undefined;
}, {
    type: "new_rule" | "modify_rule" | "adjust_weight" | "new_attribute";
    status: "pending" | "approved" | "rejected" | "applied";
    rationale: string;
    createdAt: string;
    suggestionId: string;
    analysisId: string;
    impactEstimate: {
        affectedCategories: string[];
        expectedImprovementPercent: number;
        confidenceLevel: number;
    };
    suggestedChange: {
        ruleId?: string | undefined;
        newRule?: {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        } | undefined;
        modifiedRule?: {
            description: string;
            active: boolean;
            ruleId: string;
            action: {
                type: "override" | "adjust_confidence" | "flag_review";
                rationale: string;
                targetCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
                confidenceAdjustment?: number | undefined;
            };
            name: string;
            conditions: {
                attribute: string;
                operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
                value?: any;
            }[];
            priority: number;
        } | undefined;
        attributeName?: string | undefined;
        newWeight?: number | undefined;
        newAttribute?: {
            description: string;
            type: "boolean" | "categorical" | "numeric";
            name: string;
            weight: number;
            possibleValues?: string[] | undefined;
        } | undefined;
    };
    reviewedBy?: string | undefined;
    reviewedAt?: string | undefined;
    reviewNotes?: string | undefined;
}>;
export declare const LearningAnalysisSchema: z.ZodObject<{
    analysisId: z.ZodString;
    triggeredBy: z.ZodEnum<["automatic", "manual"]>;
    triggeredAt: z.ZodString;
    dataRange: z.ZodObject<{
        startDate: z.ZodString;
        endDate: z.ZodString;
        totalSessions: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        startDate: string;
        endDate: string;
        totalSessions: number;
    }, {
        startDate: string;
        endDate: string;
        totalSessions: number;
    }>;
    findings: z.ZodObject<{
        overallAgreementRate: z.ZodNumber;
        categoryAgreementRates: z.ZodRecord<z.ZodString, z.ZodNumber>;
        commonMisclassifications: z.ZodArray<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            count: z.ZodNumber;
            examples: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            from: string;
            to: string;
            count: number;
            examples: string[];
        }, {
            from: string;
            to: string;
            count: number;
            examples: string[];
        }>, "many">;
        identifiedPatterns: z.ZodArray<z.ZodString, "many">;
        subjectConsistency: z.ZodOptional<z.ZodArray<z.ZodObject<{
            subject: z.ZodString;
            totalSessions: z.ZodNumber;
            agreementRate: z.ZodNumber;
            commonCategory: z.ZodString;
            categoryDistribution: z.ZodRecord<z.ZodString, z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            subject: string;
            totalSessions: number;
            agreementRate: number;
            commonCategory: string;
            categoryDistribution: Record<string, number>;
        }, {
            subject: string;
            totalSessions: number;
            agreementRate: number;
            commonCategory: string;
            categoryDistribution: Record<string, number>;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        overallAgreementRate: number;
        categoryAgreementRates: Record<string, number>;
        commonMisclassifications: {
            from: string;
            to: string;
            count: number;
            examples: string[];
        }[];
        identifiedPatterns: string[];
        subjectConsistency?: {
            subject: string;
            totalSessions: number;
            agreementRate: number;
            commonCategory: string;
            categoryDistribution: Record<string, number>;
        }[] | undefined;
    }, {
        overallAgreementRate: number;
        categoryAgreementRates: Record<string, number>;
        commonMisclassifications: {
            from: string;
            to: string;
            count: number;
            examples: string[];
        }[];
        identifiedPatterns: string[];
        subjectConsistency?: {
            subject: string;
            totalSessions: number;
            agreementRate: number;
            commonCategory: string;
            categoryDistribution: Record<string, number>;
        }[] | undefined;
    }>;
    suggestions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    analysisId: string;
    triggeredBy: "automatic" | "manual";
    triggeredAt: string;
    dataRange: {
        startDate: string;
        endDate: string;
        totalSessions: number;
    };
    findings: {
        overallAgreementRate: number;
        categoryAgreementRates: Record<string, number>;
        commonMisclassifications: {
            from: string;
            to: string;
            count: number;
            examples: string[];
        }[];
        identifiedPatterns: string[];
        subjectConsistency?: {
            subject: string;
            totalSessions: number;
            agreementRate: number;
            commonCategory: string;
            categoryDistribution: Record<string, number>;
        }[] | undefined;
    };
    suggestions: string[];
}, {
    analysisId: string;
    triggeredBy: "automatic" | "manual";
    triggeredAt: string;
    dataRange: {
        startDate: string;
        endDate: string;
        totalSessions: number;
    };
    findings: {
        overallAgreementRate: number;
        categoryAgreementRates: Record<string, number>;
        commonMisclassifications: {
            from: string;
            to: string;
            count: number;
            examples: string[];
        }[];
        identifiedPatterns: string[];
        subjectConsistency?: {
            subject: string;
            totalSessions: number;
            agreementRate: number;
            commonCategory: string;
            categoryDistribution: Record<string, number>;
        }[] | undefined;
    };
    suggestions: string[];
}>;
export declare const AudioTranscriptionSchema: z.ZodObject<{
    transcriptionId: z.ZodString;
    sessionId: z.ZodString;
    audioFilePath: z.ZodString;
    transcription: z.ZodString;
    durationSeconds: z.ZodNumber;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    timestamp: string;
    transcriptionId: string;
    audioFilePath: string;
    transcription: string;
    durationSeconds: number;
}, {
    sessionId: string;
    timestamp: string;
    transcriptionId: string;
    audioFilePath: string;
    transcription: string;
    durationSeconds: number;
}>;
export declare const PIIMappingSchema: z.ZodObject<{
    mappingId: z.ZodString;
    sessionId: z.ZodString;
    mappings: z.ZodArray<z.ZodObject<{
        token: z.ZodString;
        originalValue: z.ZodString;
        type: z.ZodEnum<["email", "phone", "ssn", "credit_card"]>;
    }, "strip", z.ZodTypeAny, {
        type: "email" | "phone" | "ssn" | "credit_card";
        token: string;
        originalValue: string;
    }, {
        type: "email" | "phone" | "ssn" | "credit_card";
        token: string;
        originalValue: string;
    }>, "many">;
    createdAt: z.ZodString;
    accessLog: z.ZodArray<z.ZodObject<{
        userId: z.ZodString;
        timestamp: z.ZodString;
        purpose: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        userId: string;
        purpose: string;
    }, {
        timestamp: string;
        userId: string;
        purpose: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    createdAt: string;
    mappingId: string;
    mappings: {
        type: "email" | "phone" | "ssn" | "credit_card";
        token: string;
        originalValue: string;
    }[];
    accessLog: {
        timestamp: string;
        userId: string;
        purpose: string;
    }[];
}, {
    sessionId: string;
    createdAt: string;
    mappingId: string;
    mappings: {
        type: "email" | "phone" | "ssn" | "credit_card";
        token: string;
        originalValue: string;
    }[];
    accessLog: {
        timestamp: string;
        userId: string;
        purpose: string;
    }[];
}>;
export declare const AnalyticsMetricsSchema: z.ZodObject<{
    metricId: z.ZodString;
    calculatedAt: z.ZodString;
    overallAgreementRate: z.ZodNumber;
    agreementRateByCategory: z.ZodRecord<z.ZodString, z.ZodNumber>;
    userSatisfactionRate: z.ZodNumber;
    totalSessions: z.ZodNumber;
    averageClassificationTimeMs: z.ZodNumber;
    alertTriggered: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    totalSessions: number;
    overallAgreementRate: number;
    metricId: string;
    calculatedAt: string;
    agreementRateByCategory: Record<string, number>;
    userSatisfactionRate: number;
    averageClassificationTimeMs: number;
    alertTriggered: boolean;
}, {
    totalSessions: number;
    overallAgreementRate: number;
    metricId: string;
    calculatedAt: string;
    agreementRateByCategory: Record<string, number>;
    userSatisfactionRate: number;
    averageClassificationTimeMs: number;
    alertTriggered: boolean;
}>;
export declare const SessionFiltersSchema: z.ZodObject<{
    dateFrom: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    dateTo: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
    category: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
    subject: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "completed", "manual_review"]>>;
    searchText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "completed" | "manual_review" | undefined;
    subject?: string | undefined;
    category?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    model?: string | undefined;
    searchText?: string | undefined;
}, {
    status?: "active" | "completed" | "manual_review" | undefined;
    subject?: string | undefined;
    category?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    model?: string | undefined;
    searchText?: string | undefined;
}>;
export declare const PaginationParamsSchema: z.ZodObject<{
    page: z.ZodNumber;
    limit: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page: number;
    limit: number;
}>;
export declare const SessionListItemSchema: z.ZodObject<{
    sessionId: z.ZodString;
    createdAt: z.ZodString;
    subject: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
    confidence: z.ZodOptional<z.ZodNumber>;
    status: z.ZodString;
    modelUsed: z.ZodString;
    feedbackConfirmed: z.ZodOptional<z.ZodBoolean>;
    userRating: z.ZodOptional<z.ZodEnum<["up", "down"]>>;
    requiresAttention: z.ZodBoolean;
    triggeredRulesCount: z.ZodOptional<z.ZodNumber>;
    hasDecisionMatrix: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    status: string;
    modelUsed: string;
    createdAt: string;
    requiresAttention: boolean;
    subject?: string | undefined;
    category?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    confidence?: number | undefined;
    userRating?: "up" | "down" | undefined;
    feedbackConfirmed?: boolean | undefined;
    triggeredRulesCount?: number | undefined;
    hasDecisionMatrix?: boolean | undefined;
}, {
    sessionId: string;
    status: string;
    modelUsed: string;
    createdAt: string;
    requiresAttention: boolean;
    subject?: string | undefined;
    category?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
    confidence?: number | undefined;
    userRating?: "up" | "down" | undefined;
    feedbackConfirmed?: boolean | undefined;
    triggeredRulesCount?: number | undefined;
    hasDecisionMatrix?: boolean | undefined;
}>;
export declare const SessionListResponseSchema: z.ZodObject<{
    sessions: z.ZodArray<z.ZodObject<{
        sessionId: z.ZodString;
        createdAt: z.ZodString;
        subject: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
        confidence: z.ZodOptional<z.ZodNumber>;
        status: z.ZodString;
        modelUsed: z.ZodString;
        feedbackConfirmed: z.ZodOptional<z.ZodBoolean>;
        userRating: z.ZodOptional<z.ZodEnum<["up", "down"]>>;
        requiresAttention: z.ZodBoolean;
        triggeredRulesCount: z.ZodOptional<z.ZodNumber>;
        hasDecisionMatrix: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        sessionId: string;
        status: string;
        modelUsed: string;
        createdAt: string;
        requiresAttention: boolean;
        subject?: string | undefined;
        category?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        confidence?: number | undefined;
        userRating?: "up" | "down" | undefined;
        feedbackConfirmed?: boolean | undefined;
        triggeredRulesCount?: number | undefined;
        hasDecisionMatrix?: boolean | undefined;
    }, {
        sessionId: string;
        status: string;
        modelUsed: string;
        createdAt: string;
        requiresAttention: boolean;
        subject?: string | undefined;
        category?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        confidence?: number | undefined;
        userRating?: "up" | "down" | undefined;
        feedbackConfirmed?: boolean | undefined;
        triggeredRulesCount?: number | undefined;
        hasDecisionMatrix?: boolean | undefined;
    }>, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    limit: z.ZodNumber;
    totalPages: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sessions: {
        sessionId: string;
        status: string;
        modelUsed: string;
        createdAt: string;
        requiresAttention: boolean;
        subject?: string | undefined;
        category?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        confidence?: number | undefined;
        userRating?: "up" | "down" | undefined;
        feedbackConfirmed?: boolean | undefined;
        triggeredRulesCount?: number | undefined;
        hasDecisionMatrix?: boolean | undefined;
    }[];
    total: number;
    totalPages: number;
}, {
    page: number;
    limit: number;
    sessions: {
        sessionId: string;
        status: string;
        modelUsed: string;
        createdAt: string;
        requiresAttention: boolean;
        subject?: string | undefined;
        category?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
        confidence?: number | undefined;
        userRating?: "up" | "down" | undefined;
        feedbackConfirmed?: boolean | undefined;
        triggeredRulesCount?: number | undefined;
        hasDecisionMatrix?: boolean | undefined;
    }[];
    total: number;
    totalPages: number;
}>;
export declare const FilterOptionsSchema: z.ZodObject<{
    subjects: z.ZodArray<z.ZodString, "many">;
    models: z.ZodArray<z.ZodString, "many">;
    categories: z.ZodArray<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>, "many">;
    statuses: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    subjects: string[];
    models: string[];
    categories: ("Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI")[];
    statuses: string[];
}, {
    subjects: string[];
    models: string[];
    categories: ("Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI")[];
    statuses: string[];
}>;
export declare const FilteredMetricsSchema: z.ZodObject<{
    totalCount: z.ZodNumber;
    averageConfidence: z.ZodNumber;
    agreementRate: z.ZodNumber;
    categoryDistribution: z.ZodRecord<z.ZodString, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    agreementRate: number;
    categoryDistribution: Record<string, number>;
    totalCount: number;
    averageConfidence: number;
}, {
    agreementRate: number;
    categoryDistribution: Record<string, number>;
    totalCount: number;
    averageConfidence: number;
}>;
export * from './validation';
export * from './voice.types';
