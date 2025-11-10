import { JsonStorageService } from './storage.service';
import { DecisionMatrix } from '../../../shared/dist';

/**
 * Versioned storage service for prompts and decision matrices
 */
export class VersionedStorageService {
  private jsonStorage: JsonStorageService;

  constructor(jsonStorage: JsonStorageService) {
    this.jsonStorage = jsonStorage;
  }

  /**
   * Save a versioned decision matrix
   */
  async saveDecisionMatrix(matrix: DecisionMatrix): Promise<void> {
    const fileName = `v${matrix.version}.json`;
    const relativePath = `decision-matrix/${fileName}`;
    await this.jsonStorage.writeJson(relativePath, matrix);
  }

  /**
   * Get a specific version of decision matrix
   */
  async getDecisionMatrix(version: string): Promise<DecisionMatrix | null> {
    const fileName = `v${version}.json`;
    const relativePath = `decision-matrix/${fileName}`;
    
    const exists = await this.jsonStorage.exists(relativePath);
    if (!exists) {
      return null;
    }

    return await this.jsonStorage.readJson<DecisionMatrix>(relativePath);
  }

  /**
   * Get the latest (active) decision matrix
   */
  async getLatestDecisionMatrix(): Promise<DecisionMatrix | null> {
    const files = await this.jsonStorage.listFiles('decision-matrix');
    
    if (files.length === 0) {
      return null;
    }

    // Sort by version number (extract from filename)
    const versionFiles = files
      .filter(f => f.startsWith('v') && f.endsWith('.json'))
      .map(f => {
        const versionMatch = f.match(/v([\d.]+)\.json/);
        return {
          file: f,
          version: versionMatch ? versionMatch[1] : '0'
        };
      })
      .sort((a, b) => {
        // Simple version comparison (works for semantic versioning)
        const aParts = a.version.split('.').map(Number);
        const bParts = b.version.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) {
            return bVal - aVal; // Descending order
          }
        }
        return 0;
      });

    if (versionFiles.length === 0) {
      return null;
    }

    const latestFile = versionFiles[0].file;
    return await this.jsonStorage.readJson<DecisionMatrix>(`decision-matrix/${latestFile}`);
  }

  /**
   * List all decision matrix versions
   */
  async listDecisionMatrixVersions(): Promise<string[]> {
    const files = await this.jsonStorage.listFiles('decision-matrix');
    
    return files
      .filter(f => f.startsWith('v') && f.endsWith('.json'))
      .map(f => {
        const versionMatch = f.match(/v([\d.]+)\.json/);
        return versionMatch ? versionMatch[1] : null;
      })
      .filter((v): v is string => v !== null)
      .sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) {
            return bVal - aVal;
          }
        }
        return 0;
      });
  }

  /**
   * Save a versioned prompt template
   */
  async savePrompt(promptId: string, content: string, version?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const versionStr = version || timestamp;
    const fileName = `${promptId}-v${versionStr}.txt`;
    const relativePath = `prompts/${fileName}`;
    
    await this.jsonStorage.writeFile(relativePath, content);
    return versionStr;
  }

  /**
   * Get a specific version of a prompt
   */
  async getPrompt(promptId: string, version?: string): Promise<string | null> {
    if (version) {
      const fileName = `${promptId}-v${version}.txt`;
      const relativePath = `prompts/${fileName}`;
      
      const exists = await this.jsonStorage.exists(relativePath);
      if (!exists) {
        return null;
      }

      return await this.jsonStorage.readFile(relativePath);
    }

    // Get latest version
    const files = await this.jsonStorage.listFiles('prompts');
    const promptFiles = files
      .filter(f => f.startsWith(`${promptId}-v`) && f.endsWith('.txt'))
      .map(f => {
        const versionMatch = f.match(new RegExp(`${promptId}-v([\\d.]+)\\.txt`));
        return {
          file: f,
          version: versionMatch ? versionMatch[1] : '0'
        };
      })
      .sort((a, b) => {
        const aParts = a.version.split('.').map(Number);
        const bParts = b.version.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) {
            return bVal - aVal; // Descending order
          }
        }
        return 0;
      });

    if (promptFiles.length === 0) {
      return null;
    }

    const latestFile = promptFiles[0].file;
    return await this.jsonStorage.readFile(`prompts/${latestFile}`);
  }

  /**
   * List all versions of a prompt
   */
  async listPromptVersions(promptId: string): Promise<string[]> {
    const files = await this.jsonStorage.listFiles('prompts');
    
    return files
      .filter(f => f.startsWith(`${promptId}-v`) && f.endsWith('.txt'))
      .map(f => {
        const versionMatch = f.match(new RegExp(`${promptId}-v([\\d.]+)\\.txt`));
        return versionMatch ? versionMatch[1] : null;
      })
      .filter((v): v is string => v !== null)
      .sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) {
            return bVal - aVal;
          }
        }
        return 0;
      });
  }
}
