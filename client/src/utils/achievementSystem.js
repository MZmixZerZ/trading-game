import { firestore } from "../firebase/firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// Function to calculate all titles
export const calculateAllTitles = (totalGames, wins, totalProfit, bestStreak, difficultyStats, totalQuizzes = 0) => {
  return [
    { 
      id: 1, 
      name: "Gamer", 
      desc: "Basic game players", 
      icon: "💎", 
      rarity: "common",
      unlocked: totalGames >= 1
    },
    { 
      id: 2, 
      name: "Novice Investor", 
      desc: "Beginner in the investment industry", 
      icon: "📈",
      rarity: "common",
      unlocked: totalGames >= 5
    },
    { 
      id: 3, 
      name: "Market Analyst", 
      desc: "Expert in market analysis", 
      icon: "💎", 
      rarity: "uncommon",
      unlocked: totalProfit >= 50000
    },
    { 
      id: 4, 
      name: "Market Master", 
      desc: "Top Expert in Trading", 
      icon: "💎", 
      rarity: "legendary",
      unlocked: totalProfit >= 1000000 && wins >= 50 && (difficultyStats.expert?.wins || 0) >= 3
    },
    { 
      id: 5, 
      name: "Trader", 
      desc: "Earn cumulative profit of 100,000 Baht", 
      icon: "💰", 
      rarity: "rare",
      unlocked: totalProfit >= 100000
    },
    { 
      id: 6, 
      name: "Hard Challenger", 
      desc: "Win hard mode 5 times", 
      icon: "🔴", 
      rarity: "rare",
      unlocked: (difficultyStats.hard?.wins || 0) >= 5
    },
    { 
      id: 7, 
      name: "Master", 
      desc: "Win 50 games", 
      icon: "💎", 
      rarity: "epic",
      unlocked: wins >= 50
    },
    { 
      id: 8, 
      name: "Strategic Thinker", 
      desc: "Pass 20 AI investment quiz sets", 
      icon: "🧠", 
      rarity: "epic",
      unlocked: totalQuizzes >= 20
    },
    { 
      id: 9, 
      name: "Legend", 
      desc: "Rank 1st of the week", 
      icon: "⭐", 
      rarity: "legendary",
      unlocked: false // Need to connect with ranking system
    },
    { 
      id: 10, 
      name: "Expert", 
      desc: "Win Expert mode 3 times", 
      icon: "⚫", 
      rarity: "legendary",
      unlocked: (difficultyStats.expert?.wins || 0) >= 3
    },
    { 
      id: 11, 
      name: "Conqueror of All Difficulties", 
      desc: "Win all difficulty levels at least once", 
      icon: "🏆", 
      rarity: "legendary",
      unlocked: (difficultyStats.easy?.wins || 0) >= 1 && 
                (difficultyStats.medium?.wins || 0) >= 1 && 
                (difficultyStats.hard?.wins || 0) >= 1 && 
                (difficultyStats.expert?.wins || 0) >= 1
    },
    { 
      id: 12, 
      name: "Market Genius", 
      desc: "Earn total net profit of 1,000,000 Baht", 
      icon: "💎", 
      rarity: "mythic",
      unlocked: totalProfit >= 1000000
    }
  ];
};

