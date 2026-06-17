import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../contexts/AuthContext';
import GameHeader from "../../components/common/GameHeader";
import SoloDifficultySelector from "../../components/solo/SoloDifficultySelector";
import RoomSetting from "../../components/multiplayer/RoomSetting";
import JoinGame from "../../components/multiplayer/JoinGame";
import { 
  FaSearch, FaPlay, FaPlusSquare, FaSignInAlt, FaTrophy, FaBrain,
  FaChartLine, FaLightbulb, FaBolt, FaGem, FaCrown
} from "react-icons/fa";
import { 
  FiTrendingUp
} from "react-icons/fi";

// Enhanced Thai Challenge Modes with Modern Design
const CHALLENGE_MODES = [
  {
    key: "tutorial",
    title: "📚 Tutorial",
    subtitle: "Learn & Master",
    icon: <FaBrain size={28} className="text-purple-400" />,
    bigIcon: <FaLightbulb size={56} className="text-purple-400" />,
    gradient: "from-purple-600 via-purple-500 to-indigo-600",
    glowColor: "purple",
    stats: {
      players: "1 Player",
      duration: "Unlimited",
      difficulty: "Beginner",
      popularity: "95%"
    },
    features: ["📚 Interactive Lessons", "🎯 Knowledge Assessment", "🏆 Reward System", "📈 Performance Tracking"],
    desc: "Start your journey in the trading world with comprehensive lessons and engaging exercises. Learn the fundamentals of analysis and professional trading strategies.",
    rewards: "+100 Points",
    status: "🌟 Ideal for Beginners",
    badge: "RECOMMENDED",
    participants: "12,456"
  },
  {
    key: "solo",
    title: "🎯 Solo Mode",
    subtitle: "Challenge Yourself",
    icon: <FaChartLine size={28} className="text-cyan-400" />,
    bigIcon: <FiTrendingUp size={56} className="text-cyan-400" />,
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
    glowColor: "cyan",
    stats: {
      players: "1 Trader",
      duration: "5 Minutes",
      difficulty: "Advanced",
      popularity: "88%"
    },
    features: ["📈 Live Data", "⚡ Real-time Charts", "💰 Profit Tracking", "🎯 AI Analysis"],
    desc: "Test your trading skills in real market conditions. Face volatility and showcase your abilities in intense sessions.",
    rewards: "+500 Points",
    status: "🔥 Online: 2,341 players",
    badge: "HOT",
    participants: "8,923"
  },
  {
    key: "competition",
    title: "🌐 Multiplayer",
    subtitle: "Group Battle",
    icon: <FaTrophy size={28} className="text-yellow-400" />,
    bigIcon: <FaCrown size={56} className="text-yellow-400" />,
    gradient: "from-yellow-500 via-orange-500 to-red-500",
    glowColor: "yellow",
    stats: {
      players: "2-20 Traders",
      duration: "10 Minutes",
      difficulty: "Elite",
      popularity: "92%"
    },
    features: ["🏆 Live Leaderboard", "💬 Real-time Chat", "🎖️ Champion Points", "📊 Real-time Stats"],
    desc: "Join the legendary global trading competition. Compete with traders from around the world for glory and numerous rewards.",
    rewards: "Winner: +1000 Points + Title",
    status: "👑 Current Champion: TraderKing99",
    badge: "ELITE",
    participants: "15,678"
  },
];

// Home Features for Home Mode
// Enhanced Thai Challenge Modes with Modern Design
const FloatingElements = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
    <div className="absolute top-20 left-20 text-green-400/30 font-mono text-xs animate-pulse">AAPL +2.45%</div>
    <div className="absolute top-40 right-32 text-red-400/30 font-mono text-xs animate-pulse delay-1000">TSLA -1.23%</div>
    <div className="absolute bottom-40 left-40 text-blue-400/30 font-mono text-xs animate-pulse delay-2000">MSFT +0.87%</div>
  </div>
));

// Optimized background orbs
const BackgroundOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-optimized-pulse"></div>
    <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-optimized-pulse delay-1000"></div>
  </div>
));

