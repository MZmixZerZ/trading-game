const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const yahooFinance = require("yahoo-finance2").default;
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require('firebase-admin');

const app = express();
const server = http.createServer(app);

// Socket.IO Setup with CORS - รองรับทั้ง development และ production
const getAllowedOrigins = () => {
  // Production domains
  const productionOrigins = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.PROXY_SERVER_URL, // เพิ่ม proxy server URL
    'https://streaming-ideatrade.vercel.app',
    'https://streaming-ideatrade.netlify.app',
    'https://streaming-ideatrade.herokuapp.com',
    'https://streaming-ideatrade.onrender.com'
  ].filter(Boolean); // Remove undefined values

  // Development origins
  const developmentOrigins = [
    "http://localhost:3000", 
    "http://localhost:3001", 
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3413",
    "http://localhost:3412",
    "http://147.50.252.213:3412",
    "http://192.168.214.1:3000",
    "http://192.168.214.1:3412",
    "http://192.168.245.100:3000",
    "http://192.168.245.100:3412"
  ];

  // In production, allow production origins + localhost for testing
  // In development, allow both
  return process.env.NODE_ENV === 'production' 
    ? [...productionOrigins, ...developmentOrigins]
    : [...developmentOrigins, ...productionOrigins];
};

const allowedOrigins = getAllowedOrigins();

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, postman, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow any localhost with any port in development
      if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('192.168.'))) {
        return callback(null, true);
      }
      
      // Allow vercel, netlify, heroku, render subdomains in production
      if (process.env.NODE_ENV === 'production') {
        const productionPatterns = [
          /^https:\/\/.*\.vercel\.app$/,
          /^https:\/\/.*\.netlify\.app$/,
          /^https:\/\/.*\.herokuapp\.com$/,
          /^https:\/\/.*\.onrender\.com$/
        ];
        
        if (productionPatterns.some(pattern => pattern.test(origin))) {
          return callback(null, true);
        }
      }
      
      // Reject other origins
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Add middleware to set security headers for development
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// CORS Configuration - รองรับทั้ง development และ production
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow any localhost with any port in development
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Allow vercel, netlify, heroku, render subdomains in production
    if (process.env.NODE_ENV === 'production') {
      const productionPatterns = [
        /^https:\/\/.*\.vercel\.app$/,
        /^https:\/\/.*\.netlify\.app$/,
        /^https:\/\/.*\.herokuapp\.com$/,
        /^https:\/\/.*\.onrender\.com$/
      ];
      
      if (productionPatterns.some(pattern => pattern.test(origin))) {
        return callback(null, true);
      }
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Enhanced health endpoint with connection info
app.get('/health', (req, res) => {
  try {
    const port = process.env.PORT || 5000;
    const connectionCount = io?.engine?.clientsCount || 0;
    const roomCount = gameRooms?.size || 0;
    const playerCount = playerRooms?.size || 0;
    
    // Safely list direct route paths (ignore nested routers to avoid implementation details)
    const routes = (app._router?.stack || [])
      .filter((l) => l.route && l.route.path)
      .map((l) => ({ path: l.route.path, methods: Object.keys(l.route.methods || {}) }));
    
    res.json({ 
      status: 'ok', 
      port: Number(port),
      allowedOrigins: allowedOrigins,
      connections: {
        total: connectionCount,
        rooms: roomCount,
        players: playerCount
      },
      routes: {
        count: routes.length,
        paths: routes
      },
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.json({ 
      status: 'ok',
      error: 'Could not fetch detailed info',
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint for multiplayer connections
app.get('/test-multiplayer', (req, res) => {
  const { port: clientPort } = req.query;
  const clientOrigin = req.headers.origin || `http://localhost:${clientPort || '3412'}`;
  
  // Check if origin would be allowed by our CORS logic
  let isAllowed = allowedOrigins.includes(clientOrigin);
  
  // Check localhost in development
  if (!isAllowed && process.env.NODE_ENV !== 'production' && clientOrigin.includes('localhost')) {
    isAllowed = true;
  }
  
  // Check production patterns
  if (!isAllowed && process.env.NODE_ENV === 'production') {
    const productionPatterns = [
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.netlify\.app$/,
      /^https:\/\/.*\.herokuapp\.com$/,
      /^https:\/\/.*\.onrender\.com$/
    ];
    
    isAllowed = productionPatterns.some(pattern => pattern.test(clientOrigin));
  }
  
  res.json({
    message: 'Multiplayer connection test',
    clientOrigin: clientOrigin,
    isAllowed: isAllowed,
    allowedOrigins: allowedOrigins,
    environment: process.env.NODE_ENV || 'development',
    serverPort: process.env.PORT || 5000,
    socketIOEnabled: !!io,
    status: isAllowed ? 'READY_TO_CONNECT' : 'ORIGIN_NOT_ALLOWED',
    instructions: isAllowed ? 
      'Your client can connect to this server' : 
      `Add ${clientOrigin} to environment variables or ensure proper domain pattern`,
    timestamp: new Date().toISOString()
  });
});

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// AI Grading Configuration
const AI_CORRECT_THRESHOLD = Number(process.env.QUIZ_AI_CORRECT_THRESHOLD ?? 0.6);

// Firebase Admin setup - แก้ไขให้ใช้ Firebase เป็นหลัก
let db = null;

try {
  // ตรวจสอบว่ามีไฟล์ service account key หรือไม่
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!serviceAccountPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set.');
  }

  // อ่าน service account key จากไฟล์
  const path = require('path');
  const fs = require('fs');
  
  const fullPath = path.resolve(__dirname, serviceAccountPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Service account file not found at: ${fullPath}`);
  }
  
  const serviceAccount = require(fullPath);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'streaming-ideatrade',
    });
  }
  
  db = admin.firestore();
  console.log('✅ Firebase connected successfully');
  console.log(`🔥 Firebase status: Connected to project ${process.env.FIREBASE_PROJECT_ID || 'streaming-ideatrade'}`);
} catch (error) {
  console.warn('⚠️ Firebase connection failed:', error.message);
  console.log('📝 Will use fallback storage for data persistence');
  db = null;
}

// Fallback: In-memory storage สำหรับกรณีไม่ได้เชื่อม Firebase
const quizHistory = new Map(); // userId -> quiz data
const userProfiles = new Map(); // userId -> user profile data

// =============================================================================
// SOCKET.IO MULTIPLAYER GAME SYSTEM
// =============================================================================

// Game state management
const gameRooms = new Map(); // roomId -> room data
const playerRooms = new Map(); // playerId -> roomId

// Firebase Helper Functions
async function saveRoomToFirebase(roomId, roomData) {
  if (!db) return;
  try {
    await db.collection('rooms').doc(roomId).set({
      ...roomData,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving room to Firebase:', error);
  }
}

async function savePlayerToFirebase(roomId, playerId, playerData) {
  if (!db) return;
  try {
    await db.collection('rooms').doc(roomId)
      .collection('players').doc(playerId).set({
        ...playerData,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
  } catch (error) {
    console.error('Error saving player to Firebase:', error);
  }
}

async function saveGameResultToFirebase(roomId, gameResult) {
  if (!db) return;
  try {
    await db.collection('gameResults').add({
      roomId,
      ...gameResult,
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving game result to Firebase:', error);
  }
}

// Socket.IO connection handling with enhanced error handling
io.on('connection', (socket) => {
  const { userId, userName } = socket.handshake.query;
  const clientOrigin = socket.handshake.headers.origin;
  
  console.log(`🔗 Player connected: ${socket.id}`);
  console.log(`👤 User: ${userName} (${userId}) from ${clientOrigin}`);
  console.log(`🌐 Total connections: ${io.engine.clientsCount}`);

  // Enhanced error handler for socket events
  const handleSocketError = (eventName, error, socket) => {
    console.error(`🚨 Socket error in ${eventName}:`, error);
    console.error('Stack:', error.stack);
    socket.emit('error', { 
      message: `Error in ${eventName}`, 
      code: error.code || 'UNKNOWN_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  };

  // Wrap socket handlers with error handling
  const withErrorHandling = (eventName, handler) => {
    return async (...args) => {
      try {
        await handler(...args);
      } catch (error) {
        handleSocketError(eventName, error, socket);
      }
    };
  };

  // Join game room
  socket.on('join-room', withErrorHandling('join-room', async ({ roomId, playerId, playerName, roomSettings = {} }) => {
    console.log(`🚪 Player attempting to join room: ${playerId} (${playerName}) -> Room: ${roomId}`);
    
    if (!roomId || !playerId || !playerName) {
      socket.emit('error', { message: 'Missing required fields: roomId, playerId, or playerName' });
      return;
    }

    // Validate input parameters
    if (typeof roomId !== 'string' || typeof playerId !== 'string' || typeof playerName !== 'string') {
      socket.emit('error', { message: 'Invalid parameter types' });
      return;
    }

    // Leave previous room if any
    const previousRoom = playerRooms.get(playerId);
    if (previousRoom) {
      socket.leave(previousRoom);
      const prevRoomData = gameRooms.get(previousRoom);
      if (prevRoomData && prevRoomData.players) {
        prevRoomData.players.delete(playerId);
        socket.to(previousRoom).emit('player-left', { playerId, playerName });
      }
    }

    // Create room if it doesn't exist
    if (!gameRooms.has(roomId)) {
      console.log('🏠 Creating new room with settings:', roomSettings);
      
      // ใช้ timeLimit จาก roomSettings หรือ default 3 นาที
      const timeLimit = roomSettings.settings?.timeLimit || 3;
      
      const newRoom = {
        id: roomId,
        players: new Map(),
        host: playerId,
        gameState: 'waiting', // เริ่มต้นเป็น waiting เสมอ
        startTime: null,
        duration: timeLimit * 60, // แปลงจากนาทีเป็นวินาที สำหรับ backward compatibility
        chart: {
          symbol: roomSettings.symbol || 'PTT',
          data: [],
          currentIndex: 0,
          isPlaying: false
        },
        settings: {
          maxPlayers: roomSettings.settings?.maxPlayers || 10,
          startingBalance: roomSettings.settings?.startingBalance || 100000,
          timeLimit: timeLimit, // ใช้ค่าจาก frontend
          symbol: roomSettings.symbol || 'PTT'
        },
        symbol: roomSettings.symbol || 'PTT',
        market: roomSettings.market || 'SET',
        startDate: roomSettings.startDate
      };
      gameRooms.set(roomId, newRoom);
      
      // บันทึกห้องใหม่ลง Firebase (with error handling)
      try {
        await saveRoomToFirebase(roomId, {
          hostId: playerId,
          gameState: 'waiting',
          createdAt: new Date(),
          settings: {
            maxPlayers: roomSettings.settings?.maxPlayers || 10,
            startingBalance: roomSettings.settings?.startingBalance || 100000,
            timeLimit: timeLimit, // ใช้ค่าจาก frontend
            symbol: roomSettings.symbol || 'PTT'
          },
          symbol: roomSettings.symbol || 'PTT',
          market: roomSettings.market || 'SET',
          startDate: roomSettings.startDate
        });
      } catch (firebaseError) {
        console.warn('⚠️ Failed to save room to Firebase, continuing with memory storage:', firebaseError.message);
      }
      
      console.log(`🎮 Created new room: ${roomId} with timeLimit: ${timeLimit} minutes`);
    }

    const room = gameRooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Failed to create or access room' });
      return;
    }

    // ตรวจสอบจำนวนผู้เล่นสูงสุด
    const maxPlayers = room.settings?.maxPlayers || 10;
    if (room.players && room.players.size >= maxPlayers) {
      socket.emit('error', { message: `Room is full (${maxPlayers} players maximum)` });
      return;
    }

    // อนุญาตให้เข้าได้ในทุกสถานะ ยกเว้น 'finished'
    if (room.gameState === 'finished') {
      socket.emit('error', { message: 'Game has already finished' });
      return;
    }

    console.log(`✅ Allowing player ${playerName} to join room ${roomId} (state: ${room.gameState})`);
    
    // Add player to room
    const playerData = {
        id: playerId,
        name: playerName,
        socketId: socket.id,
        balance: 100000, // Starting balance
        portfolio: new Map(), // symbol -> { shares, avgPrice }
        trades: [],
        isReady: false,
        joinedAt: new Date()
      };
      
      if (!room.players) {
        room.players = new Map();
      }
      
      room.players.set(playerId, playerData);

      // บันทึกผู้เล่นลง Firebase (with error handling)
      try {
        await savePlayerToFirebase(roomId, playerId, {
          uid: playerId,
          displayName: playerName,
          balance: playerData.balance,
          isReady: false,
          isOnline: true,
          joinedAt: new Date()
        });
      } catch (firebaseError) {
        console.warn('⚠️ Failed to save player to Firebase, continuing with memory storage:', firebaseError.message);
      }

      playerRooms.set(playerId, roomId);
      socket.join(roomId);

      // Safely get players list
      const playersList = room.players ? Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isReady: p.isReady || false,
        balance: p.balance || 100000
      })) : [];

      // Notify player joined successfully - รวมข้อมูล settings ที่ถูกต้องด้วย
      socket.emit('room-joined', {
        roomId,
        playerId,
        isHost: room.host === playerId,
        players: playersList,
        gameState: room.gameState || 'waiting',
        settings: room.settings || {
          maxPlayers: 10,
          startingBalance: 100000,
          timeLimit: 3, // fallback ถ้าไม่มี room.settings
          symbol: room.chart?.symbol || 'PTT'
        },
        symbol: room.symbol || room.chart?.symbol || 'PTT',
        market: room.market || 'SET',
        startDate: room.startDate
      });

      // Notify other players
      socket.to(roomId).emit('player-joined', {
        playerId,
        playerName,
        players: playersList
      });

      console.log(`👤 Player ${playerName} joined room ${roomId}`);
  }));

  // Player ready status
  socket.on('player-ready', withErrorHandling('player-ready', async ({ playerId }) => {
    if (!playerId) {
      socket.emit('error', { message: 'Missing playerId' });
      return;
    }

    const roomId = playerRooms.get(playerId);
    if (!roomId) {
      socket.emit('error', { message: 'Player not in any room' });
      return;
    }

    const room = gameRooms.get(roomId);
    if (!room || !room.players) {
      socket.emit('error', { message: 'Room not found or invalid' });
      return;
    }

    const player = room.players.get(playerId);
    
    if (player) {
      player.isReady = true;
      
      // Safely get players list
      const playersList = Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        isReady: p.isReady || false,
        balance: p.balance || 100000
      }));
      
      // Notify all players in room
      io.to(roomId).emit('player-ready-update', {
        playerId,
        players: playersList
      });

      console.log(`✅ Player ${player.name} is ready in room ${roomId}`);
    } else {
      socket.emit('error', { message: 'Player not found in room' });
    }
  }));

  // Start countdown (host only) - ส่ง countdown ให้ทุกคนในห้อง
  socket.on('start-countdown', withErrorHandling('start-countdown', async ({ roomId: directRoomId, playerId }) => {
      const roomId = directRoomId || playerRooms.get(playerId);
      if (!roomId) {
        socket.emit('error', { message: 'Room not specified and player not in any room' });
        return;
      }

      const room = gameRooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Check if they're the host
      if (playerId && room.host !== playerId) {
        socket.emit('error', { message: 'Only host can start countdown' });
        return;
      }

      console.log(`⏰ Host ${playerId} starting countdown for room ${roomId}`);
      
      // ส่ง countdown event ให้ทุกคนในห้อง
      io.to(roomId).emit('countdown-started', {
        duration: 10, // 10 วินาที
        startedBy: playerId
      });

      // Log countdown start
      console.log(`📢 Countdown started in room ${roomId} by host ${playerId}`);
  }));

  // Start game (host only)
  socket.on('start-game', withErrorHandling('start-game', async ({ roomId: directRoomId, playerId, startTime, symbol = 'PTT', duration = 300 }) => {
      const roomId = directRoomId || playerRooms.get(playerId);
      if (!roomId) {
        socket.emit('error', { message: 'Room not specified and player not in any room' });
        return;
      }

      const room = gameRooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // If playerId is provided, check if they're the host
      if (playerId && room.host !== playerId) {
        socket.emit('error', { message: 'Only host can start the game' });
        return;
      }

      if (room.gameState !== 'waiting') {
        console.log(`🎮 Room ${roomId} already in state: ${room.gameState}`);
        // ถ้าเกมเริ่มแล้ว ส่งข้อมูลเกมกลับไปให้ client
        if (room.gameState === 'playing' && room.chart) {
          console.log(`🎮 Sending existing game data for room ${roomId}`);
          socket.emit('game-started', {
            symbol: room.chart.symbol,
            duration: room.duration,
            startTime: room.startTime,
            initialChart: room.chart.data ? room.chart.data.slice(0, 10) : []
          });
          return;
        }
        socket.emit('error', { message: 'Game already started' });
        return;
      }

      // Generate chart data using existing function
      const seed = Math.floor(Math.random() * 1000000);
      const chartData = generateSeededRandomData(symbol, seed, duration);
      
      room.chart = {
        symbol,
        data: chartData,
        currentIndex: 0,
        isPlaying: true,
        seed
      };
      
      room.gameState = 'playing';
      room.startTime = startTime || Date.now();
      room.startTimeMs = room.startTime; // For compatibility
      room.gameStartTime = room.startTime; // For game timer calculations
      room.duration = duration;
      room.durationSec = duration;

      console.log(`🎮 Game started for room ${roomId}, players: ${room.players.size}`);

      // บันทึกการเริ่มเกมลง Firebase
      await saveRoomToFirebase(roomId, {
        gameState: 'playing',
        startTime: new Date(room.startTime),
        duration: duration,
        symbol: symbol,
        seed: seed
      });

      // Start chart progression
      startRoomChartProgression(roomId);

      // Notify all players
      io.to(roomId).emit('game-started', {
        symbol,
        duration,
        startTime: room.startTime,
        initialChart: chartData.slice(0, 10) // Send first 10 points
      });

      console.log(`🎮 Game started in room ${roomId} with symbol ${symbol}`);
  }));

  // Make trade
  socket.on('make-trade', withErrorHandling('make-trade', async ({ playerId, action, symbol, shares, price }) => {
      // ตรวจสอบค่าที่จำเป็น
      if (!playerId || !action || !symbol || !shares || !price) {
        console.error('❌ Missing required trade data:', { playerId, action, symbol, shares, price });
        socket.emit('error', { message: 'Missing required trade data' });
        return;
      }

      const roomId = playerRooms.get(playerId);
      if (!roomId) {
        socket.emit('error', { message: 'Player not in any room' });
        return;
      }

      const room = gameRooms.get(roomId);
      const player = room?.players.get(playerId);
      
      if (!player || room.gameState !== 'playing') {
        socket.emit('error', { message: 'Cannot trade right now' });
        return;
      }

      const totalCost = shares * price;
      
      if (action === 'buy') {
        if (player.balance < totalCost) {
          socket.emit('error', { message: 'Insufficient balance' });
          return;
        }
        
        player.balance -= totalCost;
        
        if (player.portfolio.has(symbol)) {
          const existing = player.portfolio.get(symbol);
          const newShares = existing.shares + shares;
          const newAvgPrice = ((existing.shares * existing.avgPrice) + totalCost) / newShares;
          player.portfolio.set(symbol, { shares: newShares, avgPrice: newAvgPrice });
        } else {
          player.portfolio.set(symbol, { shares, avgPrice: price });
        }
        
      } else if (action === 'sell') {
        const holding = player.portfolio.get(symbol);
        if (!holding || holding.shares < shares) {
          socket.emit('error', { message: 'Insufficient shares' });
          return;
        }
        
        player.balance += totalCost;
        
        if (holding.shares === shares) {
          player.portfolio.delete(symbol);
        } else {
          holding.shares -= shares;
        }
      }

      // Record trade
      const trade = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        action,    // เพิ่ม action เข้าไป
        symbol,
        shares,
        price,
        total: totalCost
      };
      
      player.trades.push(trade);

      // บันทึกการซื้อขายลง Firebase
      if (db) {
        try {
          await db.collection('trades').add({
            roomId,
            playerId,
            playerName: player.name,
            trade,
            newBalance: player.balance,
            portfolio: Object.fromEntries(player.portfolio),
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
        } catch (error) {
          console.error('Error saving trade to Firebase:', error);
        }
      }

      // Notify player of successful trade
      socket.emit('trade-executed', {
        trade,
        playerId,
        newBalance: player.balance,
        newPosition: player.portfolio.get(symbol)?.shares || 0,
        avgPrice: player.portfolio.get(symbol)?.avgPrice || 0,
        portfolio: Object.fromEntries(player.portfolio)
      });

      // Notify other players of leaderboard update
      const leaderboard = Array.from(room.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        balance: p.balance,
        portfolioValue: calculatePortfolioValue(p.portfolio, room.chart.data[room.chart.currentIndex]?.close || price)
      })).sort((a, b) => (b.balance + b.portfolioValue) - (a.balance + a.portfolioValue));

      io.to(roomId).emit('leaderboard-update', { leaderboard });

      console.log(`💰 ${player.name} executed ${action} ${shares} shares of ${symbol} at ${price}`);
  }));

  // Update room settings (host only)
  socket.on('update-room-settings', withErrorHandling('update-room-settings', ({ roomId, settings }) => {
      const room = gameRooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const playerId = Array.from(playerRooms.entries())
        .find(([_, rId]) => rId === roomId)?.[0];

      if (playerId !== room.host) {
        socket.emit('error', { message: 'Only host can update settings' });
        return;
      }

      // Update room settings
      room.durationSec = settings.durationSec || room.durationSec;
      room.symbol = settings.symbol || room.symbol;
      room.market = settings.market || room.market;

      // Broadcast to all players in room
      io.to(roomId).emit('room-settings-updated', { settings: room });
      console.log(`⚙️ Room ${roomId} settings updated:`, settings);
  }));

  // Update player score/leaderboard - รองรับข้อมูลที่ครบถ้วน
  socket.on('update-player-score', ({ roomId, playerId, totalValue, playerName, balance, position, portfolioValue }) => {
    try {
      const room = gameRooms.get(roomId);
      if (!room) return;

      const player = room.players.get(playerId);
      if (player) {
        // อัปเดตข้อมูลผู้เล่น
        player.totalValue = totalValue || (balance + portfolioValue) || player.totalValue;
        player.balance = balance !== undefined ? balance : player.balance;
        player.position = position !== undefined ? position : player.position;
        player.portfolioValue = portfolioValue !== undefined ? portfolioValue : player.portfolioValue;
        player.lastActive = Date.now();

        // สร้าง leaderboard ที่มีข้อมูลครบถ้วน
        const leaderboard = Array.from(room.players.values())
          .map(p => ({
            id: p.id,
            name: p.name,
            balance: p.balance || 1000000,
            position: p.position || 0,
            portfolioValue: p.portfolioValue || 0,
            totalValue: p.totalValue || p.balance || 1000000,
            lastActive: p.lastActive
          }))
          .sort((a, b) => b.totalValue - a.totalValue);

        // Broadcast ไปยังผู้เล่นทุกคนในห้อง
        io.to(roomId).emit('leaderboard-update', { 
          leaderboard,
          updateTime: Date.now()
        });

        // Log for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 Updated player score: ${playerName} - ฿${totalValue?.toLocaleString()}`);
        }
      }
    } catch (error) {
      console.error('❌ Error updating player score:', error);
    }
  });

  // Finish game
  socket.on('finish-game', async ({ roomId }) => {
    try {
      const room = gameRooms.get(roomId);
      if (!room) return;

      room.gameState = 'finished';
      room.finishTime = Date.now();

      // คำนวณผลลัพธ์สุดท้าย
      const finalResults = Array.from(room.players.values()).map(player => {
        const currentPrice = room.chart.data[room.chart.currentIndex]?.close || 0;
        const portfolioValue = calculatePortfolioValue(player.portfolio, currentPrice);
        const totalValue = player.balance + portfolioValue;
        const totalReturn = totalValue - 100000; // เงินเริ่มต้น
        const returnPercentage = (totalReturn / 100000) * 100;

        return {
          playerId: player.id,
          playerName: player.name,
          balance: player.balance,
          portfolioValue,
          totalValue,
          totalReturn,
          returnPercentage,
          trades: player.trades.length
        };
      }).sort((a, b) => b.totalValue - a.totalValue);

      // บันทึกผลลัพธ์เกมลง Firebase
      await saveGameResultToFirebase(roomId, {
        players: finalResults,
        gameSettings: {
          symbol: room.chart.symbol,
          duration: room.duration,
          seed: room.chart.seed
        },
        startTime: new Date(room.startTime),
        finishTime: new Date(room.finishTime),
        totalPlayers: room.players.size
      });

      // Broadcast to all players
      io.to(roomId).emit('game-finished', { 
        finishTime: room.finishTime,
        finalLeaderboard: finalResults
      });

      console.log(`🏁 Game finished in room ${roomId}`);

    } catch (error) {
      console.error('Error finishing game:', error);
    }
  });

  // Get room list
  socket.on('get-rooms', () => {
    try {
      const rooms = Array.from(gameRooms.values())
        .filter(room => room.gameState === 'waiting')
        .map(room => ({
          id: room.id,
          playerCount: room.players.size,
          hostName: room.players.get(room.host)?.name || 'Unknown'
        }));

      socket.emit('rooms-list', { rooms });
    } catch (error) {
      console.error('Error getting rooms:', error);
      socket.emit('error', { message: 'Failed to get rooms' });
    }
  });

  // Leave room
  socket.on('leave-room', ({ playerId }) => {
    try {
      const roomId = playerRooms.get(playerId);
      if (roomId) {
        const room = gameRooms.get(roomId);
        if (room) {
          const player = room.players.get(playerId);
          room.players.delete(playerId);
          
          socket.to(roomId).emit('player-left', {
            playerId,
            playerName: player?.name || 'Unknown'
          });

          // If room is empty, delete it
          if (room.players.size === 0) {
            gameRooms.delete(roomId);
            console.log(`🗑️ Deleted empty room: ${roomId}`);
          }
        }
        
        playerRooms.delete(playerId);
        socket.leave(roomId);
      }
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', withErrorHandling('disconnect', async (reason) => {
    const { userId, userName } = socket.handshake.query;
    const clientOrigin = socket.handshake.headers.origin;
    
    console.log(`🔌 Player disconnecting: ${socket.id} (${userName}) from ${clientOrigin}`);
    console.log(`📊 Disconnect reason: ${reason}`);
    console.log(`🌐 Remaining connections: ${io.engine.clientsCount - 1}`);
    
    // Find player by socket ID
    let disconnectedPlayerId = null;
    let roomId = null;
    
    for (const [playerId, currentRoomId] of playerRooms.entries()) {
      const room = gameRooms.get(currentRoomId);
      const player = room?.players?.get(playerId);
      if (player?.socketId === socket.id) {
        disconnectedPlayerId = playerId;
        roomId = currentRoomId;
        break;
      }
    }

    if (disconnectedPlayerId && roomId) {
      const room = gameRooms.get(roomId);
      if (room && room.players) {
        const player = room.players.get(disconnectedPlayerId);
        const playerName = player?.name || 'Unknown';
        
        // Remove player from room
        room.players.delete(disconnectedPlayerId);
        playerRooms.delete(disconnectedPlayerId);
        
        // Notify other players
        socket.to(roomId).emit('player-left', { 
          playerId: disconnectedPlayerId, 
          playerName,
          players: room.players ? Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            isReady: p.isReady || false,
            balance: p.balance || 100000
          })) : []
        });
        
        // If room is empty, delete it
        if (room.players.size === 0) {
          gameRooms.delete(roomId);
          console.log(`🗑️ Deleted empty room: ${roomId}`);
        }
        
        console.log(`👋 Player ${playerName} (${disconnectedPlayerId}) left room ${roomId}`);
      }
    }
    
    console.log(`✅ Player disconnected: ${socket.id} (${userName}) - Connection closed`);
  }));
});

