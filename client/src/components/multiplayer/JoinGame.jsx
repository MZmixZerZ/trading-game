import React, { useEffect, useState } from "react";
import { FaKey } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useMultiplayer } from "../../contexts/MultiplayerContext";
import { useAuth } from "../../contexts/AuthContext";

export default function JoinGame({ onClose, embedded = false, compact = false }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { joinRoom } = useMultiplayer();
  const { currentUser } = useAuth();

  const handleBackdrop = (e) => {
    if (embedded) return; // no backdrop handling in embedded mode
    if (e.target === e.currentTarget) onClose?.();
  };

  // Lock body scroll and ESC only when shown as modal (not embedded)
  useEffect(() => {
    if (!embedded) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onKeyDown = (e) => {
        if (e.key === "Escape") onClose?.();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", onKeyDown);
      };
    }
  }, [embedded, onClose]);

  const handleJoinRoom = async () => {
    setLoading(true);
    setError("");

    const roomCode = pin.trim();
    
    if (!roomCode) {
      setError("กรุณากรอกรหัสห้อง");
      setLoading(false);
      return;
    }

    if (!/^\d{6}$/.test(roomCode)) {
      setError("รหัสห้องต้องเป็นตัวเลข 6 หลัก");
      setLoading(false);
      return;
    }

    if (!currentUser) {
      setError("กรุณาเข้าสู่ระบบก่อน");
      setLoading(false);
      return;
    }

    try {
      const result = await joinRoom(roomCode);
      
      if (result.success) {
        navigate(`/waiting/${roomCode}`);
      }
    } catch (err) {
      console.error("❌ Failed to join room:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการเข้าห้อง");
    } finally {
      setLoading(false);
    }
  };

  const Card = (
    <div className={`relative w-full ${compact ? 'max-w-md' : 'max-w-lg'} mx-auto transform transition-all duration-300 scale-100`}>
      {/* Enhanced Modern Card */}
      <div
        className="bg-gradient-to-br from-slate-900/95 via-gray-800/95 to-slate-900/95 backdrop-blur-xl border border-gray-600/30 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => (embedded ? undefined : e.stopPropagation())}
      >
        {/* Header Section */}
  <div className={`relative bg-gradient-to-r from-indigo-600 to-purple-600 ${compact ? 'px-6 py-5' : 'px-8 py-6'}`}>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>

          <div className="relative flex items-center justify-center">
            <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
              <FaKey className="text-3xl text-white" />
            </div>
          </div>

          <h2 className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold text-white text-center mt-4 mb-2`}>
            🎮 Join the game
          </h2>
          <p className={`text-indigo-100 text-center ${compact ? 'text-xs' : 'text-sm'}`}>
            Enter the room code to join the trading competition
          </p>
        </div>

        {/* Content Section */}
  <div className={`${compact ? 'px-6 py-6 space-y-5' : 'px-8 py-8 space-y-6'}`}>
          {/* PIN Input Section */}
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-white font-semibold text-lg justify-center">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg p-2">
                <FaKey className="text-white text-sm" />
              </div>
              Room PIN
            </label>

            <div className="relative">
              <input
                className={`w-full text-center ${compact ? 'text-2xl p-4' : 'text-3xl p-6'} font-bold tracking-widest rounded-2xl border-2 border-gray-600/50 bg-gray-800/80 text-white placeholder:text-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none backdrop-blur-sm`}
                placeholder="0 0 0 0 0 0"
                value={pin.split("").join(" ")}
                onChange={(e) => {
                  const cleanValue = e.target.value.replace(/[^0-9]/g, "");
                  setPin(cleanValue);
                }}
                maxLength={11} // 6 digits + 5 spaces
                autoFocus
              />

              {/* PIN Progress Indicator */}
              <div className="flex justify-center mt-3 space-x-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      i < pin.length ? "bg-indigo-500 scale-110" : "bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="text-center text-sm text-gray-400">
              💡 Room codes consist of 6 digits, e.g. 123456
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-center font-medium backdrop-blur-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4 pt-4">
            <button
              className={`w-full ${compact ? 'py-3 text-base' : 'py-4 text-lg'} rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white shadow-xl hover:shadow-2xl border border-indigo-500/30`}
              onClick={handleJoinRoom}
              disabled={loading || pin.length !== 6}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Joining...
                </>
              ) : pin.length === 6 ? (
                <>🚀 Join the game</>
              ) : (
                <>🎯 Enter the 6-digit code</>
              )}
            </button>

            <button
              className="w-full py-3 rounded-xl text-gray-400 hover:text-white transition-colors duration-300 font-medium border border-gray-600/50 hover:border-gray-500"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <section className="py-6 sm:py-10 px-4 sm:px-6">
        <div className="flex justify-center">{Card}</div>
      </section>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
      onClick={handleBackdrop}
      tabIndex={-1}
    >
      {/* Enhanced Modal Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
      {Card}
    </div>
  );
}
