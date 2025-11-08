import { Router, Request, Response } from 'express';
import { VersionedStorageService } from '../services/versioned-storage.service';
import { JsonStorageService } from '../services/storage.service';

const router = Router();

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const jsonStorage = new JsonStorageService(dataDir);
const versionedStorage = new VersionedStorageService(jsonStorage);

/**
 * GET /api/prompts
 * Get all available prompts with their latest versions
 * Requirements: 6.1
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const promptTypes = ['classification', 'clarification', 'attribute-extraction', 'decision-matrix-generation'];
    const prompts = [];

    for (const type of promptTypes) {
      try {
        const content = await versionedStorage.getPrompt(type);
        const versions = await versionedStorage.listPromptVersions(type);
        
        if (content) {
          prompts.push({
            id: type,
            content,
            version: versions.length > 0 ? versions[0] : '1.0',
            availableVersions: versions.length
          });
        }
      } catch (error) {
        console.warn(`Prompt ${type} not found, skipping`);
      }
    }

    res.json({
      prompts,
      count: prompts.length
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({
      error: 'Failed to fetch prompts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/prompts/:id
 * Get a specific prompt by ID (returns latest version)
 * Requirements: 6.1
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const content = await versionedStorage.getPrompt(id);

    if (!content) {
      return res.status(404).json({
        error: 'Prompt not found',
        promptId: id,
        message: `No prompt found with ID: ${id}`
      });
    }

    const versions = await versionedStorage.listPromptVersions(id);

    res.json({
      id,
      content,
      version: versions.length > 0 ? versions[0] : '1.0',
      availableVersions: versions.length
    });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({
      error: 'Failed to fetch prompt',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/prompts/:id/versions
 * Get all versions of a specific prompt
 * Requirements: 6.3
 */
router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const versions = await versionedStorage.listPromptVersions(id);

    if (!versions || versions.length === 0) {
      return res.status(404).json({
        error: 'No versions found',
        promptId: id
      });
    }

    res.json({
      promptId: id,
      versions: versions.map((version: string) => ({
        version
      })),
      count: versions.length
    });
  } catch (error) {
    console.error('Error fetching prompt versions:', error);
    res.status(500).json({
      error: 'Failed to fetch prompt versions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/prompts/:id/versions/:version
 * Get a specific version of a prompt
 * Requirements: 6.1, 6.3
 */
router.get('/:id/versions/:version', async (req: Request, res: Response) => {
  try {
    const { id, version } = req.params;

    const content = await versionedStorage.getPrompt(id, version);

    if (!content) {
      return res.status(404).json({
        error: 'Prompt version not found',
        promptId: id,
        version
      });
    }

    res.json({
      id,
      content,
      version
    });
  } catch (error) {
    console.error('Error fetching prompt version:', error);
    res.status(500).json({
      error: 'Failed to fetch prompt version',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/prompts/:id
 * Update a prompt (creates new version)
 * Requirements: 6.2, 6.3, 6.4
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, userId = 'admin' } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        error: 'Invalid content',
        message: 'Prompt content is required and must be a string'
      });
    }

    // Validate prompt content (basic validation)
    if (content.trim().length < 10) {
      return res.status(400).json({
        error: 'Invalid prompt',
        message: 'Prompt content must be at least 10 characters'
      });
    }

    // Check for required placeholders based on prompt type
    const validationResult = validatePromptContent(id, content);
    if (!validationResult.valid) {
      return res.status(400).json({
        error: 'Invalid prompt syntax',
        message: validationResult.message
      });
    }

    // Save new version
    const newVersion = await versionedStorage.savePrompt(id, content);

    // Log the prompt update to console (audit logging for system events not yet implemented)
    console.log(`Prompt updated: ${id} version ${newVersion} by ${userId}`);

    res.json({
      message: 'Prompt updated successfully',
      promptId: id,
      version: newVersion,
      createdAt: new Date().toISOString(),
      createdBy: userId
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({
      error: 'Failed to update prompt',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Validate prompt content based on prompt type
 */
function validatePromptContent(promptId: string, content: string): { valid: boolean; message?: string } {
  // Basic validation - ensure content is not empty
  if (!content || content.trim().length === 0) {
    return { valid: false, message: 'Prompt content cannot be empty' };
  }

  // Type-specific validation
  switch (promptId) {
    case 'classification':
      // Should mention categories
      if (!content.includes('Eliminate') || !content.includes('Simplify')) {
        return {
          valid: false,
          message: 'Classification prompt must reference transformation categories'
        };
      }
      break;

    case 'clarification':
      // Should mention questions
      if (!content.toLowerCase().includes('question')) {
        return {
          valid: false,
          message: 'Clarification prompt should reference generating questions'
        };
      }
      break;

    case 'attribute-extraction':
      // Should mention attributes
      if (!content.toLowerCase().includes('attribute')) {
        return {
          valid: false,
          message: 'Attribute extraction prompt should reference extracting attributes'
        };
      }
      break;

    case 'decision-matrix-generation':
      // Should mention decision matrix and rules
      if (!content.toLowerCase().includes('decision matrix') && !content.toLowerCase().includes('rules')) {
        return {
          valid: false,
          message: 'Decision matrix generation prompt should reference decision matrix and rules'
        };
      }
      break;

    default:
      // Unknown prompt type - allow it but warn
      console.warn(`Unknown prompt type: ${promptId}`);
  }

  return { valid: true };
}

export default router;