// Helper function to calculate portfolio value
function calculatePortfolioValue(portfolio, currentPrice) {
  let totalValue = 0;
  for (const [symbol, holding] of portfolio) {
    totalValue += holding.shares * currentPrice; // Simplified - using current price for all symbols
  }
  return totalValue;
}

// Chart progression for rooms - ปรับให้ใช้เวลาจริงแทน chart data length
function startRoomChartProgression(roomId) {
  const room = gameRooms.get(roomId);
  if (!room || !room.chart.isPlaying) return;

  // ใช้เวลาจริงจาก room settings แทน chart data length
  const gameDurationMinutes = room.settings?.timeLimit || 5;
  const gameDurationMs = gameDurationMinutes * 60 * 1000;
  const gameStartTime = Date.now();
  const gameEndTime = gameStartTime + gameDurationMs;
  
  console.log(`🕒 Starting chart progression for room ${roomId}: ${gameDurationMinutes} minutes (${gameDurationMs}ms)`);

  const interval = setInterval(() => {
    const now = Date.now();
    const timeRemaining = gameEndTime - now;
    
    // จบเกมเมื่อหมดเวลาจริง ไม่ใช่เมื่อ chart data หมด
    if (!room.chart.isPlaying || timeRemaining <= 0) {
      clearInterval(interval);
      
      console.log(`⏰ Game timer finished for room ${roomId} - Time remaining: ${timeRemaining}ms`);
      
      // End game
      room.gameState = 'finished';
      
      // Calculate final results
      const finalResults = Array.from(room.players.values()).map(p => {
        const currentPrice = room.chart.data[room.chart.currentIndex]?.close || 100;
        const portfolioValue = calculatePortfolioValue(p.portfolio, currentPrice);
        return {
          id: p.id,
          name: p.name,
          balance: p.balance,
          portfolioValue,
          totalValue: p.balance + portfolioValue,
          trades: p.trades.length,
          profit: (p.balance + portfolioValue) - 100000, // Starting balance was 100000
          profitPercentage: ((p.balance + portfolioValue - 100000) / 100000) * 100
        };
      }).sort((a, b) => b.totalValue - a.totalValue);

      // บันทึกผลลัพธ์ลง Firestore (ไม่ใช่ in-memory)
      saveGameResultsToFirestore(room, finalResults);

      io.to(roomId).emit('game-finished', { results: finalResults });
      console.log(`🏁 Game finished in room ${roomId} after ${gameDurationMinutes} minutes`);
      return;
    }

    // Advance chart based on time progression, not fixed increment
    const elapsedMs = now - gameStartTime;
    const progressPercentage = Math.min(elapsedMs / gameDurationMs, 1);
    const targetIndex = Math.floor(progressPercentage * (room.chart.data.length - 1));
    
    // Only update if we need to advance
    if (targetIndex > room.chart.currentIndex && targetIndex < room.chart.data.length) {
      room.chart.currentIndex = targetIndex;
      const currentCandle = room.chart.data[room.chart.currentIndex];

      // Send update to all players
      io.to(roomId).emit('chart-update', {
        candle: currentCandle,
        index: room.chart.currentIndex,
        timeRemaining: Math.max(0, Math.floor(timeRemaining / 1000)) // Send remaining seconds
      });
    }

  }, 1000); // 1 second per update
}

