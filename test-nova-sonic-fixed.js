#!/usr/bin/env node

/**
 * Test Nova 2 Sonic Fixed Implementation
 * 
 * Tests the rewritten service based on official AWS sample code
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
 * Generate PCM16 test audio (440Hz sine wave)
 */
function generateTestAudio(durationSeconds = 2, sampleRate = 16000) {
  const samples = durationSeconds * sampleRate;
  const buffer = Buffer.alloc(samples * 2);
  
  const frequency = 440;
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    const intSample = Math.round(sample * 32767);
    buffer.writeInt16LE(intSample, i * 2);
  }
  
  return buffer;
}

const WS_URL = 'ws://localhost:4000/api/nova-sonic/stream';

async function testNovaSonicFixed() {
  console.log('🧪 Testing Nova 2 Sonic Fixed Implementation');
  console.log('=============================================\n');

  const env = loadEnvFile();
  const awsAccessKeyId = env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  const awsSessionToken = env.AWS_SESSION_TOKEN;
  const awsRegion = env.AWS_REGION || 'us-east-1';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    console.error('❌ AWS credentials not found in .env file');
    process.exit(1);
  }

  console.log(`✅ AWS credentials loaded`);
  console.log(`   Region: ${awsRegion}`);
  console.log(`   Access Key: ${awsAccessKeyId.substring(0, 8)}...`);
  console.log('');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let sessionId = null;
    let testPhase = 'connecting';
    
    const testResults = {
      connection: false,
      initialization: false,
      textMessage: false,
      textResponse: false,
      audioMessage: false,
      audioResponse: false,
      errors: [],
      responses: []
    };

    const timeout = setTimeout(() => {
      console.log('⏰ Test timeout after 60 seconds');
      console.log(`   Last phase: ${testPhase}`);
      ws.close();
      resolve(testResults);
    }, 60000);

    ws.on('open', () => {
      console.log('🔌 WebSocket connected');
      testResults.connection = true;
      testPhase = 'initializing';

      const initMessage = {
        type: 'initialize',
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken: awsSessionToken || undefined,
        awsRegion,
        systemPrompt: 'You are a helpful assistant. Keep responses very brief, just one sentence.',
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
            console.log(`✅ Session initialized: ${message.sessionId}`);
            testResults.initialization = true;
            sessionId = message.sessionId;
            testPhase = 'sending_text';

            // Test 1: Send text message
            setTimeout(() => {
              console.log('\n📝 Test 1: Sending text message...');
              ws.send(JSON.stringify({
                type: 'text_message',
                text: 'Hello! Please say hi back.'
              }));
              testResults.textMessage = true;
            }, 500);
            break;

          case 'text_response':
            console.log(`✅ Text response: "${message.text}"`);
            testResults.textResponse = true;

            // Test 2: Send audio after text works
            if (testPhase === 'sending_text') {
              testPhase = 'sending_audio';
              setTimeout(() => {
                console.log('\n🎵 Test 2: Sending audio...');
                const testAudio = generateTestAudio(1, 16000);
                const audioBase64 = testAudio.toString('base64');
                
                ws.send(JSON.stringify({
                  type: 'audio_chunk',
                  audio: audioBase64,
                  isComplete: true
                }));
                testResults.audioMessage = true;
              }, 1000);
            }
            break;

          case 'audio_response':
            console.log(`✅ Audio response: ${message.audio?.length || 0} chars base64`);
            testResults.audioResponse = true;
            
            // All tests passed
            console.log('\n🎉 All tests completed!');
            clearTimeout(timeout);
            ws.close();
            resolve(testResults);
            break;

          case 'error':
            console.error(`❌ Error: ${message.error}`);
            testResults.errors.push(message.error);
            break;

          default:
            console.log(`   Other: ${JSON.stringify(message).substring(0, 100)}`);
        }
      } catch (error) {
        console.error('❌ Parse error:', error);
        testResults.errors.push(`Parse error: ${error.message}`);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      testResults.errors.push(`WebSocket: ${error.message}`);
      clearTimeout(timeout);
      resolve(testResults);
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed (${code})`);
      clearTimeout(timeout);
      resolve(testResults);
    });
  });
}

// Run test
testNovaSonicFixed().then((results) => {
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`Connection:     ${results.connection ? '✅' : '❌'}`);
  console.log(`Initialization: ${results.initialization ? '✅' : '❌'}`);
  console.log(`Text Message:   ${results.textMessage ? '✅' : '❌'}`);
  console.log(`Text Response:  ${results.textResponse ? '✅' : '❌'}`);
  console.log(`Audio Message:  ${results.audioMessage ? '✅' : '❌'}`);
  console.log(`Audio Response: ${results.audioResponse ? '✅' : '❌'}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
  }

  const success = results.connection && results.initialization && results.textResponse;
  console.log(`\n${success ? '🎉 SUCCESS' : '⚠️  PARTIAL'}: Nova 2 Sonic implementation ${success ? 'working' : 'needs more testing'}`);
  
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
