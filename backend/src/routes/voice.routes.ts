import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { OpenAIService } from '../services/openai.service';
import { SessionStorageService } from '../services/session-storage.service';
import { AuditLogService } from '../services/audit-log.service';
import { JsonStorageService } from '../services/storage.service';
import { AudioTranscription } from '../../../shared/dist';

const router = Router();

// Initialize services
const dataDir = process.env.DATA_DIR || './data';
const audioDir = path.join(dataDir, 'audio');
const cacheDir = path.join(audioDir, 'cache');
const jsonStorage = new JsonStorageService(dataDir);
const sessionStorage = new SessionStorageService(jsonStorage);
const openaiService = new OpenAIService();
const auditLogService = new AuditLogService(dataDir);

// Ensure audio directories exist
const ensureDirectories = async () => {
  await fs.mkdir(audioDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });
};
ensureDirectories();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(audioDir, { recursive: true });
    cb(null, audioDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedFormats = ['.wav', '.mp3', '.m4a', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format. Allowed formats: ${allowedFormats.join(', ')}`));
    }
  }
});

/**
 * POST /api/voice/transcribe
 * Transcribe audio to text using OpenAI Whisper
 * Requirements: 16.1, 16.2, 16.4, 16.5
 */
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  let audioFilePath: string | undefined;
  
  try {
    const { sessionId, apiKey, userId = 'anonymous' } = req.body;

    if (!req.file) {
      return res.status(400).json({
        error: 'Missing audio file',
        message: 'Audio file is required'
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'Missing API key',
        message: 'OpenAI API key is required'
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required'
      });
    }

    audioFilePath = req.file.path;

    // Check audio duration (5 minutes max = 300 seconds)
    // Note: We can't easily check duration without additional libraries,
    // so we rely on file size limit for now
    
    const startTime = Date.now();

    // Create a read stream for OpenAI (more efficient than loading entire file into memory)
    const fileStream = require('fs').createReadStream(audioFilePath);

    // Transcribe using OpenAI Whisper
    const transcriptionResult = await openaiService.transcribe(fileStream, { 
      provider: 'openai',
      apiKey 
    });

    const latencyMs = Date.now() - startTime;

    // Create transcription record
    const transcription: AudioTranscription = {
      transcriptionId: uuidv4(),
      sessionId,
      audioFilePath,
      transcription: transcriptionResult.transcription,
      durationSeconds: transcriptionResult.duration,
      timestamp: new Date().toISOString()
    };

    // Log to audit
    await auditLogService.log({
      sessionId,
      timestamp: new Date().toISOString(),
      eventType: 'input',
      userId,
      data: {
        type: 'voice_transcription',
        transcription: transcriptionResult.transcription,
        audioFile: path.basename(audioFilePath)
      },
      piiScrubbed: false,
      metadata: {
        latencyMs,
        llmProvider: 'openai',
        modelVersion: 'whisper-1'
      }
    });

    // Delete audio file after transcription
    await fs.unlink(audioFilePath);

    res.json({
      transcriptionId: transcription.transcriptionId,
      transcription: transcription.transcription,
      durationSeconds: transcription.durationSeconds,
      timestamp: transcription.timestamp
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);

    // Clean up audio file on error
    if (audioFilePath) {
      try {
        await fs.unlink(audioFilePath);
      } catch (unlinkError) {
        console.error('Error deleting audio file:', unlinkError);
      }
    }

    if (error instanceof Error && error.message.includes('Unsupported audio format')) {
      return res.status(400).json({
        error: 'Unsupported audio format',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to transcribe audio',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/voice/synthesize
 * Synthesize speech from text using OpenAI TTS
 * Requirements: 17.1, 17.2, 17.3, 17.5, 17.6, 18.3
 */
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'alloy', apiKey, sessionId, userId = 'anonymous' } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Missing text',
        message: 'Text is required for synthesis'
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'Missing API key',
        message: 'OpenAI API key is required'
      });
    }

    // Validate voice selection
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!validVoices.includes(voice)) {
      return res.status(400).json({
        error: 'Invalid voice',
        message: `Voice must be one of: ${validVoices.join(', ')}`
      });
    }

    // Check cache first
    const cacheKey = `${Buffer.from(text).toString('base64').substring(0, 50)}_${voice}`;
    const cachedFilePath = path.join(cacheDir, `${cacheKey}.mp3`);

    let audioBuffer: Buffer;
    let fromCache = false;

    try {
      // Try to read from cache
      audioBuffer = await fs.readFile(cachedFilePath);
      fromCache = true;
      
      // Update file access time
      await fs.utimes(cachedFilePath, new Date(), new Date());
    } catch (cacheError) {
      // Not in cache, synthesize new audio
      const startTime = Date.now();
      
      audioBuffer = await openaiService.synthesize(text, voice as any, { 
        provider: 'openai',
        apiKey 
      });
      
      const latencyMs = Date.now() - startTime;

      // Cache the audio
      try {
        await fs.writeFile(cachedFilePath, audioBuffer);
      } catch (writeError) {
        console.error('Error caching audio:', writeError);
        // Continue even if caching fails
      }

      // Log to audit
      if (sessionId) {
        await auditLogService.log({
          sessionId,
          timestamp: new Date().toISOString(),
          eventType: 'classification',
          userId,
          data: {
            type: 'voice_synthesis',
            text,
            voice,
            cached: false
          },
          piiScrubbed: false,
          metadata: {
            latencyMs,
            llmProvider: 'openai',
            modelVersion: 'tts-1'
          }
        });
      }
    }

    // Set response headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('X-From-Cache', fromCache.toString());
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    
    res.status(500).json({
      error: 'Failed to synthesize speech',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/voice/cache
 * Clean up cached audio files older than 7 days
 * Requirements: 17.5, 17.6
 */
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const files = await fs.readdir(cacheDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(cacheDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtimeMs < sevenDaysAgo) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }

    res.json({
      message: 'Cache cleanup completed',
      deletedFiles: deletedCount
    });
  } catch (error) {
    console.error('Error cleaning cache:', error);
    
    res.status(500).json({
      error: 'Failed to clean cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
