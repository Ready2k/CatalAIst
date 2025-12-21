import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { NovaSonicWebSocketService } from '../services/nova-sonic-websocket.service';
import { AuditLogService } from '../services/audit-log.service';

/**
 * Nova 2 Sonic WebSocket Routes
 * 
 * Handles WebSocket connections for real-time bidirectional streaming
 * with Amazon Nova 2 Sonic model.
 */

const router = Router();
const dataDir = process.env.DATA_DIR || './data';
const auditLogService = new AuditLogService(dataDir);
const novaSonicService = new NovaSonicWebSocketService();

// Store active WebSocket connections
const activeConnections = new Map<string, {
  ws: WebSocket;
  sessionId: string;
  userId: string;
  config: any;
}>();

/**
 * Initialize WebSocket server for Nova 2 Sonic
 */
export function initializeNovaSonicWebSocket(server: any): void {
  const wss = new WebSocketServer({ 
    server,
    path: '/api/nova-sonic/stream'
  });

  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    const connectionId = generateConnectionId();
    console.log(`[Nova 2 Sonic WebSocket] New connection: ${connectionId}`);

    let sessionId: string | null = null;
    let userId = 'anonymous';
    let config: any = null;

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'initialize':
            await handleInitialize(ws, connectionId, message);
            break;
            
          case 'audio_chunk':
            await handleAudioChunk(ws, connectionId, message);
            break;
            
          case 'text_message':
            await handleTextMessage(ws, connectionId, message);
            break;
            
          case 'end_conversation':
            await handleEndConversation(ws, connectionId);
            break;
            
          default:
            ws.send(JSON.stringify({
              type: 'error',
              error: `Unknown message type: ${message.type}`
            }));
        }
        
      } catch (error) {
        console.error(`[Nova 2 Sonic WebSocket] Error processing message:`, error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    });

    ws.on('close', async () => {
      console.log(`[Nova 2 Sonic WebSocket] Connection closed: ${connectionId}`);
      await cleanup(connectionId);
    });

    ws.on('error', async (error) => {
      console.error(`[Nova 2 Sonic WebSocket] Connection error:`, error);
      await cleanup(connectionId);
    });

    // Handle initialize message
    async function handleInitialize(ws: WebSocket, connectionId: string, message: any) {
      try {
        const { 
          awsAccessKeyId,
          awsSecretAccessKey,
          awsSessionToken,
          awsRegion,
          systemPrompt,
          userId: msgUserId
        } = message;

        if (!awsAccessKeyId || !awsSecretAccessKey) {
          throw new Error('AWS credentials are required');
        }

        userId = msgUserId || 'anonymous';
        config = {
          provider: 'bedrock',
          awsAccessKeyId,
          awsSecretAccessKey,
          awsSessionToken,
          awsRegion: awsRegion || 'us-east-1'
        };

        // Initialize Nova 2 Sonic session with bidirectional streaming
        const session = await novaSonicService.initializeSession(config, systemPrompt);
        sessionId = session.sessionId;

        // Store connection
        activeConnections.set(connectionId, {
          ws,
          sessionId,
          userId,
          config
        });

        // Send success response
        ws.send(JSON.stringify({
          type: 'initialized',
          sessionId,
          message: 'Nova 2 Sonic session initialized with bidirectional streaming',
          timestamp: new Date().toISOString()
        }));

        // Log initialization
        await auditLogService.log({
          sessionId,
          timestamp: new Date().toISOString(),
          eventType: 'input',
          userId,
          data: {
            type: 'nova_sonic_session_start',
            connectionId,
            mode: 'simplified'
          },
          piiScrubbed: false,
          metadata: {
            llmProvider: 'bedrock',
            modelVersion: 'nova-2-sonic-v1:0'
          }
        });

      } catch (error) {
        console.error('[Nova 2 Sonic WebSocket] Initialization error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Initialization failed'
        }));
      }
    }

    // Handle audio chunk message
    async function handleAudioChunk(ws: WebSocket, connectionId: string, message: any) {
      const connection = activeConnections.get(connectionId);
      if (!connection || !connection.sessionId) {
        throw new Error('Session not initialized');
      }

      const { audio, isComplete } = message;
      if (!audio) {
        throw new Error('Audio data is required');
      }

      const audioBuffer = Buffer.from(audio, 'base64');
      
      try {
        // Process audio chunk with streaming callbacks
        await novaSonicService.processAudioChunk(
          connection.sessionId, 
          audioBuffer, 
          isComplete,
          {
            // onTranscription
            onTranscription: (text: string) => {
              ws.send(JSON.stringify({
                type: 'transcription',
                text,
                timestamp: new Date().toISOString()
              }));
            },
            // onTextResponse
            onTextResponse: (text: string) => {
              ws.send(JSON.stringify({
                type: 'text_response',
                text,
                timestamp: new Date().toISOString()
              }));
            },
            // onAudioResponse
            onAudioResponse: (audioData: Buffer) => {
              ws.send(JSON.stringify({
                type: 'audio_response',
                audio: audioData.toString('base64'),
                timestamp: new Date().toISOString()
              }));
            },
            // onError
            onError: (error: Error) => {
              ws.send(JSON.stringify({
                type: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
              }));
            }
          }
        );

      } catch (error) {
        console.error('[Nova 2 Sonic WebSocket] Audio processing error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Audio processing failed'
        }));
      }
    }

    // Handle text message
    async function handleTextMessage(ws: WebSocket, connectionId: string, message: any) {
      const connection = activeConnections.get(connectionId);
      if (!connection || !connection.sessionId) {
        throw new Error('Session not initialized');
      }

      const { text } = message;
      if (!text) {
        throw new Error('Text is required');
      }

      try {
        // Process text message with streaming callbacks
        await novaSonicService.processTextMessage(
          connection.sessionId, 
          text,
          {
            // onTextResponse
            onTextResponse: (text: string) => {
              ws.send(JSON.stringify({
                type: 'text_response',
                text,
                timestamp: new Date().toISOString()
              }));
            },
            // onAudioResponse
            onAudioResponse: (audioData: Buffer) => {
              ws.send(JSON.stringify({
                type: 'audio_response',
                audio: audioData.toString('base64'),
                timestamp: new Date().toISOString()
              }));
            },
            // onError
            onError: (error: Error) => {
              ws.send(JSON.stringify({
                type: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
              }));
            }
          }
        );

      } catch (error) {
        console.error('[Nova 2 Sonic WebSocket] Text processing error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Text processing failed'
        }));
      }
    }

    // Handle end conversation
    async function handleEndConversation(ws: WebSocket, connectionId: string) {
      await cleanup(connectionId);
      ws.send(JSON.stringify({
        type: 'conversation_ended',
        timestamp: new Date().toISOString()
      }));
    }

    // Cleanup function
    async function cleanup(connectionId: string) {
      const connection = activeConnections.get(connectionId);
      if (connection) {
        if (connection.sessionId) {
          try {
            await novaSonicService.closeSession(connection.sessionId);
          } catch (error) {
            console.error('[Nova 2 Sonic WebSocket] Error closing session:', error);
          }
        }
        activeConnections.delete(connectionId);
      }
    }
  });

  // Cleanup on server shutdown
  process.on('SIGTERM', async () => {
    console.log('[Nova 2 Sonic WebSocket] Shutting down...');
    await novaSonicService.cleanup();
  });

  process.on('SIGINT', async () => {
    console.log('[Nova 2 Sonic WebSocket] Shutting down...');
    await novaSonicService.cleanup();
  });
}

/**
 * Generate unique connection ID
 */
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * GET /api/nova-sonic/status
 * Get Nova 2 Sonic service status
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    activeConnections: activeConnections.size,
    activeSessions: novaSonicService.getActiveSessionCount(),
    sessionIds: novaSonicService.getActiveSessionIds(),
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/nova-sonic/cleanup
 * Force cleanup of all active sessions
 */
router.post('/cleanup', async (req, res) => {
  try {
    await novaSonicService.cleanup();
    
    // Close all WebSocket connections
    Array.from(activeConnections.entries()).forEach(([connectionId, connection]) => {
      try {
        connection.ws.close();
      } catch (error) {
        console.error(`Error closing WebSocket connection ${connectionId}:`, error);
      }
    });
    activeConnections.clear();

    res.json({
      message: 'Cleanup completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Nova 2 Sonic] Cleanup error:', error);
    res.status(500).json({
      error: 'Cleanup failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;