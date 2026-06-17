import React, { useMemo, useEffect, useRef } from 'react';
import multiplayerService from '../../services/multiplayerService';

export default function RoomLeaderboard({ 
  roomCode, 
  currentUserId, 
  players = [], 
  leaderboard = [], 
  currentPrice = 0, 
  currentUserData = null 
}) {

  // Throttle การอัปเดตข้อมูลเพื่อไม่ให้เรียก Firebase บ่อยเกินไป
  const lastUpdateRef = useRef(0);
  const updateThrottleMs = 250; // ลดเหลือ 0.25 วินาที เพื่อให้อัปเดตเร็วขึ้นสำหรับผู้เล่นหลายคน

  // อัปเดตข้อมูลของผู้เล่นปัจจุบันไป Firebase (แต่ไม่ใช้ในการแสดงผล)
  useEffect(() => {
    if (currentUserData && currentUserData.id && roomCode) {
      const now = Date.now();
      if (now - lastUpdateRef.current > updateThrottleMs) {
        lastUpdateRef.current = now;
        
        console.log('🔄 Updating player data to Firebase:', {
          playerId: currentUserData.id,
          balance: currentUserData.balance,
          position: currentUserData.position,
          totalValue: currentUserData.totalValue
        });
        
        // อัปเดตข้อมูลไป Firebase ผ่าน multiplayerService
        multiplayerService.updatePlayerData(roomCode, {
          playerId: currentUserData.id,
          balance: currentUserData.balance,
          position: currentUserData.position,
          totalValue: currentUserData.totalValue,
          timestamp: now
        }).catch(error => {
          console.error('❌ Error updating player data to Firebase:', error);
        });
      }
    }
  }, [currentUserData, roomCode]);
  
  // Calculate sorted players using useMemo for optimization
  const sortedPlayers = useMemo(() => {
    let playersData = [];

    if (leaderboard && leaderboard.length > 0) {
      // ใช้ leaderboard เป็นหลัก - ข้อมูลที่ sync จาก server
      playersData = leaderboard.map(player => ({
        id: player.id,
        name: player.name || 'Player',
        totalValue: player.totalValue || 1000000,
        balance: player.balance || 1000000,
        position: player.position || 0
      }));
    } else if (players && players.length > 0) {
      // ใช้ players เป็นอันดับสอง - ข้อมูลที่ sync จาก server
      playersData = players.map(player => {
        const balance = player.balance || 1000000;
        const position = player.position || 0;
        // ใช้ totalValue ที่คำนวณแล้วจาก server
        const totalValue = player.totalValue || balance;
        
        return {
          id: player.id,
          name: player.name || player.displayName || 'Player',
          totalValue: totalValue,
          balance: balance,
          position: position
        };
      });
    } else {
      // ไม่มีข้อมูลจาก server - แสดงข้อความรอโหลด
      return [];
    }

    // ไม่แทรกแซงข้อมูลของผู้เล่นปัจจุบัน เพื่อให้ทุกคนเห็นข้อมูลเหมือนกัน
    // ใช้เฉพาะข้อมูลที่ sync มาจาก server เท่านั้น

    // Sort by totalValue descending
    playersData.sort((a, b) => b.totalValue - a.totalValue);
    
    // แสดงผู้เล่นทุกคน ไม่จำกัดแค่ 10 คน เพื่อป้องกันปัญหาเมื่อมีผู้เล่นเกิน 4 คน
    return playersData;
  }, [players, leaderboard]); // เอา currentUserData ออกจาก dependencies

  const formatMoney = (n) => {
    const number = typeof n === 'number' ? n : 0;
    return number.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' ฿';
  };

  const getPositionIcon = (position) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `${position}.`;
  };

  const getReturnColor = (totalValue) => {
    const profit = totalValue - 1000000;
    if (profit > 0) return 'text-emerald-400';
    if (profit < 0) return 'text-rose-400';
    return 'text-amber-400';
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
      {sortedPlayers.length === 0 && (
        <div className="text-gray-400 text-sm text-center py-8">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <div className="font-medium">กำลังโหลดอันดับ...</div>
            <div className="text-xs text-gray-500 mt-2">รองรับผู้เล่นไม่จำกัดจำนวน</div>
          </div>
        </div>
      )}
      {sortedPlayers.map((player, index) => {
        const position = index + 1;
        const profit = player.totalValue - 1000000;
        const profitPercent = ((player.totalValue - 1000000) / 1000000) * 100;
        const isCurrentUser = player.id === currentUserId;
        
        return (
          <div 
            key={player.id} 
            className={`group relative overflow-hidden rounded-xl p-3 transition-all duration-300 hover:scale-[1.01] ${
              isCurrentUser 
                ? 'bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 border-2 border-blue-400/30 shadow-xl shadow-blue-500/10' 
                : 'bg-gradient-to-r from-gray-800/60 to-gray-700/60 border border-gray-600/40 hover:from-gray-700/70 hover:to-gray-600/70 hover:border-gray-500/50'
            }`}
          >
            {/* Background glow effect */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              isCurrentUser ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10' : 'bg-gradient-to-r from-gray-500/5 to-gray-400/5'
            }`}></div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Rank with enhanced styling */}
                <div className={`flex items-center justify-center min-w-[2.5rem] h-10 rounded-lg font-bold text-sm ${
                  position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 shadow-lg shadow-yellow-500/30' :
                  position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900 shadow-lg shadow-gray-400/30' :
                  position === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900 shadow-lg shadow-orange-500/30' :
                  'bg-gradient-to-br from-slate-600 to-slate-700 text-slate-200'
                }`}>
                  {getPositionIcon(position)}
                </div>
                
                {/* Player info */}
                <div className="flex-1">
                  <div className={`font-semibold text-sm ${
                    isCurrentUser ? 'text-blue-200' : 'text-white'
                  }`}>
                    {player.name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full shadow-lg">
                        คุณ
                      </span>
                    )}
                  </div>
                  {player.position > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      📈 {player.position.toLocaleString()} หุ้น
                    </div>
                  )}
                </div>
              </div>
              
              {/* Financial info */}
              <div className="text-right">
                <div className="text-sm font-semibold text-white mb-1">
                  {formatMoney(player.totalValue)}
                </div>
                <div className={`text-xs font-medium flex items-center justify-end ${getReturnColor(player.totalValue)}`}>
                  <span className="mr-1">
                    {profit >= 0 ? '📈' : '📉'}
                  </span>
                  <span>
                    {profit >= 0 ? '+' : ''}{profit.toLocaleString()} ฿
                  </span>
                </div>
                <div className={`text-xs ${getReturnColor(player.totalValue)} opacity-80`}>
                  ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}