import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../firebase/firebase';
import GameHeader from '../../components/common/GameHeader';
import { 
  FaHistory, 
  FaClock, 
  FaGamepad,
  FaBrain,
  FaUsers,
  FaUser,
  FaSyncAlt,
  FaFilter,
  FaCalendarAlt,
  FaCrown,
  FaTrophy,
  FaAward
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { getAllEarnedNicknames } from '../../constants/nicknames';

const GameHistoryPage = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { quizHistory: contextQuizHistory, fetchQuizHistory, fetchProfile } = useUserProfile();
  const [soloHistory, setSoloHistory] = useState([]);
  const [multiplayerHistory, setMultiplayerHistory] = useState([]);
  const [userNicknames, setUserNicknames] = useState([]);
  const [localQuizHistory, setLocalQuizHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [hasLoaded, setHasLoaded] = useState(false);
  // Add stats for all games
  const [totalSoloGames, setTotalSoloGames] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  // Add Multiplayer stats
  const [totalMultiplayerGames, setTotalMultiplayerGames] = useState(0);
  const [bestMultiplayerPosition, setBestMultiplayerPosition] = useState(0);
  const navigate = useNavigate();

  // Use local quiz history if available, otherwise use context
  const quizHistory = localQuizHistory || contextQuizHistory;

  // Manual refresh function - separate from loadAllData to avoid circular dependency
  const handleRefresh = useCallback(async () => {
    setHasLoaded(false);
    setLoading(true);
    
    if (!currentUser?.uid) return;
    
    try {
      // Fetch solo history for display (limited to recent 20)
      const historyQuery = query(
        collection(firestore, 'gameHistory'),
        where('userId', '==', currentUser.uid),
        where('gameType', '==', 'solo'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(historyQuery);
      const soloGames = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        soloGames.push({
          id: doc.id,
          type: 'solo',
          date: data.date || data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          result: data.result,
          score: data.score || 0,
          profit: data.profit || 0,
          profitPercentage: data.profitPercentage || 0,
          finalBalance: data.finalBalance || 0,
          difficulty: data.difficulty || 'medium',
          duration: data.timeUsed || 0,
          totalTrades: data.totalTrades || 0,
          missions: data.missions || [],
          completedMissions: data.completedMissions || 0,
          totalMissions: data.totalMissions || 0,
          completionRate: data.completionRate || 0,
          winStreak: data.winStreak || 0,
          newRecord: data.newRecord || false,
          market: data.market || data.stockMarket || 'SET',
          stockSymbol: data.stockSymbol || data.symbol || '',
          strategy: data.strategy || '',
          gameMode: data.gameMode || 'normal'
        });
      });
      setSoloHistory(soloGames);

      // Fetch multiplayer history for display (limited to recent 20)
      const multiplayerQuery = query(
        collection(firestore, 'gameHistory'),
        where('userId', '==', currentUser.uid),
        where('gameType', '==', 'multiplayer'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const multiplayerSnapshot = await getDocs(multiplayerQuery);
      const multiplayerGames = [];
      multiplayerSnapshot.forEach(doc => {
        const data = doc.data();
        multiplayerGames.push({
          id: doc.id,
          type: 'multiplayer',
          date: data.date || data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          result: data.result,
          score: data.score || 0,
          profit: data.profit || 0,
          profitPercentage: data.profitPercentage || 0,
          finalBalance: data.finalBalance || data.totalValue || 1000000,
          finalPosition: data.finalPosition || 0,
          totalPlayers: data.totalPlayers || 0,
          roomCode: data.roomCode || '',
          duration: data.duration || 300,
          market: data.market || 'SET',
          symbol: data.symbol || data.stockSymbol || 'Unknown',
          difficulty: data.difficulty || 'medium',
          gameMode: data.gameMode || 'multiplayer',
          winnerName: data.winnerName || 'Unknown'
        });
      });
      setMultiplayerHistory(multiplayerGames);
      
      // Fetch ALL solo games for accurate statistics (no limit)
      const allGamesQuery = query(
        collection(firestore, 'gameHistory'),
        where('userId', '==', currentUser.uid),
        where('gameType', '==', 'solo')
      );
      const allGamesSnapshot = await getDocs(allGamesQuery);
      let totalGames = 0;
      let totalWinCount = 0;
      
      allGamesSnapshot.forEach(doc => {
        const data = doc.data();
        totalGames++;
        // Count wins based on result or profit
        if (data.result === 'win' || (data.profit && data.profit > 0)) {
          totalWinCount++;
        }
      });
      
      setTotalSoloGames(totalGames);
      setTotalWins(totalWinCount);

      // Fetch ALL multiplayer games for accurate statistics (no limit)
      const allMultiplayerGamesQuery = query(
        collection(firestore, 'gameHistory'),
        where('userId', '==', currentUser.uid),
        where('gameType', '==', 'multiplayer')
      );
      const allMultiplayerSnapshot = await getDocs(allMultiplayerGamesQuery);
      let totalMultiplayerCount = 0;
      let bestPosition = 0;
      
      allMultiplayerSnapshot.forEach(doc => {
        const data = doc.data();
        totalMultiplayerCount++;
        const position = data.finalPosition || 0;
        if (bestPosition === 0 || (position > 0 && position < bestPosition)) {
          bestPosition = position;
        }
      });
      
      setTotalMultiplayerGames(totalMultiplayerCount);
      setBestMultiplayerPosition(bestPosition);
      
      // Fetch quiz history if available
      if (fetchQuizHistory) {
        try {
          await fetchQuizHistory(currentUser.uid);
        } catch (error) {
          console.error('❌ Error fetching quiz history:', error);
        }
      }
      
      // Debug: Log quiz history state
      // Fetch user profile for nicknames
      if (fetchProfile) {
        try {
          await fetchProfile(currentUser.uid);
        } catch (error) {
          console.error('❌ Error fetching profile:', error);
        }
      }
      
      // Fetch user nicknames from Firestore
      try {
        const userRef = doc(firestore, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const completedLevels = userData.soloCompletedLevels || [];
          const earnedNicknames = getAllEarnedNicknames(completedLevels);
          setUserNicknames(earnedNicknames);
          
          // If quiz data exists in Firestore but not in context, use Firestore data
          if (!quizHistory && (userData.quizHistory || userData.assessmentQuiz || userData.levelAssessment)) {
            const firestoreQuizData = {
              bestScore: userData.quizHistory?.bestScore || userData.assessmentQuiz?.score || 0,
              userLevel: userData.userLevel || userData.assessmentQuiz?.level || 'easy',
              totalQuizzes: userData.quizHistory?.totalQuizzes || (userData.assessmentQuiz ? 1 : 0),
              levelAssessmentDone: userData.completedAssessment || userData.levelAssessment?.completed || false,
              averageScore: userData.quizHistory?.averageScore || userData.assessmentQuiz?.score || 0
            };
            setLocalQuizHistory(firestoreQuizData);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching user nicknames:', error);
      }
      
      setHasLoaded(true);
    } catch (error) {
      console.error('❌ Error loading game history:', error);
      setSoloHistory([]);
      setMultiplayerHistory([]);
      setTotalSoloGames(0);
      setTotalWins(0);
      setTotalMultiplayerGames(0);
      setBestMultiplayerPosition(0);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, fetchQuizHistory, fetchProfile, quizHistory]);

  // Debug user authentication
  useEffect(() => {
    // Only redirect if auth is not loading and no user
    if (!authLoading && !currentUser) {
      navigate('/login');
      return;
    }
  }, [currentUser, authLoading, navigate]);

  // Load data only once - Fixed infinite loop BUT allow refresh when user navigates back
  useEffect(() => {
    if (currentUser?.uid && !hasLoaded) {
      handleRefresh();
    }
  }, [currentUser?.uid, hasLoaded, handleRefresh]);

  // Auto-refresh when component becomes visible (user navigates back to this page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser?.uid) {
        handleRefresh();
      }
    };

    const handleFocus = () => {
      if (currentUser?.uid) {
        handleRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser?.uid, handleRefresh]);

  // Check if still loading authentication
  if (authLoading) {
    return (
      <>
        <GameHeader showBackButton={true} backPath="/account" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-white mt-4">Verifying login...</p>
          </div>
        </div>
      </>
    );
  }

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Get all activities combined and sorted
  const getAllActivities = () => {
    const activities = [];
    
    // Add solo games
    soloHistory.forEach(game => {
      activities.push({
        ...game,
        type: 'solo',
        category: 'Game'
      });
    });
    
    // Add multiplayer games
    multiplayerHistory.forEach(game => {
      activities.push({
        ...game,
        type: 'multiplayer',
        category: 'game'
      });
    });
    
    // Quiz activities are not displayed in the activity list as they are already shown in the statistics above
    
    // Filter by type
    let filteredActivities = activities;
    if (filterType !== 'all') {
      filteredActivities = activities.filter(activity => activity.type === filterType);
    }
    
    // Sort activities
    filteredActivities.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'score') {
        return (b.score || 0) - (a.score || 0);
      } else if (sortBy === 'type') {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });
    
    return filteredActivities;
  };

  const getActivityIcon = (type, isWin, isLose) => {
    const baseIconClass = isWin ? 'text-yellow-300' : isLose ? 'text-purple-300' : 'text-gray-400';
    
    switch (type) {
      case 'solo':
        return <FaUser className={`${baseIconClass}`} />;
      case 'multiplayer':
        return <FaUsers className={`${baseIconClass}`} />;
      case 'quiz':
        return <FaBrain className={`${baseIconClass}`} />;
      default:
        return <FaGamepad className={`${baseIconClass}`} />;
    }
  };

  const getResultColor = (result, profit = 0) => {
    if (result === 'win' || profit > 0) return 'text-yellow-400';
    if (result === 'lose' || profit < 0) return 'text-purple-400';
    return 'text-gray-400';
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/40 text-green-300 border-green-400/60';
      case 'medium':
        return 'bg-yellow-500/40 text-yellow-300 border-yellow-400/60';
      case 'hard':
        return 'bg-red-500/40 text-red-300 border-red-400/60';
      case 'expert':
        return 'bg-purple-500/40 text-purple-300 border-purple-400/60';
      default:
        return 'bg-gray-500/40 text-gray-300 border-gray-400/60';
    }
  };

  const getDifficultyText = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'Easy';
      case 'medium':
        return 'Medium';
      case 'hard':
        return 'Hard';
      case 'expert':
        return 'Expert';
      default:
        return difficulty || 'Not specified';
    }
  };

  const getMarketText = (market) => {
    switch (market) {
      case 'SET':
        return 'Stock Exchange of Thailand (SET)';
      case 'TFEX':
        return 'Derivatives Market (TFEX)';
      case 'mai':
        return 'Mai Market';
      case 'US':
        return 'US stock market';
      case 'crypto':
        return 'Crypto market';
      default:
        return market || 'Thai stock market';
    }
  };

  const getIconBackgroundClass = (activity) => {
    const isWin = activity.result === 'win' || (activity.profit && activity.profit > 0);
    const isLose = activity.result === 'lose' || (activity.profit && activity.profit < 0);
    
    if (isWin) {
      return 'bg-yellow-500/40 group-hover:bg-yellow-500/60 border border-yellow-400/30';
    } else if (isLose) {
      return 'bg-purple-500/40 group-hover:bg-purple-500/60 border border-purple-400/30';
    } else {
      return 'bg-gray-700/50 group-hover:bg-gray-600/50';
    }
  };

  const getCardColorClass = (activity) => {
    const isWin = activity.result === 'win' || (activity.profit && activity.profit > 0);
    const isLose = activity.result === 'lose' || (activity.profit && activity.profit < 0);
    
    if (isWin) {
      return 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/25 border-yellow-400/60 hover:from-yellow-500/40 hover:to-yellow-600/35 hover:border-yellow-300/80';
    } else if (isLose) {
      return 'bg-gradient-to-br from-purple-500/30 to-purple-600/25 border-purple-400/60 hover:from-purple-500/40 hover:to-purple-600/35 hover:border-purple-300/80';
    } else {
      return 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600/50';
    }
  };

  const allActivities = getAllActivities();

  return (
    <>
      <GameHeader showBackButton={true} backPath="/account" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <FaHistory className="text-3xl text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Game History</h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="solo">Solo Challenge</option>
                  <option value="multiplayer">Multiplayer</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Order:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="date">Date</option>
                  <option value="score">Score</option>
                  <option value="type">Type</option>
                </select>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
            >
              <FaSyncAlt className={`${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Updating...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Solo Games Card */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <FaUser className="text-2xl text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Solo Games</h3>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-extrabold text-white drop-shadow-lg">{totalSoloGames}</div>
              <div className="text-blue-300 text-sm font-semibold">Games played</div>
              {soloHistory.length > 0 && (
                <div className="text-xs text-blue-200 font-medium">
                  Latest: {getDifficultyText(soloHistory[0]?.difficulty)}
                </div>
              )}
            </div>
          </div>

          {/* Quiz Stats Card */}
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <FaBrain className="text-2xl text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Quiz</h3>
            </div>
            <div className="space-y-2">
              {quizHistory && (quizHistory.bestScore !== undefined && quizHistory.bestScore !== null) ? (
                <>
                  <div className="text-4xl font-extrabold text-white drop-shadow-lg">
                    {quizHistory.bestScore === 0 ? '0' : `${Math.round((quizHistory.bestScore || 0) * 100)}%`}
                  </div>
                  <div className="text-purple-300 text-sm font-semibold">
                    {quizHistory.bestScore === 0 ? '0/246 points' : 'points'}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-extrabold text-white drop-shadow-lg">0</div>
                  <div className="text-purple-300 text-sm font-semibold">0/246 points</div>
                </>
              )}
            </div>
          </div>

          {/* Multiplayer Stats Card */}
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <FaUsers className="text-2xl text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Multiplayer</h3>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-extrabold text-white drop-shadow-lg">{totalMultiplayerGames}</div>
              <div className="text-orange-300 text-sm font-semibold">Games played</div>
              <div className="text-xs text-orange-200 font-medium">
                {bestMultiplayerPosition > 0 ? 
                  `Best: #${bestMultiplayerPosition}` : 
                  totalMultiplayerGames > 0 ? 'Best: Not ranked' : 'No games yet'
                }
              </div>
            </div>
          </div>

          {/* Nicknames Card */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <FaCrown className="text-2xl text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Nicknames</h3>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-extrabold text-white drop-shadow-lg">{userNicknames.length}</div>
              <div className="text-yellow-300 text-sm font-semibold">Earned Nicknames</div>
              {userNicknames.length > 0 && (
                <div className="text-xs text-yellow-200 font-medium">
                  Latest: {userNicknames[userNicknames.length - 1]?.nickname}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Win Rate Card - Move to second row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <FaTrophy className="text-2xl text-green-400" />
              <h3 className="text-lg font-semibold text-white">Win Rate</h3>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-extrabold text-white drop-shadow-lg">
                {totalSoloGames > 0 ? 
                  Math.round((totalWins / totalSoloGames) * 100) : 0}%
              </div>
              <div className="text-green-300 text-sm font-semibold">Wins {totalWins}/{totalSoloGames}</div>
            </div>
          </div>
        </div>

        {/* Earned Nicknames Section */}
        {userNicknames.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FaAward className="text-2xl text-yellow-400" />
              <h2 className="text-xl font-bold text-white">Earned Nicknames</h2>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-medium">
                {userNicknames.length} nicknames
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userNicknames.map((nickname, index) => (
                <div key={`nickname-${nickname.id || index}-${nickname.nickname}`} className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-600/30 rounded-lg p-4 hover:border-yellow-500/40 transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{nickname.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-yellow-300">{nickname.nickname}</h3>
                      <p className="text-sm text-gray-400">{nickname.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-1 rounded-full font-medium ${
                      nickname.rarity === 'legendary' ? 'bg-purple-500/20 text-purple-300' :
                      nickname.rarity === 'epic' ? 'bg-orange-500/20 text-orange-300' :
                      nickname.rarity === 'rare' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {nickname.rarity === 'legendary' ? 'Legendary' :
                       nickname.rarity === 'epic' ? 'Epic' :
                       nickname.rarity === 'rare' ? 'Rare' : 'Common'}
                    </span>
                    <span className="text-gray-500">
                      Level {nickname.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activities List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white">Loading play history...</p>
          </div>
        ) : allActivities.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <FaCalendarAlt className="text-blue-400" />
              <h2 className="text-xl font-bold text-white">Recent activities</h2>
              <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                {allActivities.length} Activities
              </div>
              {allActivities.length > 0 && (
                <div className="bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-sm">
                  Latest: {formatDate(allActivities[0].date)}
                </div>
              )}
            </div>
            
            {allActivities.map((activity, index) => (
              <div key={activity.id || index} className={`backdrop-blur-sm rounded-xl p-6 transition-all cursor-pointer group border ${getCardColorClass(activity)}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${getIconBackgroundClass(activity)}`}>
                      {getActivityIcon(
                        activity.type, 
                        activity.result === 'win' || (activity.profit && activity.profit > 0),
                        activity.result === 'lose' || (activity.profit && activity.profit < 0)
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {activity.type === 'solo' ? 'Solo Challenge' : 'Multiplayer'}
                        </h3>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getDifficultyColor(activity.difficulty)}`}>
                          Level {getDifficultyText(activity.difficulty)}
                        </span>
                        {activity.type === 'solo' && activity.market && (
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-500/40 text-blue-300 border border-blue-400/60">
                            Market: {getMarketText(activity.market)}
                          </span>
                        )}
                        {activity.type === 'multiplayer' && activity.market && (
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-500/40 text-blue-300 border border-blue-400/60">
                            Market: {getMarketText(activity.market)}
                          </span>
                        )}
                        {activity.type === 'multiplayer' && activity.symbol && (
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-500/40 text-green-300 border border-green-400/60">
                            Symbol: {activity.symbol}
                          </span>
                        )}
                        {activity.type === 'multiplayer' && activity.finalPosition && (
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                            activity.finalPosition === 1 ? 'bg-yellow-500/40 text-yellow-300 border-yellow-400/60' :
                            activity.finalPosition <= 3 ? 'bg-orange-500/40 text-orange-300 border-orange-400/60' :
                            'bg-gray-500/40 text-gray-300 border-gray-400/60'
                          }`}>
                            Position: #{activity.finalPosition}/{activity.totalPlayers || 0}
                          </span>
                        )}
                        {activity.type === 'multiplayer' && activity.roomCode && (
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-purple-500/40 text-purple-300 border border-purple-400/60">
                            Room: {activity.roomCode}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          <FaClock className="text-gray-400" />
                          <span>{formatDate(activity.date)}</span>
                        </div>
                        
                        {activity.duration && (
                          <div className="flex items-center gap-1">
                            <span>⏱️ Time: {Math.round(activity.duration / 60)} minutes</span>
                          </div>
                        )}

                        {activity.type === 'solo' && activity.totalTrades !== undefined && (
                          <div className="flex items-center gap-1">
                            <span>📊 Trades: {activity.totalTrades} times</span>
                          </div>
                        )}

                        {activity.type === 'solo' && activity.completedMissions !== undefined && (
                          <div className="flex items-center gap-1">
                            <span>🎯 Missions: {activity.completedMissions}/{activity.totalMissions || 0}</span>
                          </div>
                        )}

                        {activity.stockSymbol && (
                          <div className="flex items-center gap-1">
                            <span>📈 Volume: {activity.stockSymbol}</span>
                          </div>
                        )}

                        {activity.type === 'solo' && activity.winStreak > 0 && (
                          <div className="flex items-center gap-1">
                            <span>🔥 Win Streak: {activity.winStreak} times</span>
                          </div>
                        )}

                        {activity.type === 'multiplayer' && activity.finalPosition && (
                          <div className="flex items-center gap-1">
                            <span>🏆 Finished: #{activity.finalPosition} out of {activity.totalPlayers || 0} players</span>
                          </div>
                        )}

                        {activity.type === 'multiplayer' && activity.roomCode && (
                          <div className="flex items-center gap-1">
                            <span>🏠 Room Code: {activity.roomCode}</span>
                          </div>
                        )}
                      </div>

                      {/* Additional details section */}
                      {(activity.completionRate > 0 || activity.strategy || activity.finalBalance || activity.type === 'multiplayer') && (
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300 mt-2 pt-2 border-t border-gray-600/50">
                          {activity.completionRate > 0 && (
                            <span className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${
                                activity.result === 'win' || (activity.profit && activity.profit > 0) 
                                  ? 'bg-yellow-300' : 'bg-green-300'
                              }`}></span>
                              Completion Rate: {activity.completionRate.toFixed(1)}%
                            </span>
                          )}
                          {activity.strategy && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-blue-300 rounded-full"></span>
                              Strategy: {activity.strategy}
                            </span>
                          )}
                          {activity.type === 'multiplayer' && activity.winnerName && (
                            <span className="flex items-center gap-1 text-yellow-300 font-medium">
                              <span className="w-2 h-2 bg-yellow-300 rounded-full"></span>
                              🏆 Winner: {activity.winnerName}
                            </span>
                          )}
                          {activity.type === 'multiplayer' && activity.duration && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-orange-300 rounded-full"></span>
                              ⌛ Game Duration: {Math.round(activity.duration / 60)} min
                            </span>
                          )}
                          {activity.type === 'multiplayer' && activity.market && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-blue-300 rounded-full"></span>
                              📊 Market: {getMarketText(activity.market)}
                            </span>
                          )}
                          {activity.type === 'multiplayer' && activity.symbol && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-green-300 rounded-full"></span>
                              🎯 Symbol: {activity.symbol}
                            </span>
                          )}
                          {activity.newRecord && (
                            <span className="flex items-center gap-1 text-yellow-300 font-medium">
                              <span className="w-2 h-2 bg-yellow-300 rounded-full"></span>
                              🏆 New Record!
                            </span>
                          )}
                          {activity.finalBalance && activity.type === 'solo' && (
                            <span className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${
                                activity.result === 'win' || (activity.profit && activity.profit > 0) 
                                  ? 'bg-yellow-300' : 'bg-purple-300'
                              }`}></span>
                              Final Capital: ฿{activity.finalBalance.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}


                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {activity.profit !== undefined && (
                      <div className="text-right min-w-[120px]">
                        <div className={`text-xl font-extrabold ${getResultColor(activity.result, activity.profit)} drop-shadow-lg`}>
                          {activity.profit >= 0 ? '+' : ''}฿{activity.profit.toLocaleString()}
                        </div>
                        {activity.profitPercentage !== undefined && (
                          <div className="text-sm font-semibold text-gray-300">
                            ({activity.profitPercentage.toFixed(2)}%)
                          </div>
                        )}
                        {(activity.finalBalance || activity.type === 'multiplayer') && (
                          <div className="text-sm font-bold text-white bg-gray-700/60 px-2 py-1 rounded-md mt-1">
                            Total: ฿{(activity.finalBalance || 1000000).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {activity.score !== undefined && activity.profit === undefined && (
                      <div className="text-right min-w-[120px]">
                        <div className={`text-xl font-extrabold ${getResultColor(activity.result)} drop-shadow-lg`}>
                          {activity.score} score
                        </div>
                        <div className="text-sm font-semibold text-gray-300">
                          {activity.result === 'win' ? 'pass' : activity.result === 'lose' ? 'fail' : 'complete'}
                        </div>
                      </div>
                    )}
                    
                    {/* Status indicator with tooltip */}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        activity.result === 'win' || (activity.profit && activity.profit > 0) 
                          ? 'bg-yellow-400 border-yellow-300 shadow-lg shadow-yellow-400/60' 
                          : activity.result === 'lose' || (activity.profit && activity.profit < 0)
                          ? 'bg-purple-400 border-purple-300 shadow-lg shadow-purple-400/60'
                          : 'bg-gray-400 border-gray-300'
                      }`}></div>
                      <div className={`text-xs font-bold ${
                        activity.result === 'win' || (activity.profit && activity.profit > 0) 
                          ? 'text-yellow-300' 
                          : activity.result === 'lose' || (activity.profit && activity.profit < 0)
                          ? 'text-purple-300'
                          : 'text-gray-400'
                      }`}>
                        {activity.result === 'win' || (activity.profit && activity.profit > 0) ? 'win' : 
                         activity.result === 'lose' || (activity.profit && activity.profit < 0) ? 'lose' : 'draw'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaHistory className="text-4xl text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No gaming history</h3>
            <p className="text-gray-400 mb-6">Start playing games or taking quizzes to build your history</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/solo')}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <FaUser />
                Play Solo Challenge
              </button>
              
              <button
                onClick={() => navigate('/quiz')}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <FaBrain />
                Take the quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GameHistoryPage;