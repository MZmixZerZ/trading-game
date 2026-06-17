import React from "react";
import logo from "../../assets/logo.svg";
import { useNavigate, useLocation } from "react-router-dom";
import { FaGamepad, FaUser, FaTrophy, FaHome } from "react-icons/fa";

export default function GameNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      key: "home",
      icon: <FaHome size={20} />,
      label: "Home",
      path: "/",
      color: "from-blue-400 to-cyan-400"
    },
    {
      key: "challenge",
      icon: <FaTrophy size={20} />,
      label: "Challenge", 
      path: "/challenge",
      color: "from-orange-400 to-red-400"
    },
    {
      key: "profile",
      icon: <FaUser size={20} />,
      label: "Profile",
      path: "/account",
      color: "from-indigo-400 to-purple-400"
    }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed left-0 top-0 w-20 h-screen bg-gradient-to-b from-slate-900/95 via-gray-900/95 to-slate-900/95 backdrop-blur-xl border-r border-cyan-500/20 flex flex-col items-center py-6 space-y-6 z-30 shadow-2xl">
      {/* Animated Glow Effect */}
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-400/60 to-transparent animate-pulse"></div>
      <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent blur-sm"></div>
      
      {/* Top Logo/Brand */}
      <div className="mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-white/5 ring-1 ring-white/10 backdrop-blur-sm">
          <img src={logo} alt="IdeaTrade" className="w-7 h-7 filter brightness-0 invert drop-shadow" />
        </div>
      </div>
      
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`group relative flex flex-col items-center space-y-3 p-4 rounded-2xl transition-all duration-500 transform hover:scale-110 ${
              active 
                ? 'bg-gradient-to-br from-gray-800/80 to-gray-700/80 backdrop-blur-lg shadow-2xl scale-110 border border-cyan-400/30' 
                : 'hover:bg-gradient-to-br hover:from-gray-800/60 hover:to-gray-700/60 backdrop-blur-lg hover:shadow-xl'
            }`}
            title={item.label}
          >
            {/* Icon Container with Enhanced Styling */}
            <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 overflow-hidden ${
              active 
                ? `bg-gradient-to-br ${item.color} shadow-2xl shadow-cyan-400/25` 
                : 'bg-gradient-to-br from-gray-700/50 to-gray-600/50 group-hover:from-gray-600/70 group-hover:to-gray-500/70 group-hover:shadow-lg'
            }`}>
              {/* Background Glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 ${active ? 'opacity-100' : 'group-hover:opacity-30'} blur-sm transition-opacity duration-500`}></div>
              
              {/* Icon */}
              <div className={`relative z-10 transition-all duration-500 ${
                active ? 'text-white drop-shadow-lg' : 'text-gray-300 group-hover:text-white'
              }`}>
                {item.icon}
              </div>
              
              {/* Shine Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 ${active ? 'opacity-100' : 'group-hover:opacity-60'} transition-opacity duration-500`}></div>
            </div>
            
            {/* Label with Better Typography */}
            <span className={`text-xs font-semibold transition-all duration-500 text-center leading-tight font-thai-body ${
              active 
                ? 'text-cyan-300 drop-shadow-sm' 
                : 'text-gray-400 group-hover:text-gray-200'
            }`}>
              {item.label}
            </span>

            {/* Enhanced Active Indicator */}
            {active && (
              <>
                <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-gradient-to-b from-cyan-400 via-cyan-300 to-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 animate-pulse"></div>
                <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-gradient-to-b from-cyan-400/30 via-cyan-300/30 to-cyan-400/30 rounded-full blur-sm"></div>
              </>
            )}

            {/* Enhanced Hover Glow */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 blur-lg transition-all duration-500`}></div>
            
            {/* Ripple Effect */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-active:opacity-30 bg-white transition-opacity duration-150"></div>
          </button>
        );
      })}

      {/* Gaming Elements */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center opacity-20 animate-pulse">
          <FaGamepad className="text-white text-sm" />
        </div>
      </div>
    </nav>
  );
}
