import React from "react";
import { useNavigate } from "react-router-dom";
import JoinGame from "../../components/multiplayer/JoinGame";

export default function JoinRoomPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          className="mb-6 text-sm text-gray-300 hover:text-white transition-colors"
          onClick={() => navigate(-1)}
        >
          ← กลับ
        </button>

        <div className="flex justify-center">
          <JoinGame embedded onClose={() => navigate(-1)} />
        </div>
      </div>
    </div>
  );
}
