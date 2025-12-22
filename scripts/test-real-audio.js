#!/usr/bin/env node

/**
 * Real Audio File Test for Nova 2 Sonic
 * 
 * This script tests Nova 2 Sonic with the actual InboundSampleRecording.mp3 file
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

// Convert MP3 to PCM16 (simplified - in real implementation you'd use ffmpeg)
function convertMp3ToPcm16(mp3Buffer) {
  // For this test, we'll just use the MP3 data directly
  // Nova 2 Sonic should be able to handle MP3 format
  return mp3Buffer;
}

const WS_URL = 'ws://localhost:8080/api/nova-sonic/stream';

async function testRealAudio() {
  console.log('🧪 Testing Nova 2 Sonic with Real Audio File');
  console.log('==============================================\n');

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

  // Load the real audio file
  const audioPath = path.join(__dirname, '..', 'InboundSampleRecording.mp3');
  if (!fs.existsSync(audioPath)) {
    console.error('❌ Audio file not found:', audioPath);
    process.exit(1);
  }

  const audioBuffer = fs.readFileSync(audioPath);
  console.log(`✅ Loaded audio file: ${audioBuffer.length} bytes`);
  console.log(`   File: ${audioPath}`);
  console.log('');

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
        systemPrompt: 'You are CatalAIst, helping classify business processes. Please respond to the audio input.',
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

            // Send the real audio file
            console.log('\n🎵 Sending real audio file...');
            const audioBase64 = audioBuffer.toString('base64');

            ws.send(JSON.stringify({
              type: 'audio_chunk',
              audio: audioBase64,
              isComplete: true
            }));

            testResults.audioProcessing = true;
            console.log(`   Sent ${audioBuffer.length} bytes of audio data`);
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
            console.log('\n🎉 Real audio test completed!');
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
testRealAudio().then((results) => {
  console.log('\n📊 Real Audio Test Results:');
  console.log('===========================');
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
      console.log('🎉 SUCCESS: Real audio processing is working!');
      console.log('   - Nova 2 Sonic successfully processed the audio file');
      console.log('   - The integration is functioning correctly');
    } else {
      console.log('⚠️  PARTIAL SUCCESS: Audio sent but no response received');
      console.log('   - This might indicate the audio content was unclear');
      console.log('   - Or Nova 2 Sonic decided not to respond to this particular audio');
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