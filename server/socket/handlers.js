const supabase = require('../supabaseClient');
const { gameRooms, playerRooms, generateSeededRandomData } = require('../state');

// ===== DB HELPERS =====

function toRoomRow(roomId, roomData) {
  return {
    id: roomId,
    code: roomData.code || roomData.roomCode || null,
    host_id: roomData.hostId || roomData.host || null,
    settings: roomData.settings || {
      maxPlayers: roomData.maxPlayers || 10,
      startingBalance: roomData.startingBalance || 1000000,
      timeLimit: roomData.timeLimit || 3,
      symbol: roomData.symbol || 'PTT'
    },
    state: roomData.state || {
      gameState: roomData.gameState || 'waiting',
      symbol: roomData.symbol || 'PTT',
      market: roomData.market || 'SET',
      startDate: roomData.startDate || null
    },
    created_at: roomData.createdAt ? new Date(roomData.createdAt).toISOString() : new Date().toISOString()
  };
}

function normalizePortfolio(portfolio) {
  if (!portfolio) return null;
  if (portfolio instanceof Map) return Object.fromEntries(portfolio);
  if (typeof portfolio === 'object' && !Array.isArray(portfolio)) return portfolio;
  return null;
}

function toRoomPlayerRow(roomId, playerId, playerData) {
  return {
    room_id: roomId,
    player_id: playerId,
    player_name: playerData.displayName || playerData.playerName || playerData.name || null,
    portfolio: normalizePortfolio(playerData.portfolio),
    joined_at: playerData.joinedAt ? new Date(playerData.joinedAt).toISOString() : new Date().toISOString()
  };
}

async function saveRoomToSupabase(roomId, roomData) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('rooms').upsert([toRoomRow(roomId, roomData)]);
    if (error) throw error;
  } catch (err) {
    console.warn('⚠️ Supabase saveRoom failed:', err.message || err);
  }
}

async function savePlayerToSupabase(roomId, playerId, playerData) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('room_players').upsert([toRoomPlayerRow(roomId, playerId, playerData)], { onConflict: 'room_id,player_id' });
    if (error) throw error;
  } catch (err) {
    console.warn('⚠️ Supabase savePlayer failed:', err.message || err);
  }
}

async function saveGameResultsToDatabase(room, results) {
  const now = new Date();
  const gameResult = {
    room_id: room.id,
    symbol: room.chart?.symbol || null,
    duration: room.duration || null,
    player_count: results.length,
    end_time: now.toISOString(),
    results: results.map(result => ({
      player_id: result.playerId || result.id,
      player_name: result.playerName || result.name,
      final_balance: result.balance,
      portfolio_value: result.portfolioValue,
      total_value: result.totalValue,
      profit: result.profit ?? result.totalReturn ?? 0,
      profit_percentage: result.profitPercentage,
      total_trades: result.trades,
      rank: result.rank
    })),
    metadata: {
      start_time: room.startTime ? new Date(room.startTime).toISOString() : null,
      finish_time: now.toISOString(),
      game_settings: room.settings || room.gameSettings || {},
      total_players: room.players?.size || results.length,
      source: 'server'
    },
    created_at: now.toISOString()
  };

  if (!supabase) return;
  try {
    const { error } = await supabase.from('game_results').insert([gameResult]);
    if (error) throw error;

    for (const result of results) {
      const playerId = result.playerId || result.id;
      const playerName = result.playerName || result.name || 'Unknown';
      const profitValue = Number(result.profit ?? result.totalReturn ?? 0);

      const { data: existingRow, error: selectError } = await supabase
        .from('player_history').select('*').eq('player_id', playerId).limit(1).maybeSingle();
      if (selectError) console.warn('⚠️ Supabase select player_history error:', selectError.message || selectError);

      const existing = existingRow || {
        player_id: playerId, player_name: playerName,
        total_games: 0, total_profit: 0, average_profit: 0, wins: 0, losses: 0, data: { games: [] }
      };

      const updatedGames = Array.isArray(existing.data?.games) ? [...existing.data.games] : [];
      updatedGames.push({
        room_id: room.id, final_balance: result.balance, total_value: result.totalValue,
        profit: profitValue, profit_percentage: result.profitPercentage,
        rank: result.rank, timestamp: now.toISOString()
      });

      const newTotalGames = Number(existing.total_games || 0) + 1;
      const newTotalProfit = Number(existing.total_profit || 0) + profitValue;

      const { error: upsertError } = await supabase.from('player_history').upsert([{
        player_id: playerId, player_name: playerName,
        total_games: newTotalGames, total_profit: newTotalProfit,
        average_profit: newTotalProfit / newTotalGames,
        wins: Number(existing.wins || 0) + (profitValue > 0 ? 1 : 0),
        losses: Number(existing.losses || 0) + (profitValue <= 0 ? 1 : 0),
        data: { ...existing.data, games: updatedGames },
        updated_at: now.toISOString()
      }], { onConflict: 'player_id' });
      if (upsertError) console.warn('⚠️ Supabase upsert player_history failed:', upsertError.message || upsertError);
    }

    console.log(`✅ Game results saved to Supabase for room ${room.id}`);
  } catch (err) {
    console.warn('⚠️ Supabase saveGameResults failed:', err.message || err);
  }
}

