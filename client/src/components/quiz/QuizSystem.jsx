/**
 * QuizSystem.jsx - ระบบ Quiz สำหรับทดสอบความรู้การลงทุน
 * 
 * Features:
 * - คำถามแบบ Multiple Choice และ Short Answer
 * - ระบบ Hearts (3 ใจ หมดแล้วจบ)
 * - Timer แสดงเวลาที่ใช้
 * - ระดับความยาก (Easy, Medium, Hard, Expert)
 */

import React, { useState, useEffect } from 'react';
import { FaHeart, FaClock, FaCheck, FaTimes, FaTrophy } from 'react-icons/fa';
import '../EnhancedPanelStyles.css';

// ข้อมูลคำถาม Quiz
const QUIZ_QUESTIONS = [
  // Easy Level - คำถามพื้นฐานการลงทุน
  {
    id: 1,
    level: 'easy',
    type: 'short',
    question: 'หุ้นคืออะไร?',
    correct: 'สิทธิความเป็นเจ้าของธุรกิจ',
    alternativeAnswers: [
      'สิทธิความเป็นเจ้าของในธุรกิจ',
      'สิทธิเป็นเจ้าของธุรกิจ',
      'ความเป็นเจ้าของธุรกิจ',
      'สิทธิความเป็นเจ้าของบริษัท',
      'สิทธิความเป็นเจ้าของในบริษัท'
    ],
    explanation: 'หุ้นคือสิทธิความเป็นเจ้าของธุรกิจ ทำให้ผู้ถือหุ้นมีสิทธิในผลกำไรและการตัดสินใจของบริษัท'
  },
  {
    id: 2,
    level: 'easy',
    type: 'short',
    question: 'ก่อนเริ่มลงทุน ควรชำระหนี้ประเภทใดให้หมดก่อน?',
    correct: 'หนี้ดอกเบี้ยสูง',
    alternativeAnswers: [
      'หนี้บัตรเครดิต',
      'หนี้ดอกเบี้ยสูง หนี้บัตรเครดิต',
      'หนี้บัตรเครดิต หนี้ดอกเบี้ยสูง',
      'หนี้ที่มีดอกเบี้ยสูง',
      'หนี้ดอกเบี้ยสูง / หนี้บัตรเครดิต'
    ],
    explanation: 'หนี้ดอกเบี้ยสูง เช่น หนี้บัตรเครดิต ควรชำระให้หมดก่อน เพราะดอกเบี้ยสูงกว่าผลตอบแทนจากการลงทุนส่วนใหญ่'
  },
  {
    id: 3,
    level: 'easy',
    type: 'short',
    question: 'เงินสำรองฉุกเฉินควรมีจำนวนเท่ากับกี่เดือนของเงินเดือน?',
    correct: '3-6 เดือน',
    alternativeAnswers: [
      '3 ถึง 6 เดือน',
      '3-6เดือน',
      '3 - 6 เดือน',
      'สาม ถึง หก เดือน',
      '3 หรือ 6 เดือน'
    ],
    explanation: 'เงินสำรองฉุกเฉินควรมี 3-6 เดือนของค่าใช้จ่าย เพื่อรองรับเหตุการณ์ไม่คาดคิด เช่น การว่างงาน'
  },
  {
    id: 4,
    level: 'easy',
    type: 'short',
    question: 'เงินที่นำมาลงทุนในหุ้นควรเป็นเงินลักษณะใด?',
    correct: 'เงินเย็น',
    alternativeAnswers: [
      'เงินเย็น',
      'เงินที่ไม่ต้องใช้',
      'เงินที่ไม่จำเป็นต้องใช้',
      'เงินส่วนเกิน',
      'เงินที่สูญเสียแล้วไม่เสียหาย'
    ],
    explanation: 'เงินเย็น คือเงินที่ไม่ต้องใช้ในระยะเวลาอันใกล้ และสูญเสียไปแล้วไม่กระทบต่อการใช้ชีวิต'
  },
  {
    id: 5,
    level: 'easy',
    type: 'short',
    question: 'P/E Ratio หมายถึงอะไร?',
    correct: 'ราคาหุ้น ÷ กำไรต่อหุ้น',
    alternativeAnswers: [
      'ราคาหุ้นหารกำไรต่อหุ้น',
      'ราคาหุ้น/กำไรต่อหุ้น',
      'ราคาหุ้น หาร กำไรต่อหุ้น',
      'ราคาหุ้น ต่อ กำไรต่อหุ้น',
      'Price to Earnings Ratio'
    ],
    explanation: 'P/E Ratio = ราคาหุ้น ÷ กำไรต่อหุ้น ใช้วัดว่าหุ้นแพงหรือถูกเมื่อเทียบกับกำไรที่บริษัททำได้'
  },
  
  // Medium Level - 5 คำถาม
  {
    id: 6,
    level: 'medium',
    type: 'short',
    question: 'นักลงทุนประเภทใดที่เน้นการลงทุนระยะยาวและมองหุ้นเหมือนการเป็นเจ้าของธุรกิจ?',
    correct: 'นักลงทุนเน้นคุณค่า',
    alternativeAnswers: [
      'Value Investor',
      'นักลงทุนเน้นคุณค่า / Value Investor',
      'Value investor',
      'value investor',
      'นักลงทุนแบบคุณค่า',
      'นักลงทุนประเภทคุณค่า'
    ],
    explanation: 'นักลงทุนเน้นคุณค่า (Value Investor) เน้นการลงทุนระยะยาวโดยมองหุ้นเหมือนการเป็นเจ้าของธุรกิจ และเลือกหุ้นที่มีราคาต่ำกว่าคุณค่าที่แท้จริง'
  },
  {
    id: 7,
    level: 'medium',
    type: 'short',
    question: 'นักลงทุนประเภทใดที่มุ่งเน้นผลตอบแทนจากเงินปันผลที่สม่ำเสมอ?',
    correct: 'นักลงทุนห่านทองคำ',
    alternativeAnswers: [
      'Yield Investor',
      'นักลงทุนห่านทองคำ / Yield Investor',
      'Yield investor',
      'yield investor',
      'นักลงทุนแบบห่านทองคำ',
      'นักลงทุนเน้นเงินปันผล'
    ],
    explanation: 'นักลงทุนห่านทองคำ (Yield Investor) มุ่งเน้นผลตอบแทนจากเงินปันผลที่สม่ำเสมอ เลือกหุ้นที่จ่ายปันผลสูงและมีเสถียรภาพ'
  },
  {
    id: 8,
    level: 'medium',
    type: 'short',
    question: 'นักลงทุนโมเมนตัมตัดสินใจลงทุนจากปัจจัยใด?',
    correct: 'สถานการณ์ตลาด',
    alternativeAnswers: [
      'เหตุการณ์เฉพาะหน้า',
      'สถานการณ์ตลาด / เหตุการณ์เฉพาะหน้า',
      'เหตุการณ์เฉพาะหน้า / สถานการณ์ตลาด',
      'ความเคลื่อนไหวของตลาด',
      'แนวโน้มตลาด',
      'โมเมนตัมของตลาด'
    ],
    explanation: 'นักลงทุนโมเมนตัม (Momentum Investor) ตัดสินใจลงทุนจากสถานการณ์ตลาดและเหตุการณ์เฉพาะหน้า โดยติดตามแนวโน้มและความเคลื่อนไหวของราคา'
  },
  {
    id: 9,
    level: 'medium',
    type: 'short',
    question: 'Circuit Breaker คือการหยุดซื้อขายเมื่อราคาพุ่งสูงเกิน ถูกหรือผิด?',
    correct: 'ผิด',
    alternativeAnswers: [
      'ผิด',
      'false',
      'False',
      'ไม่ถูกต้อง',
      'ไม่ใช่'
    ],
    explanation: 'ผิด - Circuit Breaker เป็นการหยุดซื้อขายชั่วคราวเมื่อราคาปรับตัวรุนแรงทั้งขึ้นและลง ไม่ใช่เฉพาะเมื่อราคาพุ่งสูงเกินเท่านั้น'
  },
  {
    id: 10,
    level: 'medium',
    type: 'short',
    question: 'Single Stock Futures อ้างอิงราคาหุ้นรายตัว ถูกหรือผิด?',
    correct: 'ถูก',
    alternativeAnswers: [
      'ถูก',
      'true',
      'True',
      'ถูกต้อง',
      'ใช่'
    ],
    explanation: 'ถูก - Single Stock Futures (SSF) เป็นสัญญาซื้อขายล่วงหน้าที่อ้างอิงราคาหุ้นรายตัวเป็นสินทรัพย์อ้างอิง'
  },
  
  // Hard Level - 5 คำถาม
  {
    id: 11,
    level: 'hard',
    type: 'short',
    question: 'เงินสำรองฉุกเฉินมีไว้เพื่อป้องกันไม่ให้นักลงทุนต้องทำอะไร?',
    correct: 'ขายหุ้นขาดทุน',
    alternativeAnswers: [
      'ขายหุ้นในขณะขาดทุน',
      'ขายหุ้นตอนขาดทุน',
      'ขายหุ้นเมื่อขาดทุน',
      'ขายหุ้นแบบขาดทุน',
      'การขายหุ้นขาดทุน',
      'ขายหุ้นด้วยขาดทุน'
    ],
    explanation: 'เงินสำรองฉุกเฉินช่วยป้องกันไม่ให้นักลงทุนต้องขายหุ้นขาดทุนเมื่อต้องการเงินเร่งด่วน ทำให้สามารถรอจังหวะที่เหมาะสมในการขายได้'
  },
  {
    id: 12,
    level: 'hard',
    type: 'short',
    question: 'คุณมีพอร์ต 200,000 บาท รับความเสี่ยงสูงสุด 2% ต่อการเทรด คุณจะเสี่ยงได้กี่บาทต่อครั้ง?',
    correct: '4,000 บาท',
    alternativeAnswers: [
      '4000 บาท',
      '4,000',
      '4000',
      'สี่พันบาท',
      '4,000บาท',
      '4000บาท'
    ],
    explanation: 'การคำนวณ: 200,000 × 2% = 4,000 บาท นี่คือหลักการจัดการความเสี่ยง (Risk Management) ที่สำคัญในการลงทุน'
  },
  {
    id: 13,
    level: 'hard',
    type: 'short',
    question: 'ลักษณะสำคัญ 2 ประการของบริษัทที่นักลงทุนห่านทองคำมักจะเลือกลงทุนคืออะไร?',
    correct: 'กำไรมั่นคง',
    alternativeAnswers: [
      'ปันผลสม่ำเสมอ',
      'กำไรมั่นคง / ปันผลสม่ำเสมอ',
      'ปันผลสม่ำเสมอ / กำไรมั่นคง',
      'กำไรมั่นคง และ ปันผลสม่ำเสมอ',
      'ปันผลสม่ำเสมอ และ กำไรมั่นคง',
      'กำไรคงที่ ปันผลสม่ำเสมอ'
    ],
    explanation: 'นักลงทุนห่านทองคำเลือกบริษัทที่มีกำไรมั่นคงและจ่ายปันผลสม่ำเสมอ เพื่อสร้างรายได้ที่ต่อเนื่องจากการลงทุน'
  },
  {
    id: 14,
    level: 'hard',
    type: 'short',
    question: 'การเก็งกำไรแบบนักลงทุนโมเมนตัมต้องอาศัยสิ่งใดจำนวนมาก?',
    correct: 'ความรู้',
    alternativeAnswers: [
      'ความรู้',
      'ข้อมูล',
      'ข้อมูลข่าวสาร',
      'ข่าวสาร',
      'การวิเคราะห์',
      'ข้อมูลตลาด'
    ],
    explanation: 'นักลงทุนโมเมนตัมต้องอาศัยความรู้จำนวนมากในการวิเคราะห์แนวโน้ม เพื่อจับจังหวะเข้า-ออกการลงทุนให้ทันต่อการเปลี่ยนแปลงของตลาด'
  },
  {
    id: 15,
    level: 'hard',
    type: 'short',
    question: 'Short Selling คือการขายหุ้นที่ไม่มีอยู่ในมือ ถูกหรือผิด?',
    correct: 'ถูก',
    alternativeAnswers: [
      'ถูก',
      'true',
      'True',
      'ถูกต้อง',
      'ใช่',
      'correct'
    ],
    explanation: 'ถูก - Short Selling คือการขายหุ้นที่ไม่มีอยู่ในมือโดยยืมมาขายก่อน โดยหวังว่าราคาจะลดลงแล้วซื้อคืนในราคาที่ต่ำกว่า'
  },
  
  // Expert Level - 5 คำถาม
  {
    id: 16,
    level: 'expert',
    type: 'short',
    question: 'ตามหลักการของ "เงินเย็น" การใช้เงินจากการลงทุนซื้อของฟุ่มเฟือยที่ไม่จำเป็นจะส่งผลเสียอย่างไร?',
    correct: 'ทำให้ต้องเริ่มต้นใหม่',
    alternativeAnswers: [
      'ทำให้ไม่ถึงอิสรภาพทางการเงิน',
      'ทำให้ต้องเริ่มต้นใหม่ / ทำให้ไม่ถึงอิสรภาพทางการเงิน',
      'ทำให้ไม่ถึงอิสรภาพทางการเงิน / ทำให้ต้องเริ่มต้นใหม่',
      'ต้องเริ่มต้นใหม่',
      'ไม่ถึงอิสรภาพทางการเงิน',
      'ทำลายแผนการลงทุนระยะยาว'
    ],
    explanation: 'การใช้เงินจากการลงทุนซื้อของฟุ่มเฟือยทำให้ต้องเริ่มต้นใหม่ และไม่ถึงอิสรภาพทางการเงิน เพราะทำลายผลประกอบของการลงทุนระยะยาว'
  },
  {
    id: 17,
    level: 'expert',
    type: 'short',
    question: 'การมีเงินสำรองฉุกเฉิน 3-6 เดือนของเงินเดือนสัมพันธ์กับเป้าหมายการลงทุนระยะยาวอย่างไร?',
    correct: 'ป้องกันการบังคับขายหุ้นในช่วงตลาดตกต่ำ',
    alternativeAnswers: [
      'รักษาโอกาสในการทำกำไรระยะยาว',
      'ป้องกันการบังคับขายหุ้นในช่วงตลาดตกต่ำ / รักษาโอกาสในการทำกำไรระยะยาว',
      'รักษาโอกาสในการทำกำไรระยะยาว / ป้องกันการบังคับขายหุ้นในช่วงตลาดตกต่ำ',
      'ป้องกันการขายหุ้นขาดทุน',
      'รักษาแผนการลงทุนระยะยาว',
      'ไม่ต้องขายหุ้นตอนตลาดตก'
    ],
    explanation: 'เงินสำรองฉุกเฉินป้องกันการบังคับขายหุ้นในช่วงตลาดตกต่ำ และรักษาโอกาสในการทำกำไรระยะยาว ทำให้สามารถรอจังหวะที่เหมาะสม'
  },
  {
    id: 18,
    level: 'expert',
    type: 'short',
    question: 'ระหว่างนักลงทุนเน้นคุณค่าและนักลงทุนห่านทองคำ นักลงทุนประเภทใดมีความเสี่ยงต่ำกว่าและเพราะเหตุใด?',
    correct: 'นักลงทุนห่านทองคำ',
    alternativeAnswers: [
      'เน้นบริษัทที่มีกำไรมั่นคงและปันผลสม่ำเสมอ',
      'นักลงทุนห่านทองคำ / เน้นบริษัทที่มีกำไรมั่นคงและปันผลสม่ำเสมอ',
      'เน้นบริษัทที่มีกำไรมั่นคงและปันผลสม่ำเสมอ / นักลงทุนห่านทองคำ',
      'นักลงทุนห่านทองคำ เพราะเน้นกำไรมั่นคง',
      'ห่านทองคำ เน้นปันผลสม่ำเสมอ',
      'Yield Investor เน้นความมั่นคง'
    ],
    explanation: 'นักลงทุนห่านทองคำมีความเสี่ยงต่ำกว่า เพราะเน้นบริษัทที่มีกำไรมั่นคงและปันผลสม่ำเสมอ ซึ่งมีความมั่นคงมากกว่าการเก็งกำไรจากการขึ้นลงของราคา'
  },
  {
    id: 19,
    level: 'expert',
    type: 'short',
    question: 'ทำไมการเลือกหุ้นโดยพิจารณาจาก "สถานะทางการเงินที่มั่นคง" ของบริษัทจึงมีความสำคัญ?',
    correct: 'เป็นสัญญาณของความสามารถในการอยู่รอดและเติบโต',
    alternativeAnswers: [
      'สัญญาณของความสามารถในการอยู่รอดและเติบโต',
      'แสดงความสามารถในการอยู่รอดและเติบโต',
      'เป็นตัวบ่งชี้ความสามารถในการอยู่รอด',
      'บ่งชี้ความมั่นคงของธุรกิจ',
      'แสดงศักยภาพในการเติบโต',
      'ป้องกันความเสี่ยงการล้มละลาย'
    ],
    explanation: 'สถานะทางการเงินที่มั่นคงเป็นสัญญาณของความสามารถในการอยู่รอดและเติบโต แสดงว่าบริษัทสามารถผ่านวิกฤตและสร้างมูลค่าระยะยาวได้'
  },
  {
    id: 20,
    level: 'expert',
    type: 'short',
    question: 'ตามหลักการของนักลงทุนเน้นคุณค่า การมองว่าหุ้นเหมือน "ความเป็นเจ้าของธุรกิจ" สอดคล้องกับนิยามของหุ้นอย่างไร?',
    correct: 'หุ้นคือสิทธิความเป็นเจ้าของธุรกิจ',
    alternativeAnswers: [
      'หุ้นคือสิทธิความเป็นเจ้าของธุรกิจ',
      'หุ้นแสดงความเป็นเจ้าของธุรกิจ',
      'หุ้นเป็นหลักฐานความเป็นเจ้าของ',
      'หุ้นคือส่วนแบ่งความเป็นเจ้าของ',
      'หุ้นให้สิทธิเป็นเจ้าของบริษัท',
      'สิทธิความเป็นเจ้าของธุรกิจ'
    ],
    explanation: 'การมองหุ้นเหมือนความเป็นเจ้าของธุรกิจสอดคล้องกับนิยามที่ว่า หุ้นคือสิทธิความเป็นเจ้าของธุรกิจ ทำให้นักลงทุนมองระยะยาวและใส่ใจคุณภาพธุรกิจ'
  }
];

