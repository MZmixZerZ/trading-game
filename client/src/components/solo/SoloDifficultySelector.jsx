/**
 * SoloDifficultySelector.jsx - Component เลือกระดับความยากในโหมดเดี่ยว
 * 
 * หน้าที่หลัก:
 * 1. แสดงรายการระดับความยาก (Easy, Medium, Hard, Expert)
 * 2. ตรวจสอบเงื่อนไขการปลดล็อคแต่ละระดับ
 * 3. แสดงข้อมูลรางวัลฉายาสำหรับแต่ละระดับ
 * 4. จัดการการเลือกระดับและส่งข้อมูลกลับไปยัง parent component
 * 
 * ระบบการปลดล็อค:
 * - Easy: ระดับเริ่มต้น
 * - Medium: ต้องผ่าน Easy  
 * - Hard: ต้องผ่าน Easy + Medium
 * - Expert: ต้องผ่านทุกระดับก่อนหน้า
 */

import React, { useState } from "react";
import { FaArrowLeft, FaPlay, FaClock, FaChartLine, FaFire, FaSkull } from "react-icons/fa";
import { getNicknameByLevel } from '../../constants/nicknames';

/**
 * DIFFICULTY_LEVELS - ข้อมูลระดับความยากทั้งหมด
 * แต่ละระดับจะมีการตั้งค่าที่แตกต่างกัน:
 * - เวลาในการเล่น (timeLimit)
 * - เป้าหมายกำไร (targetProfit) 
 * - ความถี่ของ Hints (hintFrequency)
 * - ความผันผวนของตลาด (volatility)
 * - หุ้นที่ใช้ (แบ่งเป็นกลุ่ม beginner/advanced)
 */
const DIFFICULTY_LEVELS = [
  {
    key: "easy",
    title: "🟢 Easy",
    subtitle: "Easy level",
    description: "Suitable for beginners",
    features: [
      // "💡 Hints ทุก 1 นาที",
      // "⏱️ เวลา 6 นาที", 
      // "🎯 เป้าหมาย: กำไร 3%",
      // "📊 แสดง indicators พื้นฐาน",
      // "🌊 ความผันผวนปานกลาง",
      // "🏪 ตลาด: SET (หุ้นไทย)"
    ],
    timeLimit: 5,
    targetProfit: 50000,
    hintFrequency: 60,
    volatility: "'Easy'",
    bgColor: "bg-gradient-to-br from-blue-600 to-blue-700",
    borderColor: "border-blue-400",
    icon: <FaClock size={32} />,
    difficulty: 1,
    requirements: "Beginner level",
    missions: [
      "💰 Make at least 5% profit (50,000 baht)"
    ]
  },
  {
    key: "medium",
    title: "🟡 Medium",
    subtitle: "Medium level",
    description: "For those with a foundation, seeking a challenge",
    features: [
      // "🎯 Target: Profit 5%",
      // "📈 Maximum Drawdown: 20%",
    ],
    timeLimit: 5,
    targetProfit: 100000,
    hintFrequency: 120,
    volatility: "Medium",
    bgColor: "bg-gradient-to-br from-yellow-600 to-orange-600",
    borderColor: "border-yellow-400",
    icon: <FaChartLine size={32} />,
    difficulty: 2,
    requirements: "Must pass Easy first.",
    missions: [
      "💰 Make at least 10% profit (100,000 baht).",
      "🛡️ Maximum Drawdown: 20%"
    ]
  },
  {
    key: "hard",
    title: "🔴 Hard",
    subtitle: "Hard level",
    description: "High challenge for those who are confident in themselves",
    features: [
      // "⚠️ Hints เฉพาะเมื่อผิดพลาดใหญ่",
      // "⏱️ เวลา 3 นาที",
      // "🎯 เป้าหมาย: กำไร 8%",
      // "🌪️ ความผันผวนมาก",
      // "💀 ข้อมูลจำกัด",
      // "🏪 ตลาด: TFEX (อนุพันธ์)"
    ],
    timeLimit: 5,
    targetProfit: 200000,
    hintFrequency: 300,
    volatility: "High",
    bgColor: "bg-gradient-to-br from-red-600 to-red-700",
    borderColor: "border-red-400",
    icon: <FaFire size={32} />,
    difficulty: 3,
    requirements: "Must pass Easy + Medium first.",
    missions: [
      "💰 Make at least 20% profit (200,000 baht)",
      "🛡️ Maximum Drawdown: 10% "
    ]
  },
  {
    key: "expert",
    title: "⚫ Expert",
    subtitle: "Expert level",
    description: "For pros only. Extreme challenge",
    features: [
      // "🚫 ไม่มี Hints",
      // "⏱️ เวลา 2 นาที",
      // "🎯 เป้าหมาย: กำไร 12%",
      // "🌋 ความผันผวนสุดโต่ง",
      // "👁️ ข้อมูลแค่ราคา",
      // "🏪 ตลาด: TFEX (อนุพันธ์)"
    ],
    timeLimit: 5,
    targetProfit: 300000,
    hintFrequency: 0,
    volatility: "Extreme",
    bgColor: "bg-gradient-to-br from-gray-800 to-black",
    borderColor: "border-gray-600",
    icon: <FaSkull size={32} />,
    difficulty: 4,
    requirements: "Must pass all previous levels",
    missions: [
      "💰 Make at least 30% profit (300,000 baht)",
      "🛡️ Maximum Drawdown: 5% "
    ]
  }
];

