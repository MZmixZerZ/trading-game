import React, { useState } from 'react';
import { Clock, X, CheckCircle, XCircle } from 'lucide-react';

const LimitOrderPanel = ({
  currentPrice,
  balance,
  position,
  limitOrders,
  onPlaceLimitOrder,
  onCancelLimitOrder,
  isPlaying = true,
}) => {
  const [orderType, setOrderType] = useState('BUY');
  const [shares, setShares] = useState('');
  const [limitPrice, setLimitPrice] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const sharesNum = parseInt(shares);
    const priceNum = parseFloat(limitPrice);

    if (!sharesNum || !priceNum || sharesNum <= 0 || priceNum <= 0) {
      alert('กรุณาใส่จำนวนหุ้นและราคาที่ถูกต้อง');
      return;
    }

    if (orderType === 'SELL' && sharesNum > position) {
      alert('ไม่มีหุ้นเพียงพอสำหรับการขาย');
      return;
    }

    onPlaceLimitOrder(orderType, sharesNum, priceNum);

    setShares('');
    setLimitPrice('');
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'EXECUTED':
        return 'text-green-400 bg-green-400/20';
      case 'CANCELLED':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  // Helper functions for future implementation
  const getOrderStatusIcon = (status) => {
    switch (status) {
      case 'PENDING':
        return <Clock size={16} />;
      case 'EXECUTED':
        return <CheckCircle size={16} />;
      case 'CANCELLED':
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };
  // Use the helper minimally to avoid unused warnings
  void getOrderStatusIcon('PENDING');

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  // Use the helper minimally to avoid unused warnings
  void formatTime(Date.now());

  return (
    <div
      className="dark-panel panel-entrance rounded-2xl p-3 shadow-xl hover-lift"
      style={{ height: '100%', maxHeight: '280px', overflow: 'hidden' }}
    >
      <div className="relative mb-3">
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-lg p-2 border border-gray-600/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">📋</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Limit Orders</h3>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 'calc(100% - 60px)', overflow: 'auto' }}>
        <form onSubmit={handleSubmit} className="mb-3">
          <div className="bg-gradient-to-br from-slate-800/60 via-slate-900/60 to-slate-800/60 border border-slate-600/30 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setOrderType('BUY')}
                disabled={!isPlaying}
                className={`trading-button py-2 px-2 rounded-md font-semibold transition-all duration-300 text-xs ${
                  orderType === 'BUY' && isPlaying
                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg transform scale-105 glow-green'
                    : !isPlaying
                    ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed border border-gray-500/30'
                    : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50 border border-slate-600/30'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm">📈</span>
                  <span className="text-xs">BUY</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOrderType('SELL')}
                disabled={!isPlaying}
                className={`trading-button py-2 px-2 font-semibold transition-all duration-300 text-xs ${
                  orderType === 'SELL' && isPlaying
                    ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg transform scale-105 glow-red'
                    : !isPlaying
                    ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed border border-gray-500/30'
                    : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50 border border-slate-600/30'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm">📉</span>
                  <span className="text-xs">SELL</span>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-300 mb-1">
                  <span>📊</span> Quantity
                </label>
                <input
                  type="number"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="100"
                  min="1"
                  disabled={!isPlaying}
                  className="w-full p-2 bg-slate-700/50 border border-slate-600/50 rounded-md text-white placeholder-gray-400 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-300 mb-1">
                  <span>💰</span> Price
                </label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={currentPrice?.toFixed(2) || '0.00'}
                  step="0.01"
                  min="0.01"
                  disabled={!isPlaying}
                  className="w-full p-2 bg-slate-700/50 border border-slate-600/50 rounded-md text-white placeholder-gray-400 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isPlaying}
              className={`trading-button w-full py-2 px-3 rounded-md font-bold text-xs transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${
                !isPlaying
                  ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed border border-gray-500/30'
                  : orderType === 'BUY'
                  ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white glow-green'
                  : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white glow-red'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <span className="text-sm">{orderType === 'BUY' ? '🚀' : '💰'}</span>
                <span>{orderType}</span>
              </span>
            </button>
          </div>
        </form>

        <div className="space-y-2">
          <h5 className="text-white font-semibold text-xs flex items-center gap-1">
            <span>📋</span> Orders ({limitOrders?.filter((o) => o.status === 'PENDING').length || 0})
          </h5>

          {limitOrders && limitOrders.length > 0 ? (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {limitOrders.slice(0, 2).map((order) => (
                <div key={order.id} className="relative group">
                  <div
                    className={`bg-gradient-to-r rounded-md p-2 border ${
                      order.type === 'BUY'
                        ? 'from-green-900/30 via-emerald-900/20 to-green-900/30 border-green-500/30'
                        : 'from-red-900/30 via-red-800/20 to-red-900/30 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center ${
                            order.type === 'BUY'
                              ? 'bg-gradient-to-br from-green-500 to-green-600'
                              : 'bg-gradient-to-br from-red-500 to-red-600'
                          }`}
                        >
                          <span className="text-white text-xs">{order.type === 'BUY' ? '📈' : '📉'}</span>
                        </div>
                        <div>
                          <div className={`font-bold text-xs ${order.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                            {order.type} {order.shares}
                          </div>
                          <div className="text-xs text-gray-400">@ {order.limitPrice?.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <div className={`px-1 py-1 rounded text-xs font-medium ${getOrderStatusColor(order.status)}`}>{order.status}</div>
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => onCancelLimitOrder?.(order.id)}
                            className="p-1 bg-red-600/20 hover:bg-red-500/30 rounded text-red-400 hover:text-red-300 transition-all"
                            title="Cancel"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-2 text-gray-400 text-xs">
              <Clock size={16} className="mx-auto mb-1 opacity-50" />
              <p>No orders</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LimitOrderPanel;
