import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // ─── Socket.io ────────────────────────────────────────────────
  const io = new SocketIOServer(server, {
    path: '/api/socketio',
    cors: {
      origin: dev ? '*' : undefined, // restrict in production if needed
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Store io instance globally so API routes can access it via getIO()
  (globalThis as Record<string, unknown>).__io = io;

  io.on('connection', (socket) => {
    if (dev) {
      console.log(`  🔌 Socket connected: ${socket.id}`);
    }

    // Restaurant owner joins their room
    socket.on('join-restaurant', (ownerId: string) => {
      if (typeof ownerId === 'string' && ownerId.length > 0) {
        socket.join(`restaurant:${ownerId}`);
        if (dev) {
          console.log(`  📡 ${socket.id} joined restaurant:${ownerId}`);
        }
      }
    });

    socket.on('disconnect', (reason) => {
      if (dev) {
        console.log(`  ❌ Socket disconnected: ${socket.id} (${reason})`);
      }
    });
  });

  // ─── Start ────────────────────────────────────────────────────
  server.listen(port, () => {
    console.log(`\n  ✅ QRestro ready on http://${hostname}:${port}`);
    console.log(`  📡 Socket.io listening on /api/socketio`);
    console.log(`  🌍 Environment: ${dev ? 'development' : 'production'}\n`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n  Shutting down...');
    io.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
