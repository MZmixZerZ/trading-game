import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { FaGamepad, FaUser, FaSignOutAlt, FaHome, FaArrowLeft, FaQuestionCircle } from "react-icons/fa";
import logo from "../../assets/logo.svg";

export default function GameHeader({ showBackButton = false, backPath = "/challenge", showHomeButton = true }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // แยก logic สำหรับกลับหน้าหลัก
  const handleGoHome = () => {
    console.log('🏠 Navigating to welcome page from GameHeader');
    navigate("/"); // ไปหน้า Welcome จริงๆ
  };

  return (
    <header className="relative bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 text-white border-b-2 border-cyan-500/30 backdrop-blur-lg z-[1000]">
      {/* Glow Effect */}
  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 blur-sm pointer-events-none"></div>
      
  <div className="relative z-[1001] w-full flex justify-between items-center px-3 py-0.5">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔙 Back button clicked, navigating to:', backPath);
                navigate(backPath);
              }}
              className="relative z-[1002] flex items-center space-x-2 bg-gray-800/50 backdrop-blur-lg rounded-xl px-3 py-1 text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all shadow-lg cursor-pointer"
              style={{ pointerEvents: 'all' }}
            >
              <FaArrowLeft />
              <span className="hidden sm:block text-lg">Back</span>
            </button>
          )}
          
          {/* Game Logo */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleGoHome(); // ใช้ function แยกสำหรับกลับหน้าหลัก
            }}
            className="relative z-[1002] flex items-center space-x-3 bg-black/30 backdrop-blur-lg rounded-2xl px-2.5 py-0.5 hover:bg-black/40 transition-all shadow-lg cursor-pointer"
            style={{ pointerEvents: 'all' }}
          >
            <img
              src={logo}
              alt="IdeaTrade"
              className="h-8 sm:h-9 md:h-10 w-auto filter brightness-0 invert"
            />
            <div className="hidden sm:block">
              <h1 className="text-xl font-semibold text-white">IdeaTrade</h1>
              <p className="text-sm text-gray-300">Trading Game</p>
            </div>
          </button>
        </div>

  {/* Right Section */}
  <div className="flex items-center space-x-4">
          {/* Profile Section */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 bg-black/30 backdrop-blur-lg rounded-2xl px-2.5 py-1.5 hover:bg-black/40 transition-all shadow-lg"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center">
                  <FaUser className="text-white text-sm" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-lg font-medium text-white">
                    {currentUser.displayName || "Player"}
                  </p>
                  <p className="text-sm text-gray-300">Level 1</p>
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border-2 border-cyan-400 rounded-2xl shadow-2xl z-[9999]">
                  <div className="p-2">
                    <div
                      onClick={() => {
                        navigate("/");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-gray-200 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all cursor-pointer"
                    >
                      <FaHome className="text-blue-400" />
                      <span className="font-medium text-lg">Home</span>
                    </div>
                    
                    <div
                      onClick={() => {
                        navigate("/challenge");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-gray-200 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all cursor-pointer"
                    >
                      <FaGamepad className="text-purple-400" />
                      <span className="font-medium text-lg">Challenge</span>
                    </div>
                    
                    <div className="border-t border-gray-600/50 my-2"></div>
                    
                    <div
                      onClick={() => {
                        navigate("/account");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all cursor-pointer"
                    >
                      <FaUser className="text-cyan-400" />
                      <span className="text-lg">Profile</span>
                    </div>
                    
                    <div
                      onClick={() => {
                        navigate("/help");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all cursor-pointer"
                    >
                      <FaQuestionCircle className="text-yellow-400" />
                      <span className="text-lg">Help Topics</span>
                    </div>
                    
                    <div className="border-t border-gray-600/50 my-2"></div>
                    
                    <div
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                    >
                      <FaSignOutAlt className="text-red-400" />
                      <span className="text-lg">Logout</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Home Button for non-logged users */}
          {!currentUser && (
            <Link
              to="/"
              className="flex items-center space-x-2 bg-black/30 backdrop-blur-lg rounded-xl px-3 py-1 text-gray-300 hover:text-white hover:bg-black/40 transition-all shadow-lg"
            >
              <FaHome />
              <span className="hidden sm:block text-lg">Home</span>
            </Link>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setShowProfileMenu(false)}
        ></div>
      )}
    </header>
  );
}
