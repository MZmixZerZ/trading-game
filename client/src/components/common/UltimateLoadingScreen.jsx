import React, { memo, useState, useEffect, useMemo } from 'react';
import { FaRocket, FaBolt, FaGem, FaTrophy, FaStar, FaChartLine } from 'react-icons/fa';

// Enhanced floating particles with beautiful trails
const EnhancedParticles = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(15)].map((_, i) => (
      <div
        key={i}
        className={`absolute rounded-full animate-float-particle opacity-70`}
        style={{
          width: `${Math.random() * 8 + 4}px`,
          height: `${Math.random() * 8 + 4}px`,
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          background: `linear-gradient(45deg, ${
            ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'][Math.floor(Math.random() * 5)]
          }, ${
            ['#3b82f6', '#ec4899', '#f97316', '#06b6d4', '#8b5cf6'][Math.floor(Math.random() * 5)]
          })`,
          animationDelay: `${i * 0.3}s`,
          animationDuration: `${4 + Math.random() * 3}s`,
          boxShadow: `0 0 20px ${
            ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'][Math.floor(Math.random() * 5)]
          }80`
        }}
      />
    ))}
  </div>
));

// Premium background orbs with enhanced effects
const PremiumOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-1/6 left-1/6 w-[500px] h-[500px] bg-gradient-to-r from-cyan-400/20 via-blue-500/20 to-purple-600/20 rounded-full blur-3xl animate-orb-float"></div>
    <div className="absolute bottom-1/6 right-1/6 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-red-500/20 rounded-full blur-3xl animate-orb-float-reverse"></div>
    <div className="absolute top-2/3 left-1/3 w-[400px] h-[400px] bg-gradient-to-r from-yellow-400/15 via-orange-500/15 to-red-500/15 rounded-full blur-2xl animate-orb-pulse"></div>
    <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-gradient-to-r from-emerald-400/20 via-teal-500/20 to-cyan-500/20 rounded-full blur-2xl animate-orb-float-slow"></div>
  </div>
));

// Elite Logo with orbiting elements
const EliteLogo = memo(() => (
  <div className="relative mb-10">
    {/* Main glow effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-yellow-400 rounded-full blur-2xl opacity-60 animate-elite-glow"></div>
    
    {/* Logo container */}
    <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-10 rounded-full border-2 border-gray-600/40 backdrop-blur-xl shadow-2xl">
      <div className="absolute inset-2 bg-gradient-to-r from-cyan-400/10 via-purple-500/10 to-pink-500/10 rounded-full animate-inner-glow"></div>
      
      {/* Center icon */}
      <div className="relative flex items-center justify-center">
        <FaRocket className="text-6xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 animate-icon-pulse" />
      </div>
    </div>
    
    {/* Orbiting icons */}
    <div className="absolute inset-0 animate-orbit">
      <FaBolt className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-yellow-400 text-2xl drop-shadow-lg" />
      <FaGem className="absolute top-1/2 -right-4 transform -translate-y-1/2 text-purple-400 text-2xl drop-shadow-lg" />
      <FaTrophy className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-cyan-400 text-2xl drop-shadow-lg" />
      <FaStar className="absolute top-1/2 -left-4 transform -translate-y-1/2 text-pink-400 text-2xl drop-shadow-lg" />
    </div>
    
    {/* Energy rings */}
    <div className="absolute inset-0 animate-ring-1">
      <div className="w-full h-full border-2 border-cyan-400/30 rounded-full"></div>
    </div>
    <div className="absolute inset-0 animate-ring-2">
      <div className="w-full h-full border-2 border-purple-400/30 rounded-full"></div>
    </div>
  </div>
));

