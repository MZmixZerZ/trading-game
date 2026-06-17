import React, { useState, useEffect, useCallback } from "react";
import { auth } from "../../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { FaTrophy, FaStar, FaMedal, FaGamepad, FaChartLine, FaFire } from "react-icons/fa";
import { firestore } from "../../firebase/firebase";
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import GameHeader from "../../components/common/GameHeader";
import { useAchievement } from "../../contexts/AchievementContext";
import { calculateAllTitles } from "../../utils/achievementSystem";

export default function GameProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerStats, setPlayerStats] = useState({
    totalGames: 0,
    wins: 0,
    winRate: 0,
    totalProfit: 0,
    bestStreak: 0,
    rank: "Bronze Trader",
    nextRank: "Silver Trader"
  });
  const [titles, setTitles] = useState([]);
  
  // Use Achievement Context
  useAchievement();

  const calculateTitles = useCallback((totalGames, wins, totalProfit, bestStreak, difficultyStats, totalQuizzes = 0) => {
    const calculatedTitles = calculateAllTitles(totalGames, wins, totalProfit, bestStreak, difficultyStats, totalQuizzes);
    setTitles(calculatedTitles);
    return calculatedTitles;
  }, []);

  // Get rarity color for titles display
  const getTitleRarityColor = (rarity) => {
    switch (rarity) {
      case 'mythic': return 'from-pink-500/30 to-purple-600/30';
      case 'legendary': return 'from-yellow-500/30 to-orange-600/30';
      case 'epic': return 'from-purple-500/30 to-blue-600/30';
      case 'rare': return 'from-blue-500/30 to-cyan-600/30';
      case 'uncommon': return 'from-green-500/30 to-emerald-600/30';
      default: return 'from-gray-500/30 to-slate-600/30';
    }
  };

  const loadUserData = useCallback(async (userId) => {
    try {
      // Get all game history
      const gamesQuery = query(
        collection(firestore, 'gameHistory'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      let gamesSnapshot;
      try {
        gamesSnapshot = await getDocs(gamesQuery);
      } catch (queryError) {
        console.warn('⚠️ Game profile query failed, trying fallback:', queryError.message);
        
        // Fallback without orderBy to avoid index issues
        const fallbackQuery = query(
          collection(firestore, 'gameHistory'),
          where('userId', '==', userId)
        );
        
        gamesSnapshot = await getDocs(fallbackQuery);
      }
      
      const games = [];
      gamesSnapshot.forEach(doc => {
        games.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by date if using fallback query
      if (games.length > 0 && !games[0].createdAt) {
        games.sort((a, b) => {
          const dateA = a.timestamp?.toDate() || a.createdAt?.toDate() || new Date(0);
          const dateB = b.timestamp?.toDate() || b.createdAt?.toDate() || new Date(0);
          return dateB - dateA;
        });
      }
        
      // Separate Solo and Multiplayer game data to calculate difficulty stats
      const soloGames = games.filter(game => game.gameMode !== 'multiplayer');

      // คำนวณสถิติรวม
      const totalGames = games.length;
      const wins = games.filter(game => 
        game.result === 'win' || (game.profit && game.profit > 0)
      ).length;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
      
      const totalProfit = games.reduce((sum, game) => sum + (game.profit || 0), 0);
      
      // คำนวณ win streak ที่ดีที่สุด
      let bestStreak = 0;
      let currentStreak = 0;
      
      for (const game of games.reverse()) { // เรียงใหม่เพื่อให้เป็นลำดับเวลา
        if (game.result === 'win' || (game.profit && game.profit > 0)) {
          currentStreak++;
          bestStreak = Math.max(bestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      // คำนวณสถิติแยกตามระดับความยาก (เฉพาะ Solo games)
      const difficultyStats = {
        'easy': { played: 0, wins: 0, winRate: 0, profit: 0 },
        'medium': { played: 0, wins: 0, winRate: 0, profit: 0 },
        'hard': { played: 0, wins: 0, winRate: 0, profit: 0 },
        'expert': { played: 0, wins: 0, winRate: 0, profit: 0 }
      };

      soloGames.forEach(game => {
        const difficulty = game.difficulty || 'easy';
        if (difficultyStats[difficulty]) {
          difficultyStats[difficulty].played++;
          difficultyStats[difficulty].profit += (game.profit || 0);
          if (game.result === 'win' || (game.profit && game.profit > 0)) {
            difficultyStats[difficulty].wins++;
          }
        }
      });

      // คำนวณ win rate แต่ละระดับ
      Object.keys(difficultyStats).forEach(difficulty => {
        const stats = difficultyStats[difficulty];
        stats.winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
      });

      // คำนวณ rank ตาม winRate, totalProfit และสถิติตามระดับความยาก
      const { rank, nextRank, color } = calculateRank(winRate, totalProfit, difficultyStats);

      // อัปเดต state
      setPlayerStats({
        totalGames,
        wins,
        winRate,
        totalProfit,
        bestStreak,
        rank,
        nextRank,
        difficultyStats,
        rankColor: color
      });

      // Calculate unlocked titles
      calculateTitles(totalGames, wins, totalProfit, bestStreak, difficultyStats, 0);

    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, [calculateTitles]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadUserData(currentUser.uid);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [loadUserData]);

  const calculateRank = (winRate, totalProfit, difficultyStats) => {
    // คำนวณ weighted score จากระดับความยากที่เล่น
    const difficultyWeights = {
      'easy': 1.0,
      'medium': 1.5,
      'hard': 2.0,
      'expert': 3.0
    };

    let weightedScore = 0;
    let totalWeight = 0;

    Object.keys(difficultyStats).forEach(difficulty => {
      const stats = difficultyStats[difficulty];
      if (stats.played > 0) {
        const weight = difficultyWeights[difficulty] || 1.0;
        const difficultyScore = (stats.winRate / 100) * weight;
        weightedScore += difficultyScore * stats.played;
        totalWeight += stats.played * weight;
      }
    });

    const avgWeightedScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Expert level stats
    const expertStats = difficultyStats['expert'] || { played: 0, winRate: 0 };
    const hardStats = difficultyStats['hard'] || { played: 0, winRate: 0 };

    if (winRate >= 80 && totalProfit >= 1000000 && expertStats.played >= 20 && expertStats.winRate >= 75) {
      return { rank: "เทพเทรดดิ้ง", nextRank: "ระดับสูงสุดแล้ว", color: "from-yellow-400 to-yellow-600" };
    } else if (winRate >= 75 && totalProfit >= 500000 && expertStats.played >= 10 && expertStats.winRate >= 70) {
      return { rank: "Legendary Trader", nextRank: "เทพเทรดดิ้ง", color: "from-purple-400 to-pink-600" };
    } else if (winRate >= 65 && totalProfit >= 200000 && hardStats.played >= 5 && hardStats.winRate >= 60) {
      return { rank: "Master Trader", nextRank: "Legendary Trader", color: "from-red-400 to-orange-600" };
    } else if (winRate >= 55 && totalProfit >= 100000 && avgWeightedScore >= 1.2) {
      return { rank: "Expert Trader", nextRank: "Master Trader", color: "from-orange-400 to-red-500" };
    } else if (winRate >= 50 && totalProfit >= 50000) {
      return { rank: "Gold Trader", nextRank: "Expert Trader", color: "from-yellow-400 to-orange-500" };
    } else if (winRate >= 40) {
      return { rank: "Silver Trader", nextRank: "Gold Trader", color: "from-gray-300 to-gray-500" };
    } else {
      return { rank: "Bronze Trader", nextRank: "Silver Trader", color: "from-amber-600 to-amber-800" };
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">กำลังโหลดโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-3xl mb-4">กรุณาเข้าสู่ระบบ</h2>
          <Link to="/login" className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
  <GameHeader showBackButton={true} backPath="/challenge" />
    
      <div className="min-h-screen max-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-y-auto scrollbar-thin">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-12 pt-20">
          {/* Player Card */}
          <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-8 mb-8 border border-white/20">
            <div className="flex items-center space-x-6 mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user.email?.charAt(0).toUpperCase() || "P"}
              </div>
            </div>
            
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">
                {user.email?.split('@')[0] || 'Player'}
              </h2>
              <p className="text-cyan-400 text-xl font-medium mb-4">
                <span className={`bg-gradient-to-r ${playerStats.rankColor || 'from-gray-400 to-gray-600'} bg-clip-text text-transparent font-bold`}>
                  {playerStats.rank}
                </span>
                <span className="text-cyan-400 ml-4">Next: {playerStats.nextRank}</span>
              </p>
              <button onClick={handleLogout} className="px-3 py-1 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg">Log out</button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-6 border border-green-400/30">
            <div className="flex items-center justify-between mb-4">
              <FaGamepad className="text-3xl text-green-400" />
              <span className="text-green-300 text-sm font-medium">All Games</span>
            </div>
            <p className="text-3xl font-bold text-white">{playerStats.totalGames}</p>
            <p className="text-green-300 text-sm">Games Played</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-400/30">
            <div className="flex items-center justify-between mb-4">
              <FaTrophy className="text-3xl text-blue-400" />
              <span className="text-blue-300 text-sm font-medium">Win rate</span>
            </div>
            <p className="text-3xl font-bold text-white">{playerStats.winRate}%</p>
            <p className="text-blue-300 text-sm">{playerStats.wins}/{playerStats.totalGames} Wins</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-lg rounded-2xl p-6 border border-yellow-400/30">
            <div className="flex items-center justify-between mb-4">
              <FaChartLine className="text-3xl text-yellow-400" />
              <span className="text-yellow-300 text-sm font-medium">Total Profit</span>
            </div>
            <p className="text-2xl font-bold text-white">{playerStats.totalProfit.toLocaleString()}</p>
            <p className="text-yellow-300 text-sm">THB</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-400/30">
            <div className="flex items-center justify-between mb-4">
              <FaFire className="text-3xl text-purple-400" />
              <span className="text-purple-300 text-sm font-medium">Highest Consecutive Wins</span>
            </div>
            <p className="text-3xl font-bold text-white">{playerStats.bestStreak}</p>
            <p className="text-purple-300 text-sm">Games Played</p>
          </div>
        </div>

        {/* Titles */}
        <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
            <FaMedal className="text-yellow-400 mr-3" />
            🏅 Titles
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {titles.map((title) => (
              <div
                key={title.id}
                className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                  title.unlocked
                    ? `bg-gradient-to-br ${getTitleRarityColor(title.rarity)} border-transparent shadow-lg hover:scale-105`
                    : 'bg-gray-800/50 border-gray-600 opacity-60'
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-3">{title.icon}</div>
                  <h4 className={`font-bold text-lg mb-2 ${title.unlocked ? 'text-white' : 'text-gray-400'}`}>
                    {title.name}
                  </h4>
                  <p className={`text-sm ${title.unlocked ? 'text-gray-200' : 'text-gray-500'}`}>
                    {title.desc}
                  </p>
                  
                  {title.unlocked && (
                    <div className="absolute top-2 right-2">
                      <FaStar className="text-yellow-400 text-lg" />
                    </div>
                  )}
                  
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold ${
                    title.rarity === 'mythic' ? 'bg-pink-500 text-white' :
                    title.rarity === 'legendary' ? 'bg-yellow-500 text-black' :
                    title.rarity === 'epic' ? 'bg-purple-500 text-white' :
                    title.rarity === 'rare' ? 'bg-blue-500 text-white' :
                    title.rarity === 'uncommon' ? 'bg-green-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {title.rarity.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Link
            to="/challenge"
            className="group bg-gradient-to-r from-green-500/80 to-emerald-600/80 backdrop-blur-lg rounded-2xl p-6 text-center hover:from-green-600/80 hover:to-emerald-700/80 transition-all transform hover:scale-105 border border-green-400/30"
          >
            <FaGamepad className="text-4xl text-white mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="text-xl font-bold text-white mb-2">Play Game</h4>
            <p className="text-green-100">Start a new game</p>
          </Link>

          <Link
            to="/game-history"
            className="group bg-gradient-to-r from-blue-500/80 to-cyan-600/80 backdrop-blur-lg rounded-2xl p-6 text-center hover:from-blue-600/80 hover:to-cyan-700/80 transition-all transform hover:scale-105 border border-blue-400/30"
          >
            <FaChartLine className="text-4xl text-white mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="text-xl font-bold text-white mb-2">History</h4>
            <p className="text-blue-100">View game history</p>
          </Link>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
      </div>
    </>
  );
}

// Export ฟังก์ชันสำหรับบันทึกคะแนน Quiz เพื่อใช้ในหน้าอื่น
export const saveQuizScoreToFirebase = async (quizData) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('No user logged in');
      return;
    }

    const quizScore = {
      userId: user.uid,
      userEmail: user.email,
      quizType: quizData.type || 'general',
      score: quizData.score || 0,
      totalQuestions: quizData.totalQuestions || 0,
      correctAnswers: quizData.correctAnswers || 0,
      timeSpent: quizData.timeSpent || 0,
      difficulty: quizData.difficulty || 'medium',
      createdAt: serverTimestamp(),
      timestamp: new Date()
    };

    const docRef = await addDoc(collection(firestore, 'quizScores'), quizScore);
    console.log('Quiz score saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving quiz score:', error);
    throw error;
  }
};
