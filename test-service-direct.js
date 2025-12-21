#!/usr/bin/env node

/**
 * Direct Service Test
 * 
 * This script tests the Nova 2 Sonic service directly, bypassing the WebSocket layer
 */

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

async function testServiceDirect() {
  console.log('🧪 Direct Nova 2 Sonic Service Test');
  console.log('====================================\n');

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

  console.log(`✅ AWS credentials loaded from .env file`);
  console.log(`   Region: ${awsRegion}`);
  console.log(`   Access Key: ${awsAccessKeyId.substring(0, 8)}...`);
  console.log('');

  try {
    // Import the service (need to use require for compiled JS)
    // Try Docker path first, then local path
    let NovaSonicWebSocketService;
    try {
      ({ NovaSonicWebSocketService } = require('./dist/backend/src/services/nova-sonic-websocket.service.js'));
    } catch (error) {
      ({ NovaSonicWebSocketService } = require('./backend/dist/backend/src/services/nova-sonic-websocket.service.js'));
    }
    
    console.log('📦 Creating Nova 2 Sonic service...');
    const service = new NovaSonicWebSocketService();
    
    console.log('🔧 Initializing session...');
    const config = {
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken: awsSessionToken || undefined,
      awsRegion
    };
    
    const { sessionId } = await service.initializeSession(config, 'You are a helpful AI assistant. Please respond briefly to test the integration.');
    console.log(`✅ Session initialized: ${sessionId}`);
    
    console.log('💬 Processing text message...');
    
    let textResponse = '';
    let audioChunks = [];
    let hasError = false;
    
    await service.processTextMessage(
      sessionId,
      'Hello Nova 2 Sonic, please say hello back to test the integration.',
      {
        onTextResponse: (text) => {
          console.log(`📝 Text Response: "${text}"`);
          textResponse += text;
        },
        onAudioResponse: (audioData) => {
          console.log(`🔊 Audio Response: ${audioData.length} bytes`);
          audioChunks.push(audioData);
        },
        onError: (error) => {
          console.error(`❌ Service Error: ${error.message}`);
          hasError = true;
        }
      }
    );
    
    console.log('\n📊 Test Results:');
    console.log(`Text Response: ${textResponse ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Audio Response: ${audioChunks.length > 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Errors: ${hasError ? '❌ YES' : '✅ NONE'}`);
    
    if (textResponse) {
      console.log(`\n💬 Full Text Response: "${textResponse}"`);
    }
    
    if (audioChunks.length > 0) {
      const totalAudioBytes = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      console.log(`\n🔊 Total Audio: ${audioChunks.length} chunks, ${totalAudioBytes} bytes`);
    }
    
    console.log('\n🧹 Cleaning up...');
    await service.closeSession(sessionId);
    
    if (textResponse && audioChunks.length > 0 && !hasError) {
      console.log('\n🎉 SUCCESS! Direct service call worked perfectly!');
      console.log('✅ The issue is in the WebSocket layer, not the service itself.');
      process.exit(0);
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS or FAILURE');
      console.log('🔍 The issue might be in the service implementation.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Direct service test failed:', error.message);
    
    if (error.message.includes('Input Chunk does not contain an event')) {
      console.log('🔍 Same event format error - issue is in the service implementation');
    }
    
    console.log('\n📋 Error Details:');
    console.log('Message:', error.message);
    if (error.stack) {
      console.log('Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    
    process.exit(1);
  }
}

// Run the test
testServiceDirect().catch((error) => {
  console.error('\n💥 Test failed with exception:', error);
  process.exit(1);
});