// Advanced progress system with stages
const EliteProgressBar = memo(() => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  
  const stages = useMemo(() => ([
    { name: 'Start system', progress: 15, icon: '🚀', color: 'from-blue-500 to-cyan-500' },
    { name: 'Load market data', progress: 35, icon: '📈', color: 'from-cyan-500 to-teal-500' },
    { name: 'Connect to server', progress: 55, icon: '🌐', color: 'from-teal-500 to-green-500' },
    { name: 'Trading Setup', progress: 75, icon: '⚙️', color: 'from-green-500 to-yellow-500' },
    { name: 'Prepare Interface', progress: 90, icon: '🎨', color: 'from-yellow-500 to-orange-500' },
    { name: 'Ready to Trade!', progress: 100, icon: '✨', color: 'from-orange-500 to-red-500' }
  ]), []);
  
  useEffect(() => {
    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setStage(currentStage);
        setProgress(stages[currentStage].progress);
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 900);
    
    return () => clearInterval(interval);
  }, [stages]);
  
  return (
    <div className="w-96 mx-auto mb-8">
      {/* Current stage display */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2 animate-bounce">{stages[stage]?.icon}</div>
        <h3 className="text-xl font-bold text-white font-thai-display mb-1">
          {stages[stage]?.name}
        </h3>
        <p className="text-gray-400 text-sm font-thai-body">Processing...</p>
      </div>
      
      {/* Elite progress bar */}
      <div className="relative">
        <div className="bg-gray-800/60 rounded-full h-4 overflow-hidden border border-gray-600/40 backdrop-blur-sm shadow-inner">
          <div 
            className={`h-full bg-gradient-to-r ${stages[stage]?.color} transition-all duration-700 ease-out rounded-full relative overflow-hidden`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-wave"></div>
            <div className="absolute inset-0 bg-white/10 animate-pulse-gentle"></div>
          </div>
        </div>
        
        {/* Progress info */}
        <div className="flex justify-between items-center mt-3">
          <span className="text-gray-300 text-sm font-medium font-thai-body">
            {stages[stage]?.name}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400 text-sm font-bold font-thai-number">{progress}%</span>
            <FaChartLine className="text-cyan-400 text-xs animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
});

// Elite tips with rotation
const EliteTips = memo(() => {
  const [currentTip, setCurrentTip] = useState(0);
  
  const tips = [
    { 
      icon: '🎯', 
      title: 'Master Strategy', 
      text: 'Use Technical Analysis and Fundamental Analysis together for accurate decision-making.',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/30'
    },
    { 
      icon: '🛡️', 
      title: 'Elite Risk Management', 
      text: 'Manage risk by setting appropriate Stop Loss and Take Profit.',
      gradient: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/30'
    },
    { 
      icon: '⚡', 
      title: 'Speed Trading', 
      text: 'Use hotkeys and fast trading techniques to seize opportunities.',
      gradient: 'from-yellow-500/20 to-orange-500/20',
      border: 'border-yellow-500/30'
    },
    { 
      icon: '🚀', 
      title: 'Advanced Analytics', 
      text: 'Track Market Sentiment and use AI Analysis for smarter trading.',
      gradient: 'from-green-500/20 to-teal-500/20',
      border: 'border-green-500/30'
    }
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [tips.length]);
  
  return (
    <div className={`bg-gradient-to-br ${tips[currentTip].gradient} backdrop-blur-xl rounded-3xl p-8 max-w-md mx-auto border ${tips[currentTip].border} shadow-2xl transition-all duration-500`}>
      <div className="text-center">
        <div className="text-5xl mb-4 animate-tip-icon">{tips[currentTip].icon}</div>
        <h3 className="text-cyan-400 font-bold text-lg mb-2 font-thai-display">{tips[currentTip].title}</h3>
        <p className="text-gray-200 text-sm leading-relaxed font-thai-body">{tips[currentTip].text}</p>
      </div>
      
      {/* Enhanced dots indicator */}
      <div className="flex justify-center space-x-3 mt-6">
        {tips.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentTip 
                ? 'w-8 bg-gradient-to-r from-cyan-400 to-purple-400 shadow-lg' 
                : 'w-2 bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
});

// Main elite loading screen
const UltimateLoadingScreen = memo(() => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 z-50 min-h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overflow-hidden">
      
      {/* Enhanced Background Effects */}
      <PremiumOrbs />
      <EnhancedParticles />
      
      {/* Main Content */}
      <div className="relative z-10 w-full h-full grid place-items-center px-6">
        <div className="text-center">
        <EliteLogo />
        
        <div className="mb-8">
          <h1 className="text-5xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-yellow-400 mb-4 font-thai-display animate-title-glow">
            IdeaTrade Elite
          </h1>
          <h2 className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 font-thai-body animate-subtitle-fade">
            Real-time trading statistics
          </h2>
          <div className="flex justify-center items-center space-x-4 mt-4 text-sm">
            <div className="flex items-center bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-green-400 font-thai-body">Online server</span>
            </div>
            <div className="flex items-center bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30">
              <FaBolt className="mr-2 text-blue-400" size={12} />
              <span className="text-blue-400 font-thai-body">Real-time data</span>
            </div>
          </div>
        </div>
        
        <EliteProgressBar />
        <EliteTips />
        
        {/* Footer info */}
        <div className="mt-8 text-xs text-gray-500 font-thai-body">
          <p>Powered by IdeaTrade Advanced Trading Engine v3.0</p>
          <p className="mt-1">🔒 Bank-level security system</p>
        </div>
        </div>
      </div>

      {/* Enhanced CSS with all animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&family=Prompt:wght@400;500&display=swap');
        
        .font-thai-display {
          font-family: 'Kanit', sans-serif;
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        
        .font-thai-body {
          font-family: 'Prompt', sans-serif;
          font-weight: 400;
          line-height: 1.6;
        }
        
        .font-thai-number {
          font-family: 'Kanit', 'Inter', monospace;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        
        /* Particle animations */
        @keyframes float-particle {
          0%, 100% { 
            transform: translateY(0px) translateX(0px) rotate(0deg); 
            opacity: 0.7;
          }
          25% { 
            transform: translateY(-30px) translateX(15px) rotate(90deg); 
            opacity: 1;
          }
          50% { 
            transform: translateY(-60px) translateX(-10px) rotate(180deg); 
            opacity: 0.8;
          }
          75% { 
            transform: translateY(-20px) translateX(-25px) rotate(270deg); 
            opacity: 0.9;
          }
        }
        
        /* Orb animations */
        @keyframes orb-float {
          0%, 100% { 
            transform: translate(0px, 0px) scale(1);
            opacity: 0.2;
          }
          33% { 
            transform: translate(30px, -30px) scale(1.1);
            opacity: 0.4;
          }
          66% { 
            transform: translate(-20px, 20px) scale(0.9);
            opacity: 0.3;
          }
        }
        
        @keyframes orb-float-reverse {
          0%, 100% { 
            transform: translate(0px, 0px) scale(1);
            opacity: 0.2;
          }
          33% { 
            transform: translate(-30px, 30px) scale(1.1);
            opacity: 0.4;
          }
          66% { 
            transform: translate(20px, -20px) scale(0.9);
            opacity: 0.3;
          }
        }
        
        @keyframes orb-pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.15;
          }
          50% { 
            transform: scale(1.2);
            opacity: 0.25;
          }
        }
        
        @keyframes orb-float-slow {
          0%, 100% { 
            transform: translate(0px, 0px) rotate(0deg) scale(1);
            opacity: 0.2;
          }
          50% { 
            transform: translate(15px, -15px) rotate(180deg) scale(1.05);
            opacity: 0.3;
          }
        }
        
        /* Logo animations */
        @keyframes elite-glow {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
            opacity: 0.6;
          }
          25% { 
            transform: scale(1.05) rotate(90deg);
            opacity: 0.8;
          }
          50% { 
            transform: scale(1.1) rotate(180deg);
            opacity: 1;
          }
          75% { 
            transform: scale(1.05) rotate(270deg);
            opacity: 0.8;
          }
        }
        
        @keyframes inner-glow {
          0%, 100% { 
            opacity: 0.1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.3;
            transform: scale(1.05);
          }
        }
        
        @keyframes icon-pulse {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
          }
          25% { 
            transform: scale(1.1) rotate(5deg);
          }
          50% { 
            transform: scale(1.2) rotate(0deg);
          }
          75% { 
            transform: scale(1.1) rotate(-5deg);
          }
        }
        
        @keyframes orbit {
          from { 
            transform: rotate(0deg);
          }
          to { 
            transform: rotate(360deg);
          }
        }
        
        @keyframes ring-1 {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
            opacity: 0.3;
          }
          50% { 
            transform: scale(1.1) rotate(180deg);
            opacity: 0.6;
          }
        }
        
        @keyframes ring-2 {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
            opacity: 0.3;
          }
          50% { 
            transform: scale(1.15) rotate(-180deg);
            opacity: 0.5;
          }
        }
        
        /* Progress animations */
        @keyframes shimmer-wave {
          0% { 
            transform: translateX(-100%);
            opacity: 0;
          }
          50% { 
            opacity: 1;
          }
          100% { 
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        @keyframes pulse-gentle {
          0%, 100% { 
            opacity: 0.1;
          }
          50% { 
            opacity: 0.3;
          }
        }
        
        /* Text animations */
        @keyframes title-glow {
          0%, 100% { 
            text-shadow: 0 0 20px rgba(6, 182, 212, 0.5);
          }
          25% { 
            text-shadow: 0 0 30px rgba(139, 92, 246, 0.7);
          }
          50% { 
            text-shadow: 0 0 40px rgba(245, 158, 11, 0.8);
          }
          75% { 
            text-shadow: 0 0 30px rgba(236, 72, 153, 0.7);
          }
        }
        
        @keyframes subtitle-fade {
          0%, 100% { 
            opacity: 0.8;
          }
          50% { 
            opacity: 1;
          }
        }
        
        /* Tips animations */
        @keyframes tip-icon {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
          }
          25% { 
            transform: scale(1.1) rotate(5deg);
          }
          50% { 
            transform: scale(1.2) rotate(0deg);
          }
          75% { 
            transform: scale(1.1) rotate(-5deg);
          }
        }
        
        /* Apply animations */
        .animate-float-particle {
          animation: float-particle 6s ease-in-out infinite;
        }
        
        .animate-orb-float {
          animation: orb-float 8s ease-in-out infinite;
        }
        
        .animate-orb-float-reverse {
          animation: orb-float-reverse 10s ease-in-out infinite;
        }
        
        .animate-orb-pulse {
          animation: orb-pulse 6s ease-in-out infinite;
        }
        
        .animate-orb-float-slow {
          animation: orb-float-slow 12s ease-in-out infinite;
        }
        
        .animate-elite-glow {
          animation: elite-glow 4s ease-in-out infinite;
        }
        
        .animate-inner-glow {
          animation: inner-glow 3s ease-in-out infinite;
        }
        
        .animate-icon-pulse {
          animation: icon-pulse 2s ease-in-out infinite;
        }
        
        .animate-orbit {
          animation: orbit 15s linear infinite;
        }
        
        .animate-ring-1 {
          animation: ring-1 8s ease-in-out infinite;
        }
        
        .animate-ring-2 {
          animation: ring-2 10s ease-in-out infinite reverse;
        }
        
        .animate-shimmer-wave {
          animation: shimmer-wave 2s ease-in-out infinite;
        }
        
        .animate-pulse-gentle {
          animation: pulse-gentle 3s ease-in-out infinite;
        }
        
        .animate-title-glow {
          animation: title-glow 4s ease-in-out infinite;
        }
        
        .animate-subtitle-fade {
          animation: subtitle-fade 3s ease-in-out infinite;
        }
        
        .animate-tip-icon {
          animation: tip-icon 2s ease-in-out infinite;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .text-5xl { font-size: 2.5rem; }
          .text-7xl { font-size: 3.5rem; }
          .blur-2xl { filter: blur(16px); }
          .blur-3xl { filter: blur(20px); }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .animate-float-particle,
          .animate-orb-float,
          .animate-orb-float-reverse,
          .animate-orb-pulse,
          .animate-orb-float-slow,
          .animate-elite-glow,
          .animate-inner-glow,
          .animate-icon-pulse,
          .animate-orbit,
          .animate-ring-1,
          .animate-ring-2,
          .animate-shimmer-wave,
          .animate-pulse-gentle,
          .animate-title-glow,
          .animate-subtitle-fade,
          .animate-tip-icon {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
});

UltimateLoadingScreen.displayName = 'UltimateLoadingScreen';

export default UltimateLoadingScreen;
