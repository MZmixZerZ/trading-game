const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../supabaseClient');
const { quizHistory } = require('../state');

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const AI_CORRECT_THRESHOLD = Number(process.env.QUIZ_AI_CORRECT_THRESHOLD ?? 0.6);

const QUIZ_BANK = [
  { id: 1, level: 'easy', type: 'short', question: 'หุ้นคืออะไร?', correct: 'สิทธิความเป็นเจ้าของธุรกิจ', alternativeAnswers: [
    'สิทธิความเป็นเจ้าของในธุรกิจ','สิทธิเป็นเจ้าของธุรกิจ','ความเป็นเจ้าของธุรกิจ','สิทธิความเป็นเจ้าของบริษัท','สิทธิความเป็นเจ้าของในบริษัท'
  ]},
  { id: 2, level: 'easy', type: 'short', question: 'ก่อนเริ่มลงทุน ควรชำระหนี้ประเภทใดให้หมดก่อน?', correct: 'หนี้ดอกเบี้ยสูง', alternativeAnswers: [
    'หนี้บัตรเครดิต','หนี้ดอกเบี้ยสูง หนี้บัตรเครดิต','หนี้บัตรเครดิต หนี้ดอกเบี้ยสูง','หนี้ที่มีดอกเบี้ยสูง','หนี้ดอกเบี้ยสูง / หนี้บัตรเครดิต'
  ]},
  { id: 3, level: 'easy', type: 'short', question: 'เงินสำรองฉุกเฉินควรมีจำนวนเท่ากับกี่เดือนของเงินเดือน?', correct: '3-6 เดือน', alternativeAnswers: [
    '3 ถึง 6 เดือน','3-6เดือน','3 - 6 เดือน','สาม ถึง หก เดือน','3 หรือ 6 เดือน'
  ]},
  { id: 4, level: 'easy', type: 'short', question: 'เงินที่นำมาลงทุนในหุ้นควรเป็นเงินลักษณะใด?', correct: 'เงินเย็น', alternativeAnswers: [
    'เงินเย็น','เงินที่ไม่ต้องใช้','เงินที่ไม่จำเป็นต้องใช้','เงินส่วนเกิน','เงินที่สูญเสียแล้วไม่เสียหาย'
  ]},
  { id: 5, level: 'easy', type: 'short', question: 'P/E Ratio หมายถึงอะไร?', correct: 'ราคาหุ้น ÷ กำไรต่อหุ้น', alternativeAnswers: [
    'ราคาหุ้นหารกำไรต่อหุ้น','ราคาหุ้น/กำไรต่อหุ้น','ราคาหุ้น หาร กำไรต่อหุ้น','ราคาหุ้น ต่อ กำไรต่อหุ้น','Price to Earnings Ratio'
  ]},
  { id: 6, level: 'medium', type: 'short', question: 'นักลงทุนประเภทใดที่เน้นการลงทุนระยะยาวและมองหุ้นเหมือนการเป็นเจ้าของธุรกิจ?', correct: 'นักลงทุนเน้นคุณค่า', alternativeAnswers: [
    'Value Investor','นักลงทุนเน้นคุณค่า / Value Investor','Value investor','value investor','นักลงทุนแบบคุณค่า','นักลงทุนประเภทคุณค่า'
  ]},
  { id: 7, level: 'medium', type: 'short', question: 'นักลงทุนประเภทใดที่มุ่งเน้นผลตอบแทนจากเงินปันผลที่สม่ำเสมอ?', correct: 'นักลงทุนห่านทองคำ', alternativeAnswers: [
    'Yield Investor','นักลงทุนห่านทองคำ / Yield Investor','Yield investor','yield investor','นักลงทุนแบบห่านทองคำ','นักลงทุนเน้นเงินปันผล'
  ]},
  { id: 8, level: 'medium', type: 'short', question: 'นักลงทุนโมเมนตัมตัดสินใจลงทุนจากปัจจัยใด?', correct: 'สถานการณ์ตลาด', alternativeAnswers: [
    'เหตุการณ์เฉพาะหน้า','สถานการณ์ตลาด / เหตุการณ์เฉพาะหน้า','เหตุการณ์เฉพาะหน้า / สถานการณ์ตลาด','ความเคลื่อนไหวของตลาด','แนวโน้มตลาด','โมเมนตัมของตลาด'
  ]},
  { id: 9, level: 'medium', type: 'short', question: 'Circuit Breaker คือการหยุดซื้อขายเมื่อราคาพุ่งสูงเกิน ถูกหรือผิด?', correct: 'ผิด', alternativeAnswers: [
    'ผิด','false','False','ไม่ถูกต้อง','ไม่ใช่'
  ]},
  { id: 10, level: 'medium', type: 'short', question: 'Single Stock Futures อ้างอิงราคาหุ้นรายตัว ถูกหรือผิด?', correct: 'ถูก', alternativeAnswers: [
    'ถูก','true','True','ถูกต้อง','ใช่'
  ]},
  { id: 11, level: 'hard', type: 'short', question: 'เงินสำรองฉุกเฉินมีไว้เพื่อป้องกันไม่ให้นักลงทุนต้องทำอะไร?', correct: 'ขายหุ้นขาดทุน', alternativeAnswers: [
    'ขายหุ้นในขณะขาดทุน','ขายหุ้นตอนขาดทุน','ขายหุ้นเมื่อขาดทุน','ขายหุ้นแบบขาดทุน','การขายหุ้นขาดทุน','ขายหุ้นด้วยขาดทุน'
  ]},
  { id: 12, level: 'hard', type: 'short', question: 'คุณมีพอร์ต 200,000 บาท รับความเสี่ยงสูงสุด 2% ต่อการเทรด คุณจะเสี่ยงได้กี่บาทต่อครั้ง?', correct: '4,000 บาท', alternativeAnswers: [
    '4000 บาท','4,000','4000','สี่พันบาท','4,000บาท','4000บาท'
  ]},
  { id: 13, level: 'hard', type: 'short', question: 'ลักษณะสำคัญ 2 ประการของบริษัทที่นักลงทุนห่านทองคำมักจะเลือกลงทุนคืออะไร?', correct: 'กำไรมั่นคง', alternativeAnswers: [
    'ปันผลสม่ำเสมอ','กำไรมั่นคง / ปันผลสม่ำเสมอ','ปันผลสม่ำเสมอ / กำไรมั่นคง','กำไรมั่นคง และ ปันผลสม่ำเสมอ','ปันผลสม่ำเสมอ และ กำไรมั่นคง','กำไรคงที่ ปันผลสม่ำเสมอ'
  ]},
  { id: 14, level: 'hard', type: 'short', question: 'การเก็งกำไรแบบนักลงทุนโมเมนตัมต้องอาศัยสิ่งใดจำนวนมาก?', correct: 'ความรู้', alternativeAnswers: [
    'ความรู้','ข้อมูล','ข้อมูลข่าวสาร','ข่าวสาร','การวิเคราะห์','ข้อมูลตลาด'
  ]},
  { id: 15, level: 'hard', type: 'short', question: 'Short Selling คือการขายหุ้นที่ไม่มีอยู่ในมือ ถูกหรือผิด?', correct: 'ถูก', alternativeAnswers: [
    'ถูก','true','True','ถูกต้อง','ใช่','correct'
  ]},
  { id: 16, level: 'expert', type: 'short', question: 'ตามหลักการของ "เงินเย็น" การใช้เงินจากการลงทุนซื้อของฟุ่มเฟือยที่ไม่จำเป็นจะส่งผลเสียอย่างไร?', correct: 'ทำให้ต้องเริ่มต้นใหม่', alternativeAnswers: [
    'ทำให้ไม่ถึงอิสรภาพทางการเงิน','ทำให้ต้องเริ่มต้นใหม่ / ทำให้ไม่ถึงอิสรภาพทางการเงิน','ทำให้ไม่ถึงอิสรภาพทางการเงิน / ทำให้ต้องเริ่มต้นใหม่','ต้องเริ่มต้นใหม่','ไม่ถึงอิสรภาพทางการเงิน','ทำลายแผนการลงทุนระยะยาว'
  ]},
  { id: 17, level: 'expert', type: 'short', question: 'การมีเงินสำรองฉุกเฉิน 3-6 เดือนของเงินเดือนสัมพันธ์กับเป้าหมายการลงทุนระยะยาวอย่างไร?', correct: 'ป้องกันการบังคับขายหุ้นในช่วงตลาดตกต่ำ', alternativeAnswers: [
    'รักษาโอกาสในการทำกำไรระยะยาว','ป้องกันการบังคับขายหุ้นในช่วงตลาดตกต่ำ / รักษาโอกาสในการทำกำไรระยะยาว','รักษาโอกาสในการทำกำไรระยะยาว / ป้องกันการบังคับขายหุ้นในช่วงตลาดตกต่ำ','ป้องกันการขายหุ้นขาดทุน','รักษาแผนการลงทุนระยะยาว','ไม่ต้องขายหุ้นตอนตลาดตก'
  ]},
  { id: 18, level: 'expert', type: 'short', question: 'ระหว่างนักลงทุนเน้นคุณค่าและนักลงทุนห่านทองคำ นักลงทุนประเภทใดมีความเสี่ยงต่ำกว่าและเพราะเหตุใด?', correct: 'นักลงทุนห่านทองคำ', alternativeAnswers: [
    'เน้นบริษัทที่มีกำไรมั่นคงและปันผลสม่ำเสมอ','นักลงทุนห่านทองคำ / เน้นบริษัทที่มีกำไรมั่นคงและปันผลสม่ำเสมอ','เน้นบริษัทที่มีกำไรมั่นคงและปันผลสม่ำเสมอ / นักลงทุนห่านทองคำ','นักลงทุนห่านทองคำ เพราะเน้นกำไรมั่นคง','ห่านทองคำ เน้นปันผลสม่ำเสมอ','Yield Investor เน้นความมั่นคง'
  ]},
  { id: 19, level: 'expert', type: 'short', question: 'ทำไมการเลือกหุ้นโดยพิจารณาจาก "สถานะทางการเงินที่มั่นคง" ของบริษัทจึงมีความสำคัญ?', correct: 'เป็นสัญญาณของความสามารถในการอยู่รอดและเติบโต', alternativeAnswers: [
    'สัญญาณของความสามารถในการอยู่รอดและเติบโต','แสดงความสามารถในการอยู่รอดและเติบโต','เป็นตัวบ่งชี้ความสามารถในการอยู่รอด','บ่งชี้ความมั่นคงของธุรกิจ','แสดงศักยภาพในการเติบโต','ป้องกันความเสี่ยงการล้มละลาย'
  ]},
  { id: 20, level: 'expert', type: 'short', question: 'ตามหลักการของนักลงทุนเน้นคุณค่า การมองว่าหุ้นเหมือน "ความเป็นเจ้าของธุรกิจ" สอดคล้องกับนิยามของหุ้นอย่างไร?', correct: 'หุ้นคือสิทธิความเป็นเจ้าของธุรกิจ', alternativeAnswers: [
    'หุ้นคือสิทธิความเป็นเจ้าของธุรกิจ','หุ้นแสดงความเป็นเจ้าของธุรกิจ','หุ้นเป็นหลักฐานความเป็นเจ้าของ','หุ้นคือส่วนแบ่งความเป็นเจ้าของ','หุ้นให้สิทธิเป็นเจ้าของบริษัท','สิทธิความเป็นเจ้าของธุรกิจ'
  ]},
];

