import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { JsonStorageService } from './storage.service';
import { PIIMapping } from '../../../shared/dist';
import { PIIMatch } from './pii-detection.service';

/**
 * PII Mapping Storage Service
 * Requirements: 14.5
 * 
 * Stores encrypted mappings between PII tokens and original values
 * Logs all access to PII mappings for audit purposes
 */

export class PIIMappingService {
  private storage: JsonStorageService;
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';

  constructor(dataDir?: string, encryptionKey?: string) {
    this.storage = new JsonStorageService(dataDir);
    
    // Use provided encryption key or generate from environment
    // In production, this should come from a secure key management service
    const keyString = encryptionKey || process.env.PII_ENCRYPTION_KEY || this.generateDefaultKey();
    this.encryptionKey = crypto.scryptSync(keyString, 'salt', 32);
  }

  /**
   * Generate a default encryption key (for development only)
   * In production, use a proper key management service
   */
  private generateDefaultKey(): string {
    console.warn('WARNING: Using default PII encryption key. Set PII_ENCRYPTION_KEY environment variable in production.');
    return 'catalai-default-pii-key-change-in-production';
  }

  /**
   * Encrypt a PII value
   * Requirements: 14.5
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv) as crypto.CipherGCM;
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a PII value
   * Requirements: 14.5
   */
  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Store PII mappings for a session
   * Requirements: 14.5
   */
  async storeMappings(
    sessionId: string,
    matches: PIIMatch[],
    userId: string = 'system'
  ): Promise<PIIMapping> {
    const mappingId = uuidv4();
    
    // Encrypt original values
    const encryptedMappings = matches.map(match => ({
      token: match.token,
      originalValue: this.encrypt(match.value),
      type: match.type
    }));

    const mapping: PIIMapping = {
      mappingId,
      sessionId,
      mappings: encryptedMappings,
      createdAt: new Date().toISOString(),
      accessLog: [
        {
          userId,
          timestamp: new Date().toISOString(),
          purpose: 'create_mapping'
        }
      ]
    };

    // Store mapping file
    const filePath = `pii-mappings/${sessionId}.json`;
    await this.storage.writeJson(filePath, mapping);

    return mapping;
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
    const filePath = `pii-mappings/${sessionId}.json`;
    
    try {
      const exists = await this.storage.exists(filePath);
      if (!exists) {
        return null;
      }

      const mapping = await this.storage.readJson<PIIMapping>(filePath);
      
      // Log access
      await this.logAccess(sessionId, userId, purpose);
      
      return mapping;
    } catch (error) {
      console.error(`Failed to retrieve PII mappings for session ${sessionId}:`, error);
      return null;
    }
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
    const mapping = await this.getMappings(sessionId, userId, purpose);
    
    if (!mapping) {
      return null;
    }

    const entry = mapping.mappings.find(m => m.token === token);
    if (!entry) {
      return null;
    }

    try {
      return this.decrypt(entry.originalValue);
    } catch (error) {
      console.error(`Failed to decrypt PII value for token ${token}:`, error);
      return null;
    }
  }

  /**
   * Log access to PII mappings
   * Requirements: 14.5
   */
  private async logAccess(
    sessionId: string,
    userId: string,
    purpose: string
  ): Promise<void> {
    const filePath = `pii-mappings/${sessionId}.json`;
    
    try {
      const mapping = await this.storage.readJson<PIIMapping>(filePath);
      
      mapping.accessLog.push({
        userId,
        timestamp: new Date().toISOString(),
        purpose
      });

      await this.storage.writeJson(filePath, mapping);
    } catch (error) {
      console.error(`Failed to log PII access for session ${sessionId}:`, error);
    }
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
    const filePath = `pii-mappings/${sessionId}.json`;
    
    try {
      const exists = await this.storage.exists(filePath);
      if (!exists) {
        return [];
      }

      const mapping = await this.storage.readJson<PIIMapping>(filePath);
      return mapping.accessLog;
    } catch (error) {
      console.error(`Failed to retrieve access log for session ${sessionId}:`, error);
      return [];
    }
  }

  /**
   * Delete PII mappings for a session
   * Requirements: 14.5
   */
  async deleteMappings(sessionId: string, userId: string): Promise<void> {
    // Log deletion before removing
    await this.logAccess(sessionId, userId, 'delete_mapping');
    
    const filePath = `pii-mappings/${sessionId}.json`;
    await this.storage.delete(filePath);
  }

  /**
   * Check if PII mappings exist for a session
   */
  async hasMappings(sessionId: string): Promise<boolean> {
    const filePath = `pii-mappings/${sessionId}.json`;
    return await this.storage.exists(filePath);
  }
}
