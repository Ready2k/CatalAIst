// Test Nova 2 Sonic speech synthesis
const fetch = require('node-fetch');

async function testSynthesize() {
  console.log('Testing Nova 2 Sonic speech synthesis...');
  
  try {
    const response = await fetch('http://localhost:8080/api/voice/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello, this is a test of Nova 2 Sonic speech synthesis.',
        voice: 'matthew',
        provider: 'bedrock',
        sessionId: 'test-session',
        userId: 'test-user',
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsRegion: 'us-east-1'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());

    if (response.ok) {
      const buffer = await response.buffer();
      console.log('✅ Success! Received audio buffer:', buffer.length, 'bytes');
      
      // Save to file for testing
      const fs = require('fs');
      fs.writeFileSync('test-output.wav', buffer);
      console.log('Audio saved to test-output.wav');
    } else {
      const error = await response.text();
      console.error('❌ Error:', error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testSynthesize();