// ===== GAME HELPERS =====

function calculatePortfolioValue(portfolio, currentPrice) {
  let totalValue = 0;
  for (const [, holding] of portfolio) {
    totalValue += holding.shares * currentPrice;
  }
  return totalValue;
}

function startRoomChartProgression(roomId, io) {
  const room = gameRooms.get(roomId);
  if (!room || !room.chart.isPlaying) return;

  const gameDurationMinutes = room.settings?.timeLimit || 5;
  const gameDurationMs = gameDurationMinutes * 60 * 1000;
  const gameStartTime = Date.now();
  const gameEndTime = gameStartTime + gameDurationMs;

  console.log(`🕒 Starting chart progression for room ${roomId}: ${gameDurationMinutes} minutes`);

  const interval = setInterval(async () => {
    const now = Date.now();
    const timeRemaining = gameEndTime - now;

    if (!room.chart.isPlaying || timeRemaining <= 0) {
      clearInterval(interval);
      room.gameState = 'finished';

      const finalResults = Array.from(room.players.values()).map(p => {
        const currentPrice = room.currentPrice || room.chart.data[room.chart.currentIndex]?.close || 100;
        const portfolioValue = calculatePortfolioValue(p.portfolio, currentPrice);
        return {
          id: p.id, name: p.name, balance: p.balance, portfolioValue,
          totalValue: p.balance + portfolioValue, trades: p.trades.length,
          profit: (p.balance + portfolioValue) - 1000000,
          profitPercentage: ((p.balance + portfolioValue - 1000000) / 1000000) * 100
        };
      }).sort((a, b) => b.totalValue - a.totalValue);

      await saveGameResultsToDatabase(room, finalResults);
      io.to(roomId).emit('game-finished', { results: finalResults });
      console.log(`🏁 Game finished in room ${roomId} after ${gameDurationMinutes} minutes`);
      return;
    }

    const elapsedMs = now - gameStartTime;
    const progressPercentage = Math.min(elapsedMs / gameDurationMs, 1);
    const targetIndex = Math.floor(progressPercentage * (room.chart.data.length - 1));

    if (targetIndex > room.chart.currentIndex && targetIndex < room.chart.data.length) {
      room.chart.currentIndex = targetIndex;
      const currentCandle = room.chart.data[room.chart.currentIndex];
      io.to(roomId).emit('chart-update', {
        candle: currentCandle, index: room.chart.currentIndex,
        timeRemaining: Math.max(0, Math.floor(timeRemaining / 1000))
      });
    }
  }, 1000);
}

// ===== SOCKET HANDLERS =====

