import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

const CountdownTimer = ({ 
  duration = 10, 
  onComplete, 
  isActive = false,
  title = "Get Ready",
  subtitle = "Game starts in"
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isActive) {
      console.log('🕒 CountdownTimer: Starting countdown with duration:', duration);
      setTimeLeft(duration);
      setIsRunning(true);
    } else {
      console.log('🕒 CountdownTimer: Stopping countdown');
      setIsRunning(false);
    }
  }, [isActive, duration]);

  useEffect(() => {
    let timer;
    
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            if (onComplete) {
              setTimeout(onComplete, 100); // Small delay to complete animation
            }
            return 0;
          }
          
          // Play beep sound for the last 3 seconds
          if (prev <= 3 && prev > 1) {
            try {
              // สร้างเสียง beep สั้นๆ
              const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.value = 800; // Sound frequency
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.1);
            } catch (e) {
              // Do nothing if sound cannot be played
            }
          }
          
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft, onComplete]);

  const getCircleColor = () => {
    if (timeLeft <= 3) return 'text-red-400 animate-pulse';
    if (timeLeft <= 5) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getProgressPercentage = () => {
    return ((duration - timeLeft) / duration) * 100;
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-blue-900/90 via-slate-800/90 to-gray-900/90 border border-blue-500/30 rounded-3xl p-8 text-center max-w-md mx-4 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
            <Timer className="text-white" size={24} />
          </div>
          <h2 className="text-white font-bold text-2xl">{title}</h2>
        </div>

        {/* Circular Progress */}
        <div className="relative mb-6">
          <div className="w-48 h-48 mx-auto relative">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-slate-700"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - getProgressPercentage() / 100)}`}
                className={`${getCircleColor()} transition-all duration-1000 ease-linear`}
                strokeLinecap="round"
              />
            </svg>
            
            {/* Timer Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-6xl font-bold ${getCircleColor()}`}>
                  {timeLeft}
                </div>
                <div className="text-slate-400 text-sm mt-2">
                  seconds
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="text-center">
          <p className="text-white text-lg mb-2">{subtitle}</p>
          <p className="text-slate-400 text-sm">
            Please get ready for trading
          </p>
        </div>

        {/* Pulse Animation */}
        {timeLeft <= 3 && (
          <div className="absolute inset-0 rounded-3xl animate-pulse border-2 border-red-400/50"></div>
        )}
      </div>
    </div>
  );
};

export default CountdownTimer;
