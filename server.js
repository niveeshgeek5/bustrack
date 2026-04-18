const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

let busLocation = null;
let locationBuffer = [];
let speedHistory = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  if (busLocation) {
    socket.emit('bus:update', busLocation);
  }

  socket.on('driver:location', (data) => {
    const now = Date.now();

    if (busLocation) {
      const dist = getDistance(busLocation.lat, busLocation.lng, data.lat, data.lng);
      const timeDiff = (now - busLocation.timestamp) / 1000 / 3600;
      const speed = timeDiff > 0 ? dist / timeDiff : 0;
      if (speed > 0 && speed < 100) speedHistory.push(speed);
      if (speedHistory.length > 20) speedHistory.shift();
    }

    busLocation = { ...data, timestamp: now };
    locationBuffer.push(busLocation);
    if (locationBuffer.length > 200) locationBuffer.shift();

    const avgSpeed = speedHistory.length > 0
      ? speedHistory.reduce((a, b) => a + b) / speedHistory.length
      : 20;

    io.emit('bus:update', { ...busLocation, avgSpeed });
    console.log(`Bus → lat: ${data.lat}, lng: ${data.lng}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
}); 
