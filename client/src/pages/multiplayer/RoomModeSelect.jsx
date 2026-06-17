import React from "react";
import { useNavigate } from "react-router-dom";
import { FaDoorOpen, FaRocket } from "react-icons/fa";

export default function RoomModeSelect() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-lg">
            Select Competition Mode
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base">
            Create a new room to host or join a room with a PIN code
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Create Room */}
          <button
            onClick={() => navigate("/rooms/create")}
            className="group relative rounded-3xl overflow-hidden border-2 border-blue-500/40 bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 hover:from-blue-600/30 hover:via-indigo-600/30 hover:to-purple-600/30 p-7 sm:p-9 text-left transition-all duration-300 hover:scale-[1.02] shadow-[0_20px_40px_rgba(59,130,246,0.25)]"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative flex items-center gap-5">
              <div className="p-5 rounded-2xl bg-blue-600/40 ring-2 ring-blue-400/40 shadow-lg">
                <FaRocket className="text-white text-3xl" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold drop-shadow">Create Competition Room</h2>
                <p className="mt-2 text-slate-300 text-sm sm:text-base">
                  Set number of players, game duration, and open room for friends
                </p>
              </div>
            </div>
          </button>

          {/* Join Room */}
          <button
            onClick={() => navigate("/rooms/join")}
            className="group relative rounded-3xl overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-600/20 via-teal-600/20 to-cyan-600/20 hover:from-emerald-600/30 hover:via-teal-600/30 hover:to-cyan-600/30 p-7 sm:p-9 text-left transition-all duration-300 hover:scale-[1.02] shadow-[0_20px_40px_rgba(16,185,129,0.25)]"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl" />

            <div className="relative flex items-center gap-5">
              <div className="p-5 rounded-2xl bg-emerald-600/40 ring-2 ring-emerald-400/40 shadow-lg">
                <FaDoorOpen className="text-white text-3xl" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold drop-shadow">Join Room with PIN</h2>
                <p className="mt-2 text-slate-300 text-sm sm:text-base">
                  Enter 6-digit code to join competition with friends
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Helper */}
        <div className="mt-10 text-center text-slate-400 text-xs sm:text-sm">
          Tip: Create a room first, then share the PIN code for friends to join
        </div>
      </div>
    </div>
  );
}
