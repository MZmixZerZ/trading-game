const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const supabase = require('./supabaseClient');
const { gameRooms, playerRooms } = require('./state');
const { initSocketHandlers } = require('./socket/handlers');

const app = express();
const server = http.createServer(app);

// ===== CORS =====

const getAllowedOrigins = () => {
  const productionOrigins = [
    process.env.CLIENT_URL, process.env.FRONTEND_URL, process.env.PROXY_SERVER_URL,
    'https://trading-game-client-mauve.vercel.app',
    'https://streaming-ideatrade.vercel.app',
    'https://trading-game.vercel.app',
    'https://streaming-ideatrade.netlify.app',
    'https://streaming-ideatrade.onrender.com'
  ].filter(Boolean);

  const developmentOrigins = [
    'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
    'http://localhost:3003', 'http://localhost:3004',
    'http://localhost:3413', 'http://localhost:3412',
    'http://147.50.252.213:3412',
    'http://192.168.214.1:3000', 'http://192.168.214.1:3412',
    'http://192.168.245.100:3000', 'http://192.168.245.100:3412'
  ];

  return process.env.NODE_ENV === 'production'
    ? [...productionOrigins, ...developmentOrigins]
    : [...developmentOrigins, ...productionOrigins];
};

const allowedOrigins = getAllowedOrigins();

function corsOriginFn(origin, callback) {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('192.168.'))) {
    return callback(null, true);
  }
  if (process.env.NODE_ENV === 'production') {
    const patterns = [
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.netlify\.app$/,
      /^https:\/\/.*\.herokuapp\.com$/,
      /^https:\/\/.*\.onrender\.com$/
    ];
    if (patterns.some(p => p.test(origin))) return callback(null, true);
  }
  callback(new Error('Not allowed by CORS'));
}

const io = socketIo(server, {
  cors: { origin: corsOriginFn, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling']
});

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

app.use(cors({ origin: corsOriginFn, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

// ===== HEALTH =====

app.get('/health', (req, res) => {
  try {
    const routes = (app._router?.stack || [])
      .filter((l) => l.route?.path)
      .map((l) => ({ path: l.route.path, methods: Object.keys(l.route.methods || {}) }));

    res.json({
      status: 'ok',
      port: Number(process.env.PORT || 5000),
      allowedOrigins,
      connections: { total: io?.engine?.clientsCount || 0, rooms: gameRooms?.size || 0, players: playerRooms?.size || 0 },
      database: { supabase: !!supabase },
      routes: { count: routes.length, paths: routes },
      timestamp: new Date().toISOString()
    });
  } catch {
    res.json({ status: 'ok', error: 'Could not fetch detailed info', timestamp: new Date().toISOString() });
  }
});

app.get('/test-multiplayer', (req, res) => {
  const { port: clientPort } = req.query;
  const clientOrigin = req.headers.origin || `http://localhost:${clientPort || '3412'}`;
  let isAllowed = allowedOrigins.includes(clientOrigin);
  if (!isAllowed && process.env.NODE_ENV !== 'production' && clientOrigin.includes('localhost')) isAllowed = true;
  if (!isAllowed && process.env.NODE_ENV === 'production') {
    isAllowed = [/^https:\/\/.*\.vercel\.app$/, /^https:\/\/.*\.netlify\.app$/, /^https:\/\/.*\.herokuapp\.com$/, /^https:\/\/.*\.onrender\.com$/].some(p => p.test(clientOrigin));
  }
  res.json({
    message: 'Multiplayer connection test', clientOrigin, isAllowed, allowedOrigins,
    environment: process.env.NODE_ENV || 'development', serverPort: process.env.PORT || 5000,
    socketIOEnabled: !!io, status: isAllowed ? 'READY_TO_CONNECT' : 'ORIGIN_NOT_ALLOWED',
    timestamp: new Date().toISOString()
  });
});

// ===== ROUTES =====

app.use('/api', require('./routes/quiz'));
app.use('/api', require('./routes/profile'));
app.use('/api', require('./routes/stock'));
app.use('/api', require('./routes/game'));
app.use('/api', require('./routes/chart'));

// ===== SOCKET.IO =====

initSocketHandlers(io);

// ===== PROCESS HANDLERS =====

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('🚨 Unhandled Rejection:', reason);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

process.on('SIGTERM', () => {
  server.close(() => { console.log('💤 HTTP server closed'); process.exit(0); });
});

process.on('SIGINT', () => {
  server.close(() => { console.log('💤 HTTP server closed'); process.exit(0); });
});

// ===== LISTEN =====

const PORT = process.env.SERVER_PORT || process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📡 Socket.IO enabled for multiplayer gaming`);
  console.log(`🗄️  Supabase status: ${supabase ? 'Connected' : 'Using memory fallback'}`);
}).on('error', (error) => {
  console.error('🚨 Server startup error:', error);
  if (error.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use.`);
  process.exit(1);
});
