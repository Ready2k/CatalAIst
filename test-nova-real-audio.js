#!/usr/bin/env node

/**
 * Test Nova 2 Sonic with Real Audio File
 * 
 * Converts InboundSampleRecording.mp3 to PCM16 16kHz mono and sends to Nova 2 Sonic
 */

const WebSocket = require('./backend/node_modules/ws');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables from .env file
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

/**
 * Convert MP3 to PCM16 16kHz mono using ffmpeg
 */
function convertToPCM16(inputFile) {
  const outputFile = '/tmp/nova-sonic-test.raw';
  
  console.log(`🔄 Converting ${inputFile} to PCM16 16kHz mono...`);
  
  try {
    // Use ffmpeg to convert: 16kHz, mono, signed 16-bit little-endian PCM
    execSync(`ffmpeg -y -i "${inputFile}" -ar 16000 -ac 1 -f s16le -acodec pcm_s16le "${outputFile}" 2>/dev/null`);
    
    const buffer = fs.readFileSync(outputFile);
    console.log(`✅ Converted: ${buffer.length} bytes (${(buffer.length / 32000).toFixed(1)} seconds)`);
    
    // Clean up
    fs.unlinkSync(outputFile);
    
    return buffer;
  } catch (error) {
    console.error('❌ ffmpeg conversion failed. Make sure ffmpeg is installed.');
    console.error('   Install with: brew install ffmpeg');
    process.exit(1);
  }
}

/**
 * Split audio into chunks for streaming
 */
function splitIntoChunks(buffer, chunkDurationMs = 100) {
  const bytesPerSecond = 16000 * 2; // 16kHz * 2 bytes per sample
  const bytesPerChunk = Math.floor(bytesPerSecond * chunkDurationMs / 1000);
  const chunks = [];
  
  for (let i = 0; i < buffer.length; i += bytesPerChunk) {
    chunks.push(buffer.slice(i, Math.min(i + bytesPerChunk, buffer.length)));
  }
  
  console.log(`📦 Split into ${chunks.length} chunks (${chunkDurationMs}ms each)`);
  return chunks;
}

const WS_URL = 'ws://localhost:4000/api/nova-sonic/stream';
const AUDIO_FILE = 'InboundSampleRecording.mp3';

