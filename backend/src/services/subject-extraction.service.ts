import { LLMService, ChatMessage } from './llm.service';

/**
 * Service for extracting business subject/area/domain from process descriptions
 * Used to group similar processes for consistency checking and learning
 */
export class SubjectExtractionService {
  private llmService: LLMService;

  // Common business subjects for quick matching
  private readonly COMMON_SUBJECTS = [
    'Finance', 'Accounting', 'Procurement', 'Accounts Payable', 'Accounts Receivable',
    'HR', 'Human Resources', 'Recruitment', 'Onboarding', 'Payroll', 'Benefits',
    'Sales', 'Marketing', 'Customer Service', 'Support',
    'IT', 'Technology', 'Infrastructure', 'Security',
    'Operations', 'Manufacturing', 'Supply Chain', 'Logistics', 'Inventory',
    'Legal', 'Compliance', 'Risk Management', 'Audit',
    'Product', 'Engineering', 'Development', 'Quality Assurance',
    'Administration', 'Facilities', 'General Management'
  ];

  constructor() {
    this.llmService = new LLMService();
  }

  /**
   * Extract subject from process description using pattern matching first,
   * then LLM if needed
   */
  async extractSubject(
    processDescription: string,
    llmConfig?: {
      provider: 'openai' | 'bedrock';
      model?: string;
      apiKey?: string;
      awsAccessKeyId?: string;
      awsSecretAccessKey?: string;
      awsSessionToken?: string;
      awsRegion?: string;
    }
  ): Promise<string> {
    // Try quick pattern matching first
    const quickMatch = this.quickMatchSubject(processDescription);
    if (quickMatch) {
      return quickMatch;
    }

    // Fall back to LLM extraction if config provided
    if (llmConfig) {
      try {
        return await this.extractSubjectWithLLM(processDescription, llmConfig);
      } catch (error) {
        console.warn('LLM subject extraction failed, using fallback:', error);
      }
    }

    // Final fallback: extract from keywords
    return this.extractFromKeywords(processDescription);
  }

  /**
   * Quick pattern matching against common subjects
   */
  private quickMatchSubject(description: string): string | null {
    const lowerDesc = description.toLowerCase();

    // Check for exact or close matches
    for (const subject of this.COMMON_SUBJECTS) {
      const lowerSubject = subject.toLowerCase();
      
      // Check for word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${lowerSubject}\\b`, 'i');
      if (regex.test(lowerDesc)) {
        return subject;
      }

      // Check for related terms
      if (this.hasRelatedTerms(lowerDesc, subject)) {
        return subject;
      }
    }

    return null;
  }

  /**
   * Check for related terms to a subject
   */
  private hasRelatedTerms(description: string, subject: string): boolean {
    const relatedTerms: { [key: string]: string[] } = {
      'Finance': ['financial', 'budget', 'expense', 'revenue', 'invoice', 'payment'],
      'HR': ['employee', 'hiring', 'staff', 'personnel', 'workforce'],
      'Sales': ['customer', 'deal', 'quote', 'order', 'pipeline', 'crm'],
      'IT': ['server', 'network', 'software', 'hardware', 'system', 'application'],
      'Operations': ['production', 'manufacturing', 'assembly', 'warehouse'],
      'Marketing': ['campaign', 'lead', 'content', 'social media', 'advertising'],
      'Legal': ['contract', 'agreement', 'compliance', 'regulation'],
      'Procurement': ['vendor', 'supplier', 'purchase', 'requisition', 'po'],
      'Customer Service': ['ticket', 'support', 'helpdesk', 'customer inquiry']
    };

    const terms = relatedTerms[subject];
    if (!terms) return false;

    return terms.some(term => description.includes(term));
  }

