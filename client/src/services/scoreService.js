const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export async function updatePlayerScore(userId, gameScore, won = false) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/profile/${userId}`);
    const profile = res.ok ? await res.json() : {};
    const updated = {
      totalScore: (profile.totalScore || 0) + gameScore,
      gamesPlayed: (profile.gamesPlayed || 0) + 1,
      gamesWon: (profile.gamesWon || 0) + (won ? 1 : 0),
      lastPlayed: new Date().toISOString()
    };
    await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    return true;
  } catch (error) {
    console.error("Error updating player score:", error);
    return false;
  }
}

export async function addGameHistory(userId, gameData) {
  try {
    await fetch(`${API_BASE_URL}/api/game-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        gameType: 'solo',
        score: gameData.score,
        profit: gameData.profit,
        difficulty: gameData.difficulty,
        duration: gameData.duration,
        totalTrades: gameData.trades,
        gameMode: gameData.gameMode || 'solo'
      })
    });
    return true;
  } catch (error) {
    console.error("Error adding game history:", error);
    return false;
  }
}

export async function getPlayerGameHistory(userId, limit = 10) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/game-history/${userId}?limit=${limit}`);
    if (!res.ok) return [];
    const { games } = await res.json();
    return games || [];
  } catch (error) {
    console.error("Error fetching game history:", error);
    return [];
  }
}

export async function resetPlayerStats(userId) {
  try {
    await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalScore: 0, gamesPlayed: 0, gamesWon: 0, lastReset: new Date().toISOString() })
    });
    return true;
  } catch (error) {
    console.error("Error resetting player stats:", error);
    return false;
  }
}
