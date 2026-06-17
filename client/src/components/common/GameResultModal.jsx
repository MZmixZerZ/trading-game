import React, { useState, useEffect } from 'react';
import { FaTrophy, FaCoins, FaChartLine, FaRedo, FaHome, FaStar, FaFire, FaCrown, FaCheckCircle, FaTimes, FaBullseye } from 'react-icons/fa';
import { BiTrendingDown } from 'react-icons/bi';

// Number formatting utilities
const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Math.round(num).toLocaleString();
};

const formatPercentage = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0%';
  return `${Math.round(num * 10) / 10}%`;
};

const GameResultModal = ({ 
  isOpen, 
  onClose, 
  result, 
  onPlayAgain, 
  onBackToHome 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setAnimationPhase(0);
      const timer1 = setTimeout(() => setAnimationPhase(1), 500);
      const timer2 = setTimeout(() => setAnimationPhase(2), 1000);
      const timer3 = setTimeout(() => setShowDetails(true), 1500);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen]);

  if (!isOpen || !result) return null;

  const {
    won,
    totalReturn,
    returnPercentage,
    finalBalance,
    targetProfit,
    timeUsed,
    trades,
    winStreak,
    newRecord,
    // New mission-based props
    missions = null,
    victoryType = 'profit-based'
  } = result;

  // Create missionResults object from result data
  const missionResults = missions ? {
    missions: missions.map(mission => ({
      id: mission.id,
      description: mission.title,
      completed: mission.showAsFailed ? false : (mission.current / mission.target) >= 1,
      score: mission.showAsFailed ? 0 : ((mission.current / mission.target) * mission.weight),
      maxScore: mission.weight,
      progress: mission.showAsFailed ? 0 : Math.min(mission.current / mission.target, 1),
      showAsFailed: mission.showAsFailed || false
    })),
    totalScore: missions.reduce((total, mission) => {
      const progress = Math.min(mission.current / mission.target, 1);
      return total + (progress * mission.weight);
    }, 0),
    completionRate: (missions.filter(m => (m.current / m.target) >= 1).length / missions.length) * 100,
    scoreRate: missions.reduce((total, mission) => {
      const progress = Math.min(mission.current / mission.target, 1);
      return total + (progress * mission.weight);
    }, 0) / missions.reduce((total, mission) => total + mission.weight, 0)
  } : null;

  // Mission display helpers
  const getMissionCompletionStats = () => {
    if (!missionResults || !missionResults.missions) return null;
    
    const completed = missionResults.missions.filter(m => m.completed).length;
    const total = missionResults.missions.length;
    const completionRate = (completed / total) * 100;
    
    return { completed, total, completionRate };
  };

  const getMissionBasedRankIcon = () => {
    const stats = getMissionCompletionStats();
    if (!stats) return getRankIcon();
    
    if (stats.completionRate >= 90) return <FaCrown className="text-purple-400" />;
    if (stats.completionRate >= 75) return <FaTrophy className="text-yellow-400" />;
    if (stats.completionRate >= 50) return <FaStar className="text-orange-400" />;
    return <FaBullseye className="text-blue-400" />;
  };

  const getMissionBasedTitle = () => {
    const stats = getMissionCompletionStats();
    if (!stats) return getRankTitle();
    
    if (stats.completionRate >= 90) return "Grandmaster";
    if (stats.completionRate >= 75) return "Expert";
    if (stats.completionRate >= 50) return "Apprentice";
    return "Novice";
  };

  const getMissionBasedMessage = () => {
    const stats = getMissionCompletionStats();
    if (!stats) return getResultMessage();
    
    if (won) {
      if (stats.completionRate >= 90) return "Excellent! You've completed almost all missions!";
      if (stats.completionRate >= 75) return "Great job! You've mostly completed the missions!";
      if (stats.completionRate >= 50) return "Good! You've met the criteria!";
      return "Passed! But there are still missions to improve!";
    } else {
      return `Not Passed - Completed Missions: ${stats.completed}/${stats.total}`;
    }
  };

  const getRankIcon = () => {
    if (returnPercentage >= 15) return <FaCrown className="text-purple-400" />;
    if (returnPercentage >= 10) return <FaTrophy className="text-yellow-400" />;
    if (returnPercentage >= 5) return <FaStar className="text-orange-400" />;
    return <FaFire className="text-red-400" />;
  };

  const getRankTitle = () => {
    if (returnPercentage >= 15) return "Legendary";
    if (returnPercentage >= 10) return "Expert";
    if (returnPercentage >= 5) return "Professional";
    if (returnPercentage >= 0) return "Novice";
    return "Beginner";
  };

  const getResultMessage = () => {
    if (won) {
      if (returnPercentage >= 15) return "Excellent! You're a Legendary Trader!";
      if (returnPercentage >= 10) return "Excellent! You are a true trading master.";
      if (returnPercentage >= 5) return "Great job! You have high potential!";
      return "Well done! You've made it!";
    } else {
      return "Don't worry, try again and learn from your mistakes!";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-2xl w-full mx-4 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-3xl border border-gray-600/30 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="relative p-8 text-center">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
          
          {/* Result Icon with Animation */}
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 transform transition-all duration-1000 ${
            animationPhase >= 1 ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
          } ${
            won 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 animate-bounce' 
              : 'bg-gradient-to-br from-red-500 to-rose-600'
          }`}>
            {won ? (
              victoryType === 'mission-based' ? getMissionBasedRankIcon() : <FaTrophy className="text-4xl text-white" />
            ) : (
              <BiTrendingDown className="text-4xl text-white" />
            )}
          </div>

          {/* Main Result */}
          <h1 className={`text-4xl font-bold mb-2 transform transition-all duration-1000 delay-300 ${
            animationPhase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          } ${won ? 'text-green-400' : 'text-red-400'}`}>
            {won ? 'Won!' : 'Sorry, You Lost!'}
          </h1>

          <p className={`text-lg text-gray-300 mb-6 transform transition-all duration-1000 delay-500 ${
            animationPhase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}>
            {victoryType === 'mission-based' ? getMissionBasedMessage() : getResultMessage()}
          </p>

          {/* Rank Badge */}
          <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-6 transform transition-all duration-1000 delay-700 ${
            animationPhase >= 2 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          } ${
            won ? 'bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/50' : 'bg-gray-700/50 border border-gray-600'
          }`}>
            <div className="text-2xl">
              {victoryType === 'mission-based' ? getMissionBasedRankIcon() : getRankIcon()}
            </div>
            <div className="text-xl font-bold text-white">
              {victoryType === 'mission-based' ? getMissionBasedTitle() : getRankTitle()}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`px-8 pb-8 transform transition-all duration-1000 delay-1000 ${
          showDetails ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          
          {/* Mission Results Section - only for mission-based victory */}
          {victoryType === 'mission-based' && missionResults && (
            <div className="mb-6 p-4 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 backdrop-blur-sm border border-indigo-500/30 rounded-2xl">
              <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                <FaBullseye />
                Mission results
              </h3>
              
              {/* Mission Completion Summary */}
              <div className="mb-4 p-3 bg-slate-800/50 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Mission completed:</span>
                  <span className="text-white font-bold">
                    {getMissionCompletionStats()?.completed || 0}/{getMissionCompletionStats()?.total || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Success rate:</span>
                  <span className={`font-bold ${(getMissionCompletionStats()?.completionRate || 0) >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {formatPercentage(getMissionCompletionStats()?.completionRate || 0)}
                  </span>
                </div>
                {/* <div className="flex justify-between items-center">
                  <span className="text-gray-300">Overall Score:</span>
                  <span className="text-white font-bold">
                    {formatNumber(missionResults.totalScore || 0)}/100
                  </span>
                </div> */}
              </div>

              {/* Individual Mission Results */}
              <div className="space-y-2">
                {missionResults.missions?.map((mission, index) => (
                  <div key={`mission-${index}-${mission.type || mission.id}`} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      {mission.completed ? (
                        <FaCheckCircle className="text-green-400" />
                      ) : (
                        <FaTimes className="text-red-400" />
                      )}
                      <span className={`text-sm ${mission.completed ? 'text-gray-300' : 'text-gray-500'}`}>
                        {mission.description}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${mission.completed ? 'text-green-400' : 'text-red-400'}`}>
                        {mission.showAsFailed ? "Failed" : formatNumber(mission.score || 0)}
                      </div>
                      {!mission.showAsFailed && (
                        <div className="text-xs text-gray-500">
                          /{mission.maxScore}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* P&L */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-gray-600/30 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FaCoins className={won ? 'text-green-400' : 'text-red-400'} />
                <span className="text-sm text-gray-400">Profit/Loss</span>
              </div>
              <div className={`text-2xl font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                {totalReturn >= 0 ? '+' : ''}฿{formatNumber(Math.abs(totalReturn))}
              </div>
              <div className={`text-sm ${won ? 'text-green-400' : 'text-red-400'}`}>
                {returnPercentage >= 0 ? '+' : ''}{formatPercentage(Math.abs(returnPercentage))}
              </div>
            </div>

            {/* Final Balance */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-gray-600/30 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FaChartLine className="text-blue-400" />
                <span className="text-sm text-gray-400">Final Balance</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ฿{new Intl.NumberFormat('th-TH').format(finalBalance)}
              </div>
              <div className="text-sm text-gray-400">
                Target ฿{new Intl.NumberFormat('th-TH').format(targetProfit)}
              </div>
            </div>

            {/* Time Used */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-gray-600/30 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-yellow-400">⏱️</span>
                <span className="text-sm text-gray-400">Time Used</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {Math.floor(timeUsed / 60)}:{(timeUsed % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-400">minutes</div>
            </div>

            {/* Total Trades */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-gray-600/30 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-purple-400">📊</span>
                <span className="text-sm text-gray-400">Number of trades:</span>
              </div>
              <div className="text-2xl font-bold text-white">{trades}</div>
              <div className="text-sm text-gray-400">Times</div>
            </div>
          </div>

          {/* Special Achievements */}
          {(newRecord || winStreak > 1) && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/50 rounded-2xl">
              <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                <FaStar />
                Special Achievements
              </h3>
              <div className="space-y-1">
                {newRecord && (
                  <div className="text-sm text-yellow-400">🏆 New Record! You've broken your previous record!</div>
                )}
                {winStreak > 1 && (
                  <div className="text-sm text-green-400">🔥 {winStreak} Wins in a Row!</div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onPlayAgain}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <FaRedo />
              Play Again
            </button>
            
            <button
              onClick={onBackToHome}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 rounded-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <FaHome />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameResultModal;
