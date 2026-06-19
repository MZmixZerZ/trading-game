const express = require('express');
const { roomChartData, roomPlaybackState, gameRooms, generateSeededRandomData } = require('../state');

const router = express.Router();

// ===== SEEDED CHART SYNC (primary multiplayer chart system) =====

router.post('/room/:roomCode/chart/initialize', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { symbol = 'PTT', seed } = req.body;
    if (!roomCode || !seed) return res.status(400).json({ error: 'Room code and seed are required' });

    const chartData = generateSeededRandomData(symbol, seed, 300);
    roomChartData.set(roomCode, { symbol, seed, startTime: Date.now(), data: chartData, currentIndex: 0 });
    roomPlaybackState.set(roomCode, { currentIndex: 0, lastUpdate: Date.now(), isPlaying: false });

    res.json({
      success: true, symbol, dataLength: chartData.length,
      firstPoint: chartData[0], lastPoint: chartData[chartData.length - 1]
    });
  } catch (error) {
    console.error('Error initializing chart data:', error);
    res.status(500).json({ error: 'Failed to initialize chart data' });
  }
});

router.get('/room/:roomCode/chart/data', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { startIndex = 0, count = 50 } = req.query;
    const roomData = roomChartData.get(roomCode);
    if (!roomData) return res.status(404).json({ error: 'Room chart data not found' });

    const start = parseInt(startIndex);
    const requestCount = parseInt(count);
    const endIndex = Math.min(start + requestCount, roomData.data.length);
    const data = roomData.data.slice(start, endIndex);

    res.json({
      success: true, symbol: roomData.symbol, data,
      meta: { startIndex: start, endIndex, totalLength: roomData.data.length, hasMore: endIndex < roomData.data.length }
    });
  } catch (error) {
    console.error('Error getting chart data:', error);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

router.post('/room/:roomCode/chart/start', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const roomData = roomChartData.get(roomCode);
    const playbackState = roomPlaybackState.get(roomCode);
    if (!roomData || !playbackState) return res.status(404).json({ error: 'Room data not found' });

    playbackState.isPlaying = true;
    playbackState.lastUpdate = Date.now();
    res.json({ success: true, currentIndex: playbackState.currentIndex, isPlaying: true });
  } catch (error) {
    console.error('Error starting chart playback:', error);
    res.status(500).json({ error: 'Failed to start chart playback' });
  }
});

router.get('/room/:roomCode/chart/tick', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const roomData = roomChartData.get(roomCode);
    const playbackState = roomPlaybackState.get(roomCode);
    if (!roomData || !playbackState) return res.status(404).json({ error: 'Room data not found' });

    if (!playbackState.isPlaying) {
      return res.json({ success: true, isPlaying: false, currentIndex: playbackState.currentIndex });
    }

    const now = Date.now();
    const timeDiff = now - playbackState.lastUpdate;
    const pointsToAdvance = Math.floor(timeDiff / 1000);
    if (pointsToAdvance > 0) {
      playbackState.currentIndex = Math.min(playbackState.currentIndex + pointsToAdvance, roomData.data.length - 1);
      playbackState.lastUpdate = now;
    }

    const currentPoint = roomData.data[playbackState.currentIndex];
    const room = gameRooms.get(roomCode);
    const gameDurationMs = (room?.settings?.timeLimit || 5) * 60 * 1000;
    const gameStartTime = room?.gameStartTime || Date.now();
    const isFinished = (now - gameStartTime) >= gameDurationMs;
    if (isFinished) playbackState.isPlaying = false;

    res.json({
      success: true, currentIndex: playbackState.currentIndex, currentPoint,
      isPlaying: playbackState.isPlaying, isFinished, symbol: roomData.symbol
    });
  } catch (error) {
    console.error('Error getting chart tick:', error);
    res.status(500).json({ error: 'Failed to get chart tick' });
  }
});

router.post('/room/:roomCode/chart/stop', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const playbackState = roomPlaybackState.get(roomCode);
    if (playbackState) playbackState.isPlaying = false;
    res.json({ success: true, isPlaying: false });
  } catch (error) {
    console.error('Error stopping chart playback:', error);
    res.status(500).json({ error: 'Failed to stop chart playback' });
  }
});

router.post('/room/:roomCode/chart/reset', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const playbackState = roomPlaybackState.get(roomCode);
    if (playbackState) {
      playbackState.currentIndex = 0;
      playbackState.isPlaying = false;
      playbackState.lastUpdate = Date.now();
    }
    res.json({ success: true, currentIndex: 0, isPlaying: false });
  } catch (error) {
    console.error('Error resetting chart playback:', error);
    res.status(500).json({ error: 'Failed to reset chart playback' });
  }
});

// ===== LEGACY CHART SYSTEM (random, non-seeded) =====

