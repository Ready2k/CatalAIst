import { Router, Request, Response } from 'express';
import { OpenAIService } from '../services/openai.service';
import { BedrockService } from '../services/bedrock.service';
import { AuditLogService } from '../services/audit-log.service';

const router = Router();

const dataDir = process.env.DATA_DIR || './data';
const openaiService = new OpenAIService();
const bedrockService = new BedrockService();
const auditLogService = new AuditLogService(dataDir);

/**
 * GET /api/public/models
 * List available models (OpenAI or Bedrock)
 * Public endpoint - no authentication required
 * Used during initial configuration before login
 */
router.get('/models', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const provider = (req.query.provider as string) || 'openai';
  const awsRegion = req.headers['x-aws-region'] as string || req.query.awsRegion as string || 'us-east-1';
  const useRegionalInference = req.headers['x-use-regional-inference'] === 'true' || req.query.useRegionalInference === 'true';
  const regionalInferenceEndpoint = req.headers['x-regional-inference-endpoint'] as string || req.query.regionalInferenceEndpoint as string;

  console.log('[PublicRoutes] /models request:', {
    provider,
    awsRegion,
    useRegionalInference,
    regionalInferenceEndpoint,
    headers: {
      'x-aws-region': req.headers['x-aws-region'],
      'x-use-regional-inference': req.headers['x-use-regional-inference'],
      'x-regional-inference-endpoint': req.headers['x-regional-inference-endpoint']
    }
  });

  try {
    if (provider === 'openai') {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        // Log failed attempt
        await auditLogService.log({
          sessionId: 'public',
          timestamp: new Date().toISOString(),
          eventType: 'model_list_error',
          userId: 'anonymous',
          data: {
            provider: 'openai',
            error: 'Missing API key',
            ipAddress: req.ip
          },
          piiScrubbed: false
        });

        return res.status(400).json({
          error: 'Missing API key',
          message: 'OpenAI API key is required'
        });
      }

      const models = await openaiService.listModels({ provider: 'openai', apiKey });

      // Filter to only show relevant models for classification
      const relevantModels = models.filter(model =>
        model.id.includes('gpt-4') ||
        model.id.includes('gpt-3.5') ||
        model.id.includes('o1')
      );

      // Log successful fetch
      await auditLogService.log({
        sessionId: 'public',
        timestamp: new Date().toISOString(),
        eventType: 'model_list_success',
        userId: 'anonymous',
        data: {
          provider: 'openai',
          modelCount: relevantModels.length,
          models: relevantModels.map(m => m.id),
          duration: Date.now() - startTime,
          ipAddress: req.ip
        },
        piiScrubbed: false
      });

      res.json({
        models: relevantModels
      });
    } else if (provider === 'bedrock') {
      // Get AWS credentials from headers or query params
      const awsAccessKeyId = req.headers['x-aws-access-key-id'] as string || req.query.awsAccessKeyId as string;
      const awsSecretAccessKey = req.headers['x-aws-secret-access-key'] as string || req.query.awsSecretAccessKey as string;
      const awsSessionToken = req.headers['x-aws-session-token'] as string || req.query.awsSessionToken as string;

      if (!awsAccessKeyId || !awsSecretAccessKey) {
        // Log failed attempt
        await auditLogService.log({
          sessionId: 'public',
          timestamp: new Date().toISOString(),
          eventType: 'model_list_error',
          userId: 'anonymous',
          data: {
            provider: 'bedrock',
            region: awsRegion,
            error: 'Missing AWS credentials',
            ipAddress: req.ip
          },
          piiScrubbed: false
        });

        return res.status(400).json({
          error: 'Missing AWS credentials',
          message: 'AWS Access Key ID and Secret Access Key are required for Bedrock'
        });
      }

      // Fetch models dynamically from AWS Bedrock
      const models = await bedrockService.listModels({
        provider: 'bedrock',
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken,
        awsRegion,
        useRegionalInference,
        regionalInferenceEndpoint
      });

      // Log successful fetch
      await auditLogService.log({
        sessionId: 'public',
        timestamp: new Date().toISOString(),
        eventType: 'model_list_success',
        userId: 'anonymous',
        data: {
          provider: 'bedrock',
          region: awsRegion,
          modelCount: models.length,
          models: models.map(m => m.id),
          duration: Date.now() - startTime,
          ipAddress: req.ip
        },
        piiScrubbed: false
      });

      res.json({
        models
      });
    } else {
      // Log invalid provider
      await auditLogService.log({
        sessionId: 'public',
        timestamp: new Date().toISOString(),
        eventType: 'model_list_error',
        userId: 'anonymous',
        data: {
          provider,
          error: 'Invalid provider',
          ipAddress: req.ip
        },
        piiScrubbed: false
      });

      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Provider must be "openai" or "bedrock"'
      });
    }
  } catch (error) {
    console.error('Error listing models:', error);

    // Log the error with full details
    await auditLogService.log({
      sessionId: 'public',
      timestamp: new Date().toISOString(),
      eventType: 'model_list_error',
      userId: 'anonymous',
      data: {
        provider,
        region: awsRegion,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
        ipAddress: req.ip
      },
      piiScrubbed: false
    });

    res.status(500).json({
      error: 'Failed to list models',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/public/nova-sonic-test
 * Serve microphone test page with injected credentials
 * Public endpoint for local testing
 */
router.get('/nova-sonic-test', (req: Request, res: Response) => {
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsSessionToken = process.env.AWS_SESSION_TOKEN || '';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    return res.status(500).send('AWS Credentials not configured on server');
  }

  const jsContent = `
/**
 * Microphone Test Script for Nova 2 Sonic
 * Handles AudioContext, Downsampling, and WebSockets
 */

const WS_URL = 'ws://localhost:4000/api/nova-sonic/stream';
let ws = null;
let audioContext = null;
let mediaStream = null;
let workletNode = null;
let isRecording = false;
let sessionId = null;

// AWS Credentials injected by server
const AWS_CONFIG = {
  accessKeyId: "${awsAccessKeyId}",
  secretAccessKey: "${awsSecretAccessKey}",
  sessionToken: "${awsSessionToken}"
};

// UI Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('connectionStatus');
const transcriptDiv = document.getElementById('transcription');
const micLevelDiv = document.getElementById('micLevel');
const debugLog = document.getElementById('debugLog');

function log(msg) {
    console.log(msg);
    const line = document.createElement('div');
    line.textContent = \`\${new Date().toLocaleTimeString()} - \${msg}\`;
    debugLog.prepend(line);
}

function updateStatus(text, type) {
    statusDiv.textContent = text;
    statusDiv.className = \`status \${type}\`;
}

// Initialize WebSocket
async function connectWebSocket() {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(WS_URL);
        ws = socket;

        socket.onopen = () => {
            log('WebSocket Connected');
            updateStatus('Connected', 'connected');
            
            const initMsg = {
                type: 'initialize',
                awsAccessKeyId: AWS_CONFIG.accessKeyId,
                awsSecretAccessKey: AWS_CONFIG.secretAccessKey,
                awsSessionToken: AWS_CONFIG.sessionToken || undefined,
                awsRegion: 'us-east-1',
                systemPrompt: 'You are a helpful assistant.',
                userId: 'test-user-browser'
            };
            socket.send(JSON.stringify(initMsg));
        };

        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            handleMessage(msg);
        };

        socket.onerror = (error) => {
            log('WebSocket Error');
            updateStatus('Connection Error', 'error');
            reject(error);
        };

        socket.onclose = () => {
            log('WebSocket Closed');
            updateStatus('Disconnected', '');
            if (ws === socket) {
                ws = null;
            }
        };
        
        resolve(socket);
    });
}

async function handleMessage(msg) {
    if (msg.type === 'initialized') {
        log(\`Session Initialized: \${msg.sessionId}\`);
        sessionId = msg.sessionId;
        startBtn.disabled = false;
        updateStatus('Ready to Record', 'connected');
    } else if (msg.type === 'transcription') {
        transcriptDiv.textContent += \`\\n[You]: \${msg.text}\`;
    } else if (msg.type === 'text_response') {
        transcriptDiv.textContent += \`\\n[Nova]: \${msg.text}\`;
    } else if (msg.type === 'error') {
        log(\`Error: \${msg.error}\`);
        updateStatus(\`Error: \${msg.error}\`, 'error');
    }
}

// Audio Handling
async function startRecording() {
    try {
        // Force new connection for each recording session to ensure fresh state
        if (ws) {
            ws.close();
            ws = null;
        }
        
        await connectWebSocket();
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        
        // Load AudioWorklet for processing
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                channelCount: 1, 
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true
            } 
        });
        
        const source = audioContext.createMediaStreamSource(mediaStream);
        
        // Create ScriptProcessor (BufferSize, InputChannels, OutputChannels)
        // 4096 samples = ~256ms at 16kHz
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e) => {
            if (!isRecording) return;
            
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate volume for meter
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            micLevelDiv.style.width = Math.min(100, rms * 400) + '%';

            // Convert Float32 to Int16
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                // Clamp and scale
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            // Send via WebSocket
            // Convert Int16Array to Base64 string
            const buffer = new Uint8Array(pcmData.buffer);
            let binary = '';
            for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
            }
            const base64 = btoa(binary);
            
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'audio_chunk',
                    audio: base64,
                    isComplete: false
                }));
            }
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination); // Required for script processor to run
        
        workletNode = processor; // Store reference
        isRecording = true;
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
        updateStatus('Recording...', 'recording');
        
        log('Recording started');
        
    } catch (err) {
        log('Error starting recording: ' + err.message);
        updateStatus('Mic Error', 'error');
    }
}

function stopRecording() {
    isRecording = false;
    
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    if (audioContext) {
        audioContext.close();
    }
    if (workletNode) {
        workletNode.disconnect();
    }
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateStatus('Stopped', 'connected');
    
    // Send completion signal
    if (ws && ws.readyState === WebSocket.OPEN) {
         ws.send(JSON.stringify({
            type: 'audio_chunk',
            audio: '', // Empty audio
            isComplete: true
        }));
    }
    
    log('Recording stopped');
}

startBtn.onclick = startRecording;
stopBtn.onclick = stopRecording;
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova 2 Sonic Microphone Test</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { margin-top: 0; color: #333; }
        .controls {
            display: flex;
            gap: 1rem;
            margin: 2rem 0;
        }
        button {
            padding: 10px 20px;
            font-size: 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
        }
        #startBtn { background: #007bff; color: white; }
        #startBtn:disabled { background: #ccc; }
        #stopBtn { background: #dc3545; color: white; }
        #stopBtn:disabled { background: #ccc; }
        
        .status {
            margin-bottom: 1rem;
            padding: 10px;
            border-radius: 4px;
            background: #e9ecef;
        }
        .status.connected { background: #d4edda; color: #155724; }
        .status.error { background: #f8d7da; color: #721c24; }
        .status.recording { background: #fff3cd; color: #856404; animation: pulse 1.5s infinite; }

        .transcription-box {
            border: 1px solid #ddd;
            padding: 1rem;
            min-height: 200px;
            background: #fafafa;
            border-radius: 4px;
            margin-top: 1rem;
            white-space: pre-wrap;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
        }
        
        .mic-meter {
            height: 4px;
            background: #eee;
            margin-top: 1rem;
            border-radius: 2px;
            overflow: hidden;
        }
        .mic-level {
            height: 100%;
            background: #28a745;
            width: 0%;
            transition: width 0.1s;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Nova 2 Sonic Mic Test</h1>
        <div id="connectionStatus" class="status">Disconnected</div>
        <div class="controls">
            <button id="startBtn">Start Recording</button>
            <button id="stopBtn" disabled>Stop Recording</button>
        </div>
        <div class="mic-meter">
            <div id="micLevel" class="mic-level"></div>
        </div>
        <h3>Conversation:</h3>
        <div id="transcription" class="transcription-box"></div>
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <strong>Debug Info:</strong>
            <pre id="debugLog"></pre>
        </div>
    </div>
    <script>
    ${jsContent}
    </script>
</body>
</html>`;

  res.send(html);
});

export default router;