// บันทึกผลลัพธ์เกมลง Firestore (เฉพาะเมื่อเกมจบ)
async function saveGameResultsToFirestore(room, results) {
  if (!db) {
    console.log('📝 No Firebase connection - skipping game result save');
    return;
  }

  try {
    const gameResult = {
      roomId: room.id,
      gameType: 'multiplayer',
      symbol: room.chart.symbol,
      duration: room.duration,
      startTime: room.startTime,
      endTime: Date.now(),
      playerCount: room.players.size,
      results: results.map(r => ({
        playerId: r.id,
        playerName: r.name,
        finalBalance: r.balance,
        portfolioValue: r.portfolioValue,
        totalValue: r.totalValue,
        profit: r.profit,
        profitPercentage: r.profitPercentage,
        totalTrades: r.trades,
        rank: results.indexOf(r) + 1
      })),
      chartSeed: room.chart.seed,
      createdAt: new Date().toISOString()
    };

    // บันทึกผลลัพธ์เกมรวม
    await db.collection('gameResults').add(gameResult);

    // บันทึกประวัติของผู้เล่นแต่ละคน
    const batch = db.batch();
    
    for (const result of results) {
      const playerHistoryRef = db.collection('playerHistory').doc(result.id);
      const playerHistoryDoc = await playerHistoryRef.get();
      
      let playerHistory = playerHistoryDoc.exists ? playerHistoryDoc.data() : {
        playerId: result.id,
        playerName: result.name,
        totalGames: 0,
        totalProfit: 0,
        averageProfit: 0,
        wins: 0,
        losses: 0,
        games: []
      };

      // เพิ่มเกมใหม่
      const gameRecord = {
        gameId: gameResult.roomId,
        date: new Date().toISOString(),
        symbol: room.chart.symbol,
        finalBalance: result.balance,
        portfolioValue: result.portfolioValue,
        totalValue: result.totalValue,
        profit: result.profit,
        profitPercentage: result.profitPercentage,
        rank: results.indexOf(result) + 1,
        totalPlayers: results.length
      };

      playerHistory.games.push(gameRecord);
      playerHistory.totalGames += 1;
      playerHistory.totalProfit += result.profit;
      playerHistory.averageProfit = playerHistory.totalProfit / playerHistory.totalGames;
      
      if (result.profit > 0) {
        playerHistory.wins += 1;
      } else {
        playerHistory.losses += 1;
      }

      // เก็บเฉพาะ 50 เกมล่าสุด
      if (playerHistory.games.length > 50) {
        playerHistory.games = playerHistory.games.slice(-50);
      }

      batch.set(playerHistoryRef, playerHistory);
    }

    await batch.commit();
    console.log(`✅ Game results saved to Firestore for room ${room.id}`);

  } catch (error) {
    console.error('❌ Failed to save game results to Firestore:', error);
    // ไม่ throw error เพราะไม่ให้กระทบต่อการทำงานของเกม
  }
}

