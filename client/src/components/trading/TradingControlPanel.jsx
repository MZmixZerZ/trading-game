import React, { useState, useCallback, useMemo } from 'react';

const TradingControlPanel = ({
  currentPrice,
  balance,
  portfolio,
  onTrade,
  disabled,
  stockSymbol,
  tradeHistory = [], // ประวัติการเทรด
  entryPrice = 0, // ราคาซื้อเฉลี่ย
  latestPnL = null // P&L ล่าสุดจาก parent component (optional)
}) => {
  const [buyQuantity, setBuyQuantity] = useState(0);
  const [sellQuantity, setSellQuantity] = useState(0);

  const getMaxBuyQuantity = useCallback(() => {
    if (!currentPrice || currentPrice <= 0) return 0;
    return Math.floor(balance / currentPrice);
  }, [balance, currentPrice]);

  const getMaxSellQuantity = useCallback(() => {
    const stockData = portfolio?.find(item => item.symbol === stockSymbol);
    return stockData ? stockData.quantity : 0;
  }, [portfolio, stockSymbol]);

  // คำนวณสถิติการเทรด
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tradingStats = useMemo(() => {
    const totalTrades = tradeHistory.length;
    const buyTrades = tradeHistory.filter(t => t.type === 'buy' || t.type === 'BUY');
    const sellTrades = tradeHistory.filter(t => t.type === 'sell' || t.type === 'SELL');
    
    // ใช้ P&L ล่าสุดจาก parent หากมี หรือคำนวณเองหากไม่มี
    let calculatedPnL = 0;
    if (latestPnL !== null) {
      // ใช้ P&L ที่ส่งมาจาก parent (สำหรับ multiplayer)
      calculatedPnL = latestPnL;
    } else {
      // คำนวณ P&L เอง (สำหรับ solo mode)
      const currentHoldings = getMaxSellQuantity();
      if (currentHoldings > 0 && entryPrice > 0) {
        // Unrealized P&L
        calculatedPnL = (currentPrice - entryPrice) * currentHoldings;
      } else if (sellTrades.length > 0) {
        // Realized P&L จากการขายครั้งล่าสุด
        const lastSell = sellTrades[sellTrades.length - 1];
        if (lastSell && lastSell.price && lastSell.quantity && entryPrice > 0) {
          calculatedPnL = (lastSell.price - entryPrice) * lastSell.quantity;
        }
      }
    }

    return {
      totalTrades,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      latestPnL: calculatedPnL,
      isProfit: calculatedPnL >= 0
    };
  }, [tradeHistory, currentPrice, entryPrice, getMaxSellQuantity, latestPnL]);

  const handleBuy = useCallback(() => {
    if (buyQuantity > 0 && buyQuantity <= getMaxBuyQuantity()) {
      onTrade('buy', buyQuantity);
      setBuyQuantity(0);
    }
  }, [buyQuantity, getMaxBuyQuantity, onTrade]);

  const handleSell = useCallback(() => {
    if (sellQuantity > 0 && sellQuantity <= getMaxSellQuantity()) {
      onTrade('sell', sellQuantity);
      setSellQuantity(0);
    }
  }, [sellQuantity, getMaxSellQuantity, onTrade]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 p-3">
      {/* Header with Trading Stats */}
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-white">Trading Panel</h3>
        <div className="text-xs text-gray-300">
          Balance: ฿{balance?.toLocaleString() || 0} | 
          Holdings: {getMaxSellQuantity()} shares
        </div>
        
        {/* Trading Statistics */}
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <div className="bg-blue-900/30 rounded p-2 border border-blue-500/30">
            <div className="text-blue-400 font-medium">Total Trades</div>
            <div className="text-white font-bold">{tradingStats.totalTrades}</div>
          </div>
          <div className="bg-purple-900/30 rounded p-2 border border-purple-500/30">
            <div className="text-purple-400 font-medium">Buy/Sell</div>
            <div className="text-white font-bold">{tradingStats.buyTrades}/{tradingStats.sellTrades}</div>
          </div>
        </div>
      </div>

      {/* Main Trading Grid - Horizontal Layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Buy Section */}
        <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-500/30">
          <h4 className="text-sm font-bold text-emerald-400 mb-2 text-center">BUY</h4>
          
          <div className="space-y-2">
            {/* Price Display */}
            <div className="text-center">
              <span className="text-xs text-gray-400">Current Price</span>
              <div className="text-lg font-bold text-emerald-400">
                ฿{currentPrice?.toFixed(2) || '0.00'}
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2 py-1 text-sm border border-gray-600 bg-gray-700/50 text-white rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                min="0"
                max={getMaxBuyQuantity()}
                disabled={disabled}
                placeholder="0"
              />
            </div>

            {/* Quick Buy Buttons */}
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setBuyQuantity(Math.floor(getMaxBuyQuantity() * 0.5))}
                disabled={getMaxBuyQuantity() <= 0 || disabled}
                className="py-1 px-2 text-xs font-medium rounded bg-emerald-800/50 text-emerald-300 hover:bg-emerald-700/50 disabled:bg-gray-700/50 disabled:text-gray-500 transition-colors"
              >
                50%
              </button>
              <button
                onClick={() => setBuyQuantity(getMaxBuyQuantity())}
                disabled={getMaxBuyQuantity() <= 0 || disabled}
                className={`py-2 px-2 font-bold rounded transition-all duration-300 text-xs ${
                  getMaxBuyQuantity() > 0 && !disabled
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 shadow-md'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                MAX
              </button>
            </div>

            {/* Total Cost */}
            <div className="text-center py-1 bg-emerald-900/50 rounded">
              <span className="text-xs text-gray-400">Total Cost</span>
              <div className="text-sm font-bold text-emerald-300">
                ฿{((buyQuantity || 0) * (currentPrice || 0)).toLocaleString()}
              </div>
            </div>

            {/* Buy Button */}
            <button
              onClick={handleBuy}
              disabled={buyQuantity <= 0 || buyQuantity > getMaxBuyQuantity() || disabled}
              className={`w-full py-2 px-3 font-bold rounded-lg transition-all duration-300 text-sm ${
                buyQuantity > 0 && buyQuantity <= getMaxBuyQuantity() && !disabled
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 shadow-lg transform'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {disabled ? 'Trading Disabled' : 'Buy Shares'}
            </button>
          </div>
        </div>

        {/* Sell Section */}
        <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
          <h4 className="text-sm font-bold text-red-400 mb-2 text-center">SELL</h4>
          
          <div className="space-y-2">
            {/* Price Display */}
            <div className="text-center">
              <span className="text-xs text-gray-400">Current Price</span>
              <div className="text-lg font-bold text-red-400">
                ฿{currentPrice?.toFixed(2) || '0.00'}
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Quantity
              </label>
              <input
                type="number"
                value={sellQuantity}
                onChange={(e) => setSellQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2 py-1 text-sm border border-gray-600 bg-gray-700/50 text-white rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                min="0"
                max={getMaxSellQuantity()}
                disabled={disabled}
                placeholder="0"
              />
            </div>

            {/* Quick Sell Buttons */}
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setSellQuantity(Math.floor(getMaxSellQuantity() * 0.5))}
                disabled={getMaxSellQuantity() <= 0 || disabled}
                className="py-1 px-2 text-xs font-medium rounded bg-red-800/50 text-red-300 hover:bg-red-700/50 disabled:bg-gray-700/50 disabled:text-gray-500 transition-colors"
              >
                50%
              </button>
              <button
                onClick={() => setSellQuantity(getMaxSellQuantity())}
                disabled={getMaxSellQuantity() <= 0 || disabled}
                className={`py-2 px-2 font-bold rounded transition-all duration-300 text-xs ${
                  getMaxSellQuantity() > 0 && !disabled
                    ? 'bg-red-600 text-white hover:bg-red-500 hover:scale-105 shadow-md'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                ALL
              </button>
            </div>

            {/* Total Cost */}
            <div className="text-center py-1 bg-red-900/50 rounded">
              <span className="text-xs text-gray-400">Total Cost</span>
              <div className="text-sm font-bold text-red-300">
                ฿{((sellQuantity || 0) * (currentPrice || 0)).toLocaleString()}
              </div>
            </div>

            {/* Sell Button */}
            <button
              onClick={handleSell}
              disabled={sellQuantity <= 0 || sellQuantity > getMaxSellQuantity() || disabled}
              className={`w-full py-2 px-3 font-bold rounded-lg transition-all duration-300 text-sm ${
                sellQuantity > 0 && sellQuantity <= getMaxSellQuantity() && !disabled
                  ? 'bg-red-600 text-white hover:bg-red-500 hover:scale-105 shadow-lg transform'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {disabled ? 'Trading Disabled' : 'Sell Shares'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingControlPanel;
