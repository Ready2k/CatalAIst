#!/usr/bin/env node

/**
 * Test Nova 2 Sonic WebSocket Integration
 * 
 * This script tests the Nova 2 Sonic WebSocket connection and event format fix.
 * Run with: node test-nova-sonic.js
 */

const WebSocket = require('../backend/node_modules/ws');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const WS_URL = 'ws://localhost:8080/api/nova-sonic/stream';

async function testNovaSonic() {
  console.log('🧪 Testing Nova 2 Sonic WebSocket Integration...\n');

  // Check if AWS credentials are available
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION || 'us-east-1';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    console.error('❌ AWS credentials not found in .env file');
    console.log('Please ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set');
    process.exit(1);
  }

  console.log(`✅ AWS credentials found for region: ${awsRegion}`);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let sessionId = null;
    let testResults = {
      connection: false,
      initialization: false,
      eventFormat: false,
      error: null
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
        awsSessionToken: process.env.AWS_SESSION_TOKEN,
        awsRegion,
        systemPrompt: 'You are a test assistant for Nova 2 Sonic integration.',
        userId: 'test-user'
      };

      console.log('📤 Sending initialization message...');
      ws.send(JSON.stringify(initMessage));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📥 Received message:', message.type);

        switch (message.type) {
          case 'initialized':
            console.log('✅ Session initialized successfully');
            console.log(`   Session ID: ${message.sessionId}`);
            testResults.initialization = true;
            sessionId = message.sessionId;

            // Test with a simple text message to check event format
            console.log('📤 Sending test text message...');
            ws.send(JSON.stringify({
              type: 'text_message',
              text: 'Hello Nova 2 Sonic, this is a test message.'
            }));
            break;

          case 'text_response':
            console.log('✅ Received text response:', message.text);
            testResults.eventFormat = true;

            // Test completed successfully
            console.log('\n🎉 Test completed successfully!');
            clearTimeout(timeout);
            ws.close();
            resolve(testResults);
            break;

          case 'transcription':
            console.log('✅ Received transcription:', message.text);
            break;

          case 'audio_response':
            console.log('✅ Received audio response (length:', message.audio?.length || 0, 'chars)');
            break;

          case 'error':
            console.error('❌ Received error:', message.error);
            testResults.error = message.error;

            // Check if it's the old "No events to transform" error
            if (message.error.includes('No events to transform')) {
              console.log('🔍 This is the event format error we were trying to fix');
              testResults.eventFormat = false;
            }

            clearTimeout(timeout);
            ws.close();
            resolve(testResults);
            break;

          default:
            console.log('📋 Other message type:', message.type);
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error);
        testResults.error = error.message;
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      testResults.error = error.message;
      clearTimeout(timeout);
      resolve(testResults);
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed (code: ${code}, reason: ${reason?.toString() || 'none'})`);
      clearTimeout(timeout);
      if (!testResults.initialization && !testResults.error) {
        testResults.error = 'Connection closed unexpectedly';
      }
      resolve(testResults);
    });
  });
}

// Run the test
testNovaSonic().then((results) => {
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`Connection:     ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Initialization: ${results.initialization ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Event Format:   ${results.eventFormat ? '✅ PASS' : '❌ FAIL'}`);

  if (results.error) {
    console.log(`Error:          ❌ ${results.error}`);
  }

  console.log('\n🔍 Analysis:');
  if (results.connection && results.initialization && results.eventFormat) {
    console.log('🎉 SUCCESS: Nova 2 Sonic integration is working correctly!');
    console.log('   The event format fix resolved the "No events to transform" error.');
  } else if (results.connection && results.initialization && !results.eventFormat) {
    console.log('⚠️  PARTIAL: Connection and initialization work, but event format needs more work.');
  } else if (results.connection && !results.initialization) {
    console.log('⚠️  PARTIAL: Connection works, but initialization failed.');
    console.log('   Check AWS credentials and permissions.');
  } else {
    console.log('❌ FAILED: Basic connection issues need to be resolved first.');
  }

  process.exit(results.connection && results.initialization && results.eventFormat ? 0 : 1);
}).catch((error) => {
  console.error('💥 Test failed with exception:', error);
  process.exit(1);
});