// Quiz Bank (server-side source of truth for answers)
// Keep answers here to avoid exposing them on the client.
const QUIZ_BANK = [
  // Easy
  { id: 1, level: 'easy', type: 'short', question: 'หุ้นคืออะไร?', correct: 'สิทธิความเป็นเจ้าของธุรกิจ', alternativeAnswers: [
    'สิทธิความเป็นเจ้าของในธุรกิจ','สิทธิเป็นเจ้าของธุรกิจ','ความเป็นเจ้าของธุรกิจ','สิทธิความเป็นเจ้าของบริษัท','สิทธิความเป็นเจ้าของในบริษัท'
  ]},
  { id: 2, level: 'easy', type: 'short', question: 'ก่อนเริ่มลงทุน ควรชำระหนี้ประเภทใดให้หมดก่อน?', correct: 'หนี้ดอกเบี้ยสูง', alternativeAnswers: [
    'หนี้บัตรเครดิต','หนี้ดอกเบี้ยสูง หนี้บัตรเครดิต','หนี้บัตรเครดิต หนี้ดอกเบี้ยสูง','หนี้ที่มีดอกเบี้ยสูง','หนี้ดอกเบี้ยสูง / หนี้บัตรเครดิต'
  ]},
  { id: 3, level: 'easy', type: 'short', question: 'เงินสำรองฉุกเฉินควรมีจำนวนเท่ากับกี่เดือนของเงินเดือน?', correct: '3-6 เดือน', alternativeAnswers: [
    '3 ถึง 6 เดือน','3-6เดือน','3 - 6 เดือน','สาม ถึง หก เดือน','3 หรือ 6 เดือน'
  ]},
  { id: 4, level: 'easy', type: 'short', question: 'เงินที่นำมาลงทุนในหุ้นควรเป็นเงินลักษณะใด?', correct: 'เงินเย็น', alternativeAnswers: [
    'เงินเย็น','เงินที่ไม่ต้องใช้','เงินที่ไม่จำเป็นต้องใช้','เงินส่วนเกิน','เงินที่สูญเสียแล้วไม่เสียหาย'
  ]},
  { id: 5, level: 'easy', type: 'short', question: 'P/E Ratio หมายถึงอะไร?', correct: 'ราคาหุ้น ÷ กำไรต่อหุ้น', alternativeAnswers: [
    'ราคาหุ้นหารกำไรต่อหุ้น','ราคาหุ้น/กำไรต่อหุ้น','ราคาหุ้น หาร กำไรต่อหุ้น','ราคาหุ้น ต่อ กำไรต่อหุ้น','Price to Earnings Ratio'
  ]},
  // Medium
  { id: 6, level: 'medium', type: 'short', question: 'นักลงทุนประเภทใดที่เน้นการลงทุนระยะยาวและมองหุ้นเหมือนการเป็นเจ้าของธุรกิจ?', correct: 'นักลงทุนเน้นคุณค่า', alternativeAnswers: [
    'Value Investor','นักลงทุนเน้นคุณค่า / Value Investor','Value investor','value investor','นักลงทุนแบบคุณค่า','นักลงทุนประเภทคุณค่า'
  ]},
  { id: 7, level: 'medium', type: 'short', question: 'นักลงทุนประเภทใดที่มุ่งเน้นผลตอบแทนจากเงินปันผลที่สม่ำเสมอ?', correct: 'นักลงทุนห่านทองคำ', alternativeAnswers: [
    'Yield Investor','นักลงทุนห่านทองคำ / Yield Investor','Yield investor','yield investor','นักลงทุนแบบห่านทองคำ','นักลงทุนเน้นเงินปันผล'
  ]},
  { id: 8, level: 'medium', type: 'short', question: 'นักลงทุนโมเมนตัมตัดสินใจลงทุนจากปัจจัยใด?', correct: 'สถานการณ์ตลาด', alternativeAnswers: [
    'เหตุการณ์เฉพาะหน้า','สถานการณ์ตลาด / เหตุการณ์เฉพาะหน้า','เหตุการณ์เฉพาะหน้า / สถานการณ์ตลาด','ความเคลื่อนไหวของตลาด','แนวโน้มตลาด','โมเมนตัมของตลาด'
  ]},
  { id: 9, level: 'medium', type: 'short', question: 'Circuit Breaker คือการหยุดซื้อขายเมื่อราคาพุ่งสูงเกิน ถูกหรือผิด?', correct: 'ผิด', alternativeAnswers: [
    'ผิด','false','False','ไม่ถูกต้อง','ไม่ใช่'
  ]},
  { id: 10, level: 'medium', type: 'short', question: 'Single Stock Futures อ้างอิงราคาหุ้นรายตัว ถูกหรือผิด?', correct: 'ถูก', alternativeAnswers: [
    'ถูก','true','True','ถูกต้อง','ใช่'
  ]},
  // Hard
  { id: 11, level: 'hard', type: 'short', question: 'เงินสำรองฉุกเฉินมีไว้เพื่อป้องกันไม่ให้นักลงทุนต้องทำอะไร?', correct: 'ขายหุ้นขาดทุน', alternativeAnswers: [
    'ขายหุ้นในขณะขาดทุน','ขายหุ้นตอนขาดทุน','ขายหุ้นเมื่อขาดทุน','ขายหุ้นแบบขาดทุน','การขายหุ้นขาดทุน','ขายหุ้นด้วยขาดทุน'
  ]},
  { id: 12, level: 'hard', type: 'short', question: 'คุณมีพอร์ต 200,000 บาท รับความเสี่ยงสูงสุด 2% ต่อการเทรด คุณจะเสี่ยงได้กี่บาทต่อครั้ง?', correct: '4,000 บาท', alternativeAnswers: [
    '4000 บาท','4,000','4000','สี่พันบาท','4,000บาท','4000บาท'
  ]},
  { id: 13, level: 'hard', type: 'short', question: 'ลักษณะสำคัญ 2 ประการของบริษัทที่นักลงทุนห่านทองคำมักจะเลือกลงทุนคืออะไร?', correct: 'กำไรมั่นคง', alternativeAnswers: [
    'ปันผลสม่ำเสมอ','กำไรมั่นคง / ปันผลสม่ำเสมอ','ปันผลสม่ำเสมอ / กำไรมั่นคง','กำไรมั่นคง และ ปันผลสม่ำเสมอ','ปันผลสม่ำเสมอ และ กำไรมั่นคง','กำไรคงที่ ปันผลสม่ำเสมอ'
  ]},
  { id: 14, level: 'hard', type: 'short', question: 'การเก็งกำไรแบบนักลงทุนโมเมนตัมต้องอาศัยสิ่งใดจำนวนมาก?', correct: 'ความรู้', alternativeAnswers: [
    'ความรู้','ข้อมูล','ข้อมูลข่าวสาร','ข่าวสาร','การวิเคราะห์','ข้อมูลตลาด'
  ]},
  { id: 15, level: 'hard', type: 'short', question: 'Short Selling คือการขายหุ้นที่ไม่มีอยู่ในมือ ถูกหรือผิด?', correct: 'ถูก', alternativeAnswers: [
    'ถูก','true','True','ถูกต้อง','ใช่','correct'
  ]},
  // Expert
  { id: 16, level: 'expert', type: 'short', question: 'ตามหลักการของ "เงินเย็น" การใช้เงินจากการลงทุนซื้อของฟุ่มเฟือยที่ไม่จำเป็นจะส่งผลเสียอย่างไร?', correct: 'ทำให้ต้องเริ่มต้นใหม่', alternativeAnswers: [
    'ทำให้ไม่ถึงอิสรภาพทางการเงิน','ทำให้ต้องเริ่มต้นใหม่ / ทำให้ไม่ถึงอิสรภาพทางการเงิน','ทำให้ไม่ถึงอิสรภาพทางการเงิน / ทำให้ต้องเริ่มต้นใหม่','ต้องเริ่มต้นใหม่','ไม่ถึงอิสรภาพทางการเงิน','ทำลายแผนการลงทุนระยะยาว'
  ]},
  { id: 17, level: 'expert', type: 'short', question: 'การมีเงินสำรองฉุกเฉิน 3-6 เดือนของเงินเดือนสัมพันธ์กับเป้าหมายการลงทุนระยะยาวอย่างไร?', correct: 'ป้องกันการบังคับขายหุ้นในช่วงตลาดตกต่ำ', alternativeAnswers: [
    'รักษาโอกาสในการทำกำไรระยะยาว','ป้องกันการบังคับขายหุ้นในช่วงตลาดตกต่ำ / รักษาโอกาสในการทำกำไรระยะยาว','รักษาโอกาสในการทำกำไรระยะยาว / ป้องกันการบังคับขายหุ้นในช่วงตลาดตกต่ำ','ป้องกันการขายหุ้นขาดทุน','รักษาแผนการลงทุนระยะยาว','ไม่ต้องขายหุ้นตอนตลาดตก'
  ]},
  { id: 18, level: 'expert', type: 'short', question: 'ระหว่างนักลงทุนเน้นคุณค่าและนักลงทุนห่านทองคำ นักลงทุนประเภทใดมีความเสี่ยงต่ำกว่าและเพราะเหตุใด?', correct: 'นักลงทุนห่านทองคำ', alternativeAnswers: [
    'เน้นบริษัทที่มีกำไรมั่นคงและปันผลสม่ำเสมอ','นักลงทุนห่านทองคำ / เน้นบริษัทที่มีกำไรมั่นคงและปันผลสม่ำเสมอ','เน้นบริษัทที่มีกำไรมั่นคงและปันผลสม่ำเสมอ / นักลงทุนห่านทองคำ','นักลงทุนห่านทองคำ เพราะเน้นกำไรมั่นคง','ห่านทองคำ เน้นปันผลสม่ำเสมอ','Yield Investor เน้นความมั่นคง'
  ]},
  { id: 19, level: 'expert', type: 'short', question: 'ทำไมการเลือกหุ้นโดยพิจารณาจาก "สถานะทางการเงินที่มั่นคง" ของบริษัทจึงมีความสำคัญ?', correct: 'เป็นสัญญาณของความสามารถในการอยู่รอดและเติบโต', alternativeAnswers: [
    'สัญญาณของความสามารถในการอยู่รอดและเติบโต','แสดงความสามารถในการอยู่รอดและเติบโต','เป็นตัวบ่งชี้ความสามารถในการอยู่รอด','บ่งชี้ความมั่นคงของธุรกิจ','แสดงศักยภาพในการเติบโต','ป้องกันความเสี่ยงการล้มละลาย'
  ]},
  { id: 20, level: 'expert', type: 'short', question: 'ตามหลักการของนักลงทุนเน้นคุณค่า การมองว่าหุ้นเหมือน "ความเป็นเจ้าของธุรกิจ" สอดคล้องกับนิยามของหุ้นอย่างไร?', correct: 'หุ้นคือสิทธิความเป็นเจ้าของธุรกิจ', alternativeAnswers: [
    'หุ้นคือสิทธิความเป็นเจ้าของธุรกิจ','หุ้นแสดงความเป็นเจ้าของธุรกิจ','หุ้นเป็นหลักฐานความเป็นเจ้าของ','หุ้นคือส่วนแบ่งความเป็นเจ้าของ','หุ้นให้สิทธิเป็นเจ้าของบริษัท','สิทธิความเป็นเจ้าของธุรกิจ'
  ]},
];

