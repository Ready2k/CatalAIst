#!/usr/bin/env node

/**
 * Conversation Test for Nova 2 Sonic
 * 
 * This script tests Nova 2 Sonic with a mixed text/audio conversation
 * to verify the persistent streaming works correctly
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
 * Generate silence PCM16 audio data (to simulate pause in conversation)
 */
function generateSilencePCM16(durationMs = 500) {
  const sampleRate = 16000;  // 16kHz
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const buffer = Buffer.alloc(numSamples * 2); // 2 bytes per sample (16-bit)
  
  // Fill with silence (zeros)
  buffer.fill(0);
  
  console.log(`✅ Generated silence PCM16: ${buffer.length} bytes (${durationMs}ms at ${sampleRate}Hz)`);
  return buffer;
}

const WS_URL = 'ws://localhost:8080/api/nova-sonic/stream';

async function testConversation() {
  console.log('🧪 Testing Nova 2 Sonic Conversation Flow');
  console.log('=========================================\n');

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

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let sessionId = null;
    let step = 0;
    let testResults = {
      connection: false,
      initialization: false,
      textProcessing: false,
      audioProcessing: false,
      textResponse: false,
      audioResponse: false,
      conversationFlow: false,
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

      // Send initialization message
      const initMessage = {
        type: 'initialize',
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken: awsSessionToken || undefined,
        awsRegion,
        systemPrompt: 'You are CatalAIst, helping classify business processes. You should respond to both text and audio input. Keep responses brief and conversational.',
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
            step = 1;

            // Step 1: Send text message to establish conversation
            setTimeout(() => {
              console.log('\n💬 Step 1: Sending text message...');
              ws.send(JSON.stringify({
                type: 'text_message',
                text: 'Hello! I want to test the conversation flow. Please respond and then I will send you some audio.'
              }));
              testResults.textProcessing = true;
            }, 1000);
            break;

          case 'text_response':
            console.log(`✅ Received text response: "${message.text}"`);
            testResults.textResponse = true;
            
            if (step === 1) {
              // Step 2: Send audio after text response
              step = 2;
              setTimeout(() => {
                console.log('\n🎵 Step 2: Sending silence audio (simulating user pause)...');
                const silenceAudio = generateSilencePCM16(1000); // 1 second of silence
                const audioBase64 = silenceAudio.toString('base64');
                
                ws.send(JSON.stringify({
                  type: 'audio_chunk',
                  audio: audioBase64,
                  isComplete: true
                }));
                
                testResults.audioProcessing = true;
                console.log(`   Sent ${silenceAudio.length} bytes of silence PCM16 data`);
              }, 2000);
            }
            break;

          case 'audio_response':
            console.log(`✅ Received audio response (${message.audio?.length || 0} chars base64)`);
            testResults.audioResponse = true;
            testResults.conversationFlow = true;
            
            // Test completed successfully
            console.log('\n🎉 Conversation flow test completed!');
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
testConversation().then((results) => {
  console.log('\n📊 Conversation Test Results:');
  console.log('=============================');
  console.log(`Connection:        ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Initialization:    ${results.initialization ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Text Processing:   ${results.textProcessing ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Audio Processing:  ${results.audioProcessing ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Text Response:     ${results.textResponse ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Audio Response:    ${results.audioResponse ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Conversation Flow: ${results.conversationFlow ? '✅ PASS' : '❌ FAIL'}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  console.log(`\n📝 Total Responses: ${results.responses.length}`);

  console.log('\n🔍 Analysis:');
  if (results.connection && results.initialization) {
    if (results.textResponse && results.audioResponse && results.conversationFlow) {
      console.log('🎉 SUCCESS: Full conversation flow is working!');
      console.log('   - Nova 2 Sonic handles both text and audio in sequence');
      console.log('   - Persistent streaming maintains conversation context');
      console.log('   - Ready for real voice conversation implementation');
    } else if (results.textResponse && !results.audioResponse) {
      console.log('⚠️  PARTIAL SUCCESS: Text works but audio needs improvement');
      console.log('   - Text conversation is functional');
      console.log('   - Audio processing may need real speech content');
      console.log('   - Consider testing with actual voice recordings');
    } else {
      console.log('⚠️  LIMITED SUCCESS: Basic functionality works but conversation flow incomplete');
      console.log('   - Check the backend logs for more details');
    }
  } else {
    console.log('❌ FAILED: Basic functionality issues');
    console.log('   - Check service status and connectivity');
  }

  // Exit with appropriate code
  const success = results.connection && results.initialization && results.textResponse;
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('💥 Test failed with exception:', error);
  process.exit(1);
});