async function testWithRealAudio() {
  console.log('🧪 Testing Nova 2 Sonic with Real Audio');
  console.log('=======================================\n');

  // Check if audio file exists
  if (!fs.existsSync(AUDIO_FILE)) {
    console.error(`❌ Audio file not found: ${AUDIO_FILE}`);
    process.exit(1);
  }

  // Load credentials
  const env = loadEnvFile();
  const awsAccessKeyId = env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const awsSessionToken = env.AWS_SESSION_TOKEN;
  const awsRegion = env.AWS_REGION || 'us-east-1';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    console.error('❌ AWS credentials not found in .env file');
    process.exit(1);
  }

  console.log(`✅ AWS credentials loaded (region: ${awsRegion})\n`);

  // Convert audio
  const pcmBuffer = convertToPCM16(AUDIO_FILE);
  
  // Only use first 10 seconds to keep test reasonable
  const maxDuration = 10; // seconds
  const maxBytes = maxDuration * 16000 * 2;
  const trimmedBuffer = pcmBuffer.slice(0, Math.min(pcmBuffer.length, maxBytes));
  console.log(`📏 Using first ${(trimmedBuffer.length / 32000).toFixed(1)} seconds of audio\n`);
  
  const audioChunks = splitIntoChunks(trimmedBuffer, 100);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let sessionId = null;
    let chunkIndex = 0;
    let streamingInterval = null;
    
    const testResults = {
      connection: false,
      initialization: false,
      audioStreaming: false,
      transcription: false,
      textResponse: false,
      audioResponse: false,
      transcriptionText: '',
      responseText: '',
      errors: []
    };

    const timeout = setTimeout(() => {
      console.log('\n⏰ Test timeout after 60 seconds');
      if (streamingInterval) clearInterval(streamingInterval);
      ws.close();
      resolve(testResults);
    }, 60000);

    ws.on('open', () => {
      console.log('🔌 WebSocket connected');
      testResults.connection = true;

      const initMessage = {
        type: 'initialize',
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken: awsSessionToken || undefined,
        awsRegion,
        systemPrompt: 'You are a helpful assistant. Listen to the audio and respond appropriately. Keep responses brief.',
        userId: 'test-user'
      };

      console.log('📤 Sending initialization...');
      ws.send(JSON.stringify(initMessage));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'initialized':
            console.log(`✅ Session initialized: ${message.sessionId}\n`);
            testResults.initialization = true;
            sessionId = message.sessionId;

            // Start streaming audio chunks
            console.log('🎵 Starting audio stream...');
            streamingInterval = setInterval(() => {
              if (chunkIndex < audioChunks.length) {
                const chunk = audioChunks[chunkIndex];
                const isLast = chunkIndex === audioChunks.length - 1;
                
                ws.send(JSON.stringify({
                  type: 'audio_chunk',
                  audio: chunk.toString('base64'),
                  isComplete: isLast
                }));
                
                if (chunkIndex % 10 === 0) {
                  process.stdout.write(`\r   Sent ${chunkIndex + 1}/${audioChunks.length} chunks...`);
                }
                
                chunkIndex++;
                
                if (isLast) {
                  console.log(`\n✅ Audio streaming complete (${audioChunks.length} chunks)`);
                  testResults.audioStreaming = true;
                  clearInterval(streamingInterval);
                }
              }
            }, 50); // Send chunks every 50ms (faster than real-time)
            break;

          case 'transcription':
            console.log(`\n📝 Transcription: "${message.text}"`);
            testResults.transcription = true;
            testResults.transcriptionText = message.text;
            break;

          case 'text_response':
            console.log(`\n💬 Response: "${message.text}"`);
            testResults.textResponse = true;
            testResults.responseText = message.text;
            // Nova 2 Sonic streams transcription as text_response
            // Mark transcription as successful too
            testResults.transcription = true;
            testResults.transcriptionText = message.text;
            break;

          case 'audio_response':
            const audioLen = message.audio?.length || 0;
            console.log(`\n🔊 Audio response received: ${audioLen} chars base64 (~${Math.round(audioLen * 0.75 / 48000)} seconds)`);
            testResults.audioResponse = true;
            
            // Test complete!
            console.log('\n🎉 Test completed successfully!');
            clearTimeout(timeout);
            if (streamingInterval) clearInterval(streamingInterval);
            ws.close();
            resolve(testResults);
            break;

          case 'error':
            console.error(`\n❌ Error: ${message.error}`);
            testResults.errors.push(message.error);
            break;

          default:
            // Ignore other message types
            break;
        }
      } catch (error) {
        console.error('\n❌ Parse error:', error.message);
        testResults.errors.push(`Parse: ${error.message}`);
      }
    });

    ws.on('error', (error) => {
      console.error('\n❌ WebSocket error:', error.message);
      testResults.errors.push(`WebSocket: ${error.message}`);
      clearTimeout(timeout);
      if (streamingInterval) clearInterval(streamingInterval);
      resolve(testResults);
    });

    ws.on('close', (code) => {
      console.log(`\n🔌 WebSocket closed (${code})`);
      clearTimeout(timeout);
      if (streamingInterval) clearInterval(streamingInterval);
      resolve(testResults);
    });
  });
}

// Run test
testWithRealAudio().then((results) => {
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log('='.repeat(50));
  console.log(`Connection:      ${results.connection ? '✅' : '❌'}`);
  console.log(`Initialization:  ${results.initialization ? '✅' : '❌'}`);
  console.log(`Audio Streaming: ${results.audioStreaming ? '✅' : '❌'}`);
  console.log(`Transcription:   ${results.transcription ? '✅' : '❌'}`);
  console.log(`Text Response:   ${results.textResponse ? '✅' : '❌'}`);
  console.log(`Audio Response:  ${results.audioResponse ? '✅' : '❌'}`);
  
  if (results.transcriptionText) {
    console.log(`\n📝 Transcribed: "${results.transcriptionText}"`);
  }
  if (results.responseText) {
    console.log(`💬 Response: "${results.responseText}"`);
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
  }

  const success = results.connection && results.initialization && results.audioStreaming && 
                  (results.textResponse || results.audioResponse);
  
  console.log(`\n${success ? '🎉 SUCCESS' : '⚠️  PARTIAL'}: Real audio test ${success ? 'passed' : 'needs review'}`);
  
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