/**
 * SoloDifficultySelector Component - หน้าจอเลือกระดับความยาก
 * 
 * Props:
 * @param {Function} onBack - ฟังก์ชันสำหรับกลับไปหน้าก่อนหน้า
 * @param {Function} onSelectDifficulty - ฟังก์ชันสำหรับเลือกระดับความยาก
 * @param {Array} unlockedLevels - รายการระดับที่ปลดล็อคแล้ว
 * @param {Array} completedLevels - รายการระดับที่ผ่านแล้ว
 */
export default function SoloDifficultySelector({ onBack, onSelectDifficulty, unlockedLevels = ['easy'], completedLevels = [], onRefresh }) {
  // ========== State Variables - ตัวแปรสถานะ ==========
  
  /** @type {Object|null} ระดับความยากที่เลือก */
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  
  /** @type {string|null} ระดับที่กำลัง hover */
  const [hoveredLevel, setHoveredLevel] = useState(null);

  // ========== Event Handlers - ฟังก์ชันจัดการเหตุการณ์ ==========
  
  /**
   * ฟังก์ชันเริ่มการท้าทาย
   * ตรวจสอบว่าได้เลือกระดับแล้วหรือไม่ก่อนส่งข้อมูลไป parent
   */
  const handleStartChallenge = () => {
    if (selectedDifficulty) {
      onSelectDifficulty(selectedDifficulty.key); // ส่งแค่ key แทนที่จะส่ง object ทั้งหมด
    } else {
      alert("Please select the difficulty level first.");
    }
  };

  /**
   * ฟังก์ชันตรวจสอบว่าระดับนั้นปลดล็อคหรือไม่
   * ใช้ระบบการปลดล็อคแบบ Firebase-based progression
   * 
   * @param {string} levelKey - key ของระดับที่ต้องการตรวจสอบ
   * @returns {boolean} - true ถ้าปลดล็อคแล้ว, false ถ้ายังล็อคอยู่
   */
  const isLevelUnlocked = (levelKey) => {
    // Easy ปลดล็อคเสมอ
    if (levelKey === 'easy') {
      return true;
    }
    
    // เงื่อนไขการปลดล็อคตามลำดับ: ต้องผ่านระดับก่อนหน้าทั้งหมด
    const levelOrder = ['easy', 'medium', 'hard', 'expert'];
    const currentIndex = levelOrder.indexOf(levelKey);
    
    if (currentIndex <= 0) {
      // Easy หรือไม่พบในลำดับ
      return levelKey === 'easy';
    }
    
    // ตรวจสอบว่าผ่านระดับก่อนหน้าแล้วหรือไม่
    const previousLevel = levelOrder[currentIndex - 1];
    const hasPreviousLevel = completedLevels && completedLevels.includes(previousLevel);
    
    // แสดง debug log เมื่อระดับถูกล็อค
    if (!hasPreviousLevel && process.env.NODE_ENV === 'development') {
      console.log(`🔒 Level "${levelKey}" is locked. Need to complete "${previousLevel}" first.`);
      console.log(`🔍 Current completedLevels:`, completedLevels);
      console.log(`🔍 Required previousLevel: "${previousLevel}"`);
    }
    
    return hasPreviousLevel;
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto overflow-y-auto max-h-[80vh] px-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          🎯 Choose difficulty level
        </h1>
        <p className="text-lg md:text-xl text-gray-300">
          Choose a level that suits your skills
        </p>
        
        {/* Refresh Button */}
        {onRefresh && (
          <div className="mt-4">
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all text-sm"
            >
              🔄 Refresh data
            </button>
          </div>
        )}
      </div>

      {/* Difficulty Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 md:gap-6 mb-6">
        {DIFFICULTY_LEVELS.map((level) => {
          const isUnlocked = isLevelUnlocked(level.key);
          const isClickable = isUnlocked;
          
          return (
            <div
              key={level.key}
              className={`
                relative rounded-2xl border-2 p-4 md:p-6 transition-all duration-300 transform
                ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                ${selectedDifficulty?.key === level.key && isUnlocked
                  ? `${level.borderColor} scale-105 shadow-2xl` 
                  : isUnlocked
                    ? 'border-gray-600 hover:border-gray-400 hover:scale-102'
                    : 'border-red-600'
                }
                ${hoveredLevel === level.key && isUnlocked ? 'shadow-xl' : 'shadow-lg'}
                ${level.bgColor}
                ${!isUnlocked ? 'grayscale' : ''}
              `}
              onClick={() => isClickable && setSelectedDifficulty(level)}
              onMouseEnter={() => isUnlocked && setHoveredLevel(level.key)}
              onMouseLeave={() => setHoveredLevel(null)}
            >
              {/* Lock/Unlock Indicator */}
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center z-10">
                {isUnlocked ? (
                  selectedDifficulty?.key === level.key && (
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">✓</span>
                    </div>
                  )
                ) : (
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🔒</span>
                  </div>
                )}
              </div>

              {/* Header */}
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="text-white flex-shrink-0">{level.icon}</div>
                <div className="min-w-0">
                  <h3 className="text-xl md:text-2xl font-bold text-white truncate">{level.title}</h3>
                  <p className="text-gray-200 text-xs md:text-sm">{level.subtitle}</p>
                </div>
              </div>

              {/* Lock Message */}
              {!isUnlocked && (
                <div className="bg-red-600/20 border border-red-500 rounded-lg p-3 mb-4">
                  <p className="text-red-200 text-sm font-bold text-center">
                    🔒 ระดับถูกล็อค
                  </p>
                  <p className="text-red-300 text-xs text-center mt-1">
                    {(() => {
                      const levelOrder = ['easy', 'medium', 'hard', 'expert'];
                      const currentIndex = levelOrder.indexOf(level.key);
                      
                      if (!unlockedLevels.includes(level.key)) {
                        return `เงื่อนไข: ${level.requirements}`;
                      }
                      
                      if (currentIndex > 0) {
                        const previousLevel = levelOrder[currentIndex - 1];
                        const levelNames = {
                          'easy': 'Easy',
                          'medium': 'Medium', 
                          'hard': 'Hard',
                          'expert': 'Expert'
                        };
                        return `ต้องผ่านระดับ ${levelNames[previousLevel]} ก่อน`;
                      }
                      
                      return `เงื่อนไข: ${level.requirements}`;
                    })()}
                  </p>
                </div>
              )}

              {/* Description */}
              <p className="text-gray-100 mb-3 md:mb-4 text-xs md:text-sm leading-relaxed">
                {level.description}
              </p>

              {/* Features */}
              <div className="space-y-1 md:space-y-2 mb-3">
                {level.features.map((feature, index) => (
                  <div key={`feature-${index}-${feature.slice(0, 15)}`} className="flex items-center text-xs md:text-sm text-gray-100">
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Missions */}
              <div className="bg-black/30 rounded-lg p-3 mb-2">
                <h4 className="text-yellow-400 font-bold text-sm mb-2">🎯 Missions:</h4>
                <div className="space-y-1">
                  {(level.missions || []).map((mission, index) => (
                    <div key={`mission-${index}-${mission.slice(0, 15)}`} className="flex items-start text-xs text-gray-200">
                      <span className="mr-1 text-yellow-400">•</span>
                      <span>{mission}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/20">
                <div className="grid grid-cols-2 gap-1 md:gap-2 text-xs text-gray-200">
                  <div>⏱️ {level.timeLimit} minutes</div>
                  <div>🎯 {level.targetProfit.toLocaleString()} Baht</div>
                  <div>🌊 {level.volatility}</div>
                  <div>⭐ Level {level.difficulty}</div>
                </div>
                
                {/* Nickname Reward */}
                {(() => {
                  const levelNickname = getNicknameByLevel(level.key);
                  const isCompleted = completedLevels.includes(level.key);
                  
                  if (levelNickname) {
                    return (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className={`flex items-center gap-2 text-xs ${isCompleted ? 'text-yellow-400' : 'text-gray-400'}`}>
                          <span>{levelNickname.icon}</span>
                          <span>
                            {isCompleted ? '✅ Reward:' : '🏆 Nickname Award:'} {levelNickname.nickname}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Info & Actions - Fixed at bottom */}
      {selectedDifficulty && isLevelUnlocked(selectedDifficulty.key) && (
        <div className="sticky bottom-0 bg-[#232733] rounded-2xl p-4 md:p-6 border border-gray-600 shadow-2xl mt-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4 flex-1">
              <div className="text-2xl md:text-3xl flex-shrink-0">{selectedDifficulty.icon}</div>
              <div className="min-w-0">
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  {selectedDifficulty.title}
                </h3>
                <p className="text-gray-300 text-sm md:text-base">{selectedDifficulty.description}</p>
              </div>
            </div>
            <div className="flex gap-3 md:gap-4 w-full md:w-auto">
              <button
                className="flex-1 md:flex-none px-4 md:px-6 py-2 md:py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-xl transition-all text-sm md:text-base"
                onClick={onBack}
              >
                <FaArrowLeft className="inline mr-2" />
                Back
              </button>
              <button
                className="flex-1 md:flex-none px-6 md:px-8 py-2 md:py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all text-base md:text-lg shadow-lg"
                onClick={handleStartChallenge}
              >
                <FaPlay className="inline mr-2" />
                Start Challenge!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