// Memoized game mode card with cursor follow effect
const GameModeCard = memo(({ gameMode, index, selectedMode, onModeSelect, onEnterArena }) => {
  const isSelected = selectedMode === gameMode.key;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  
  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    
    setMousePosition({ x: x * 0.1, y: y * 0.1 }); // Subtle movement
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });
  }, []);
  
  return (
    <div
      className={`group cursor-pointer transform transition-all duration-500 will-change-transform h-full relative overflow-hidden ${
        isSelected ? 'scale-105 z-10' : 'hover:scale-102'
      }`}
      style={{
        transform: `translate3d(${mousePosition.x}px, ${mousePosition.y}px, 0) ${
          isSelected ? 'scale(1.05)' : isHovered ? 'scale(1.02)' : 'scale(1)'
        }`
      }}
      onClick={() => onModeSelect(gameMode.key)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gameMode.gradient} rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-all duration-500 animate-pulse-glow`}></div>
      
      {/* Badge */}
      {gameMode.badge && (
        <div className={`absolute -top-2 -right-2 z-20 px-3 py-1 rounded-full text-xs font-bold animate-bounce ${
          gameMode.badge === 'RECOMMENDED' ? 'bg-green-500 text-white' :
          gameMode.badge === 'HOT' ? 'bg-red-500 text-white' :
          'bg-yellow-500 text-black'
        }`}>
          {gameMode.badge}
        </div>
      )}
      
      {/* Main card */}
      <div className={`relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-gray-600/30 rounded-3xl p-8 h-full flex flex-col shadow-2xl group-hover:shadow-3xl transition-all duration-500 group-hover:border-gray-500/50`}>
        
        {/* Header with large icon */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${gameMode.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              {gameMode.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-thai-display group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 transition-all duration-300">
                {gameMode.title}
              </h3>
              <p className="text-sm text-gray-400 font-thai-body">{gameMode.subtitle}</p>
            </div>
          </div>
          {isSelected && (
            <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
          )}
        </div>

        {/* Stats with enhanced styling */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-gray-700/30 to-gray-600/30 rounded-xl p-3 border border-gray-600/20">
            <div className="text-xs text-gray-400 font-thai-body">Players</div>
            <div className="text-sm font-semibold text-white font-thai-number">{gameMode.stats.players}</div>
          </div>
          <div className="bg-gradient-to-r from-gray-700/30 to-gray-600/30 rounded-xl p-3 border border-gray-600/20">
            <div className="text-xs text-gray-400 font-thai-body">Time Limit</div>
            <div className="text-sm font-semibold text-white font-thai-number">{gameMode.stats.duration}</div>
          </div>
          <div className="bg-gradient-to-r from-gray-700/30 to-gray-600/30 rounded-xl p-3 border border-gray-600/20">
            <div className="text-xs text-gray-400 font-thai-body">Level</div>
            <div className="text-sm font-semibold text-white font-thai-number">{gameMode.stats.difficulty}</div>
          </div>
          <div className="bg-gradient-to-r from-gray-700/30 to-gray-600/30 rounded-xl p-3 border border-gray-600/20">
            <div className="text-xs text-gray-400 font-thai-body">Popularity</div>
            <div className="text-sm font-semibold text-green-400 font-thai-number">{gameMode.stats.popularity}</div>
          </div>
        </div>

        {/* Features with enhanced badges */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {gameMode.features.map((feature, idx) => (
              <span 
                key={idx} 
                className="text-xs bg-gradient-to-r from-gray-700/50 to-gray-600/50 text-gray-200 px-3 py-2 rounded-xl font-thai-body border border-gray-600/30 hover:border-gray-500/50 transition-colors duration-200"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 mb-6">
          <p className="text-sm text-gray-300 line-clamp-3 font-thai-body leading-relaxed">{gameMode.desc}</p>
        </div>

        {/* Participants count */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-thai-body">Participants</span>
            <span className="text-cyan-400 font-bold font-thai-number">{gameMode.participants} People</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end mt-auto pt-4 border-t border-gray-700/30">
          <div className="flex-1">
            <p className="text-xs text-gray-400 font-thai-body">
              Reward: <span className="text-green-400 font-semibold font-thai-number">{gameMode.rewards}</span>
            </p>
            <p className="text-xs text-gray-500 font-thai-body mt-1">{gameMode.status}</p>
          </div>
          
          {isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnterArena(gameMode.key);
              }}
              className={`bg-gradient-to-r ${gameMode.gradient} text-white px-6 py-3 rounded-2xl text-sm font-bold hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl font-thai-body flex items-center space-x-2 group-hover:animate-pulse`}
            >
              <span>Enter</span>
              <FaPlay className="text-xs" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export default function ChallengePage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // States
  const [mode, setMode] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);
  const [userProgress, setUserProgress] = useState({
    unlockedLevels: ['easy'],
    completedLevels: [],
    totalChallenges: 0,
    winRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fix unlocked levels based on completed levels - Same logic as SoloChallenge
  const fixUnlockedLevels = useCallback((currentUnlockedLevels, completedLevels) => {
    console.log('🔧 fixUnlockedLevels INPUT:', { currentUnlockedLevels, completedLevels });
    
    let fixedUnlockedLevels = [...(currentUnlockedLevels || ['easy'])];
    const levelOrder = ['easy', 'medium', 'hard', 'expert'];
    
    // Ensure all unlocked levels are available based on completed levels
    levelOrder.forEach((level, index) => {
      if (index === 0) {
        // Easy is always unlocked
        if (!fixedUnlockedLevels.includes('easy')) {
          fixedUnlockedLevels.push('easy');
        }
        return;
      }
      
      const previousLevel = levelOrder[index - 1];
      const hasCompletedPrevious = completedLevels.includes(previousLevel);
      
      console.log(`🔧 Checking level "${level}": previousLevel="${previousLevel}", hasCompletedPrevious=${hasCompletedPrevious}`);
      
      // If user has completed the previous level, unlock this level permanently
      if (hasCompletedPrevious && !fixedUnlockedLevels.includes(level)) {
        fixedUnlockedLevels.push(level);
        console.log(`🔓 Permanently unlocked "${level}" (completed "${previousLevel}")`);
      }
    });
    
    // Also check for any level that user has already completed - it should definitely be unlocked
    completedLevels.forEach(completedLevel => {
      if (!fixedUnlockedLevels.includes(completedLevel)) {
        fixedUnlockedLevels.push(completedLevel);
        console.log(`🔓 Unlocked "${completedLevel}" (already completed)`);
      }
    });
    
    // Sort unlocked levels according to difficulty order
    fixedUnlockedLevels = levelOrder.filter(level => fixedUnlockedLevels.includes(level));
    
    console.log('🔧 fixUnlockedLevels OUTPUT:', fixedUnlockedLevels);
    return fixedUnlockedLevels;
  }, []);

  // Load user progress via API
  useEffect(() => {
    const loadProgress = async () => {
      if (!currentUser) {
        setUserProgress({ unlockedLevels: ['easy'], completedLevels: [], totalChallenges: 0, winRate: 0 });
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/profile/${currentUser.uid}`);
        if (res.ok) {
          const userData = await res.json();
          const completedLevels = userData.soloCompletedLevels || [];
          const fixedUnlockedLevels = fixUnlockedLevels(userData.soloUnlockedLevels, completedLevels);
          setUserProgress({
            unlockedLevels: fixedUnlockedLevels,
            completedLevels,
            totalChallenges: userData.soloTotalChallenges || 0,
            winRate: userData.soloWinRate || 0
          });
        } else {
          setUserProgress({ unlockedLevels: ['easy'], completedLevels: [], totalChallenges: 0, winRate: 0 });
        }
      } catch (err) {
        console.error('❌ Error loading user progress:', err);
        setUserProgress({ unlockedLevels: ['easy'], completedLevels: [], totalChallenges: 0, winRate: 0 });
      }
      setIsLoading(false);
    };
    loadProgress();
  }, [currentUser, fixUnlockedLevels]);

  // Memoized handlers
  const handleModeSelect = useCallback((modeKey) => {
    setSelectedMode(modeKey);
  }, []);

  const handleEnterArena = useCallback((modeKey) => {
    if (modeKey === 'solo') {
      setShowDifficultySelector(true);
    } else if (modeKey === 'tutorial') {
      navigate('/tutorial');
    } else {
      setMode(modeKey);
    }
  }, [navigate]);

  const handleDifficultySelect = useCallback((difficulty) => {
    navigate(`/solo?difficulty=${difficulty}`);
  }, [navigate]);

  const handleBackFromDifficulty = useCallback(async () => {
    console.log('🔄 Refreshing user progress when back from difficulty selector...');
    setShowDifficultySelector(false);
    setSelectedMode(null);
    
    // Refresh user progress via API
    if (currentUser) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/profile/${currentUser.uid}`);
        if (res.ok) {
          const userData = await res.json();
          const completedLevels = userData.soloCompletedLevels || [];
          const fixedUnlockedLevels = fixUnlockedLevels(userData.soloUnlockedLevels, completedLevels);
          setUserProgress({
            unlockedLevels: fixedUnlockedLevels,
            completedLevels,
            totalChallenges: userData.soloTotalChallenges || 0,
            winRate: userData.soloWinRate || 0
          });
        }
      } catch (error) {
        console.error('❌ Error refreshing user progress:', error);
      }
    }
  }, [currentUser, fixUnlockedLevels]);

  // Memoized challenge modes
  const memoizedModes = useMemo(() => CHALLENGE_MODES, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 relative overflow-hidden flex">
      {/* Background Effects */}
      <BackgroundOrbs />
      <FloatingElements />
      
      {/* Sidebar Navigation */}
  {/* Sidebar now provided by AppLayout */}
      
      {/* Header */}
      <div className="fixed top-0 left-20 right-0 z-20">
        <GameHeader />
      </div>

      {/* Main Content with proper margin */}
      <div className="flex-1 ml-20">
        <div className="container mx-auto px-6 lg:px-8 relative z-10 pt-20">
          <div className="max-w-7xl mx-auto">
          
          {/* Main Lobby */}
          {!mode && !showDifficultySelector && (
            <div>
              {/* Enhanced Header */}
              <div className="text-center mb-8 relative">
                {/* Background decorative elements */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4">
                  <div className="w-32 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full"></div>
                </div>
                
                <div className="relative">
                  <h1 className="text-4xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 font-thai-display mb-4 animate-gradient-x">
                    ⚡ Real-time trading statistics
                  </h1>
                  <div className="absolute -top-2 -left-2 text-4xl animate-bounce">💫</div>
                  <div className="absolute -top-1 -right-1 text-3xl animate-pulse">🚀</div>
                </div>
                
                <p className="text-lg text-gray-300 max-w-3xl mx-auto font-thai-body leading-relaxed mb-12">
                  Choose your path to trading mastery. Practice, compete, and dominate the global financial markets.
                </p>

                {/* SET Thailand Advertisement Block */}
                <div className="mb-12">
                  <div className="bg-gradient-to-r from-green-600/90 via-emerald-600/90 to-teal-600/90 backdrop-blur-xl border border-green-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden max-w-4xl mx-auto">
                    {/* Background decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-xl"></div>
                    
                    {/* Content */}
                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between">
                      <div className="flex items-center space-x-6 mb-4 lg:mb-0">
                        {/* SET Logo placeholder */}
                        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-sm">
                          <div className="text-2xl font-bold text-white font-thai-display">SET</div>
                        </div>
                        
                        {/* Text content */}
                        <div>
                          <h3 className="text-2xl font-bold text-white font-thai-display mb-2">
                            📈 The Stock Exchange of Thailand
                          </h3>
                          <p className="text-green-100 text-lg font-thai-body leading-relaxed">
                            Trade Thai stocks in real-time with complete data from SET
                          </p>
                          <div className="flex items-center space-x-4 mt-3 text-sm text-green-200">
                            <span className="flex items-center">
                              <div className="w-2 h-2 bg-green-300 rounded-full mr-2 animate-pulse"></div>
                              Live Data
                            </span>
                            <span className="flex items-center">
                              <FaBolt className="mr-2 text-yellow-300" size={14} />
                              Fast Trading
                            </span>
                            <span className="flex items-center">
                              <FaChartLine className="mr-2 text-cyan-300" size={14} />
                              Pro Charts
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* CTA Button */}
                      <div className="flex flex-col items-center space-y-3">
                        <button className="bg-white/20 hover:bg-white/30 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 flex items-center font-thai-body shadow-lg hover:shadow-xl border border-white/30 hover:border-white/50 backdrop-blur-sm">
                          <span>Start Trading Thai Stocks</span>
                          <div className="ml-3 text-lg">🚀</div>
                        </button>
                        <div className="text-xs text-green-200 font-thai-body text-center">
                          *Supported by SET
                        </div>
                      </div>
                    </div>
                    
                    {/* Stock ticker animation */}
                    <div className="mt-6 pt-4 border-t border-white/20">
                      <div className="flex space-x-6 text-xs text-green-100 font-mono animate-marquee">
                        <span className="text-green-300">PTT +2.50 (186.50)</span>
                        <span className="text-red-300">CPALL -1.25 (62.75)</span>
                        <span className="text-green-300">KBANK +0.75 (158.50)</span>
                        <span className="text-green-300">SCB +1.00 (124.00)</span>
                        <span className="text-red-300">AOT -0.50 (68.25)</span>
                        <span className="text-green-300">ADVANC +2.00 (202.00)</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced stats bar */}
                <div className="flex flex-wrap justify-center items-center gap-6 text-sm font-thai-body">
                  <div className="flex items-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 py-2 rounded-full border border-green-500/30">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse shadow-lg shadow-green-400/50"></div>
                    <span className="text-green-400 font-semibold">2,341 Online</span>
                  </div>
                  <div className="flex items-center bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2 rounded-full border border-yellow-500/30">
                    <FaTrophy className="mr-3 text-yellow-400" size={16} />
                    <span className="text-yellow-400 font-semibold">156 Championships</span>
                  </div>
                  <div className="flex items-center bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-2 rounded-full border border-cyan-500/30">
                    <FaBolt className="mr-3 text-cyan-400" size={16} />
                    <span className="text-cyan-400 font-semibold">Live Market</span>
                  </div>
                  <div className="flex items-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-2 rounded-full border border-purple-500/30">
                    <FaGem className="mr-3 text-purple-400" size={16} />
                    <span className="text-purple-400 font-semibold">Premium Mode</span>
                  </div>
                </div>
              </div>

              {/* Game Mode Selection with enhanced spacing */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {memoizedModes.map((gameMode, index) => (
                  <GameModeCard
                    key={gameMode.key}
                    gameMode={gameMode}
                    index={index}
                    selectedMode={selectedMode}
                    onModeSelect={handleModeSelect}
                    onEnterArena={handleEnterArena}
                  />
                ))}
              </div>

              {/* Enhanced Stats Panel */}
              <div className="mb-8">
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-gray-600/30 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center font-thai-display">
                      <FaChartLine className="mr-3 text-cyan-400" />
                      Real-time Trading Statistics
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-400 font-thai-body">Updated every 1 second</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-4 border border-cyan-500/20">
                      <div className="text-3xl font-bold text-cyan-400 font-thai-number mb-1">2,341</div>
                      <div className="text-sm text-gray-400 font-thai-body">Online Traders</div>
                      <div className="text-xs text-green-400 font-thai-body mt-1">+12% from yesterday</div>
                    </div>
                    <div className="text-center bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-4 border border-green-500/20">
                      <div className="text-3xl font-bold text-green-400 font-thai-number mb-1">฿2.8B</div>
                      <div className="text-sm text-gray-400 font-thai-body">Today's Volume</div>
                      <div className="text-xs text-green-400 font-thai-body mt-1">+8.5% from yesterday</div>
                    </div>
                    <div className="text-center bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl p-4 border border-yellow-500/20">
                      <div className="text-3xl font-bold text-yellow-400 font-thai-number mb-1">156</div>
                      <div className="text-sm text-gray-400 font-thai-body">Competitions</div>
                      <div className="text-xs text-yellow-400 font-thai-body mt-1">Ongoing</div>
                    </div>
                    <div className="text-center bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-4 border border-purple-500/20">
                      <div className="text-3xl font-bold text-purple-400 font-thai-number mb-1">99.2%</div>
                      <div className="text-sm text-gray-400 font-thai-body">Uptime</div>
                      <div className="text-xs text-purple-400 font-thai-body mt-1">Server Status</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Quick Actions */}
              <div className="flex flex-wrap justify-center gap-4 pb-8">
                <button className="bg-gradient-to-r from-gray-700/80 to-gray-600/80 hover:from-gray-600/80 hover:to-gray-500/80 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center font-thai-body shadow-lg hover:shadow-xl border border-gray-600/30 hover:border-gray-500/50">
                  <FaSearch className="mr-3" />
                  Search Rooms
                </button>
                <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center shadow-lg hover:shadow-xl font-thai-body border border-purple-500/30 hover:border-purple-400/50">
                  <FaGem className="mr-3" />
                  Premium Rooms
                </button>
                <button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center shadow-lg hover:shadow-xl font-thai-body border border-cyan-500/30 hover:border-cyan-400/50">
                  <FaTrophy className="mr-3" />
                  View Rankings
                </button>
              </div>
            </div>
          )}

          {/* Solo Difficulty Selector */}
          {showDifficultySelector && isLoading && (
            <div className="flex justify-center items-center py-20">
              <div className="text-white text-xl font-thai-body">🔄 Loading data...</div>
            </div>
          )}
          {showDifficultySelector && !isLoading && (
            <SoloDifficultySelector
              onSelectDifficulty={handleDifficultySelect}
              onBack={handleBackFromDifficulty}
              unlockedLevels={userProgress.unlockedLevels}
              completedLevels={userProgress.completedLevels}
            />
          )}

          {/* Competition Mode */}
          {mode === 'competition' && (
            <div className="w-full">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 font-thai-display">
                  👑 Elite Championship Arena
                </h2>
                <button
                  onClick={() => setMode(null)}
                  className="bg-gray-700/50 hover:bg-gray-600/50 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200 font-thai-body"
                >
                  ← Back to Lobby
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Room */}
                <div className="bg-slate-800/60 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-6">
                  <div className="text-center mb-6">
                    <FaPlusSquare className="text-4xl text-orange-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2 font-thai-display">Create Competition</h3>
                    <p className="text-gray-400 text-sm font-thai-body">Set up your own elite trading tournament</p>
                  </div>
                  <RoomSetting embedded compact onClose={() => setMode(null)} />
                </div>

                {/* Join Room */}
                <div className="bg-slate-800/60 backdrop-blur-sm border border-cyan-400/30 rounded-2xl p-6">
                  <div className="text-center mb-6">
                    <FaSignInAlt className="text-4xl text-cyan-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2 font-thai-display">Join Competition</h3>
                    <p className="text-gray-400 text-sm font-thai-body">Enter an existing trading arena</p>
                  </div>
                  <JoinGame embedded compact onClose={() => setMode(null)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced CSS with new animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&family=Prompt:wght@400;500&display=swap');
        
        /* Beautiful Thai Fonts */
        .font-thai-display {
          font-family: 'Kanit', 'Inter', 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        
        .font-thai-body {
          font-family: 'Prompt', 'Inter', 'Noto Sans Thai', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 400;
          line-height: 1.6;
        }
        
        .font-thai-number {
          font-family: 'Kanit', 'Inter', monospace;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        
        /* Enhanced Animations */
        @keyframes gradient-x {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }
        
        @keyframes float-gentle {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(5deg);
          }
        }
        
        .animate-gradient-x {
          animation: gradient-x 6s ease infinite;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        
        .animate-float-gentle {
          animation: float-gentle 4s ease-in-out infinite;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
        
        .delay-2000 {
          animation-delay: 2s;
        }

        /* Enhanced Thai text rendering */
        .font-thai-display,
        .font-thai-body,
        .font-thai-number {
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Enhanced glass morphism */
        .backdrop-blur-xl {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        /* Enhanced shadows */
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.4);
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .text-4xl { font-size: 2rem; }
          .text-6xl { font-size: 3rem; }
          .blur-3xl { filter: blur(16px); }
          .animate-pulse { animation-duration: 3s; }
          
          .font-thai-display {
            font-size: 1.1em;
          }
          
          .font-thai-body {
            font-size: 0.95em;
            line-height: 1.5;
          }
          
          .grid-cols-3 {
            grid-template-columns: 1fr;
          }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse,
          .animate-pulse-glow,
          .animate-gradient-x,
          .animate-float-gentle {
            animation: none;
          }
          
          .transition-all,
          .transition-transform,
          .transition-colors {
            transition: none;
          }
        }
      `}</style>
      </div>
    </div>
  );
}
