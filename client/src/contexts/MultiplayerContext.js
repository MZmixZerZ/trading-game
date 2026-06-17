import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import multiplayerService from '../services/multiplayerService';
import { useAuth } from './AuthContext';

// Initial state
const initialState = {
  // Room Data
  currentRoom: null,
  roomStatus: 'idle', // idle, joining, waiting, playing, finished
  players: [],
  leaderboard: [],
  
  // Game State
  gameStarted: false,
  gameEnded: false,
  timeRemaining: 0,
  
  // User State
  currentPlayer: null,
  isHost: false,
  
  // Real-time Data
  roomEvents: [],
  messages: [],
  
  // UI State
  loading: false,
  error: null,
  
  // Trading State
  trades: [],
  openPositions: [],
  balance: 1000000,
  totalPnL: 0
};

// Action types
const MULTIPLAYER_ACTIONS = {
  // Room Actions
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_ROOM_STATUS: 'SET_ROOM_STATUS',
  SET_CURRENT_ROOM: 'SET_CURRENT_ROOM',
  SET_PLAYERS: 'SET_PLAYERS',
  SET_CURRENT_PLAYER: 'SET_CURRENT_PLAYER',
  SET_IS_HOST: 'SET_IS_HOST',
  
  // Game Actions
  SET_GAME_STARTED: 'SET_GAME_STARTED',
  SET_GAME_ENDED: 'SET_GAME_ENDED',
  SET_TIME_REMAINING: 'SET_TIME_REMAINING',
  SET_LEADERBOARD: 'SET_LEADERBOARD',
  
  // Real-time Actions
  ADD_ROOM_EVENT: 'ADD_ROOM_EVENT',
  SET_ROOM_EVENTS: 'SET_ROOM_EVENTS',
  ADD_MESSAGE: 'ADD_MESSAGE',
  
  // Trading Actions
  SET_BALANCE: 'SET_BALANCE',
  SET_TOTAL_PNL: 'SET_TOTAL_PNL',
  SET_TRADES: 'SET_TRADES',
  SET_OPEN_POSITIONS: 'SET_OPEN_POSITIONS',
  ADD_TRADE: 'ADD_TRADE',
  UPDATE_TRADE: 'UPDATE_TRADE',
  
  // Reset
  RESET_STATE: 'RESET_STATE'
};

