import React, { useEffect, useState, useRef } from 'react';
import { Clock, Trophy } from 'lucide-react';

const GameEndNotificationModal = ({ 
  isOpen, 
  onClose, 
  autoCloseDelay = 3000 // Auto close after 3 seconds
}) => {
  const [countdown, setCountdown] = useState(Math.floor(autoCloseDelay / 1000));
  const intervalRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Update ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start countdown
    setCountdown(Math.floor(autoCloseDelay / 1000));
    
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          // Use setTimeout to avoid calling during render
          setTimeout(() => {
            if (onCloseRef.current) {
              onCloseRef.current();
            }
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, autoCloseDelay]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-md w-full mx-4 bg-gradient-to-br from-red-900/90 via-orange-900/90 to-yellow-900/90 rounded-3xl border border-red-500/30 shadow-2xl overflow-hidden animate-modal-slide-up">
        
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
        
        {/* Content */}
        <div className="relative p-8 text-center">
          {/* Warning Icon with Animation */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 bg-gradient-to-br from-red-500 to-orange-600 animate-bounce">
            <Clock className="text-4xl text-white" size={40} />
          </div>

          {/* Main Message */}
          <h1 className="text-4xl font-bold mb-2 text-red-300 animate-pulse">
            Game End
          </h1>
          
          <p className="text-lg text-orange-200 mb-6">
            เวลาหมดแล้ว! กำลังคำนวณผลลัพธ์...
          </p>

          {/* Countdown */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/30 rounded-xl border border-orange-500/50">
            <Trophy className="text-yellow-400" size={16} />
            <span className="text-white text-sm">
              แสดงผลลัพธ์ใน {countdown} วินาที
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 w-full bg-gray-700/50 rounded-full h-2">
            <div 
              className="h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-1000"
              style={{ 
                width: `${(1 - countdown / Math.floor(autoCloseDelay / 1000)) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameEndNotificationModal;
