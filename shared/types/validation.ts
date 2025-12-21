// Input validation utilities for CatalAIst
import { z } from 'zod';

/**
 * Validates process description input
 * Requirements: 1.2 - Minimum 10 characters
 */
export const ProcessDescriptionSchema = z.string()
  .min(10, 'Process description must be at least 10 characters long')
  .max(10000, 'Process description must not exceed 10,000 characters')
  .trim();

/**
 * Validates OpenAI API key format
 * Requirements: 9.2 - API key format validation
 * OpenAI API keys start with 'sk-' followed by alphanumeric characters
 */
export const OpenAIApiKeySchema = z.string()
  .regex(/^sk-[a-zA-Z0-9]{32,}$/, 'Invalid OpenAI API key format. Must start with "sk-" followed by at least 32 alphanumeric characters')
  .trim();

/**
 * Sanitizes user input by removing potentially harmful characters
 * while preserving legitimate content
 */
export function sanitizeInput(input: string): string {
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
export function validateProcessDescription(description: string): {
  success: boolean;
  data?: string;
  error?: string;
} {
  try {
    // First sanitize the input
    const sanitized = sanitizeInput(description);
    
    // Then validate with schema
    const validated = ProcessDescriptionSchema.parse(sanitized);
    
    return {
      success: true,
      data: validated
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
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
export function validateOpenAIApiKey(apiKey: string): {
  success: boolean;
  data?: string;
  error?: string;
} {
  try {
    // Sanitize and validate
    const sanitized = sanitizeInput(apiKey);
    const validated = OpenAIApiKeySchema.parse(sanitized);
    
    return {
      success: true,
      data: validated
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
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
export const ProcessSubmissionSchema = z.object({
  description: ProcessDescriptionSchema,
  sessionId: z.string().uuid().optional(),
  apiKey: OpenAIApiKeySchema
});

/**
 * Schema for session creation request
 */
export const SessionCreationSchema = z.object({
  apiKey: OpenAIApiKeySchema,
  initiativeId: z.string().optional()
});

/**
 * Schema for clarification response
 */
export const ClarificationResponseSchema = z.object({
  sessionId: z.string().uuid(),
  answer: z.string().min(1, 'Answer cannot be empty').max(5000),
  questionId: z.string()
});

/**
 * Schema for feedback submission
 */
export const FeedbackSubmissionSchema = z.object({
  sessionId: z.string().uuid(),
  confirmed: z.boolean(),
  correctedCategory: z.enum([
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
export const RatingSubmissionSchema = z.object({
  sessionId: z.string().uuid(),
  rating: z.enum(['up', 'down']),
  comments: z.string().max(2000).optional()
});
