import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import { FaEye, FaEyeSlash, FaGamepad, FaArrowLeft, FaStar, FaRocket, FaUser, FaLock, FaGem, FaFire, FaCrown } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { FiZap, FiShield, FiAward } from "react-icons/fi";

export default function GameRegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.fullname.trim()) {
      setError("🎮 Please enter player name.");
      return false;
    }
    if (!formData.email) {
      setError("📧 Please enter email");
      return false;
    }
    if (!formData.password) {
      setError("🔒 Please enter password");
      return false;
    }
    if (formData.password.length < 6) {
      setError("🔐 Password must be at least 6 characters long");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("❌ Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.fullname, displayName: formData.fullname }
        }
      });
      if (authError) throw authError;
      if (data.session) {
        navigate("/challenge");
      } else {
        setError("📧 Account created! Please check your email to confirm before logging in.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      const msg = err.message || '';
      if (msg.includes('already registered') || msg.includes('already in use')) {
        setError("📧 Email is already in use");
      } else if (msg.includes('password')) {
        setError("🔐 Password is too weak");
      } else {
        setError("❌ Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/challenge` }
      });
      if (authError) throw authError;
    } catch (err) {
      console.error("Google registration error:", err);
      setError("❌ Failed to create account with Google");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      {/* Animated Gaming Background */}
      <div className="absolute inset-0">
        {/* Floating particles */}
        <div className="absolute w-2 h-2 bg-green-400 rounded-full animate-float" style={{top: '10%', left: '10%', animationDelay: '0s'}}></div>
        <div className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-float" style={{top: '20%', left: '80%', animationDelay: '1s'}}></div>
        <div className="absolute w-3 h-3 bg-blue-400 rounded-full animate-float" style={{top: '60%', left: '15%', animationDelay: '2s'}}></div>
        <div className="absolute w-2 h-2 bg-purple-400 rounded-full animate-float" style={{top: '80%', left: '70%', animationDelay: '1.5s'}}></div>
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse-glow" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Header */}
      <div className="relative z-20 flex justify-between items-center p-6">
        <Link to="/" className="flex items-center gap-3 text-white hover:text-green-400 transition-colors">
          <FaArrowLeft className="text-xl" />
          <FaGamepad className="text-2xl" />
          <span className="font-bold">Back to Home</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <FaCrown className="text-yellow-400 animate-twinkle" />
          <span className="text-white font-bold">Join the Arena</span>
          <FaGem className="text-green-400 animate-twinkle" style={{animationDelay: '0.5s'}} />
        </div>
      </div>

      {/* Main Register Form */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 pt-0">
        <div className="w-full max-w-md">
          
          {/* Register Card */}
          <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl border border-gray-600/50 rounded-3xl p-8 shadow-2xl">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-50"></div>
            
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-lg opacity-50 animate-pulse-glow"></div>
                  <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-full">
                    <FiAward className="text-4xl text-white" />
                  </div>
                  <FaStar className="absolute -top-1 -right-1 text-yellow-300 animate-twinkle" />
                  <FaGem className="absolute -bottom-1 -left-1 text-green-300 animate-twinkle" style={{animationDelay: '0.5s'}} />
                </div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2">
                  🚀 Join the Game
                </h1>
                <p className="text-gray-300">Create an account and start your adventure</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl backdrop-blur-lg">
                  <p className="text-red-300 text-center font-medium">{error}</p>
                </div>
              )}

              {/* Register Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FaUser className="text-green-400" />
                  </div>
                  <input
                    type="text"
                    name="fullname"
                    placeholder="🎮 Player Name"
                    value={formData.fullname}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 backdrop-blur-lg transition-all"
                    disabled={isLoading}
                  />
                </div>

                {/* Email Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-blue-400">📧</span>
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="📧 Email"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    placeholder="🔒 Password"
                    value={formData.password}
                    onChange={handleChange}
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

                {/* Confirm Password Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiShield className="text-orange-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="🔐 Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 backdrop-blur-lg transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>

                {/* Register Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Creating an account...</span>
                    </div>
                  ) : (
                    <>
                      <FaRocket className="text-xl" />
                      <span>🚀 Start the adventure</span>
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

              {/* Google Register */}
              <button
                onClick={handleGoogleRegister}
                disabled={isLoading}
                className="w-full py-4 bg-white/10 hover:bg-white/20 border border-gray-600/50 text-white font-medium rounded-xl backdrop-blur-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <FcGoogle className="text-xl" />
                <span>Create account with Google</span>
              </button>

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  Have an account?{" "}
                  <Link
                    to="/login"
                    className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-bold hover:from-blue-300 hover:to-purple-300 transition-all"
                  >
                    🔑 Login
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Gaming Rewards Preview */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-yellow-600/20 backdrop-blur-lg p-4 rounded-xl border border-yellow-500/30">
              <FaCrown className="text-2xl text-yellow-400 mx-auto mb-1" />
              <div className="text-yellow-300 text-sm font-medium">Level 1</div>
            </div>
            <div className="bg-green-600/20 backdrop-blur-lg p-4 rounded-xl border border-green-500/30">
              <FaGem className="text-2xl text-green-400 mx-auto mb-1" />
              <div className="text-green-300 text-sm font-medium">0 EXP</div>
            </div>
            <div className="bg-purple-600/20 backdrop-blur-lg p-4 rounded-xl border border-purple-500/30">
              <FaFire className="text-2xl text-purple-400 mx-auto mb-1" />
              <div className="text-purple-300 text-sm font-medium">Start</div>
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
