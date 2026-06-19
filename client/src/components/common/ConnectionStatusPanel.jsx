import React, { useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaWifi, FaUser, FaDatabase } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';

const ConnectionStatusPanel = () => {
  const { currentUser } = useAuth();
  const { isOnline, isConnected } = useConnectionStatus();
  const [showDetails, setShowDetails] = useState(false);

  const authStatus = currentUser ? 'connected' : 'disconnected';
  const connectionStatus = isOnline && isConnected ? 'online' : 'offline';
  const dbStatus = isOnline ? 'connected' : 'offline';

  const hasIssues = !currentUser || !isOnline;

  if (!hasIssues && !showDetails) return null;

  const getStatusIcon = (status) => {
    if (status === 'connected' || status === 'online') return <FaCheckCircle className="text-green-500" />;
    if (status === 'error') return <FaExclamationTriangle className="text-yellow-500" />;
    return <FaExclamationTriangle className="text-red-500" />;
  };

  const getStatusText = (status) => {
    if (status === 'connected' || status === 'online') return 'เชื่อมต่อแล้ว';
    if (status === 'offline') return 'ออฟไลน์';
    return 'ไม่ได้เชื่อมต่อ';
  };

  const getStatusColor = (status) => {
    if (status === 'connected' || status === 'online') return 'text-green-600';
    if (status === 'error') return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">⚡ Connection Status</h3>
        <button onClick={() => setShowDetails(!showDetails)} className="text-gray-500 hover:text-gray-700">
          {showDetails ? '✕' : '📊'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaWifi className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">เครือข่าย:</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(connectionStatus)}
            <span className={`text-sm ${getStatusColor(connectionStatus)}`}>{getStatusText(connectionStatus)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaUser className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">การยืนยันตัวตน:</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(authStatus)}
            <span className={`text-sm ${getStatusColor(authStatus)}`}>{getStatusText(authStatus)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaDatabase className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">ฐานข้อมูล:</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(dbStatus)}
            <span className={`text-sm ${getStatusColor(dbStatus)}`}>{getStatusText(dbStatus)}</span>
          </div>
        </div>

        {currentUser && showDetails && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <div>ผู้ใช้: {currentUser.displayName || currentUser.email || 'ไม่ระบุชื่อ'}</div>
              <div>ID: {currentUser.uid?.substring(0, 8)}...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatusPanel;