function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    const { userId, userName } = socket.handshake.query;
    const clientOrigin = socket.handshake.headers.origin;
    console.log(`🔗 Player connected: ${socket.id}`);
    console.log(`👤 User: ${userName} (${userId}) from ${clientOrigin}`);
    console.log(`🌐 Total connections: ${io.engine.clientsCount}`);

    const handleSocketError = (eventName, error) => {
      console.error(`🚨 Socket error in ${eventName}:`, error);
      socket.emit('error', {
        message: `Error in ${eventName}`,
        code: error.code || 'UNKNOWN_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    };

    const withErrorHandling = (eventName, handler) => {
      return async (...args) => {
        try { await handler(...args); } catch (error) { handleSocketError(eventName, error); }
      };
    };

    socket.on('join-room', withErrorHandling('join-room', async ({ roomId, playerId, playerName, roomSettings = {} }) => {
      if (!roomId || !playerId || !playerName) {
        socket.emit('error', { message: 'Missing required fields: roomId, playerId, or playerName' });
        return;
      }
      if (typeof roomId !== 'string' || typeof playerId !== 'string' || typeof playerName !== 'string') {
        socket.emit('error', { message: 'Invalid parameter types' });
        return;
      }

      const previousRoom = playerRooms.get(playerId);
      if (previousRoom) {
        socket.leave(previousRoom);
        const prevRoomData = gameRooms.get(previousRoom);
        if (prevRoomData?.players) {
          prevRoomData.players.delete(playerId);
          socket.to(previousRoom).emit('player-left', { playerId, playerName });
        }
      }

      if (!gameRooms.has(roomId)) {
        const timeLimit = roomSettings.settings?.timeLimit || 3;
        const newRoom = {
          id: roomId, players: new Map(), host: playerId, gameState: 'waiting',
          startTime: null, duration: timeLimit * 60,
          chart: { symbol: roomSettings.symbol || 'PTT', data: [], currentIndex: 0, isPlaying: false },
          settings: {
            maxPlayers: roomSettings.settings?.maxPlayers || 10,
            startingBalance: roomSettings.settings?.startingBalance || 1000000,
            timeLimit, symbol: roomSettings.symbol || 'PTT'
          },
          symbol: roomSettings.symbol || 'PTT',
          market: roomSettings.market || 'SET',
          startDate: roomSettings.startDate
        };
        gameRooms.set(roomId, newRoom);
        try {
          await saveRoomToSupabase(roomId, {
            hostId: playerId, gameState: 'waiting', createdAt: new Date(),
            settings: newRoom.settings, symbol: newRoom.symbol, market: newRoom.market
          });
        } catch (err) {
          console.warn('⚠️ Failed to save room to Supabase:', err.message);
        }
      }

      const room = gameRooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Failed to create or access room' }); return; }

      const maxPlayers = room.settings?.maxPlayers || 10;
      if (room.players && room.players.size >= maxPlayers) {
        socket.emit('error', { message: `Room is full (${maxPlayers} players maximum)` });
        return;
      }
      if (room.gameState === 'finished') {
        socket.emit('error', { message: 'Game has already finished' });
        return;
      }

      const playerData = {
        id: playerId, name: playerName, socketId: socket.id,
        balance: 1000000, portfolio: new Map(), trades: [],
        isReady: false, joinedAt: new Date()
      };
      if (!room.players) room.players = new Map();
      room.players.set(playerId, playerData);

      try {
        await savePlayerToSupabase(roomId, playerId, {
          uid: playerId, displayName: playerName, balance: playerData.balance,
          isReady: false, isOnline: true, joinedAt: new Date()
        });
      } catch (err) {
        console.warn('⚠️ Failed to save player to Supabase:', err.message);
      }

      playerRooms.set(playerId, roomId);
      socket.join(roomId);

      const playersList = Array.from(room.players.values()).map(p => ({
        id: p.id, name: p.name, isReady: p.isReady || false, balance: p.balance || 1000000
      }));

      socket.emit('room-joined', {
        roomId, playerId, hostId: room.host, isHost: room.host === playerId,
        players: playersList, gameState: room.gameState || 'waiting',
        settings: room.settings || { maxPlayers: 10, startingBalance: 1000000, timeLimit: 3, symbol: 'PTT' },
        symbol: room.symbol || room.chart?.symbol || 'PTT',
        market: room.market || 'SET', startDate: room.startDate
      });
      socket.to(roomId).emit('player-joined', { playerId, playerName, players: playersList });
      console.log(`👤 Player ${playerName} joined room ${roomId}`);
    }));

    socket.on('player-ready', withErrorHandling('player-ready', async ({ playerId }) => {
      if (!playerId) { socket.emit('error', { message: 'Missing playerId' }); return; }
      const roomId = playerRooms.get(playerId);
      if (!roomId) { socket.emit('error', { message: 'Player not in any room' }); return; }
      const room = gameRooms.get(roomId);
      if (!room?.players) { socket.emit('error', { message: 'Room not found or invalid' }); return; }

      const player = room.players.get(playerId);
      if (player) {
        player.isReady = true;
        const playersList = Array.from(room.players.values()).map(p => ({
          id: p.id, name: p.name, isReady: p.isReady || false, balance: p.balance || 1000000
        }));
        io.to(roomId).emit('player-ready-update', { playerId, players: playersList });
      } else {
        socket.emit('error', { message: 'Player not found in room' });
      }
    }));

    socket.on('start-countdown', withErrorHandling('start-countdown', async ({ roomId: directRoomId, playerId }) => {
      const roomId = directRoomId || playerRooms.get(playerId);
      if (!roomId) { socket.emit('error', { message: 'Room not specified' }); return; }
      const room = gameRooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
      if (playerId && room.host !== playerId) { socket.emit('error', { message: 'Only host can start countdown' }); return; }
      io.to(roomId).emit('countdown-started', { duration: 10, startedBy: playerId });
    }));

    socket.on('start-game', withErrorHandling('start-game', async ({ roomId: directRoomId, playerId, startTime, symbol = 'PTT', duration = 300 }) => {
      const roomId = directRoomId || playerRooms.get(playerId);
      if (!roomId) { socket.emit('error', { message: 'Room not specified' }); return; }
      const room = gameRooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
      if (playerId && room.host !== playerId) { socket.emit('error', { message: 'Only host can start the game' }); return; }

      if (room.gameState !== 'waiting') {
        if (room.gameState === 'playing' && room.chart) {
          socket.emit('game-started', {
            symbol: room.chart.symbol, duration: room.duration,
            startTime: room.startTime, initialChart: room.chart.data ? room.chart.data.slice(0, 10) : []
          });
          return;
        }
        socket.emit('error', { message: 'Game already started' });
        return;
      }

      const seed = Math.floor(Math.random() * 1000000);
      const chartData = generateSeededRandomData(symbol, seed, duration);

      room.chart = { symbol, data: chartData, currentIndex: 0, isPlaying: true, seed };
      room.gameState = 'playing';
      room.startTime = startTime || Date.now();
      room.startTimeMs = room.startTime;
      room.gameStartTime = room.startTime;
      room.duration = duration;
      room.durationSec = duration;

      await saveRoomToSupabase(roomId, {
        gameState: 'playing', startTime: new Date(room.startTime), duration, symbol, seed
      });

      startRoomChartProgression(roomId, io);

      io.to(roomId).emit('game-started', {
        symbol, duration, startTime: room.startTime, initialChart: chartData.slice(0, 10)
      });
      console.log(`🎮 Game started in room ${roomId} with symbol ${symbol}`);
    }));

    socket.on('make-trade', withErrorHandling('make-trade', async ({ playerId, action, symbol, shares, price }) => {
      if (!playerId || !action || !symbol || !shares || !price) {
        socket.emit('error', { message: 'Missing required trade data' });
        return;
      }

      const roomId = playerRooms.get(playerId);
      if (!roomId) { socket.emit('error', { message: 'Player not in any room' }); return; }

      const room = gameRooms.get(roomId);
      const player = room?.players.get(playerId);
      if (!player || room.gameState !== 'playing') { socket.emit('error', { message: 'Cannot trade right now' }); return; }

      const totalCost = shares * price;

      if (action === 'buy') {
        if (player.balance < totalCost) { socket.emit('error', { message: 'Insufficient balance' }); return; }
        player.balance -= totalCost;
        if (player.portfolio.has(symbol)) {
          const existing = player.portfolio.get(symbol);
          const newShares = existing.shares + shares;
          player.portfolio.set(symbol, { shares: newShares, avgPrice: ((existing.shares * existing.avgPrice) + totalCost) / newShares });
        } else {
          player.portfolio.set(symbol, { shares, avgPrice: price });
        }
      } else if (action === 'sell') {
        const holding = player.portfolio.get(symbol);
        if (!holding || holding.shares < shares) { socket.emit('error', { message: 'Insufficient shares' }); return; }
        player.balance += totalCost;
        if (holding.shares === shares) player.portfolio.delete(symbol);
        else holding.shares -= shares;
      }

      const trade = { id: Date.now().toString(), timestamp: Date.now(), action, symbol, shares, price, total: totalCost };
      player.trades.push(trade);

      try {
        if (supabase) {
          const { error } = await supabase.from('trades').insert([{
            room_id: roomId, user_id: playerId, symbol, action, quantity: shares, price,
            portfolio: Object.fromEntries(player.portfolio),
            metadata: { trade, player_name: player.name, new_balance: player.balance },
            created_at: new Date().toISOString()
          }]);
          if (error) throw error;
        }
      } catch (error) {
        console.error('Error saving trade to DB:', error);
      }

      socket.emit('trade-executed', {
        trade, playerId, newBalance: player.balance,
        newPosition: player.portfolio.get(symbol)?.shares || 0,
        avgPrice: player.portfolio.get(symbol)?.avgPrice || 0,
        portfolio: Object.fromEntries(player.portfolio)
      });

      room.currentPrice = price;

      const leaderboard = Array.from(room.players.values()).map(p => ({
        id: p.id, name: p.name, balance: p.balance,
        portfolioValue: calculatePortfolioValue(p.portfolio, price)
      })).sort((a, b) => (b.balance + b.portfolioValue) - (a.balance + a.portfolioValue));
      io.to(roomId).emit('leaderboard-update', { leaderboard });
    }));

    socket.on('update-room-settings', withErrorHandling('update-room-settings', ({ roomId, settings }) => {
      const room = gameRooms.get(roomId);
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
      const playerId = Array.from(playerRooms.entries()).find(([, rId]) => rId === roomId)?.[0];
      if (playerId !== room.host) { socket.emit('error', { message: 'Only host can update settings' }); return; }
      room.durationSec = settings.durationSec || room.durationSec;
      room.symbol = settings.symbol || room.symbol;
      room.market = settings.market || room.market;
      io.to(roomId).emit('room-settings-updated', { settings: room });
    }));

    socket.on('update-player-score', ({ roomId, playerId, totalValue, playerName, balance, position, portfolioValue }) => {
      try {
        const room = gameRooms.get(roomId);
        if (!room) return;
        const player = room.players.get(playerId);
        if (player) {
          player.totalValue = totalValue || (balance + portfolioValue) || player.totalValue;
          player.balance = balance !== undefined ? balance : player.balance;
          player.position = position !== undefined ? position : player.position;
          player.portfolioValue = portfolioValue !== undefined ? portfolioValue : player.portfolioValue;
          player.lastActive = Date.now();

          const leaderboard = Array.from(room.players.values())
            .map(p => ({
              id: p.id, name: p.name, balance: p.balance || 10000000,
              position: p.position || 0, portfolioValue: p.portfolioValue || 0,
              totalValue: p.totalValue || p.balance || 1000000, lastActive: p.lastActive
            }))
            .sort((a, b) => b.totalValue - a.totalValue);
          io.to(roomId).emit('leaderboard-update', { leaderboard, updateTime: Date.now() });
        }
      } catch (error) {
        console.error('❌ Error updating player score:', error);
      }
    });

    socket.on('finish-game', async ({ roomId }) => {
      try {
        const room = gameRooms.get(roomId);
        if (!room) return;
        room.gameState = 'finished';
        room.finishTime = Date.now();

        const finalResults = Array.from(room.players.values()).map(player => {
          const currentPrice = room.currentPrice || room.chart.data[room.chart.currentIndex]?.close || 0;
          const portfolioValue = calculatePortfolioValue(player.portfolio, currentPrice);
          const totalValue = player.balance + portfolioValue;
          const totalReturn = totalValue - 1000000;
          return {
            playerId: player.id, playerName: player.name, balance: player.balance,
            portfolioValue, totalValue, totalReturn,
            returnPercentage: (totalReturn / 1000000) * 100, trades: player.trades.length
          };
        }).sort((a, b) => b.totalValue - a.totalValue);

        await saveGameResultsToDatabase(room, finalResults);
        io.to(roomId).emit('game-finished', { finishTime: room.finishTime, finalLeaderboard: finalResults });
        console.log(`🏁 Game finished in room ${roomId}`);
      } catch (error) {
        console.error('Error finishing game:', error);
      }
    });

    socket.on('get-rooms', () => {
      try {
        const rooms = Array.from(gameRooms.values())
          .filter(room => room.gameState === 'waiting')
          .map(room => ({
            id: room.id, playerCount: room.players.size,
            hostName: room.players.get(room.host)?.name || 'Unknown'
          }));
        socket.emit('rooms-list', { rooms });
      } catch (error) {
        console.error('Error getting rooms:', error);
        socket.emit('error', { message: 'Failed to get rooms' });
      }
    });

    socket.on('leave-room', ({ playerId }) => {
      try {
        const roomId = playerRooms.get(playerId);
        if (roomId) {
          const room = gameRooms.get(roomId);
          if (room) {
            const player = room.players.get(playerId);
            room.players.delete(playerId);
            const remainingPlayers = Array.from(room.players.values()).map(p => ({
              id: p.id, name: p.name, isReady: p.isReady || false, balance: p.balance || 1000000
            }));
            socket.to(roomId).emit('player-left', {
              playerId, playerName: player?.name || 'Unknown', players: remainingPlayers
            });
            if (room.players.size === 0) { gameRooms.delete(roomId); }
          }
          playerRooms.delete(playerId);
          socket.leave(roomId);
        }
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });

    socket.on('disconnect', withErrorHandling('disconnect', async (reason) => {
      console.log(`🔌 Player disconnecting: ${socket.id} (${userName}) - ${reason}`);

      let disconnectedPlayerId = null;
      let roomId = null;
      for (const [playerId, currentRoomId] of playerRooms.entries()) {
        const room = gameRooms.get(currentRoomId);
        const player = room?.players?.get(playerId);
        if (player?.socketId === socket.id) { disconnectedPlayerId = playerId; roomId = currentRoomId; break; }
      }

      if (disconnectedPlayerId && roomId) {
        const room = gameRooms.get(roomId);
        if (room?.players) {
          const player = room.players.get(disconnectedPlayerId);
          const playerName = player?.name || 'Unknown';
          room.players.delete(disconnectedPlayerId);
          playerRooms.delete(disconnectedPlayerId);
          socket.to(roomId).emit('player-left', {
            playerId: disconnectedPlayerId, playerName,
            players: Array.from(room.players.values()).map(p => ({
              id: p.id, name: p.name, isReady: p.isReady || false, balance: p.balance || 1000000
            }))
          });
          if (room.players.size === 0) gameRooms.delete(roomId);
          console.log(`👋 Player ${playerName} left room ${roomId}`);
        }
      }
      console.log(`✅ Player disconnected: ${socket.id} (${userName})`);
    }));
  });
}

module.exports = { initSocketHandlers };
