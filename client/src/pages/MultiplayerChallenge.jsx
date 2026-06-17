import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth } from '../firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useMultiplayer } from '../contexts/MultiplayerContext';
import multiplayerService from '../services/multiplayerService';
import ErrorBoundary from '../components/common/ErrorBoundary';
import MultiTradingChartTradingView from '../components/multiplayer/MultiTradingChart_TradingView';
import TradingControlPanel from '../components/trading/TradingControlPanel';
import MultiplayerGameTimer from '../components/multiplayer/MultiplayerGameTimer';
import GameEndNotificationModal from '../components/common/GameEndNotificationModal';
import MultiplayerResultsModal from '../components/multiplayer/MultiplayerResultsModal';
import RoomLeaderboard from '../components/multiplayer/RoomLeaderboard';
import { Trophy, Users, ArrowLeft, Clock, BarChart3 } from 'lucide-react';

// Function to convert string to hash number
const stringToHash = (str) => {
  let hash = 0;
  if (!str || str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Function to validate market-symbol pair correctness (outside component)
const validateMarketSymbolPair = (market, symbol) => {
  const marketSymbols = {
    TFEX: ['^SET50.BK', 'GOLD', 'USD', 'OIL', 'RUBBER'],
    SET: ['PTT', 'CPALL', 'KBANK', 'SCB', 'BBL', 'AOT', 'ADVANC', 'INTUCH', 'TU', 'BDMS', 'KTB', 'TRUE', 'DTAC', 'CP', 'CPF', 'MINT', 'CRC', 'BGC', 'HMPRO', 'COM7', 'OR', 'BANPU', 'DELTA', 'SAWAD', 'PTTEP', 'KCE', 'SCC', 'TISCO', 'AP'],
    MAI: ['HEMP', 'LPN', 'SPVI', 'SMT', 'PRINC'],
    US: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX']
  };
  
  return marketSymbols[market]?.includes(symbol) || false;
};

// Function to randomly select valid market-symbol pair (outside component)
const getRandomMarketSymbolPair = () => {
  const marketsData = {
    TFEX: ['^SET50.BK', 'GOLD', 'USD', 'OIL', 'RUBBER'],
    SET: ['PTT', 'CPALL', 'KBANK', 'SCB', 'BBL', 'AOT', 'ADVANC', 'INTUCH', 'TU', 'BDMS'],
    MAI: ['HEMP', 'LPN', 'SPVI', 'SMT', 'PRINC'],
    US: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX']
  };
  
  const markets = Object.keys(marketsData);
  const randomMarket = markets[Math.floor(Math.random() * markets.length)];
  const symbols = marketsData[randomMarket];
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
  
  return { market: randomMarket, symbol: randomSymbol };
};

// Socket.io based multiplayer challenge with Firebase persistence
function MultiplayerChallengeCore() {
  const navigate = useNavigate();
  const { roomCode } = useParams();
  
  // Use Multiplayer Context
  const {
    currentRoom,
    players,
    subscribeToRoom,
    subscribeToPlayers
  } = useMultiplayer();

  // Game state - ดึง symbol และ time limit จาก room settings เพื่อให้ผู้เล่นทุกคนเห็นเหมือนกัน
  const [timeLeft, setTimeLeft] = useState(() => {
    // ดึงจาก room settings ก่อน
    if (currentRoom?.settings?.timeLimit) {
      return currentRoom.settings.timeLimit * 60; // แปลงจากนาทีเป็นวินาที
    }
    
    // Fallback: ดึงจาก localStorage หากมี
    if (roomCode) {
      const savedTimeLimit = localStorage.getItem(`room_${roomCode}_timeLimit`);
      if (savedTimeLimit) {
        return parseInt(savedTimeLimit) * 60; // แปลงจากนาทีเป็นวินาที
      }
    }
    
    // Default fallback (3 นาที)
    return 180;
  });
  
  // ติดตาม currentRoom เพื่อให้ทุกคนเห็น symbol เหมือนกัน
  const [syncedSymbol, setSyncedSymbol] = useState(() => {
    // ตรวจสอบ localStorage ก่อนเป็น fallback
    if (roomCode) {
      const savedSymbol = localStorage.getItem(`room_${roomCode}_symbol`);
      const savedMarket = localStorage.getItem(`room_${roomCode}_market`);
      
      if (savedSymbol && savedMarket) {
        // ตรวจสอบความถูกต้องของ market-symbol pair
        const isValidPair = validateMarketSymbolPair(savedMarket, savedSymbol);
        if (isValidPair) {
          return savedSymbol;
        }
      }
    }
    const randomPair = getRandomMarketSymbolPair();
    return randomPair.symbol;
  });
  
  const [syncedMarket, setSyncedMarket] = useState(() => {
    // ตรวจสอบ localStorage ก่อนเป็น fallback  
    if (roomCode) {
      const savedMarket = localStorage.getItem(`room_${roomCode}_market`);
      const savedSymbol = localStorage.getItem(`room_${roomCode}_symbol`);
      
      if (savedMarket && savedSymbol) {
        const isValidPair = validateMarketSymbolPair(savedMarket, savedSymbol);
        if (isValidPair) {
          return savedMarket;
        }
      }
    }
    const randomPair = getRandomMarketSymbolPair();
    return randomPair.market;
  });
  
  // อัปเดต symbol และ market เมื่อได้ข้อมูลจาก currentRoom พร้อมตรวจสอบความถูกต้อง
  useEffect(() => {
    if (currentRoom?.settings) {
      console.log('🎯 Room settings received:', currentRoom.settings);
      let shouldUpdateSymbol = false;
      
      // ตรวจสอบ symbol
      if (currentRoom.settings.symbol && currentRoom.settings.symbol !== syncedSymbol) {
        // ตรวจสอบความถูกต้องของ market-symbol pair
        const currentMarket = currentRoom.settings.market || syncedMarket;
        const isValidPair = validateMarketSymbolPair(currentMarket, currentRoom.settings.symbol);
        
        console.log(`🔍 Validating symbol: ${currentRoom.settings.symbol} in market: ${currentMarket} = ${isValidPair}`);
        
        if (isValidPair) {
          setSyncedSymbol(currentRoom.settings.symbol);
          localStorage.setItem(`room_${roomCode}_symbol`, currentRoom.settings.symbol);
          shouldUpdateSymbol = true;
          console.log(`✅ Updated symbol to: ${currentRoom.settings.symbol}`);
        }
      }
      
      // ตรวจสอบ market
      if (currentRoom.settings.market && currentRoom.settings.market !== syncedMarket) {
        // ตรวจสอบความถูกต้องของ market-symbol pair
        const currentSymbol = shouldUpdateSymbol ? currentRoom.settings.symbol : syncedSymbol;
        const isValidPair = validateMarketSymbolPair(currentRoom.settings.market, currentSymbol);
        
        console.log(`🔍 Validating market: ${currentRoom.settings.market} with symbol: ${currentSymbol} = ${isValidPair}`);
        
        if (isValidPair) {
          setSyncedMarket(currentRoom.settings.market);
          localStorage.setItem(`room_${roomCode}_market`, currentRoom.settings.market);
          console.log(`✅ Updated market to: ${currentRoom.settings.market}`);
        }
      }
      
      // เก็บ timeLimit หากมี
      if (currentRoom.settings.timeLimit && roomCode) {
        console.log(`⏰ Updating time limit to: ${currentRoom.settings.timeLimit} minutes`);
        localStorage.setItem(`room_${roomCode}_timeLimit`, currentRoom.settings.timeLimit.toString());
      }
    }
  }, [currentRoom?.settings, syncedSymbol, syncedMarket, roomCode]);
  
  // Game end state management (like backup file)
  const [showGameEndNotification, setShowGameEndNotification] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [gameHasEnded, setGameHasEnded] = useState(false);
  const [finalGameResults, setFinalGameResults] = useState(null);
  
  // อัปเดต timeLeft เมื่อได้ room settings ใหม่
  useEffect(() => {
    if (currentRoom?.settings?.timeLimit && !gameHasEnded) {
      setTimeLeft(currentRoom.settings.timeLimit * 60);
    }
  }, [currentRoom?.settings?.timeLimit, gameHasEnded]);
  
  const [balance, setBalance] = useState(1000000);
  const [position, setPosition] = useState(0);
  const [totalShares, setTotalShares] = useState(0);
  const [unrealizedPnL, setUnrealizedPnL] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [averageCost, setAverageCost] = useState(0);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [allChartData, setAllChartData] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]); // เพิ่ม state สำหรับเก็บประวัติการเทรด
  const [actualGameDuration, setActualGameDuration] = useState(0); // เก็บเวลาจริงที่เล่น

  // Refs for stable references
  const balanceRef = useRef(balance);
  const positionRef = useRef(position);
  const averageCostRef = useRef(averageCost);
  const timerIntervalRef = useRef(null);
  const gameStartTimeRef = useRef(null);
  const endTimeRef = useRef(null);
  const allChartDataRef = useRef([]);
  // ลบ lastUpdateRef ออกเพราะไม่ใช้แล้ว

  // Global error handling for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('❌ Unhandled Promise Rejection:', event.reason);
      // Prevent the default browser console error
      event.preventDefault();
      
      // Optional: Show user-friendly error message
      if (event.reason && typeof event.reason === 'object') {
        console.warn('🔧 Error details suppressed to prevent console spam');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Update refs when state changes
  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    averageCostRef.current = averageCost;
  }, [averageCost]);

  useEffect(() => {
    allChartDataRef.current = allChartData;
  }, [allChartData]);

  // Auth effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/');
      }
    });
    return unsubscribe;
  }, [navigate]);

  // Join room and subscribe to room updates
  useEffect(() => {
    if (roomCode && auth.currentUser) {
      multiplayerService.joinRoom(roomCode, auth.currentUser.uid, auth.currentUser.displayName || 'Player')
        .catch(error => {
          console.error('❌ Error joining room:', error);
          // Don't block the game if join room fails
        });
      
      const unsubscribeRoom = subscribeToRoom(roomCode);
      const unsubscribePlayers = subscribeToPlayers(roomCode);
      
      return () => {
        unsubscribeRoom();
        unsubscribePlayers();
      };
    }
  }, [roomCode, subscribeToRoom, subscribeToPlayers]);

  // ตรวจสอบสถานะห้องและเริ่มเกม - เหลือเฉพาะ playing และ finished
  useEffect(() => {
    if (currentRoom?.status === 'finished' && !gameHasEnded) {
      setTimeout(() => {
        setGameHasEnded(true);
        setShowGameEndNotification(true);
      }, 0);
    }
  }, [currentRoom?.status, gameHasEnded]);

  // Real-time price updates from chart (ไม่คำนวณ P&L ใหม่)
  const handlePriceUpdate = useCallback((newPrice) => {
    setCurrentPrice(newPrice);
    // ไม่คำนวณ unrealized P&L เพื่อป้องกันการขยับของตัวเลข
  }, []); // No dependencies to prevent infinite re-renders

  // Handle chart data updates
  const handleChartDataUpdate = useCallback((data) => {
    if (data && data.length > 0) {
      setAllChartData(data);
    }
  }, []);

  // Player data will only update when actual trades happen (in handleTrade function)

  // Combined Timer Effect - เริ่ม timer ทันทีเมื่อเกมยังไม่จบ
  useEffect(() => {
    // เริ่ม timer เมื่อเกมเริ่มต้น
    if (!gameHasEnded) {
      // Clear any existing timer first
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // กำหนดเวลาเกมจาก room settings หรือ localStorage
      let timeLimitMinutes = 3; // ค่าเริ่มต้น
      
      // ลองดึงจาก room settings ก่อน
      if (currentRoom?.settings?.timeLimit) {
        timeLimitMinutes = currentRoom.settings.timeLimit;
      } else if (roomCode) {
        // Fallback: ดึงจาก localStorage หากมี
        const savedTimeLimit = localStorage.getItem(`room_${roomCode}_timeLimit`);
        if (savedTimeLimit) {
          const parsedLimit = parseInt(savedTimeLimit);
          if (!isNaN(parsedLimit)) {
            timeLimitMinutes = parsedLimit;
          }
        }
      }
      
      // Validate time limit - ใช้เฉพาะ 3, 5, 7, 10 นาที
      if (!timeLimitMinutes || ![3, 5, 7, 10].includes(timeLimitMinutes)) {
        timeLimitMinutes = 3; // ค่าเริ่มต้น 3 นาที
      }

      const gameDurationMs = timeLimitMinutes * 60 * 1000; // แปลงเป็น milliseconds
      const now = Date.now();
      
      // Set game timing references
      endTimeRef.current = now + gameDurationMs;
      gameStartTimeRef.current = now;
      setTimeLeft(timeLimitMinutes * 60);

      // Start the timer interval
      timerIntervalRef.current = setInterval(() => {
        const currentTime = Date.now();
        const remaining = Math.max(0, Math.floor((endTimeRef.current - currentTime) / 1000));
        
        setTimeLeft(remaining);

        // Update chart progression if data is available
        if (gameStartTimeRef.current && allChartDataRef.current?.length > 0) {
          const elapsedSec = Math.floor((currentTime - gameStartTimeRef.current) / 1000);
          const totalGameDurationSec = timeLimitMinutes * 60;
          const maxIndex = allChartDataRef.current.length - 1;
          
          // Calculate target index based on game progression percentage
          const progressPercentage = Math.min(elapsedSec / totalGameDurationSec, 1);
          const targetIndex = Math.floor(progressPercentage * maxIndex);
          
          // Ensure targetIndex is within valid range
          const validTargetIndex = Math.min(Math.max(targetIndex, 0), maxIndex);
          
          setPlaybackIndex(prev => {
            if (prev !== validTargetIndex && validTargetIndex >= 0 && validTargetIndex <= maxIndex) {
              console.log(`📊 Chart progression: ${elapsedSec}s/${totalGameDurationSec}s (${(progressPercentage*100).toFixed(1)}%) - Index: ${validTargetIndex}/${maxIndex}`);
              return validTargetIndex;
            }
            return prev;
          });
        }

        // End game when timer reaches zero
        if (remaining <= 0) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          
          // Set final chart position with timeout to prevent render conflicts
          if (allChartDataRef.current?.length > 0) {
            setTimeout(() => {
              setPlaybackIndex(allChartDataRef.current.length - 1);
            }, 0);
          }
          
          // Trigger game end sequence with timeout to prevent render conflicts
          if (!gameHasEnded) {
            console.log('⏰ Time expired! Auto-triggering game end sequence');
            setTimeout(() => {
              setGameHasEnded(true);
              setShowGameEndNotification(true);
            }, 100);
          }
        }
      }, 1000);
    }
    
    // Cleanup on unmount or state change
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [gameHasEnded, currentRoom?.settings, roomCode]);

  // Trading functions with enhanced functionality
  const handleTrade = useCallback(async (type, quantity, price = currentPrice) => {
    console.log('🛒 Trade requested:', type, quantity, 'at price:', price);
    
    const qty = Number(quantity || 0);
    if (qty <= 0 || price <= 0) {
      console.log('❌ Invalid trade parameters');
      return;
    }

    if (type === 'buy') {
      const cost = qty * price;
      if (cost > balance) {
        alert('ยอดเงินไม่เพียงพอ');
        return;
      }

      // Update balance and position
      const newBalance = balance - cost;
      const newTotalShares = totalShares + qty;
      const newTotalCost = (averageCost * totalShares) + cost;
      const newAverageCost = newTotalCost / newTotalShares;

      setBalance(newBalance);
      setPosition(position + qty);
      setTotalShares(newTotalShares);
      setAverageCost(newAverageCost);

      // คำนวณ unrealized P&L ใหม่หลังซื้อ
      const newUnrealizedPnL = (currentPrice - newAverageCost) * (position + qty);
      setUnrealizedPnL(newUnrealizedPnL);

      // เพิ่มข้อมูลการเทรดลงในประวัติ
      setTradeHistory(prev => [...prev, {
        type: 'buy',
        quantity: qty,
        price: price,
        timestamp: Date.now(),
        symbol: syncedSymbol,
        market: syncedMarket
      }]);

      // Send trade to multiplayer service
      const tradeData = {
        action: 'buy', // เปลี่ยนจาก type เป็น action
        shares: qty,   // เปลี่ยนจาก quantity เป็น shares
        price: price,
        symbol: syncedSymbol,
        market: syncedMarket,
        timestamp: Date.now(),
        balance: newBalance,
        position: position + qty,
        playerId: auth.currentUser?.uid
      };

      try {
        await multiplayerService.submitTrade(roomCode, tradeData);
        
        // ลบการอัปเดต Firebase ออกจากที่นี่ ให้ RoomLeaderboard จัดการ
        console.log('✅ Buy trade submitted successfully');
      } catch (error) {
        console.error('❌ Error submitting buy trade:', error);
      }

    } else if (type === 'sell') {
      if (qty > position) {
        alert('Insufficient shares');
        return;
      }

      // Update balance and position
      const revenue = qty * price;
      const newBalance = balance + revenue;
      const newPosition = position - qty;
      const newTotalShares = totalShares - qty;

      setBalance(newBalance);
      setPosition(newPosition);
      setTotalShares(newTotalShares);

      // Reset average cost if all shares sold
      if (newPosition === 0) {
        setAverageCost(0);
        setUnrealizedPnL(0); // Reset unrealized P&L when no position
      } else {
        // คำนวณ unrealized P&L ใหม่หลังขาย
        const newUnrealizedPnL = (currentPrice - averageCost) * newPosition;
        setUnrealizedPnL(newUnrealizedPnL);
      }

      // เพิ่มข้อมูลการเทรดลงในประวัติ
      setTradeHistory(prev => [...prev, {
        type: 'sell',
        quantity: qty,
        price: price,
        timestamp: Date.now(),
        symbol: syncedSymbol,
        market: syncedMarket
      }]);

      // Send trade to multiplayer service
      const tradeData = {
        action: 'sell', // เปลี่ยนจาก type เป็น action
        shares: qty,    // เปลี่ยนจาก quantity เป็น shares
        price: price,
        symbol: syncedSymbol,
        market: syncedMarket,
        timestamp: Date.now(),
        balance: newBalance,
        position: newPosition,
        playerId: auth.currentUser?.uid
      };

      try {
        await multiplayerService.submitTrade(roomCode, tradeData);
        
        // ลบการอัปเดต Firebase ออกจากที่นี่ ให้ RoomLeaderboard จัดการ
        console.log('✅ Sell trade submitted successfully');
      } catch (error) {
        console.error('❌ Error submitting sell trade:', error);
      }
    }
  }, [balance, position, totalShares, averageCost, currentPrice, syncedSymbol, syncedMarket, roomCode]);

  // Handle leaving the room
  const handleLeaveRoom = useCallback(async () => {
    try {
      await multiplayerService.leaveRoom(roomCode, auth.currentUser?.uid);
      navigate('/multiplayer');
    } catch (error) {
      console.error('Error leaving room:', error);
      navigate('/multiplayer');
    }
  }, [roomCode, navigate]);

  // Handle game end notification close -> show results
  const handleGameEndNotificationClose = useCallback(() => {
    console.log('🔄 Handling game end notification close');
    setShowGameEndNotification(false);
    // Use setTimeout to prevent state update during render
    setTimeout(() => {
      setShowResultsModal(true);
    }, 100);
  }, []);

  // Handle results modal close
  const handleResultsModalClose = useCallback(() => {
    console.log('🔄 Handling results modal close');
    setShowResultsModal(false);
  }, []);

  // Listen for server game-finished events (from backup file)
  useEffect(() => {
    const handleGameFinished = (event) => {
      const data = event.detail || event;
      console.log('🎯 MultiplayerChallenge received server game-finished event:', data);
      console.log('📊 Final results data:', data.finalResults);
      
      // Use setTimeout to prevent state update during render
      setTimeout(() => {
        if (!gameHasEnded) {
          setGameHasEnded(true);
          setFinalGameResults(data.finalResults);
          setShowGameEndNotification(true);
          
          console.log('🏁 Server triggered game end sequence with results:', data.finalResults);
        } else {
          console.log('⚠️ Game already ended, ignoring duplicate event');
        }
      }, 0);
    };

    window.addEventListener('multiplayer-game-finished', handleGameFinished);
    console.log('👂 MultiplayerChallenge listening for game-finished events');
    
    return () => {
      window.removeEventListener('multiplayer-game-finished', handleGameFinished);
      console.log('🔇 MultiplayerChallenge stopped listening for game-finished events');
    };
  }, [gameHasEnded]);

  // Also listen for roomStatus changes to catch 'finished' state
  useEffect(() => {
    if (currentRoom?.status === 'finished' && !gameHasEnded) {
      console.log('🎯 Room status changed to finished, triggering game end');
      // Use setTimeout to prevent state update during render
      setTimeout(() => {
        setGameHasEnded(true);
        setShowGameEndNotification(true);
      }, 0);
    }
  }, [currentRoom?.status, gameHasEnded]);

  // Memoized calculations for performance
  const gameStats = useMemo(() => {
    // สำหรับ leaderboard ใช้ averageCost เพื่อไม่ให้เลขขยับตลอดเวลา
    const holdingValue = position * averageCost; // ใช้ averageCost แทน currentPrice
    const totalValue = balance + holdingValue;
    const totalReturn = totalValue - 1000000; // Starting balance was 1,000,000
    const returnPercentage = (totalReturn / 1000000) * 100;

    // สำหรับการแสดง unrealized P&L ใช้ currentPrice
    const marketHoldingValue = position * currentPrice;
    const marketTotalValue = balance + marketHoldingValue;
    const marketTotalReturn = marketTotalValue - 1000000;

    console.log('📊 GameStats calculation:', {
      balance,
      position,
      currentPrice,
      averageCost,
      holdingValue,
      totalValue,
      totalReturn,
      returnPercentage,
      marketHoldingValue,
      marketTotalValue,
      marketTotalReturn
    });

    return {
      totalValue, // ใช้ averageCost สำหรับ leaderboard
      totalReturn, // ใช้ averageCost สำหรับ leaderboard
      returnPercentage, // ใช้ averageCost สำหรับ leaderboard
      marketTotalValue, // ใช้ currentPrice สำหรับแสดงมูลค่าตลาดปัจจุบัน
      marketTotalReturn, // ใช้ currentPrice สำหรับแสดงกำไร/ขาดทุนปัจจุบัน
      realizedPnL: balance - 1000000 + (totalShares * averageCost) - (position * averageCost),
      unrealizedPnL
    };
  }, [balance, position, totalShares, averageCost, unrealizedPnL, currentPrice]);

  // Memoized current user data for Firebase sync
  const currentUserData = useMemo(() => ({
    id: auth.currentUser?.uid,
    name: auth.currentUser?.displayName || 'คุณ',
    balance: balance,
    position: position,
    totalValue: gameStats.totalValue, // ใช้ค่าจาก gameStats ที่คำนวณด้วย averageCost
    profit: gameStats.totalReturn,
    profitPercentage: gameStats.returnPercentage
  }), [balance, position, gameStats.totalValue, gameStats.totalReturn, gameStats.returnPercentage]);

  // ใช้ข้อมูลจาก server โดยตรง ไม่แทรกแซงข้อมูลของผู้เล่นปัจจุบัน
  const updatedPlayers = useMemo(() => {
    console.log('🎯 Using server players data directly:', players);
    // ส่งข้อมูลจาก server โดยตรงเพื่อให้ทุกคนเห็นเหมือนกัน
    return players || [];
  }, [players]);

  // Loading states
  if (!roomCode) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
      <div className="text-red-500">Room not Found</div>
    </div>;
  }

  if (!currentRoom) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-2">Loading room...</span>
    </div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Modern Header */}
      <header className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button 
              onClick={handleLeaveRoom}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Exit room</span>
            </button>
            
            <div className="flex items-center space-x-3 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="font-semibold text-yellow-100">Room: {roomCode}</span>
            </div>

            <div className="flex items-center space-x-3 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <span className="font-semibold text-blue-100">{syncedSymbol}</span>
              <span className="text-xs text-blue-300">({syncedMarket})</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Players Count */}
            <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
              <Users className="h-4 w-4 text-green-400" />
              <span className="text-green-100">Players: {players?.length || 0}</span>
            </div>
            
            {/* Game Status */}
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Status</div>
              <div className={`text-lg font-bold px-3 py-1 rounded-lg ${
                !gameHasEnded ? 'text-green-400 bg-green-500/10' :
                'text-red-400 bg-red-500/10'
              }`}>
                {!gameHasEnded ? 'Playing' : 'Game Ended'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Layout */}
      <div className="flex-1 flex">
        {/* Chart Area */}
        <div className="flex-1 bg-gray-900 relative">
          <MultiTradingChartTradingView
            symbol={syncedSymbol}
            onDataLoaded={handleChartDataUpdate}
            onCurrentPriceChange={handlePriceUpdate}
            playbackIndex={playbackIndex}
            isChartPaused={gameHasEnded ? true : null} // Only force pause when game ends, otherwise allow player control
            playerId={auth.currentUser?.uid || 'player1'}
            seed={roomCode ? stringToHash(roomCode) : Math.floor(Math.random() * 10000)}
            gameDurationSeconds={currentRoom?.settings?.timeLimit ? currentRoom.settings.timeLimit * 60 : timeLeft}
            onGameTimeUpdate={(duration) => setActualGameDuration(duration)}
          />
        </div>

        {/* Right Sidebar - Trading Panel & Leaderboard */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Timer Panel */}
          {timeLeft > 0 && (
            <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center justify-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl shadow-lg">
                <Clock className="h-5 w-5 text-purple-400" />
                <MultiplayerGameTimer 
                  timeLeft={timeLeft} 
                  room={currentRoom}
                  roomCode={roomCode}
                  gameStatus={gameHasEnded ? 'finished' : 'playing'}
                />
              </div>
            </div>
          )}
          
          {/* Trading Control Panel */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 min-h-0">
              <TradingControlPanel
                currentPrice={currentPrice}
                balance={balance}
                portfolio={[{ symbol: syncedSymbol, quantity: position }]}
                onTrade={handleTrade}
                disabled={gameHasEnded}
                stockSymbol={syncedSymbol}
                entryPrice={averageCost}
                latestPnL={unrealizedPnL}
                tradeHistory={tradeHistory}
              />
            </div>
            
            {/* Leaderboard Panel */}
            <div className="border-t border-gray-700 bg-gray-800">
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  <h3 className="text-sm font-semibold text-white">Ranking</h3>
                  <span className="text-xs text-gray-400">({players?.length || 0} players)</span>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <RoomLeaderboard
                    roomCode={roomCode}
                    currentUserId={auth.currentUser?.uid}
                    players={updatedPlayers}
                    currentPrice={currentPrice}
                    currentUserData={currentUserData}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game End Modals */}
      <GameEndNotificationModal 
        isOpen={showGameEndNotification}
        onClose={handleGameEndNotificationClose}
        autoCloseDelay={3000}
      />
      
      <MultiplayerResultsModal 
        isOpen={showResultsModal}
        onClose={handleResultsModalClose}
        players={finalGameResults || updatedPlayers || []}
        currentUser={auth.currentUser}
        roomCode={roomCode}
        onBackToHome={() => navigate('/')}
        actualGameDuration={actualGameDuration}
        onPlayAgain={() => {
          setTimeout(() => {
            setGameHasEnded(false);
            setShowResultsModal(false);
            setShowGameEndNotification(false);
            setFinalGameResults(null);
            // Reset game state
            setBalance(1000000);
          }, 0);
          setPosition(0);
          setTotalShares(0);
          setUnrealizedPnL(0);
          setAverageCost(0);
          setPlaybackIndex(0);
        }}
      />
    </div>
  );
}

// Export wrapped component with Error Boundary
export default function MultiplayerChallenge() {
  return (
    <ErrorBoundary>
      <MultiplayerChallengeCore />
    </ErrorBoundary>
  );
}