function normalizeAnswer(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.normalize('NFKC').trim().toLowerCase();
  s = s
    .replace(/\s+/g, ' ')
    .replace(/÷/g, '/')
    .replace(/ต่อ/g, '/')
    .replace(/\s*\/\s*/g, '/')
    .replace(/หาร/g, '/')
    .replace(/[,;:​]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

function stripSpaces(s) {
  return (s || '').replace(/\s+/g, '');
}

router.get('/quiz/bank', (req, res) => {
  const meta = QUIZ_BANK.map(({ id, level, type, question }) => ({ id, level, type, question }));
  res.json(meta);
});

router.get('/quiz/question/:id', (req, res) => {
  const id = Number(req.params.id);
  const q = QUIZ_BANK.find(q => q.id === id);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  const { level, type, question } = q;
  res.json({ id, level, type, question });
});

router.get('/quiz/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    try {
      if (supabase) {
        const { data, error } = await supabase.from('quiz_history').select('*').eq('user_id', userId).limit(1).maybeSingle();
        if (error) throw error;
        if (data) return res.json(data);

        const defaultHistory = {
          user_id: userId, quizzes: [], total_quizzes: 0,
          average_score: 0, last_quiz_date: null, level_assessment_done: false
        };
        const { error: insErr } = await supabase.from('quiz_history').insert([defaultHistory]);
        if (insErr) throw insErr;
        return res.json(defaultHistory);
      }
    } catch (err) {
      console.warn('⚠️ Supabase quiz history read error:', err.message || err);
    }

    const history = quizHistory.get(userId) || {
      userId, quizzes: [], totalQuizzes: 0,
      averageScore: 0, lastQuizDate: null, levelAssessmentDone: false
    };
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/quiz/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { quizData, isLevelAssessment = false } = req.body;
    let userHistory;
    try {
      if (supabase) {
        const { data, error } = await supabase.from('quiz_history').select('*').eq('user_id', userId).limit(1).maybeSingle();
        if (error) throw error;
        userHistory = data || {
          user_id: userId, quizzes: [], total_quizzes: 0,
          average_score: 0, last_quiz_date: null, level_assessment_done: false
        };
      }
    } catch (err) {
      console.warn('⚠️ Supabase quiz history read error (post):', err.message || err);
    }

    if (!userHistory) {
      userHistory = quizHistory.get(userId) || {
        userId, quizzes: [], totalQuizzes: 0,
        averageScore: 0, lastQuizDate: null, levelAssessmentDone: false
      };
    }

    const newQuiz = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      score: quizData.score || 0,
      totalQuestions: quizData.totalQuestions || 0,
      correctAnswers: quizData.correctAnswers || 0,
      quizType: quizData.quizType || 'general',
      isLevelAssessment,
      details: quizData.details || []
    };

    userHistory.quizzes.push(newQuiz);
    userHistory.totalQuizzes += 1;
    userHistory.lastQuizDate = newQuiz.date;
    if (isLevelAssessment) userHistory.levelAssessmentDone = true;

    const totalScore = userHistory.quizzes.reduce((sum, quiz) => sum + quiz.score, 0);
    userHistory.averageScore = totalScore / userHistory.totalQuizzes;

    try {
      if (supabase) {
        const payload = {
          user_id: userId,
          quizzes: userHistory.quizzes,
          total_quizzes: userHistory.totalQuizzes,
          average_score: userHistory.averageScore,
          last_quiz_date: userHistory.lastQuizDate,
          level_assessment_done: userHistory.levelAssessmentDone
        };
        const { error } = await supabase.from('quiz_history').upsert([payload], { onConflict: 'user_id' });
        if (error) throw error;
      } else {
        quizHistory.set(userId, userHistory);
      }
    } catch (error) {
      console.warn('❌ Error saving quiz history to DB:', error.message || error);
      quizHistory.set(userId, userHistory);
    }

    res.json(userHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/quiz/grade', async (req, res) => {
  try {
    const {
      question, userAnswer, correctAnswer, rubric,
      questionType = 'short_answer', lang = 'th',
      userId = null, saveToHistory = false,
    } = req.body || {};

    if (!question || typeof userAnswer !== 'string') {
      return res.status(400).json({ error: 'Missing question or userAnswer' });
    }

    if (questionType === 'multiple_choice' && correctAnswer) {
      const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      return res.json({
        isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        feedback: isCorrect ? 'คำตอบถูกต้อง!' : `คำตอบที่ถูกต้องคือ: ${correctAnswer}`,
        reasoning: 'ตรวจคำตอบแบบตรงไปตรงมา',
        aiUsed: false
      });
    }

    const prompt = `
      คุณคือผู้ตรวจข้อสอบเทรดดิ้งและการลงทุนอย่างเป็นกลาง ให้ผลลัพธ์เป็น JSON เท่านั้น
      ภาษาโจทย์/คำตอบ: ${lang}
      ประเภทคำถาม: ${questionType}

      โจทย์:
      ${question}

      คำตอบของผู้ทำ:
      ${userAnswer}

      เฉลยอ้างอิง (ถ้ามี):
      ${correctAnswer ?? 'ไม่ระบุ - ให้ตรวจตามความรู้ทั่วไปด้านการเทรดและการลงทุน'}

      เกณฑ์ให้คะแนน/รูบริก:
      ${rubric ?? 'ความถูกต้องทางแนวคิด (40%), ความครบถ้วน (30%), ความชัดเจน (20%), การยกตัวอย่าง (10%)'}

      วิธีการให้คะแนน:
      - คะแนน 0.9-1.0: คำตอบถูกต้องครบถ้วนและชัดเจนมาก
      - คะแนน 0.7-0.8: คำตอบถูกต้องส่วนใหญ่ แต่อาจขาดรายละเอียดบางส่วน
      - คะแนน 0.5-0.6: คำตอบถูกต้องบางส่วน มีจุดผิดพลาดเล็กน้อย
      - คะแนน 0.3-0.4: คำตอบผิดพลาดหลายจุด แต่มีความเข้าใจบางส่วน
      - คะแนน 0.0-0.2: คำตอบผิดพลาดหรือไม่เกี่ยวข้อง

      ส่งออกเป็น JSON เท่านั้น โดยโครงสร้าง:
      {
        "isCorrect": boolean,
        "score": number,
        "feedback": string,
        "reasoning": string,
        "suggestions": string
      }
      ห้ามส่งข้อความอื่นนอกจาก JSON.
    `;

    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    });

    const text = result.response.text().trim();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    }

    if (!parsed) {
      return res.status(502).json({ error: 'AI returned unparseable result', raw: text.substring(0, 200) + '...' });
    }

    parsed.score = Math.max(0, Math.min(1, Number(parsed.score) || 0));
    parsed.isCorrect = Boolean(parsed.isCorrect ?? parsed.score >= AI_CORRECT_THRESHOLD);
    parsed.feedback = String(parsed.feedback || '');
    parsed.reasoning = String(parsed.reasoning || '');
    parsed.suggestions = String(parsed.suggestions || '');
    parsed.aiUsed = true;
    parsed.aiThreshold = AI_CORRECT_THRESHOLD;

    if (saveToHistory && userId) {
      try {
        const quizResult = {
          question, userAnswer, correctAnswer,
          score: parsed.score, isCorrect: parsed.isCorrect,
          feedback: parsed.feedback, reasoning: parsed.reasoning,
          questionType, timestamp: new Date().toISOString()
        };

        let userHistory;
        try {
          if (supabase) {
            const { data, error } = await supabase.from('quiz_history').select('*').eq('user_id', userId).limit(1).maybeSingle();
            if (error) throw error;
            userHistory = data || {
              user_id: userId, quizzes: [], total_quizzes: 0,
              average_score: 0, last_quiz_date: null, level_assessment_done: false
            };
          }
        } catch (err) {
          console.warn('⚠️ Supabase quiz history read error:', err.message || err);
        }

        if (!userHistory) {
          userHistory = quizHistory.get(userId) || {
            userId, quizzes: [], totalQuizzes: 0,
            averageScore: 0, lastQuizDate: null, levelAssessmentDone: false
          };
        }

        userHistory.quizzes.push(quizResult);
        userHistory.totalQuizzes += 1;
        userHistory.lastQuizDate = quizResult.timestamp;

        const totalScore = userHistory.quizzes.reduce((sum, quiz) => sum + quiz.score, 0);
        userHistory.averageScore = totalScore / userHistory.totalQuizzes;

        try {
          if (supabase) {
            const payload = {
              user_id: userId,
              quizzes: userHistory.quizzes,
              total_quizzes: userHistory.totalQuizzes,
              average_score: userHistory.averageScore,
              last_quiz_date: userHistory.lastQuizDate,
              level_assessment_done: userHistory.levelAssessmentDone
            };
            const { error } = await supabase.from('quiz_history').upsert([payload], { onConflict: 'user_id' });
            if (error) throw error;
          } else {
            quizHistory.set(userId, userHistory);
          }
        } catch (error) {
          console.warn('❌ Error saving quiz history to DB:', error.message || error);
          quizHistory.set(userId, userHistory);
        }
      } catch (historyError) {
        console.error('Error saving quiz history:', historyError);
      }
    }

    return res.json(parsed);
  } catch (err) {
    console.error('quiz/grade error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

router.post('/quiz/grade-by-id', async (req, res) => {
  try {
    const { questionId, userAnswer, userId = null, lang = 'th' } = req.body || {};
    if (!questionId || typeof userAnswer !== 'string') {
      return res.status(400).json({ error: 'Missing questionId or userAnswer' });
    }
    const q = QUIZ_BANK.find(q => q.id === Number(questionId));
    if (!q) return res.status(404).json({ error: 'Question not found' });

    const uaNorm = normalizeAnswer(userAnswer);
    const corrNorm = normalizeAnswer(q.correct || '');
    const altsNorm = (q.alternativeAnswers || []).map((a) => normalizeAnswer(a));
    const variants = new Set([corrNorm, stripSpaces(corrNorm), ...altsNorm, ...altsNorm.map(stripSpaces)]);
    const uaVariants = [uaNorm, stripSpaces(uaNorm)];
    const strictCorrect = uaVariants.some((v) => variants.has(v));

    if (strictCorrect) {
      return res.json({ isCorrect: true, score: 1.0, feedback: 'คำตอบถูกต้อง', reasoning: 'ตรงกับเฉลย/คำตอบทางเลือก', aiUsed: false });
    }

    const prompt = `คุณคือผู้ตรวจข้อสอบด้านการลงทุน ให้ผลลัพธ์ JSON เท่านั้น
ภาษาโจทย์/คำตอบ: ${lang}
ประเภทคำถาม: ${q.type}

โจทย์:
${q.question}

คำตอบของผู้ทำ:
${userAnswer}

เฉลยอ้างอิง (ยอมรับความหมายเทียบเท่าด้วย):
${q.correct}

คำตอบทางเลือก (ยอมรับถ้าความหมายเหมือนกัน):
${(q.alternativeAnswers || []).join(', ')}

เกณฑ์: ความถูกต้องทางแนวคิด 60% ความชัดเจน 20% ความครบถ้วน 20%
การตัดสินถูก/ผิด: ให้ isCorrect เป็น true ถ้าความหมายของคำตอบเทียบเท่ากับเฉลย/ตัวเลือก แม้จะใช้คำหรือสัญลักษณ์ต่างกัน เช่น "/", "÷", "หาร", "ต่อ" สำหรับอัตราส่วน
ส่งออก JSON เท่านั้น: {"isCorrect": boolean, "score": number, "feedback": string, "reasoning": string}`;

    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
    });
    const text = result.response.text().trim();
    let parsed;
    try { parsed = JSON.parse(text); } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    }
    if (!parsed) return res.status(502).json({ error: 'AI returned unparseable result' });

    parsed.score = Math.max(0, Math.min(1, Number(parsed.score) || 0));
    parsed.isCorrect = Boolean(parsed.isCorrect ?? parsed.score >= AI_CORRECT_THRESHOLD);
    parsed.feedback = String(parsed.feedback || '');
    parsed.reasoning = String(parsed.reasoning || '');
    parsed.aiUsed = true;
    parsed.aiThreshold = AI_CORRECT_THRESHOLD;

    return res.json(parsed);
  } catch (err) {
    console.error('grade-by-id error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

module.exports = router;
