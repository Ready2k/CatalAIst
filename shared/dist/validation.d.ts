import { z } from 'zod';
/**
 * Validates process description input
 * Requirements: 1.2 - Minimum 10 characters
 */
export declare const ProcessDescriptionSchema: z.ZodString;
/**
 * Validates OpenAI API key format
 * Requirements: 9.2 - API key format validation
 * OpenAI API keys start with 'sk-' followed by alphanumeric characters
 */
export declare const OpenAIApiKeySchema: z.ZodString;
/**
 * Sanitizes user input by removing potentially harmful characters
 * while preserving legitimate content
 */
export declare function sanitizeInput(input: string): string;
/**
 * Validates and sanitizes process description
 * Requirements: 1.2, 9.2
 */
export declare function validateProcessDescription(description: string): {
    success: boolean;
    data?: string;
    error?: string;
};
/**
 * Validates OpenAI API key format
 * Requirements: 9.2
 */
export declare function validateOpenAIApiKey(apiKey: string): {
    success: boolean;
    data?: string;
    error?: string;
};
/**
 * Schema for process submission request
 */
export declare const ProcessSubmissionSchema: z.ZodObject<{
    description: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    apiKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    apiKey: string;
    sessionId?: string | undefined;
}, {
    description: string;
    apiKey: string;
    sessionId?: string | undefined;
}>;
/**
 * Schema for session creation request
 */
export declare const SessionCreationSchema: z.ZodObject<{
    apiKey: z.ZodString;
    initiativeId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    apiKey: string;
    initiativeId?: string | undefined;
}, {
    apiKey: string;
    initiativeId?: string | undefined;
}>;
/**
 * Schema for clarification response
 */
export declare const ClarificationResponseSchema: z.ZodObject<{
    sessionId: z.ZodString;
    answer: z.ZodString;
    questionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    answer: string;
    questionId: string;
}, {
    sessionId: string;
    answer: string;
    questionId: string;
}>;
/**
 * Schema for feedback submission
 */
export declare const FeedbackSubmissionSchema: z.ZodObject<{
    sessionId: z.ZodString;
    confirmed: z.ZodBoolean;
    correctedCategory: z.ZodOptional<z.ZodEnum<["Eliminate", "Simplify", "Digitise", "RPA", "AI Agent", "Agentic AI"]>>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    confirmed: boolean;
    correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
}, {
    sessionId: string;
    confirmed: boolean;
    correctedCategory?: "Eliminate" | "Simplify" | "Digitise" | "RPA" | "AI Agent" | "Agentic AI" | undefined;
}>;
/**
 * Schema for rating submission
 */
export declare const RatingSubmissionSchema: z.ZodObject<{
    sessionId: z.ZodString;
    rating: z.ZodEnum<["up", "down"]>;
    comments: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    rating: "up" | "down";
    comments?: string | undefined;
}, {
    sessionId: string;
    rating: "up" | "down";
    comments?: string | undefined;
}>;
