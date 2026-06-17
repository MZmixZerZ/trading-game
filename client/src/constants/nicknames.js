/**
 * nicknames.js - ระบบฉายา/นิคเนมสำหรับผู้เล่น
 * 
 * หน้าที่หลัก:
 * 1. กำหนดฉายาที่ได้รับเมื่อผ่านแต่ละระดับความยาก
 * 2. มีระบบ rarity (ความหายาก) สำหรับแต่ละฉายา
 * 3. มีฟังก์ชันช่วยในการจัดการฉายา
 * 
 * ระบบ Rarity:
 * - common: ฉายาธรรมดา (tutorial, easy)
 * - uncommon: ฉายาไม่ธรรมดา (medium)  
 * - rare: ฉายาหายาก (hard)
 * - legendary: ฉายาระดับตำนาน (expert)
 */

/**
 * DIFFICULTY_NICKNAMES - ข้อมูลฉายาสำหรับแต่ละระดับความยาก
 * 
 * โครงสร้างข้อมูล:
 * - id: รหัสระดับความยาก
 * - nickname: ชื่อฉายาภาษาไทย
 * - englishName: ชื่อฉายาภาษาอังกฤษ
 * - icon: ไอคอนแทนฉายา
 * - color: สีประจำฉายา (สำหรับการแสดงผล)
 * - description: คำอธิบายฉายา
 * - rarity: ระดับความหายาก
 */
export const DIFFICULTY_NICKNAMES = {
  tutorial: {
    id: 'tutorial',
    nickname: 'Gamer',
    englishName: 'Student Trainee',
    icon: '🎓',
    color: 'green',
    description: 'Basic game players',
    rarity: 'common'
  },
  easy: {
    id: 'easy',
    nickname: 'Novice Investor',
    englishName: 'Novice Investor',
    icon: '📈',
    color: 'blue',
    description: 'Beginner in the investment industry',
    rarity: 'common'
  },
  medium: {
    id: 'medium',
    nickname: 'Market Analyst',
    englishName: 'Market Analyst',
    icon: '📊',
    color: 'yellow',
    description: 'Expert in market analysis',
    rarity: 'uncommon'
  },
  hard: {
    id: 'hard',
    nickname: 'Profit Speculator',
    englishName: 'Profit Speculator',
    icon: '🎯',
    color: 'orange',
    description: 'Expert in profit speculation',
    rarity: 'rare'
  },
  expert: {
    id: 'expert',
    nickname: 'Market Master',
    englishName: 'Market Master',
    icon: '👑',
    color: 'purple',
    description: 'Top Expert in Trading',
    rarity: 'legendary'
  }
};

// ========== Helper Functions - ฟังก์ชันช่วยเหลือ ==========

/**
 * ฟังก์ชันดึงข้อมูลฉายาจาก level ID
 * @param {string} levelId - รหัสระดับความยาก (tutorial, easy, medium, hard, expert)
 * @returns {Object|null} - ข้อมูลฉายา หรือ null ถ้าไม่พบ
 */
export const getNicknameByLevel = (levelId) => {
  return DIFFICULTY_NICKNAMES[levelId] || null;
};

/**
 * ฟังก์ชันดึงฉายาระดับสูงสุดจากรายการระดับที่ผ่านแล้ว
 * ใช้สำหรับแสดงฉายาปัจจุบันของผู้เล่น
 * 
 * @param {Array} completedLevels - รายการระดับที่ผ่านแล้ว
 * @returns {Object|null} - ข้อมูลฉายาระดับสูงสุด หรือ null ถ้าไม่มี
 */
export const getHighestNickname = (completedLevels = []) => {
  const levelOrder = ['tutorial', 'easy', 'medium', 'hard', 'expert'];
  
  // หาระดับสูงสุดที่ผ่านแล้ว (เริ่มจากระดับสูงสุดลงมา)
  let highestLevel = null;
  for (let i = levelOrder.length - 1; i >= 0; i--) {
    if (completedLevels.includes(levelOrder[i])) {
      highestLevel = levelOrder[i];
      break;
    }
  }
  
  return highestLevel ? DIFFICULTY_NICKNAMES[highestLevel] : null;
};

/**
 * ฟังก์ชันดึงฉายาทั้งหมดที่ได้รับแล้ว
 * ใช้สำหรับแสดงในหน้า Collection หรือ Achievement
 * 
 * @param {Array} completedLevels - รายการระดับที่ผ่านแล้ว
 * @returns {Array} - รายการข้อมูลฉายาทั้งหมดที่ได้รับ
 */
export const getAllEarnedNicknames = (completedLevels = []) => {
  return completedLevels.map(levelId => DIFFICULTY_NICKNAMES[levelId]).filter(Boolean);
};

// ========== Rarity Styling - การจัดรูปแบบตามความหายาก ==========

/**
 * สีและรูปแบบสำหรับแต่ละระดับความหายาก
 * ใช้สำหรับการแสดงผลฉายาในหน้าต่างๆ
 */
export const RARITY_COLORS = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400', 
  epic: 'text-purple-400',
  legendary: 'text-yellow-400'
};

// กรอบสีสำหรับแต่ละระดับความหายาก
export const RARITY_BORDERS = {
  common: 'border-gray-400',
  uncommon: 'border-green-400', 
  rare: 'border-blue-400',
  epic: 'border-purple-400',
  legendary: 'border-yellow-400'
};

// พื้นหลังสำหรับแต่ละระดับความหายาก
export const RARITY_BACKGROUNDS = {
  common: 'bg-gray-600/20',
  uncommon: 'bg-green-600/20',
  rare: 'bg-blue-600/20', 
  epic: 'bg-purple-600/20',
  legendary: 'bg-yellow-600/20'
};
