#!/usr/bin/env node

/**
 * Minimal Nova 2 Sonic Test
 * 
 * This script tests the exact event format by sending minimal events directly to AWS
 */

const { BedrockRuntimeClient, InvokeModelWithBidirectionalStreamCommand } = require('../backend/node_modules/@aws-sdk/client-bedrock-runtime');
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

async function testMinimalNovaSonic() {
  console.log('🧪 Minimal Nova 2 Sonic Event Format Test');
  console.log('==========================================\n');

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

  // Create Bedrock client
  const client = new BedrockRuntimeClient({
    region: awsRegion,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
      sessionToken: awsSessionToken || undefined,
    }
  });

  // Create minimal async generator (based on working Voice_S2S format)
  async function* createMinimalInputStream() {
    const promptName = `prompt-${Date.now()}`;

    console.log('📤 Sending Session Start Event...');

    // 1. Session Start Event (exact format from Voice_S2S)
    const sessionStartEvent = {
      event: {
        sessionStart: {
          inferenceConfiguration: {
            maxTokens: 2048,
            topP: 0.9,
            temperature: 0.7
          },
          turnDetectionConfiguration: {
            endpointingSensitivity: "HIGH"
          }
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(sessionStartEvent)) } };
    console.log('✅ Session Start Event sent');

    console.log('📤 Sending Prompt Start Event...');

    // 2. Prompt Start Event
    const promptStartEvent = {
      event: {
        promptStart: {
          promptName: promptName,
          textOutputConfiguration: {
            mediaType: "text/plain"
          },
          audioOutputConfiguration: {
            mediaType: "audio/lpcm",
            sampleRateHertz: 24000,
            sampleSizeBits: 16,
            channelCount: 1,
            voiceId: "matthew",
            encoding: "base64",
            audioType: "SPEECH"
          }
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(promptStartEvent)) } };
    console.log('✅ Prompt Start Event sent');

    console.log('📤 Sending System Content...');

    // 3. System Content
    const systemContentName = `system-${Date.now()}`;

    // System Content Start
    const systemContentStartEvent = {
      event: {
        contentStart: {
          promptName: promptName,
          contentName: systemContentName,
          type: "TEXT",
          interactive: false,
          role: "SYSTEM",
          textInputConfiguration: {
            mediaType: "text/plain"
          }
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(systemContentStartEvent)) } };

    // System Text Input
    const systemTextInputEvent = {
      event: {
        textInput: {
          promptName: promptName,
          contentName: systemContentName,
          content: "You are a helpful AI assistant. Please respond briefly to test the integration."
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(systemTextInputEvent)) } };

    // System Content End
    const systemContentEndEvent = {
      event: {
        contentEnd: {
          promptName: promptName,
          contentName: systemContentName
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(systemContentEndEvent)) } };
    console.log('✅ System Content sent');

    console.log('📤 Sending User Text Content...');

    // 4. User Text Content
    const textContentName = `text-${Date.now()}`;

    // Text Content Start
    const textContentStartEvent = {
      event: {
        contentStart: {
          promptName: promptName,
          contentName: textContentName,
          type: "TEXT",
          interactive: true,
          role: "USER",
          textInputConfiguration: {
            mediaType: "text/plain"
          }
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(textContentStartEvent)) } };

    // Text Input
    const textInputEvent = {
      event: {
        textInput: {
          promptName: promptName,
          contentName: textContentName,
          content: "Hello Nova 2 Sonic, please say hello back to test the integration."
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(textInputEvent)) } };

    // Text Content End
    const textContentEndEvent = {
      event: {
        contentEnd: {
          promptName: promptName,
          contentName: textContentName
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(textContentEndEvent)) } };
    console.log('✅ User Text Content sent');

    console.log('📤 Sending Silent Audio (required by Nova 2 Sonic)...');

    // 5. Silent Audio (required by Nova 2 Sonic protocol)
    const silenceContentName = `audio-silence-${Date.now()}`;
    const SILENCE_FRAME = Buffer.alloc(3200, 0); // 100ms of silence at 16kHz

    // Silence Audio Start
    const silenceStartEvent = {
      event: {
        contentStart: {
          promptName: promptName,
          contentName: silenceContentName,
          type: "AUDIO",
          interactive: true,
          role: "USER",
          audioInputConfiguration: {
            mediaType: "audio/lpcm",
            sampleRateHertz: 16000,
            sampleSizeBits: 16,
            channelCount: 1,
            audioType: "SPEECH",
            encoding: "base64"
          }
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(silenceStartEvent)) } };

    // Silence Audio Input
    const silenceInputEvent = {
      event: {
        audioInput: {
          promptName: promptName,
          contentName: silenceContentName,
          content: SILENCE_FRAME.toString('base64')
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(silenceInputEvent)) } };

    // Silence Audio End
    const silenceEndEvent = {
      event: {
        contentEnd: {
          promptName: promptName,
          contentName: silenceContentName
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(silenceEndEvent)) } };
    console.log('✅ Silent Audio sent');

    // DON'T send end events immediately - let Nova 2 Sonic respond first
    console.log('⏳ Waiting for Nova 2 Sonic to respond...');

    // Wait a bit to allow Nova 2 Sonic to process and respond
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📤 Sending End Events...');

    // 6. Prompt End
    const promptEndEvent = {
      event: {
        promptEnd: {
          promptName: promptName
        }
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(promptEndEvent)) } };

    // 7. Session End
    const sessionEndEvent = {
      event: {
        sessionEnd: {}
      }
    };
    yield { chunk: { bytes: Buffer.from(JSON.stringify(sessionEndEvent)) } };
    console.log('✅ End Events sent');
  }

  try {
    console.log('🚀 Creating bidirectional stream command...');

    // Create the command
    const command = new InvokeModelWithBidirectionalStreamCommand({
      modelId: 'amazon.nova-2-sonic-v1:0',
      body: createMinimalInputStream(),
    });

    console.log('📡 Sending command to AWS Bedrock...');

    // Execute the command
    const response = await client.send(command);

    console.log('✅ Command sent successfully! Processing response...');

    if (response.body) {
      let eventCount = 0;

      for await (const chunk of response.body) {
        if (chunk.chunk?.bytes) {
          eventCount++;
          try {
            const eventData = JSON.parse(Buffer.from(chunk.chunk.bytes).toString());
            const eventType = Object.keys(eventData.event || eventData)[0];
            console.log(`📥 Event ${eventCount}: ${eventType}`);

            const event = eventData.event || eventData;

            if (event.textOutput) {
              console.log(`💬 Text Response: "${event.textOutput.content}"`);
            }

            if (event.audioOutput) {
              const audioBytes = Buffer.from(event.audioOutput.content, 'base64');
              console.log(`🔊 Audio Response: ${audioBytes.length} bytes`);
            }

            if (event.contentStart) {
              console.log(`🎬 Content Start: ${event.contentStart.type} (${event.contentStart.role})`);
            }

            if (event.contentEnd) {
              console.log(`🏁 Content End: ${event.contentEnd.promptName} (${event.contentEnd.stopReason || 'normal'})`);
            }

            if (event.usageEvent) {
              console.log(`📊 Usage: ${JSON.stringify(event.usageEvent)}`);
            }

          } catch (parseError) {
            console.error(`❌ Error parsing event ${eventCount}:`, parseError);
            console.log(`Raw chunk: ${Buffer.from(chunk.chunk.bytes).toString()}`);
          }
        }
      }

      console.log(`\n🎉 SUCCESS! Processed ${eventCount} events from Nova 2 Sonic`);
      console.log('✅ Event format is correct - Nova 2 Sonic is working!');

    } else {
      console.log('⚠️  No response body received');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);

    if (error.message.includes('Input Chunk does not contain an event')) {
      console.log('🔍 This is the event format error - our format is still wrong');
    } else if (error.message.includes('ValidationException')) {
      console.log('🔍 Validation error - check model ID and region');
    } else if (error.message.includes('AccessDeniedException')) {
      console.log('🔍 Access denied - check AWS credentials and permissions');
    }

    console.log('\n📋 Error Details:');
    console.log('Message:', error.message);
    if (error.$metadata) {
      console.log('HTTP Status:', error.$metadata.httpStatusCode);
      console.log('Request ID:', error.$metadata.requestId);
    }

    process.exit(1);
  }
}

// Run the test
testMinimalNovaSonic().then(() => {
  console.log('\n✅ Test completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Test failed:', error);
  process.exit(1);
});