// Function to load player stats from Firebase
export const loadPlayerStats = async (userId) => {
  try {
    const gamesQuery = query(
      collection(firestore, 'gameHistory'),
      where('userId', '==', userId)
    );
    
    const gamesSnapshot = await getDocs(gamesQuery);
    const games = [];
    gamesSnapshot.forEach(doc => {
      games.push({ id: doc.id, ...doc.data() });
    });

    // Calculate statistics
    const totalGames = games.length;
    const wins = games.filter(game => 
      game.result === 'win' || (game.profit && game.profit > 0)
    ).length;
    const totalProfit = games.reduce((sum, game) => sum + (game.profit || 0), 0);
    
    // Calculate win streak
    let bestStreak = 0;
    let currentStreak = 0;
    
    for (const game of games.reverse()) {
      if (game.result === 'win' || (game.profit && game.profit > 0)) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // Calculate difficulty-based statistics
    const soloGames = games.filter(game => game.gameMode !== 'multiplayer');
    const difficultyStats = {
      'easy': { played: 0, wins: 0 },
      'medium': { played: 0, wins: 0 },
      'hard': { played: 0, wins: 0 },
      'expert': { played: 0, wins: 0 }
    };

    soloGames.forEach(game => {
      const difficulty = game.difficulty || 'easy';
      if (difficultyStats[difficulty]) {
        difficultyStats[difficulty].played++;
        if (game.result === 'win' || (game.profit && game.profit > 0)) {
          difficultyStats[difficulty].wins++;
        }
      }
    });

    return {
      totalGames,
      wins,
      totalProfit,
      bestStreak,
      difficultyStats
    };
  } catch (error) {
    console.error("Error loading player stats:", error);
    return null;
  }
};

// Function to load existing achievements
export const loadUserAchievements = async (userId) => {
  try {
    const userAchievementsRef = doc(firestore, 'userAchievements', userId);
    const achievementsDoc = await getDoc(userAchievementsRef);
    
    if (achievementsDoc.exists()) {
      return achievementsDoc.data().achievements || [];
    } else {
      // Create new document
      await setDoc(userAchievementsRef, {
        userId: userId,
        achievements: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return [];
    }
  } catch (error) {
    console.error("Error loading user achievements:", error);
    return [];
  }
};

// Function to save new achievements
export const saveNewAchievements = async (userId, newTitles) => {
  try {
    if (newTitles.length === 0) return [];

    const userAchievementsRef = doc(firestore, 'userAchievements', userId);
    const existingDoc = await getDoc(userAchievementsRef);
    
    let existingAchievements = [];
    if (existingDoc.exists()) {
      existingAchievements = existingDoc.data().achievements || [];
    }

    // Add new achievements
    const updatedAchievements = [...existingAchievements];
    const newAchievementsList = [];

    newTitles.forEach(title => {
      const exists = existingAchievements.find(ach => ach.id === title.id);
      if (!exists) {
        const newAchievement = {
          ...title,
          unlockedAt: new Date().toISOString(),
          isNew: true
        };
        updatedAchievements.push(newAchievement);
        newAchievementsList.push(newAchievement);
      }
    });

    if (newAchievementsList.length > 0) {
      await setDoc(userAchievementsRef, {
        userId: userId,
        achievements: updatedAchievements,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log(`🏆 New achievements unlocked: ${newAchievementsList.map(a => a.name).join(', ')}`);
      return newAchievementsList;
    }

    return [];
  } catch (error) {
    console.error("Error saving new achievements:", error);
    return [];
  }
};

// Main function to check new achievements after game
export const checkAchievementsAfterGame = async (userId) => {
  try {
    // Load current statistics
    const stats = await loadPlayerStats(userId);
    if (!stats) return [];

    // Load existing achievements
    const existingAchievements = await loadUserAchievements(userId);

    // Calculate all titles
    const allTitles = calculateAllTitles(
      stats.totalGames,
      stats.wins, 
      stats.totalProfit,
      stats.bestStreak,
      stats.difficultyStats,
      0 // totalQuizzes - will be added in the future
    );

    // Find titles that are unlocked but not yet saved
    const unlockedTitles = allTitles.filter(title => title.unlocked);
    const newTitles = unlockedTitles.filter(title => 
      !existingAchievements.find(ach => ach.id === title.id)
    );

    // Save new achievements
    if (newTitles.length > 0) {
      return await saveNewAchievements(userId, newTitles);
    }

    return [];
  } catch (error) {
    console.error("Error checking achievements after game:", error);
    return [];
  }
};

// Function to get rarity color
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