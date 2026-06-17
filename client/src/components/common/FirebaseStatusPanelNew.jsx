import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaWifi, FaUser, FaDatabase } from 'react-icons/fa';
import { auth, firestore, withFirebaseErrorHandling } from '../../firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';

const FirebaseStatusPanelNew = () => {
  const [authStatus, setAuthStatus] = useState('checking');
  const [firestoreStatus, setFirestoreStatus] = useState('checking');
  const [currentUser, setCurrentUser] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [showDetails, setShowDetails] = useState(true);
  const [hasLoggedFirestore, setHasLoggedFirestore] = useState(false);
  const [hasLoggedAuth, setHasLoggedAuth] = useState(false);
  
  // ใช้ hook แทนการเรียก monitorConnection ซ้ำ
  const { isConnected } = useConnectionStatus();
  const connectionStatus = isConnected ? 'online' : 'offline';

  useEffect(() => {
    // Monitor authentication (log เฉพาะเมื่อเปลี่ยนแปลง)
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      const newStatus = user ? 'connected' : 'disconnected';
      
      // Log เฉพาะเมื่อสถานะเปลี่ยนหรือครั้งแรก
      if (authStatus !== newStatus && !hasLoggedAuth) {
        if (user) {
          console.log('✅ Auth connected:', user.uid);
        } else {
          console.log('❌ Auth disconnected');
        }
        setHasLoggedAuth(true);
      }
      
      setAuthStatus(newStatus);
      setCurrentUser(user);
    });

    // Test Firestore connection (ครั้งเดียวหลังจาก mount)
    const testFirestore = withFirebaseErrorHandling(async () => {
      try {
        const testDoc = doc(firestore, 'test', 'connection');
        await getDoc(testDoc);
        setFirestoreStatus('connected');
        setLastError(null);
        
        // Log เฉพาะครั้งแรก
        if (!hasLoggedFirestore) {
          console.log('✅ Firestore test successful');
          setHasLoggedFirestore(true);
        }
      } catch (error) {
        setFirestoreStatus('error');
        setLastError(error.message);
        
        // Log เฉพาะครั้งแรก
        if (!hasLoggedFirestore) {
          console.error('❌ Firestore test failed:', error);
          setHasLoggedFirestore(true);
        }
      }
    });

    // เรียก test เฉพาะครั้งแรก
    if (!hasLoggedFirestore) {
      testFirestore();
    }

    // Periodic health check (ลดความถี่และไม่ log)
    const healthCheck = setInterval(() => {
      if (authStatus === 'connected' && firestoreStatus !== 'connected') {
        // Silent test without logging
        withFirebaseErrorHandling(async () => {
          const testDoc = doc(firestore, 'test', 'connection');
          await getDoc(testDoc);
          setFirestoreStatus('connected');
          setLastError(null);
        })();
      }
    }, 60000); // เพิ่มจาก 30 วินาที เป็น 60 วินาที

    return () => {
      unsubAuth();
      clearInterval(healthCheck);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies intentionally omitted to prevent re-initialization

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
      case 'online':
        return <FaCheckCircle className="text-green-500" />;
      case 'disconnected':
      case 'offline':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'error':
        return <FaExclamationTriangle className="text-yellow-500" />;
      default:
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
        return 'เชื่อมต่อแล้ว';
      case 'disconnected':
        return 'ไม่ได้เชื่อมต่อ';
      case 'online':
        return 'ออนไลน์';
      case 'offline':
        return 'ออฟไลน์';
      case 'error':
        return 'ข้อผิดพลาด';
      default:
        return 'กำลังตรวจสอบ...';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'online':
        return 'text-green-600';
      case 'disconnected':
      case 'offline':
        return 'text-red-600';
      case 'error':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  // Show panel if there are any issues or if details are requested
  const hasIssues = authStatus !== 'connected' || firestoreStatus !== 'connected' || connectionStatus !== 'online';
  
  if (!hasIssues && !showDetails) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          🔥 Firebase Status
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-500 hover:text-gray-700"
        >
          {showDetails ? '✕' : '📊'}
        </button>
      </div>
      
      <div className="space-y-2">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaWifi className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">เครือข่าย:</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(connectionStatus)}
            <span className={`text-sm ${getStatusColor(connectionStatus)}`}>
              {getStatusText(connectionStatus)}
            </span>
          </div>
        </div>

        {/* Authentication Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaUser className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">การยืนยันตัวตน:</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(authStatus)}
            <span className={`text-sm ${getStatusColor(authStatus)}`}>
              {getStatusText(authStatus)}
            </span>
          </div>
        </div>

        {/* Firestore Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaDatabase className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">ฐานข้อมูล:</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(firestoreStatus)}
            <span className={`text-sm ${getStatusColor(firestoreStatus)}`}>
              {getStatusText(firestoreStatus)}
            </span>
          </div>
        </div>

        {/* User Info */}
        {currentUser && showDetails && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <div>ผู้ใช้: {currentUser.displayName || 'ไม่ระบุชื่อ'}</div>
              <div>ID: {currentUser.uid.substring(0, 8)}...</div>
              {currentUser.isAnonymous && (
                <div className="text-yellow-600">โหมดไม่ระบุตัวตน</div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {lastError && (
          <div className="pt-2 border-t border-gray-200">
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              <strong>ข้อผิดพลาดล่าสุด:</strong>
              <br />
              {lastError}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirebaseStatusPanelNew;
