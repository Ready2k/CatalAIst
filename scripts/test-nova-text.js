#!/usr/bin/env node

/**
 * Simple Text Test for Nova 2 Sonic
 * 
 * This script tests Nova 2 Sonic with text input to verify basic functionality
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

const WS_URL = 'ws://localhost:4000/api/nova-sonic/stream';

async function testTextInput() {
  console.log('🧪 Testing Nova 2 Sonic with Text Input');
  console.log('=====================================\n');

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
    let testResults = {
      connection: false,
      initialization: false,
      textProcessing: false,
      textResponse: false,
      audioResponse: false,
      responses: [],
      errors: []
    };

    // Connection timeout
    const timeout = setTimeout(() => {
      console.log('⏰ Test timeout after 30 seconds');
      ws.close();
      resolve(testResults);
    }, 30000);

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
        systemPrompt: 'You are CatalAIst, helping classify business processes. Please respond to user input.',
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

            // Send a simple text message
            console.log('\n💬 Sending text message...');

            ws.send(JSON.stringify({
              type: 'text_message',
              text: 'Hello, can you help me classify a business process?'
            }));

            testResults.textProcessing = true;
            console.log('   Sent text message');
            break;

          case 'text_response':
            console.log(`✅ Received text response: "${message.text}"`);
            testResults.textResponse = true;
            break;

          case 'audio_response':
            console.log(`✅ Received audio response (${message.audio?.length || 0} chars base64)`);
            testResults.audioResponse = true;

            // Test completed successfully
            console.log('\n🎉 Text test completed!');
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
testTextInput().then((results) => {
  console.log('\n📊 Text Test Results:');
  console.log('=====================');
  console.log(`Connection:       ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Initialization:   ${results.initialization ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Text Processing:  ${results.textProcessing ? '✅ PASS' : '❌ FAIL'}`);
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
  if (results.connection && results.initialization && results.textProcessing) {
    if (results.textResponse || results.audioResponse) {
      console.log('🎉 SUCCESS: Text processing is working!');
      console.log('   - Nova 2 Sonic successfully processed the text input');
      console.log('   - The integration is functioning correctly');
    } else {
      console.log('⚠️  PARTIAL SUCCESS: Text sent but no response received');
      console.log('   - This indicates an issue with Nova 2 Sonic response generation');
      console.log('   - Check the backend logs for more details');
    }
  } else {
    console.log('❌ FAILED: Basic functionality issues');
    console.log('   - Check service status and connectivity');
  }

  // Exit with appropriate code
  const success = results.connection && results.initialization && results.textProcessing && (results.textResponse || results.audioResponse);
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('💥 Test failed with exception:', error);
  process.exit(1);
});