// คะแนนฐานตามระดับคำถาม
const BASE_SCORES = {
  'easy': 10,     // 3 ข้อ × 10 = 30 คะแนน
  'medium': 16,   // 3 ข้อ × 16 = 48 คะแนน  
  'hard': 24,     // 3 ข้อ × 24 = 72 คะแนน
  'expert': 32    // 3 ข้อ × 32 = 96 คะแนน
};

// คะแนนรวมสูงสุด = 246 คะแนน (30+48+72+96)
const MAX_TOTAL_SCORE = 246;

// เกณฑ์การวัดระดับตามคะแนน (ปรับใหม่ให้เหมาะกับคะแนนรวม 246)
const LEVEL_CRITERIA = {
  'expert': { min: 197, percentage: 80 },    // 80%+ = Expert Level
  'hard': { min: 148, percentage: 60 },     // 60-79% = Hard Level  
  'medium': { min: 99, percentage: 40 },    // 40-59% = Medium Level
  'easy': { min: 0, percentage: 0 }         // 0-39% = Easy Level
};

// ฟังก์ชันสุ่มคำถาม 3 ใน 5 ในแต่ละระดับ
const generateRandomQuiz = () => {
  const levels = ['easy', 'medium', 'hard', 'expert'];
  let selectedQuestions = [];
  
  levels.forEach(level => {
    // หาคำถามของระดับนั้น
    const levelQuestions = QUIZ_QUESTIONS.filter(q => q.level === level);
    
    // สุ่ม 3 ข้อจาก 5 ข้อ
    const shuffled = levelQuestions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);
    
    selectedQuestions = [...selectedQuestions, ...selected];
  });
  
  return selectedQuestions;
};

