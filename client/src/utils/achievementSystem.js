const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export const calculateAllTitles = (totalGames, wins, totalProfit, bestStreak, difficultyStats, totalQuizzes = 0) => {
  return [
    { id: 1, name: "Gamer", desc: "Basic game players", icon: "💎", rarity: "common", unlocked: totalGames >= 1 },
    { id: 2, name: "Novice Investor", desc: "Beginner in the investment industry", icon: "📈", rarity: "common", unlocked: totalGames >= 5 },
    { id: 3, name: "Market Analyst", desc: "Expert in market analysis", icon: "💎", rarity: "uncommon", unlocked: totalProfit >= 50000 },
    { id: 4, name: "Market Master", desc: "Top Expert in Trading", icon: "💎", rarity: "legendary", unlocked: totalProfit >= 1000000 && wins >= 50 && (difficultyStats.expert?.wins || 0) >= 3 },
    { id: 5, name: "Trader", desc: "Earn cumulative profit of 100,000 Baht", icon: "💰", rarity: "rare", unlocked: totalProfit >= 100000 },
    { id: 6, name: "Hard Challenger", desc: "Win hard mode 5 times", icon: "🔴", rarity: "rare", unlocked: (difficultyStats.hard?.wins || 0) >= 5 },
    { id: 7, name: "Master", desc: "Win 50 games", icon: "💎", rarity: "epic", unlocked: wins >= 50 },
    { id: 8, name: "Strategic Thinker", desc: "Pass 20 AI investment quiz sets", icon: "🧠", rarity: "epic", unlocked: totalQuizzes >= 20 },
    { id: 9, name: "Legend", desc: "Rank 1st of the week", icon: "⭐", rarity: "legendary", unlocked: false },
    { id: 10, name: "Expert", desc: "Win Expert mode 3 times", icon: "⚫", rarity: "legendary", unlocked: (difficultyStats.expert?.wins || 0) >= 3 },
    { id: 11, name: "Conqueror of All Difficulties", desc: "Win all difficulty levels at least once", icon: "🏆", rarity: "legendary",
      unlocked: (difficultyStats.easy?.wins || 0) >= 1 && (difficultyStats.medium?.wins || 0) >= 1 && (difficultyStats.hard?.wins || 0) >= 1 && (difficultyStats.expert?.wins || 0) >= 1 },
    { id: 12, name: "Market Genius", desc: "Earn total net profit of 1,000,000 Baht", icon: "💎", rarity: "mythic", unlocked: totalProfit >= 1000000 }
  ];
};

export const loadPlayerStats = async (userId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/game-history/${userId}?limit=1000`);
    const { games = [] } = res.ok ? await res.json() : {};

    const totalGames = games.length;
    const wins = games.filter(g => g.result === 'win' || g.profit > 0).length;
    const totalProfit = games.reduce((sum, g) => sum + (g.profit || 0), 0);

    let bestStreak = 0;
    let currentStreak = 0;
    for (const g of [...games].reverse()) {
      if (g.result === 'win' || g.profit > 0) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    const soloGames = games.filter(g => g.game_mode !== 'multiplayer');
    const difficultyStats = { easy: { played: 0, wins: 0 }, medium: { played: 0, wins: 0 }, hard: { played: 0, wins: 0 }, expert: { played: 0, wins: 0 } };
    soloGames.forEach(g => {
      const d = g.difficulty || 'easy';
      if (difficultyStats[d]) {
        difficultyStats[d].played++;
        if (g.result === 'win' || g.profit > 0) difficultyStats[d].wins++;
      }
    });

    return { totalGames, wins, totalProfit, bestStreak, difficultyStats };
  } catch (error) {
    console.error("Error loading player stats:", error);
    return null;
  }
};

export const loadUserAchievements = async (userId) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/profile/${userId}`);
    const profile = res.ok ? await res.json() : {};
    return profile.achievements || [];
  } catch (error) {
    console.error("Error loading user achievements:", error);
    return [];
  }
};

export const saveNewAchievements = async (userId, newTitles) => {
  try {
    if (newTitles.length === 0) return [];

    const res = await fetch(`${API_BASE_URL}/api/profile/${userId}`);
    const profile = res.ok ? await res.json() : {};
    const existing = profile.achievements || [];

    const updated = [...existing];
    const added = [];
    newTitles.forEach(title => {
      if (!existing.find(a => a.id === title.id)) {
        const achievement = { ...title, unlockedAt: new Date().toISOString(), isNew: true };
        updated.push(achievement);
        added.push(achievement);
      }
    });

    if (added.length > 0) {
      await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievements: updated })
      });
      console.log(`🏆 New achievements unlocked: ${added.map(a => a.name).join(', ')}`);
      return added;
    }
    return [];
  } catch (error) {
    console.error("Error saving new achievements:", error);
    return [];
  }
};

export const checkAchievementsAfterGame = async (userId) => {
  try {
    const stats = await loadPlayerStats(userId);
    if (!stats) return [];

    const existingAchievements = await loadUserAchievements(userId);
    const allTitles = calculateAllTitles(stats.totalGames, stats.wins, stats.totalProfit, stats.bestStreak, stats.difficultyStats, 0);
    const newTitles = allTitles.filter(t => t.unlocked && !existingAchievements.find(a => a.id === t.id));

    if (newTitles.length > 0) {
      return await saveNewAchievements(userId, newTitles);
    }
    return [];
  } catch (error) {
    console.error("Error checking achievements after game:", error);
    return [];
  }
};

export const getRarityColor = (rarity) => {
  switch (rarity) {
    case 'mythic': return 'from-pink-500/30 to-purple-600/30';
    case 'legendary': return 'from-yellow-500/30 to-orange-600/30';
    case 'epic': return 'from-purple-500/30 to-blue-600/30';
    case 'rare': return 'from-blue-500/30 to-cyan-600/30';
    case 'uncommon': return 'from-green-500/30 to-emerald-600/30';
    default: return 'from-gray-500/30 to-slate-600/30';
  }
};
