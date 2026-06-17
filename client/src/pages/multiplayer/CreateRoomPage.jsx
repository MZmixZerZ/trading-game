import React from "react";
import RoomSetting from "../../components/multiplayer/RoomSetting";
import { useNavigate } from "react-router-dom";

export default function CreateRoomPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-300 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>
        {/* Render RoomSetting as full-page centered section (not modal backdrop) */}
        <div className="flex justify-center items-start">
          <div className="w-full max-w-3xl">
            <RoomSetting embedded onClose={() => navigate(-1)} />
          </div>
        </div>
      </div>
    </div>
  );
}
