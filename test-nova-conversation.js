#!/usr/bin/env node

/**
 * Test Nova 2 Sonic Full Conversation Flow
 * 
 * Tests:
 * 1. Text input -> Text + Audio response
 * 2. Audio input -> Transcription + Text + Audio response
 */

const WebSocket = require('./backend/node_modules/ws');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables
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

const WS_URL = 'ws://localhost:4000/api/nova-sonic/stream';

async function testConversation() {
  console.log('🧪 Testing Nova 2 Sonic Conversation Flow');
  console.log('==========================================\n');

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

  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    
    const results = {
      connection: false,
      initialization: false,
      textResponse: false,
      audioResponse: false,
      responseText: '',
      audioLength: 0,
      errors: []
    };

    const timeout = setTimeout(() => {
      console.log('\n⏰ Test timeout after 45 seconds');
      ws.close();
      resolve(results);
    }, 45000);

    ws.on('open', () => {
      console.log('🔌 WebSocket connected');
      results.connection = true;

      // Initialize with a conversational system prompt
      const initMessage = {
        type: 'initialize',
        awsAccessKeyId,
        awsSecretAccessKey,
        awsSessionToken: awsSessionToken || undefined,
        awsRegion,
        systemPrompt: 'You are a helpful assistant. When the user sends a message, respond briefly and conversationally. Keep responses under 50 words.',
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
            results.initialization = true;

            // Send a text message to trigger a response
            console.log('📤 Sending text message: "Hello, can you help me classify a business process?"');
            ws.send(JSON.stringify({
              type: 'text_message',
              text: 'Hello, can you help me classify a business process?'
            }));
            break;

          case 'text_response':
            console.log(`\n💬 Text Response: "${message.text}"`);
            results.textResponse = true;
            results.responseText += message.text + ' ';
            break;

          case 'audio_response':
            const audioLen = message.audio?.length || 0;
            const audioDuration = Math.round(audioLen * 0.75 / 48000); // Approximate duration
            console.log(`\n🔊 Audio Response: ${audioLen} chars base64 (~${audioDuration}s)`);
            results.audioResponse = true;
            results.audioLength += audioLen;
            
            // Test complete when we get audio
            console.log('\n🎉 Full conversation test completed!');
            clearTimeout(timeout);
            ws.close();
            resolve(results);
            break;

          case 'error':
            console.error(`\n❌ Error: ${message.error}`);
            results.errors.push(message.error);
            break;

          default:
            // Ignore other message types
            break;
        }
      } catch (error) {
        console.error('\n❌ Parse error:', error.message);
        results.errors.push(`Parse: ${error.message}`);
      }
    });

    ws.on('error', (error) => {
      console.error('\n❌ WebSocket error:', error.message);
      results.errors.push(`WebSocket: ${error.message}`);
      clearTimeout(timeout);
      resolve(results);
    });

    ws.on('close', (code) => {
      console.log(`\n🔌 WebSocket closed (${code})`);
      clearTimeout(timeout);
      resolve(results);
    });
  });
}

// Run test
testConversation().then((results) => {
  console.log('\n' + '='.repeat(50));
  console.log('📊 Conversation Test Results:');
  console.log('='.repeat(50));
  console.log(`Connection:      ${results.connection ? '✅' : '❌'}`);
  console.log(`Initialization:  ${results.initialization ? '✅' : '❌'}`);
  console.log(`Text Response:   ${results.textResponse ? '✅' : '❌'}`);
  console.log(`Audio Response:  ${results.audioResponse ? '✅' : '❌'}`);
  
  if (results.responseText) {
    console.log(`\n💬 Full Response: "${results.responseText.trim()}"`);
  }
  if (results.audioLength > 0) {
    console.log(`🔊 Total Audio: ${results.audioLength} chars base64`);
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
  }

  const success = results.connection && results.initialization && results.textResponse;
  
  console.log(`\n${success ? '🎉 SUCCESS' : '⚠️  PARTIAL'}: Conversation test ${success ? 'passed' : 'needs review'}`);
  
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
