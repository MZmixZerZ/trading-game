import React from "react";
import { FaUserCircle } from "react-icons/fa";

function formatMoney(n) {
  const number = typeof n === "number" ? n : 0;
  return number.toLocaleString("en-US", { minimumFractionDigits: 2 }) + "฿";
}

const crown = (
  <svg
    width={48}
    height={32}
    className="absolute -top-7 left-1/2 -translate-x-1/2 z-10"
  >
    <path d="M4 28 L16 6 L24 20 L32 6 L44 28 Z" fill="#ffd36a" />
  </svg>
);

const TopPlayerPlaceholder = () => (
  <div className="relative flex flex-col items-center border-2 border-[#51536a] bg-[#45465d] rounded-xl px-6 py-6 min-w-[120px]">
    <FaUserCircle className="text-[54px] text-gray-500 mb-2" />
    <span className="text-gray-400 text-lg font-medium">Waiting...</span>
    <span className="text-gray-500 font-bold text-lg mt-1">-</span>
  </div>
);

export default function LeaderboardPopup({ leaderboard = [], onClose }) {
  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.value - a.value);
  const top3 = sortedLeaderboard.slice(0, 3);
  const rest = sortedLeaderboard.slice(3);
  const player1 = top3[0];
  const player2 = top3[1];
  const player3 = top3[2];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-[#18181e] rounded-2xl px-8 pt-10 pb-7 shadow-2xl w-[500px] max-w-full relative flex flex-col">
        {/* Top 3 */}
        <div className="flex justify-center items-end gap-6 mb-8 relative">
          {/* 2nd */}
          <div
            className="relative flex flex-col items-center border-2 border-[#bfc4d7] bg-[#565a72] rounded-xl px-6 py-5 min-w-[135px] z-0"
            style={{ marginTop: 38 }}
          >
            {player2 ? (
              <>
                <FaUserCircle className="text-[54px] text-white mb-2" />
                <span className="text-white text-lg font-medium truncate max-w-full">
                  {player2.name}
                </span>
                <span className="text-[#18d075] font-bold text-lg mt-1">
                  {formatMoney(player2.value)}
                </span>
              </>
            ) : (
              <TopPlayerPlaceholder />
            )}
          </div>
          {/* 1st */}
          <div
            className="relative flex flex-col items-center border-2 border-[#ffd36a] bg-[#565a72] rounded-xl px-7 py-7 min-w-[150px] z-10 mx-1"
            style={{ marginTop: 0 }}
          >
            {player1 && crown}
            {player1 ? (
              <>
                <FaUserCircle className="text-[60px] text-white mb-2" />
                <span className="text-white text-lg font-medium truncate max-w-full">
                  {player1.name}
                </span>
                <span className="text-[#18d075] font-bold text-xl mt-1">
                  {formatMoney(player1.value)}
                </span>
              </>
            ) : (
              <TopPlayerPlaceholder />
            )}
          </div>
          {/* 3rd */}
          <div
            className="relative flex flex-col items-center border-2 border-[#ffd36a] bg-[#565a72] rounded-xl px-6 py-5 min-w-[135px] z-0"
            style={{ marginTop: 38 }}
          >
            {player3 ? (
              <>
                <FaUserCircle className="text-[54px] text-white mb-2" />
                <span className="text-white text-lg font-medium truncate max-w-full">
                  {player3.name}
                </span>
                <span className="text-[#18d075] font-bold text-lg mt-1">
                  {formatMoney(player3.value)}
                </span>
              </>
            ) : (
              <TopPlayerPlaceholder />
            )}
          </div>
        </div>
        {/* Rank 4+ */}
        <div className="space-y-2 max-h-[270px] overflow-y-auto pr-1 mb-5">
          {rest.map((item, idx) => (
            <div
              key={item.name}
              className="flex items-center justify-between bg-[#5b5f7d] rounded-full px-6 py-2 text-white border-none"
              style={{
                boxShadow: "0 2px 0 0 #2d3350",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg w-8 text-right">
                  {idx + 4}.
                </span>
                <FaUserCircle className="text-2xl" />
                <span className="text-base truncate">{item.name}</span>
              </div>
              <span className="font-bold text-base text-[#c6d6f8]">
                {formatMoney(item.value)}
              </span>
            </div>
          ))}
        </div>
        <button
          className="mx-auto mt-2 block bg-[#ffe380] text-[#1a1a2e] text-lg font-bold rounded-xl px-8 py-2 hover:bg-yellow-300 transition"
          onClick={onClose}
        >
          กลับสู่หน้าหลัก
        </button>
      </div>
    </div>
  );
}
