const Stream = require('node-rtsp-stream');
const fs = require('fs');

// Load camera config
const configPath = './cameras.json';
if (!fs.existsSync(configPath)) {
  console.error("cameras.json not found! Please create it from the template.");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log("Starting Camera Bridge Server...");
console.log("Make sure ffmpeg is installed and added to your system PATH.");

const streams = [];

config.cameras.forEach((cam) => {
  console.log(`Starting stream for ${cam.name} on port ${cam.wsPort}...`);
  const stream = new Stream({
    name: cam.name,
    streamUrl: cam.rtspUrl,
    wsPort: cam.wsPort,
    ffmpegOptions: { // Options to tweak latency/quality
      '-stats': '',
      '-r': 30, // frame rate
      '-s': '640x360', // resolution (reduce for lower bandwidth)
      '-c:v': 'mpeg1video',
      '-b:v': '800k',
      '-bf': 0
    }
  });
  streams.push(stream);
});

console.log(`\nCamera Bridge Server is running!`);
console.log(`Streaming ${config.cameras.length} cameras to WebSockets.`);