// Normalize strings (Thai/Unicode + punctuation/spacing) for robust matching
function normalizeAnswer(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.normalize('NFKC').trim().toLowerCase();
  // unify common math/ratio forms
  s = s
    .replace(/\s+/g, ' ')           // collapse spaces
    .replace(/÷/g, '/')
    .replace(/ต่อ/g, '/')            // ไทย "ต่อ" as ratio marker
    .replace(/\s*\/\s*/g, '/')     // " / " -> "/"
    .replace(/หาร/g, '/')           // ไทย "หาร"
    .replace(/[,;:\u200b]/g, '')    // punctuation + zero-width space
    .replace(/\s+/g, ' ')
    .trim();
  // additionally provide a no-space variant for exact compare
  return s;
}
function stripSpaces(s) {
  return (s || '').replace(/\s+/g, '');
}

// Return quiz metadata without answers
app.get('/api/quiz/bank', (req, res) => {
  const meta = QUIZ_BANK.map(({ id, level, type, question }) => ({ id, level, type, question }));
  res.json(meta);
});

// Get single question metadata by id (no answers)
app.get('/api/quiz/question/:id', (req, res) => {
  const id = Number(req.params.id);
  const q = QUIZ_BANK.find(q => q.id === id);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  const { level, type, question } = q;
  res.json({ id, level, type, question });
});