router.post('/chart/room/:roomCode/initialize', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { symbol = 'PTT', duration = 300 } = req.body;
    const chartData = [];
    const startTime = Date.now();
    let currentPrice = 100 + Math.random() * 50;

    for (let i = 0; i < duration; i++) {
      const timestamp = startTime + (i * 1000);
      currentPrice += (Math.random() - 0.5) * 2 * 0.5;
      currentPrice = Math.max(10, currentPrice);
      const candle = {
        time: Math.floor(timestamp / 1000),
        open: currentPrice,
        high: currentPrice + Math.random() * 2,
        low: currentPrice - Math.random() * 2,
        close: currentPrice + (Math.random() - 0.5) * 1
      };
      candle.high = Math.max(candle.open, candle.close, candle.high);
      candle.low = Math.min(candle.open, candle.close, candle.low);
      chartData.push(candle);
      currentPrice = candle.close;
    }

    roomChartData.set(roomCode, { symbol, data: chartData, startTime: Date.now(), currentIndex: 0 });
    roomPlaybackState.set(roomCode, { isPlaying: false, currentIndex: 0, lastUpdateTime: Date.now() });

    res.json({ success: true, roomCode, symbol, totalCandles: chartData.length, currentPrice: chartData[0].close });
  } catch (error) {
    console.error('Error initializing room chart:', error);
    res.status(500).json({ error: 'Failed to initialize chart data' });
  }
});

router.get('/chart/room/:roomCode', (req, res) => {
  try {
    const { roomCode } = req.params;
    const roomData = roomChartData.get(roomCode);
    const playbackState = roomPlaybackState.get(roomCode);
    if (!roomData) return res.status(404).json({ error: 'Room chart data not found' });

    const visibleData = roomData.data.slice(0, playbackState.currentIndex + 1);
    const currentPrice = visibleData.length > 0 ? visibleData[visibleData.length - 1].close : 0;

    res.json({
      success: true, chartData: visibleData, currentPrice,
      isPlaying: playbackState.isPlaying,
      progress: { current: playbackState.currentIndex, total: roomData.data.length }
    });
  } catch (error) {
    console.error('Error getting room chart data:', error);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

router.post('/chart/room/:roomCode/playback', (req, res) => {
  try {
    const { roomCode } = req.params;
    const { action } = req.body;
    const playbackState = roomPlaybackState.get(roomCode);
    if (!playbackState) return res.status(404).json({ error: 'Room not found' });

    playbackState.isPlaying = action === 'start';
    playbackState.lastUpdateTime = Date.now();
    res.json({ success: true, isPlaying: playbackState.isPlaying, currentIndex: playbackState.currentIndex });
  } catch (error) {
    console.error('Error controlling chart playback:', error);
    res.status(500).json({ error: 'Failed to control playback' });
  }
});

router.get('/chart/room/:roomCode/update', (req, res) => {
  try {
    const { roomCode } = req.params;
    const roomData = roomChartData.get(roomCode);
    const playbackState = roomPlaybackState.get(roomCode);
    if (!roomData || !playbackState) return res.status(404).json({ error: 'Room not found' });

    const now = Date.now();
    const shouldAdvance = playbackState.isPlaying && (now - playbackState.lastUpdateTime) >= 1000;
    if (shouldAdvance && playbackState.currentIndex < roomData.data.length - 1) {
      playbackState.currentIndex++;
      playbackState.lastUpdateTime = now;
      return res.json({ success: true, newCandle: roomData.data[playbackState.currentIndex], hasUpdate: true, currentIndex: playbackState.currentIndex });
    }
    res.json({ success: true, hasUpdate: false, currentIndex: playbackState.currentIndex });
  } catch (error) {
    console.error('Error getting chart update:', error);
    res.status(500).json({ error: 'Failed to get chart update' });
  }
});

router.post('/chart/room/:roomCode/reset', (req, res) => {
  try {
    const { roomCode } = req.params;
    const playbackState = roomPlaybackState.get(roomCode);
    if (!playbackState) return res.status(404).json({ error: 'Room not found' });

    playbackState.currentIndex = 0;
    playbackState.isPlaying = false;
    playbackState.lastUpdateTime = Date.now();
    res.json({ success: true, currentIndex: 0, isPlaying: false });
  } catch (error) {
    console.error('Error resetting chart playback:', error);
    res.status(500).json({ error: 'Failed to reset chart playback' });
  }
});

// Cleanup stale chart data every 10 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000;
  for (const [roomCode, roomData] of roomChartData.entries()) {
    if (now - roomData.startTime > maxAge) {
      roomChartData.delete(roomCode);
      roomPlaybackState.delete(roomCode);
    }
  }
}, 10 * 60 * 1000);

module.exports = router;
