import React, { useEffect, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { FaUserAlt, FaRegClock, FaCog } from "react-icons/fa";
import { auth } from "../../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { getRandomTimePeriod } from "../../services/marketData";
import { useMultiplayer } from "../../contexts/MultiplayerContext";

export default function RoomSetting({ onClose, embedded = false, compact = false }) {
  const [maxPlayers, setMaxPlayers] = useState(2); // ค่าเริ่มต้น 2 คน (รองรับ 2-20 คน)
  // Default to 3 minutes to reduce friction; user can change via select or quick chips
  const [maxTime, setMaxTime] = useState(3);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastCreateTime, setLastCreateTime] = useState(0);
  const navigate = useNavigate();
  const { createRoom, error: multiplayerError } = useMultiplayer();

  // Use refs to avoid stale closures
  const maxTimeRef = useRef(maxTime);
  const maxPlayersRef = useRef(maxPlayers);
  const loadingRef = useRef(loading);
  const lastCreateTimeRef = useRef(lastCreateTime);
  const onCloseRef = useRef(onClose);

  // Update refs when state changes
  useEffect(() => {
    maxTimeRef.current = maxTime;
  }, [maxTime]);

  useEffect(() => {
    maxPlayersRef.current = maxPlayers;
  }, [maxPlayers]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    lastCreateTimeRef.current = lastCreateTime;
  }, [lastCreateTime]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleBackdrop = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onCloseRef.current();
    }
  }, []); // ใช้ ref แทน onClose dependency

  const handleCreate = useCallback(async () => {
    // ป้องกันการกดซ้ำ - ใช้ ref แทน state เพื่อป้องกัน stale closure
    const now = Date.now();
    if (loadingRef.current || (now - lastCreateTimeRef.current < 2000)) return;
    
    setLastCreateTime(now);
    setErrorMsg("");
    setLoading(true);
    
    if (!maxTimeRef.current || Number(maxTimeRef.current) < 1) {
      setErrorMsg("กรุณาเลือกระยะเวลาการแข่งขัน");
      setLoading(false);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setErrorMsg("คุณต้องเข้าสู่ระบบก่อน");
      setLoading(false);
      navigate('/login');
      return;
    }

    try {
      // 🎯 Random market/symbol - Define MARKETS inside the callback to avoid dependency issues
      const marketsData = {
        TFEX: {
          name: "TFEX Derivatives Market",
          symbols: [
            { code: "^SET50.BK", name: "SET50 Index" },
            { code: "GOLD", name: "Gold Futures" },
            { code: "USD", name: "USD/THB" },
            { code: "OIL", name: "Crude Oil Futures" },
            { code: "RUBBER", name: "Rubber Futures" },
          ],
        },
        SET: {
          name: "The Stock Exchange of Thailand (SET)",
          symbols: [
            { code: "PTT", name: "PTT Public Company Limited" },
            { code: "CPALL", name: "CP ALL Public Company Limited" },
            { code: "KBANK", name: "KASIKORNBANK Public Company Limited" },
            { code: "SCB", name: "The Siam Commercial Bank Public Company Limited" },
            { code: "AOT", name: "Airports of Thailand Public Company Limited" },
            { code: "ADVANC", name: "Advanced Info Service Public Company Limited" },
            { code: "BBL", name: "Bangkok Bank Public Company Limited" },
            { code: "BDMS", name: "Bangkok Dusit Medical Services Public Company Limited" },
            { code: "INTUCH", name: "Intouch Holdings Public Company Limited" },
            { code: "TU", name: "Thai Union Group Public Company Limited" },
            { code: "KTB", name: "Krung Thai Bank Public Company Limited" },
            { code: "TRUE", name: "True Corporation Public Company Limited" },
            { code: "DTAC", name: "Total Access Communication Public Company Limited" },
            { code: "CP", name: "Charoen Pokphand Foods Public Company Limited" },
            { code: "CPF", name: "Charoen Pokphand Foods Public Company Limited" },
            { code: "MINT", name: "Minor International Public Company Limited" },
            { code: "CRC", name: "Central Retail Corporation Public Company Limited" },
            { code: "BGC", name: "Berli Jucker Public Company Limited" },
            { code: "HMPRO", name: "Home Product Center Public Company Limited" },
            { code: "COM7", name: "COM7 Public Company Limited" },
            { code: "OR", name: "PTT Oil and Retail Business Public Company Limited" },
            { code: "BANPU", name: "Banpu Public Company Limited" },
            { code: "DELTA", name: "Delta Electronics (Thailand) Public Company Limited" },
            { code: "SAWAD", name: "Srisawad Corporation Public Company Limited" },
            { code: "PTTEP", name: "PTT Exploration and Production Public Company Limited" },
            { code: "KCE", name: "KCE Electronics Public Company Limited" },
            { code: "SCC", name: "The Siam Cement Public Company Limited" },
            { code: "TISCO", name: "Tisco Financial Group Public Company Limited" },
            { code: "AP", name: "AP (Thailand) Public Company Limited" },
          ],
        },
        MAI: {
          name: "MAI Market",
          symbols: [
            { code: "HEMP", name: "Natural Park Public Company Limited" },
            { code: "LPN", name: "LPN Development Public Company Limited" },
            { code: "SPVI", name: "SPI Spirits Public Company Limited" },
            { code: "SMT", name: "SMT Corporation Public Company Limited" },
            { code: "PRINC", name: "Principal Capital Public Company Limited" },
          ],
        },
        US: {
          name: "US Stock Market (US)",
          symbols: [
            { code: "AAPL", name: "Apple Inc." },
            { code: "GOOGL", name: "Alphabet Inc." },
            { code: "MSFT", name: "Microsoft Corporation" },
            { code: "AMZN", name: "Amazon.com Inc." },
            { code: "TSLA", name: "Tesla Inc." },
            { code: "NVDA", name: "NVIDIA Corporation" },
            { code: "META", name: "Meta Platforms Inc." },
            { code: "NFLX", name: "Netflix Inc." },
          ],
        },
      };
      
      const marketKeys = Object.keys(marketsData);
      const randomMarketKey =
        marketKeys[Math.floor(Math.random() * marketKeys.length)];
      const market = randomMarketKey;
      const symbolsList = marketsData[market].symbols;
      const randomSymbol =
        symbolsList[Math.floor(Math.random() * symbolsList.length)];
      const period = getRandomTimePeriod(randomSymbol.code);
      const startDate = period.start; // รูปแบบ YYYY-MM-DD

      const roomSettings = {
        market,
        symbol: randomSymbol.code,
        startDate,
        settings: {
          maxPlayers: maxPlayersRef.current,
          timeLimit: Number(maxTimeRef.current),
          startingBalance: 1000000
        },
      };

      console.log('🎯 Creating room with settings:', roomSettings);
      const result = await createRoom(roomSettings);
      
      // เก็บข้อมูลสำคัญไว้ใน localStorage เป็น fallback เมื่อได้ roomCode แล้ว
      if (result && result.success && result.roomCode) {
        localStorage.setItem(`room_${result.roomCode}_timeLimit`, maxTimeRef.current.toString());
        localStorage.setItem(`room_${result.roomCode}_symbol`, randomSymbol.code);
        localStorage.setItem(`room_${result.roomCode}_market`, market);
        localStorage.setItem(`room_${result.roomCode}_startDate`, startDate);
        console.log(`💾 Saved room settings for room ${result.roomCode}:`, {
          timeLimit: maxTimeRef.current,
          symbol: randomSymbol.code,
          market: market,
          startDate: startDate
        });
      }
      console.log('✅ Room creation result:', result);
      console.log('✅ Result details:', { 
        hasResult: !!result, 
        hasSuccess: result?.success, 
        hasRoomCode: !!result?.roomCode, 
        roomCode: result?.roomCode,
        fullResult: JSON.stringify(result, null, 2)
      });
      
      if (result && result.success && result.roomCode) {
        console.log('🚀 Navigating to waiting room:', result.roomCode);
        // ใช้ setTimeout เพื่อให้ state ได้ update ก่อน navigate
        setTimeout(() => {
          console.log('🔗 Actually navigating to:', `/waiting/${result.roomCode}`);
          navigate(`/waiting/${result.roomCode}`);
        }, 100);
      } else {
        console.error('❌ Invalid room creation result:', result);
        throw new Error(result?.error || 'Invalid room creation result: missing room code');
      }
    } catch (err) {
      console.error("❌ Error creating room:", err);
      let errorMessage = "Failed to create room";
      
      // แปลงข้อผิดพลาดเป็นภาษาไทยที่เข้าใจง่าย
      if (err.message?.includes('Not connected to server')) {
        errorMessage = "Not connected to the server. Please wait a moment and try again.";
      } else if (err.message?.includes('timeout')) {
        errorMessage = "Connection timed out. Please try again.";
      } else if (err.message?.includes('Missing or insufficient permissions')) {
        errorMessage = "Insufficient permissions to access the database. Please try again.";
      } else if (err.message?.includes('Network Error')) {
        errorMessage = "Network connection issue. Please check your internet.";
      } else if (err.message?.includes('Permission denied')) {
        errorMessage = "You are not authorized to create a room. Please log in again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [navigate, createRoom]); // เหลือแค่ dependencies ที่จำเป็นจริงๆ

  // Reset error when component unmounts
  useEffect(() => {
    return () => {
      setErrorMsg("");
      setLoading(false);
    };
  }, []);

  // Lock body scroll and ESC only when shown as modal (not embedded)
  useEffect(() => {
    if (!embedded) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onKeyDown = (e) => {
        if (e.key === "Escape") onCloseRef.current?.();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", onKeyDown);
      };
    }
  }, [embedded]); // ลบ onClose dependency

  const Card = (
    <div className={`relative w-full ${compact ? 'max-w-md' : 'max-w-lg'} mx-auto transform transition-all duration-300 scale-100 ${embedded ? '' : 'animate-modal-slide-up'} z-10`}>
        {/* Modern Dark Theme Card - Purple/Blue Theme */}
        <div 
          className={embedded 
            ? "bg-transparent" 
            : "bg-slate-900/95 backdrop-blur-lg border border-gray-600/30 rounded-2xl shadow-xl overflow-hidden"
          }
          onClick={(e) => embedded ? undefined : e.stopPropagation()}
        >
          {/* Header for non-embedded only */}
          {!embedded && (
            <div className={`bg-gradient-to-r from-purple-600 to-indigo-600 ${compact ? 'px-6 py-4' : 'px-8 py-6'}`}>
              <div className={'text-center ' + (compact ? 'mb-2' : 'mb-3')}>
                <FaCog className={`${compact ? 'text-2xl' : 'text-3xl'} text-white mx-auto mb-2`} />
              </div>
              
              <h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-white text-center mb-1`}>
                Create Room
              </h2>
              <p className={`text-purple-100 text-center ${compact ? 'text-xs' : 'text-sm'} opacity-90`}>
                Set up the room to start the competition
              </p>
            </div>
          )}

          {/* Content Section - Dark theme to match page */}
          <div className={embedded ? '' : (compact ? 'px-6 py-4 space-y-5' : 'px-8 py-6 space-y-6') + ' bg-slate-800/50'}>
            
            {/* Settings Layout */}
            <div className="space-y-6">
              
              {/* Max Players Setting */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-cyan-300 font-semibold text-base">
                  <div className="bg-purple-500/20 border border-purple-400/40 rounded-lg p-2.5 shadow-lg">
                    <FaUserAlt className="text-purple-400 text-sm" />
                  </div>
                  <span>Maximum Players</span>
                </label>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMaxPlayers((p) => Math.max(2, p - 1))}
                    className="w-12 h-12 rounded-xl bg-slate-700/80 hover:bg-slate-600/80 border border-purple-400/30 hover:border-purple-400/60 text-purple-300 hover:text-purple-200 text-lg font-bold transition-all duration-200 shadow-lg hover:shadow-purple-400/20"
                    aria-label="Reduce players"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={maxPlayers}
                    onChange={(e) =>
                      setMaxPlayers(
                        Math.max(2, Math.min(20, Number(e.target.value) || 2))
                      )
                    }
                    className="flex-1 px-4 py-3 bg-slate-700/60 text-white rounded-xl border border-slate-600/60 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-400/20 transition-all outline-none text-center font-bold text-lg shadow-lg backdrop-blur-sm"
                    placeholder="2-20"
                  />
                  <span className="text-cyan-300/80 font-medium text-sm">คน</span>
                  <button
                    type="button"
                    onClick={() => setMaxPlayers((p) => Math.min(20, p + 1))}
                    className="w-12 h-12 rounded-xl bg-slate-700/80 hover:bg-slate-600/80 border border-purple-400/30 hover:border-purple-400/60 text-purple-300 hover:text-purple-200 text-lg font-bold transition-all duration-200 shadow-lg hover:shadow-purple-400/20"
                    aria-label="Increase players"
                  >
                    +
                  </button>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-400 bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-600/40">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <strong>Minimum: 2 people</strong>
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <strong>Maximum: 20 people</strong>
                  </span>
                </div>
              </div>

              {/* Time Limit Setting */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-cyan-300 font-semibold text-base">
                  <div className="bg-purple-500/20 border border-purple-400/40 rounded-lg p-2.5 shadow-lg">
                    <FaRegClock className="text-purple-400 text-sm" />
                  </div>
                  <span>Time Limit</span>
                </label>
                
                <select
                  value={String(maxTime)}
                  onChange={(e) => setMaxTime(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-700/60 text-white rounded-xl border border-slate-600/60 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-400/20 transition-all outline-none font-bold shadow-lg backdrop-blur-sm"
                >
                  {[3, 5, 7, 10].map((minutes) => (
                    <option key={minutes} value={String(minutes)} className="bg-slate-800">
                      {minutes} minutes
                    </option>
                  ))}
                </select>

                {/* Quick time presets */}
                <div className="flex gap-2">
                  {[3,5,7,10].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMaxTime(t)}
                      className={
                        'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border ' +
                        (Number(maxTime) === t
                          ? 'bg-purple-500/30 border-purple-400/60 text-purple-200 shadow-lg shadow-purple-400/20'
                          : 'bg-slate-700/60 border-slate-600/60 text-gray-300 hover:bg-slate-600/60 hover:border-slate-500/60')
                      }
                    >
                      {t} minutes
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              {(errorMsg || multiplayerError) && (
                <div className="w-full py-3 px-4 rounded-xl bg-red-500/20 border border-red-400/40 text-red-300 text-sm font-medium shadow-lg">
                  ⚠️ {errorMsg || multiplayerError}
                </div>
              )}
              
              {/* Create Room Button */}
              <button
                className={
                  'w-full rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl hover:shadow-2xl border border-purple-400/50 hover:border-purple-300/60 ' +
                  (compact ? 'py-3.5 text-base' : 'py-4 text-lg') +
                  (loading ? ' animate-pulse' : '')
                }
                onClick={handleCreate}
                disabled={loading || !maxTime}
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Creating room...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🚀</span>
                    <span>Create Room</span>
                  </>
                )}
              </button>

              {/* Cancel Button - Only for non-embedded */}
              {!embedded && (
                <button
                  className="w-full py-3 rounded-xl text-gray-400 hover:text-gray-200 transition-all font-medium border border-slate-600/60 hover:border-slate-500/60 bg-slate-800/60 hover:bg-slate-700/60"
                  onClick={onClose}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return (
      <section className="py-6 sm:py-10 px-4 sm:px-6">
        <div className="flex justify-center">
          {Card}
        </div>
      </section>
    );
  }

  const modalRoot = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
  if (!modalRoot) return null;

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
      tabIndex={-1}
    >
      {Card}
    </div>,
    modalRoot
  );
}