// Quiz History APIs
app.get("/api/quiz/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // พยายามใช้ Firebase ก่อนเสมอ
    if (db) {
      try {
        const doc = await db.collection('quizHistory').doc(userId).get();
        if (doc.exists) {
          return res.json(doc.data());
        }
        // ถ้าไม่มีข้อมูลใน Firebase ให้สร้างเอกสารว่าง
        const defaultHistory = {
          userId,
          quizzes: [],
          totalQuizzes: 0,
          averageScore: 0,
          lastQuizDate: null,
          levelAssessmentDone: false
        };
        await db.collection('quizHistory').doc(userId).set(defaultHistory);
        return res.json(defaultHistory);
      } catch (firebaseError) {
        console.warn('Firebase read error:', firebaseError.message);
      }
    }
    
    // Fallback ไปยัง in-memory เฉพาะเมื่อ Firebase ใช้ไม่ได้
    console.log('Using in-memory fallback for user:', userId);
    const history = quizHistory.get(userId) || {
      userId,
      quizzes: [],
      totalQuizzes: 0,
      averageScore: 0,
      lastQuizDate: null,
      levelAssessmentDone: false
    };
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/quiz/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { quizData, isLevelAssessment = false } = req.body;
    
    // ดึงข้อมูลเดิม - พยายามใช้ Firebase ก่อน
    let userHistory;
    
    if (db) {
      try {
        const doc = await db.collection('quizHistory').doc(userId).get();
        userHistory = doc.exists ? doc.data() : {
          userId,
          quizzes: [],
          totalQuizzes: 0,
          averageScore: 0,
          lastQuizDate: null,
          levelAssessmentDone: false
        };
      } catch (firebaseError) {
        console.warn('Firebase read error, using memory:', firebaseError.message);
        userHistory = quizHistory.get(userId) || {
          userId,
          quizzes: [],
          totalQuizzes: 0,
          averageScore: 0,
          lastQuizDate: null,
          levelAssessmentDone: false
        };
      }
    } else {
      // ใช้ in-memory เฉพาะเมื่อไม่มี Firebase
      userHistory = quizHistory.get(userId) || {
        userId,
        quizzes: [],
        totalQuizzes: 0,
        averageScore: 0,
        lastQuizDate: null,
        levelAssessmentDone: false
      };
    }

    // เพิ่มข้อมูล quiz ใหม่
    const newQuiz = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      score: quizData.score || 0,
      totalQuestions: quizData.totalQuestions || 0,
      correctAnswers: quizData.correctAnswers || 0,
      quizType: quizData.quizType || 'general',
      isLevelAssessment,
      details: quizData.details || []
    };

    userHistory.quizzes.push(newQuiz);
    userHistory.totalQuizzes += 1;
    userHistory.lastQuizDate = newQuiz.date;
    
    if (isLevelAssessment) {
      userHistory.levelAssessmentDone = true;
    }

    // คำนวณคะแนนเฉลี่ย
    const totalScore = userHistory.quizzes.reduce((sum, quiz) => sum + quiz.score, 0);
    userHistory.averageScore = totalScore / userHistory.totalQuizzes;

    // บันทึกลง Firebase เป็นอันดับแรก
    if (db) {
      try {
        await db.collection('quizHistory').doc(userId).set(userHistory);
        console.log('✅ Quiz history saved to Firebase for user:', userId);
      } catch (firebaseError) {
        console.warn('❌ Firebase save error:', firebaseError.message);
        // ถ้า Firebase save ไม่ได้ ให้เก็บใน memory เป็น backup
        quizHistory.set(userId, userHistory);
      }
    } else {
      // เก็บใน memory เฉพาะเมื่อไม่มี Firebase
      quizHistory.set(userId, userHistory);
      console.log('📝 Quiz history saved to memory for user:', userId);
    }
    
    res.json(userHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Profile APIs
app.get("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // พยายามใช้ Firebase ก่อนเสมอ
    if (db) {
      try {
        const doc = await db.collection('userProfiles').doc(userId).get();
        if (doc.exists) {
          return res.json(doc.data());
        }
        // ถ้าไม่มีข้อมูลใน Firebase ให้สร้างโปรไฟล์ default
        const defaultProfile = {
          userId,
          level: 'beginner',
          experience: 0,
          badges: [],
          preferences: {
            difficulty: 'easy',
            topics: ['trading_basics']
          }
        };
        await db.collection('userProfiles').doc(userId).set(defaultProfile);
        return res.json(defaultProfile);
      } catch (firebaseError) {
        console.warn('Firebase read error:', firebaseError.message);
      }
    }
    
    // Fallback ไปยัง in-memory เฉพาะเมื่อ Firebase ใช้ไม่ได้
    console.log('Using in-memory fallback for profile:', userId);
    const profile = userProfiles.get(userId) || {
      userId,
      level: 'beginner',
      experience: 0,
      badges: [],
      preferences: {
        difficulty: 'easy',
        topics: ['trading_basics']
      }
    };
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    // ดึงข้อมูลเดิม - พยายามใช้ Firebase ก่อน
    let profile;
    
    if (db) {
      try {
        const doc = await db.collection('userProfiles').doc(userId).get();
        profile = doc.exists ? doc.data() : {
          userId,
          level: 'beginner',
          experience: 0,
          badges: [],
          preferences: {
            difficulty: 'easy',
            topics: ['trading_basics']
          }
        };
      } catch (firebaseError) {
        console.warn('Firebase read error, using memory:', firebaseError.message);
        profile = userProfiles.get(userId) || {
          userId,
          level: 'beginner',
          experience: 0,
          badges: [],
          preferences: {
            difficulty: 'easy',
            topics: ['trading_basics']
          }
        };
      }
    } else {
      // ใช้ in-memory เฉพาะเมื่อไม่มี Firebase
      profile = userProfiles.get(userId) || {
        userId,
        level: 'beginner',
        experience: 0,
        badges: [],
        preferences: {
          difficulty: 'easy',
          topics: ['trading_basics']
        }
      };
    }

    // อัปเดตข้อมูล profile
    profile = { ...profile, ...updates };
    
    // บันทึกลง Firebase เป็นอันดับแรก
    if (db) {
      try {
        await db.collection('userProfiles').doc(userId).set(profile);
        console.log('✅ Profile saved to Firebase for user:', userId);
      } catch (firebaseError) {
        console.warn('❌ Firebase save error:', firebaseError.message);
        // ถ้า Firebase save ไม่ได้ ให้เก็บใน memory เป็น backup
        userProfiles.set(userId, profile);
      }
    } else {
      // เก็บใน memory เฉพาะเมื่อไม่มี Firebase
      userProfiles.set(userId, profile);
      console.log('📝 Profile saved to memory for user:', userId);
    }
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint สำหรับดึงข้อมูลหุ้น/ตลาด
app.get("/api/quote/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const result = await yahooFinance.quote(symbol);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ฟังก์ชันแปลง symbol ให้ตรงกับ Yahoo Finance
function mapSymbolForYahoo(symbol) {
  if (symbol.endsWith(".BK")) return symbol; // หุ้นไทย
  if (symbol === "GOLD") return "GC=F";
  if (symbol === "USD") return "USDTHB=X";
  if (symbol === "^SET50.BK") return "^SET50.BK"; // หมายเหตุ: อาจไม่มีข้อมูล intraday จริง
  // หุ้นไทยที่ไม่ได้เติม .BK
  const thaiStocks = [
    "PTT",
    "CPALL",
    "SCB",
    "KBANK",
    "AOT",
    "ADVANC",
    "BBL",
    "BDMS",
  ];
  if (thaiStocks.includes(symbol)) return symbol + ".BK";
  return symbol;
}

// API endpoint สำหรับดึงข้อมูล intraday 1 นาที 1 วันเต็ม (24 ชม.)
app.get("/api/intraday/:symbol", async (req, res) => {
  try {
    const rawSymbol = req.params.symbol.toUpperCase();
    const symbol = mapSymbolForYahoo(rawSymbol);

    // ใช้ timestamp (วินาที) สำหรับ period1/period2
    const now = Math.floor(Date.now() / 1000);
    const oneDay = 24 * 60 * 60;
    const period2 = now;
    const period1 = now - oneDay;

    const result = await yahooFinance.chart(symbol, {
      interval: "1m",
      period1,
      period2,
    });

    if (!result.quotes || result.quotes.length === 0) {
      return res.status(200).json({
        symbol,
        data: [],
        error: "No intraday data available for this symbol.",
      });
    }
    const data = result.quotes
      .map((q) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
      }))
      .filter(
        (d) =>
          d.open !== null &&
          d.high !== null &&
          d.low !== null &&
          d.close !== null &&
          !isNaN(d.time)
      );
    res.json({ symbol, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint สำหรับดึง intraday 1 วัน (ย้อนหลังแบบสุ่ม พร้อม fallback และข้ามเสาร์-อาทิตย์)
app.get("/api/random-intraday/:symbol", async (req, res) => {
  try {
    const rawSymbol = req.params.symbol.toUpperCase();
    const symbol = mapSymbolForYahoo(rawSymbol);
    const maxDays = 29; // 30 วันล่าสุด
    let data = [];
    let randomDate = null;
    let attempts = 0;
    let errorMsg = "";
    // สุ่มวันย้อนหลัง 1-29 วัน (จันทร์-ศุกร์) 15 ครั้ง
    while (data.length === 0 && attempts < 15) {
      const randomDaysAgo = Math.floor(Math.random() * maxDays) + 1;
      const now = new Date();
      randomDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - randomDaysAgo
      );
      const day = randomDate.getDay();
      if (day === 0 || day === 6) {
        // 0=อาทิตย์, 6=เสาร์
        attempts++;
        continue;
      }
      // สร้าง Date ใหม่สำหรับ period1/period2
      const period1Date = new Date(randomDate);
      period1Date.setHours(0, 0, 0, 0);
      const period2Date = new Date(randomDate);
      period2Date.setHours(23, 59, 59, 999);
      const period1 = Math.floor(period1Date.getTime() / 1000);
      const period2 = Math.floor(period2Date.getTime() / 1000);
      try {
        const result = await yahooFinance.chart(symbol, {
          interval: "1m",
          period1,
          period2,
        });
        if (result.quotes && result.quotes.length > 0) {
          data = result.quotes
            .map((q) => ({
              time: Math.floor(new Date(q.date).getTime() / 1000),
              open: q.open,
              high: q.high,
              low: q.low,
              close: q.close,
            }))
            .filter(
              (d) =>
                d.open !== null &&
                d.high !== null &&
                d.low !== null &&
                d.close !== null &&
                !isNaN(d.time)
            );
        } else {
          errorMsg = "No intraday data available for this symbol on this date.";
        }
      } catch (err) {
        errorMsg = err.message;
      }
      attempts++;
    }
    // ถ้ายังไม่ได้ข้อมูล ให้ fallback เป็นวันล่าสุดย้อนหลังทีละวัน (จันทร์-ศุกร์)
    if (data.length === 0) {
      const now = new Date();
      for (let i = 1; i <= maxDays; i++) {
        const fallbackDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i
        );
        const day = fallbackDate.getDay();
        if (day === 0 || day === 6) continue;
        // สร้าง Date ใหม่สำหรับ period1/period2
        const period1Date = new Date(fallbackDate);
        period1Date.setHours(0, 0, 0, 0);
        const period2Date = new Date(fallbackDate);
        period2Date.setHours(23, 59, 59, 999);
        const period1 = Math.floor(period1Date.getTime() / 1000);
        const period2 = Math.floor(period2Date.getTime() / 1000);
        try {
          const result = await yahooFinance.chart(symbol, {
            interval: "1m",
            period1,
            period2,
          });
          if (result.quotes && result.quotes.length > 0) {
            data = result.quotes
              .map((q) => ({
                time: Math.floor(new Date(q.date).getTime() / 1000),
                open: q.open,
                high: q.high,
                low: q.low,
                close: q.close,
              }))
              .filter(
                (d) =>
                  d.open !== null &&
                  d.high !== null &&
                  d.low !== null &&
                  d.close !== null &&
                  !isNaN(d.time)
              );
            randomDate = fallbackDate;
            break;
          }
        } catch (err) {
          errorMsg = err.message;
        }
      }
    }
    if (data.length === 0) {
      return res.status(200).json({
        symbol,
        data: [],
        date: randomDate ? randomDate.toISOString().slice(0, 10) : null,
        error: errorMsg,
      });
    }
    res.json({ symbol, data, date: randomDate.toISOString().slice(0, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Quiz grading endpoint with Gemini AI
app.post("/api/quiz/grade", async (req, res) => {
  try {
    const {
      question,          // string
      userAnswer,        // string
      correctAnswer,     // string (optional for open-ended, recommended for MCQ/short)
      rubric,            // string or array of criteria (optional but recommended)
      questionType = "short_answer", // "multiple_choice", "short_answer", "essay"
      lang = "th",       // "th" or "en" etc.
      userId = null,     // user ID สำหรับบันทึกประวัติ
      saveToHistory = false, // บันทึกลงประวัติหรือไม่
    } = req.body || {};

    if (!question || typeof userAnswer !== "string") {
      return res.status(400).json({ error: "Missing question or userAnswer" });
    }

    // Handle multiple choice questions without AI
    if (questionType === "multiple_choice" && correctAnswer) {
      const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      return res.json({
        isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        feedback: isCorrect ? "คำตอบถูกต้อง!" : `คำตอบที่ถูกต้องคือ: ${correctAnswer}`,
        reasoning: "ตรวจคำตอบแบบตรงไปตรงมา",
        aiUsed: false
      });
    }

    // Use AI for short answer and essay questions
    const prompt = `
      คุณคือผู้ตรวจข้อสอบเทรดดิ้งและการลงทุนอย่างเป็นกลาง ให้ผลลัพธ์เป็น JSON เท่านั้น
      ภาษาโจทย์/คำตอบ: ${lang}
      ประเภทคำถาม: ${questionType}

      โจทย์:
      ${question}

      คำตอบของผู้ทำ:
      ${userAnswer}

      เฉลยอ้างอิง (ถ้ามี):
      ${correctAnswer ?? "ไม่ระบุ - ให้ตรวจตามความรู้ทั่วไปด้านการเทรดและการลงทุน"}

      เกณฑ์ให้คะแนน/รูบริก:
      ${rubric ?? "ความถูกต้องทางแนวคิด (40%), ความครบถ้วน (30%), ความชัดเจน (20%), การยกตัวอย่าง (10%)"}

      วิธีการให้คะแนน:
      - คะแนน 0.9-1.0: คำตอบถูกต้องครบถ้วนและชัดเจนมาก
      - คะแนน 0.7-0.8: คำตอบถูกต้องส่วนใหญ่ แต่อาจขาดรายละเอียดบางส่วน
      - คะแนน 0.5-0.6: คำตอบถูกต้องบางส่วน มีจุดผิดพลาดเล็กน้อย
      - คะแนน 0.3-0.4: คำตอบผิดพลาดหลายจุด แต่มีความเข้าใจบางส่วน
      - คะแนน 0.0-0.2: คำตอบผิดพลาดหรือไม่เกี่ยวข้อง

      ส่งออกเป็น JSON เท่านั้น โดยโครงสร้าง:
      {
        "isCorrect": boolean,
        "score": number,         // 0.0 - 1.0
        "feedback": string,      // feedback สั้น กระชับ พร้อมคำแนะนำ
        "reasoning": string,     // อธิบายหลักการตรวจแบบย่อ
        "suggestions": string    // คำแนะนำสำหรับปรับปรุง (ถ้ามี)
      }
      ห้ามส่งข้อความอื่นนอกจาก JSON.
    `;

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    });

    const text = result.response.text().trim();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // fallback ป้องกันกรณีมีข้อความเกินมา
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    }
    
    if (!parsed) {
      return res.status(502).json({ 
        error: "AI returned unparseable result", 
        raw: text.substring(0, 200) + "..." 
      });
    }

    // sanitize และปรับแต่งผลลัพธ์
    parsed.score = Math.max(0, Math.min(1, Number(parsed.score) || 0));
    parsed.isCorrect = Boolean(parsed.isCorrect ?? parsed.score >= AI_CORRECT_THRESHOLD);
    parsed.feedback = String(parsed.feedback || "");
    parsed.reasoning = String(parsed.reasoning || "");
    parsed.suggestions = String(parsed.suggestions || "");
    parsed.aiUsed = true;
    parsed.aiThreshold = AI_CORRECT_THRESHOLD;

    // บันทึกผลลงประวัติ (ถ้าต้องการ)
    if (saveToHistory && userId) {
      try {
        const quizResult = {
          question,
          userAnswer,
          correctAnswer,
          score: parsed.score,
          isCorrect: parsed.isCorrect,
          feedback: parsed.feedback,
          reasoning: parsed.reasoning,
          questionType,
          timestamp: new Date().toISOString()
        };

        // ดึงข้อมูลเดิมจาก Firebase ก่อน
        let userHistory;
        
        // ใช้ in-memory storage ใน development
        if (!db) {
          userHistory = quizHistory.get(userId) || {
            userId,
            quizzes: [],
            totalQuizzes: 0,
            averageScore: 0,
            lastQuizDate: null,
            levelAssessmentDone: false
          };
        } else {
          // ลองดึงจาก Firebase ใน production
          try {
            const doc = await db.collection('quizHistory').doc(userId).get();
            userHistory = doc.exists ? doc.data() : {
              userId,
              quizzes: [],
              totalQuizzes: 0,
              averageScore: 0,
              lastQuizDate: null,
              levelAssessmentDone: false
            };
          } catch (firebaseError) {
            console.warn('Firebase error, using memory:', firebaseError.message);
            userHistory = quizHistory.get(userId) || {
              userId,
              quizzes: [],
              totalQuizzes: 0,
              averageScore: 0,
              lastQuizDate: null,
              levelAssessmentDone: false
            };
          }
        }

        userHistory.quizzes.push(quizResult);
        userHistory.totalQuizzes += 1;
        userHistory.lastQuizDate = quizResult.timestamp;
        
        const totalScore = userHistory.quizzes.reduce((sum, quiz) => sum + quiz.score, 0);
        userHistory.averageScore = totalScore / userHistory.totalQuizzes;

        // บันทึกลง Firebase เป็นอันดับแรก
        if (db) {
          try {
            await db.collection('quizHistory').doc(userId).set(userHistory);
            console.log('✅ AI Quiz result saved to Firebase for user:', userId);
          } catch (firebaseError) {
            console.warn('❌ Firebase save error:', firebaseError.message);
            // ถ้า Firebase save ไม่ได้ ให้เก็บใน memory เป็น backup
            quizHistory.set(userId, userHistory);
          }
        } else {
          // เก็บใน memory เฉพาะเมื่อไม่มี Firebase
          quizHistory.set(userId, userHistory);
          console.log('📝 AI Quiz result saved to memory for user:', userId);
        }
      } catch (historyError) {
        console.error("Error saving quiz history:", historyError);
        // ไม่ให้ error นี้ส่งผลต่อการตอบกลับหลัก
      }
    }

    return res.json(parsed);
  } catch (err) {
    console.error("quiz/grade error:", err);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: err.message 
    });
  }
});

// Grade by questionId (server-side answers + AI accuracy)
app.post('/api/quiz/grade-by-id', async (req, res) => {
  try {
    const { questionId, userAnswer, userId = null, lang = 'th' } = req.body || {};
    if (!questionId || typeof userAnswer !== 'string') {
      return res.status(400).json({ error: 'Missing questionId or userAnswer' });
    }
    const q = QUIZ_BANK.find(q => q.id === Number(questionId));
    if (!q) return res.status(404).json({ error: 'Question not found' });

    // First: strict/alternatives matching
    const uaNorm = normalizeAnswer(userAnswer);
    const corrNorm = normalizeAnswer(q.correct || '');
    const altsNorm = (q.alternativeAnswers || []).map((a) => normalizeAnswer(a));
    const variants = new Set([
      corrNorm,
      stripSpaces(corrNorm),
      ...altsNorm,
      ...altsNorm.map(stripSpaces),
    ]);
    const uaVariants = [uaNorm, stripSpaces(uaNorm)];
    const strictCorrect = uaVariants.some((v) => variants.has(v));
    console.log('grade-by-id strict check', {
      id: q.id,
      ua: userAnswer,
      uaNorm,
      corrNorm,
      altsNorm,
      uaVariants,
      variants: Array.from(variants),
      strictCorrect,
    });

    // If strict correct, no need AI
    if (strictCorrect) {
      return res.json({
        isCorrect: true,
        score: 1.0,
        feedback: 'คำตอบถูกต้อง',
        reasoning: 'ตรงกับเฉลย/คำตอบทางเลือก',
        aiUsed: false,
      });
    }

    // Otherwise call AI for semantic grading
  const prompt = `คุณคือผู้ตรวจข้อสอบด้านการลงทุน ให้ผลลัพธ์ JSON เท่านั้น
ภาษาโจทย์/คำตอบ: ${lang}
ประเภทคำถาม: ${q.type}

โจทย์:
${q.question}

คำตอบของผู้ทำ:
${userAnswer}

เฉลยอ้างอิง (ยอมรับความหมายเทียบเท่าด้วย):
${q.correct}

คำตอบทางเลือก (ยอมรับถ้าความหมายเหมือนกัน):
${(q.alternativeAnswers || []).join(', ')}

เกณฑ์: ความถูกต้องทางแนวคิด 60% ความชัดเจน 20% ความครบถ้วน 20%
การตัดสินถูก/ผิด: ให้ isCorrect เป็น true ถ้าความหมายของคำตอบเทียบเท่ากับเฉลย/ตัวเลือก แม้จะใช้คำหรือสัญลักษณ์ต่างกัน เช่น "/", "÷", "หาร", "ต่อ" สำหรับอัตราส่วน
ส่งออก JSON เท่านั้น: {"isCorrect": boolean, "score": number, "feedback": string, "reasoning": string}`;

    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
    });
    const text = result.response.text().trim();
    let parsed;
    try { parsed = JSON.parse(text); } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    }
    if (!parsed) return res.status(502).json({ error: 'AI returned unparseable result' });

    parsed.score = Math.max(0, Math.min(1, Number(parsed.score) || 0));
    parsed.isCorrect = Boolean(parsed.isCorrect ?? parsed.score >= AI_CORRECT_THRESHOLD);
    parsed.feedback = String(parsed.feedback || '');
    parsed.reasoning = String(parsed.reasoning || '');
    parsed.aiUsed = true;
    parsed.aiThreshold = AI_CORRECT_THRESHOLD;

    return res.json(parsed);
  } catch (err) {
    console.error('grade-by-id error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ===== MULTIPLAYER CHART SYNCHRONIZATION SYSTEM =====

// In-memory storage for room chart data
const roomChartData = new Map(); // roomCode -> { symbol, seed, startTime, currentData: [...] }
const roomPlaybackState = new Map(); // roomCode -> { currentIndex, lastUpdate }

// Chart data generation with seeded randomness
function generateSeededRandomData(symbol, seed, pointsCount = 300) {
  // Simple seeded random function
  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  
  const data = [];
  const startTime = Math.floor(Date.now() / 1000) - pointsCount;
  let currentPrice = 100; // Base price
  
  // Set different base prices based on symbol
  const symbolBases = {
    // TFEX
    '^SET50.BK': 1035.0, 'SET50': 1035.0, 'GOLD': 2011.0, 'USD': 35.0,
    // SET - หุ้นใหญ่
    'PTT': 100.0, 'CPALL': 145.0, 'KBANK': 157.0, 'SCB': 129.0, 'BBL': 143.0, 'AOT': 67.0, 'ADVANC': 190.0, 'INTUCH': 60.0, 'TU': 15.0, 'BDMS': 29.0,
    // SET - หุ้นกลาง
    'KTB': 15.0, 'TRUE': 5.0, 'DTAC': 40.0, 'CP': 30.0, 'CPF': 25.0, 'MINT': 30.0, 'CRC': 35.0, 'BGC': 15.0, 'HMPRO': 12.0, 'COM7': 25.0, 'OR': 20.0, 'BANPU': 10.0,
    'DELTA': 60.0, 'SAWAD': 45.0, 'PTTEP': 120.0, 'KCE': 50.0, 'SCC': 400.0, 'TISCO': 90.0, 'AP': 5.0,
    // MAI
    'HEMP': 2.0, 'LPN': 8.0, 'SPVI': 12.0, 'SMT': 15.0, 'PRINC': 3.0,
    // US
    'AAPL': 175.0, 'GOOGL': 2500.0, 'MSFT': 330.0, 'AMZN': 140.0, 'TSLA': 250.0, 'NVDA': 800.0, 'META': 320.0, 'NFLX': 400.0
  };
  
  currentPrice = symbolBases[symbol] || 100;
  const basePrice = currentPrice;
  
  for (let i = 0; i < pointsCount; i++) {
    const time = startTime + i;
    
    // Generate price movement with seeded randomness
    const randomValue1 = seededRandom(seed + i * 137);
    const randomValue2 = seededRandom(seed + i * 241);
    
    // Trend component (slight upward bias)
    const trend = Math.sin(i / 50) * 0.002;
    
    // Random walk with volatility
    const volatility = 0.015; // 1.5% volatility
    const change = (randomValue1 - 0.5) * volatility + trend;
    
    currentPrice = currentPrice * (1 + change);
    
    // Ensure price doesn't deviate too much from base
    const maxDeviation = 0.3; // 30%
    if (currentPrice > basePrice * (1 + maxDeviation)) {
      currentPrice = basePrice * (1 + maxDeviation);
    }
    if (currentPrice < basePrice * (1 - maxDeviation)) {
      currentPrice = basePrice * (1 - maxDeviation);
    }
    
    // Generate OHLC data
    const openPrice = i === 0 ? basePrice : data[i - 1].close;
    const volatilityFactor = 0.01;
    
    const high = Math.max(openPrice, currentPrice) * (1 + seededRandom(seed + i * 353) * volatilityFactor);
    const low = Math.min(openPrice, currentPrice) * (1 - seededRandom(seed + i * 461) * volatilityFactor);
    
    data.push({
      time,
      open: Number(openPrice.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)), 
      close: Number(currentPrice.toFixed(2)),
      volume: Math.floor(1000 + seededRandom(seed + i * 577) * 5000)
    });
  }
  
  return data;
}

// API: Initialize chart data for a room
app.post('/api/room/:roomCode/chart/initialize', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { symbol = 'PTT', seed } = req.body;
    
    if (!roomCode || !seed) {
      return res.status(400).json({ error: 'Room code and seed are required' });
    }
    
    // Generate chart data with the provided seed
    const chartData = generateSeededRandomData(symbol, seed, 300);
    
    // Store in memory
    roomChartData.set(roomCode, {
      symbol,
      seed,
      startTime: Date.now(),
      data: chartData,
      currentIndex: 0
    });
    
    roomPlaybackState.set(roomCode, {
      currentIndex: 0,
      lastUpdate: Date.now(),
      isPlaying: false
    });
    
    console.log(`📊 Chart data initialized for room ${roomCode} with symbol ${symbol}`);
    
    res.json({
      success: true,
      symbol,
      dataLength: chartData.length,
      firstPoint: chartData[0],
      lastPoint: chartData[chartData.length - 1]
    });
    
  } catch (error) {
    console.error('Error initializing chart data:', error);
    res.status(500).json({ error: 'Failed to initialize chart data' });
  }
});

// API: Get current chart data for a room
app.get('/api/room/:roomCode/chart/data', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { startIndex = 0, count = 50 } = req.query;
    
    const roomData = roomChartData.get(roomCode);
    if (!roomData) {
      return res.status(404).json({ error: 'Room chart data not found' });
    }
    
    const start = parseInt(startIndex);
    const requestCount = parseInt(count);
    const endIndex = Math.min(start + requestCount, roomData.data.length);
    
    const data = roomData.data.slice(start, endIndex);
    
    res.json({
      success: true,
      symbol: roomData.symbol,
      data,
      meta: {
        startIndex: start,
        endIndex,
        totalLength: roomData.data.length,
        hasMore: endIndex < roomData.data.length
      }
    });
    
  } catch (error) {
    console.error('Error getting chart data:', error);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

// API: Start/Resume chart playback for a room
app.post('/api/room/:roomCode/chart/start', async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    const roomData = roomChartData.get(roomCode);
    const playbackState = roomPlaybackState.get(roomCode);
    
    if (!roomData || !playbackState) {
      return res.status(404).json({ error: 'Room data not found' });
    }
    
    playbackState.isPlaying = true;
    playbackState.lastUpdate = Date.now();
    
    console.log(`▶️ Chart playback started for room ${roomCode}`);
    
    res.json({
      success: true,
      currentIndex: playbackState.currentIndex,
      isPlaying: true
    });
    
  } catch (error) {
    console.error('Error starting chart playback:', error);
    res.status(500).json({ error: 'Failed to start chart playback' });
  }
});

// API: Get current playback state and next data points
app.get('/api/room/:roomCode/chart/tick', async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    const roomData = roomChartData.get(roomCode);
    const playbackState = roomPlaybackState.get(roomCode);
    
    if (!roomData || !playbackState) {
      return res.status(404).json({ error: 'Room data not found' });
    }
    
    if (!playbackState.isPlaying) {
      return res.json({
        success: true,
        isPlaying: false,
        currentIndex: playbackState.currentIndex
      });
    }
    
    // Calculate how many points to advance based on time elapsed
    const now = Date.now();
    const timeDiff = now - playbackState.lastUpdate;
    const pointsToAdvance = Math.floor(timeDiff / 1000); // 1 point per second
    
    if (pointsToAdvance > 0) {
      playbackState.currentIndex = Math.min(
        playbackState.currentIndex + pointsToAdvance,
        roomData.data.length - 1
      );
      playbackState.lastUpdate = now;
    }
    
    const currentPoint = roomData.data[playbackState.currentIndex];
    
    // แก้ไข isFinished logic - ใช้เวลาจริงแทน data length
    const room = gameRooms.get(roomCode);
    const gameDurationMinutes = room?.settings?.timeLimit || 5;
    const gameDurationMs = gameDurationMinutes * 60 * 1000;
    
    // คำนวณจากเวลาเริ่มเกม
    const gameStartTime = room?.gameStartTime || Date.now();
    const elapsedTime = now - gameStartTime;
    const isFinished = elapsedTime >= gameDurationMs;
    
    if (isFinished) {
      playbackState.isPlaying = false;
      console.log(`⏰ Chart playback finished for room ${roomCode} - Elapsed: ${Math.floor(elapsedTime/1000)}s/${Math.floor(gameDurationMs/1000)}s`);
    }
    
    res.json({
      success: true,
      currentIndex: playbackState.currentIndex,
      currentPoint,
      isPlaying: playbackState.isPlaying,
      isFinished,
      symbol: roomData.symbol
    });
    
  } catch (error) {
    console.error('Error getting chart tick:', error);
    res.status(500).json({ error: 'Failed to get chart tick' });
  }
});

