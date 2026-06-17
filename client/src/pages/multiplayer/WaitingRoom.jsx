import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebase";
import { FaPlay, FaUserCircle, FaLink, FaClock, FaUsers, FaSignOutAlt } from "react-icons/fa";
import challenge1 from "../../assets/challenge1.webp";
import challenge2 from "../../assets/challenge2.webp";
import GameHeader from "../../components/common/GameHeader";
import CountdownTimer from "../../components/common/CountdownTimer";
import { useMultiplayer } from "../../contexts/MultiplayerContext";
import { useConnectionStatus } from "../../hooks/useConnectionStatus";

export default function WaitingRoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { isOnline, isConnected, reconnecting } = useConnectionStatus();
  
  const {
    currentRoom,
    players,
    isHost,
    roomStatus,
    loading,
    error,
    subscribeToRoom,
    subscribeToPlayers,
    startGame,
    startCountdown,
    joinRoom,
    leaveRoom
  } = useMultiplayer();

  const [initializing, setInitializing] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  
  // Use refs to track subscription state and prevent duplicate subscriptions
  const subscriptionsSetup = useRef(false);
  const roomUnsubRef = useRef(null);
  const playersUnsubRef = useRef(null);

  // Listen for countdown events from server
  useEffect(() => {
    const handleCountdownStarted = (event) => {
      console.log('⏰ WaitingRoom received countdown-started event:', event.detail);
      setShowCountdown(true);
    };

    window.addEventListener('multiplayer-countdown-started', handleCountdownStarted);
    
    return () => {
      window.removeEventListener('multiplayer-countdown-started', handleCountdownStarted);
    };
  }, []);

  useEffect(() => {
    // Prevent duplicate subscriptions
    if (subscriptionsSetup.current) return;
    
    let authUnsub = null;

    const initializeRoom = async () => {
      if (!roomCode) return;
      
      if (!auth.currentUser) {
        // Wait for auth to be ready (only once)
        authUnsub = auth.onAuthStateChanged(async (user) => {
          if (user) {
            authUnsub(); // cleanup auth listener
            await setupSubscriptions();
          } else {
            navigate('/login');
          }
        });
        return;
      } else {
        await setupSubscriptions();
      }
    };

    const setupSubscriptions = async () => {
      if (!roomCode || roomCode === 'undefined' || roomCode.trim() === '') {
        console.warn('❌ WaitingRoom: Invalid roomCode for subscriptions:', roomCode);
        // รอเล็กน้อยก่อน redirect เผื่อ roomCode กำลังโหลด
        setTimeout(() => {
          if (!roomCode || roomCode === 'undefined' || roomCode.trim() === '') {
            navigate('/challenge');
          }
        }, 1500); // รอ 1.5 วินาที
        return;
      }
      
      // Mark subscriptions as setup to prevent duplicates
      subscriptionsSetup.current = true;
      
      console.log('🔗 WaitingRoom: Setting up subscriptions for room:', roomCode);
      
      try {
        // เข้าร่วมห้องผ่าน Socket.IO ก่อน
        await joinRoom(roomCode);
        console.log('✅ Successfully joined room via socket:', roomCode);
      } catch (joinError) {
        console.error('❌ Failed to join room via socket:', joinError);
        
        // แสดง error ที่เข้าใจง่าย
        let errorMessage = 'ไม่สามารถเข้าร่วมห้องได้';
        if (joinError.message?.includes('Room is full')) {
          errorMessage = 'ห้องเต็มแล้ว ไม่สามารถเข้าร่วมได้';
        } else if (joinError.message?.includes('Game has already finished')) {
          errorMessage = 'เกมสิ้นสุดแล้ว ไม่สามารถเข้าร่วมได้';
        } else if (joinError.message?.includes('timeout')) {
          errorMessage = 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง';
        }
        
        alert(errorMessage);
        navigate('/challenge');
        return;
      }
      
      // Subscribe to room data
      roomUnsubRef.current = subscribeToRoom(roomCode);
      
      // Subscribe to players
      playersUnsubRef.current = subscribeToPlayers(roomCode);
      
      setInitializing(false);
    };

    initializeRoom();
    
    return () => {
      // Clean up all subscriptions
      if (authUnsub && typeof authUnsub === 'function') authUnsub();
      if (roomUnsubRef.current && typeof roomUnsubRef.current === 'function') {
        roomUnsubRef.current();
        roomUnsubRef.current = null;
      }
      if (playersUnsubRef.current && typeof playersUnsubRef.current === 'function') {
        playersUnsubRef.current();
        playersUnsubRef.current = null;
      }
      subscriptionsSetup.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, navigate]); // subscribeToRoom and subscribeToPlayers intentionally excluded to prevent re-subscription loops

  // Handle game start navigation
  useEffect(() => {
    if (roomStatus === 'playing') {
      // Clean up subscriptions before navigating
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          navigate(`/game/${roomCode}`, {
            state: { 
              timeLimit: currentRoom?.settings?.timeLimit || 300,
              startDate: currentRoom?.startDate,
              symbol: currentRoom?.symbol || 'PTT'
            },
            replace: true // Replace current history entry
          });
        }, 500); // Small delay to ensure state is updated
      }
    }
  }, [roomStatus, navigate, roomCode, currentRoom]);

  const handleStartGame = async () => {
    if (!isHost) {
      console.warn("❌ Only host can start the game");
      return;
    }
    
    console.log("🎮 Starting game countdown...", {
      roomCode,
      playersCount: players.length,
      isHost,
      roomStatus,
      canStart
    });
    
    try {
      // เริ่ม countdown ผ่าน server ให้ทุกคนเห็น
      await startCountdown();
      console.log("⏰ Countdown started successfully");
    } catch (error) {
      console.error("❌ Failed to start countdown:", error);
      alert(`ไม่สามารถเริ่ม countdown ได้: ${error.message}`);
    }
  };

  const handleCountdownComplete = useCallback(async () => {
    setShowCountdown(false);
    
    console.log("🎯 Countdown completed! Attempting to start game...");
    console.log("🎯 Current state:", { 
      isHost, 
      roomStatus, 
      currentRoom: currentRoom?.roomCode,
      playersCount: players.length,
      loading
    });
    
    // ถ้าเกมเริ่มแล้วหรือกำลังโหลดอยู่ ให้ข้ามการเริ่มเกม
    if (roomStatus === 'playing') {
      console.log("🎮 Game already playing, navigating to game page");
  navigate(`/game/${roomCode}`);
      return;
    }
    
    if (loading) {
      console.log("🎮 Already loading, skipping start game");
      return;
    }
    
    try {
      console.log("🎮 Calling startGame...");
      const result = await startGame();
      console.log("✅ Game started successfully after countdown:", result);
      
      // Navigate to game page after successful start
      if (result.success) {
        setTimeout(() => {
          navigate(`/game/${roomCode}`);
        }, 1000);
      }
      
    } catch (err) {
      console.error("❌ Failed to start game after countdown:", err);
      console.error("❌ Error details:", err.message, err.stack);
      
      // หาก error เป็น "Game already started" ให้ไปหน้าเกมเลย
      if (err.message && err.message.includes('Game already started')) {
        console.log("🎮 Game already started, navigating to game page");
  navigate(`/game/${roomCode}`);
        return;
      }
      
      // Show error to user
      alert(`เกิดข้อผิดพลาดในการเริ่มเกม: ${err.message}`);
    }
  }, [setShowCountdown, isHost, roomStatus, currentRoom, players.length, loading, startGame, navigate, roomCode]); // Dependencies for useCallback

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      navigate('/challenge');
    } catch (err) {
      console.error("Failed to leave room:", err);
      navigate('/challenge'); // Navigate anyway
    }
  };

  const canStart = isHost && players.length >= 1 && players.length <= 20 && roomStatus === 'waiting';

  // ปิดฟีเจอร์ auto-start เมื่อผู้เล่นเข้าครบ - ให้ Host ต้องกดเริ่มเอง
  // useEffect สำหรับ auto countdown ถูกปิดใช้งาน

  // Debug logging (reduced frequency)
  useEffect(() => {
    // Only log when important state changes
    const shouldLog = Math.random() < 0.2; // Only 20% of the time
    if (shouldLog) {
      console.log('🎮 WaitingRoom state:', {
        players: players.length,
        isHost,
        roomStatus,
        canStart,
        currentRoom: currentRoom?.roomCode
      });
    }
  }, [players.length, isHost, roomStatus, canStart, currentRoom]);

  if (initializing || loading) {
    return (
      <div className="min-h-screen w-full bg-[#191b27] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">กำลังโหลดห้อง...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-[#191b27] flex items-center justify-center">
        <div className="text-center bg-red-500/20 border border-red-400/40 rounded-xl p-8 max-w-md">
          <h2 className="text-white text-2xl font-bold mb-4">เกิดข้อผิดพลาด</h2>
          <p className="text-red-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/challenge')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#191b27] scrollbar-thin">
      <GameHeader showBackButton={true} backPath="/challenge" />
      
      {/* Connection Status Indicator */}
      {(!isOnline || !isConnected || reconnecting) && (
        <div className="bg-yellow-500/20 border-b border-yellow-400/30 px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-yellow-300 text-sm">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            {!isOnline ? 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต' : 
             !isConnected ? 'การเชื่อมต่อ Firebase ขาดหาย' :
             'กำลังเชื่อมต่อใหม่...'}
          </div>
        </div>
      )}
      
      <div className="flex flex-col items-start justify-start px-4 py-6">
        <div className="w-full max-w-7xl bg-[#656985] rounded-2xl shadow-2xl border border-[#b2bac6] px-0 pt-0 pb-0 mx-auto min-h-[750px] relative">
          
          {/* Header Section */}
          <div
            className="relative rounded-t-2xl overflow-hidden"
            style={{
              backgroundImage: `url(${challenge1})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              height: "180px",
            }}
          >
            <div className="relative px-8 sm:px-12 md:px-16 pt-10 pb-6 z-10 flex flex-col md:flex-row items-center justify-between gap-6 h-full">
              
              {/* Room Info */}
              <div className="flex flex-col items-start min-w-[120px]">
                <span className="text-white text-base leading-tight">
                  Room code
                </span>
                <span className="text-white text-2xl font-bold mb-1">
                  {roomCode}
                </span>
                <div className="flex items-center gap-2 text-white text-2xl font-bold">
                  <FaUsers size={28} />
                  <span>{players.length}</span>
                  {currentRoom?.settings?.maxPlayers && (
                    <span className="text-lg opacity-75">/{currentRoom.settings.maxPlayers}</span>
                  )}
                </div>
                
                {/* Game Settings Info */}
                {currentRoom?.settings && (
                  <div className="flex items-center gap-2 text-white/80 text-sm mt-2">
                    <FaClock size={16} />
                    <span>{currentRoom.settings.timeLimit} minutes</span>
                  </div>
                )}
              </div>

              {/* Goal Section */}
              <div className="flex flex-col flex-1 items-center text-center">
                <h2 className="text-3xl font-extrabold text-[#ffffff] mb-1 tracking-wide">
                  Target
                </h2>
                <p className="text-[#ffffff] text-lg font-semibold">
                  Make the most profit within the specified time to win
                </p>
                
                {/* Status Badge */}
                <div className="mt-3">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${
                    roomStatus === 'waiting' ? 'bg-yellow-500/20 border-yellow-400/30 text-yellow-300' : 
                    roomStatus === 'playing' ? 'bg-green-500/20 border-green-400/30 text-green-300' : 
                    'bg-red-500/20 border-red-400/30 text-red-300'
                  }`}>
                    {roomStatus === 'waiting' ? 'waiting' : 
                     roomStatus === 'playing' ? 'playing' : 
                     'game over'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {isHost && roomStatus === 'waiting' && (
                  <button
                    className={`flex items-center justify-center gap-3 px-10 py-4 text-white text-lg font-bold rounded-md transition ${
                      canStart && !loading && !showCountdown
                        ? "bg-[#6175f5] hover:bg-[#4950ba] cursor-pointer shadow-lg"
                        : "bg-[#6175f5]/60 cursor-not-allowed"
                    }`}
                    onClick={handleStartGame}
                    disabled={!canStart || loading || showCountdown}
                  >
                    <FaPlay />
                    {loading ? 'Starting...' : 
                     showCountdown ? 'Getting Ready...' :
                     players.length === 1 ? 'Start Game' : 'Start Game'}
                  </button>
                )}
                
                <button
                  onClick={handleLeaveRoom}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold rounded-md transition"
                >
                  <FaSignOutAlt />
                  Leave
                </button>
              </div>
            </div>
            <hr className="border-[#b2bac6] absolute bottom-0 left-0 w-full m-0" />
          </div>

          {/* Players Section */}
          <div
            style={{
              backgroundColor: "#26255a",
              backgroundImage: `url(${challenge2})`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              minHeight: "570px",
              width: "100%",
              borderBottomLeftRadius: "16px",
              borderBottomRightRadius: "16px",
            }}
            className="pt-8 pb-2 px-8 sm:px-12 md:px-16 flex-1"
          >
            {players.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {players.map((player) => (
                  <div
                    key={player.uid}
                    className={`flex items-center gap-4 border rounded-xl px-6 py-4 text-white text-lg font-medium transition ${
                      player.uid === currentRoom?.hostId
                        ? 'border-yellow-400/60 bg-yellow-500/20 shadow-lg shadow-yellow-400/20'
                        : 'border-[#b2bac6] bg-[#7a7e96]/60'
                    }`}
                  >
                    <FaUserCircle className={`text-3xl ${
                      player.uid === currentRoom?.hostId ? 'text-yellow-400' : 'text-white'
                    }`} />
                    <div className="flex-1 truncate">
                      <span className="block truncate">{player.displayName}</span>
                      {player.uid === currentRoom?.hostId && (
                        <span className="text-xs text-yellow-300 font-medium">Head Room</span>
                      )}
                      {/* {player.uid === auth.currentUser?.uid && (
                        <span className="text-xs text-cyan-300 font-medium"> You</span>
                      )} */}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Status Messages */}
            {players.length === 0 && (
              <div className="mt-8 text-center text-[#ffd85a] font-bold text-lg">
                Waiting for players...
              </div>
            )}

            {players.length > 20 && (
              <div className="mt-8 text-center text-red-400 font-bold text-lg">
                Exceeded maximum number of players (20)
              </div>
            )}

            {/* แสดงสถานะ Countdown สำหรับผู้เล่นทุกคน */}
            {showCountdown && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/40 text-orange-300 px-6 py-3 rounded-xl animate-pulse">
                  <FaClock />
                  <span className="font-semibold">
                    Preparing to start the game... Please get ready!
                  </span>
                </div>
              </div>
            )}

            {/* Host Instructions */}
            {isHost && players.length >= 1 && roomStatus === 'waiting' && !showCountdown && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/40 text-green-300 px-6 py-3 rounded-xl">
                  <FaPlay />
                  <span className="font-semibold">
                    {players.length === 1
                      ? "Ready! Click \"Start Game\" to begin the solo test"
                      : `Ready! Click "Start Game" to begin the match (${players.length} players)`}
                  </span>
                </div>
                
                {/* แสดงข้อมูลเพิ่มเติมเกี่ยวกับ auto countdown */}
                {players.length > 1 && currentRoom && (
                  <div className="mt-4 text-sm text-slate-400">
                    <div className="flex items-center justify-center gap-4">
                      <span>Current Players: {players.length}/{currentRoom?.settings?.maxPlayers || currentRoom?.maxPlayers || 1}</span>
                      <span>•</span>
                      <span>Game Time: {Math.floor((currentRoom?.settings?.timeLimit || currentRoom?.durationSec || 300) / 60)} minutes</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Share Link Button */}
          <CreateLinkButton roomCode={roomCode} />
        </div>
      </div>

      {/* Countdown Timer */}
      <CountdownTimer
        duration={10}
        isActive={showCountdown}
        onComplete={handleCountdownComplete}
        title="เตรียมความพร้อม"
        subtitle="การแข่งขันจะเริ่มขึ้นใน"
      />
    </div>
  );
}

function CreateLinkButton({ roomCode }) {
  const handleCreateLink = () => {
    const link = `${window.location.origin}/waiting/${roomCode}`;
    navigator.clipboard.writeText(link);
    alert("Copied link!\n" + link);
  };

  return (
    <button
      onClick={handleCreateLink}
      className="absolute right-6 bottom-6 w-14 h-14 rounded-full bg-[#7578F9] flex items-center justify-center shadow-lg hover:bg-[#6366f1] transition"
      style={{ boxShadow: "0px 4px 32px 0px #747fe333" }}
      title="Create Link"
      type="button"
    >
      <FaLink size={32} color="#fff" />
    </button>
  );
}