  /**
   * Extract subject using LLM
   */
  private async extractSubjectWithLLM(
    processDescription: string,
    llmConfig: {
      provider: 'openai' | 'bedrock';
      model?: string;
      apiKey?: string;
      awsAccessKeyId?: string;
      awsSecretAccessKey?: string;
      awsSessionToken?: string;
      awsRegion?: string;
    }
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a business analyst expert. Extract the primary business area/subject/domain from process descriptions.

Common subjects include: ${this.COMMON_SUBJECTS.join(', ')}

Respond with ONLY the subject name (1-3 words maximum). Examples:
- "Finance"
- "HR"
- "Sales"
- "IT"
- "Customer Service"
- "Procurement"

If the process spans multiple areas, choose the PRIMARY area.`
      },
      {
        role: 'user',
        content: `Extract the business subject from this process description:\n\n${processDescription}`
      }
    ];

    const config = this.llmService.buildConfig({
      provider: llmConfig.provider,
      model: llmConfig.model || 'gpt-4',
      apiKey: llmConfig.apiKey,
      awsAccessKeyId: llmConfig.awsAccessKeyId,
      awsSecretAccessKey: llmConfig.awsSecretAccessKey,
      awsSessionToken: llmConfig.awsSessionToken,
      awsRegion: llmConfig.awsRegion,
    });

    const response = await this.llmService.chat(
      messages,
      llmConfig.model || 'gpt-4',
      config
    );

    // Clean up response
    let subject = response.content.trim();
    
    // Remove quotes if present
    subject = subject.replace(/^["']|["']$/g, '');
    
    // Capitalize first letter of each word
    subject = subject.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return subject;
  }

  /**
   * Extract subject from keywords as fallback
   */
  private extractFromKeywords(description: string): string {
    const lowerDesc = description.toLowerCase();

    // Keyword mapping
    const keywordMap: { [key: string]: string[] } = {
      'Finance': ['invoice', 'payment', 'expense', 'budget', 'financial', 'accounting'],
      'HR': ['employee', 'hiring', 'onboarding', 'payroll', 'benefits', 'staff'],
      'Sales': ['customer', 'deal', 'quote', 'order', 'sales', 'crm'],
      'IT': ['server', 'network', 'software', 'system', 'application', 'technical'],
      'Operations': ['production', 'manufacturing', 'warehouse', 'inventory'],
      'Customer Service': ['support', 'ticket', 'helpdesk', 'customer service'],
      'Procurement': ['vendor', 'supplier', 'purchase', 'procurement'],
      'Marketing': ['campaign', 'marketing', 'advertising', 'content'],
      'Legal': ['contract', 'legal', 'compliance', 'regulation']
    };

    // Count keyword matches
    const scores: { [key: string]: number } = {};
    
    for (const [subject, keywords] of Object.entries(keywordMap)) {
      scores[subject] = keywords.filter(kw => lowerDesc.includes(kw)).length;
    }

    // Find subject with highest score
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      const subject = Object.keys(scores).find(s => scores[s] === maxScore);
      if (subject) return subject;
    }

    // Ultimate fallback
    return 'General';
  }

  /**
   * Batch extract subjects from multiple descriptions
   */
  async extractSubjects(
    descriptions: string[],
    llmConfig?: {
      provider: 'openai' | 'bedrock';
      model?: string;
      apiKey?: string;
      awsAccessKeyId?: string;
      awsSecretAccessKey?: string;
      awsSessionToken?: string;
      awsRegion?: string;
    }
  ): Promise<string[]> {
    const subjects: string[] = [];

    for (const description of descriptions) {
      const subject = await this.extractSubject(description, llmConfig);
      subjects.push(subject);
    }

    return subjects;
  }

  /**
   * Get all unique subjects from sessions
   */
  getUniqueSubjects(sessions: Array<{ subject?: string }>): string[] {
    const subjects = new Set<string>();
    
    for (const session of sessions) {
      if (session.subject) {
        subjects.add(session.subject);
      }
    }

    return Array.from(subjects).sort();
  }

  /**
   * Group sessions by subject
   */
  groupBySubject<T extends { subject?: string }>(items: T[]): Map<string, T[]> {
    const grouped = new Map<string, T[]>();

    for (const item of items) {
      const subject = item.subject || 'Unknown';
      
      if (!grouped.has(subject)) {
        grouped.set(subject, []);
      }
      
      grouped.get(subject)!.push(item);
    }

    return grouped;
  }
}
