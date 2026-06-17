import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, firestore } from '../firebase/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
// import Balance from '../components/Balance';
// import LimitOrderPanel from '../components/LimitOrderPanel'; // Removed unused import
import SoloTradingChart from '../components/solo/SoloTradingChart';
import GameHeader from '../components/common/GameHeader';
import SoloDifficultySelector from '../components/solo/SoloDifficultySelector';
import TutorialPretestSystem from '../components/quiz/TutorialPretestSystem';
import MissionProgressPanel from '../components/common/MissionProgressPanel';
// import TradingControlPanel from '../components/TradingControlPanel';
// import GameDashboard from '../components/GameDashboard';
// import OrderHistoryPanel from '../components/OrderHistoryPanel';
import GameResultModal from '../components/common/GameResultModal';
import { getNicknameByLevel, getHighestNickname } from '../constants/nicknames';

// Number formatting utilities
const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Math.round(num).toLocaleString();
};

const formatCurrency = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '฿0';
  return `฿${Math.round(num).toLocaleString()}`;
};

const formatPercentage = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0%';
  return `${Math.round(num * 100) / 100}%`;
};

const formatPrice = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0.00';
  return num.toFixed(2);
};

function SoloChallenge() {
  const navigate = useNavigate();
  const location = useLocation();

  // Helper: normalize difficulty to string id (e.g., 'easy')
  const extractDifficultyId = useCallback((d) => {
    if (!d) return null;
    if (typeof d === 'string') return d;
    if (typeof d === 'object') return d.id || d.key || d.level || d.value || null;
    return null;
  }, []);

  // Raw from state, URL parameters, or storage
  const rawStateDifficulty = location.state?.selectedDifficulty;
  const urlParams = new URLSearchParams(location.search);
  const rawUrlDifficulty = urlParams.get('difficulty');
  const rawStoredDifficulty = useMemo(() => {
    try { return sessionStorage.getItem('soloSelectedDifficulty'); } catch { return null; }
  }, []);

  // Final normalized difficulty from navigation (prioritize URL params, then state, then storage)
  const passedDifficulty = useMemo(() => {
    return extractDifficultyId(rawUrlDifficulty) || 
           extractDifficultyId(rawStateDifficulty) || 
           extractDifficultyId(rawStoredDifficulty);
  }, [extractDifficultyId, rawUrlDifficulty, rawStateDifficulty, rawStoredDifficulty]);

  // Persisted active session (to survive reloads)
  const persistedActive = useMemo(() => {
    try { return sessionStorage.getItem('soloActive') === '1'; } catch { return false; }
  }, []);
  const persistedDifficulty = useMemo(() => {
    try { return sessionStorage.getItem('soloDifficulty'); } catch { return null; }
  }, []);
  
  // Function to get market display name
  const getMarketDisplayName = useCallback((market) => {
    switch (market) {
      case 'SET':
        return 'ตลาดหลักทรัพย์แห่งประเทศไทย (SET)';
      case 'TFEX':
        return 'ตลาดอนุพันธ์ (TFEX)';
      case 'mai':
        return 'ตลาด mai';
      case 'US':
        return 'ตลาดหุ้นสหรัฐฯ';
      case 'crypto':
        return 'ตลาดคริปโต';
      default:
        console.warn(`🏢 [MARKET] Unknown market: ${market}, defaulting to หุ้นไทย`);
        return market || 'ตลาดหุ้น';
    }
  }, []);

  // Markets by difficulty level - แยกตลาดตามระดับความยาก
  const marketsByDifficulty = useMemo(() => ({
    // ระดับ Easy + Medium: ตลาดหลักทรัพย์ไทย (SET) - หุ้นไทยที่มีความเสี่ยงปานกลาง
    SET: {
      market: 'SET',
      displayName: 'ตลาดหลักทรัพย์แห่งประเทศไทย (SET)',
      levels: ['easy', 'medium'],
      description: 'หุ้นไทยคุณภาพดี ความผันผวนปานกลาง',
      symbols: [
        // หุ้นใหญ่ที่มีสภาพคล่องสูง
        'PTT', 'KBANK', 'SCB', 'BBL', 'KTB', 'AOT', 
        'ADVANC', 'TRUE', 'DTAC', 'CPALL', 'CP', 'CPF',
        // หุ้นคุณภาพดีที่เหมาะสำหรับผู้เริ่มต้น
        'TU', 'MINT', 'CRC', 'BGC', 'HMPRO', 'COM7', 'OR', 'BANPU'
      ]
    },
    // ระดับ Hard + Expert: ตลาดอนุพันธ์ (TFEX) - สินค้าที่มีความเสี่ยงสูง
    TFEX: {
      market: 'TFEX',
      displayName: 'ตลาดอนุพันธ์ (TFEX)',
      levels: ['hard', 'expert'],
      description: 'อนุพันธ์และสินค้าโภคภัณฑ์ ความผันผวนสูง',
      symbols: [
        // Futures และ Options ที่ท้าทาย
        'SET50F', 'GOLD', 'OIL', 'USD', 'RUBBER', 'RICE',
        // หุ้นที่มีความผันผวนสูง
        'DELTA', 'SAWAD', 'PTTEP', 'KCE', 'SCC', 'TISCO', 'AP'
      ]
    }
  }), []);
  
  // Function to get market by difficulty - แยกตลาดตามระดับความยาก
  const getMarketByDifficulty = useCallback((difficulty) => {
    console.log(`🏢 [MARKET] Getting market for difficulty: ${difficulty}`);
    
    if (['tutorial', 'easy', 'medium'].includes(difficulty)) {
      console.log(`🏢 [MARKET] Selected SET market for ${difficulty}`);
      return marketsByDifficulty.SET;
    } else if (['hard', 'expert'].includes(difficulty)) {
      console.log(`🏢 [MARKET] Selected TFEX market for ${difficulty}`);
      return marketsByDifficulty.TFEX;
    } else {
      // Default fallback to SET for unknown difficulties
      console.log(`🏢 [MARKET] Unknown difficulty "${difficulty}", defaulting to SET`);
      return marketsByDifficulty.SET;
    }
  }, [marketsByDifficulty]);
  
  // Random selection function based on difficulty
  const getRandomStockByDifficulty = useCallback((diff) => {
    const d = typeof diff === 'string' ? diff : extractDifficultyId(diff) || 'easy';
    const market = getMarketByDifficulty(d);
    const randomSymbol = market.symbols[Math.floor(Math.random() * market.symbols.length)];
    return { market: market.market, symbol: randomSymbol };
  }, [getMarketByDifficulty, extractDifficultyId]);
  
  // Initialize with correct difficulty - use passedDifficulty logic
  const initialDifficulty = useMemo(() => {
    const sessionDifficulty = (() => {
      try { return sessionStorage.getItem('soloDifficulty'); } catch { return null; }
    })();
    
    // Priority: URL params → navigation state → storage → session → default
    const result = passedDifficulty || sessionDifficulty || 'easy';
    
    console.log('🔧 [INIT] Initial difficulty calculation:', {
      passedDifficulty, 
      sessionDifficulty, 
      result,
      rawUrl: rawUrlDifficulty,
      rawState: rawStateDifficulty, 
      rawStored: rawStoredDifficulty
    });
    return result;
  }, [passedDifficulty, rawUrlDifficulty, rawStateDifficulty, rawStoredDifficulty]);

  // Initialize with random stock for correct difficulty level
  const initialStock = getRandomStockByDifficulty(initialDifficulty);
  const [selectedMarket, setSelectedMarket] = useState(initialStock.market);
  const [selectedSymbol, setSelectedSymbol] = useState(initialStock.symbol);
  
  const [difficulty, setDifficulty] = useState(initialDifficulty); // Use calculated initial difficulty
  const [userProgress, setUserProgress] = useState({
    currentLevel: 'easy',
    completedLevels: [],
    totalChallenges: 0,
    winRate: 0,
    unlockedLevels: ['easy', 'medium', 'hard', 'expert'], // ทุกระดับปลดล็อคทั้งหมด
    earnedNicknames: [], // Track earned nicknames
    currentNickname: null // Current displayed nickname
  });
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [playbackTime, setPlaybackTime] = useState(null);
  const [isChallengeStarted, setIsChallengeStarted] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);
  
  // Game Session Tracking
  const [gameSessionId, setGameSessionId] = useState(() => `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [gameStartTime, setGameStartTime] = useState(null);
  
  // Trading states
  const [balance, setBalance] = useState(1000000);
  const [position, setPosition] = useState(0);
  const [entryPrice, setEntryPrice] = useState(0);
  const [pnl, setPnl] = useState(0);
  const [hasAction, setHasAction] = useState(false);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [remainingTime, setRemainingTime] = useState(300); // 5 minutes
  
  // MaxDrawdown tracking states
  const [peakValue, setPeakValue] = useState(1000000);
  const [valleyValue, setValleyValue] = useState(1000000);
  
  // Trading UI state
  const [buyAmount, setBuyAmount] = useState(100);
  const [sellAmount, setSellAmount] = useState(0);
  
  // Playback controls
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // Used in speed controls UI
  // eslint-disable-next-line no-unused-vars
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Debug state changes
  useEffect(() => {
    console.log(`🎮 [SOLO] State changed - isPlaying: ${isPlaying}, isPaused: ${isPaused}, isChallengeStarted: ${isChallengeStarted}`);
  }, [isPlaying, isPaused, isChallengeStarted]);
  
  // Positions list for panels (per-symbol aggregates) - commented out since not used in current UI
  // const [positions, setPositions] = useState([]);

  // Limit Order states
  const [limitOrders, setLimitOrders] = useState([]);
  const [nextOrderId, setNextOrderId] = useState(1);

  // Hint system states
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState(null);
  const [hintCount, setHintCount] = useState(0);
  const hintTimerRef = useRef(null);

  // Game Result Modal states
  const [showResultModal, setShowResultModal] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [winStreak, setWinStreak] = useState(0);
  const [personalBest, setPersonalBest] = useState(0);

  // Difficulty progression system - ปลดล็อค tutorial และเน้นเป้าหมายกำไรและเวลา

  // Update sell amount when position changes
  useEffect(() => {
    setSellAmount(prevSellAmount => Math.min(position, prevSellAmount));
  }, [position]);
  const difficultyLevels = useMemo(() => ([
    { 
      id: 'easy', 
      name: 'Easy', 
      description: 'ระดับง่าย',
      color: 'blue',
      requirements: null,
      minWinRate: 60,
      timeLimit: 360, // 6 minutes
      profitTarget: 1000, // เป้าหมายกำไร 1,000 บาท (0.1%) - สำหรับทดสอบ
      profitTargetPercent: 0.1
    },
    { 
      id: 'medium', 
      name: 'Medium', 
      description: 'ระดับกลาง',
      color: 'yellow',
      requirements: 'easy',
      minWinRate: 65,
      timeLimit: 300, // 5 minutes
      profitTarget: 2000, // เป้าหมายกำไร 2,000 บาท (0.2%) - สำหรับทดสอบ
      profitTargetPercent: 0.2
    },
    { 
      id: 'hard', 
      name: 'Hard', 
      description: 'ระดับยาก',
      color: 'orange',
      requirements: 'medium',
      minWinRate: 70,
      timeLimit: 180, // 3 minutes
      profitTarget: 3000, // เป้าหมายกำไร 3,000 บาท (0.3%) - สำหรับทดสอบ
      profitTargetPercent: 0.3
    },
    { 
      id: 'expert', 
      name: 'Expert', 
      description: 'ระดับผู้เชี่ยวชาญ',
      color: 'red',
      requirements: 'hard',
      minWinRate: 75,
      timeLimit: 120, // 2 minutes
      profitTarget: 4000, // เป้าหมายกำไร 4,000 บาท (0.4%) - สำหรับทดสอบ
      profitTargetPercent: 0.4
    }
  ]), []);

  // Function to fix unlocked levels - ปรับแล้ว: ทุกระดับปลดล็อค
  const fixUnlockedLevels = useCallback((currentUnlockedLevels, completedLevels) => {
    const levelOrder = ['easy', 'medium', 'hard', 'expert'];
    // ระบบการล็อคด่านถูกปิดแล้ว - return ทุกระดับ
    console.log('🔓 All levels unlocked - no level restrictions');
    return levelOrder; // ทุกระดับพร้อมเล่น
  }, []);

  // Load user progress from Firebase (guard overlays when resuming)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        if (persistedActive || passedDifficulty) {
          setShowDifficultySelector(false);
          setShowTutorial(false);
          setIsChallengeStarted(true);
          setIsPlaying(true); // เริ่มเล่นเมื่อเกมเริ่ม
          if (passedDifficulty) {
            console.log('🔧 [DIFFICULTY] Setting difficulty from URL param:', passedDifficulty);
            setDifficulty(passedDifficulty);
            try {
              sessionStorage.setItem('soloActive', '1');
              sessionStorage.setItem('soloDifficulty', passedDifficulty);
              sessionStorage.removeItem('soloSelectedDifficulty');
            } catch {}
          }
        }

        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        console.log('📖 Loading user progress from Firebase...');

        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          const earnedNicknames = userData.soloEarnedNicknames || [];
          const currentNickname = getHighestNickname(userData.soloCompletedLevels || []);
          
          // Fix unlocked levels based on completed levels - Enhanced permanent unlock system
          const completedLevels = userData.soloCompletedLevels || [];
          const fixedUnlockedLevels = fixUnlockedLevels(userData.soloUnlockedLevels, completedLevels);

          console.log('� User progress loaded - Permanent unlocked:', fixedUnlockedLevels);
          
          console.log('🔑 Final permanent unlocked levels:', fixedUnlockedLevels);

          const progress = {
            currentLevel: userData.soloCurrentLevel || 'easy',
            completedLevels: userData.soloCompletedLevels || [],
            totalChallenges: userData.soloTotalChallenges || 0,
            winRate: userData.soloWinRate || 0,
            unlockedLevels: fixedUnlockedLevels,
            earnedNicknames,
            currentNickname,
            recommendedStartLevel: userData.recommendedStartLevel || 'easy',
          };
          
          // Update Firebase if unlocked levels were fixed (force update for permanent unlock)
          const originalUnlockedLevels = userData.soloUnlockedLevels || ['easy'];
          const hasChanges = fixedUnlockedLevels.length !== originalUnlockedLevels.length || 
                            !fixedUnlockedLevels.every(level => originalUnlockedLevels.includes(level));
          
          console.log('💾 Firebase comparison:', {
            original: originalUnlockedLevels,
            fixed: fixedUnlockedLevels,
            hasChanges
          });
          
          if (hasChanges) {
            console.log('💾 Updating Firebase with permanent unlocked levels:', fixedUnlockedLevels);
            await updateDoc(userRef, {
              soloUnlockedLevels: fixedUnlockedLevels
            });
            console.log('✅ Firebase updated with permanent unlock status');
          } else {
            console.log('💾 No changes needed, Firebase is up to date');
          }

          setUserProgress(progress);
          setDifficulty(progress.currentLevel);

          const hasUnlockedLevels = userData.soloUnlockedLevels && userData.soloUnlockedLevels.length > 1;
          const hasTutorialData = userData.tutorialCompleted || hasUnlockedLevels;

          // Simplified state logic
          if (passedDifficulty || persistedActive) {
            // Direct play mode
            setShowDifficultySelector(false);
            setShowTutorial(false);
            setIsNewUser(false);
          } else if (hasTutorialData) {
            // Show difficulty selector for existing users
            setIsNewUser(false);
            setShowDifficultySelector(true);
            setShowTutorial(false);
          } else {
            // Show tutorial for new users
            setIsNewUser(true);
            setShowTutorial(true);
            setShowDifficultySelector(false);
          }
        } else {
          // New user default
          if (passedDifficulty || persistedActive) {
            // Direct play mode
            setShowDifficultySelector(false);
            setShowTutorial(false);
            setIsNewUser(false);
          } else {
            // Show tutorial for new users
            setIsNewUser(true);
            setShowTutorial(true);
            setShowDifficultySelector(false);
          }
          setUserProgress({
            currentLevel: 'easy',
            completedLevels: [],
            totalChallenges: 0,
            winRate: 0,
            unlockedLevels: ['easy'],
            earnedNicknames: [],
            currentNickname: null,
          });
        }
      } catch (error) {
        console.error('Error loading user progress:', error);
      }
    });

    return () => unsubscribe();
  }, [passedDifficulty, persistedActive, rawStateDifficulty, rawUrlDifficulty, fixUnlockedLevels]);

  // Debug: Track difficulty state changes
  useEffect(() => {
    console.log('🔧 [DIFFICULTY STATE] Difficulty changed to:', difficulty);
    console.log('🔧 [DIFFICULTY STATE] Current missions should update for:', difficulty);
    console.log('🔧 [DIFFICULTY STATE] Timestamp:', new Date().toLocaleTimeString());
  }, [difficulty]);

  // Handle passed difficulty from ChallengePage - เพิ่ม sync forced update
  useEffect(() => {
    if (passedDifficulty && passedDifficulty !== difficulty) {
      console.log('🔧 [DIFFICULTY] Setting difficulty from passed param (useEffect):', passedDifficulty);
      console.log('🔧 [DIFFICULTY] Current difficulty state:', difficulty);
      console.log('🔧 [DIFFICULTY] Forcing update to:', passedDifficulty);
      
      setDifficulty(passedDifficulty);
      setShowDifficultySelector(false);
      setShowTutorial(false);
      setIsChallengeStarted(true); // เริ่มเกมเลย เมื่อมาจาก ChallengePage
      setIsPlaying(true); // เริ่มเล่นเมื่อเกมเริ่ม
      try {
        sessionStorage.setItem('soloActive', '1');
        sessionStorage.setItem('soloDifficulty', passedDifficulty);
        sessionStorage.removeItem('soloSelectedDifficulty');
      } catch {}
    }
  }, [passedDifficulty, difficulty]); // เพิ่ม difficulty เพื่อให้ re-run เมื่อ state เปลี่ยน

  // Auto-restore active game when page is refreshed on /solo
  useEffect(() => {
    if (!passedDifficulty && persistedActive && persistedDifficulty) {
      console.log('🔧 [DIFFICULTY] Restoring difficulty from sessionStorage:', persistedDifficulty);
      setDifficulty(persistedDifficulty);
      setShowDifficultySelector(false);
      setShowTutorial(false);
      setIsChallengeStarted(true);
      setIsPlaying(true); // เริ่มเล่นเมื่อเกมเริ่ม
    }
  }, [passedDifficulty, persistedActive, persistedDifficulty]);

  // Keep persistence in sync with play state
  useEffect(() => {
    try {
      if (isChallengeStarted) {
        sessionStorage.setItem('soloActive', '1');
        if (difficulty) sessionStorage.setItem('soloDifficulty', difficulty);
      } else {
        sessionStorage.removeItem('soloActive');
      }
    } catch {}
  }, [isChallengeStarted, difficulty]);

  // Track MaxDrawdown - คำนวณ MaxDrawdown แบบเรียลไทม์
  useEffect(() => {
    const currentBalance = balance + (position * currentPrice);
    
    // Track peak value
    if (currentBalance > peakValue) {
      setPeakValue(currentBalance);
      setValleyValue(currentBalance); // Reset valley when new peak is reached
    }
    
    // Track valley value (lowest after current peak)
    if (currentBalance < valleyValue) {
      setValleyValue(currentBalance);
    }
  }, [balance, position, currentPrice, peakValue, valleyValue]);

  // Update market and symbol when difficulty changes - แยกตลาดตามระดับความยาก
  useEffect(() => {
    console.log(`🏢 [MARKET] Difficulty changed to: ${difficulty}, updating market...`);
    
    if (difficulty) {
      const newMarketData = getMarketByDifficulty(difficulty);
      const newRandomStock = getRandomStockByDifficulty(difficulty);
      
      console.log(`🏢 [MARKET] Selected market for ${difficulty}:`, newMarketData.displayName);
      console.log(`🏢 [MARKET] Selected symbol: ${newRandomStock.symbol}`);
      
      setSelectedMarket(newRandomStock.market);
      setSelectedSymbol(newRandomStock.symbol);
    }
  }, [difficulty, getMarketByDifficulty, getRandomStockByDifficulty]);

  // Force mission recalculation when difficulty changes - ensure UI updates
  const [missionForceUpdate, setMissionForceUpdate] = useState(0);
  useEffect(() => {
    console.log(`🎯 [MISSION FORCE] Forcing mission update for difficulty: ${difficulty}`);
    setMissionForceUpdate(prev => prev + 1);
  }, [difficulty]);

  // Function to check if user can unlock next level
  const canUnlockNextLevel = useCallback((currentLevel, winRate) => {
    const currentLevelIndex = difficultyLevels.findIndex(level => level.id === currentLevel);
    if (currentLevelIndex === -1) return false; // Unknown level
    const nextLevel = difficultyLevels[currentLevelIndex + 1];
    if (!nextLevel) return false; // Already at max level
    const currentLevelData = difficultyLevels[currentLevelIndex];
    if (!currentLevelData) return false;
    return winRate >= (currentLevelData.minWinRate ?? 100);
  }, [difficultyLevels]);

  // Function to save progress after challenge completion
  const saveProgressAfterChallenge = useCallback(async (won, victoryData = null) => {
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ No authenticated user found for saving progress');
      return;
    }

    console.log('� Saving challenge progress...', { won, difficulty });

    try {
      // Calculate game session score based on victory conditions or use default
      const sessionScore = victoryData ? 
        Math.round(victoryData.scoreRate * 1000) : 
        (won ? 500 : 100); // Fallback scoring: 500 for win, 100 for loss
      // Get current user data first
      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const currentUserData = userDoc.exists() ? userDoc.data() : {};
      const newTotalChallenges = userProgress.totalChallenges + 1;
      const wins = Math.round((userProgress.winRate / 100) * userProgress.totalChallenges) + (won ? 1 : 0);
      const newWinRate = (wins / newTotalChallenges) * 100;
      
      // Update Solo game statistics (removed unused scoreboard fields)  
      const currentTotalScore = currentUserData.totalScore || 0;
      const currentTotalGames = currentUserData.gamesPlayed || 0;
      const currentTotalWins = currentUserData.gamesWon || 0;
      
      // Only keep variables that are actually used
      const newTotalGames = currentTotalGames + 1;
      const newTotalWins = currentTotalWins + (won ? 1 : 0);
      const newTotalScore = currentTotalScore + sessionScore;
      
      let newCompletedLevels = [...userProgress.completedLevels];
      let newCurrentLevel = userProgress.currentLevel;
      let newEarnedNicknames = [...userProgress.earnedNicknames];
      let newCurrentNickname = userProgress.currentNickname;
      let newUnlockedLevels = [...(userProgress.unlockedLevels || ['easy'])];
      
      // Check if current level is completed and can progress
      if (won && !newCompletedLevels.includes(difficulty)) {
        console.log(`🎯 Level "${difficulty}" completed! Unlocking next level...`);
        console.log('🔧 Before unlock - newCompletedLevels:', newCompletedLevels);
        console.log('🔧 Before unlock - newUnlockedLevels:', newUnlockedLevels);
        
        newCompletedLevels.push(difficulty);
        
        // Award nickname for completing this level
        const levelNickname = getNicknameByLevel(difficulty);
        if (levelNickname && !newEarnedNicknames.includes(difficulty)) {
          newEarnedNicknames.push(difficulty);
        }
        
        // Update current nickname to the highest earned
        newCurrentNickname = getHighestNickname(newCompletedLevels);
        
        // Auto-unlock next level when completing current level
        const levelOrder = ['easy', 'medium', 'hard', 'expert'];
        const currentIndex = levelOrder.indexOf(difficulty);
        
        console.log(`🔧 Current level "${difficulty}" index:`, currentIndex);
        
        if (currentIndex >= 0 && currentIndex < levelOrder.length - 1) {
          const nextLevel = levelOrder[currentIndex + 1];
          
          console.log(`🔧 Next level to unlock: "${nextLevel}"`);
          
          if (!newUnlockedLevels.includes(nextLevel)) {
            newUnlockedLevels.push(nextLevel);
            console.log(`✅ Successfully unlocked level: ${nextLevel.toUpperCase()}`);
            
            // แสดงการแจ้งเตือนการปลดล็อค
            if (typeof window !== 'undefined' && window.showToast) {
              window.showToast(`🎉 ปลดล็อคระดับ ${nextLevel.toUpperCase()} แล้ว!`, 'success');
            }
          } else {
            console.log(`🔧 Level "${nextLevel}" already unlocked`);
          }
        }
        
        console.log('🔧 After unlock - newCompletedLevels:', newCompletedLevels);
        console.log('🔧 After unlock - newUnlockedLevels:', newUnlockedLevels);
        
        // Check if can unlock next level (additional check with win rate)
        if (canUnlockNextLevel(difficulty, newWinRate)) {
          const currentIndex = difficultyLevels.findIndex(level => level.id === difficulty);
          const nextLevel = difficultyLevels[currentIndex + 1];
          if (nextLevel) {
            newCurrentLevel = nextLevel.id;
          }
        }
      }

      const updatedProgress = {
        currentLevel: newCurrentLevel,
        completedLevels: newCompletedLevels,
        totalChallenges: newTotalChallenges,
        winRate: newWinRate,
        earnedNicknames: newEarnedNicknames,
        currentNickname: newCurrentNickname,
        unlockedLevels: newUnlockedLevels
      };

      // Update Firebase with all necessary fields
      const updateData = {
        // Solo Challenge specific fields
        soloCurrentLevel: newCurrentLevel || 'easy',
        soloCompletedLevels: newCompletedLevels || [],
        soloTotalChallenges: newTotalChallenges || 0,
        soloWinRate: newWinRate || 0,
        soloUnlockedLevels: newUnlockedLevels || ['easy'],
        soloEarnedNicknames: newEarnedNicknames || [],
        
        // Overall statistics
        totalScore: newTotalScore || 0,
        gamesPlayed: newTotalGames || 0,
        gamesWon: newTotalWins || 0,
        
        // Update last played timestamp
        lastPlayedSolo: new Date(),
        lastUpdated: new Date()
      };
      
      console.log('💾 Saving to Firebase...');
      console.log('💾 Data to save:', {
        completedLevels: newCompletedLevels,
        unlockedLevels: newUnlockedLevels,
        currentLevel: newCurrentLevel
      });
      
      await updateDoc(userRef, updateData);
      console.log('✅ Progress saved successfully!');
      
      setUserProgress(updatedProgress);
      
      // Force refresh ข้อมูลจาก Firebase เพื่อให้แน่ใจว่าได้ข้อมูลล่าสุด
      setTimeout(async () => {
        try {
          console.log('🔄 Refreshing data from Firebase...');
          const freshUserDoc = await getDoc(userRef);
          if (freshUserDoc.exists()) {
            const freshData = freshUserDoc.data();
            
            console.log('🔄 Fresh data from Firebase:', {
              completedLevels: freshData.soloCompletedLevels,
              unlockedLevels: freshData.soloUnlockedLevels
            });
            
            // อัปเดต userProgress ด้วยข้อมูลล่าสุด
            const refreshedProgress = {
              ...updatedProgress,
              unlockedLevels: freshData.soloUnlockedLevels || ['easy'],
              completedLevels: freshData.soloCompletedLevels || []
            };
            
            console.log('🔄 Setting refreshed progress:', refreshedProgress);
            setUserProgress(refreshedProgress);
            
            // Force re-render component ที่ใช้ userProgress
            setUserProgress(prev => ({ ...prev }));
            
            console.log('✅ Data refreshed successfully, ready to navigate back');
          }
        } catch (refreshError) {
          console.error('❌ Error refreshing Firebase data:', refreshError);
        }
      }, 1000); // รอ 1 วินาทีเพื่อให้ Firebase sync เสร็จ
      
      // Show success message
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(`คะแนนถูกบันทึกแล้ว! +${sessionScore} คะแนน`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Error saving progress:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Show error message
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('เกิดข้อผิดพลาดในการบันทึกคะแนน', 'error');
      }
    }
  }, [userProgress, difficulty, difficultyLevels, canUnlockNextLevel]);

  // Function to save individual game history record
  const saveGameHistory = useCallback(async (gameData) => {
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ No authenticated user found for saving game history');
      return;
    }

    try {
      // Create game history record with safe data validation
      const gameHistoryData = {
        gameSessionId: gameSessionId, // เพิ่ม session ID เพื่อแยกรอบการเล่น
        gameStartTime: gameStartTime, // เพิ่มเวลาเริ่มเกม
        userId: user.uid,
        gameType: 'solo',
        result: gameData.won ? 'win' : 'lose',
        score: Number(gameData.totalReturn) || 0,
        profit: Number(gameData.totalReturn) || 0,
        profitPercentage: Number(gameData.returnPercentage) || 0,
        finalBalance: Number(gameData.finalBalance) || 10000,
        difficulty: gameData.difficulty || difficulty || 'medium',
        market: selectedMarket || getMarketByDifficulty(difficulty)?.market || 'SET',
        stockSymbol: selectedSymbol || '',
        timeUsed: Number(gameData.timeUsed) || 0,
        timeRemaining: Number(remainingTime) || 0,
        totalTrades: Number(gameData.trades) || (tradeHistory ? tradeHistory.length : 0),
        tradeHistory: (tradeHistory || []).map(trade => ({
          type: String(trade.type || ''),
          amount: Number(trade.amount) || 0,
          price: Number(trade.price) || 0,
          profit: Number(trade.profit) || 0,
          timestamp: trade.timestamp ? new Date(trade.timestamp).toISOString() : new Date().toISOString()
        })),
        missions: Array.isArray(gameData.missions) ? gameData.missions : [],
        completedMissions: Number(gameData.completedMissions) || 0,
        totalMissions: Number(gameData.totalMissions) || 0,
        completionRate: Number(gameData.completionRate) || 0,
        winStreak: Number(gameData.winStreak) || 0,
        newRecord: Boolean(gameData.newRecord),
        createdAt: serverTimestamp(),
        date: new Date().toISOString()
      };
      // Save to game history collection
      await addDoc(collection(firestore, 'gameHistory'), gameHistoryData);
      
      // ตรวจสอบ achievements ใหม่หลังจบเกม solo
      try {
        const { checkAchievementsAfterGame } = await import('../utils/achievementSystem');
        const newAchievements = await checkAchievementsAfterGame(user.uid);
        if (newAchievements.length > 0) {
          console.log('🏆 New achievements unlocked in solo game:', newAchievements.map(a => a.name).join(', '));
        }
      } catch (achievementError) {
        console.error('Error checking achievements after solo game:', achievementError);
      }
      
    } catch (error) {
      console.error('❌ Error saving game history:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    }
  }, [remainingTime, tradeHistory, difficulty, selectedMarket, selectedSymbol, getMarketByDifficulty, gameSessionId, gameStartTime]);

  // Handle tutorial completion
  const handleTutorialComplete = (unlockedLevels, recommendedStartLevel) => {
    // Award tutorial nickname
    const tutorialNickname = getNicknameByLevel('tutorial');
    const newEarnedNicknames = tutorialNickname ? ['tutorial'] : [];
    const newCurrentNickname = tutorialNickname;
    
    setUserProgress(prev => ({
      ...prev,
      unlockedLevels: unlockedLevels,
      completedLevels: ['tutorial'], // Mark tutorial as completed
      earnedNicknames: newEarnedNicknames,
      currentNickname: newCurrentNickname,
      recommendedStartLevel: recommendedStartLevel // เพิ่มข้อมูลระดับที่แนะนำ
    }));
    setIsNewUser(false);
    setShowTutorial(false);
    setShowDifficultySelector(true);
    
    // Save to Firebase
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(firestore, 'users', user.uid);
      updateDoc(userRef, {
        soloUnlockedLevels: unlockedLevels,
        tutorialCompleted: true, // บันทึกว่าทำ Tutorial เสร็จแล้ว
        soloCompletedLevels: ['tutorial'],
        soloEarnedNicknames: newEarnedNicknames,
        recommendedStartLevel: recommendedStartLevel // บันทึกระดับที่แนะนำ
      });
    }
  };

  // Function to refresh user data from Firebase
  const handleRefreshUserData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        const earnedNicknames = userData.soloEarnedNicknames || [];
        const currentNickname = getHighestNickname(userData.soloCompletedLevels || []);
        
        // Fix unlocked levels based on completed levels - Enhanced permanent unlock system
        const completedLevels = userData.soloCompletedLevels || [];
        const fixedUnlockedLevels = fixUnlockedLevels(userData.soloUnlockedLevels, completedLevels);

        const refreshedProgress = {
          currentLevel: userData.soloCurrentLevel || 'easy',
          completedLevels: userData.soloCompletedLevels || [],
          totalChallenges: userData.soloTotalChallenges || 0,
          winRate: userData.soloWinRate || 0,
          unlockedLevels: fixedUnlockedLevels,
          earnedNicknames,
          currentNickname,
          recommendedStartLevel: userData.recommendedStartLevel || 'easy',
        };
        
        setUserProgress(refreshedProgress);
        
        // แสดงข้อความแจ้งเตือน
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast('🔄 รีเฟรชข้อมูลเรียบร้อย', 'success');
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('❌ เกิดข้อผิดพลาดในการรีเฟรชข้อมูล', 'error');
      }
    }
  }, [fixUnlockedLevels]);

  // Simple and clear trading hints as list
  const generateHint = useCallback(() => {
    if (!chartData || chartData.length < 10) return null;
    
    const recentData = chartData.slice(-10);
    const latestPrice = recentData[recentData.length - 1]?.close;
    const previousPrice = recentData[recentData.length - 2]?.close;
    const trend = recentData.slice(-5);
    
    if (!latestPrice || !previousPrice) return null;

    const priceChange = ((latestPrice - previousPrice) / previousPrice) * 100;
    const isUptrend = trend.every((point, index) => 
      index === 0 || point.close >= trend[index - 1].close
    );
    const isDowntrend = trend.every((point, index) => 
      index === 0 || point.close <= trend[index - 1].close
    );

    // Calculate basic metrics with improved formatting
    const currentPnLPercent = pnl !== 0 ? formatPercentage((pnl / 1000000) * 100) : '0%';
    const positionValue = position * latestPrice;
    const unrealizedPnL = position > 0 ? formatNumber((latestPrice - entryPrice) * position) : '0';

    // Simple and clear hint suggestions as list
    const suggestions = [];
    
    // Price movement suggestions
    if (Math.abs(priceChange) > 2) {
      if (priceChange > 0) {
        suggestions.push("ราคาขึ้นแรง - พิจารณาขายเก็บกำไร");
        suggestions.push("แนวต้านอาจใกล้ - ระวังราคาพลิกกลับ");
      } else {
        suggestions.push("ราคาลงแรง - อาจมีโอกาสซื้อ");
        suggestions.push("หาแนวรับเพื่อเข้าซื้อ");
      }
    }
    
    // Position management suggestions
    if (position > 0) {
      suggestions.push(`ถือหุ้น ${formatNumber(position)} หุ้น ที่ราคา ${formatPrice(entryPrice)}`);
      if (unrealizedPnL > 0) {
        suggestions.push("มีกำไรแล้ว - พิจารณาขายบางส่วน");
      } else if (unrealizedPnL < -balance * 0.05) {
        suggestions.push("ขาดทุน 5% แล้ว - ควรตั้ง Stop Loss");
      }
    }
    
    // Trend analysis suggestions
    if (isUptrend && position === 0) {
      suggestions.push("เทรนด์ขาขึ้น - พิจารณาเข้า Long");
    } else if (isDowntrend && position === 0) {
      suggestions.push("เทรนด์ขาลง - รอเทรนด์เปลี่ยนหรือหาจุดรับ");
    }
    
    // Risk management suggestions
    if (positionValue > balance * 0.8) {
      suggestions.push("ลงทุนเกิน 80% - ความเสี่ยงสูงมาก");
    }
    
    // Time management suggestions
    if (!hasAction && remainingTime && remainingTime < 120) {
      suggestions.push("เหลือเวลาน้อย - ต้องเข้าตำแหน่งแล้ว");
    }
    
    // Balance info with better formatting
    suggestions.push(`ยอดเงิน: ${formatCurrency(balance)} (P&L: ${currentPnLPercent})`);
    
    if (suggestions.length === 1) { // Only balance info
      suggestions.push("ตลาดเคลื่อนไหวน้อย - รอสัญญาณที่ชัดเจน");
    }

    return {
      text: "คำแนะนำ:\n• " + suggestions.join('\n• '),
      type: position > 0 ? "position" : "neutral",
      priority: 1
    };
  }, [chartData, pnl, position, entryPrice, balance, hasAction, remainingTime]);

  // Hint timer - show hints based on difficulty
  useEffect(() => {
    if (!isChallengeStarted) return;

    // ตรวจสอบว่าเป็นโหมด Expert หรือไม่ - ถ้าใช่ไม่ให้ hint
    const currentDifficulty = String(difficulty || 'easy').toLowerCase();
    if (currentDifficulty === 'expert') {
      return;
    }

    const intervals = {
      'easy': 60000,      // 1 minute  
      'medium': 120000,   // 2 minutes
      'hard': 300000,     // 5 minutes
    };

    const interval = intervals[currentDifficulty] || 30000;
    hintTimerRef.current = setInterval(() => {
      if (hintCount < 10) { // Limit total hints
        const hint = generateHint();
        if (hint) {
          setCurrentHint(hint);
          setShowHint(true);
          setHintCount(prev => prev + 1);
        }
      } else {
        clearInterval(hintTimerRef.current);
      }
    }, interval);

    return () => {
      if (hintTimerRef.current) {
        clearInterval(hintTimerRef.current);
      }
    };
  }, [isChallengeStarted, difficulty, hintCount, balance, pnl, position, entryPrice, currentPrice, chartData, remainingTime, hasAction, generateHint]);

  // Reset state when starting new challenge OR when difficulty changes
  useEffect(() => {
    console.log(`🔄 Resetting state for new challenge with difficulty: ${difficulty}`);
    // Random new stock based on difficulty level
    const newStock = getRandomStockByDifficulty(difficulty);
    setSelectedMarket(newStock.market);
    setSelectedSymbol(newStock.symbol);
    setBalance(1000000);
    setPosition(0);
    setEntryPrice(0);
    setCurrentPrice(0);
    setPnl(0);
    setHasAction(false);
    setTradeHistory([]);
    setHintCount(0);
    // Reset MaxDrawdown tracking
    setPeakValue(1000000);
    setValleyValue(1000000);
    
    setPlaybackTime(0); // รีเซ็ต playback time
    
    // Set time limit based on difficulty
    const levelData = difficultyLevels.find(level => level.id === difficulty);
    if (levelData) {
      setRemainingTime(levelData.timeLimit);
    }
    
    if (hintTimerRef.current) {
      clearInterval(hintTimerRef.current);
    }
  }, [difficulty, difficultyLevels, getRandomStockByDifficulty]);

  // Mission-based victory system - single function with direct calculation
  const getMissionsAndProgress = useCallback(() => {
    console.log('🎯 [getMissionsAndProgress] Current difficulty state:', difficulty);
    console.log('🎯 [getMissionsAndProgress] Function called at:', new Date().toLocaleTimeString());
    
    // Get missions from updated DIFFICULTY_LEVELS configuration
    const difficultyLevelsConfig = [
      {
        key: "easy",
        missions: [
          // { id: 'basic_trades', title: 'ทำการเทรดอย่างน้อย 8 ครั้ง', target: 8, weight: 2 },
          { id: 'easy_profit', title: 'Make at least 5% profit (50,000 baht)', target: 50000, weight: 4 }
          // { id: 'trading_consistency', title: 'เทรดได้กำไรอย่างน้อย 3 ครั้งจาก 8 ครั้ง', target: 3, weight: 2 }
        ]
      },
      {
        key: "medium",
        missions: [
          { id: 'medium_profit', title: 'Make at least 10% profit (100,000 baht)', target: 100000, weight: 4 },
          { id: 'max_drawdown', title: 'Maximum Drawdown: 20%', target: 1, weight: 3 }
        ]
      },
      {
        key: "hard",
        missions: [
          { id: 'hard_profit', title: 'Make at least 20% profit (200,000 baht)', target: 200000, weight: 5 },
          { id: 'max_drawdown_hard', title: 'Maximum Drawdown: 10%', target: 1, weight: 4 }
        ]
      },
      {
        key: "expert", 
        missions: [
          { id: 'expert_profit', title: 'Make at least 30% profit (300,000 baht)', target: 300000, weight: 6 },
          { id: 'max_drawdown_expert', title: 'Maximum Drawdown: 10%', target: 1, weight: 5 }
        ]
      }
    ];

    const currentDifficultyConfig = difficultyLevelsConfig.find(level => level.key === difficulty);
    
    // Enhanced debugging for mission selection
    console.log('🔍 [DEBUG] Current difficulty:', difficulty, typeof difficulty);
    console.log('🔍 [DEBUG] Available difficulty keys:', difficultyLevelsConfig.map(level => level.key));
    console.log('🔍 [DEBUG] Found config:', currentDifficultyConfig ? 'YES' : 'NO');
    
    if (!currentDifficultyConfig) {
      console.error('❌ [MISSION] No config found for difficulty:', difficulty);
      console.log('🔍 [DEBUG] Trying fallback logic...');
    }
    
    // Better fallback logic - try to normalize difficulty first
    let fallbackConfig = null;
    if (!currentDifficultyConfig) {
      // Try different variations
      const normalizedDifficulty = String(difficulty || 'easy').toLowerCase().trim();
      console.log('🔍 [DEBUG] Normalized difficulty:', normalizedDifficulty);
      
      fallbackConfig = difficultyLevelsConfig.find(level => level.key === normalizedDifficulty);
      
      if (!fallbackConfig) {
        console.error('❌ [MISSION] No fallback config found either, using easy');
        fallbackConfig = difficultyLevelsConfig.find(level => level.key === 'easy');
      }
    }
    
    const missions = currentDifficultyConfig ? currentDifficultyConfig.missions : fallbackConfig.missions;
    
    // Enhanced debug logging
    console.log('🔍 [DEBUG] Using missions from:', currentDifficultyConfig ? difficulty : `fallback (${fallbackConfig?.key || 'easy'})`);
    console.log('🎯 [MISSION SYSTEM] Final mission count:', missions?.length || 0);
    console.log('🎯 [MISSION SYSTEM] Final mission titles:', missions?.map(m => m.title) || []);

    // Calculate current progress for each mission based on new specification
    return (missions || []).map(mission => {
      let current = 0;
      
      switch (mission.id) {
        // Trading frequency missions (all levels)
        case 'basic_trades':
        case 'intermediate_trades':
        case 'advanced_trades':
        case 'expert_trades':
          current = tradeHistory.length;
          break;
          
        // Profit target missions - PRIMARY CHALLENGE
        case 'easy_profit':
          current = Math.max(0, pnl); // Only count profit, not losses
          break;
          
        case 'medium_profit':
          current = Math.max(0, pnl);
          break;
          
        case 'hard_profit':
          current = Math.max(0, pnl);
          break;
          
        case 'expert_profit':
          current = Math.max(0, pnl);
          break;
          
        // Loss limit missions - STRICT LIMITS
        case 'low_loss': // Easy: ไม่เกิน 3%
          const totalLossEasy = Math.abs(Math.min(pnl, 0));
          const lossPercentEasy = (totalLossEasy / 1000000) * 100;
          current = lossPercentEasy <= 3 ? 1 : 0;
          break;
          
        case 'medium_loss': // Medium: ไม่เกิน 5%
          const totalLossMedium = Math.abs(Math.min(pnl, 0));
          const lossPercentMedium = (totalLossMedium / 1000000) * 100;
          current = lossPercentMedium <= 5 ? 1 : 0;
          break;
          
        case 'strict_loss': // Hard: ไม่เกิน 7%
          const totalLossHard = Math.abs(Math.min(pnl, 0));
          const lossPercentHard = (totalLossHard / 1000000) * 100;
          current = lossPercentHard <= 7 ? 1 : 0;
          break;
          
        case 'ultra_strict_loss': // Expert: ไม่เกิน 10%
          const totalLossExpert = Math.abs(Math.min(pnl, 0));
          const lossPercentExpert = (totalLossExpert / 1000000) * 100;
          current = lossPercentExpert <= 10 ? 1 : 0;
          break;
          
        // MaxDrawdown missions - TIGHTER LIMITS
        case 'max_drawdown': // Medium: ไม่เกิน 8%
          const maxDrawdownMedium = Math.abs(((peakValue - valleyValue) / peakValue) * 100);
          current = maxDrawdownMedium <= 20 ? 1 : 0;
          break;
          
        case 'max_drawdown_hard': // Hard: ไม่เกิน 6%
          const maxDrawdownHard = Math.abs(((peakValue - valleyValue) / peakValue) * 100);
          current = maxDrawdownHard <= 10 ? 1 : 0;
          break;
          
        case 'max_drawdown_expert': // Expert: ไม่เกิน 4%
          const maxDrawdownExpert = Math.abs(((peakValue - valleyValue) / peakValue) * 100);
          current = maxDrawdownExpert <= 5 ? 1 : 0;
          break;
          
        // Win rate missions - CONSISTENCY REQUIREMENTS
        case 'trading_consistency': // Easy: 3 profitable trades out of 8
          const profitableTradesEasy = tradeHistory.filter(trade => (trade.pnl || 0) > 0).length;
          current = profitableTradesEasy;
          break;
          
        case 'win_rate': // Medium: 5 profitable trades out of 10
          const profitableTradesMedium = tradeHistory.filter(trade => (trade.pnl || 0) > 0).length;
          current = profitableTradesMedium;
          break;
          
        case 'high_win_rate': // Hard: 7 profitable trades out of 12
          const profitableTradesHard = tradeHistory.filter(trade => (trade.pnl || 0) > 0).length;
          current = profitableTradesHard;
          break;
          
        case 'expert_win_rate': // Expert: 10 profitable trades out of 15
          const profitableTradesExpert = tradeHistory.filter(trade => (trade.pnl || 0) > 0).length;
          current = profitableTradesExpert;
          break;
          
        // Profit consistency missions - ADVANCED REQUIREMENTS
        case 'profit_consistency': // Hard: Average 6,000+ profit per trade
          if (tradeHistory.length > 0) {
            const totalTradeProfit = tradeHistory.reduce((sum, trade) => sum + Math.max(0, trade.pnl || 0), 0);
            const avgProfitPerTrade = totalTradeProfit / tradeHistory.length;
            current = avgProfitPerTrade;
          }
          break;
          
        case 'high_profit_consistency': // Expert: Average 8,000+ profit per trade
          if (tradeHistory.length > 0) {
            const totalTradeProfit = tradeHistory.reduce((sum, trade) => sum + Math.max(0, trade.pnl || 0), 0);
            const avgProfitPerTrade = totalTradeProfit / tradeHistory.length;
            current = avgProfitPerTrade;
          }
          break;
          
        // Risk management mission - EXPERT ONLY
        case 'risk_management_expert': // No more than 3 consecutive losses
          let maxConsecutiveLosses = 0;
          let currentConsecutiveLosses = 0;
          
          for (const trade of tradeHistory) {
            if ((trade.pnl || 0) < 0) {
              currentConsecutiveLosses++;
              maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
            } else {
              currentConsecutiveLosses = 0;
            }
          }
          
          current = maxConsecutiveLosses <= 3 ? 1 : 0;
          break;
          
        // Achievement/Title missions - ONLY AWARDED WHEN OTHER MISSIONS COMPLETE
        case 'investor_level':
        case 'analyst_level':
        case 'speculator_level':
        case 'master_level':
          // These are only earned when enough other missions are completed
          // Check if at least 75% of other missions are completed
          const otherMissions = currentDifficultyConfig.missions.filter(m => !m.id.includes('_level'));
          const completedMissions = otherMissions.filter(m => {
            // Simplified check: if it's a binary mission (target = 1), check if conditions would be met
            // For numeric missions, check if we're close to target
            switch (m.id) {
              case 'low_loss':
                const lossEasy = Math.abs(Math.min(pnl, 0)) / 10000;
                return lossEasy <= 3;
              case 'medium_loss':
                const lossMedium = Math.abs(Math.min(pnl, 0)) / 10000;
                return lossMedium <= 5;
              case 'strict_loss':
                const lossHard = Math.abs(Math.min(pnl, 0)) / 10000;
                return lossHard <= 7;
              case 'ultra_strict_loss':
                const lossExpert = Math.abs(Math.min(pnl, 0)) / 10000;
                return lossExpert <= 10;
              default:
                return false; // For now, require explicit completion
            }
          }).length;
          
          current = completedMissions >= Math.ceil(otherMissions.length * 0.75) ? 1 : 0;
          break;
          
        default:
          current = 0;
      }

      const isCompleted = current >= mission.target;
      
      // Special handling for binary missions that should show "Failed" instead of 0%
      const isBinaryMission = mission.target === 1 && ['low_loss', 'medium_loss', 'strict_loss', 'ultra_strict_loss', 
                                                       'max_drawdown', 'max_drawdown_hard', 'max_drawdown_expert',
                                                       'risk_management_expert', 'investor_level', 'analyst_level', 
                                                       'speculator_level', 'master_level'].includes(mission.id);
      const showAsFailed = isBinaryMission && !isCompleted && current === 0;
      
      return {
        ...mission,
        current,
        isCompleted,
        showAsFailed, // New flag to indicate this should show as "Failed"
        progress: isCompleted ? mission.target : Math.min(current, mission.target)
      };
    });
  }, [difficulty, tradeHistory, pnl, peakValue, valleyValue]); // เอา dependencies ที่ไม่จำเป็นออก

  // Memoized missions data with force update capability
  const currentMissions = useMemo(() => {
    console.log('🔄 [CURRENT MISSIONS] Recalculating missions with difficulty:', difficulty);
    console.log('🔄 [CURRENT MISSIONS] Force update flag:', missionForceUpdate);
    const missions = getMissionsAndProgress();
    console.log('🔄 [CURRENT MISSIONS] Got missions:', missions.length, 'for difficulty:', difficulty);
    console.log('🔄 [CURRENT MISSIONS] Mission titles:', missions.map(m => m.title));
    return missions;
  }, [getMissionsAndProgress, difficulty, missionForceUpdate]); // เพิ่ม missionForceUpdate

  // Calculate victory based on mission completion
  const calculateVictoryConditions = useCallback(() => {
    const missions = currentMissions || [];
    let totalScore = 0;
    let maxScore = 0;
    let completedMissions = 0;

    missions.forEach(mission => {
      const progress = Math.min((mission.current || 0) / (mission.target || 1), 1);
      const isComplete = progress >= 1;
      
      if (isComplete) completedMissions++;
      
      totalScore += progress * (mission.weight || 1);
      maxScore += (mission.weight || 1);
    });

    const completionRate = missions.length > 0 ? completedMissions / missions.length : 0;
    const scoreRate = maxScore > 0 ? totalScore / maxScore : 0;

    // Victory conditions based on difficulty with different mission requirements
    let victoryThresholds;
    
    switch (difficulty) {
      case 'easy':
        // Easy: Complete 2 out of 4 missions (50%) with moderate performance
        victoryThresholds = { minCompletions: 0.5, minScore: 0.4 };
        break;
      case 'medium':
        // Medium: Complete 3 out of 5 missions (60%) with good performance  
        victoryThresholds = { minCompletions: 0.6, minScore: 0.5 };
        break;
      case 'hard':
        // Hard: Complete 4 out of 6 missions (67%) with strong performance
        victoryThresholds = { minCompletions: 0.67, minScore: 0.6 };
        break;
      case 'expert':
        // Expert: Complete 5 out of 7 missions (71%) with excellent performance
        victoryThresholds = { minCompletions: 0.71, minScore: 0.7 };
        break;
      default:
        victoryThresholds = { minCompletions: 0.6, minScore: 0.5 };
    }

    const won = completedMissions >= Math.ceil(missions.length * victoryThresholds.minCompletions) && 
                scoreRate >= victoryThresholds.minScore;

    return {
      won,
      missions,
      completedMissions,
      totalMissions: missions.length,
      completionRate,
      scoreRate,
      totalScore,
      maxScore,
      requiredMissions: Math.ceil(missions.length * victoryThresholds.minCompletions),
      difficultyLevel: difficulty
    };
  }, [currentMissions, difficulty]);

  // Handle challenge completion with mission-based system
  const handleChallengeEnd = useCallback(async () => {
    setIsChallengeStarted(false);
    setIsPlaying(false); // หยุดการเล่นเมื่อเกมจบ
    
    // Calculate final P&L (still needed for statistics)
    const finalBalance = balance + (position * currentPrice);
    const totalPnL = finalBalance - 1000000;
    const pnlPercentage = (totalPnL / 1000000) * 100;
    // Get current level data
    const currentLevel = difficultyLevels.find(l => l.id === difficulty);
    const timeUsed = (currentLevel?.timeLimit || 300) - remainingTime;
    
    // NEW: Mission-based victory calculation
    const victoryData = calculateVictoryConditions();
    const won = victoryData?.won || false;
    // Check for new personal best (P&L still matters for records)
    const newRecord = personalBest < totalPnL;
    if (newRecord) {
      setPersonalBest(totalPnL);
    }
    
    // Update win streak
    if (won) {
      setWinStreak(prev => prev + 1);
    } else {
      setWinStreak(0);
    }
    
    // Prepare result data for modal with mission details
    const resultData = {
      won,
      totalReturn: totalPnL,
      returnPercentage: pnlPercentage,
      finalBalance,
      difficulty: currentLevel?.name || difficulty,
      timeUsed,
      trades: tradeHistory.length,
      winStreak: won ? winStreak + 1 : 0,
      newRecord,
      // NEW: Mission-based victory data
      missions: victoryData?.missions || [],
      completedMissions: victoryData?.completedMissions || 0,
      totalMissions: victoryData?.totalMissions || 0,
      completionRate: victoryData?.completionRate || 0,
      scoreRate: victoryData?.scoreRate || 0,
      victoryType: 'mission-based' // Flag to identify new system
    };
    
    setGameResult(resultData);
    setShowResultModal(true);
    // Save progress with victory data
    await saveProgressAfterChallenge(won, victoryData);
    
    // Save individual game history record
    await saveGameHistory(resultData);
    // Reset for next challenge
    setBalance(1000000);
    setPosition(0);
    setEntryPrice(0);
    setPnl(0);
    setHasAction(false);
    setTradeHistory([]);
    setHintCount(0);
    setPlaybackTime(0);
    // Reset MaxDrawdown tracking
    setPeakValue(1000000);
    setValleyValue(1000000);
    
    // Reset time
    const levelData = difficultyLevels.find(level => level.id === difficulty);
    if (levelData) {
      setRemainingTime(levelData.timeLimit);
    }
  }, [balance, position, currentPrice, difficulty, difficultyLevels, remainingTime, tradeHistory, personalBest, winStreak, saveProgressAfterChallenge, calculateVictoryConditions, saveGameHistory]);

  // New handler functions for improved UI
  // eslint-disable-next-line no-unused-vars
  const handleTrade = useCallback((type, quantity, price) => {
    if (type === 'buy') {
      const cost = quantity * price;
      if (cost <= balance) {
        setBalance(prev => prev - cost);
        setPosition(prev => prev + quantity);
        setEntryPrice(price);
        setHasAction(true);
        
        // Add to trade history
        setTradeHistory(prev => [...prev, {
          type: 'buy',
          symbol: selectedSymbol,
          quantity,
          price,
          timestamp: Date.now(),
          pnl: 0
        }]);

        // Positions tracking removed for simplified UI
      }
    } else if (type === 'sell') {
      if (quantity <= position) {
        const revenue = quantity * price;
        const profit = (price - entryPrice) * quantity;
        
        setBalance(prev => prev + revenue);
        setPosition(prev => prev - quantity);
        setPnl(prev => prev + profit);
        setHasAction(true);
        
        // Add to trade history
        setTradeHistory(prev => [...prev, {
          type: 'sell',
          symbol: selectedSymbol,
          quantity,
          price,
          timestamp: Date.now(),
          pnl: profit
        }]);

        // Positions tracking removed for simplified UI
      }
    }
  }, [balance, position, entryPrice, selectedSymbol]);

  // Update positions P/L when price changes - commented out for simplified UI
  // useEffect(() => {
  //   if (currentPrice > 0) {
  //     setPositions(prev => prev.map(position => ({
  //       ...position,
  //       currentPrice,
  //       unrealizedPnL: (currentPrice - position.avgPrice) * position.quantity
  //     })));
  //   }
  // }, [currentPrice]);

  // Timer management
  useEffect(() => {
    let timerId;
    
    if (isChallengeStarted && remainingTime > 0) {
      timerId = setInterval(() => {
        // ไม่อัปเดตเวลาถ้าเกมถูก pause
        if (isPaused) {
          console.log('⏰ [TIMER] Skipping timer update - game is paused');
          return;
        }
        
        setRemainingTime(prev => {
          // หยุดการลดเวลาถ้าเกม pause
          if (isPaused) {
            console.log('⏰ [TIMER] Skipping time countdown - game is paused');
            return prev; // ไม่ลดเวลา
          }
          
          const newTime = prev - 1;
          
          // อัปเดต playbackTime เพื่อให้กราฟเลื่อนไปตามเวลา (เฉพาะเมื่อไม่ pause)
          if (!isPaused && isPlaying) {
            const totalTime = difficultyLevels.find(l => l.id === difficulty)?.timeLimit || 300;
            const elapsed = totalTime - newTime;
            
            // แปลงเวลาเป็น index ของข้อมูล (สมมติข้อมูล 1000 จุด ใน totalTime วินาที)
            const dataPoints = 1000;
            const progressRatio = elapsed / totalTime;
            const currentIndex = Math.floor(progressRatio * dataPoints);
            
            setPlaybackTime(Math.min(currentIndex, dataPoints - 1));
            console.log(`⏰ [TIMER] Updated playbackTime: ${Math.min(currentIndex, dataPoints - 1)}`);
          } else {
            console.log('⏰ [TIMER] Skipping playbackTime update - paused or not playing');
          }
          
          // Challenge ended - calculate results
          if (newTime <= 0) {
            handleChallengeEnd();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [isChallengeStarted, remainingTime, difficulty, difficultyLevels, handleChallengeEnd, isPaused, isPlaying]);

  // Trading functions
  const handleBuy = (shares) => {
    if (shares * currentPrice <= balance) {
      const cost = shares * currentPrice;
      setBalance(prev => prev - cost);
      setPosition(prev => prev + shares);
      setEntryPrice(currentPrice);
      setHasAction(true);
      
      setTradeHistory(prev => [...prev, {
        type: 'BUY',
        shares,
        price: currentPrice,
        timestamp: Date.now()
      }]);
    }
  };

  const handleSell = (shares) => {
    if (shares <= position) {
      const revenue = shares * currentPrice;
      setBalance(prev => prev + revenue);
      setPosition(prev => prev - shares);
      
      // Calculate P&L
      const profit = (currentPrice - entryPrice) * shares;
      setPnl(prev => prev + profit);
      setHasAction(true);
      
      setTradeHistory(prev => [...prev, {
        type: 'SELL',
        shares,
        price: currentPrice,
        timestamp: Date.now()
      }]);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleSellAll = () => {
    if (position > 0) {
      const revenue = position * currentPrice;
      setBalance(prev => prev + revenue);
      
      // Calculate P&L
      const profit = (currentPrice - entryPrice) * position;
      setPnl(prev => prev + profit);
      setHasAction(true);
      
      setTradeHistory(prev => [...prev, {
        type: 'SELL_ALL',
        shares: position,
        price: currentPrice,
        timestamp: Date.now()
      }]);
      
      setPosition(0);
      setEntryPrice(0);
    }
  };
  
  // eslint-disable-next-line no-unused-vars
  const isLevelUnlocked = useCallback((levelId, index) => {
    if (index === 0) return true; // Easy is always unlocked
    
    const previousLevel = difficultyLevels[index - 1];
    if (!previousLevel) return false;
    
    return userProgress.completedLevels.includes(previousLevel.id);
  }, [userProgress.completedLevels, difficultyLevels]);
  
  // Game Result Modal handlers
  const handlePlayAgain = useCallback(() => {
    console.log('🔄 Starting new game session...');
    
    // Create new game session
    const newSessionId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setGameSessionId(newSessionId);
    setGameStartTime(new Date().toISOString());
    
    console.log('🆕 New game session ID:', newSessionId);
    
    setShowResultModal(false);
    setGameResult(null);
    
    // Reset game state completely
    setBalance(1000000);
    setPosition(0);
    setEntryPrice(0);
    setPnl(0);
    setHasAction(false);
    setTradeHistory([]);
    // setPositions([]); // Commented out for simplified UI
    setLimitOrders([]);
    // Reset MaxDrawdown tracking
    setPeakValue(1000000);
    setValleyValue(1000000);
    setPlaybackTime(0);
    setIsPlaying(true); // เริ่มเล่นใหม่
    
    // Reset challenge state
    setIsChallengeStarted(true); // เริ่มเกมใหม่ทันที
    
    const levelData = difficultyLevels.find(level => level.id === difficulty);
    if (levelData) {
      setRemainingTime(levelData.timeLimit);
    }
    
    console.log('✅ New game session started successfully');
  }, [difficulty, difficultyLevels]);

  const handleBackToHome = useCallback(async () => {
    setShowResultModal(false);
    setGameResult(null);
    
    // Force refresh user data before going back to selector
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          const earnedNicknames = userData.soloEarnedNicknames || [];
          const currentNickname = getHighestNickname(userData.soloCompletedLevels || []);
          
          // Fix unlocked levels based on completed levels - Enhanced permanent unlock system
          const completedLevels = userData.soloCompletedLevels || [];
          const fixedUnlockedLevels = fixUnlockedLevels(userData.soloUnlockedLevels, completedLevels);

          const refreshedProgress = {
            currentLevel: userData.soloCurrentLevel || 'easy',
            completedLevels: userData.soloCompletedLevels || [],
            totalChallenges: userData.soloTotalChallenges || 0,
            winRate: userData.soloWinRate || 0,
            unlockedLevels: fixedUnlockedLevels,
            earnedNicknames,
            currentNickname,
            recommendedStartLevel: userData.recommendedStartLevel || 'easy',
          };
          
          setUserProgress(refreshedProgress);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing data for selector:', error);
    }
    
    // Reset game state
    setIsChallengeStarted(false);
    setIsPlaying(false);
    setShowDifficultySelector(true);
    
    // Clear session storage
    try {
      sessionStorage.removeItem('soloActive');
      sessionStorage.removeItem('soloDifficulty');
    } catch {}
    
    // Navigate back to challenge selection page
    console.log('🏠 Navigating back to challenge selection...');
    navigate('/challenge');
  }, [fixUnlockedLevels, navigate]);
  
  const handleLevelSelect = useCallback(async (levelId) => {
    console.log(`🎯 [LEVEL SELECT] handleLevelSelect called with levelId: ${levelId}`);
    console.log(`🎮 [LEVEL SELECT] isChallengeStarted: ${isChallengeStarted}`);
    
    if (isChallengeStarted) {
      console.log('❌ [LEVEL SELECT] Challenge already started, ignoring level select');
      return;
    }
    
    console.log(`✅ [LEVEL SELECT] Starting level: ${levelId} (All levels unlocked)`);
    console.log(`🔧 [DIFFICULTY] Setting difficulty via handleLevelSelect:`, levelId);
    
    // ระบบการล็อคด่านถูกปิดแล้ว - ไม่ต้องตรวจสอบการปลดล็อคใน Firebase
    console.log(`🔓 [LEVEL SELECT] All levels are always unlocked - no Firebase check needed`);
    
    setDifficulty(levelId);
    
    // The useEffect hook that depends on [difficulty] will now handle resetting the game state.
    // This prevents race conditions and ensures state is reset correctly.
    
    // Save to session storage
    try {
      sessionStorage.setItem('soloSelectedDifficulty', levelId);
      sessionStorage.setItem('soloDifficulty', levelId);
      sessionStorage.setItem('soloActive', '1'); // Mark as active
    } catch (error) {
      console.error('Failed to save to session storage:', error);
    }
    
    // Start the game with new session
    console.log(`🚀 Starting game for level: ${levelId}`);
    
    // Create new game session
    const newSessionId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setGameSessionId(newSessionId);
    setGameStartTime(new Date().toISOString());
    
    console.log('🆕 New game session created:', newSessionId);
    
    setShowDifficultySelector(false);
    setIsChallengeStarted(true);
    setIsPlaying(true);
  }, [isChallengeStarted]);

  // Limit order functions
  // eslint-disable-next-line no-unused-vars
  const placeLimitOrder = useCallback((order) => {
    const newOrder = {
      ...order,
      id: nextOrderId,
      status: 'PENDING',
      timestamp: Date.now()
    };
    
    setLimitOrders(prev => [...prev, newOrder]);
    setNextOrderId(prev => prev + 1);
    
    // Reserve money for buy orders
    if (order.type === 'BUY') {
      const cost = order.shares * order.limitPrice;
      if (cost <= balance) {
        setBalance(prev => prev - cost);
      }
    }
  }, [nextOrderId, balance]);
  
  // Log function availability for future implementation
  // eslint-disable-next-line no-unused-vars
  const cancelLimitOrder = useCallback((orderId) => {
    const orderToCancel = limitOrders.find(order => order.id === orderId);
    
    if (orderToCancel) {
      // Return reserved money for buy orders
      if (orderToCancel.type === 'BUY' && orderToCancel.status === 'PENDING') {
        const refund = orderToCancel.shares * orderToCancel.limitPrice;
        setBalance(prev => prev + refund);
      }
      
      setLimitOrders(prev => prev.filter(order => order.id !== orderId));
    }
  }, [limitOrders]);
  
  // Log function availability for future implementation
  // Check and execute limit orders
  const checkLimitOrders = useCallback(() => {
    const pendingOrders = limitOrders.filter(order => order.status === 'PENDING');
    
    pendingOrders.forEach(order => {
      let shouldExecute = false;

      if (order.type === 'BUY' && currentPrice <= order.limitPrice) {
        shouldExecute = true;
      } else if (order.type === 'SELL' && currentPrice >= order.limitPrice) {
        // Check if we have enough shares to sell
        if (order.shares <= position) {
          shouldExecute = true;
        }
      }

      if (shouldExecute) {
        // Execute the order
        if (order.type === 'BUY') {
          // Money already reserved, just add position
          setPosition(prev => prev + order.shares);
          setEntryPrice(order.limitPrice);
        } else if (order.type === 'SELL') {
          // Add money and reduce position
          const revenue = order.shares * order.limitPrice;
          setBalance(prev => prev + revenue);
          setPosition(prev => prev - order.shares);
          
          // Calculate P&L
          const profit = (order.limitPrice - entryPrice) * order.shares;
          setPnl(prev => prev + profit);
        }

        setHasAction(true);
        
        // Add to trade history
        setTradeHistory(prev => [...prev, {
          type: order.type,
          shares: order.shares,
          price: order.limitPrice,
          timestamp: Date.now(),
          isLimitOrder: true
        }]);

        // Mark order as executed
        setLimitOrders(prev => prev.map(o => 
          o.id === order.id ? { ...o, status: 'EXECUTED' } : o
        ));
      }
    });
  }, [limitOrders, currentPrice, position, entryPrice]);

  // Check limit orders when price changes
  useEffect(() => {
    if (currentPrice > 0) {
      checkLimitOrders();
    }
  }, [currentPrice, limitOrders, position, balance, checkLimitOrders]);

  // Smart recommendation calculation for stock quantity
  const calculateRecommendedShares = useCallback((type = 'buy') => {
    if (currentPrice <= 0) return 0;
    
    const difficultyMultiplier = {
      'easy': 0.15,     // 15% of balance for conservative approach
      'medium': 0.12,   // 12% of balance for moderate approach  
      'hard': 0.10,     // 10% of balance for aggressive approach
      'expert': 0.08    // 8% of balance for expert approach (more cautious)
    };
    
    const multiplier = difficultyMultiplier[difficulty] || 0.10;
    
    if (type === 'buy') {
      // For buying: calculate based on available balance
      const recommendedValue = balance * multiplier;
      const recommendedShares = Math.floor(recommendedValue / currentPrice);
      return Math.max(1, recommendedShares); // At least 1 share
    } else {
      // For selling: recommend partial position (50% by default)
      return Math.floor(position * 0.5);
    }
  }, [balance, currentPrice, difficulty, position]);

  // HintPopup Component
  const HintPopup = ({ hint, onClose }) => {
    if (!hint) return null;

    const getHintColor = (type) => {
      switch (type) {
        case 'bullish': return 'border-green-400 bg-green-900/20';
        case 'bearish': return 'border-red-400 bg-red-900/20';
        case 'warning': return 'border-yellow-400 bg-yellow-900/20';
        case 'urgent': return 'border-orange-400 bg-orange-900/20';
        case 'position': return 'border-blue-400 bg-blue-900/20';
        default: return 'border-gray-400 bg-gray-900/20';
      }
    };

    const getHintIcon = (type) => {
      switch (type) {
        case 'bullish': return '📈';
        case 'bearish': return '📉';
        case 'warning': return '⚠️';
        case 'urgent': return '⏰';
        case 'position': return '📊';
        default: return '💡';
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className={`relative max-w-lg w-full mx-4 rounded-2xl border-2 ${getHintColor(hint.type)} backdrop-blur-md shadow-2xl animate-bounce`}>
          <div className="bg-[#1a1f2e]/95 rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getHintIcon(hint.type)}</span>
                <h3 className="text-xl font-bold text-white">คำแนะนำการเทรด</h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="text-gray-200 leading-relaxed whitespace-pre-line text-base">
              {hint.text}
            </div>
            
            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
              >
                เข้าใจแล้ว ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 relative overflow-hidden">
      {/* Animated Background Elements */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      {/* Content Container */}
      <div className="relative z-10 min-h-screen overflow-y-auto scrollbar-thin">
        <GameHeader 
          showBackButton={true}
          backPath={showDifficultySelector || showTutorial ? "/solo" : "/solo"}
          showHomeButton={true}
        />
      
      {/* Show Tutorial Pretest */}
      {showTutorial && (
        <TutorialPretestSystem
          onBack={() => {
            if (isNewUser) {
              // ผู้ใช้ใหม่ไม่สามารถกลับได้ ต้องทำ Tutorial ให้เสร็จ
              return;
            } else {
              setShowTutorial(false);
              setShowDifficultySelector(true);
            }
          }}
          onTutorialComplete={handleTutorialComplete}
          isNewUser={isNewUser}
        />
      )}
      
      {/* Show Difficulty Selector */}
      {showDifficultySelector && !showTutorial && (
        <div className="min-h-screen pt-20 pb-8 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Enhanced Background Card */}
            <div className="bg-gradient-to-br from-slate-900/90 via-blue-900/80 to-purple-900/90 backdrop-blur-xl border border-gray-600/30 rounded-3xl p-8 shadow-2xl">
              <SoloDifficultySelector
                onBack={() => navigate('/solo')}
                onSelectDifficulty={handleLevelSelect}
                onShowTutorial={() => {
                  setShowDifficultySelector(false);
                  setShowTutorial(true);
                }}
                unlockedLevels={userProgress.unlockedLevels}
                completedLevels={userProgress.completedLevels}
                showTutorialOption={!isNewUser} // แสดงปุ่ม Tutorial เฉพาะผู้ใช้เก่า
                onRefresh={handleRefreshUserData} // เพิ่ม function สำหรับ refresh ข้อมูล
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Show Game Interface */}
      {!showDifficultySelector && !showTutorial && (
        <>
          {/* Hint Popup */}
          {showHint && currentHint && (
            <HintPopup hint={currentHint} onClose={() => setShowHint(false)} />
          )}
          
          <div className="container mx-auto px-4 pt-20 pb-8">
            {/* Enhanced Header Section */}
            <div className="mb-6 p-6 bg-gradient-to-r from-slate-900/90 via-blue-900/80 to-purple-900/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-xl">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                {/* Level Change Button (hidden while playing) */}
                {!isChallengeStarted && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDifficultySelector(true);
                    }}
                    className="relative z-50 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl transition-all transform hover:scale-105 w-fit font-semibold cursor-pointer"
                    style={{ pointerEvents: 'all' }}
                  >
                    ← เปลี่ยนระดับความยาก
                  </button>
                )}
                
              </div>
            </div>
            {/* Main Trading Interface - Full Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-180px)]">
              {/* Left Column - Chart takes most space */}
              <div className="lg:col-span-3 space-y-4 h-full">
                {/* Trading Chart - Full Height */}
                <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-xl border border-emerald-500/20 rounded-xl overflow-hidden h-[70vh] shadow-2xl shadow-emerald-500/10">
                  <div className="bg-gradient-to-r from-emerald-600/10 to-blue-600/10 px-4 py-3 border-b border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                        <div className="flex flex-col">
                          <h3 className="text-lg font-bold text-white">{selectedSymbol}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-300">{getMarketDisplayName(selectedMarket)}</span>
                            <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-md">
                              {difficulty === 'easy' || difficulty === 'medium' ? 'หุ้นไทยคุณภาพดี' : 'อนุพันธ์ความเสี่ยงสูง'}
                            </span>
                          </div>
                        </div>
                        <span className="text-emerald-400 text-sm font-medium">LIVE</span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {currentPrice > 0 ? formatPrice(currentPrice) : '0.00'}
                        </div>
                        <div className="text-xs text-emerald-400">THB</div>
                      </div>
                    </div>
                  </div>
                  <div className="h-[calc(100%-60px)]">
                    <SoloTradingChart
                      market={selectedMarket}
                      symbol={selectedSymbol}
                      playbackTime={playbackTime}
                      startPlayback={isChallengeStarted}
                      isPlaying={isPlaying}
                      onDataLoaded={setChartData}
                      onCurrentPriceChange={setCurrentPrice}
                      difficulty={difficulty}
                      playbackSpeed={playbackSpeed}
                      isPaused={isPaused}
                    />
                  </div>
                </div>

                {/* Mission Progress Panel - Level-specific */}
                <div className="h-[calc(30vh-80px)]">
                  <MissionProgressPanel 
                    currentLevel={difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : difficulty === 'hard' ? 3 : 4}
                    missions={currentMissions.map((mission, index) => ({
                      id: index + 1,
                      title: mission.title,
                      description: `Target: ${typeof mission.target === 'number' && mission.target > 1000 ? 
                        `${(mission.target / 1000).toFixed(0)}k THB` : mission.target}`,
                      type: mission.id.includes('profit') ? "profit" : 
                            mission.id.includes('trade') || mission.id.includes('activity') ? "trade" : 
                            mission.id.includes('time') ? "time" : 
                            mission.id.includes('risk') || mission.id.includes('management') ? "risk" : "misc",
                      target: mission.target,
                      current: mission.current,
                      reward: `${mission.weight * 100} points`,
                      icon: mission.id === 'first_trade' ? "🎯" : 
                            mission.id.includes('profit') ? "💰" :
                            mission.id.includes('trade') || mission.id.includes('activity') || mission.id.includes('advanced') ? "📈" :
                            mission.id.includes('time') || mission.id.includes('survival') || mission.id.includes('speed') ? "⏱️" :
                            mission.id.includes('risk') || mission.id.includes('management') ? "🛡️" :
                            mission.id.includes('consistency') || mission.id.includes('perfect') ? "⭐" :
                            mission.id.includes('no_') ? "🚫" : "📊",
                      difficultyBonus: difficulty === 'easy' ? "1x" : 
                                     difficulty === 'medium' ? "1.5x" : 
                                     difficulty === 'hard' ? "2x" : "3x"
                    }))}
                    completedMissions={currentMissions
                      .map((mission, index) => mission.current >= mission.target ? index + 1 : null)
                      .filter(id => id !== null)}
                    timeRemaining={remainingTime}
                    isActive={isChallengeStarted}
                  />
                </div>
              </div>

              {/* Right Column - Compact Controls */}
              <div className="lg:col-span-1 h-full">
                {/* Main Control Panel - Full Height */}
                <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-purple-500/20 rounded-xl p-4 shadow-xl shadow-purple-500/10 h-full overflow-y-auto">
                  {/* Balance Display */}
                  <div className="text-center mb-4">
                    <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Balance</div>
                    <div className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                      {formatCurrency(balance)} THB
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Holdings: <span className="text-white font-semibold">{formatNumber(position)}</span> shares
                    </div>
                  </div>

                  {/* Timer */}
                  <div className="text-center mb-4">
                    <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Time Remaining</div>
                    <div className={`text-lg font-bold font-mono ${
                      remainingTime <= 60 ? 'text-red-400' :
                      remainingTime <= 120 ? 'text-yellow-400' :
                      'text-emerald-400'
                    }`}>
                      {Math.floor(remainingTime / 60).toString().padStart(2, '0')}:
                      {(remainingTime % 60).toString().padStart(2, '0')}
                    </div>
                  </div>

                  {/* Start/End Game Button */}
                  <div className="mb-4">
                    {!isChallengeStarted ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsChallengeStarted(true);
                          setIsPlaying(true); // เริ่มเล่นเมื่อกดเริ่มเทรด
                        }}
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-emerald-500/25 transform hover:scale-105 relative z-10"
                      >
                        🚀 เริ่มเทรด
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleChallengeEnd();
                        }}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/25 relative z-10"
                      >
                        ⏸️ หยุดเทรด
                      </button>
                    )}
                  </div>

                  {/* Speed Controls */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-2 text-center uppercase tracking-wider">ความเร็ว</div>
                    <div className="flex gap-2 justify-center">
                      {[1, 2, 5].map(speed => (
                        <button 
                          key={speed}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPlaybackSpeed(speed);
                          }}
                          className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-all relative z-10 ${
                            playbackSpeed === speed 
                              ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400' 
                              : 'bg-gray-600/20 border-gray-500/40 text-gray-300 hover:bg-gray-600/30'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                    
                    {/* Play/Pause Control */}
                    <div className="flex justify-center mt-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isPlaying && !isPaused) {
                            // Currently playing, so pause
                            console.log('🎮 [SOLO] User clicked pause');
                            setIsPaused(true);
                          } else {
                            // Currently paused or stopped, so play
                            console.log('🎮 [SOLO] User clicked play');
                            setIsPaused(false);
                            if (!isPlaying) {
                              setIsPlaying(true);
                            }
                          }
                        }}
                        className="px-4 py-1 bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded text-sm font-semibold hover:bg-blue-600/30 transition-all relative z-10"
                      >
                        {(isPlaying && !isPaused) ? '⏸️ หยุด' : '▶️ เล่น'}
                      </button>
                    </div>
                  </div>

                  {/* Trading Controls */}
                  <div className="space-y-3">
                    {/* Buy Section */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider text-center">การซื้อ</div>
                      <div className="flex gap-1 mb-1">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBuyAmount(Math.max(0, buyAmount - 100));
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-400 rounded font-bold transition-all relative z-10 text-sm"
                        >
                          −
                        </button>
                        <input 
                          type="number" 
                          className="flex-1 bg-slate-800/50 border border-emerald-500/30 rounded text-center text-white font-bold py-1 px-1 text-xs outline-none focus:border-emerald-400 transition-all relative z-10"
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(Math.max(0, parseInt(e.target.value) || 0))}
                          disabled={!isChallengeStarted}
                          placeholder={`แนะนำ: ${calculateRecommendedShares('buy')} หุ้น`}
                        />
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBuyAmount(buyAmount + 100);
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-400 rounded font-bold transition-all relative z-10 text-sm"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 text-center mb-2">
                        💡 ตัวเลขแนะนำคำนวณจาก {difficulty === 'easy' ? '15%' : difficulty === 'medium' ? '12%' : difficulty === 'hard' ? '10%' : '8%'} ของยอดเงิน - คุณสามารถใส่จำนวนเองได้
                        <button 
                          onClick={() => setBuyAmount(calculateRecommendedShares('buy'))}
                          className="ml-1 px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-400 rounded text-xs transition-all"
                          disabled={!isChallengeStarted}
                        >
                          ใช้แนะนำ
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBuy(buyAmount);
                          }}
                          disabled={!isChallengeStarted || buyAmount * currentPrice > balance}
                          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-600 disabled:to-gray-700 text-white text-xs py-1.5 px-2 rounded font-bold transition-all duration-200 shadow-lg disabled:shadow-none relative z-10"
                        >
                          ซื้อ
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBuy(Math.floor(balance / currentPrice));
                          }}
                          disabled={!isChallengeStarted || balance < currentPrice}
                          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-xs py-1.5 px-2 rounded font-bold transition-all duration-200 shadow-lg disabled:shadow-none relative z-10"
                        >
                          ซื้อสูงสุด
                        </button>
                      </div>
                    </div>

                    {/* Sell Section */}
                    <div>
                      <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider text-center">การขาย</div>
                      <div className="flex gap-1 mb-1">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSellAmount(Math.max(0, sellAmount - 100));
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-400 rounded font-bold transition-all relative z-10 text-sm"
                        >
                          −
                        </button>
                        <input 
                          type="number" 
                          className="flex-1 bg-slate-800/50 border border-red-500/30 rounded text-center text-white font-bold py-1 px-1 text-xs outline-none focus:border-red-400 transition-all relative z-10"
                          value={sellAmount}
                          onChange={(e) => setSellAmount(Math.max(0, Math.min(position, parseInt(e.target.value) || 0)))}
                          disabled={!isChallengeStarted}
                          placeholder={position > 0 ? `แนะนำ: ${calculateRecommendedShares('sell')} หุ้น` : 'จำนวนหุ้น'}
                        />
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSellAmount(Math.min(position, sellAmount + 100));
                          }}
                          className="w-7 h-7 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-400 rounded font-bold transition-all relative z-10 text-sm"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 text-center mb-2">
                        💡 แนะนำขาย 50% ของตำแหน่ง - คุณสามารถปรับจำนวนได้ตามกลยุทธ์
                        <button 
                          onClick={() => setSellAmount(calculateRecommendedShares('sell'))}
                          className="ml-1 px-2 py-0.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-400 rounded text-xs transition-all"
                          disabled={!isChallengeStarted || position === 0}
                        >
                          ใช้แนะนำ
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSell(sellAmount);
                          }}
                          disabled={!isChallengeStarted || sellAmount === 0 || sellAmount > position}
                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white text-xs py-1.5 px-2 rounded font-bold transition-all duration-200 shadow-lg disabled:shadow-none relative z-10"
                        >
                          ขาย
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSellAll();
                          }}
                          disabled={!isChallengeStarted || position === 0}
                          className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-xs py-1.5 px-2 rounded font-bold transition-all duration-200 shadow-lg disabled:shadow-none relative z-10"
                        >
                          ขายทั้งหมด
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Limit Orders Panel */}
                <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-purple-500/20 rounded-xl p-4 shadow-xl shadow-purple-500/10">
                  <div className="text-xs text-gray-400 mb-3 text-center uppercase tracking-wider">Limit Orders</div>
                  
                  {/* Simple Limit Order Form */}
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="number" 
                        placeholder={currentPrice > 0 ? `ราคา (ปัจจุบัน: ${formatPrice(currentPrice)})` : "ราคา"}
                        className="bg-slate-800/50 border border-gray-500/30 rounded text-center text-white text-sm py-2 px-2 outline-none focus:border-blue-400 transition-all"
                      />
                      <input 
                        type="number" 
                        placeholder={`แนะนำ: ${calculateRecommendedShares('buy')} หุ้น`}
                        className="bg-slate-800/50 border border-gray-500/30 rounded text-center text-white text-sm py-2 px-2 outline-none focus:border-blue-400 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-sm py-2 px-3 rounded font-semibold hover:bg-emerald-600/30 transition-all">
                        Buy Limit
                      </button>
                      <button className="bg-red-600/20 border border-red-500/40 text-red-400 text-sm py-2 px-3 rounded font-semibold hover:bg-red-600/30 transition-all">
                        Sell Limit
                      </button>
                    </div>
                  </div>

                  {/* Limit Orders List */}
                  <div className="space-y-2">
                    {limitOrders.length === 0 ? (
                      <div className="text-center text-gray-500 text-xs py-2">
                        ไม่มี Limit Orders
                      </div>
                    ) : (
                      limitOrders.slice(0, 3).map((order, index) => (
                        <div key={`limit-order-${index}-${order.id || Date.now()}`} className="bg-slate-800/30 rounded p-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className={order.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
                              {order.type.toUpperCase()}
                            </span>
                            <span className="text-gray-300">
                              {order.quantity} @ {order.price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Enhanced Game Result Modal */}
      <GameResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        result={gameResult}
        onPlayAgain={handlePlayAgain}
        onBackToHome={handleBackToHome}
      />
      </div>
    </div>
  );
}

export default SoloChallenge;
