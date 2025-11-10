// Shared TypeScript types for CatalAIst
import { z } from 'zod';

export type TransformationCategory = 
  | 'Eliminate' 
  | 'Simplify' 
  | 'Digitise' 
  | 'RPA' 
  | 'AI Agent' 
  | 'Agentic AI';

export interface Session {
  sessionId: string;
  initiativeId: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'manual_review';
  modelUsed: string;
  subject?: string; // Business area/domain (e.g., "Finance", "HR", "Sales")
  conversations: Conversation[];
  classification?: Classification;
  feedback?: Feedback;
  userRating?: UserRating;
}

export interface Conversation {
  conversationId: string;
  timestamp: string;
  processDescription: string;
  subject?: string; // Business area/domain extracted from description
  clarificationQA: Array<{ question: string; answer: string }>;
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

export interface AuditLogEntry {
  sessionId: string;
  timestamp: string;
  eventType: 'input' | 'clarification' | 'classification' | 'feedback' | 'rating';
  userId: string;
  data: any;
  modelPrompt?: string;
  modelResponse?: string;
  piiScrubbed: boolean;
  metadata: {
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
  extractedAttributes: { [key: string]: any };
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
    categoryAgreementRates: { [category: string]: number };
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
      categoryDistribution: { [category: string]: number };
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
  agreementRateByCategory: { [category: string]: number };
  userSatisfactionRate: number;
  totalSessions: number;
  averageClassificationTimeMs: number;
  alertTriggered: boolean;
}

// Zod Validation Schemas

export const TransformationCategorySchema = z.enum([
  'Eliminate',
  'Simplify',
  'Digitise',
  'RPA',
  'AI Agent',
  'Agentic AI'
]);

export const ConversationSchema = z.object({
  conversationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  processDescription: z.string().min(10),
  subject: z.string().optional(),
  clarificationQA: z.array(z.object({
    question: z.string(),
    answer: z.string()
  }))
});

export const DecisionMatrixEvaluationSchema: z.ZodType<DecisionMatrixEvaluation> = z.lazy(() => z.object({
  matrixVersion: z.string(),
  originalClassification: ClassificationSchema,
  extractedAttributes: z.record(z.any()),
  triggeredRules: z.array(z.object({
    ruleId: z.string(),
    ruleName: z.string(),
    action: RuleActionSchema
  })),
  finalClassification: ClassificationSchema,
  overridden: z.boolean()
}));

export const ClassificationSchema = z.object({
  category: TransformationCategorySchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  categoryProgression: z.string(),
  futureOpportunities: z.string(),
  timestamp: z.string().datetime(),
  modelUsed: z.string(),
  llmProvider: z.string(),
  decisionMatrixEvaluation: DecisionMatrixEvaluationSchema.optional()
});

export const FeedbackSchema = z.object({
  confirmed: z.boolean(),
  correctedCategory: TransformationCategorySchema.optional(),
  timestamp: z.string().datetime()
});

export const UserRatingSchema = z.object({
  rating: z.enum(['up', 'down']),
  comments: z.string().optional(),
  timestamp: z.string().datetime()
});

export const SessionSchema = z.object({
  sessionId: z.string().uuid(),
  initiativeId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(['active', 'completed', 'manual_review']),
  modelUsed: z.string(),
  subject: z.string().optional(),
  conversations: z.array(ConversationSchema),
  classification: ClassificationSchema.optional(),
  feedback: FeedbackSchema.optional(),
  userRating: UserRatingSchema.optional()
});

export const AuditLogEntrySchema = z.object({
  sessionId: z.string().uuid(),
  timestamp: z.string().datetime(),
  eventType: z.enum(['input', 'clarification', 'classification', 'feedback', 'rating']),
  userId: z.string(),
  data: z.any(),
  modelPrompt: z.string().optional(),
  modelResponse: z.string().optional(),
  piiScrubbed: z.boolean(),
  metadata: z.object({
    modelVersion: z.string().optional(),
    latencyMs: z.number().optional(),
    llmProvider: z.string().optional(),
    llmConfigId: z.string().optional(),
    decisionMatrixVersion: z.string().optional()
  })
});

export const ConditionSchema = z.object({
  attribute: z.string(),
  operator: z.enum(['==', '!=', '>', '<', '>=', '<=', 'in', 'not_in']),
  value: z.any()
});

export const RuleActionSchema = z.object({
  type: z.enum(['override', 'adjust_confidence', 'flag_review']),
  targetCategory: TransformationCategorySchema.optional(),
  confidenceAdjustment: z.number().optional(),
  rationale: z.string()
});

export const RuleSchema = z.object({
  ruleId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  conditions: z.array(ConditionSchema),
  action: RuleActionSchema,
  priority: z.number().int().min(0),
  active: z.boolean()
});

export const AttributeSchema = z.object({
  name: z.string(),
  type: z.enum(['categorical', 'numeric', 'boolean']),
  possibleValues: z.array(z.string()).optional(),
  weight: z.number().min(0).max(1),
  description: z.string()
});

export const DecisionMatrixSchema = z.object({
  version: z.string(),
  createdAt: z.string().datetime(),
  createdBy: z.enum(['ai', 'admin']),
  description: z.string(),
  attributes: z.array(AttributeSchema),
  rules: z.array(RuleSchema),
  active: z.boolean()
});

export const LearningSuggestionSchema = z.object({
  suggestionId: z.string().uuid(),
  createdAt: z.string().datetime(),
  analysisId: z.string().uuid(),
  type: z.enum(['new_rule', 'modify_rule', 'adjust_weight', 'new_attribute']),
  status: z.enum(['pending', 'approved', 'rejected', 'applied']),
  rationale: z.string(),
  impactEstimate: z.object({
    affectedCategories: z.array(z.string()),
    expectedImprovementPercent: z.number().min(0).max(100),
    confidenceLevel: z.number().min(0).max(1)
  }),
  suggestedChange: z.object({
    newRule: RuleSchema.optional(),
    ruleId: z.string().uuid().optional(),
    modifiedRule: RuleSchema.optional(),
    attributeName: z.string().optional(),
    newWeight: z.number().min(0).max(1).optional(),
    newAttribute: AttributeSchema.optional()
  }),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().datetime().optional(),
  reviewNotes: z.string().optional()
});

export const LearningAnalysisSchema = z.object({
  analysisId: z.string().uuid(),
  triggeredBy: z.enum(['automatic', 'manual']),
  triggeredAt: z.string().datetime(),
  dataRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    totalSessions: z.number().int().min(0)
  }),
  findings: z.object({
    overallAgreementRate: z.number().min(0).max(1),
    categoryAgreementRates: z.record(z.number().min(0).max(1)),
    commonMisclassifications: z.array(z.object({
      from: z.string(),
      to: z.string(),
      count: z.number().int().min(0),
      examples: z.array(z.string().uuid())
    })),
    identifiedPatterns: z.array(z.string()),
    subjectConsistency: z.array(z.object({
      subject: z.string(),
      totalSessions: z.number().int().min(0),
      agreementRate: z.number().min(0).max(1),
      commonCategory: z.string(),
      categoryDistribution: z.record(z.number().int().min(0))
    })).optional()
  }),
  suggestions: z.array(z.string().uuid())
});

export const AudioTranscriptionSchema = z.object({
  transcriptionId: z.string().uuid(),
  sessionId: z.string().uuid(),
  audioFilePath: z.string(),
  transcription: z.string(),
  durationSeconds: z.number().min(0),
  timestamp: z.string().datetime()
});

export const PIIMappingSchema = z.object({
  mappingId: z.string().uuid(),
  sessionId: z.string().uuid(),
  mappings: z.array(z.object({
    token: z.string(),
    originalValue: z.string(),
    type: z.enum(['email', 'phone', 'ssn', 'credit_card'])
  })),
  createdAt: z.string().datetime(),
  accessLog: z.array(z.object({
    userId: z.string(),
    timestamp: z.string(),
    purpose: z.string()
  }))
});

export const AnalyticsMetricsSchema = z.object({
  metricId: z.string().uuid(),
  calculatedAt: z.string().datetime(),
  overallAgreementRate: z.number().min(0).max(1),
  agreementRateByCategory: z.record(z.number().min(0).max(1)),
  userSatisfactionRate: z.number().min(0).max(1),
  totalSessions: z.number().int().min(0),
  averageClassificationTimeMs: z.number().min(0),
  alertTriggered: z.boolean()
});

// Export validation utilities
export * from './validation';
