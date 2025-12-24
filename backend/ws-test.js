const WebSocket = require('ws');

async function testConnection(port) {
    const url = `ws://localhost:${port}/api/nova-sonic/stream`;
    console.log(`Testing connection to ${url}...`);

    return new Promise((resolve) => {
        const ws = new WebSocket(url);

        ws.on('open', () => {
            console.log(`✅ Connected to port ${port}`);
            ws.close();
            resolve(true);
        });

        ws.on('error', (err) => {
            console.log(`❌ Failed to connect to port ${port}:`, err.message);
            resolve(false);
        });
    });
}

(async () => {
    console.log('--- WebSocket Connectivity Test ---');
    await testConnection(4000); // Backend direct
    await testConnection(4001); // Frontend proxy
})();
