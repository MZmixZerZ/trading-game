import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Medal, Award, Crown, Star, Home, Users } from 'lucide-react';
import { FaTrophy } from 'react-icons/fa';
import { useMultiplayer } from '../../contexts/MultiplayerContext';
import { useAuth } from '../../contexts/AuthContext';
import { checkAchievementsAfterGame } from '../../utils/achievementSystem';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

const MultiplayerResultsModal = ({ 
  isOpen, 
  onClose, // eslint-disable-line no-unused-vars
  players = [], // Use as fallback only
  onBackToHome,
  roomCode,
  actualGameDuration = 0 // Receive actual time from parent
}) => {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [hasDataSaved, setHasDataSaved] = useState(false);

  // Use data from MultiplayerContext like RoomLeaderboard
  const { players: contextPlayers, currentRoom } = useMultiplayer();
  const { currentUser } = useAuth();

  // Use context data first, fallback to props
  const activePlayers = contextPlayers && contextPlayers.length > 0 ? contextPlayers : players;

  // Function to save Multiplayer game data via API
  const saveMultiplayerGameToFirebase = useCallback(async (playerData, finalPosition, totalPlayers, winnerName) => {
    try {
      if (!currentUser) {
        console.log('❌ No user logged in, cannot save data');
        return;
      }

      const payload = {
        userId: currentUser.uid,
        playerName: currentUser.displayName || 'Player',
        gameType: 'multiplayer',
        roomCode: roomCode || 'unknown',
        result: finalPosition === 1 ? 'win' : finalPosition <= 3 ? 'top3' : 'lose',
        score: Math.max(0, Math.round(playerData.profit || 0)),
        profit: playerData.profit || 0,
        profitPercentage: playerData.profitPercentage || 0,
        finalBalance: playerData.totalValue || 1000000,
        difficulty: currentRoom?.difficulty || currentRoom?.level || 'medium',
        market: currentRoom?.market || currentRoom?.selectedMarket || 'SET',
        symbol: currentRoom?.symbol || currentRoom?.stockSymbol || currentRoom?.selectedSymbol || 'Unknown',
        duration: playerData.actualGameDuration || currentRoom?.gameDuration || currentRoom?.duration || currentRoom?.timeLimit || 300,
        gameMode: 'multiplayer',
        data: { finalPosition, totalPlayers, winnerName: winnerName || 'Unknown' }
      };

      const res = await fetch(`${API_BASE_URL}/api/game-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      console.log('✅ Successfully saved Multiplayer game data:', result.id);
      return result.id;
    } catch (error) {
      console.error('❌ Error saving Multiplayer game data:', error);
    }
  }, [roomCode, currentRoom, currentUser]);

  // Animation phases should depend only on isOpen to avoid constant resets
  useEffect(() => {
    if (!isOpen) return;

    console.log('🏆 MultiplayerResultsModal opened with players data:', {
      contextPlayers: contextPlayers?.length || 0,
      propsPlayers: players?.length || 0,
      activePlayers: activePlayers?.length || 0,
      currentRoom: currentRoom
    });

    setAnimationPhase(0);
    const timer1 = setTimeout(() => setAnimationPhase(1), 500);
    const timer2 = setTimeout(() => setAnimationPhase(2), 1000);
    const timer3 = setTimeout(() => setAnimationPhase(3), 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isOpen, contextPlayers?.length, players?.length, activePlayers?.length, currentRoom]);

  // Save game data after animations – do not reset animations on player list changes
  useEffect(() => {
    if (!isOpen || hasDataSaved) return;

    const saveTimer = setTimeout(async () => {
      if (activePlayers && activePlayers.length > 0 && currentUser) {
        const sortedPlayers = [...activePlayers].sort((a, b) => {
          const totalValueA = a.totalValue || 1000000;
          const totalValueB = b.totalValue || 1000000;
          return totalValueB - totalValueA;
        });

        const currentPlayer = sortedPlayers.find(player =>
          player.uid === currentUser.uid || player.id === currentUser.uid
        );

        if (currentPlayer) {
          const finalPosition = sortedPlayers.findIndex(player =>
            player.uid === currentUser.uid || player.id === currentUser.uid
          ) + 1;

          const playerData = {
            totalValue: currentPlayer.totalValue || 1000000,
            profit: (currentPlayer.totalValue || 1000000) - 1000000,
            profitPercentage: ((currentPlayer.totalValue || 1000000) - 1000000) / 1000000 * 100,
            actualGameDuration: actualGameDuration
          };

          // Find winner name
          const winnerName = sortedPlayers.length > 0 ? 
            (sortedPlayers[0].displayName || sortedPlayers[0].name || 'Unknown') : 'Unknown';

          await saveMultiplayerGameToFirebase(playerData, finalPosition, sortedPlayers.length, winnerName);

          // Check new achievements after game ends
          if (currentUser) {
            try {
              const newAchievements = await checkAchievementsAfterGame(currentUser.uid);
              if (newAchievements.length > 0) {
                console.log('🏆 New achievements unlocked in multiplayer:', newAchievements.map(a => a.name).join(', '));
              }
            } catch (error) {
              console.error('Error checking achievements:', error);
            }
          }

          setHasDataSaved(true);
          console.log('💾 Multiplayer game data saved successfully');
        }
      }
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [isOpen, hasDataSaved, activePlayers, currentUser, saveMultiplayerGameToFirebase, currentRoom, actualGameDuration]);

  // Reset hasDataSaved when modal is closed
  useEffect(() => {
    if (!isOpen && hasDataSaved) {
      setHasDataSaved(false);
    }
  }, [isOpen, hasDataSaved]);

  if (!isOpen) return null;

  // Sort players by total value (profit) - use activePlayers instead of players
  const sortedPlayers = [...activePlayers].sort((a, b) => {
    const totalValueA = a.totalValue || 1000000;
    const totalValueB = b.totalValue || 1000000;
    return totalValueB - totalValueA;
  });

  // Use data from server directly - do not recalculate
  const playersWithProfits = sortedPlayers.map(player => {
    console.log('🧮 Processing player for results:', player);
    
    // Use server data directly without recalculation - same as RoomLeaderboard
    const totalValue = player.totalValue || 1000000;
    const profit = totalValue - 1000000;
    const profitPercentage = (profit / 1000000) * 100;
    
    console.log('📊 Using server data for:', player.displayName || player.name, {
      totalValue: player.totalValue,
      balance: player.balance,
      position: player.position,
      calculatedProfit: profit,
      calculatedProfitPercentage: profitPercentage
    });
    
    return {
      ...player,
      profit,
      profitPercentage,
      totalValue,
      displayName: player.displayName || player.name,
      uid: player.uid || player.id
    };
  });

  const top3 = playersWithProfits.slice(0, 3);
  const remaining = playersWithProfits.slice(3);

  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Math.round(Math.abs(num)).toLocaleString();
  };

  const formatPercentage = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0%';
    return `${Math.round(Math.abs(num) * 10) / 10}%`;
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Crown className="text-yellow-400" size={24} />;
      case 2: return <Medal className="text-gray-300" size={24} />;
      case 3: return <Award className="text-orange-500" size={24} />;
      default: return <Trophy className="text-blue-400" size={20} />;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'from-yellow-500/20 to-yellow-600/30 border-yellow-400/40 shadow-yellow-500/20';
      case 2: return 'from-slate-500/20 to-slate-600/30 border-slate-400/40 shadow-slate-500/20';
      case 3: return 'from-orange-500/20 to-orange-600/30 border-orange-400/40 shadow-orange-500/20';
      default: return 'from-slate-600/20 to-slate-700/30 border-slate-500/40 shadow-slate-500/20';
    }
  };

  const getCardHeight = (rank) => {
    // Make all cards the same height for visual consistency
    return 'h-48';
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-3xl border border-gray-600/30 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="relative p-6 text-center border-b border-gray-600/30">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse pointer-events-none z-0"></div>
          
          <div className={`relative z-10 inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transform transition-all duration-1000 ${
            animationPhase >= 1 ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
          } bg-gradient-to-br from-purple-500 to-blue-600`}>
            <FaTrophy className="text-2xl text-white" />
          </div>

          <h1 className={`relative z-10 text-3xl font-bold mb-2 transform transition-all duration-1000 delay-300 ${
            animationPhase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          } text-white`}>
            Multiplayer Results
          </h1>
          
          <p className={`relative z-10 text-gray-300 transform transition-all duration-1000 delay-500 ${
            animationPhase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}>
            Room: {roomCode} • {playersWithProfits.length} Players
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          
          {/* Top 3 Players - Cards Layout */}
          {top3.length > 0 && (
            <div className={`mb-8 transform transition-all duration-1000 delay-700 ${
              animationPhase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Star className="text-yellow-400" />
                Top 3 Players
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {top3.map((player, index) => {
                  const rank = index + 1;
                  return (
                    <div
                      key={player.uid || player.id || index}
                      className={`bg-gradient-to-br ${getRankColor(rank)} backdrop-blur-sm border rounded-2xl p-6 text-center transform transition-all duration-500 hover:scale-105 ${getCardHeight(rank)} shadow-lg`}
                      style={{ animationDelay: `${index * 200}ms` }}
                    >
                      {/* Rank Icon */}
                      <div className="flex justify-center mb-4">
                        {getRankIcon(rank)}
                      </div>
                      
                      {/* Rank Number */}
                      <div className={`text-xl font-bold mb-3 ${
                        rank === 1 ? 'text-yellow-300' :
                        rank === 2 ? 'text-slate-200' :
                        'text-orange-300'
                      }`}>
                        #{rank}
                      </div>
                      
                      {/* Player Name */}
                      <div className="text-white font-bold text-base mb-3 truncate">
                        {player.displayName || player.name || 'Player'}
                      </div>
                      
                      {/* Profit */}
                      <div className={`text-base font-bold mb-2 drop-shadow-lg ${
                        player.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}>
                        {player.profit >= 0 ? '+' : ''}฿{formatNumber(player.profit)}
                      </div>
                      
                      {/* Percentage */}
                      <div className={`text-sm font-semibold drop-shadow-md ${
                        player.profit >= 0 ? 'text-emerald-200' : 'text-rose-200'
                      }`}>
                        {player.profit >= 0 ? '+' : ''}{formatPercentage(player.profitPercentage)}
                      </div>
                      
                      {/* Total Value */}
                      <div className="text-xs text-slate-200 mt-3 font-medium drop-shadow-sm">
                        Total: ฿{formatNumber(player.totalValue)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Remaining Players - Panel Layout */}
          {remaining.length > 0 && (
            <div className={`mb-6 transform transition-all duration-1000 delay-1000 ${
              animationPhase >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Users className="text-blue-400" />
                Other Players
              </h2>
              
              <div className="space-y-2">
                {remaining.map((player, index) => {
                  const rank = index + 4; // Start from 4th place
                  return (
                    <div
                      key={player.uid || player.id || index}
                      className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-700/70 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">#{rank}</span>
                        </div>
                        
                        {/* Player Info */}
                        <div>
                          <div className="text-white font-semibold">
                            {player.displayName || player.name || 'Player'}
                          </div>
                          <div className="text-xs text-gray-400">
                            Total: ฿{formatNumber(player.totalValue)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Profit */}
                      <div className="text-right">
                        <div className={`font-bold ${
                          player.profit >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {player.profit >= 0 ? '+' : ''}฿{formatNumber(player.profit)}
                        </div>
                        <div className={`text-xs ${
                          player.profit >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {player.profit >= 0 ? '+' : ''}{formatPercentage(player.profitPercentage)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Players */}
          {playersWithProfits.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto text-3xl mb-2 opacity-50" size={48} />
              <p className="text-lg">No players found</p>
            </div>
          )}

          {/* Action Button */}
          <div className={`flex justify-center mt-8 transform transition-all duration-1000 delay-1200 ${
            animationPhase >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            <button
              onClick={onBackToHome}
              className="w-full max-w-md bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 rounded-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Home size={20} />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerResultsModal;
