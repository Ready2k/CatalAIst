import * as fs from 'fs/promises';
import * as path from 'path';
import { DecisionMatrix, DecisionMatrixSchema } from '../../../shared/types';

/**
 * Generic JSON storage service with file locking and versioning support
 */
export class JsonStorageService {
  private dataDir: string;
  private locks: Map<string, Promise<void>>;

  constructor(dataDir: string = process.env.DATA_DIR || '/data') {
    this.dataDir = dataDir;
    this.locks = new Map();
  }

  /**
   * Acquire a lock for a file path
   */
  private async acquireLock(filePath: string): Promise<() => void> {
    while (this.locks.has(filePath)) {
      await this.locks.get(filePath);
    }

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.locks.set(filePath, lockPromise);

    return () => {
      this.locks.delete(filePath);
      releaseLock!();
    };
  }

  /**
   * Ensure directory exists
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Read plain text file
   */
  async readFile(relativePath: string): Promise<string> {
    const filePath = path.join(this.dataDir, relativePath);
    const release = await this.acquireLock(filePath);

    try {
      return await fs.readFile(filePath, 'utf-8');
    } finally {
      release();
    }
  }

  /**
   * Read JSON file with type safety
   */
  async readJson<T>(relativePath: string): Promise<T> {
    const filePath = path.join(this.dataDir, relativePath);
    const release = await this.acquireLock(filePath);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as T;
    } finally {
      release();
    }
  }

  /**
   * Write plain text file with atomic write (write to temp, then rename)
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    const filePath = path.join(this.dataDir, relativePath);
    const release = await this.acquireLock(filePath);

    try {
      const dirPath = path.dirname(filePath);
      await this.ensureDir(dirPath);

      const tempPath = `${filePath}.tmp`;
      
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filePath);
    } finally {
      release();
    }
  }

  /**
   * Write JSON file with atomic write (write to temp, then rename)
   */
  async writeJson<T>(relativePath: string, data: T): Promise<void> {
    const filePath = path.join(this.dataDir, relativePath);
    const release = await this.acquireLock(filePath);

    try {
      const dirPath = path.dirname(filePath);
      await this.ensureDir(dirPath);

      const tempPath = `${filePath}.tmp`;
      const jsonData = JSON.stringify(data, null, 2);
      
      await fs.writeFile(tempPath, jsonData, 'utf-8');
      await fs.rename(tempPath, filePath);
    } finally {
      release();
    }
  }

  /**
   * Check if file exists
   */
  async exists(relativePath: string): Promise<boolean> {
    const filePath = path.join(this.dataDir, relativePath);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file
   */
  async delete(relativePath: string): Promise<void> {
    const filePath = path.join(this.dataDir, relativePath);
    const release = await this.acquireLock(filePath);

    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    } finally {
      release();
    }
  }

  /**
   * List files in directory
   */
  async listFiles(relativePath: string): Promise<string[]> {
    const dirPath = path.join(this.dataDir, relativePath);
    
    try {
      const files = await fs.readdir(dirPath);
      return files;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}
