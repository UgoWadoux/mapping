const express = require('express');
const WebSocket = require('ws');
const osc = require('osc');

const app = express();
const PORT = 3000;

// Serve frontend files
app.use(express.static('public'));
app.listen(PORT, () => console.log(`Frontend at http://localhost:${PORT}`));

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 });
console.log('WebSocket server on ws://localhost:8080');

// Create OSC UDP port
const udpPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: 57121,
    remoteAddress: '192.168.1.24',
    remotePort: 8081, // Port MadMapper écoute
});

udpPort.open();

// WebSocket → OSC
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log('Sending OSC:', data);
        udpPort.send({
            address: data.address,
            args: data.args || [],
        });
    });
});

