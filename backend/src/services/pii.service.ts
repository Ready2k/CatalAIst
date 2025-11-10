import { PIIDetectionService, PIIDetectionResult } from './pii-detection.service';
import { PIIMappingService } from './pii-mapping.service';
import { PIIMapping } from '../../../shared/dist';

/**
 * Combined PII Service
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 * 
 * Provides a unified interface for PII detection, scrubbing, and mapping storage
 */

export interface PIIScrubResult {
  scrubbedText: string;
  hasPII: boolean;
  mapping?: PIIMapping;
}

export class PIIService {
  private detectionService: PIIDetectionService;
  private mappingService: PIIMappingService;

  constructor(dataDir?: string, encryptionKey?: string) {
    this.detectionService = new PIIDetectionService();
    this.mappingService = new PIIMappingService(dataDir, encryptionKey);
  }

  /**
   * Detect and scrub PII from text, storing mappings if PII is found
   * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
   */
  async scrubAndStore(
    text: string,
    sessionId: string,
    userId: string = 'system'
  ): Promise<PIIScrubResult> {
    // Detect and scrub PII
    const detectionResult: PIIDetectionResult = this.detectionService.detectAndScrub(text, sessionId);

    // If PII was found, store the mappings
    let mapping: PIIMapping | undefined;
    if (detectionResult.hasPII && detectionResult.matches.length > 0) {
      mapping = await this.mappingService.storeMappings(
        sessionId,
        detectionResult.matches,
        userId
      );
    }

    return {
      scrubbedText: detectionResult.scrubbedText,
      hasPII: detectionResult.hasPII,
      mapping
    };
  }

  /**
   * Scrub PII without storing mappings (for non-persistent operations)
   * Requirements: 14.1, 14.2, 14.3, 14.4
   */
  scrubOnly(text: string): PIIScrubResult {
    const detectionResult: PIIDetectionResult = this.detectionService.detectAndScrub(text);

    return {
      scrubbedText: detectionResult.scrubbedText,
      hasPII: detectionResult.hasPII
    };
  }

  /**
   * Retrieve PII mappings for a session
   * Requirements: 14.5
   */
  async getMappings(
    sessionId: string,
    userId: string,
    purpose: string
  ): Promise<PIIMapping | null> {
    return await this.mappingService.getMappings(sessionId, userId, purpose);
  }

  /**
   * Retrieve and decrypt a specific PII value
   * Requirements: 14.5
   */
  async getDecryptedValue(
    sessionId: string,
    token: string,
    userId: string,
    purpose: string
  ): Promise<string | null> {
    return await this.mappingService.getDecryptedValue(sessionId, token, userId, purpose);
  }

  /**
   * Get access log for a session's PII mappings
   * Requirements: 14.5
   */
  async getAccessLog(sessionId: string): Promise<Array<{
    userId: string;
    timestamp: string;
    purpose: string;
  }>> {
    return await this.mappingService.getAccessLog(sessionId);
  }

  /**
   * Delete PII mappings for a session
   * Requirements: 14.5
   */
  async deleteMappings(sessionId: string, userId: string): Promise<void> {
    await this.mappingService.deleteMappings(sessionId, userId);
  }

  /**
   * Check if PII mappings exist for a session
   */
  async hasMappings(sessionId: string): Promise<boolean> {
    return await this.mappingService.hasMappings(sessionId);
  }
}
