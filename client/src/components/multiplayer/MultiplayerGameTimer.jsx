import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, RotateCcw, Settings, Timer } from 'lucide-react';

const MultiplayerGameTimer = ({ 
  room, 
  isHost, 
  onUpdateGameSettings, 
  gameStatus, 
  timeLeft, 
  onStartGame,
  onPauseGame,
  onResetGame,
  roomCode // เพิ่ม roomCode prop
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempDuration, setTempDuration] = useState(180); // 3 minutes default (เปลี่ยนจาก 300)
  const [tempMarket, setTempMarket] = useState('SET');
  const [tempSymbol, setTempSymbol] = useState('PTT');

  useEffect(() => {
    if (room) {
      // ใช้ timeLimit จาก room settings (เป็นนาท) แปลงเป็นวินาที
      let timeLimitMinutes = room.settings?.timeLimit;
      
      // Fallback: ดึงจาก localStorage ถ้าไม่มีใน room settings
      if (!timeLimitMinutes && roomCode) {
        const savedTimeLimit = localStorage.getItem(`room_${roomCode}_timeLimit`);
        if (savedTimeLimit) {
          timeLimitMinutes = parseInt(savedTimeLimit);
          console.log(`🔄 MultiplayerGameTimer: Using timeLimit from localStorage: ${timeLimitMinutes} minutes`);
        }
      }
      
      // Default และ fallback เก่า - ใช้เฉพาะ 3, 5, 7, 10 นาที
      if (!timeLimitMinutes || ![3, 5, 7, 10].includes(timeLimitMinutes)) {
        timeLimitMinutes = room.durationSec ? room.durationSec / 60 : 3; // เปลี่ยนจาก 5 เป็น 3
        // ตรวจสอบให้อยู่ในช่วงที่ถูกต้อง
        if (![3, 5, 7, 10].includes(timeLimitMinutes)) {
          timeLimitMinutes = 3;
        }
      }
      
      const durationSec = timeLimitMinutes * 60;
      
      setTempDuration(durationSec);
      setTempMarket(room.market || room.settings?.market || 'SET');
      setTempSymbol(room.symbol || room.settings?.symbol || 'PTT');
      
      console.log('🎮 MultiplayerGameTimer - Room settings:', room.settings);
      console.log('🕐 Time limit:', timeLimitMinutes, 'minutes =', durationSec, 'seconds');
      console.log('📊 Market/Symbol:', room.market || room.settings?.market || 'SET', '/', room.symbol || room.settings?.symbol || 'PTT');
    }
  }, [room, roomCode]);

  // Debug log for props changes
  useEffect(() => {
    console.log('🎮 MultiplayerGameTimer - Props received:', { 
      room: room?.settings, 
      roomCode, 
      timeLeft, 
      gameStatus 
    });
  }, [room?.settings, roomCode, timeLeft, gameStatus]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft > 60) return 'text-green-400';
    if (timeLeft > 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProgressPercentage = () => {
    // ใช้ timeLimit จาก room settings หรือ fallback จาก localStorage
    let timeLimitMinutes = room?.settings?.timeLimit;
    
    if (!timeLimitMinutes && roomCode) {
      const savedTimeLimit = localStorage.getItem(`room_${roomCode}_timeLimit`);
      if (savedTimeLimit) {
        timeLimitMinutes = parseInt(savedTimeLimit);
      }
    }
    
    const totalDurationSec = (timeLimitMinutes || 5) * 60;
    if (!totalDurationSec) return 100;
    return (timeLeft / totalDurationSec) * 100;
  };

  const handleSaveSettings = () => {
    if (onUpdateGameSettings) {
      onUpdateGameSettings({
        durationSec: tempDuration,
        market: tempMarket,
        symbol: tempSymbol
      });
    }
    setShowSettings(false);
  };

  const durationOptions = [
    { value: 180, label: '3 นาที' },
    { value: 300, label: '5 นาที' },
    { value: 420, label: '7 นาที' },
    { value: 600, label: '10 นาที' },
    { value: 900, label: '15 นาที' },
    { value: 1800, label: '30 นาที' }
  ];

  const marketOptions = [
    { value: 'TFEX', label: 'TFEX' },
    { value: 'SET', label: 'SET' },
    { value: 'MAI', label: 'mai' },
    { value: 'US', label: 'US Market' }
  ];

  const symbolOptions = {
    TFEX: ['^SET50.BK', 'GOLD', 'USD'],
    SET: ['PTT', 'CPALL', 'KBANK', 'SCB', 'BBL', 'AOT', 'ADVANC', 'INTUCH', 'TU', 'BDMS', 'KTB', 'TRUE', 'DTAC', 'CP', 'CPF', 'MINT', 'CRC', 'BGC', 'HMPRO', 'COM7', 'OR', 'BANPU', 'DELTA', 'SAWAD', 'PTTEP', 'KCE', 'SCC', 'TISCO', 'AP'],
    MAI: ['HEMP', 'LPN', 'SPVI', 'SMT', 'PRINC'],
    US: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX']
  };

  return (
    <div className="bg-gradient-to-br from-blue-800/30 via-slate-800/90 to-gray-800/90 border border-blue-500/30 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
            <Timer className="text-white" size={18} />
          </div>
          <h3 className="text-white font-bold text-lg">จับเวลาการเล่น</h3>
        </div>
        
        {isHost && gameStatus === 'waiting' && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 border border-slate-600/30 rounded-xl text-slate-300 hover:bg-slate-600/50 transition-all"
          >
            <Settings size={16} />
            ตั้งค่า
          </button>
        )}
      </div>

      {/* Main Timer Display */}
      <div className="text-center mb-6">
        <div className="relative">
          {/* Circular Progress */}
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-700/30"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - getProgressPercentage() / 100)}`}
                className={`transition-all duration-1000 ${getTimeColor()}`}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Timer Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getTimeColor()}`}>
                  {formatTime(timeLeft)}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {gameStatus === 'waiting' ? 'พร้อมเริ่ม' : 
                   gameStatus === 'playing' ? 'กำลังเล่น' : 
                   gameStatus === 'paused' ? 'หยุดชั่วคราว' : 'จบเกม'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-3">
            <div className="text-slate-400 text-xs mb-1">ระยะเวลาเกม</div>
            <div className="text-white font-bold">
              {(() => {
                // ใช้ timeLimit จาก room settings หรือ fallback จาก localStorage
                let timeLimitMinutes = room?.settings?.timeLimit;
                
                if (!timeLimitMinutes && roomCode) {
                  const savedTimeLimit = localStorage.getItem(`room_${roomCode}_timeLimit`);
                  if (savedTimeLimit) {
                    timeLimitMinutes = parseInt(savedTimeLimit);
                  }
                }
                
                // ถ้ายังไม่มี ใช้จาก tempDuration
                if (!timeLimitMinutes) {
                  timeLimitMinutes = tempDuration / 60;
                }
                
                return formatTime((timeLimitMinutes || 5) * 60);
              })()}
            </div>
          </div>
          <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-3">
            <div className="text-slate-400 text-xs mb-1">หุ้นที่เทรด</div>
            <div className="text-white font-bold">
              {room?.settings?.symbol || room?.symbol || tempSymbol || 'PTT'}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        {isHost && (
          <div className="flex gap-3 justify-center">
            {gameStatus === 'waiting' && (
              <button
                onClick={onStartGame}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
              >
                <Play size={18} />
                เริ่มเกม
              </button>
            )}
            
            {gameStatus === 'playing' && (
              <>
                <button
                  onClick={onPauseGame}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 font-medium rounded-xl hover:bg-yellow-500/30 transition-all"
                >
                  <Pause size={16} />
                  หยุด
                </button>
                <button
                  onClick={onResetGame}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-400/30 text-red-300 font-medium rounded-xl hover:bg-red-500/30 transition-all"
                >
                  <RotateCcw size={16} />
                  รีเซ็ต
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && isHost && (
        <div className="border-t border-slate-600/30 pt-6">
          <h4 className="text-white font-bold mb-4 flex items-center gap-2">
            <Settings size={16} />
            ตั้งค่าเกม
          </h4>
          
          <div className="space-y-4">
            {/* Duration Setting */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                ระยะเวลาเกม
              </label>
              <select
                value={tempDuration}
                onChange={(e) => setTempDuration(Number(e.target.value))}
                className="w-full p-3 bg-slate-700/50 border border-slate-600/30 rounded-xl text-white focus:outline-none focus:border-blue-400/50"
              >
                {durationOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Market Setting */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                ตลาดหลักทรัพย์
              </label>
              <select
                value={tempMarket}
                onChange={(e) => {
                  setTempMarket(e.target.value);
                  setTempSymbol(symbolOptions[e.target.value][0]);
                }}
                className="w-full p-3 bg-slate-700/50 border border-slate-600/30 rounded-xl text-white focus:outline-none focus:border-blue-400/50"
              >
                {marketOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Symbol Setting */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                หุ้นที่เทรด
              </label>
              <select
                value={tempSymbol}
                onChange={(e) => setTempSymbol(e.target.value)}
                className="w-full p-3 bg-slate-700/50 border border-slate-600/30 rounded-xl text-white focus:outline-none focus:border-blue-400/50"
              >
                {symbolOptions[tempMarket]?.map(symbol => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveSettings}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all"
              >
                บันทึกการตั้งค่า
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-3 bg-slate-700/50 border border-slate-600/30 text-slate-300 font-medium rounded-xl hover:bg-slate-600/50 transition-all"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Warning */}
      {gameStatus === 'playing' && timeLeft <= 30 && timeLeft > 0 && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl">
          <div className="flex items-center gap-2 text-red-300">
            <Clock size={16} />
            <span className="font-medium">
              เหลือเวลาอีก {timeLeft} วินาที!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiplayerGameTimer;