// ฟังก์ชันคำนวณคะแนนตามระดับคำถาม
const calculateScore = (answers, questionsUsed) => {
  let totalScore = 0;
  let scoreByLevel = {
    easy: { correct: 0, total: 0, score: 0 },
    medium: { correct: 0, total: 0, score: 0 },
    hard: { correct: 0, total: 0, score: 0 },
    expert: { correct: 0, total: 0, score: 0 }
  };

  questionsUsed.forEach(question => {
    const answer = answers[question.id];
    const level = question.level;
    
    scoreByLevel[level].total++;
    
    if (answer && answer.correct) {
      scoreByLevel[level].correct++;
      scoreByLevel[level].score += BASE_SCORES[level];
      totalScore += BASE_SCORES[level];
    }
  });

  return { totalScore, scoreByLevel, maxScore: MAX_TOTAL_SCORE };
};

// ฟังก์ชันกำหนดระดับจากคะแนน
const determineLevel = (totalScore) => {
  const percentage = (totalScore / MAX_TOTAL_SCORE) * 100;
  
  if (percentage >= LEVEL_CRITERIA.expert.percentage) return 'expert';
  if (percentage >= LEVEL_CRITERIA.hard.percentage) return 'hard';
  if (percentage >= LEVEL_CRITERIA.medium.percentage) return 'medium';
  return 'easy';
};

