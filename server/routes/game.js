const express = require('express');
const supabase = require('../supabaseClient');

const router = express.Router();

router.get('/player-history/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('player_history').select('*').eq('player_id', playerId).limit(1);
        if (error) throw error;
        if (data && data.length > 0) return res.json(data[0].data || data[0]);
        return res.json({
          playerId, playerName: 'Unknown', totalGames: 0, totalProfit: 0,
          averageProfit: 0, wins: 0, losses: 0, games: []
        });
      } catch (supabaseError) {
        console.warn('Supabase read error:', supabaseError.message);
      }
    }
    return res.status(503).json({ error: 'Database service unavailable' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('player_history')
          .select('player_id, player_name, total_games, average_profit, wins, losses')
          .order('average_profit', { ascending: false })
          .limit(parseInt(limit));
        if (error) throw error;
        const leaderboard = (data || []).map(row => ({
          playerId: row.player_id, playerName: row.player_name,
          totalGames: row.total_games, averageProfit: row.average_profit,
          wins: row.wins, losses: row.losses,
          winRate: row.total_games > 0 ? (row.wins / row.total_games * 100) : 0
        }));
        return res.json({ leaderboard });
      } catch (supabaseError) {
        console.warn('Supabase read error:', supabaseError.message);
      }
    }
    return res.status(503).json({ error: 'Database service unavailable' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/recent-games', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('game_results')
          .select('id, room_id, symbol, duration, player_count, end_time, results')
          .order('end_time', { ascending: false })
          .limit(parseInt(limit));
        if (error) throw error;
        const games = (data || []).map(row => ({
          gameId: row.id, roomId: row.room_id, symbol: row.symbol,
          duration: row.duration, playerCount: row.player_count,
          endTime: row.end_time, winner: Array.isArray(row.results) ? row.results[0] : null
        }));
        return res.json({ games });
      } catch (supabaseError) {
        console.warn('Supabase read error:', supabaseError.message);
      }
    }
    return res.status(503).json({ error: 'Database service unavailable' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/game-history', async (req, res) => {
  try {
    const {
      userId, gameType, result, score, profit, profitPercentage,
      finalBalance, difficulty, market, symbol, duration, totalTrades,
      gameMode, roomCode, data: extraData
    } = req.body;

    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!supabase) return res.status(503).json({ error: 'Database service unavailable' });

    const row = {
      user_id: userId, game_type: gameType || 'solo', result: result || null,
      score: Number(score) || 0, profit: Number(profit) || 0,
      profit_percentage: Number(profitPercentage) || 0, final_balance: Number(finalBalance) || 0,
      difficulty: difficulty || null, market: market || null, symbol: symbol || null,
      duration: Number(duration) || null, total_trades: Number(totalTrades) || 0,
      game_mode: gameMode || 'solo', room_code: roomCode || null, data: extraData || null,
    };

    const { data, error } = await supabase.from('game_history').insert([row]).select('id').single();
    if (error) throw error;

    try {
      const profitValue = Number(profit) || 0;
      const { data: existing } = await supabase
        .from('player_history').select('*').eq('player_id', userId).limit(1).maybeSingle();
      const prev = existing || { player_id: userId, total_games: 0, total_profit: 0, wins: 0, losses: 0, data: { games: [] } };
      const newTotal = Number(prev.total_games || 0) + 1;
      const newProfit = Number(prev.total_profit || 0) + profitValue;
      await supabase.from('player_history').upsert([{
        player_id: userId, player_name: req.body.playerName || 'Player',
        total_games: newTotal, total_profit: newProfit,
        average_profit: newTotal > 0 ? newProfit / newTotal : 0,
        wins: Number(prev.wins || 0) + (profitValue > 0 ? 1 : 0),
        losses: Number(prev.losses || 0) + (profitValue <= 0 ? 1 : 0),
        data: { ...prev.data, games: [...(prev.data?.games || []), { game_id: data.id, profit: profitValue }] },
        updated_at: new Date().toISOString()
      }], { onConflict: 'player_id' });
    } catch (aggErr) {
      console.warn('⚠️ Could not update player_history aggregate:', aggErr.message);
    }

    res.json({ success: true, id: data.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/game-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, gameMode } = req.query;
    if (!supabase) return res.status(503).json({ error: 'Database service unavailable' });

    let query = supabase
      .from('game_history').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(parseInt(limit));
    if (gameMode) query = query.eq('game_mode', gameMode);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ games: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
