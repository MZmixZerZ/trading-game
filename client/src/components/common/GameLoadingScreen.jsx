import React from 'react';
import logo from '../../assets/logo.svg';

export default function GameLoadingScreen({ message = "Loading...", subMessage = "Please wait a moment" }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 z-50 min-h-screen h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overflow-hidden flex items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-6">
        <div className="text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center shadow-2xl mb-4 bg-white/5 ring-1 ring-white/10 backdrop-blur-sm">
            <img src={logo} alt="IdeaTrade" className="w-14 h-14 filter brightness-0 invert drop-shadow" />
          </div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-thai-display">
            IdeaTrade
          </h1>
        </div>

        {/* Loading Spinner */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-600 border-t-cyan-400 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-400 rounded-full animate-spin animate-reverse"></div>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white font-thai-display">{message}</h2>
          <p className="text-gray-400 font-thai-body">{subMessage}</p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2 mt-8">
          <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce delay-150"></div>
          <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce delay-300"></div>
        </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-20 left-20 text-cyan-400/30 font-mono text-xs animate-pulse">📈 Loading Markets...</div>
        <div className="absolute top-40 right-32 text-purple-400/30 font-mono text-xs animate-pulse delay-1000">💰 Preparing Charts...</div>
        <div className="absolute bottom-40 left-40 text-pink-400/30 font-mono text-xs animate-pulse delay-2000">🚀 Starting Engine...</div>
      </div>

  <style>{`
        .animate-reverse {
          animation-direction: reverse;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
