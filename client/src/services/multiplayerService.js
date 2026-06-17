import { io } from 'socket.io-client';

class MultiplayerService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentRoom = null;
    this.currentPlayers = [];
    
    // Dynamic server URL detection
    const getServerUrl = () => {
      // ใช้ environment variable ก่อน
      if (process.env.REACT_APP_SOCKET_URL) {
        return process.env.REACT_APP_SOCKET_URL;
      }
      
      // Production: ใช้ backend server IP แทนการ detect จาก current host
      if (process.env.NODE_ENV === 'production') {
        // แทนที่ด้วย IP ของเครื่อง backend server
        return 'http://147.50.252.213:5000';
      }
      
      // Development: fallback to localhost
      return 'http://localhost:5000';
    };
    
    this.serverUrl = getServerUrl();
    
    // Auto-connect เมื่อสร้าง instance
    this.autoConnect();
  }

  // Auto-connect method
  autoConnect() {
    if (typeof window !== 'undefined') {
      // ไม่เชื่อมต่ออัตโนมัติ ให้ component เรียก connect เมื่อต้องการใช้งาน
      console.log('📝 MultiplayerService ready. Call connect() when needed.');
    }
  }

  // Method สำหรับการเชื่อมต่อด้วย Firebase Auth
  async connectWithAuth() {
    if (this.socket?.connected) {
      console.log('✅ Already connected to server');
      return this.socket;
    }

    console.log('🔌 Attempting to connect with auth...');
    
    try {
      // Get current user from Supabase auth
      const { supabase } = await import('../supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;

      return new Promise((resolve, reject) => {
          try {
            if (user) {
              console.log('👤 User authenticated:', user.id);
              const displayName = user.user_metadata?.full_name || user.user_metadata?.displayName || user.email?.split('@')[0] || 'Anonymous';
              user.uid = user.id; // normalize
              user.displayName = displayName;
              const userName = displayName;
              const socket = this.connect(user.uid, userName);
              
              // รอให้เชื่อมต่อสำเร็จ
              if (socket) {
                socket.on('connect', () => {
                  console.log('✅ Socket connected successfully');
                  resolve(socket);
                });
                
                socket.on('connect_error', (error) => {
                  console.error('❌ Socket connection error:', error);
                  reject(new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ' + error.message));
                });
                
                // Timeout หากเชื่อมต่อไม่สำเร็จ
                setTimeout(() => {
                  if (!socket.connected) {
                    reject(new Error('การเชื่อมต่อหมดเวลา'));
                  }
                }, 10000);
              } else {
                reject(new Error('ไม่สามารถสร้าง socket connection ได้'));
              }
            } else {
              console.log('👤 No user, using anonymous connection');
              const socket = this.connect('anonymous', 'Anonymous User');
              
              if (socket) {
                socket.on('connect', () => {
                  console.log('✅ Anonymous socket connected successfully');
                  resolve(socket);
                });
                
                socket.on('connect_error', (error) => {
                  console.error('❌ Anonymous socket connection error:', error);
                  reject(new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: ' + error.message));
                });
                
                setTimeout(() => {
                  if (!socket.connected) {
                    reject(new Error('การเชื่อมต่อหมดเวลา'));
                  }
                }, 10000);
              } else {
                reject(new Error('ไม่สามารถสร้าง anonymous socket connection ได้'));
              }
            }
          } catch (connectError) {
            console.error('❌ Connection setup error:', connectError);
            reject(connectError);
          }
      });
    } catch (error) {
      console.error('❌ ConnectWithAuth error:', error);
      throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message);
    }
  }

  // เชื่อมต่อ Socket.io
  connect(userId, userName) {
    if (this.socket?.connected) {
      console.log('✅ Socket already connected, returning existing socket');
      return this.socket;
    }

    console.log(`🔌 Creating new socket connection for user: ${userId}`);
    
    this.socket = io(this.serverUrl, {
      query: { userId, userName },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected to server');
      this.isConnected = true;
      this.playerId = userId;
      
      // Setup game event listeners when connected
      this.setupGameEventListeners();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.isConnected = false;
      this.currentRoom = null;
      this.currentPlayers = [];
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('reconnect', () => {
      console.log('🔄 Socket reconnected');
      this.isConnected = true;
    });

    return this.socket;
  }

  // Setup event listeners for game events
  setupGameEventListeners() {
    if (!this.socket) return;

    // Listen for game start
    this.socket.on('game-started', (data) => {      
      // Notify any listeners (like MultiplayerContext)
      if (this.onGameStarted) {
        this.onGameStarted(data);
      }
    });

    // Listen for game end
    this.socket.on('game-ended', (data) => {
      if (this.onGameEnded) {
        this.onGameEnded(data);
      }
    });

    // Listen for game finished (from server timer)
    this.socket.on('game-finished', (data) => {
      console.log('🏁 Game finished event received:', data);
      if (this.onGameFinished) {
        this.onGameFinished(data);
      }
    });
  }

  // Set callback for game started
  setGameStartedCallback(callback) {
    this.onGameStarted = callback;
  }

  // Set callback for game ended
  setGameEndedCallback(callback) {
    this.onGameEnded = callback;
  }

  // Set callback for game finished (server-side timer)
  setGameFinishedCallback(callback) {
    this.onGameFinished = callback;
  }

  // ตัดการเชื่อมต่อ
  disconnect() {
    console.log('🔌 Disconnecting from multiplayer service...');
    
    // Clean up Firebase subscriptions
    if (this.roomUnsubscribe) {
      this.roomUnsubscribe();
      this.roomUnsubscribe = null;
    }
    
    if (this.playersUnsubscribe) {
      this.playersUnsubscribe();
      this.playersUnsubscribe = null;
    }
    
    // Reset socket listener flags
    this.socketRoomListeners = false;
    this.socketPlayersListeners = false;
    
    // Reset pending operations
    this.startGamePending = null;
    
    // Disconnect socket
    if (this.socket) {
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Reset state
    this.isConnected = false;
    this.currentRoom = null;
    this.currentPlayers = [];
    this.playerId = null;
  }

  // สร้างห้อง
  async createRoom(roomSettings = {}) {
    // เชื่อมต่อก่อนถ้ายังไม่ได้เชื่อมต่อ
    if (!this.socket?.connected) {
      try {
        await this.connectWithAuth();
        // รอให้เชื่อมต่อเสร็จ
        await new Promise(resolve => {
          if (this.socket?.connected) {
            resolve();
          } else {
            this.socket?.once('connect', resolve);
          }
        });
      } catch (error) {
        console.error('❌ Failed to connect:', error);
        return Promise.reject(new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'));
      }
    }

    return new Promise((resolve, reject) => {
      // Generate room code
      const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // ตั้งค่า timeout
      const timeout = setTimeout(() => {
        // Fallback: ใช้ roomCode ที่สร้างไว้แทน
        resolve({ 
          success: true, 
          roomCode: roomCode,
          roomId: roomCode,
          fallback: true,
          message: 'Room created locally (server timeout)'
        });
      }, 10000);

      // ฟัง response - room joined (สำหรับห้องที่สร้างใหม่)
      const handleRoomJoined = (data) => {
        clearTimeout(timeout);
        this.currentRoom = data.roomId;
        this.currentPlayers = data.players || [];
        resolve({ 
          success: true, 
          roomCode: data.roomId,
          ...data 
        });
      };

      // ฟัง error
      const handleError = (error) => {
        clearTimeout(timeout);
        console.error('❌ Room creation error:', error);
        reject(new Error(error.message || 'ไม่สามารถสร้างห้องได้'));
      };

      this.socket.once('room-joined', handleRoomJoined);
      this.socket.once('error', handleError);
      this.socket.once('disconnect', () => {
        clearTimeout(timeout);
        reject(new Error('การเชื่อมต่อขาดหาย'));
      });

      // ส่ง event สร้างห้อง - ใช้ join-room แทน createRoom พร้อมส่ง settings
      console.log('📤 Sending join-room event with settings:', {
        roomId: roomCode,
        playerId: roomSettings.hostId || 'anonymous',
        playerName: roomSettings.hostName || 'Host',
        roomSettings: roomSettings // ส่ง settings ไปด้วย
      });
      console.log('📤 Socket connected:', this.socket?.connected);
      console.log('📤 Room code being sent:', roomCode);

      this.socket.emit('join-room', {
        roomId: roomCode,
        playerId: roomSettings.hostId || 'anonymous',
        playerName: roomSettings.hostName || 'Host',
        roomSettings: roomSettings // ส่ง settings ไปยัง server
      });
    });
  }

  // เข้าร่วมห้อง
  async joinRoom(roomId) {
    if (!this.socket?.connected) {
      return Promise.reject(new Error('Not connected to server'));
    }

    // Skip rejoin if already in this room (prevents double-join from JoinGame + WaitingRoom)
    if (this.currentRoom === roomId) {
      console.log('✅ Already in room', roomId, '— skipping rejoin');
      return { success: true, roomCode: roomId };
    }

    // Get current user from Supabase auth
    const { supabase } = await import('../supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUser = session?.user || null;
    const currentUser = supabaseUser ? {
      uid: supabaseUser.id,
      displayName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.displayName || supabaseUser.email?.split('@')[0] || 'Player',
      email: supabaseUser.email
    } : null;

    return new Promise((resolve, reject) => {
      // ตั้งค่า timeout
      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 10000);

      // ฟัง response
      this.socket.once('room-joined', (data) => {
        clearTimeout(timeout);
        this.currentRoom = data.roomId;
        this.currentPlayers = data.players || [];
        resolve({ 
          success: true, 
          roomCode: data.roomId,
          ...data 
        });
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // ส่ง event เข้าร่วมห้อง พร้อมข้อมูลผู้เล่นที่ถูกต้อง
      const joinData = { 
        roomId,
        playerId: currentUser?.uid || 'anonymous',
        playerName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Player'
      };
      
      console.log('🚪 Sending join-room event:', joinData);
      this.socket.emit('join-room', joinData);
    });
  }

  // ออกจากห้อง
  leaveRoom(roomCode) {
    if (!this.socket?.connected) {
      return false;
    }
    const targetRoom = roomCode || this.currentRoom;
    if (!targetRoom) {
      return false;
    }
    this.socket.emit('leave-room', { roomId: targetRoom });
    this.currentRoom = null;
    this.currentPlayers = [];
    return true;
  }

  // เริ่มเกม (เพิ่มใหม่)
  startGame(roomCode, gameSettings = {}) {
    if (!this.socket?.connected) {
      return Promise.reject(new Error('Not connected to server'));
    }

    // ใช้ roomCode ที่ส่งมา หรือ currentRoom ถ้าไม่มี
    const targetRoom = roomCode || this.currentRoom;
    if (!targetRoom) {
      return Promise.reject(new Error('No room specified and not in any room'));
    }

    // ป้องกันการเรียกซ้ำ - ตรวจสอบว่ากำลังรอการเริ่มเกมอยู่หรือไม่
    if (this.startGamePending) {
      return this.startGamePending;
    }

    this.startGamePending = new Promise((resolve, reject) => {
      // ตั้งค่า timeout
      const timeout = setTimeout(() => {
        this.startGamePending = null; // รีเซ็ต pending state
        reject(new Error('Start game timeout'));
      }, 10000);

      // ฟัง response
      const gameStartedHandler = (data) => {
        clearTimeout(timeout);
        this.startGamePending = null; // รีเซ็ต pending state
        resolve({ success: true, ...data });
      };

      const errorHandler = (error) => {
        clearTimeout(timeout);
        this.startGamePending = null; // รีเซ็ต pending state
        reject(error);
      };

      this.socket.once('game-started', gameStartedHandler);
      this.socket.once('error', errorHandler);

      // ส่ง event เริ่มเกม
      const startGameData = {
        roomId: targetRoom,
        playerId: this.playerId, // ใช้ playerId ที่เก็บไว้
        symbol: gameSettings.symbol || 'PTT',
        duration: gameSettings.duration || 300,
        startTime: Date.now(),
        ...gameSettings
      };
      
      console.log('🎮 Sending start-game event:', startGameData);
      this.socket.emit('start-game', startGameData);
    });

    return this.startGamePending;
  }

  // เริ่ม countdown (เพิ่มใหม่) - ส่งให้ทุกคนในห้องเห็น countdown
  startCountdown(roomCode) {
    if (!this.socket?.connected) {
      return Promise.reject(new Error('Not connected to server'));
    }

    // ใช้ roomCode ที่ส่งมา หรือ currentRoom ถ้าไม่มี
    const targetRoom = roomCode || this.currentRoom;
    if (!targetRoom) {
      return Promise.reject(new Error('No room specified and not in any room'));
    }

    return new Promise((resolve, reject) => {
      // ตั้งค่า timeout
      const timeout = setTimeout(() => {
        reject(new Error('Start countdown timeout'));
      }, 5000);

      // ฟัง response
      const countdownStartedHandler = (data) => {
        clearTimeout(timeout);
        resolve({ success: true, ...data });
      };

      const errorHandler = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      this.socket.once('countdown-started', countdownStartedHandler);
      this.socket.once('error', errorHandler);

      // ส่ง event เริ่ม countdown
      const countdownData = {
        roomId: targetRoom,
        playerId: this.playerId, // ใช้ playerId ที่เก็บไว้
      };
      
      console.log('⏰ Sending start-countdown event:', countdownData);
      this.socket.emit('start-countdown', countdownData);
    });
  }

  // ส่งข้อมูลการเทรด
  makeTrade(tradeData) {
    if (!this.socket?.connected || !this.currentRoom) {
      console.error('❌ Not connected or not in room');
      return false;
    }

    this.socket.emit('make-trade', {
      roomId: this.currentRoom,
      ...tradeData
    });

    return true;
  }

  // Update player state (balance, position, totalValue)
  updatePlayerState(playerData) {
    if (!this.socket?.connected || !this.currentRoom) {
      console.error('❌ Not connected or not in room');
      return false;
    }

    this.socket.emit('update-player-state', {
      roomId: this.currentRoom,
      ...playerData
    });

    return true;
  }

  // Submit trade (wrapper for makeTrade)
  async submitTrade(roomCode, tradeData) {
    if (!this.socket?.connected) {
      console.error('❌ Not connected to server');
      return Promise.reject(new Error('Not connected to server'));
    }

    try {
      // ใช้ makeTrade method ที่มีอยู่แล้ว
      const result = this.makeTrade({
        roomId: roomCode,
        ...tradeData
      });
      
      if (result) {
        console.log('✅ Trade submitted successfully:', tradeData);
        return Promise.resolve(result);
      } else {
        throw new Error('Failed to submit trade');
      }
    } catch (error) {
      console.error('❌ Error submitting trade:', error);
      return Promise.reject(error);
    }
  }

  // Update player data via socket
  async updatePlayerData(roomCode, playerData) {
    try {
      const updateData = {
        balance: playerData.balance,
        position: playerData.position,
        totalValue: playerData.totalValue,
        lastActive: new Date().toISOString(),
        timestamp: playerData.timestamp || Date.now()
      };

      if (this.socket?.connected) {
        this.socket.emit('update-player-data', { roomCode, playerData: updateData });
      }
      console.log('✅ Player data sent via socket:', updateData);
      return Promise.resolve(updateData);
    } catch (error) {
      console.error('❌ Error updating player data:', error);
      return Promise.reject(error);
    }
  }

  // Update room data (host only)
  updateRoom(roomCode, data) {
    if (!this.socket?.connected) {
      console.error('❌ Not connected to server');
      return Promise.reject(new Error('Not connected to server'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Update room timeout'));
      }, 5000);

      this.socket.once('room-data-updated', (responseData) => {
        clearTimeout(timeout);
        resolve(responseData);
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.socket.emit('update-room-data', {
        roomId: roomCode,
        data
      });
    });
  }

  // Update room settings (host only)
  updateRoomSettings(roomCode, settings) {
    if (!this.socket?.connected) {
      console.error('❌ Not connected to server');
      return Promise.reject(new Error('Not connected to server'));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Update settings timeout'));
      }, 5000);

      this.socket.once('room-settings-updated', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.socket.emit('update-room-settings', {
        roomId: roomCode,
        settings
      });
    });
  }

  // Pause game (host only)
  pauseGame(roomCode) {
    if (!this.socket?.connected) {
      console.error('❌ Not connected to server');
      return Promise.reject(new Error('Not connected to server'));
    }

    this.socket.emit('pause-game', { roomId: roomCode });
    return Promise.resolve();
  }

  // Reset game (host only)
  resetGame(roomCode) {
    if (!this.socket?.connected) {
      console.error('❌ Not connected to server');
      return Promise.reject(new Error('Not connected to server'));
    }

    this.socket.emit('reset-game', { roomId: roomCode });
    return Promise.resolve();
  }

  // ตรวจสอบสถานะการเชื่อมต่อ
  isSocketConnected() {
    return this.socket?.connected || false;
  }

  // ตรวจสอบสถานะ server
  async checkServerStatus() {
    try {
      // สร้าง headers พร้อม XSRF Token
      const headers = { 'Accept': 'application/json' };
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      if (cookies['XSRF-TOKEN']) {
        headers['X-XSRF-TOKEN'] = decodeURIComponent(cookies['XSRF-TOKEN']);
      }
      
      const response = await fetch(`${this.serverUrl}/health`, { headers });
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('❌ Server health check failed:', error);
      return false;
    }
  }

  // Clear listeners เพื่อป้องกัน memory leak
  clearListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.socket?.connected || false,
      room: this.currentRoom,
      playersCount: this.currentPlayers.length
    };
  }

  // Get current players
  getPlayers() {
    return this.currentPlayers;
  }

  // Set current player data
  setCurrentPlayer(playerData) {
    this.playerId = playerData.uid;
    this.playerData = playerData;
  }

  // Event listener helper methods
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Event Listeners
  onRoomCreated(callback) {
    if (this.socket) {
      this.socket.on('roomCreated', (data) => {
        this.currentRoom = data.roomId;
        callback(data);
      });
    }
  }

  onRoomJoined(callback) {
    if (this.socket) {
      this.socket.on('roomJoined', (data) => {
        this.currentRoom = data.roomId;
        this.currentPlayers = data.players || [];
        callback(data);
      });
    }
  }

  // เพิ่ม method สำหรับ room-joined event จาก server
  onRoomJoinedFromServer(callback) {
    if (this.socket) {
      this.socket.on('room-joined', (data) => {
        this.currentRoom = data.roomId;
        this.currentPlayers = data.players || [];
        callback(data);
      });
    }
  }

  onPlayerJoined(callback) {
    if (this.socket) {
      this.socket.on('playerJoined', (data) => {
        this.currentPlayers = data.players || [];
        callback(data);
      });
    }
  }

  onPlayerLeft(callback) {
    if (this.socket) {
      this.socket.on('playerLeft', (data) => {
        this.currentPlayers = data.players || [];
        callback(data);
      });
    }
  }

  onGameStarted(callback) {
    if (this.socket) {
      this.socket.on('gameStarted', callback);
    }
  }

  onGameEnded(callback) {
    if (this.socket) {
      this.socket.on('gameEnded', callback);
    }
  }

  onTradeUpdate(callback) {
    if (this.socket) {
      this.socket.on('tradeUpdate', callback);
    }
  }

  onLeaderboardUpdate(callback) {
    if (this.socket) {
      this.socket.on('leaderboardUpdate', (data) => {
        this.currentPlayers = data.players || [];
        callback(data);
      });
    }
  }

  onError(callback) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  // ลบ Event Listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  removeListener(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  // เพิ่ม method สำหรับ compatibility กับ code เดิม
  unsubscribeAll() {
    this.removeAllListeners();
  }

  subscribeToRoom(roomCode, callback) {
    try {
      // ตรวจสอบความถูกต้องของ roomCode
      if (!roomCode || roomCode === 'undefined' || roomCode.trim() === '') {
        console.warn('❌ Invalid roomCode for room subscription:', roomCode);
        return () => {}; // Return empty cleanup function
      }

      // Prevent duplicate subscriptions - ป้องกันการ subscribe ซ้ำซ้อน
      if (this.roomUnsubscribe) {
        console.log('🧹 Cleaning up existing room subscription for:', roomCode);
        this.roomUnsubscribe();
        this.roomUnsubscribe = null;
      }

      console.log('🔔 Setting up room subscription for:', roomCode);

      // Use Socket.IO for real-time room updates
      if (this.socket) {
        const onRoomUpdated = (data) => {
          if (data.status && data.status !== this.lastRoomStatus) {
            console.log('🏠 Room status changed:', data.status);
            this.lastRoomStatus = data.status;
          }
          callback(data);
        };
        this.socket.on('room-updated', onRoomUpdated);

        this.roomUnsubscribe = () => {
          this.socket?.off('room-updated', onRoomUpdated);
        };
      }

      return () => {
        if (this.roomUnsubscribe) {
          this.roomUnsubscribe();
          this.roomUnsubscribe = null;
        }
      };
    } catch (error) {
      console.error('❌ Error setting up room subscription:', error);
      return () => {};
    }
  }

  subscribeToPlayers(roomCode, callback) {
    try {
      // ตรวจสอบความถูกต้องของ roomCode
      if (!roomCode || roomCode === 'undefined' || roomCode.trim() === '') {
        console.warn('❌ Invalid roomCode for players subscription:', roomCode);
        return () => {}; // Return empty cleanup function
      }

      // Prevent duplicate subscriptions - ป้องกันการ subscribe ซ้ำซ้อน
      if (this.playersUnsubscribe) {
        console.log('🧹 Cleaning up existing players subscription for:', roomCode);
        this.playersUnsubscribe();
        this.playersUnsubscribe = null;
      }

      console.log('👥 Setting up players subscription for:', roomCode);

      // Use Socket.IO for real-time player updates
      if (this.socket) {
        const buildSnapshot = (rawPlayers) => {
          const players = Array.isArray(rawPlayers) ? rawPlayers : (rawPlayers?.players || []);
          return {
            forEach: (fn) => players.forEach(p => fn({
              id: p.uid || p.id,
              data: () => ({
                ...p,
                uid: p.uid || p.id,
                displayName: p.displayName || p.name,
              })
            }))
          };
        };

        const onPlayersUpdated = (data) => callback(buildSnapshot(data));
        const onPlayerJoined = (data) => {
          console.log('👤 Player joined:', data?.playerName);
          callback(buildSnapshot(data));
        };
        const onPlayerLeft = (data) => {
          console.log('👤 Player left:', data?.playerName || data?.playerId);
          if (data?.players) callback(buildSnapshot(data));
        };

        this.socket.on('players-updated', onPlayersUpdated);
        this.socket.on('player-joined', onPlayerJoined);
        this.socket.on('player-left', onPlayerLeft);

        this.playersUnsubscribe = () => {
          this.socket?.off('players-updated', onPlayersUpdated);
          this.socket?.off('player-joined', onPlayerJoined);
          this.socket?.off('player-left', onPlayerLeft);
        };
      }

      return () => {
        if (this.playersUnsubscribe) {
          this.playersUnsubscribe();
          this.playersUnsubscribe = null;
        }
      };
    } catch (error) {
      console.error('❌ Error setting up players subscription:', error);
      return () => {};
    }
  }

  subscribeToRoomEvents(roomCode, callback) {
    if (this.socket) {
      this.socket.on('room-event', callback);
      this.socket.on('game-started', callback);
      this.socket.on('game-ended', callback);
    }
  }

  subscribeToLeaderboard(roomCode, callback) {
    if (this.socket) {
      this.socket.on('leaderboard-update', callback);
      this.socket.on('trade-executed', callback);
    }
  }

  // Trade methods
  async executeTrade(roomCode, tradeData) {
    return new Promise((resolve) => {
      this.makeTrade(tradeData);
      resolve({ success: true });
    });
  }

  async closeTrade(roomCode, tradeId) {
    return new Promise((resolve) => {
      // ส่ง event ปิด trade
      if (this.socket) {
        this.socket.emit('close-trade', { tradeId });
      }
      resolve({ success: true });
    });
  }

  // Getter methods
  getCurrentRoom() {
    return this.currentRoom;
  }

  isConnectedToRoom() {
    return this.isConnected && this.currentRoom;
  }
}

// Export single instance
const multiplayerService = new MultiplayerService();
export default multiplayerService;
