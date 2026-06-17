import React from 'react';
import { FaWifi, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import { Wifi, WifiOff, Database, Server, Users } from 'lucide-react';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';

const ConnectionStatusIndicator = ({ 
  className = "", 
  status = null, 
  showDetailed = false 
}) => {
  const hookStatus = useConnectionStatus();
  
  // ใช้ status ที่ส่งมาจาก props หรือใช้ hook
  const { isOnline, isConnected, reconnecting, retry } = status || hookStatus;

  // แสดงแบบ detailed สำหรับ hybrid multiplayer
  if (showDetailed && status) {
    const { socket = {}, firebase = 'disconnected', room } = status;
    const { isConnected: socketConnected = false, socketId } = socket;

    return (
      <div className="bg-gray-800 border-b border-gray-700 p-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            {/* Socket.io Status */}
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
                socketConnected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
              }`}>
                {socketConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span>Socket.io</span>
              </div>
              {socketId && (
                <span className="text-gray-400 text-xs">ID: {socketId.substring(0, 8)}...</span>
              )}
            </div>

            {/* Firebase Status */}
            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
              firebase === 'connected' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
            }`}>
              <Database className="h-4 w-4" />
              <span>Firebase</span>
            </div>

            {/* Room Status */}
            {room && (
              <div className="flex items-center space-x-1 px-2 py-1 rounded bg-blue-900 text-blue-300">
                <Users className="h-4 w-4" />
                <span>Room: {room}</span>
              </div>
            )}

            {/* Server Status */}
            <div className="flex items-center space-x-1 px-2 py-1 rounded bg-purple-900 text-purple-300">
              <Server className="h-4 w-4" />
              <span>Hybrid Mode</span>
            </div>
          </div>

          {/* Connection Quality Indicator */}
          <div className="flex items-center space-x-1">
            <div className="text-xs text-gray-400">
              การเชื่อมต่อ: {socketConnected ? 'ดีเยี่ยม' : 'ขาดหาย'}
            </div>
            <div className={`w-2 h-2 rounded-full ${
              socketConnected ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything if everything is working fine
  if (isOnline && isConnected && !reconnecting) {
    return null;
  }

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: <FaExclamationTriangle className="text-red-400" />,
        text: 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-400/30',
        textColor: 'text-red-300',
        showRetry: false
      };
    }
    
    if (!isConnected || reconnecting) {
      return {
        icon: reconnecting ? 
          <FaSpinner className="text-yellow-400 animate-spin" /> : 
          <FaWifi className="text-yellow-400" />,
        text: reconnecting ? 'กำลังเชื่อมต่อใหม่...' : 'การเชื่อมต่อ Firebase ขาดหาย',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-400/30',
        textColor: 'text-yellow-300',
        showRetry: !reconnecting
      };
    }

    return null;
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div className={`
      fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999]
      ${config.bgColor} ${config.borderColor} border
      backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg
      transition-all duration-300 ease-in-out
      ${className}
    `}>
      <div className="flex items-center gap-3">
        {config.icon}
        <span className={`${config.textColor} font-medium text-sm`}>
          {config.text}
        </span>
        {config.showRetry && (
          <button
            onClick={retry}
            className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 
                     text-white text-xs font-semibold rounded-lg 
                     transition-colors duration-200"
          >
            ลองใหม่
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatusIndicator;
