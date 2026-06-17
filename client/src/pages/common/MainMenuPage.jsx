import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaPlay, FaUser, FaSignOutAlt, FaGamepad, FaChartLine, FaUsers, FaQuestionCircle } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import GameHeader from "../../components/common/GameHeader";

export default function MainMenuPage() {
  const { currentUser: user, loading, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center scrollbar-thin">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-cyan-400 mx-auto mb-4" />
          <p className="text-white text-enhanced-xl animate-pulse">
            กำลังโหลด...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <GameHeader showBackButton={false} />
      
      <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-y-auto scrollbar-thin" style={{ height: '100vh' }}>
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute top-1/2 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl opacity-60" />
          <div className="absolute bottom-10 left-1/3 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl opacity-40" />
        </div>

      {/* Top Bar - User Info / Login */}
      <div className="relative z-10 flex justify-between items-center p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center hover:rotate-180 transition-transform duration-500">
            <FaChartLine className="text-white text-xl" />
          </div>
          <span className="text-white text-lg font-medium">MENU</span>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-4 bg-black/30 backdrop-blur-lg rounded-2xl px-6 py-3 border border-white/20 hover:bg-black/40 hover:scale-105 transition-all"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                  <FaUser className="text-white" />
                </div>
                <div className="text-white">
                  <p className="font-semibold text-enhanced-base">{user.email?.split('@')[0] || 'Player'}</p>
                  <p className="text-enhanced-sm text-gray-200">ออนไลน์</p>
                </div>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div 
                  className="absolute right-0 top-full mt-2 w-56 bg-gray-800/90 backdrop-blur-lg rounded-2xl border border-gray-600/50 shadow-xl z-50 transition-all duration-200 opacity-100"
                >
                  <div className="p-2">
                    <button
                      onClick={() => {
                        navigate("/account");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all"
                    >
                      <FaUser className="text-cyan-400" />
                      <span>โปรไฟล์</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        navigate("/help");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all"
                    >
                      <FaQuestionCircle className="text-yellow-400" />
                      <span>ความช่วยเหลือ</span>
                    </button>
                    
                    <div className="border-t border-gray-600/50 my-2"></div>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-gray-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <FaSignOutAlt className="text-red-400" />
                      <span>ออกจากระบบ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex space-x-3">
              <div className="hover:scale-105 transition-transform">
                <Link
                  to="/login"
                  className="bg-blue-500/80 hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-medium transition-all backdrop-blur-lg border border-white/20"
                >
                  เข้าสู่ระบบ
                </Link>
              </div>
              <div className="hover:scale-105 transition-transform">
                <Link
                  to="/register"
                  className="bg-green-500/80 hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-medium transition-all backdrop-blur-lg border border-white/20"
                >
                  สมัครสมาชิก
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-8">
        {/* Logo Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="relative hover:scale-110 transition-transform duration-300">
              <div className="w-32 h-32 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-yellow-400/30">
                <div className="hover:animate-pulse">
                  <FaGamepad className="text-white text-6xl" />
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-cyan-400 rounded-full animate-bounce" />
            </div>
          </div>
          
          <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-4 animate-fade-in">
            IdeaTrade
          </h1>
          
          <p className="text-5xl font-bold text-white mb-2 text-enhanced-3xl">
            Trading Game Arena
          </p>
          
          <p className="text-2xl text-gray-300 max-w-2xl mx-auto text-enhanced-xl">
            เกมเทรดดิ้งที่สนุกและเร้าใจที่สุด แข่งขันกับเพื่อนหรือพิสูจน์ตัวเอง!
          </p>
        </div>

        {/* Menu Buttons */}
        {user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl w-full">
            {/* Play Game */}
            <div className="hover:scale-105 hover:-translate-y-2 transition-all duration-300">
              <Link
                to="/challenge"
                className="group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-12 rounded-3xl shadow-2xl backdrop-blur-lg border border-white/20 block"
              >
                <div className="flex items-center justify-center mb-6 hover:scale-110 transition-transform">
                  <FaPlay className="text-6xl" />
                </div>
                <h3 className="text-4xl font-bold text-center mb-3 text-enhanced-2xl">เริ่มเกม</h3>
                <p className="text-center text-green-100 text-lg text-enhanced-base">เลือกโหมดและเริ่มผจญภัย!</p>
              </Link>
            </div>

            {/* Practice Quiz */}
            <div className="hover:scale-105 hover:-translate-y-2 transition-all duration-300">
              <Link
                to="/practice-quiz"
                className="group bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white p-12 rounded-3xl shadow-2xl backdrop-blur-lg border border-white/20 block"
              >
                <div className="flex items-center justify-center mb-6 hover:scale-110 transition-transform">
                  <FaGamepad className="text-6xl" />
                </div>
                <h3 className="text-4xl font-bold text-center mb-3 text-enhanced-2xl">ฝึกฝน Quiz</h3>
                <p className="text-center text-orange-100 text-lg text-enhanced-base">ทดสอบความรู้ไม่จำกัดครั้ง</p>
              </Link>
            </div>

            {/* Profile */}
            <div className="hover:scale-105 hover:-translate-y-2 transition-all duration-300">
              <Link
                to="/account"
                className="group bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white p-12 rounded-3xl shadow-2xl backdrop-blur-lg border border-white/20 block"
              >
                <div className="flex items-center justify-center mb-6 hover:scale-110 transition-transform">
                  <FaUser className="text-6xl" />
                </div>
                <h3 className="text-4xl font-bold text-center mb-3 text-enhanced-2xl">โปรไฟล์</h3>
                <p className="text-center text-purple-100 text-lg text-enhanced-base">ดูสถิติและความสำเร็จ</p>
              </Link>
            </div>

            {/* Help */}
            <div className="hover:scale-105 hover:-translate-y-2 transition-all duration-300">
              <Link
                to="/help"
                className="group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white p-12 rounded-3xl shadow-2xl backdrop-blur-lg border border-white/20 block"
              >
                <div className="flex items-center justify-center mb-6 hover:scale-110 transition-transform">
                  <FaQuestionCircle className="text-6xl" />
                </div>
                <h3 className="text-4xl font-bold text-center mb-3 text-enhanced-2xl">คำแนะนำ</h3>
                <p className="text-center text-cyan-100 text-lg text-enhanced-base">เรียนรู้วิธีการเล่น</p>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-12 border border-white/20 max-w-lg mx-auto hover:scale-105 transition-transform">
              <div className="hover:scale-110 transition-transform">
                <FaUsers className="text-6xl text-cyan-400 mx-auto mb-6" />
              </div>
              <h3 className="text-4xl font-bold text-white mb-4 text-enhanced-2xl">
                ยินดีต้อนรับ!
              </h3>
              <p className="text-2xl text-gray-300 mb-8 text-enhanced-xl">
                เข้าสู่ระบบเพื่อเริ่มเล่นเกมเทรดดิ้งที่สนุกที่สุด
              </p>
              <div className="flex flex-col space-y-4">
                <div className="hover:scale-105 transition-transform">
                  <Link
                    to="/login"
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white py-4 px-8 rounded-2xl font-bold text-xl transition-all text-enhanced-lg block"
                  >
                    เข้าสู่ระบบ
                  </Link>
                </div>
                <div className="hover:scale-105 transition-transform">
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 px-8 rounded-2xl font-bold text-xl transition-all text-enhanced-lg block"
                  >
                    สมัครสมาชิกใหม่
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProfileMenu(false)}
        ></div>
      )}
      </div>
    </>
  );
}
