import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { resolve } from 'path';
import decisionMatrixRoutes from './routes/decision-matrix.routes';
import learningRoutes from './routes/learning.routes';
import sessionRoutes from './routes/session.routes';
import publicRoutes from './routes/public.routes';
import processRoutes from './routes/process.routes';
import feedbackRoutes from './routes/feedback.routes';
import voiceRoutes from './routes/voice.routes';
import analyticsRoutes from './routes/analytics.routes';
import promptsRoutes from './routes/prompts.routes';
import auditRoutes from './routes/audit.routes';
import authRoutes from './routes/auth.routes';
import subjectsRoutes from './routes/subjects.routes';
import adminReviewRoutes from './routes/admin-review.routes';
import novaSonicRoutes, { initializeNovaSonicWebSocket } from './routes/nova-sonic-websocket.routes';
import { authenticateToken, requireRole } from './middleware/auth.middleware';
import { initializeApplication } from './startup';
import http from 'http';

// Load environment variables from project root
// Try multiple paths to handle different execution contexts
const envPaths = [
  resolve(__dirname, '../../../.env'),  // From dist/backend/src/
  resolve(__dirname, '../../.env'),     // From backend/src/
  resolve(process.cwd(), '.env'),       // From project root
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = config({ path: envPath });
  if (!result.error) {
    console.log(`Loaded environment from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('Warning: No .env file found, using environment variables or defaults');
}

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Log configuration on startup
console.log('Server Configuration:');
console.log(`- Port: ${PORT}`);
console.log(`- Node Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`- Data Directory: ${process.env.DATA_DIR || './data'}`);
console.log(`- Allowed Origins: ${process.env.ALLOWED_ORIGINS || 'http://localhost:4001,http://localhost:3000'}`);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

// CORS configuration - restrict to specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:4001', 'http://localhost:3000', 'http://localhost:80'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-API-Key',
    'x-aws-access-key-id',
    'x-aws-secret-access-key',
    'x-aws-session-token',
    'x-aws-region'
  ],
  exposedHeaders: ['X-Request-ID']
}));

// Request ID middleware
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || require('crypto').randomUUID();
  req.headers['x-request-id'] = requestId as string;
  res.setHeader('X-Request-ID', requestId as string);
  next();
});

// Body parser with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' // Skip rate limiting for health checks
});

// Strict rate limiter for LLM endpoints (expensive operations)
const llmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many LLM requests',
    message: 'Please slow down your requests'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth rate limiter (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes (allows for logout/login cycles)
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful logins
});

// Apply rate limiters
app.use('/api', apiLimiter);
app.use('/api/process', llmLimiter);
app.use('/api/voice', llmLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

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

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);

// Protected routes (authentication required)
app.use('/api/sessions', authenticateToken, sessionRoutes);
app.use('/api/process', authenticateToken, processRoutes);
app.use('/api/feedback', authenticateToken, feedbackRoutes);
app.use('/api/decision-matrix', authenticateToken, decisionMatrixRoutes);
app.use('/api/learning', authenticateToken, learningRoutes);
app.use('/api/voice', authenticateToken, voiceRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/prompts', authenticateToken, promptsRoutes);
app.use('/api/audit', authenticateToken, auditRoutes);
app.use('/api/subjects', authenticateToken, subjectsRoutes);
app.use('/api/admin', authenticateToken, requireRole('admin'), adminReviewRoutes);
app.use('/api/nova-sonic', authenticateToken, novaSonicRoutes);

// Initialize application on startup
initializeApplication()
  .then(() => {
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize Nova 2 Sonic WebSocket
    initializeNovaSonicWebSocket(server);
    
    server.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`✅ Backend server running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   API endpoint: http://localhost:${PORT}/api`);
      console.log(`   Nova 2 Sonic WebSocket: ws://localhost:${PORT}/api/nova-sonic/stream`);
      if (PORT !== 4000) {
        console.log(`⚠️  WARNING: Running on port ${PORT} instead of default 4000`);
        console.log(`   Check your .env file or PORT environment variable`);
      }
      console.log('='.repeat(60));
    });
  })
  .catch((error) => {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  });