// API: Stop chart playback for a room
app.post('/api/room/:roomCode/chart/stop', async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    const playbackState = roomPlaybackState.get(roomCode);
    if (playbackState) {
      playbackState.isPlaying = false;
    }
    
    console.log(`⏸️ Chart playback stopped for room ${roomCode}`);
    
    res.json({
      success: true,
      isPlaying: false
    });
    
  } catch (error) {
    console.error('Error stopping chart playback:', error);
    res.status(500).json({ error: 'Failed to stop chart playback' });
  }
});

// API: Reset chart playback for a room
app.post('/api/room/:roomCode/chart/reset', async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    const playbackState = roomPlaybackState.get(roomCode);
    if (playbackState) {
      playbackState.currentIndex = 0;
      playbackState.isPlaying = false;
      playbackState.lastUpdate = Date.now();
    }
    
    console.log(`🔄 Chart playback reset for room ${roomCode}`);
    
    res.json({
      success: true,
      currentIndex: 0,
      isPlaying: false
    });
    
  } catch (error) {
    console.error('Error resetting chart playback:', error);
    res.status(500).json({ error: 'Failed to reset chart playback' });
  }
});

// Cleanup old room data (run every 10 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours
  
  for (const [roomCode, roomData] of roomChartData.entries()) {
    if (now - roomData.startTime > maxAge) {
      roomChartData.delete(roomCode);
      roomPlaybackState.delete(roomCode);
      console.log(`🧹 Cleaned up old chart data for room ${roomCode}`);
    }
  }
}, 10 * 60 * 1000);

