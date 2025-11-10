import { JsonStorageService } from './storage.service';

/**
 * Service for managing custom business subjects
 * Stores user-defined subjects alongside the predefined ones
 */
export class SubjectsStorageService {
  private jsonStorage: JsonStorageService;
  private readonly SUBJECTS_FILE = 'config/custom-subjects.json';

  // Predefined common subjects
  private readonly DEFAULT_SUBJECTS = [
    'Finance',
    'Accounting',
    'Procurement',
    'Accounts Payable',
    'Accounts Receivable',
    'HR',
    'Human Resources',
    'Recruitment',
    'Onboarding',
    'Payroll',
    'Benefits',
    'Sales',
    'Marketing',
    'Customer Service',
    'Support',
    'IT',
    'Technology',
    'Infrastructure',
    'Security',
    'Operations',
    'Manufacturing',
    'Supply Chain',
    'Logistics',
    'Inventory',
    'Legal',
    'Compliance',
    'Risk Management',
    'Audit',
    'Product',
    'Engineering',
    'Development',
    'Quality Assurance',
    'Administration',
    'Facilities',
    'General Management'
  ];

  constructor(jsonStorage: JsonStorageService) {
    this.jsonStorage = jsonStorage;
  }

  /**
   * Get all subjects (default + custom)
   */
  async getAllSubjects(): Promise<string[]> {
    const customSubjects = await this.getCustomSubjects();
    const allSubjects = [...this.DEFAULT_SUBJECTS, ...customSubjects];
    
    // Remove duplicates and sort
    return Array.from(new Set(allSubjects)).sort();
  }

  /**
   * Get only custom subjects
   */
  async getCustomSubjects(): Promise<string[]> {
    try {
      const exists = await this.jsonStorage.exists(this.SUBJECTS_FILE);
      if (!exists) {
        return [];
      }

      const data = await this.jsonStorage.readJson<{ subjects: string[] }>(this.SUBJECTS_FILE);
      return data.subjects || [];
    } catch (error) {
      console.error('Error loading custom subjects:', error);
      return [];
    }
  }

  /**
   * Add a custom subject
   */
  async addCustomSubject(subject: string): Promise<void> {
    const trimmedSubject = subject.trim();
    
    if (!trimmedSubject) {
      throw new Error('Subject cannot be empty');
    }

    // Check if it's already a default subject
    if (this.DEFAULT_SUBJECTS.includes(trimmedSubject)) {
      return; // Already exists in defaults, no need to add
    }

    const customSubjects = await this.getCustomSubjects();
    
    // Check if already in custom subjects
    if (customSubjects.includes(trimmedSubject)) {
      return; // Already exists
    }

    // Add to custom subjects
    customSubjects.push(trimmedSubject);
    customSubjects.sort();

    await this.jsonStorage.writeJson(this.SUBJECTS_FILE, {
      subjects: customSubjects,
      lastUpdated: new Date().toISOString()
    });

    console.log(`Added custom subject: ${trimmedSubject}`);
  }

  /**
   * Remove a custom subject
   */
  async removeCustomSubject(subject: string): Promise<void> {
    const customSubjects = await this.getCustomSubjects();
    const filtered = customSubjects.filter(s => s !== subject);

    if (filtered.length === customSubjects.length) {
      return; // Subject not found
    }

    await this.jsonStorage.writeJson(this.SUBJECTS_FILE, {
      subjects: filtered,
      lastUpdated: new Date().toISOString()
    });

    console.log(`Removed custom subject: ${subject}`);
  }

  /**
   * Check if a subject exists (in defaults or custom)
   */
  async subjectExists(subject: string): Promise<boolean> {
    const allSubjects = await this.getAllSubjects();
    return allSubjects.includes(subject);
  }

  /**
   * Get default subjects only
   */
  getDefaultSubjects(): string[] {
    return [...this.DEFAULT_SUBJECTS].sort();
  }
}
