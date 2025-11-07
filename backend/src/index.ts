import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import decisionMatrixRoutes from './routes/decision-matrix.routes';
import learningRoutes from './routes/learning.routes';
import sessionRoutes from './routes/session.routes';
import processRoutes from './routes/process.routes';
import feedbackRoutes from './routes/feedback.routes';
import voiceRoutes from './routes/voice.routes';
import analyticsRoutes from './routes/analytics.routes';
import promptsRoutes from './routes/prompts.routes';
import auditRoutes from './routes/audit.routes';
import { initializeApplication } from './startup';

config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const dataDir = process.env.DATA_DIR || './data';
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        fileSystem: 'ok',
        dataDirectories: 'ok'
      }
    };

    // Check if data directory is accessible
    try {
      await fs.access(dataDir);
    } catch (error) {
      checks.status = 'degraded';
      checks.checks.fileSystem = 'error';
      checks.checks.dataDirectories = 'Data directory not accessible';
    }

    // Check if required subdirectories exist
    const requiredDirs = [
      'sessions',
      'audit-logs',
      'prompts',
      'audio',
      'analytics',
      'pii-mappings',
      'decision-matrix',
      'learning'
    ];

    for (const dir of requiredDirs) {
      try {
        await fs.access(path.join(dataDir, dir));
      } catch (error) {
        checks.status = 'degraded';
        checks.checks.dataDirectories = `Missing directory: ${dir}`;
        break;
      }
    }

    const statusCode = checks.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(checks);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/process', processRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/decision-matrix', decisionMatrixRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/audit', auditRoutes);

// Initialize application on startup
initializeApplication()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  });
