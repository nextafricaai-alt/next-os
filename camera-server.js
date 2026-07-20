const Stream = require('node-rtsp-stream');

const IP = '192.168.100.18';
const USER = process.env.HIKVISION_USER || 'admin';
const PASS = process.env.HIKVISION_PASS || 'password123';

console.log(`Starting Hikvision Live Feed Server targeting IP: ${IP}...`);
console.log('Ensure you have provided the correct username and password via HIKVISION_USER and HIKVISION_PASS environment variables if the defaults do not work.');

// Hikvision RTSP URL Structure:
// rtsp://<username>:<password>@<ip>:<port>/Streaming/Channels/<channel_number>01
// Example: Channel 1 main stream = 101, Channel 2 main stream = 201

// Setup Camera 1: Playroom A (wsPort 9999) - Assuming Channel 1
const stream1 = new Stream({
  name: 'Playroom A - North View',
  streamUrl: `rtsp://${USER}:${PASS}@${IP}:554/Streaming/Channels/101`,
  wsPort: 9999,
  ffmpegOptions: {
    '-stats': '', 
    '-r': 30 
  }
});

// Setup Camera 2: Nap Area (wsPort 9998) - Assuming Channel 2
const stream2 = new Stream({
  name: 'Nap Area - East Wing',
  streamUrl: `rtsp://${USER}:${PASS}@${IP}:554/Streaming/Channels/201`,
  wsPort: 9998,
  ffmpegOptions: {
    '-stats': '', 
    '-r': 30 
  }
});

console.log('Server running. Waiting for connections on ws://localhost:9999 and ws://localhost:9998...');
