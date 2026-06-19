import { useState, useEffect, useCallback } from 'react';

export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setReconnecting(false); };
    const handleOffline = () => { setIsOnline(false); setReconnecting(true); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const retry = useCallback(() => { window.location.reload(); }, []);

  return { isOnline, isConnected: isOnline, reconnecting, retry };
};
