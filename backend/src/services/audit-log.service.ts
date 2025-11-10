import * as fs from 'fs/promises';
import * as path from 'path';
import { AuditLogEntry } from '../../../shared/dist';

/**
 * JSONL audit log service with append-only writes and daily rotation
 */
export class AuditLogService {
  private dataDir: string;
  private writeQueue: Promise<void>;

  constructor(dataDir: string = process.env.DATA_DIR || '/data') {
    this.dataDir = dataDir;
    this.writeQueue = Promise.resolve();
  }

  /**
   * Ensure audit-logs directory exists
   */
  private async ensureDir(): Promise<void> {
    const auditDir = path.join(this.dataDir, 'audit-logs');
    try {
      await fs.mkdir(auditDir, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get the current log file path based on date
   */
  private getLogFilePath(date: Date = new Date()): string {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `${dateStr}.jsonl`;
    return path.join(this.dataDir, 'audit-logs', fileName);
  }

  /**
   * Append a log entry to the audit log (async, queued)
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 21.1
   */
  async log(entry: AuditLogEntry): Promise<void> {
    // Ensure timestamp has millisecond precision
    const entryWithTimestamp = {
      ...entry,
      timestamp: new Date().toISOString() // ISO format includes milliseconds
    };

    // Queue the write operation to ensure sequential writes
    this.writeQueue = this.writeQueue.then(async () => {
      await this.ensureDir();
      const logFilePath = this.getLogFilePath();
      const logLine = JSON.stringify(entryWithTimestamp) + '\n';
      
      try {
        await fs.appendFile(logFilePath, logLine, 'utf-8');
      } catch (error) {
        console.error('Failed to write audit log:', error);
        // Retry once after a short delay
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          await fs.appendFile(logFilePath, logLine, 'utf-8');
        } catch (retryError) {
          console.error('Failed to write audit log after retry:', retryError);
          throw retryError;
        }
      }
    });

    return this.writeQueue;
  }

  /**
   * Log user input event
   * Requirements: 5.1, 21.2
   */
  async logUserInput(
    sessionId: string,
    userId: string,
    processDescription: string,
    scrubbedDescription: string,
    piiScrubbed: boolean,
    metadata?: { [key: string]: any }
  ): Promise<void> {
    const entry: AuditLogEntry = {
      sessionId,
      timestamp: new Date().toISOString(),
      eventType: 'input',
      userId,
      data: {
        processDescription: scrubbedDescription,
        originalLength: processDescription.length,
        scrubbedLength: scrubbedDescription.length
      },
      piiScrubbed,
      metadata: metadata || {}
    };

    return this.log(entry);
  }

  /**
   * Log clarification event
   * Requirements: 5.2, 21.2
   */
  async logClarification(
    sessionId: string,
    userId: string,
    questions: string[],
    answers: string[],
    scrubbedQuestions: string[],
    scrubbedAnswers: string[],
    piiScrubbed: boolean,
    modelPrompt?: string,
    modelResponse?: string,
    metadata?: { [key: string]: any }
  ): Promise<void> {
    const entry: AuditLogEntry = {
      sessionId,
      timestamp: new Date().toISOString(),
      eventType: 'clarification',
      userId,
      data: {
        questions: scrubbedQuestions,
        answers: scrubbedAnswers,
        questionCount: questions.length
      },
      modelPrompt,
      modelResponse,
      piiScrubbed,
      metadata: metadata || {}
    };

    return this.log(entry);
  }

  /**
   * Log classification event
   * Requirements: 5.2, 21.2, 21.3, 21.4
   */
  async logClassification(
    sessionId: string,
    userId: string,
    classification: any,
    decisionMatrixVersion: string | null,
    decisionMatrixEvaluation: any | null,
    modelPrompt: string,
    modelResponse: string,
    piiScrubbed: boolean,
    metadata?: { [key: string]: any }
  ): Promise<void> {
    const entry: AuditLogEntry = {
      sessionId,
      timestamp: new Date().toISOString(),
      eventType: 'classification',
      userId,
      data: {
        classification,
        decisionMatrixVersion,
        decisionMatrixEvaluation,
        triggeredRules: decisionMatrixEvaluation?.triggeredRules || [],
        overridden: decisionMatrixEvaluation?.overridden || false
      },
      modelPrompt,
      modelResponse,
      piiScrubbed,
      metadata: metadata || {}
    };

    return this.log(entry);
  }

  /**
   * Log feedback event
   * Requirements: 5.3, 21.2
   */
  async logFeedback(
    sessionId: string,
    userId: string,
    feedback: any,
    piiScrubbed: boolean,
    metadata?: { [key: string]: any }
  ): Promise<void> {
    const entry: AuditLogEntry = {
      sessionId,
      timestamp: new Date().toISOString(),
      eventType: 'feedback',
      userId,
      data: {
        confirmed: feedback.confirmed,
        correctedCategory: feedback.correctedCategory,
        originalCategory: feedback.originalCategory
      },
      piiScrubbed,
      metadata: metadata || {}
    };

    return this.log(entry);
  }

  /**
   * Log rating event
   * Requirements: 5.3, 21.2
   */
  async logRating(
    sessionId: string,
    userId: string,
    rating: any,
    scrubbedComments: string | undefined,
    piiScrubbed: boolean,
    metadata?: { [key: string]: any }
  ): Promise<void> {
    const entry: AuditLogEntry = {
      sessionId,
      timestamp: new Date().toISOString(),
      eventType: 'rating',
      userId,
      data: {
        rating: rating.rating,
        comments: scrubbedComments,
        hasComments: !!rating.comments
      },
      piiScrubbed,
      metadata: metadata || {}
    };

    return this.log(entry);
  }

  /**
   * Read all log entries for a specific date
   */
  async readLogs(date: Date = new Date()): Promise<AuditLogEntry[]> {
    const logFilePath = this.getLogFilePath(date);
    
    try {
      const content = await fs.readFile(logFilePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      
      return lines.map(line => {
        try {
          return JSON.parse(line) as AuditLogEntry;
        } catch (error) {
          console.error('Failed to parse log line:', line, error);
          return null;
        }
      }).filter((entry): entry is AuditLogEntry => entry !== null);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Read logs for a date range
   */
  async readLogsRange(startDate: Date, endDate: Date): Promise<AuditLogEntry[]> {
    const logs: AuditLogEntry[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayLogs = await this.readLogs(currentDate);
      logs.push(...dayLogs);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return logs;
  }

  /**
   * Read logs for a specific session
   */
  async readSessionLogs(sessionId: string, startDate?: Date, endDate?: Date): Promise<AuditLogEntry[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const end = endDate || new Date();
    
    const allLogs = await this.readLogsRange(start, end);
    return allLogs.filter(log => log.sessionId === sessionId);
  }

  /**
   * List all available log files
   */
  async listLogFiles(): Promise<string[]> {
    const auditDir = path.join(this.dataDir, 'audit-logs');
    
    try {
      const files = await fs.readdir(auditDir);
      return files
        .filter(f => f.endsWith('.jsonl'))
        .sort()
        .reverse(); // Most recent first
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get log file size in bytes
   */
  async getLogFileSize(date: Date = new Date()): Promise<number> {
    const logFilePath = this.getLogFilePath(date);
    
    try {
      const stats = await fs.stat(logFilePath);
      return stats.size;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return 0;
      }
      throw error;
    }
  }

  /**
   * Get audit logs for a specific date
   */
  async getLogsByDate(dateStr: string): Promise<AuditLogEntry[]> {
    try {
      const date = new Date(dateStr);
      const filePath = this.getLogFilePath(date);
      
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      
      return lines.map(line => JSON.parse(line));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return []; // No logs for this date
      }
      throw error;
    }
  }

  /**
   * Get audit logs for a specific session across all dates
   */
  async getLogsBySession(sessionId: string): Promise<AuditLogEntry[]> {
    try {
      const auditDir = path.join(this.dataDir, 'audit-logs');
      const files = await fs.readdir(auditDir);
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
      
      const allLogs: AuditLogEntry[] = [];
      
      for (const file of jsonlFiles) {
        const filePath = path.join(auditDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.length > 0);
        
        const logs = lines
          .map(line => JSON.parse(line))
          .filter((log: AuditLogEntry) => log.sessionId === sessionId);
        
        allLogs.push(...logs);
      }
      
      // Sort by timestamp
      return allLogs.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error reading session logs:', error);
      return [];
    }
  }

  /**
   * Get list of dates that have audit logs
   */
  async getAvailableDates(): Promise<string[]> {
    try {
      const auditDir = path.join(this.dataDir, 'audit-logs');
      const files = await fs.readdir(auditDir);
      
      const dates = files
        .filter(f => f.endsWith('.jsonl'))
        .map(f => f.replace('.jsonl', ''))
        .sort()
        .reverse(); // Most recent first
      
      return dates;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}
