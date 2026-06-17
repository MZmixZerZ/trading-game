import React, { useState, useEffect } from 'react';
import SoloTradingChart from '../solo/SoloTradingChart.jsx';
import LimitOrderPanel from '../trading/LimitOrderPanel.jsx';

const TutorialPretestSystem = ({ 
  tutorialData, 
  onComplete, 
  onTutorialComplete,
  onBack,
  balance: initialBalance,
  timeLimit = 300
}) => {
  // States
  const [balance, setBalance] = useState(initialBalance || 1000000);
  const [position, setPosition] = useState(0);
  const [entryPrice, setEntryPrice] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [remainingTime, setRemainingTime] = useState(timeLimit);
  const [buyQuantity, setBuyQuantity] = useState(100);
  const [sellQuantity, setSellQuantity] = useState(100);
  const [limitOrders, setLimitOrders] = useState([]);
  const [nextOrderId, setNextOrderId] = useState(1);
  const [levelComplete, setLevelComplete] = useState(false);
  const [showEndPanel, setShowEndPanel] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showInstructionPopup, setShowInstructionPopup] = useState(true);

  // Tutorial Steps
  const TUTORIAL_STEPS = [
    {
      target: 'chart-panel',
      title: '📈 กราฟการเทรด',
      content: 'นี่คือกราฟแสดงราคาหุ้น PTT แบบเรียลไทม์\nคุณสามารถดูการเคลื่อนไหวของราคาและปรับความเร็วได้',
      position: 'bottom'
    },
    {
      target: 'speed-controls',
      title: '⚡ ควบคุมความเร็ว',
      content: 'ปรับความเร็วการเล่นกราฟ 1x, 2x หรือ 5x\nและหยุด/เล่น ตามต้องการ',
      position: 'left'
    },
    {
      target: 'balance-display',
      title: '💰 ยอดเงินและพอร์ต',
      content: 'ติดตามยอดเงิน จำนวนหุ้นที่ถือ\nและกำไร/ขาดทุนแบบเรียลไทม์',
      position: 'left'
    },
    {
      target: 'buy-section',
      title: '🛒 การซื้อหุ้น',
      content: 'ปรับจำนวนหุ้นที่ต้องการซื้อ\nกดซื้อ หรือซื้อสูงสุดได้เลย',
      position: 'left'
    },
    {
      target: 'sell-section',
      title: '💸 การขายหุ้น',
      content: 'ปรับจำนวนหุ้นที่ต้องการขาย\nกดขาย หรือขายทั้งหมดได้เลย',
      position: 'left'
    },
    {
      target: 'limit-orders',
      title: '📋 คำสั่งซื้อขาย Limit',
      content: 'ตั้งคำสั่งซื้อ/ขายล่วงหน้า\nระบุราคาที่ต้องการได้',
      position: 'left'
    },
    {
      target: 'stats-panel',
      title: '📊 สถิติผลงาน',
      content: 'ดูสถิติการเทรดของคุณ\nมูลค่ารวม กำไร/ขาดทุน และเวลาที่เหลือ',
      position: 'top'
    }
  ];

  // Timer effect
  useEffect(() => {
    let interval;
    if (remainingTime > 0 && isPlaying && !levelComplete) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            setIsPlaying(false);
            setLevelComplete(true);
            setShowEndPanel(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [remainingTime, isPlaying, levelComplete]);

  // Functions
  const handleNextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowInstructionPopup(false);
      setShowEndPanel(true);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipTutorial = () => {
    setShowInstructionPopup(false);
    setShowEndPanel(true);
  };

  const handleGoToQuiz = () => {
    console.log('handleGoToQuiz called', { onComplete, onTutorialComplete });
    
    // ลองใช้ onTutorialComplete ก่อน ถ้าไม่มีใช้ onComplete
    const completeHandler = onTutorialComplete || onComplete;
    
    if (completeHandler) {
      // ส่งผลลัพธ์ที่จำเป็นสำหรับ Quiz
      completeHandler(
        ['easy', 'medium'], // unlockedLevels  
        'easy' // recommendedStartLevel
      );
    } else {
      console.error('No completion handler provided');
      // Fallback: navigate manually
      try {
        window.location.href = '/quiz';
      } catch (error) {
        alert('ไม่สามารถนำทางไปหน้า Quiz ได้ กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

  // Helper function to get highlight class
  const getHighlightClass = (targetId) => {
    if (!showInstructionPopup) return '';
    const currentInstruction = TUTORIAL_STEPS[currentStep];
    return currentInstruction.target === targetId ? 'ring-4 ring-blue-400 ring-opacity-75 shadow-lg shadow-blue-400/50 relative z-40' : '';
  };

  // Trading functions
  const handleBuy = (quantity) => {
    const cost = quantity * currentPrice;
    if (cost <= balance && quantity > 0) {
      setBalance(prev => prev - cost);
      if (position === 0) {
        setEntryPrice(currentPrice);
      } else {
        setEntryPrice((entryPrice * position + currentPrice * quantity) / (position + quantity));
      }
      setPosition(prev => prev + quantity);
    }
  };

  const handleSell = (quantity) => {
    if (quantity <= position && quantity > 0) {
      const revenue = quantity * currentPrice;
      setBalance(prev => prev + revenue);
      setPosition(prev => prev - quantity);
      if (position - quantity === 0) {
        setEntryPrice(0);
      }
    }
  };

  const adjustBuyQuantity = (change) => {
    setBuyQuantity(prev => Math.max(0, Math.min(getMaxBuyQuantity(), prev + change)));
  };

  const adjustSellQuantity = (change) => {
    setSellQuantity(prev => Math.max(0, Math.min(position, prev + change)));
  };

  const getMaxBuyQuantity = () => {
    return currentPrice > 0 ? Math.floor(balance / currentPrice) : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      {/* Header */}
      <div className="relative z-10 flex justify-between items-center p-4 bg-gradient-to-r from-slate-900/90 via-blue-900/80 to-purple-900/90 backdrop-blur-xl border-b border-gray-600/30">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-slate-300 hover:text-white transition-colors p-2 hover:bg-slate-600/30 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Tutorial Trading</h1>
            <p className="text-slate-400 text-sm">Learn trading step by step</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-emerald-400 text-sm font-medium">Balance</div>
          <div className="text-white text-xl font-bold">{(balance/1000000).toFixed(1)}M THB</div>
        </div>
      </div>

      {/* Main Content - exactly like Solo */}
      <div className="relative z-10 container mx-auto px-4 pt-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-120px)]">
          {/* Left Column - Chart takes most space (3/4) */}
          <div className="lg:col-span-3 space-y-4 h-full">
            {/* Trading Chart - Full Height */}
            <div className={`bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-xl border border-emerald-500/20 rounded-xl overflow-hidden h-[70vh] shadow-2xl shadow-emerald-500/10 transition-all ${getHighlightClass('chart-panel')}`} id="chart-panel">
              <div className="bg-gradient-to-r from-emerald-600/10 to-blue-600/10 px-4 py-3 border-b border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-white">PTT</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-300">ตลาดหลักทรัพย์แห่งประเทศไทย (SET)</span>
                        <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-md">Tutorial</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      ฿{currentPrice > 0 ? currentPrice.toFixed(2) : '0.00'}
                    </div>
                    <div className="text-xs text-emerald-400">THB</div>
                  </div>
                </div>
              </div>
              <div className="h-[calc(100%-60px)]">
                <SoloTradingChart
                  market="SET"
                  symbol="PTT"
                  playbackTime={0}
                  onDataLoaded={() => {}}
                  onCurrentPrice={setCurrentPrice}
                  timeLimit={300}
                  isActive={!levelComplete && isPlaying}
                  autoPlay={isPlaying}
                  maxVisibleBars={200}
                  isInteractive={true}
                  enableZoom={true}
                  enablePan={true}
                  playbackSpeed={playbackSpeed}
                  onPlaybackSpeedChange={setPlaybackSpeed}
                  isPaused={!isPlaying}
                  onPlayingChange={setIsPlaying}
                />
              </div>
            </div>

            {/* Bottom Stats Panel */}
            <div className={`bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-xl border border-purple-500/20 rounded-xl p-4 shadow-xl shadow-purple-500/10 h-[25vh] transition-all ${getHighlightClass('stats-panel')}`} id="stats-panel">
              <h3 className="text-white font-bold mb-3 text-lg">📊 Performance Stats</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Total Value</div>
                  <div className="text-lg font-bold text-emerald-400">
                    ฿{(balance + (position * currentPrice)).toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">P&L</div>
                  <div className={`text-lg font-bold ${(balance + (position * currentPrice) - 1000000) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(balance + (position * currentPrice) - 1000000) >= 0 ? '+' : ''}฿{(balance + (position * currentPrice) - 1000000).toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Holdings</div>
                  <div className="text-lg font-bold text-white">{position.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Time Left</div>
                  <div className={`text-lg font-bold font-mono ${
                    remainingTime <= 60 ? 'text-red-400' :
                    remainingTime <= 120 ? 'text-yellow-400' :
                    'text-emerald-400'
                  }`}>
                    {Math.floor(remainingTime / 60).toString().padStart(2, '0')}:
                    {(remainingTime % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Controls (1/4) */}
          <div className="lg:col-span-1 h-full">
            <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-purple-500/20 rounded-xl p-4 shadow-xl shadow-purple-500/10 h-full overflow-y-auto">
              {/* Balance Display */}
              <div className={`text-center mb-4 transition-all ${getHighlightClass('balance-display')}`} id="balance-display">
                <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Balance</div>
                <div className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  ฿{balance.toLocaleString()} THB
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Holdings: <span className="text-white font-semibold">{position.toLocaleString()}</span> shares
                </div>
                {position > 0 && (
                  <div className="mt-2 text-xs">
                    <div className="text-gray-400">Entry: ฿{entryPrice.toFixed(2)}</div>
                    <div className="text-gray-400">Current: ฿{currentPrice.toFixed(2)}</div>
                    <div className={`font-semibold ${(currentPrice - entryPrice) * position >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      P&L: {((currentPrice - entryPrice) * position >= 0 ? '+' : '')}฿{((currentPrice - entryPrice) * position).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Speed Controls */}
              <div className={`mb-4 transition-all ${getHighlightClass('speed-controls')}`} id="speed-controls">
                <div className="text-xs text-gray-400 mb-2 text-center uppercase tracking-wider">ความเร็ว</div>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 5].map(speed => (
                    <button 
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-all ${
                        playbackSpeed === speed 
                          ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400' 
                          : 'bg-gray-600/20 border-gray-500/40 text-gray-300 hover:bg-gray-600/30'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
                
                {/* Play/Pause Control */}
                <div className="flex justify-center mt-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-4 py-1 bg-blue-600/20 border border-blue-500/40 text-blue-400 rounded text-sm font-semibold hover:bg-blue-600/30 transition-all"
                  >
                    {isPlaying ? '⏸️ หยุด' : '▶️ เล่น'}
                  </button>
                </div>
              </div>

              {/* Trading Controls */}
              <div className="space-y-3">
                {/* Buy Section */}
                <div className={`transition-all ${getHighlightClass('buy-section')}`} id="buy-section">
                  <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider text-center">การซื้อ</div>
                  <div className="flex gap-1 mb-1">
                    <button 
                      onClick={() => adjustBuyQuantity(-100)}
                      className="w-7 h-7 flex items-center justify-center bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-400 rounded font-bold transition-all text-sm"
                      disabled={buyQuantity <= 0 || !isPlaying}
                    >
                      −
                    </button>
                    <input 
                      type="number" 
                      className="flex-1 bg-slate-800/50 border border-emerald-500/30 rounded text-center text-white font-bold py-1 px-1 text-xs outline-none focus:border-emerald-400 transition-all"
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={!isPlaying}
                      placeholder={`Max: ${getMaxBuyQuantity()}`}
                    />
                    <button 
                      onClick={() => adjustBuyQuantity(100)}
                      className="w-7 h-7 flex items-center justify-center bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-400 rounded font-bold transition-all text-sm"
                      disabled={buyQuantity >= getMaxBuyQuantity() || !isPlaying}
                    >
                      +
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button 
                      onClick={() => handleBuy(buyQuantity)}
                      disabled={!isPlaying || buyQuantity * currentPrice > balance}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-600 disabled:to-gray-700 text-white text-xs py-1.5 px-2 rounded font-bold transition-all duration-200 shadow-lg disabled:shadow-none"
                    >
                      ซื้อ
                    </button>
                    <button 
                      onClick={() => handleBuy(Math.floor(balance / currentPrice))}
                      disabled={!isPlaying || balance < currentPrice}
                      className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-xs py-1.5 px-2 rounded font-bold transition-all duration-200 shadow-lg disabled:shadow-none"
                    >
                      ซื้อสูงสุด
                    </button>
                  </div>
                </div>

                {/* Sell Section */}
                <div className={`transition-all ${getHighlightClass('sell-section')}`} id="sell-section">
                  <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider text-center">การขาย</div>
                  <div className="flex gap-1 mb-1">
                    <button 
                      onClick={() => adjustSellQuantity(-100)}
                      className="w-7 h-7 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-400 rounded font-bold transition-all text-sm"
                      disabled={sellQuantity <= 0 || !isPlaying}
                    >
                      −
                    </button>
                    <input 
                      type="number" 
                      className="flex-1 bg-slate-800/50 border border-red-500/30 rounded text-center text-white font-bold py-1 px-1 text-xs outline-none focus:border-red-400 transition-all"
                      value={sellQuantity}
                      onChange={(e) => setSellQuantity(Math.max(0, Math.min(position, parseInt(e.target.value) || 0)))}
                      disabled={!isPlaying}
                      placeholder={position > 0 ? `Max: ${position}` : '0'}
                    />
                    <button 
                      onClick={() => adjustSellQuantity(100)}
                      className="w-7 h-7 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-400 rounded font-bold transition-all text-sm"
                      disabled={sellQuantity >= position || !isPlaying}
                    >
                      +
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button 
                      onClick={() => handleSell(Math.min(sellQuantity, position))}
                      disabled={!isPlaying || sellQuantity === 0 || sellQuantity > position}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white text-xs py-1.5 px-2 rounded font-bold transition-all duration-200 shadow-lg disabled:shadow-none"
                    >
                      ขาย
                    </button>
                    <button 
                      onClick={() => handleSell(position)}
                      disabled={!isPlaying || position === 0}
                      className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-xs py-1.5 px-2 rounded font-bold transition-all duration-200 shadow-lg disabled:shadow-none"
                    >
                      ขายทั้งหมด
                    </button>
                  </div>
                </div>
              </div>

              {/* Limit Orders */}
              <div className={`mt-4 transition-all ${getHighlightClass('limit-orders')}`} id="limit-orders">
                <LimitOrderPanel
                  limitOrders={limitOrders}
                  onAddLimitOrder={(order) => {
                    const newOrder = { ...order, id: nextOrderId };
                    setLimitOrders([...limitOrders, newOrder]);
                    setNextOrderId(nextOrderId + 1);
                  }}
                  onRemoveLimitOrder={(orderId) => {
                    setLimitOrders(limitOrders.filter(order => order.id !== orderId));
                  }}
                  currentPrice={currentPrice}
                  balance={balance}
                  position={position}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instruction Popup */}
      {showInstructionPopup && (
        <div className="fixed inset-0 bg-black/10 z-50 flex items-center justify-center">
          <div className="absolute inset-0" onClick={(e) => e.stopPropagation()}>
            <div className="fixed bg-white/90 backdrop-blur-md border-2 border-blue-400/60 rounded-2xl p-6 shadow-2xl shadow-blue-500/30 max-w-md" 
                 style={{
                   top: '50%', 
                   left: '50%',
                   transform: 'translate(-50%, -50%)'
                 }}>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-lg">💡</span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {TUTORIAL_STEPS[currentStep].title}
                </h3>
                
                <div className="text-gray-600 mb-6 leading-relaxed whitespace-pre-line">
                  {TUTORIAL_STEPS[currentStep].content}
                </div>

                {/* Progress indicators */}
                <div className="flex justify-center gap-2 mb-4">
                  {TUTORIAL_STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStep 
                          ? 'bg-blue-500 w-6' 
                          : index < currentStep 
                            ? 'bg-green-500' 
                            : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2 justify-center">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrevStep}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all"
                    >
                      ← ก่อนหน้า
                    </button>
                  )}
                  
                  <button
                    onClick={handleNextStep}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all font-semibold"
                  >
                    {currentStep < TUTORIAL_STEPS.length - 1 ? 'ถัดไป →' : '📝 เตรียมพร้อม Quiz'}
                  </button>
                  
                  <button
                    onClick={handleSkipTutorial}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-all text-sm"
                  >
                    ข้าม
                  </button>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  ขั้นตอนที่ {currentStep + 1} จาก {TUTORIAL_STEPS.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Panel */}
      {showEndPanel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8 max-w-lg mx-4 shadow-2xl shadow-emerald-500/20">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl">🎓</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Tutorial เสร็จสิ้น!</h2>
              
              <p className="text-slate-300 mb-6 leading-relaxed">
                ยินดีด้วย! คุณได้เรียนรู้การใช้งานระบบเทรดครบทุกส่วนแล้ว<br/>
                ตอนนี้พร้อมที่จะทำ Quiz เพื่อทดสอบความรู้และทักษะการเทรด
              </p>

              {/* Quiz Info */}
              <div className="bg-blue-900/50 rounded-xl p-6 mb-6 border border-blue-500/30">
                <h3 className="text-lg font-semibold text-blue-300 mb-4">� เกี่ยวกับ Quiz</h3>
                <div className="text-left space-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">⭐</span>
                    <span>ทดสอบความรู้เรื่องการเทรดหุ้น</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">📊</span>
                    <span>ประเมินความเข้าใจในการอ่านกราฟ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">🎯</span>
                    <span>ทดสอบกลยุทธ์การซื้อขาย</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400">🏆</span>
                    <span>รับผลการประเมินและข้อเสนอแนะ</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleGoToQuiz();
                  }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/25 transform hover:scale-105"
                >
                  📝 เริ่มทำ Quiz
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onBack) {
                      onBack();
                    } else {
                      console.error('onBack function not provided');
                    }
                  }}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-2 px-6 rounded-xl transition-all duration-300"
                >
                  🏠 กลับหน้าหลัก
                </button>
              </div>

              <div className="mt-4 text-xs text-slate-400">
                💡 Quiz จะช่วยให้คุณทราบระดับความรู้และแนวทางการพัฒนาต่อไป
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorialPretestSystem;