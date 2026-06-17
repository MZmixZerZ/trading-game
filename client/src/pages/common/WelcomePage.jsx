import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaGamepad, FaUsers, FaRocket, FaFire, FaStar, FaGem } from "react-icons/fa";
import { FiPlay, FiArrowRight, FiZap, FiTarget, FiAward } from "react-icons/fi";
import { auth } from "../../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import logo from "../../assets/logo.svg";

export default function WelcomePage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEnterApp = () => {
    navigate("/challenge");
  };

  const handleGetStarted = () => {
    if (user) {
      navigate("/challenge");
    } else {
      navigate("/register");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-yellow-400"></div>
          <FaGamepad className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl text-yellow-400 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating particles */}
        <div className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-float" style={{top: '10%', left: '10%', animationDelay: '0s'}}></div>
        <div className="absolute w-1 h-1 bg-blue-400 rounded-full animate-float" style={{top: '20%', left: '80%', animationDelay: '1s'}}></div>
        <div className="absolute w-3 h-3 bg-purple-400 rounded-full animate-float" style={{top: '60%', left: '15%', animationDelay: '2s'}}></div>
        <div className="absolute w-2 h-2 bg-green-400 rounded-full animate-float" style={{top: '80%', left: '70%', animationDelay: '1.5s'}}></div>
        <div className="absolute w-1 h-1 bg-orange-400 rounded-full animate-float" style={{top: '30%', left: '60%', animationDelay: '0.5s'}}></div>
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-glow" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse-glow" style={{animationDelay: '2s'}}></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/5 to-transparent" 
             style={{backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(59, 130, 246, 0.1) 2px, transparent 0)', backgroundSize: '50px 50px'}}></div>
      </div>

      {/* Top Navigation */}
      <div className="relative z-20 flex justify-between items-center p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm flex items-center justify-center">
            <img src={logo} alt="IdeaTrade" className="w-6 h-6 filter brightness-0 invert drop-shadow" />
          </div>
          <span className="text-2xl font-bold text-white">IdeaTrade</span>
        </div>
        
        {!user ? (
          <div className="flex gap-3">
            <Link
              to="/login"
              className="px-6 py-3 bg-blue-600/80 backdrop-blur-lg hover:bg-blue-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all border border-blue-500/50"
            >
              🔑 Login
            </Link>
            <Link
              to="/register"
              className="px-6 py-3 bg-green-600/80 backdrop-blur-lg hover:bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all border border-green-500/50"
            >
              🚀 Register
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-white font-medium bg-black/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
              <span className="text-green-400">●</span> {user.email?.split('@')[0] || user.displayName || 'Player'}
            </div>
            <Link
              to="/account"
              className="px-4 py-2 bg-purple-600/80 backdrop-blur-lg hover:bg-purple-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all border border-purple-500/50"
            >
              👤 Profile
            </Link>
            <button
              onClick={() => auth.signOut()}
              className="px-4 py-2 bg-red-600/80 backdrop-blur-lg hover:bg-red-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all border border-red-500/50"
            >
              🚪 Exit
            </button>
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4 pt-0">
        
        {/* Gaming Logo with Effects */}
        <div className="mb-8 relative animate-zoom-in">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-2xl opacity-50 animate-pulse-glow"></div>
          <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 p-8 rounded-full shadow-2xl">
            <FaGamepad className="text-6xl text-white" />
          </div>
          {/* Sparkle effects */}
          <FaStar className="absolute -top-2 -right-2 text-yellow-300 animate-twinkle" />
          <FaGem className="absolute -bottom-2 -left-2 text-blue-300 animate-twinkle" style={{animationDelay: '0.5s'}} />
        </div>

        {/* Main Title with Gaming Style */}
        <div className="mb-6 animate-slide-up delay-300">
          <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-4 drop-shadow-2xl animate-gradient-x">
            IdeaTrade
          </h1>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-1 w-16 bg-gradient-to-r from-transparent to-yellow-400 rounded"></div>
            <FaRocket className="text-3xl text-yellow-400 animate-bounce" />
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              TRADING ARENA
            </h2>
            <FaFire className="text-3xl text-orange-400 animate-pulse" />
            <div className="h-1 w-16 bg-gradient-to-l from-transparent to-orange-400 rounded"></div>
          </div>
          <p className="text-xl text-gray-300 font-medium">
            🎮 The most realistic and fun trading game. 🚀
          </p>
        </div>

        {/* Gaming Features */}
        <div className="mb-10 animate-slide-up delay-500">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 backdrop-blur-xl p-6 rounded-2xl border border-blue-500/30 hover:scale-105 transition-transform group">
              <FiZap className="text-4xl text-blue-400 mx-auto mb-2 group-hover:animate-pulse" />
              <h3 className="text-white font-bold mb-1">Real time</h3>
              <p className="text-blue-300 text-sm">Live data every second</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 backdrop-blur-xl p-6 rounded-2xl border border-purple-500/30 hover:scale-105 transition-transform group">
              <FaUsers className="text-4xl text-purple-400 mx-auto mb-2 group-hover:animate-pulse" />
              <h3 className="text-white font-bold mb-1">Multiplayer</h3>
              <p className="text-purple-300 text-sm">Play with friends</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-600/30 to-green-800/30 backdrop-blur-xl p-6 rounded-2xl border border-green-500/30 hover:scale-105 transition-transform group">
              <FiTarget className="text-4xl text-green-400 mx-auto mb-2 group-hover:animate-pulse" />
              <h3 className="text-white font-bold mb-1">Skills</h3>
              <p className="text-green-300 text-sm">Develop trading skills</p>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-600/30 to-yellow-800/30 backdrop-blur-xl p-6 rounded-2xl border border-yellow-500/30 hover:scale-105 transition-transform group">
              <FiAward className="text-4xl text-yellow-400 mx-auto mb-2 group-hover:animate-pulse" />
              <h3 className="text-white font-bold mb-1">Rewards</h3>
              <p className="text-yellow-300 text-sm">Compete for championships</p>
            </div>
          </div>
        </div>

        {/* Action Buttons with Gaming Style */}
        <div className="flex flex-col gap-6 animate-slide-up delay-700">
          {user ? (
            <>
              <button
                onClick={handleEnterApp}
                className="group relative px-12 py-6 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-black text-xl rounded-3xl shadow-2xl transition-all transform hover:scale-110 hover:shadow-orange-500/50 flex items-center justify-center gap-4 animate-pulse-glow"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-pink-400 rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <FiPlay className="text-2xl relative z-10" />
                <span className="relative z-10">🎮 Play Game</span>
                <FiArrowRight className="text-2xl group-hover:translate-x-2 transition-transform relative z-10" />
              </button>
              
              <div className="flex items-center justify-center gap-4 text-green-400">
                <FaStar className="animate-twinkle" />
                <span className="font-bold">Welcome back, {user.displayName || user.email?.split('@')[0] || 'Player'}!</span>
                <FaStar className="animate-twinkle" style={{animationDelay: '0.5s'}} />
              </div>
            </>
          ) : (
            <>
              <Link
                to="/register"
                className="group relative px-12 py-6 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white font-black text-xl rounded-3xl shadow-2xl transition-all transform hover:scale-110 hover:shadow-green-500/50 flex items-center justify-center gap-4"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-teal-400 rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <FaRocket className="text-2xl relative z-10" />
                <span className="relative z-10">🚀 Start Playing for Free</span>
                <FiArrowRight className="text-2xl group-hover:translate-x-2 transition-transform relative z-10" />
              </Link>
              
              <Link
                to="/login"
                className="group px-10 py-4 bg-gradient-to-r from-blue-600/30 to-purple-600/30 backdrop-blur-xl hover:from-blue-600/50 hover:to-purple-600/50 text-white font-bold rounded-2xl border border-blue-500/50 transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <span>🔑 Login</span>
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <button
                onClick={handleGetStarted}
                className="group px-8 py-3 bg-white/10 backdrop-blur-lg hover:bg-white/20 text-white font-medium rounded-xl border border-white/30 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <FiPlay className="group-hover:translate-x-1 transition-transform" />
                👀 Preview the game
              </button>
            </>
          )}
        </div>

        {/* Gaming Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center animate-slide-up delay-1000">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-lg p-4 rounded-xl border border-blue-500/30">
            <div className="text-3xl font-black text-blue-400">100%</div>
            <div className="text-blue-300 text-sm font-medium">Free</div>
          </div>
          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-lg p-4 rounded-xl border border-green-500/30">
            <div className="text-3xl font-black text-green-400">24/7</div>
            <div className="text-green-300 text-sm font-medium">Real-time</div>
          </div>
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-lg p-4 rounded-xl border border-purple-500/30">
            <div className="text-3xl font-black text-purple-400">∞</div>
            <div className="text-purple-300 text-sm font-medium">Unlimited Games</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 backdrop-blur-lg p-4 rounded-xl border border-yellow-500/30">
            <div className="text-3xl font-black text-yellow-400">🏆</div>
            <div className="text-yellow-300 text-sm font-medium">Championships</div>
          </div>
        </div>
      </div>

      {/* Enhanced Gaming CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .animate-twinkle {
          animation: twinkle 1.5s ease-in-out infinite;
        }
        
        .animate-zoom-in {
          animation: zoom-in 1s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 1s ease-out;
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        
        .delay-300 {
          animation-delay: 0.3s;
          animation-fill-mode: both;
        }
        
        .delay-500 {
          animation-delay: 0.5s;
          animation-fill-mode: both;
        }
        
        .delay-700 {
          animation-delay: 0.7s;
          animation-fill-mode: both;
        }
        
        .delay-1000 {
          animation-delay: 1s;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
}