// Reducer
function multiplayerReducer(state, action) {
  switch (action.type) {
    case MULTIPLAYER_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
      
    case MULTIPLAYER_ACTIONS.SET_ROOM_STATUS:
      return { ...state, roomStatus: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_CURRENT_ROOM:
      return { ...state, currentRoom: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_PLAYERS:
      return { ...state, players: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_CURRENT_PLAYER:
      return { ...state, currentPlayer: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_IS_HOST:
      return { ...state, isHost: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_GAME_STARTED:
      return { ...state, gameStarted: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_GAME_ENDED:
      return { ...state, gameEnded: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_TIME_REMAINING:
      return { ...state, timeRemaining: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_LEADERBOARD:
      return { ...state, leaderboard: action.payload };
      
    case MULTIPLAYER_ACTIONS.ADD_ROOM_EVENT:
      return { 
        ...state, 
        roomEvents: [action.payload, ...state.roomEvents].slice(0, 50) 
      };
      
    case MULTIPLAYER_ACTIONS.SET_ROOM_EVENTS:
        return { ...state, roomEvents: action.payload };
      
    case MULTIPLAYER_ACTIONS.ADD_MESSAGE:
      return { 
        ...state, 
        messages: [...state.messages, action.payload] 
      };
      
    case MULTIPLAYER_ACTIONS.SET_BALANCE:
      return { ...state, balance: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_TOTAL_PNL:
      return { ...state, totalPnL: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_TRADES:
      return { ...state, trades: action.payload };
      
    case MULTIPLAYER_ACTIONS.SET_OPEN_POSITIONS:
      return { ...state, openPositions: action.payload };
      
    case MULTIPLAYER_ACTIONS.ADD_TRADE:
      return { 
        ...state, 
        trades: [...state.trades, action.payload],
        openPositions: [...state.openPositions, action.payload]
      };
      
    case MULTIPLAYER_ACTIONS.UPDATE_TRADE:
      return {
        ...state,
        trades: state.trades.map(trade => 
          trade.id === action.payload.id ? action.payload : trade
        ),
        openPositions: action.payload.status === 'closed' 
          ? state.openPositions.filter(trade => trade.id !== action.payload.id)
          : state.openPositions.map(trade => 
              trade.id === action.payload.id ? action.payload : trade
            )
      };
      
    case MULTIPLAYER_ACTIONS.RESET_STATE:
      return initialState;
      
    default:
      return state;
  }
}

// ✅ 1. เพิ่มรายการตลาดและสัญลักษณ์สำหรับสุ่ม (ใช้ข้อมูลจากโปรเจกต์)
const MARKET_SYMBOL_POOL = [
  // US Market
  { market: 'US', symbol: 'AAPL' },
  { market: 'US', symbol: 'GOOGL' },
  { market: 'US', symbol: 'MSFT' },
  { market: 'US', symbol: 'AMZN' },
  { market: 'US', symbol: 'TSLA' },
  { market: 'US', symbol: 'NVDA' },
  { market: 'US', symbol: 'META' },
  { market: 'US', symbol: 'NFLX' },
  // SET Market (Thailand)
  { market: 'SET', symbol: 'PTT' },
  { market: 'SET', symbol: 'CPALL' },
  { market: 'SET', symbol: 'KBANK' },
  { market: 'SET', symbol: 'SCB' },
  { market: 'SET', symbol: 'BBL' },
  { market: 'SET', symbol: 'AOT' },
  { market: 'SET', symbol: 'ADVANC' },
  { market: 'SET', symbol: 'INTUCH' },
  { market: 'SET', symbol: 'TU' },
  { market: 'SET', symbol: 'BDMS' },
  // TFEX Market
  { market: 'TFEX', symbol: 'GOLD' },
  { market: 'TFEX', symbol: 'USD' },
  { market: 'TFEX', symbol: 'OIL' },
];

// Create Context
const MultiplayerContext = createContext();

// Custom hook to use context
export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
};

// Provider component
export const MultiplayerProvider = ({ children }) => {
  const [state, dispatch] = useReducer(multiplayerReducer, initialState);
  const { currentUser } = useAuth();
  const gameStateRef = useRef({ gameStarted: false, gameEnded: false });
  useEffect(() => {
    gameStateRef.current = { gameStarted: state.gameStarted, gameEnded: state.gameEnded };
  }, [state.gameStarted, state.gameEnded]);

    // Initialize service with callbacks และ setup socket listeners
  useEffect(() => {
    try {
      if (!multiplayerService) {
        return;
      }
      
      // Setup socket event listeners - จะ setup ใหม่ทุกครั้งที่ socket เปลี่ยน
      const setupSocketListeners = () => {
        if (!multiplayerService.socket) return;

        console.log('🔗 Setting up socket event listeners...');
        
        // Listen for room-joined events to get complete room data
        multiplayerService.socket.on('room-joined', (data) => {
          console.log('🏠 Room-joined data received:', data);

          dispatch({
            type: MULTIPLAYER_ACTIONS.SET_CURRENT_ROOM,
            payload: {
              roomCode: data.roomId,
              hostId: data.hostId,
              symbol: data.symbol,
              market: data.market,
              settings: data.settings,
              gameState: data.gameState,
              players: data.players
            }
          });

          dispatch({ type: MULTIPLAYER_ACTIONS.SET_IS_HOST, payload: data.isHost });
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_STATUS, payload: data.gameState || 'waiting' });

          // Populate the players list immediately on join
          if (data.players && Array.isArray(data.players)) {
            const formatted = data.players.map(p => ({
              uid: p.uid || p.id,
              id: p.uid || p.id,
              displayName: p.displayName || p.name,
              name: p.displayName || p.name,
              balance: p.balance || 100000,
              isReady: p.isReady || false,
            }));
            dispatch({ type: MULTIPLAYER_ACTIONS.SET_PLAYERS, payload: formatted });
          }
        });

        // Set up leaderboard update listener
        const handleLeaderboardUpdate = (data) => {
          console.log('📊 Context received leaderboard update:', data);
          if (data.leaderboard && Array.isArray(data.leaderboard)) {
            // Update leaderboard - รองรับผู้เล่นทุกคนไม่จำกัดจำนวน
            dispatch({ type: MULTIPLAYER_ACTIONS.SET_LEADERBOARD, payload: data.leaderboard });
            
            // Update players with latest balance data - รองรับผู้เล่นมากกว่า 4 คน
            const updatedPlayers = data.leaderboard.map(player => ({
              uid: player.id,
              id: player.id,
              name: player.name,
              displayName: player.name,
              balance: player.balance,
              portfolioValue: player.portfolioValue,
              totalValue: (player.balance || 0) + (player.portfolioValue || 0),
              position: player.position || 0,
              timestamp: player.timestamp || Date.now()
            }));
            
            // Sort players by totalValue to ensure consistent ordering
            updatedPlayers.sort((a, b) => b.totalValue - a.totalValue);
            
            dispatch({ type: MULTIPLAYER_ACTIONS.SET_PLAYERS, payload: updatedPlayers });
            
            console.log(`📊 Updated ${updatedPlayers.length} players in leaderboard`);
          }
        };

        multiplayerService.socket.on('leaderboard-update', handleLeaderboardUpdate);

        // Set up countdown event listener
        const handleCountdownStarted = (data) => {
          console.log('⏰ Context received countdown-started:', data);
          // ใช้ custom event เพื่อ trigger countdown ใน WaitingRoom
          window.dispatchEvent(new CustomEvent('multiplayer-countdown-started', { 
            detail: data 
          }));
        };

        multiplayerService.socket.on('countdown-started', handleCountdownStarted);
      };

      // Setup เมื่อ socket พร้อม
      if (multiplayerService.socket?.connected) {
        setupSocketListeners();
      }

      // Setup event listeners for game callbacks
      if (typeof multiplayerService.setGameStartedCallback === 'function') {
        multiplayerService.setGameStartedCallback((data) => {
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_GAME_STARTED, payload: true });
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_STATUS, payload: 'playing' });
        });
      }

      if (typeof multiplayerService.setGameEndedCallback === 'function') {
        multiplayerService.setGameEndedCallback((data) => {
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_GAME_ENDED, payload: true });
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_STATUS, payload: 'finished' });
        });
      }

      if (typeof multiplayerService.setGameFinishedCallback === 'function') {
        multiplayerService.setGameFinishedCallback((data) => {
          console.log('🏁 Context received game-finished:', data);
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_GAME_ENDED, payload: true });
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_STATUS, payload: 'finished' });
          
          // Trigger custom event for UI components with final results
          console.log('📢 Dispatching multiplayer-game-finished event with results:', data.results || data.finalLeaderboard);
          window.dispatchEvent(new CustomEvent('multiplayer-game-finished', { 
            detail: { 
              ...data,
              finalResults: data.results || data.finalLeaderboard
            } 
          }));
        });
      }

      // ตั้งค่า listener สำหรับ socket connection event
      const originalConnect = multiplayerService.connect?.bind(multiplayerService);
      if (originalConnect) {
        multiplayerService.connect = (...args) => {
          const result = originalConnect(...args);
          if (result?.on) {
            result.on('connect', setupSocketListeners);
          }
          return result;
        };
      }
      
      // Cleanup function
      return () => {
        if (multiplayerService.socket) {
          multiplayerService.socket.off('room-joined');
          multiplayerService.socket.off('leaderboard-update');
          multiplayerService.socket.off('countdown-started');
        }
      };
    } catch (error) {
      console.warn('⚠️ Error setting up multiplayer service callbacks:', error);
    }
  }, []);
  
  const createRoom = async (roomSettings) => {
    try {
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ERROR, payload: null });
      
      // ตรวจสอบการเข้าสู่ระบบก่อน
      if (!currentUser) {
        throw new Error('กรุณาเข้าสู่ระบบก่อน');
      }

      // 🔌 เชื่อมต่อกับ server ก่อนสร้างห้อง
      console.log('🔌 Connecting to multiplayer service before creating room...');
      await multiplayerService.connectWithAuth();

      if (!multiplayerService.isConnected) {
        throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      }

      // เตรียมข้อมูลสำหรับสร้างห้อง
      const roomData = {
        ...roomSettings,
        hostId: currentUser.uid,
        hostName: currentUser.displayName || 'Anonymous'
      };

      console.log('✅ Connected to server, now creating room...');
      const result = await multiplayerService.createRoom(roomData);
      
      if (result && result.success) {
        dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_STATUS, payload: 'waiting' });
        return result;
      } else {
        throw new Error('ไม่สามารถสร้างห้องได้');
      }
    } catch (error) {
      console.error('❌ Create room error:', error);
      
      // แปลงข้อผิดพลาดเป็นข้อความที่เข้าใจง่าย
      let errorMessage = error.message;
      
      if (error.code === 'permission-denied') {
        errorMessage = 'ไม่มีสิทธิ์สร้างห้อง กรุณาลองเข้าสู่ระบบใหม่';
      } else if (error.code === 'unavailable') {
        errorMessage = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่';
      } else if (error.code === 'unauthenticated') {
        errorMessage = 'กรุณาเข้าสู่ระบบก่อนสร้างห้อง';
      } else if (error.message?.includes('Missing or insufficient permissions')) {
        errorMessage = 'ระบบกำลังอัพเดท กรุณารอสักครู่แล้วลองใหม่';
      }
      
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ERROR, payload: errorMessage });
      throw new Error(errorMessage);
    } finally {
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const joinRoom = async (roomCode) => {
    try {
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ERROR, payload: null });
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_STATUS, payload: 'joining' });
      
      // 🔌 เชื่อมต่อกับ server ก่อนเข้าร่วมห้อง
      console.log('🔌 Connecting to multiplayer service before joining room...');
      await multiplayerService.connectWithAuth();
      
      if (!multiplayerService.isConnected) {
        throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      }
      
      console.log('✅ Connected to server, now joining room:', roomCode);
      const result = await multiplayerService.joinRoom(roomCode);
      
      if (result.success) {
        dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_STATUS, payload: 'waiting' });
        console.log('✅ Successfully joined room:', roomCode);
        return result;
      }
    } catch (error) {
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ERROR, payload: error.message });
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_STATUS, payload: 'idle' });
      throw error;
    } finally {
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const leaveRoom = async () => {
    try {
      if (state.currentRoom) {
        await multiplayerService.leaveRoom(state.currentRoom.roomCode);
        multiplayerService.unsubscribeAll();
        dispatch({ type: MULTIPLAYER_ACTIONS.RESET_STATE });
      }
    } catch (error) {
      console.error('❌ Error leaving room:', error);
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  const startGame = async () => {
    try {
      if (!state.currentRoom) {
        throw new Error('No current room found');
      }
      
      if (!state.isHost) {
        throw new Error('Only host can start the game');
      }
      
      if (state.roomStatus === 'playing') {
        return { success: true, message: 'Game is already running' };
      }
      
      // ป้องกันการเรียกซ้ำขณะกำลังโหลด
      if (state.loading) {
        return { success: false, message: 'Start game already in progress' };
      }
      
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_LOADING, payload: true });

      // ✅ 2. Host ทำการสุ่มตลาดและส่งไปพร้อมคำสั่ง startGame
      const randomIndex = Math.floor(Math.random() * MARKET_SYMBOL_POOL.length);
      const selectedPair = MARKET_SYMBOL_POOL[randomIndex];

      console.log(`👑 Host is randomizing market/symbol for room ${state.currentRoom.roomCode}:`, selectedPair);

      const result = await multiplayerService.startGame(state.currentRoom.roomCode, {
        market: selectedPair.market,
        symbol: selectedPair.symbol,
      });
      
      if (result.success) {
        dispatch({ type: MULTIPLAYER_ACTIONS.SET_GAME_STARTED, payload: true });
        dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_STATUS, payload: 'playing' });
      }
      
      return result;
    } catch (error) {
      // หาก error เป็น "Game already started" ให้ถือว่าสำเร็จ
      if (error.message && error.message.includes('Game already started')) {
        dispatch({ type: MULTIPLAYER_ACTIONS.SET_GAME_STARTED, payload: true });
        dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_STATUS, payload: 'playing' });
        return { success: true, message: 'Game is already running' };
      }
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const startCountdown = async () => {
    try {
      if (!state.currentRoom) {
        throw new Error('No current room found');
      }
      
      if (!state.isHost) {
        throw new Error('Only host can start countdown');
      }
      
      // ป้องกันการเรียกซ้ำขณะกำลังโหลด
      if (state.loading) {
        return { success: false, message: 'Countdown already in progress' };
      }
      
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_LOADING, payload: true });
      
      const result = await multiplayerService.startCountdown(state.currentRoom.roomCode);
      
      return result;
    } catch (error) {
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // === TRADING OPERATIONS ===
  
  const executeTrade = async (tradeData) => {
    try {
      if (!state.currentRoom || !currentUser) {
        throw new Error('Not in a valid game session');
      }

      const result = await multiplayerService.executeTrade(
        state.currentRoom.roomCode,
        currentUser.uid,
        tradeData
      );
      
      if (result.success) {
        dispatch({ type: MULTIPLAYER_ACTIONS.ADD_TRADE, payload: result.trade });
      }
      
      return result;
    } catch (error) {
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  const closeTrade = async (tradeId, closePrice) => {
    try {
      if (!state.currentRoom || !currentUser) {
        throw new Error('Not in a valid game session');
      }

      const result = await multiplayerService.closeTrade(
        state.currentRoom.roomCode,
        currentUser.uid,
        tradeId,
        closePrice
      );
      
      if (result.success) {
        dispatch({ type: MULTIPLAYER_ACTIONS.UPDATE_TRADE, payload: result.closedTrade });
      }
      
      return result;
    } catch (error) {
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  // === REAL-TIME SUBSCRIPTIONS ===
  
  const subscribeToRoom = useCallback((roomCode) => {
    // ป้องกัน invalid roomCode
    if (!roomCode || roomCode === 'undefined' || roomCode.trim() === '') {
      console.warn('❌ Invalid roomCode for subscribeToRoom:', roomCode);
      return () => {}; // Return empty cleanup function
    }

    console.log('🏠 Setting up room subscription for:', roomCode);
    return multiplayerService.subscribeToRoom(roomCode, (snapshot) => {
      if (!snapshot || typeof snapshot !== 'object') return;

      const roomData = snapshot;
      const payload = { ...roomData, roomCode: roomData.roomCode || roomCode };

      dispatch({ type: MULTIPLAYER_ACTIONS.SET_CURRENT_ROOM, payload });
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_STATUS, payload: roomData.status || 'waiting' });

      if (currentUser) {
        dispatch({ type: MULTIPLAYER_ACTIONS.SET_IS_HOST, payload: roomData.hostId === currentUser.uid });
      }

      if (roomData.status === 'playing' && !gameStateRef.current.gameStarted) {
        dispatch({ type: MULTIPLAYER_ACTIONS.SET_GAME_STARTED, payload: true });
      }

      if (roomData.status === 'finished' && !gameStateRef.current.gameEnded) {
        dispatch({ type: MULTIPLAYER_ACTIONS.SET_GAME_ENDED, payload: true });
        if (roomData.leaderboard) {
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_LEADERBOARD, payload: roomData.leaderboard });
        }
      }
    });
  }, [currentUser, gameStateRef]);

  const subscribeToPlayers = useCallback((roomCode) => {
    // ป้องกัน invalid roomCode
    if (!roomCode || roomCode === 'undefined' || roomCode.trim() === '') {
      return () => {}; // Return empty cleanup function
    }

    return multiplayerService.subscribeToPlayers(roomCode, (snapshot) => {
      const players = [];
      snapshot.forEach(doc => {
        players.push({ id: doc.id, ...doc.data() });
      });
      
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_PLAYERS, payload: players });
      
      // Update current player data
      if (currentUser) {
        const currentPlayer = players.find(p => p.uid === currentUser.uid);
        if (currentPlayer) {
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_CURRENT_PLAYER, payload: currentPlayer });
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_BALANCE, payload: currentPlayer.balance });
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_TOTAL_PNL, payload: currentPlayer.totalPnL });
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_OPEN_POSITIONS, payload: currentPlayer.openPositions || [] });
        }
      }
    });
  }, [currentUser]);

  const subscribeToRoomEvents = useCallback((roomCode) => {
    return multiplayerService.subscribeToRoomEvents(roomCode, (snapshot) => {
      const events = [];
      snapshot.forEach(doc => {
        events.push({ id: doc.id, ...doc.data() });
      });
      
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_ROOM_EVENTS, payload: events });
    });
  }, []);

  const subscribeToLeaderboard = useCallback((roomCode) => {
    return multiplayerService.subscribeToLeaderboard(roomCode, (snapshot) => {
      const leaderboard = [];
      snapshot.forEach(doc => {
        leaderboard.push({ id: doc.id, ...doc.data() });
      });
      
      dispatch({ type: MULTIPLAYER_ACTIONS.SET_LEADERBOARD, payload: leaderboard });
    });
  }, []);

  // === TIMER MANAGEMENT ===
  
  useEffect(() => {
    let timer;
    
    if (state.gameStarted && state.currentRoom && !state.gameEnded) {
      const gameEndTime = state.currentRoom.gameEndTime;
      
      timer = setInterval(() => {
        if (gameEndTime) {
          const remaining = Math.max(0, new Date(gameEndTime.toDate()).getTime() - Date.now());
          dispatch({ type: MULTIPLAYER_ACTIONS.SET_TIME_REMAINING, payload: Math.floor(remaining / 1000) });
          
          if (remaining <= 0) {
            dispatch({ type: MULTIPLAYER_ACTIONS.SET_GAME_ENDED, payload: true });
            clearInterval(timer);
          }
        }
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameStarted, state.gameEnded, state.currentRoom?.gameEndTime]); // ใช้ specific field แทนทั้ง object

  // === CLEANUP ===
  
  useEffect(() => {
    return () => {
      multiplayerService.unsubscribeAll();
    };
  }, []);

  // Context value
  const value = {
    // State
    ...state,
    
    // Room Operations
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    startCountdown,
    
    // Trading Operations
    executeTrade,
    closeTrade,
    
    // Real-time Subscriptions
    subscribeToRoom,
    subscribeToPlayers,
    subscribeToRoomEvents,
    subscribeToLeaderboard,
    
    // Utilities
    clearError: () => dispatch({ type: MULTIPLAYER_ACTIONS.SET_ERROR, payload: null }),
    resetState: () => dispatch({ type: MULTIPLAYER_ACTIONS.RESET_STATE })
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
};

export default MultiplayerContext;
