const WebSocket = require('ws');
require('dotenv').config();

const WS_URL = 'ws://localhost:4000/api/nova-sonic/stream';

async function test() {
    console.log('Connecting to:', WS_URL);
    const ws = new WebSocket(WS_URL);

    ws.on('open', () => {
        console.log('Connected');

        const initMsg = {
            type: 'initialize',
            awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
            awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            awsSessionToken: process.env.AWS_SESSION_TOKEN,
            awsRegion: 'us-east-1',
            systemPrompt: 'You are a helpful assistant.',
            userId: 'test-script-user'
        };
        console.log('Sending initialize...');
        ws.send(JSON.stringify(initMsg));
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        console.log('Rx:', msg.type, msg);

        if (msg.type === 'initialized') {
            console.log('Session initialized:', msg.sessionId);

            // Send text after initialization
            setTimeout(() => {
                console.log('Sending text message...');
                ws.send(JSON.stringify({
                    type: 'text_message',
                    text: 'Hello, this is a test.'
                }));
            }, 1000);
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket Error:', err.message);
    });

    ws.on('close', (code, reason) => {
        console.log('WebSocket Closed:', code, reason.toString());
    });
}

test();