export default function QuizSystem({ onQuizComplete, onBack, mode = 'assessment' }) {
  // mode: 'assessment' = วัดระดับ, 'practice' = ฝึกฝน
  const [questionsToUse] = useState(() => generateRandomQuiz()); // สุ่มคำถามตอนเริ่มต้น
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [startTime] = useState(Date.now());
  const [answers, setAnswers] = useState({});
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  // Timer - หยุดเมื่อ Quiz เสร็จสิ้น
  useEffect(() => {
    if (quizCompleted) return; // ไม่สร้าง timer ใหม่ถ้า Quiz เสร็จแล้ว
    
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [startTime, quizCompleted]);

  const currentQ = questionsToUse[currentQuestion];

  const checkAnswer = async () => {
    if (!selectedAnswer.trim()) return;

    let correct = false;
    let aiResponse = null;
    setIsLoading(true);

    if (currentQ.type === 'multiple') {
      correct = parseInt(selectedAnswer) === currentQ.correct;
    } else if (currentQ.type === 'short') {
      // Try backend semantic grading using questionId
      try {
        // สร้าง headers พร้อม XSRF Token
        const headers = { 'Content-Type': 'application/json' };
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {});
        if (cookies['XSRF-TOKEN']) {
          headers['X-XSRF-TOKEN'] = decodeURIComponent(cookies['XSRF-TOKEN']);
        }
        
        const resp = await fetch(`${process.env.REACT_APP_API_BASE_URL || ''}/api/quiz/grade-by-id`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({ questionId: currentQ.id, userAnswer: selectedAnswer, lang: 'th' })
        });
        if (resp.ok) {
          const data = await resp.json();
          correct = Boolean(data.isCorrect);
          aiResponse = data; // เก็บข้อมูลจาก AI สำหรับแสดงผล
        } else {
          // fallback to local matching on non-200
          const userAnswer = selectedAnswer.toLowerCase().trim();
          const correctAnswer = currentQ.correct.toLowerCase();
          const alternatives = currentQ.alternativeAnswers || [];
          correct = userAnswer === correctAnswer || alternatives.some(alt => alt.toLowerCase() === userAnswer);
        }
      } catch (e) {
        // network or server error: fallback to local matching
        const userAnswer = selectedAnswer.toLowerCase().trim();
        const correctAnswer = currentQ.correct.toLowerCase();
        const alternatives = currentQ.alternativeAnswers || [];
        correct = userAnswer === correctAnswer || alternatives.some(alt => alt.toLowerCase() === userAnswer);
      }
    }

    setIsCorrect(correct);
    setAiResult(aiResponse);
    setShowResult(true);
    setIsLoading(false);
    
    // อัปเดต answers state
    const newAnswers = {
      ...answers,
      [currentQ.id]: { answer: selectedAnswer, correct }
    };
    setAnswers(newAnswers);
    
    // คำนวณคะแนนใหม่
    const { totalScore: newTotalScore } = calculateScore(newAnswers, questionsToUse);
    setTotalScore(newTotalScore);
    
    if (!correct) {
      setHearts(prev => prev - 1);
    }
  };

  const nextQuestion = () => {
    if (hearts <= 0) {
      setQuizCompleted(true);
      return;
    }

    if (currentQuestion < questionsToUse.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer('');
      setShowResult(false);
      setAiResult(null);
      setIsLoading(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPerformanceLevel = () => {
    const level = determineLevel(totalScore);
    
    // Log percentage for potential future use
    const levelInfo = {
      'expert': { color: 'text-purple-400', message: 'ยอดเยี่ยม! คุณเป็นผู้เชี่ยวชาญ', title: 'Expert' },
      'hard': { color: 'text-red-400', message: 'ดีมาก! คุณมีความรู้ระดับสูง', title: 'Hard' },
      'medium': { color: 'text-yellow-400', message: 'ดี! คุณมีพื้นฐานที่ดี', title: 'Medium' },
      'easy': { color: 'text-green-400', message: 'เริ่มต้นได้ดี แนะนำให้เรียนรู้เพิ่มเติม', title: 'Easy' }
    };
    
    return levelInfo[level];
  };

  if (quizCompleted) {
    const performance = getPerformanceLevel();
    const { scoreByLevel } = calculateScore(answers, questionsToUse);
    const percentage = (totalScore / MAX_TOTAL_SCORE) * 100;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 text-white flex items-start justify-center p-4 pt-44 sm:pt-48 md:pt-52">
        <div className="max-w-5xl w-full bg-gradient-to-br from-slate-800/95 via-slate-800/98 to-slate-900/95 backdrop-blur-xl rounded-3xl p-8 border-2 border-slate-500/40 shadow-2xl shadow-purple-900/30 relative overflow-hidden panel-entrance">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-xl"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full blur-xl"></div>
          </div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl mb-6 shadow-lg">
                <FaTrophy className="text-3xl text-white" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                Quiz เสร็จสิ้น!
              </h1>
              <p className="text-xl text-slate-300">
                คุณได้ทำ Quiz เสร็จแล้ว ดูผลลัพธ์ของคุณด้านล่าง
              </p>
            </div>
            
            {/* Main Score Card */}
            <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-slate-600/30 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="space-y-2">
                  <div className="text-slate-400 text-lg">คะแนนรวม</div>
                  <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                    {totalScore}
                  </div>
                  <div className="text-2xl text-slate-300">/{MAX_TOTAL_SCORE}</div>
                  <div className="text-lg text-slate-400">{percentage.toFixed(1)}%</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-slate-400 text-lg">ระดับที่ได้</div>
                  <div className={`text-4xl lg:text-5xl font-bold ${performance.color}`}>
                    {performance.title}
                  </div>
                  <div className="text-slate-300 text-lg mt-2">
                    {performance.message}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-slate-400 text-lg">เวลาที่ใช้</div>
                  <div className="text-4xl lg:text-5xl font-bold text-blue-400">
                    {formatTime(timeElapsed)}
                  </div>
                  <div className="text-slate-400 text-lg">นาที:วินาที</div>
                </div>
              </div>
            </div>
            
            {/* Detailed Score Breakdown */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-slate-600/30">
              <h3 className="text-2xl font-bold mb-6 text-center">รายละเอียดคะแนนตามระดับ</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(scoreByLevel).map(([level, data]) => {
                  const levelColors = {
                    easy: 'from-green-500 to-emerald-500',
                    medium: 'from-yellow-500 to-orange-500', 
                    hard: 'from-orange-500 to-red-500',
                    expert: 'from-purple-500 to-pink-500'
                  };
                  
                  return (
                    <div key={level} className="bg-slate-700/60 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 text-center transform hover:scale-105 transition-all duration-200">
                      <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-3 bg-gradient-to-r ${levelColors[level]} text-white`}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </div>
                      <div className="space-y-2">
                        <div className="text-2xl font-bold text-white">
                          {data.correct}/{data.total}
                        </div>
                        <div className="text-lg font-semibold text-emerald-400">
                          {data.score} คะแนน
                        </div>
                        <div className="text-sm text-slate-400">
                          {data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0}% ถูกต้อง
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Performance Badge */}
            <div className="bg-gradient-to-r from-slate-700/60 to-slate-800/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-slate-600/30 text-center">
              <div className={`text-2xl font-bold ${performance.color} mb-2`}>
                🎯 ระดับที่แนะนำ: {performance.title}
              </div>
              <div className="text-lg text-slate-300">{performance.message}</div>
              
              {/* Progress visualization */}
              <div className="mt-4">
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${
                      percentage >= 80 ? 'from-purple-500 to-pink-500' :
                      percentage >= 60 ? 'from-orange-500 to-red-500' :
                      percentage >= 40 ? 'from-yellow-500 to-orange-500' :
                      'from-green-500 to-emerald-500'
                    } transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onBack}
                className="px-10 py-4 bg-slate-600/80 hover:bg-slate-500 border border-slate-500/50 rounded-xl transition-all duration-200 text-lg font-semibold transform hover:scale-105 shadow-lg"
              >
                ← กลับหน้าหลัก
              </button>
              <button
                onClick={() => onQuizComplete({
                  totalScore,
                  maxScore: MAX_TOTAL_SCORE,
                  scoreByLevel,
                  totalQuestions: questionsToUse.length,
                  timeElapsed,
                  recommendedLevel: performance.title,
                  percentage: (totalScore / MAX_TOTAL_SCORE) * 100,
                  answers,
                  questionsUsed: questionsToUse,
                  mode: mode // ส่งข้อมูล mode ไปด้วย
                })}
                className="px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition-all duration-200 text-lg font-semibold transform hover:scale-105 shadow-lg"
              >
                ดำเนินการต่อ →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-slate-900/95 via-purple-900/80 to-slate-900/95 backdrop-blur-sm z-[1100] overlay-fade flex items-start justify-center p-4 pt-44 sm:pt-48 md:pt-52"
    >
  {/* Stronger gradient under the site header for clearer separation */}
  <div className="pointer-events-none absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/40 via-black/25 to-transparent"></div>
      <div 
        className="max-w-5xl w-full bg-gradient-to-br from-slate-800/95 via-slate-800/98 to-slate-900/95 backdrop-blur-xl rounded-3xl border-2 border-slate-500/40 shadow-2xl shadow-purple-900/30 max-h-[80vh] overflow-y-auto relative panel-entrance scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500 mt-4 md:mt-6"
        onClick={(e) => e.stopPropagation()}
      >
  {/* Decorative gradient overlay (remove top purple to avoid blending with header) */}
  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-600/5 to-cyan-600/10 rounded-3xl pointer-events-none"></div>
        
        {/* Header */}
  <div className="relative p-6 border-b border-slate-600/50 bg-slate-900/60 backdrop-blur-md rounded-t-3xl">
          <div className="flex justify-between items-center">
            {/* Progress Bar */}
            <div className="flex-1 mr-6">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm font-medium text-slate-300">
                  Progress {currentQuestion + 1} / {questionsToUse.length}
                </span>
                <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
                    style={{ width: `${((currentQuestion + 1) / questionsToUse.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Hearts */}
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <FaHeart 
                    key={i} 
                    className={`text-2xl transition-all duration-300 ${
                      i <= hearts 
                        ? 'text-red-500 drop-shadow-lg filter animate-pulse' 
                        : 'text-slate-600'
                    }`} 
                  />
                ))}
              </div>
            </div>
            
            {/* Timer and Close Button */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-xl border border-slate-600/30">
                <FaClock className="text-blue-400" />
                <span className="text-xl font-mono text-blue-300 tracking-wider">
                  {formatTime(timeElapsed)}
                </span>
              </div>
              <button
                onClick={onBack}
                className="text-slate-400 hover:text-red-400 transition-all duration-200 p-3 hover:bg-slate-700/50 rounded-xl border border-transparent hover:border-slate-600/30"
                title="ปิด Quiz"
              >
                <FaTimes size={20} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Question Section */}
        <div className="relative p-8 lg:p-10">
          {/* Question Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${
                currentQ.level === 'easy' 
                  ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                  : currentQ.level === 'medium'
                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                  : currentQ.level === 'hard'
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              }`}>
                Level {currentQ.level}
              </div>
              <span className="text-slate-400 text-sm">
                Question {currentQuestion + 1}
              </span>
            </div>
            
            <h2 className="text-2xl lg:text-3xl font-bold text-white leading-relaxed mb-2">
              {currentQ.question}
            </h2>
            
            {/* Decorative line */}
            <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          </div>
          
          {/* Answer Options */}
          <div className="mb-8">
            {currentQ.type === 'multiple' ? (
              <div className="space-y-4">
                {currentQ.options.map((option, index) => (
                  <button
                    key={`option-${index}-${option.slice(0, 10)}`}
                    onClick={() => setSelectedAnswer(index.toString())}
                    disabled={showResult}
                    className={`w-full p-5 rounded-2xl border text-left transition-all duration-200 transform hover:scale-[1.02] ${
                      selectedAnswer === index.toString()
                        ? 'border-blue-500 bg-gradient-to-r from-blue-500/20 to-purple-500/20 shadow-lg'
                        : 'border-slate-600/50 hover:border-slate-500 bg-slate-800/30 hover:bg-slate-700/40'
                    } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        selectedAnswer === index.toString() 
                          ? 'border-blue-500 bg-blue-500 shadow-lg' 
                          : 'border-slate-500'
                      }`}>
                        {selectedAnswer === index.toString() && (
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="text-lg text-slate-100">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={showResult}
                  placeholder="Type your answer..."
                  className="w-full p-6 rounded-2xl bg-slate-800/50 border border-slate-600/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-white placeholder-slate-400 text-xl transition-all duration-200"
                />
                {/* Input focus effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 transition-opacity duration-200 pointer-events-none focus-within:opacity-100"></div>
              </div>
            )}
          </div>
          
          {/* Result Feedback */}
          {showResult && (
            <div className={`p-6 rounded-2xl mb-8 border transition-all duration-500 transform ${
              isCorrect 
                ? 'bg-gradient-to-r from-emerald-900/50 to-green-900/30 border-emerald-500/50 shadow-emerald-500/20' 
                : 'bg-gradient-to-r from-red-900/50 to-pink-900/30 border-red-500/50 shadow-red-500/20'
            } shadow-lg`}>
              <div className="flex items-center gap-4 mb-3">
                <div className={`p-2 rounded-full ${
                  isCorrect ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}>
                  {isCorrect ? (
                    <FaCheck className="text-emerald-400 text-xl" />
                  ) : (
                    <FaTimes className="text-red-400 text-xl" />
                  )}
                </div>
                <span className={`text-xl font-bold ${
                  isCorrect ? 'text-emerald-300' : 'text-red-300'
                }`}>
                  {isCorrect ? 'ถูกต้อง! เยี่ยมมาก' : 'ไม่ถูกต้อง ลองใหม่ครั้งหน้า'}
                </span>
                {aiResult?.aiUsed && (
                  <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <span className="text-purple-300 text-sm font-medium">AI ตรวจ</span>
                  </div>
                )}
              </div>
              
              {/* AI Feedback */}
              {aiResult?.feedback && (
                <div className="bg-slate-800/50 p-4 rounded-xl mb-3 border border-slate-600/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-blue-300 text-sm font-semibold">คำแนะนำจาก AI</span>
                  </div>
                  <p className="text-slate-200 text-base leading-relaxed">{aiResult.feedback}</p>
                  {aiResult.score !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-slate-400 text-sm">คะแนนจาก AI:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-2 bg-slate-600 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${(aiResult.score || 0) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-slate-300 text-sm font-medium">
                          {((aiResult.score || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-slate-200 text-lg leading-relaxed pl-12">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-yellow-300 text-sm font-semibold">คำอธิบาย</span>
                </div>
                {currentQ.explanation}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onBack}
              className="px-8 py-4 bg-slate-600/80 hover:bg-slate-500 border border-slate-500/50 rounded-xl transition-all duration-200 text-lg font-semibold text-slate-200 hover:text-white transform hover:scale-105"
            >
              ← Exit Quiz
            </button>
            
            {!showResult ? (
              <button
                onClick={checkAnswer}
                disabled={!selectedAnswer.trim() || isLoading}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl transition-all duration-200 text-lg font-semibold transform hover:scale-105 shadow-lg disabled:shadow-none flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>AI กำลังตรวจ...</span>
                  </>
                ) : (
                  'Check Answer →'
                )}
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition-all duration-200 text-lg font-semibold transform hover:scale-105 shadow-lg"
              >
                {hearts <= 0 ? '📊 ดูผลลัพธ์' : 
                 currentQuestion < questionsToUse.length - 1 ? 'คำถามต่อไป →' : '🏆 ดูผลลัพธ์'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
