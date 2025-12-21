"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RatingSubmissionSchema = exports.FeedbackSubmissionSchema = exports.ClarificationResponseSchema = exports.SessionCreationSchema = exports.ProcessSubmissionSchema = exports.OpenAIApiKeySchema = exports.ProcessDescriptionSchema = void 0;
exports.sanitizeInput = sanitizeInput;
exports.validateProcessDescription = validateProcessDescription;
exports.validateOpenAIApiKey = validateOpenAIApiKey;
// Input validation utilities for CatalAIst
const zod_1 = require("zod");
/**
 * Validates process description input
 * Requirements: 1.2 - Minimum 10 characters
 */
exports.ProcessDescriptionSchema = zod_1.z.string()
    .min(10, 'Process description must be at least 10 characters long')
    .max(10000, 'Process description must not exceed 10,000 characters')
    .trim();
/**
 * Validates OpenAI API key format
 * Requirements: 9.2 - API key format validation
 * OpenAI API keys start with 'sk-' followed by alphanumeric characters
 */
exports.OpenAIApiKeySchema = zod_1.z.string()
    .regex(/^sk-[a-zA-Z0-9]{32,}$/, 'Invalid OpenAI API key format. Must start with "sk-" followed by at least 32 alphanumeric characters')
    .trim();
/**
 * Sanitizes user input by removing potentially harmful characters
 * while preserving legitimate content
 */
function sanitizeInput(input) {
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    // Remove control characters except newlines, tabs, and carriage returns
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // Trim whitespace
    sanitized = sanitized.trim();
    return sanitized;
}
/**
 * Validates and sanitizes process description
 * Requirements: 1.2, 9.2
 */
function validateProcessDescription(description) {
    try {
        // First sanitize the input
        const sanitized = sanitizeInput(description);
        // Then validate with schema
        const validated = exports.ProcessDescriptionSchema.parse(sanitized);
        return {
            success: true,
            data: validated
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return {
                success: false,
                error: error.errors[0].message
            };
        }
        return {
            success: false,
            error: 'Invalid process description'
        };
    }
}
/**
 * Validates OpenAI API key format
 * Requirements: 9.2
 */
function validateOpenAIApiKey(apiKey) {
    try {
        // Sanitize and validate
        const sanitized = sanitizeInput(apiKey);
        const validated = exports.OpenAIApiKeySchema.parse(sanitized);
        return {
            success: true,
            data: validated
        };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return {
                success: false,
                error: error.errors[0].message
            };
        }
        return {
            success: false,
            error: 'Invalid API key format'
        };
    }
}
/**
 * Schema for process submission request
 */
exports.ProcessSubmissionSchema = zod_1.z.object({
    description: exports.ProcessDescriptionSchema,
    sessionId: zod_1.z.string().uuid().optional(),
    apiKey: exports.OpenAIApiKeySchema
});
/**
 * Schema for session creation request
 */
exports.SessionCreationSchema = zod_1.z.object({
    apiKey: exports.OpenAIApiKeySchema,
    initiativeId: zod_1.z.string().optional()
});
/**
 * Schema for clarification response
 */
exports.ClarificationResponseSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    answer: zod_1.z.string().min(1, 'Answer cannot be empty').max(5000),
    questionId: zod_1.z.string()
});
/**
 * Schema for feedback submission
 */
exports.FeedbackSubmissionSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    confirmed: zod_1.z.boolean(),
    correctedCategory: zod_1.z.enum([
        'Eliminate',
        'Simplify',
        'Digitise',
        'RPA',
        'AI Agent',
        'Agentic AI'
    ]).optional()
});
/**
 * Schema for rating submission
 */
exports.RatingSubmissionSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    rating: zod_1.z.enum(['up', 'down']),
    comments: zod_1.z.string().max(2000).optional()
});
//# sourceMappingURL=validation.js.map