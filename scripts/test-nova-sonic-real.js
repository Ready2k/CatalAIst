#!/usr/bin/env node

/**
 * Real Nova 2 Sonic Integration Test
 * 
 * This script tests the Nova 2 Sonic WebSocket integration using real AWS credentials
 * from the .env file and provides comprehensive testing of the event format fix.
 */

const WebSocket = require('../backend/node_modules/ws');
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

// Generate simple PCM audio data for testing (sine wave)
function generateTestAudio(durationSeconds = 2, sampleRate = 16000) {
  const samples = durationSeconds * sampleRate;
  const buffer = Buffer.alloc(samples * 2); // 16-bit samples

  // Generate a 440Hz sine wave (A note)
  const frequency = 440;
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3; // 30% volume
    const intSample = Math.round(sample * 32767); // Convert to 16-bit signed integer
    buffer.writeInt16LE(intSample, i * 2);
  }

  return buffer;
}

const WS_URL = 'ws://localhost:8080/api/nova-sonic/stream';

async function testNovaSonicIntegration() {
  console.log('🧪 Testing Nova 2 Sonic Integration with Real AWS Credentials');
  console.log('================================================================\n');

  // Load AWS credentials from .env file
  const env = loadEnvFile();
  const awsAccessKeyId = env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const awsSessionToken = env.AWS_SESSION_TOKEN;
  const awsRegion = env.AWS_REGION || 'us-east-1';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    console.error('❌ AWS credentials not found in .env file');
    console.log('Please ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set');
    process.exit(1);
  }

  console.log(`✅ AWS credentials loaded from .env file`);
  console.log(`   Region: ${awsRegion}`);
  console.log(`   Access Key: ${awsAccessKeyId.substring(0, 8)}...`);
  console.log('');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let sessionId = null;
    let testResults = {
      connection: false,
      initialization: false,
      textTest: false,
      audioTest: false,
      eventFormat: false,
      responses: [],
      errors: []
    };

    // Connection timeout
    const timeout = setTimeout(() => {
      console.log('⏰ Test timeout after 60 seconds');
      ws.close();
      resolve(testResults);
    }, 60000);

    ws.on('open', () => {
      console.log('🔌 WebSocket connection established');
      testResults.connection = true;

      // Send initialization message with real AWS credentials
      const initMessage = {
        type: 'initialize',
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken: awsSessionToken || undefined,
        awsRegion,
        systemPrompt: 'You are CatalAIst, helping classify business processes. Please respond briefly to test the integration.',
        userId: 'test-user'
      };

      console.log('📤 Sending initialization with real AWS credentials...');
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

            // Test 1: Text message to verify basic functionality
            console.log('\n🔤 Test 1: Sending text message...');
            ws.send(JSON.stringify({
              type: 'text_message',
              text: 'Hello Nova 2 Sonic, please say hello back to test the integration.'
            }));
            break;

          case 'text_response':
            console.log(`✅ Received text response: "${message.text}"`);
            testResults.textTest = true;
            testResults.eventFormat = true;

            // Test 2: Audio message after successful text test
            if (!testResults.audioTest) {
              console.log('\n🎵 Test 2: Sending test audio (2-second sine wave)...');
              const testAudio = generateTestAudio(2, 16000);
              const audioBase64 = testAudio.toString('base64');

              ws.send(JSON.stringify({
                type: 'audio_chunk',
                audio: audioBase64,
                isComplete: true
              }));
            }
            break;

          case 'transcription':
            console.log(`✅ Received transcription: "${message.text}"`);
            // Note: Generated sine wave won't produce meaningful transcription
            console.log('   (Generated audio may not produce meaningful transcription)');
            break;

          case 'audio_response':
            console.log(`✅ Received audio response (${message.audio?.length || 0} chars base64)`);
            testResults.audioTest = true;

            // Test completed successfully
            console.log('\n🎉 All tests completed successfully!');
            clearTimeout(timeout);
            ws.close();
            resolve(testResults);
            break;

          case 'error':
            console.error(`❌ Received error: ${message.error}`);
            testResults.errors.push(message.error);

            // Check for specific error types
            if (message.error.includes('Input Chunk does not contain an event')) {
              console.log('🔍 This is the event format error we were trying to fix');
              testResults.eventFormat = false;
            } else if (message.error.includes('No events to transform')) {
              console.log('🔍 This is the deserialization error from before');
              testResults.eventFormat = false;
            } else if (message.error.includes("doesn't support the model")) {
              console.log('🔍 Model support error - Nova 2 Sonic requires bidirectional streaming');
            }

            // Continue testing even with errors to gather more information
            break;

          default:
            console.log(`📋 Other message: ${message.type}`);
            if (message.timestamp) {
              console.log(`   Timestamp: ${message.timestamp}`);
            }
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
      if (!testResults.initialization && testResults.errors.length === 0) {
        testResults.errors.push('Connection closed unexpectedly');
      }
      resolve(testResults);
    });
  });
}

// Run the comprehensive test
testNovaSonicIntegration().then((results) => {
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Connection:     ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Initialization: ${results.initialization ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Text Test:      ${results.textTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Audio Test:     ${results.audioTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Event Format:   ${results.eventFormat ? '✅ PASS' : '❌ FAIL'}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  if (results.responses.length > 0) {
    console.log(`\n📝 Total Responses: ${results.responses.length}`);
  }

  console.log('\n🔍 Analysis:');
  if (results.connection && results.initialization && results.textTest && results.eventFormat) {
    console.log('🎉 SUCCESS: Nova 2 Sonic integration is working correctly!');
    console.log('   - WebSocket connection established');
    console.log('   - AWS credentials accepted');
    console.log('   - Event format is correct');
    console.log('   - Text communication working');
    if (results.audioTest) {
      console.log('   - Audio processing working');
    }
  } else if (results.connection && results.initialization) {
    console.log('⚠️  PARTIAL SUCCESS: Connection works but there are issues:');
    if (!results.eventFormat) {
      console.log('   - Event format needs fixing');
    }
    if (!results.textTest) {
      console.log('   - Text communication failed');
    }
    if (!results.audioTest) {
      console.log('   - Audio processing failed (may be expected with generated audio)');
    }
  } else if (results.connection) {
    console.log('⚠️  CONNECTION OK: WebSocket works but initialization failed');
    console.log('   - Check AWS credentials and permissions');
    console.log('   - Verify Nova 2 Sonic access in your AWS account');
  } else {
    console.log('❌ CONNECTION FAILED: Basic WebSocket connection issues');
    console.log('   - Ensure services are running (./catalai.sh status)');
    console.log('   - Check if port 8080 is accessible');
  }

  // Exit with appropriate code
  const success = results.connection && results.initialization && results.eventFormat;
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('💥 Test failed with exception:', error);
  process.exit(1);
});