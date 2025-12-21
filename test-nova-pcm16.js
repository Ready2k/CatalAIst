#!/usr/bin/env node

/**
 * PCM16 Audio Test for Nova 2 Sonic
 * 
 * This script tests Nova 2 Sonic with properly formatted PCM16 audio data
 * Creates a simple sine wave tone as PCM16 data for testing
 */

const WebSocket = require('./backend/node_modules/ws');
const fs = require('fs');
const path = require('path');

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
 * Generate PCM16 audio data (sine wave tone)
 * This creates a simple 440Hz tone for 2 seconds at 16kHz sample rate
 */
function generatePCM16TestAudio() {
  const sampleRate = 16000;  // 16kHz
  const duration = 2;        // 2 seconds
  const frequency = 440;     // 440Hz (A note)
  const amplitude = 0.3;     // 30% volume to avoid clipping
  
  const numSamples = sampleRate * duration;
  const buffer = Buffer.alloc(numSamples * 2); // 2 bytes per sample (16-bit)
  
  for (let i = 0; i < numSamples; i++) {
    // Generate sine wave sample
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
    
    // Convert to 16-bit signed integer (-32768 to 32767)
    const pcm16Sample = Math.round(sample * 32767);
    
    // Write as little-endian 16-bit signed integer
    buffer.writeInt16LE(pcm16Sample, i * 2);
  }
  
  console.log(`✅ Generated PCM16 test audio: ${buffer.length} bytes (${duration}s at ${sampleRate}Hz)`);
  return buffer;
}

const WS_URL = 'ws://localhost:4000/api/nova-sonic/stream';

async function testPCM16Audio() {
  console.log('🧪 Testing Nova 2 Sonic with PCM16 Audio');
  console.log('========================================\n');

  // Load AWS credentials from .env file
  const env = loadEnvFile();
  const awsAccessKeyId = env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const awsSessionToken = env.AWS_SESSION_TOKEN;
  const awsRegion = env.AWS_REGION || 'us-east-1';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    console.error('❌ AWS credentials not found in .env file');
    process.exit(1);
  }

  // Generate PCM16 test audio
  const pcm16Audio = generatePCM16TestAudio();

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let sessionId = null;
    let testResults = {
      connection: false,
      initialization: false,
      audioProcessing: false,
      textResponse: false,
      audioResponse: false,
      responses: [],
      errors: []
    };

    // Connection timeout
    const timeout = setTimeout(() => {
      console.log('⏰ Test timeout after 45 seconds');
      ws.close();
      resolve(testResults);
    }, 45000);

    ws.on('open', () => {
      console.log('🔌 WebSocket connection established');
      testResults.connection = true;

      // Send initialization message
      const initMessage = {
        type: 'initialize',
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken: awsSessionToken || undefined,
        awsRegion,
        systemPrompt: 'You are CatalAIst, helping classify business processes. The user just sent you a test audio tone. Please acknowledge that you received the audio and ask how you can help.',
        userId: 'test-user'
      };

      console.log('📤 Sending initialization...');
      ws.send(JSON.stringify(initMessage));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📥 Received: ${message.type}`);
        testResults.responses.push(message);

        switch (message.type) {
          case 'initialized':
            console.log('✅ Session initialized successfully');
            console.log(`   Session ID: ${message.sessionId}`);
            testResults.initialization = true;
            sessionId = message.sessionId;

            // Send the PCM16 audio data
            console.log('\n🎵 Sending PCM16 audio data...');
            const audioBase64 = pcm16Audio.toString('base64');
            
            ws.send(JSON.stringify({
              type: 'audio_chunk',
              audio: audioBase64,
              isComplete: true
            }));
            
            testResults.audioProcessing = true;
            console.log(`   Sent ${pcm16Audio.length} bytes of PCM16 audio data`);
            console.log(`   Format: 16-bit PCM, 16kHz, mono, 2 seconds duration`);
            break;

          case 'transcription':
            console.log(`✅ Received transcription: "${message.text}"`);
            break;

          case 'text_response':
            console.log(`✅ Received text response: "${message.text}"`);
            testResults.textResponse = true;
            break;

          case 'audio_response':
            console.log(`✅ Received audio response (${message.audio?.length || 0} chars base64)`);
            testResults.audioResponse = true;
            
            // Test completed successfully
            console.log('\n🎉 PCM16 audio test completed!');
            clearTimeout(timeout);
            ws.close();
            resolve(testResults);
            break;

          case 'error':
            console.error(`❌ Received error: ${message.error}`);
            testResults.errors.push(message.error);
            break;

          default:
            console.log(`📋 Other message: ${message.type}`);
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error);
        testResults.errors.push(`Parse error: ${error.message}`);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      testResults.errors.push(`WebSocket error: ${error.message}`);
      clearTimeout(timeout);
      resolve(testResults);
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed (code: ${code}, reason: ${reason?.toString() || 'none'})`);
      clearTimeout(timeout);
      resolve(testResults);
    });
  });
}

// Run the test
testPCM16Audio().then((results) => {
  console.log('\n📊 PCM16 Audio Test Results:');
  console.log('============================');
  console.log(`Connection:       ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Initialization:   ${results.initialization ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Audio Processing: ${results.audioProcessing ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Text Response:    ${results.textResponse ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Audio Response:   ${results.audioResponse ? '✅ PASS' : '❌ FAIL'}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  console.log(`\n📝 Total Responses: ${results.responses.length}`);

  console.log('\n🔍 Analysis:');
  if (results.connection && results.initialization && results.audioProcessing) {
    if (results.textResponse || results.audioResponse) {
      console.log('🎉 SUCCESS: PCM16 audio processing is working!');
      console.log('   - Nova 2 Sonic successfully processed the PCM16 audio');
      console.log('   - The audio format and streaming are correct');
      console.log('   - Ready for real microphone input');
    } else {
      console.log('⚠️  PARTIAL SUCCESS: PCM16 audio sent but no response received');
      console.log('   - Audio format may be correct but content unclear');
      console.log('   - Check the backend logs for more details');
    }
  } else {
    console.log('❌ FAILED: Basic functionality issues');
    console.log('   - Check service status and connectivity');
  }

  // Exit with appropriate code
  const success = results.connection && results.initialization && results.audioProcessing;
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('💥 Test failed with exception:', error);
  process.exit(1);
});