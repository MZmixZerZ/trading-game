import { useState, useEffect, useCallback } from 'react';
import { monitorConnection } from '../firebase/firebase';

/**
 * Hook สำหรับจัดการสถานะการเชื่อมต่อ Firebase
 * ใช้สำหรับ Multiplayer real-time features
 */
export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnected, setIsConnected] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    // Monitor Firebase connection
    const cleanup = monitorConnection((connected) => {
      setIsConnected(connected);
      if (!connected) {
        setReconnecting(true);
      } else {
        setReconnecting(false);
      }
    });

    // Monitor browser online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cleanup();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const retry = useCallback(() => {
    setReconnecting(true);
    // Force refresh connection
    window.location.reload();
  }, []);

  return {
    isOnline,
    isConnected,
    reconnecting,
    retry
  };
};
