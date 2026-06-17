import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { FaEye, FaEyeSlash, FaGamepad, FaArrowLeft, FaRocket, FaUser, FaLock, FaStar, FaGem, FaFire } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { FiPlay, FiZap, FiShield } from "react-icons/fi";

export default function GameLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("⚠️ Please fill in all required information.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      navigate("/challenge");
    } catch (err) {
      console.error("Login error:", err);
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials') || msg.includes('user not found')) {
        setError("❌ Incorrect email or password");
      } else if (msg.includes('Email not confirmed')) {
        setError("📧 Please confirm your email before logging in");
      } else {
        setError("❌ Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/challenge` }
      });
      if (authError) throw authError;
    } catch (err) {
      console.error("Google login error:", err);
      setError("❌ Login failed with Google");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      {/* Animated Gaming Background */}
      <div className="absolute inset-0">
        {/* Floating particles */}
        <div className="absolute w-2 h-2 bg-blue-400 rounded-full animate-float" style={{top: '10%', left: '10%', animationDelay: '0s'}}></div>
        <div className="absolute w-1 h-1 bg-purple-400 rounded-full animate-float" style={{top: '20%', left: '80%', animationDelay: '1s'}}></div>
        <div className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-float" style={{top: '60%', left: '15%', animationDelay: '2s'}}></div>
        <div className="absolute w-2 h-2 bg-green-400 rounded-full animate-float" style={{top: '80%', left: '70%', animationDelay: '1.5s'}}></div>
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-glow" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Header */}
      <div className="relative z-20 flex justify-between items-center p-6">
        <Link to="/" className="flex items-center gap-3 text-white hover:text-yellow-400 transition-colors">
          <FaArrowLeft className="text-xl" />
          <FaGamepad className="text-2xl" />
          <span className="font-bold">Back to Home</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <FaGem className="text-purple-400 animate-twinkle" />
          <span className="text-white font-bold">IdeaTrade Gaming</span>
          <FaStar className="text-yellow-400 animate-twinkle" style={{animationDelay: '0.5s'}} />
        </div>
      </div>

      {/* Main Login Form */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 pt-0">
        <div className="w-full max-w-md">
          
          {/* Login Card */}
          <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-600/50 rounded-3xl p-8 shadow-2xl">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-50"></div>
            
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-lg opacity-50 animate-pulse-glow"></div>
                  <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-full">
                    <FiShield className="text-4xl text-white" />
                  </div>
                  <FaStar className="absolute -top-1 -right-1 text-yellow-300 animate-twinkle" />
                </div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                  🎮 Enter the Game
                </h1>
                <p className="text-gray-300">Enter the trading competition stage</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl backdrop-blur-lg">
                  <p className="text-red-300 text-center font-medium">{error}</p>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaUser className="text-blue-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="📧 Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-lg transition-all"
                    disabled={isLoading}
                  />
                </div>

                {/* Password Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaLock className="text-purple-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="🔒 Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 backdrop-blur-lg transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Logging in...</span>
                    </div>
                  ) : (
                    <>
                      <FiPlay className="text-xl" />
                      <span>⚡ Enter the Game</span>
                      <FiZap className="text-xl group-hover:animate-pulse" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-600"></div>
                <span className="px-4 text-gray-400 text-sm">หรือ</span>
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-600"></div>
              </div>

              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-4 bg-white/10 hover:bg-white/20 border border-gray-600/50 text-white font-medium rounded-xl backdrop-blur-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <FcGoogle className="text-xl" />
                <span>Login with Google</span>
              </button>

              {/* Register Link */}
              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 font-bold hover:from-green-300 hover:to-emerald-300 transition-all"
                  >
                    🚀 Create a new account
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Gaming Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-600/20 backdrop-blur-lg p-4 rounded-xl border border-blue-500/30">
              <FiZap className="text-2xl text-blue-400 mx-auto mb-1" />
              <div className="text-blue-300 text-sm font-medium">Real-time</div>
            </div>
            <div className="bg-purple-600/20 backdrop-blur-lg p-4 rounded-xl border border-purple-500/30">
              <FaFire className="text-2xl text-purple-400 mx-auto mb-1" />
              <div className="text-purple-300 text-sm font-medium">Competitive</div>
            </div>
            <div className="bg-green-600/20 backdrop-blur-lg p-4 rounded-xl border border-green-500/30">
              <FaRocket className="text-2xl text-green-400 mx-auto mb-1" />
              <div className="text-green-300 text-sm font-medium">Free 100%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Gaming CSS */}
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
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .animate-twinkle {
          animation: twinkle 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
