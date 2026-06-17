import React from "react";

export default function Balance({ 
  balance: propBalance = 1000000, 
  position = 0, 
  entryPrice = 0, 
  currentPrice = 0, 
  pnl = 0, 
  onBuy, 
  onSell,
  onSellAll,
  showControls = true,
  profitTarget, // เพิ่ม prop สำหรับเป้าหมายกำไร
  totalReturn, // สำหรับ multiplayer
  returnPercentage, // สำหรับ multiplayer
  positions = {}, // สำหรับ multiplayer
  selectedSymbol, // สำหรับ multiplayer
  mode = "solo" // "solo" หรือ "multiplayer"
}) {
  // ใช้ props ถ้ามี ไม่งั้นใช้ default
  const displayBalance = propBalance;
  
  // ถ้าไม่มี position และ onBuy/onSell แสดงว่าเป็น display อย่างเดียว
  const isInteractive = position !== undefined && onBuy && onSell;
  
  // Multiplayer mode
  if (mode === "multiplayer") {
    const portfolioValue = positions ? positions.reduce((total, pos) => {
      return total + (pos.volume * currentPrice);
    }, 0) : 0;
    
    const availableShares = positions ? positions
      .filter(pos => pos.symbol === selectedSymbol)
      .reduce((total, pos) => total + pos.volume, 0) : 0;

    return (
      <div className="bg-[#181e2b] rounded-2xl p-6 shadow-lg border border-[#292b36]">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          สถานะการเงิน
        </h3>
        
        <div className="space-y-3">
          {/* Cash Balance */}
          <div className="bg-[#2a2f3e] rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-lg">Balance</span>
              <span className="text-white font-semibold text-lg">{displayBalance.toLocaleString()} Baht</span>
            </div>
          </div>

          {/* Portfolio Value */}
          <div className="bg-[#2a2f3e] rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-lg">Portfolio Value</span>
              <span className="text-blue-400 font-semibold text-lg">{portfolioValue.toLocaleString()} Baht</span>
            </div>
          </div>

          {/* Returns */}
          <div className="bg-[#2a2f3e] rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-lg">Profit/Loss</span>
              <div className="text-right">
                <div className={`font-semibold text-lg ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalReturn >= 0 ? '+' : ''}{totalReturn.toLocaleString()} Baht
                </div>
                <div className={`text-lg ${returnPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ({returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%)
                </div>
              </div>
            </div>
          </div>

          {/* Current Symbol Position */}
          {selectedSymbol && (
            <div className="bg-[#2a2f3e] rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-lg">{selectedSymbol} Holding</span>
                <span className="text-purple-400 font-semibold text-lg">{availableShares.toLocaleString()} Shares</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  if (!isInteractive) {
    // แสดงแค่ยอดเงินอย่างเดียว
    return (
      <div className="flex flex-col items-start border border-[#E0B469] rounded-xl px-3 py-2 min-w-[180px] text-white bg-[#202431]">
        <div className="text-xs text-[#E0B469] mb-1 font-medium">Balance</div>
        <div className="text-base font-semibold">
          {displayBalance === null
            ? "Loading..."
            : displayBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) + " THB"}
        </div>
      </div>
    );
  }

  // Interactive version สำหรับ Solo Challenge
  const currentValue = position * currentPrice;
  const unrealizedPnL = position > 0 ? (currentPrice - entryPrice) * position : 0;
  const totalValue = displayBalance + currentValue;
  const totalPnL = totalValue - 1000000; // Initial balance

  return (
    <div className="dark-panel panel-entrance rounded-3xl p-6 shadow-2xl hover-lift">
      {/* Header with animated gradient */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 rounded-2xl blur-lg animated-gradient pointer-events-none"></div>
        <div className="relative bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl p-4 border border-gray-600/30 interactive-highlight">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg float-animation">
              <span className="text-white text-lg">💰</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-xl text-glow">Portfolio</h3>
              <p className="text-gray-400 text-sm">Real-time Trading</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Balance Card */}
      <div className="relative mb-6">
  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl blur-sm pointer-events-none" aria-hidden="true"></div>
        <div className="relative bg-gradient-to-br from-emerald-900/40 via-emerald-800/30 to-blue-900/40 border border-emerald-500/30 rounded-2xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-emerald-300 text-sm font-medium mb-1">Total Value</p>
              <p className="text-white text-3xl font-bold tracking-tight">{totalValue.toLocaleString()}</p>
              <p className="text-emerald-200 text-sm">THB</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs mb-1">Today's P&L</p>
              <div className={`px-3 py-1 rounded-lg ${totalPnL >= 0 ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                <p className={`text-lg font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString()}
                </p>
              </div>
              <p className={`text-xs mt-1 ${totalPnL >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                ({totalPnL >= 0 ? '+' : ''}{((totalPnL / 1000000) * 100).toFixed(2)}%)
              </p>
            </div>
          </div>
          
          {/* Progress bar สำหรับ P&L */}
          <div className="w-full bg-gray-700/50 rounded-full h-2 mb-3 progress-bar">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${totalPnL >= 0 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
              style={{ width: `${Math.min(Math.abs(totalPnL / 1000000) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Account Details Grid */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Cash Balance */}
        <div className="group hover:scale-[1.02] transition-all duration-300">
          <div className="bg-gradient-to-r from-blue-900/30 via-slate-800/30 to-blue-900/30 border border-blue-500/20 hover:border-blue-400/40 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-sm">💵</span>
                </div>
                <div>
                  <span className="text-gray-300 font-medium">Available Cash</span>
                  <p className="text-blue-300 text-xs">Ready to trade</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-white font-bold text-lg">{displayBalance.toLocaleString()}</span>
                <p className="text-gray-400 text-xs">THB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Position */}
        <div className="group hover:scale-[1.02] transition-all duration-300">
          <div className="bg-gradient-to-r from-purple-900/30 via-slate-800/30 to-purple-900/30 border border-purple-500/20 hover:border-purple-400/40 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-sm">�</span>
                </div>
                <div>
                  <span className="text-gray-300 font-medium">Holdings</span>
                  <p className="text-purple-300 text-xs">Current position</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-white font-bold text-lg">{position.toLocaleString()}</span>
                <p className="text-gray-400 text-xs">Shares</p>
              </div>
            </div>
          </div>
        </div>

        {position > 0 && (
          <>
            {/* Entry & Current Price Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="group hover:scale-[1.02] transition-all duration-300">
                <div className="bg-gradient-to-br from-amber-900/30 to-yellow-900/30 border border-amber-500/20 hover:border-amber-400/40 rounded-xl p-3">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-white text-xs">🏷️</span>
                    </div>
                    <p className="text-amber-300 text-xs mb-1">Entry Price</p>
                    <p className="text-white font-bold">{entryPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <div className="group hover:scale-[1.02] transition-all duration-300">
                <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/20 hover:border-cyan-400/40 rounded-xl p-3">
                  <div className="text-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <span className="text-white text-xs">💹</span>
                    </div>
                    <p className="text-cyan-300 text-xs mb-1">Current</p>
                    <p className="text-white font-bold">{currentPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Unrealized P&L Card */}
            <div className="group hover:scale-[1.02] transition-all duration-300">
        <div className={`bg-gradient-to-r ${unrealizedPnL >= 0 ? 'from-green-900/40 to-emerald-900/40 border-green-500/30' : 'from-red-900/40 to-red-800/40 border-red-500/30'} border rounded-xl p-4 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse pointer-events-none"></div>
                <div className="relative flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${unrealizedPnL >= 0 ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'} rounded-xl flex items-center justify-center shadow-md`}>
                      <span className="text-white text-sm">
                        {unrealizedPnL >= 0 ? '📈' : '📉'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-300 font-medium">Unrealized P&L</span>
                      <p className={`text-xs ${unrealizedPnL >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {unrealizedPnL >= 0 ? 'Profit' : 'Loss'} • Not realized
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`${unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'} font-bold text-lg`}>
                      {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toLocaleString()}
                    </span>
                    <p className={`text-xs ${unrealizedPnL >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      ({unrealizedPnL >= 0 ? '+' : ''}{(((currentPrice - entryPrice) / entryPrice) * 100).toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Profit Target Display */}
        {profitTarget && (
          <div className="group hover:scale-[1.02] transition-all duration-300">
            <div className="bg-gradient-to-r from-yellow-900/30 via-amber-900/30 to-yellow-900/30 border border-yellow-500/30 hover:border-yellow-400/40 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-md">
                    <span className="text-white text-sm">🎯</span>
                  </div>
                  <div>
                    <span className="text-gray-300 font-medium">Target</span>
                    <p className="text-yellow-300 text-xs">Profit goal</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-yellow-400 font-bold text-lg">{profitTarget.toLocaleString()}</span>
                  <p className="text-gray-400 text-xs">THB</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

  {/* Trading Controls */}
  {showControls && (
  <div className="space-y-3">
        {/* Amount Selection Buttons */}
        <div className="text-center mb-4">
          <div className="text-sm text-gray-400 mb-2">เลือกจำนวน:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onBuy(100)}
              disabled={100 * currentPrice > displayBalance}
              className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
                100 * currentPrice <= displayBalance 
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              +100
            </button>
            <button
              onClick={() => onSell(Math.min(100, position))}
              disabled={position < 100}
              className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
                position >= 100 
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              -100
            </button>
            <button
              onClick={() => onBuy(1000)}
              disabled={1000 * currentPrice > displayBalance}
              className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
                1000 * currentPrice <= displayBalance 
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              +1000
            </button>
            <button
              onClick={() => onSell(Math.min(1000, position))}
              disabled={position < 1000}
              className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
                position >= 1000 
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              -1000
            </button>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onBuy(100)}
            disabled={100 * currentPrice > displayBalance}
            className={`px-4 py-3 font-bold rounded-lg transition-all ${
              100 * currentPrice <= displayBalance 
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Buy
          </button>
          
          <button
            onClick={() => onSell(Math.min(100, position))}
            disabled={position === 0}
            className={`px-4 py-3 font-bold rounded-lg transition-all ${
              position > 0 
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Sell
          </button>

          <button
            onClick={onSellAll ? onSellAll : () => onSell(position)}
            disabled={position === 0}
            className={`px-4 py-3 font-bold rounded-lg transition-all ${
              position > 0 
                ? 'bg-orange-600 hover:bg-orange-500 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Sell All
          </button>
        </div>
  </div>
  )}
    </div>
  );
}
