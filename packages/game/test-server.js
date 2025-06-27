// Simple test server to verify basic functionality
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting test server for autonomous coding game...');

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Autonomous Coding Game Test Server Running',
    timestamp: new Date().toISOString() 
  });
});

// Serve static files from dist folder (if exists)
app.use(express.static(path.join(__dirname, 'dist')));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.emit('connection_established', {
    socketId: socket.id,
    message: 'Connected to Autonomous Coding Game Server'
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  // Test game message handling
  socket.on('game_action', (data) => {
    console.log('🎮 Game action received:', data);
    socket.emit('game_response', {
      action: data.action,
      status: 'received',
      timestamp: Date.now()
    });
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`✅ Socket.IO server ready for real-time communication`);
  console.log(`✅ Health check available at http://localhost:${PORT}/health`);
  console.log('\n🎯 Ready to test the autonomous coding game frontend!');
  console.log('📝 Next steps:');
  console.log('   1. Start the frontend: bun run dev:frontend');
  console.log('   2. Open http://localhost:5173 in your browser');
  console.log('   3. Test the game dashboard interface');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  httpServer.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});