// =============================================================================
// MULTIPLAYER GAME HISTORY APIs
// =============================================================================

// Get player game history
app.get("/api/player-history/:playerId", async (req, res) => {
  try {
    const { playerId } = req.params;
    
    if (db) {
      try {
        const doc = await db.collection('playerHistory').doc(playerId).get();
        if (doc.exists) {
          return res.json(doc.data());
        }
        // ถ้าไม่มีประวัติ ให้สร้างข้อมูลเริ่มต้น
        const defaultHistory = {
          playerId,
          playerName: 'Unknown',
          totalGames: 0,
          totalProfit: 0,
          averageProfit: 0,
          wins: 0,
          losses: 0,
          games: []
        };
        return res.json(defaultHistory);
      } catch (firebaseError) {
        console.warn('Firebase read error:', firebaseError.message);
        return res.status(500).json({ error: 'Database unavailable' });
      }
    } else {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get game leaderboard (top players)
app.get("/api/leaderboard", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    if (db) {
      try {
        const snapshot = await db.collection('playerHistory')
          .orderBy('averageProfit', 'desc')
          .limit(parseInt(limit))
          .get();
          
        const leaderboard = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          leaderboard.push({
            playerId: data.playerId,
            playerName: data.playerName,
            totalGames: data.totalGames,
            averageProfit: data.averageProfit,
            wins: data.wins,
            losses: data.losses,
            winRate: data.totalGames > 0 ? (data.wins / data.totalGames * 100) : 0
          });
        });
        
        return res.json({ leaderboard });
      } catch (firebaseError) {
        console.warn('Firebase read error:', firebaseError.message);
        return res.status(500).json({ error: 'Database unavailable' });
      }
    } else {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent game results
app.get("/api/recent-games", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    if (db) {
      try {
        const snapshot = await db.collection('gameResults')
          .orderBy('endTime', 'desc')
          .limit(parseInt(limit))
          .get();
          
        const games = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          games.push({
            gameId: doc.id,
            roomId: data.roomId,
            symbol: data.symbol,
            duration: data.duration,
            playerCount: data.playerCount,
            endTime: data.endTime,
            winner: data.results[0] // ผู้ชนะคือคนแรกใน results ที่เรียงแล้ว
          });
        });
        
        return res.json({ games });
      } catch (firebaseError) {
        console.warn('Firebase read error:', firebaseError.message);
        return res.status(500).json({ error: 'Database unavailable' });
      }
    } else {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// CENTRALIZED CHART DATA GENERATION FOR MULTIPLAYER
// =============================================================================

// Generate synchronized chart data for a room
app.post('/api/chart/room/:roomCode/initialize', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { symbol = 'PTT', duration = 300 } = req.body; // 5 minutes default
    
    console.log(`🎯 Initializing chart for room ${roomCode} with symbol ${symbol}`);
    
    // Generate chart data points
    const chartData = [];
    const startTime = Date.now();
    const interval = 1000; // 1 second intervals
    
    let currentPrice = 100 + Math.random() * 50; // Starting price between 100-150
    
    for (let i = 0; i < duration; i++) {
      const timestamp = startTime + (i * interval);
      
      // Generate realistic price movement
      const change = (Math.random() - 0.5) * 2; // -1 to +1
      const volatility = 0.5;
      currentPrice += change * volatility;
      
      // Ensure price doesn't go below 10
      currentPrice = Math.max(10, currentPrice);
      
      const candle = {
        time: Math.floor(timestamp / 1000),
        open: currentPrice,
        high: currentPrice + Math.random() * 2,
        low: currentPrice - Math.random() * 2,
        close: currentPrice + (Math.random() - 0.5) * 1
      };
      
      // Ensure OHLC relationships are correct
      candle.high = Math.max(candle.open, candle.close, candle.high);
      candle.low = Math.min(candle.open, candle.close, candle.low);
      
      chartData.push(candle);
      currentPrice = candle.close;
    }
    
    // Store chart data for this room
    roomChartData.set(roomCode, {
      symbol,
      data: chartData,
      startTime: Date.now(),
      currentIndex: 0
    });
    
    roomPlaybackState.set(roomCode, {
      isPlaying: false,
      currentIndex: 0,
      lastUpdateTime: Date.now()
    });
    
    res.json({
      success: true,
      roomCode,
      symbol,
      totalCandles: chartData.length,
      currentPrice: chartData[0].close
    });
    
  } catch (error) {
    console.error('Error initializing room chart:', error);
    res.status(500).json({ error: 'Failed to initialize chart data' });
  }
});

// Get current chart data for a room
app.get('/api/chart/room/:roomCode', (req, res) => {
  try {
    const { roomCode } = req.params;
    const roomData = roomChartData.get(roomCode);
    const playbackState = roomPlaybackState.get(roomCode);
    
    if (!roomData) {
      return res.status(404).json({ error: 'Room chart data not found' });
    }
    
    const visibleData = roomData.data.slice(0, playbackState.currentIndex + 1);
    const currentPrice = visibleData.length > 0 ? visibleData[visibleData.length - 1].close : 0;
    
    res.json({
      success: true,
      chartData: visibleData,
      currentPrice,
      isPlaying: playbackState.isPlaying,
      progress: {
        current: playbackState.currentIndex,
        total: roomData.data.length
      }
    });
    
  } catch (error) {
    console.error('Error getting room chart data:', error);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

// Start/stop chart playback for a room
app.post('/api/chart/room/:roomCode/playback', (req, res) => {
  try {
    const { roomCode } = req.params;
    const { action } = req.body; // 'start' or 'stop'
    
    const playbackState = roomPlaybackState.get(roomCode);
    if (!playbackState) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    playbackState.isPlaying = action === 'start';
    playbackState.lastUpdateTime = Date.now();
    
    res.json({
      success: true,
      isPlaying: playbackState.isPlaying,
      currentIndex: playbackState.currentIndex
    });
    
  } catch (error) {
    console.error('Error controlling chart playback:', error);
    res.status(500).json({ error: 'Failed to control playback' });
  }
});

// Get next chart update (polling endpoint)
app.get('/api/chart/room/:roomCode/update', (req, res) => {
  try {
    const { roomCode } = req.params;
    const roomData = roomChartData.get(roomCode);
    const playbackState = roomPlaybackState.get(roomCode);
    
    if (!roomData || !playbackState) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Check if we should advance to next candle
    const now = Date.now();
    const timeSinceLastUpdate = now - playbackState.lastUpdateTime;
    const shouldAdvance = playbackState.isPlaying && timeSinceLastUpdate >= 1000; // 1 second per candle
    
    if (shouldAdvance && playbackState.currentIndex < roomData.data.length - 1) {
      playbackState.currentIndex++;
      playbackState.lastUpdateTime = now;
      
      const newCandle = roomData.data[playbackState.currentIndex];
      
      res.json({
        success: true,
        newCandle,
        hasUpdate: true,
        currentIndex: playbackState.currentIndex
      });
    } else {
      res.json({
        success: true,
        hasUpdate: false,
        currentIndex: playbackState.currentIndex
      });
    }
    
  } catch (error) {
    console.error('Error getting chart update:', error);
    res.status(500).json({ error: 'Failed to get chart update' });
  }
});

// Reset chart playback
app.post('/api/chart/room/:roomCode/reset', (req, res) => {
  try {
    const { roomCode } = req.params;
    const playbackState = roomPlaybackState.get(roomCode);
    
    if (!playbackState) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    playbackState.currentIndex = 0;
    playbackState.isPlaying = false;
    playbackState.lastUpdateTime = Date.now();
    
    res.json({
      success: true,
      currentIndex: 0,
      isPlaying: false
    });
    
  } catch (error) {
    console.error('Error resetting chart playback:', error);
    res.status(500).json({ error: 'Failed to reset chart playback' });
  }
});

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit in development for debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Stack:', reason?.stack);
  // Don't exit in development for debugging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💤 HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('💤 HTTP server closed');
    process.exit(0);
  });
});

const PORT = process.env.SERVER_PORT || process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📡 Socket.IO enabled for multiplayer gaming`);
  console.log(`🔥 Firebase status: ${db ? 'Connected' : 'Using memory fallback'}`);
}).on('error', (error) => {
  console.error('🚨 Server startup error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please choose a different port.`);
  }
  process.exit(1);
});