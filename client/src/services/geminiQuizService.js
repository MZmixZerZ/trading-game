import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export class GeminiQuizService {
  /**
   * ตรวจคำตอบด้วย Gemini AI
   * @param {Object} params - พารามิเตอร์สำหรับตรวจคำตอบ
   * @param {string} params.question - คำถาม
   * @param {string} params.userAnswer - คำตอบของผู้ใช้
   * @param {string} [params.correctAnswer] - เฉลย (ถ้ามี)
   * @param {string} [params.rubric] - เกณฑ์การให้คะแนน
   * @param {string} [params.questionType] - ประเภทคำถาม (multiple_choice, short_answer, essay)
   * @param {string} [params.lang] - ภาษา (th, en)
   * @param {string} [params.userId] - User ID สำหรับบันทึกประวัติ
   * @param {boolean} [params.saveToHistory] - บันทึกลงประวัติหรือไม่
   * @returns {Promise<Object>} ผลการตรวจคำตอบ
   */
  static async gradeAnswer({
    question,
    userAnswer,
    correctAnswer = null,
    rubric = null,
    questionType = 'short_answer',
    lang = 'th',
    userId = null,
    saveToHistory = false
  }) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/quiz/grade`, {
        question,
        userAnswer,
        correctAnswer,
        rubric,
        questionType,
        lang,
        userId,
        saveToHistory
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error grading answer:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'เกิดข้อผิดพลาดในการตรวจคำตอบ',
        fallback: this.getFallbackGrading(userAnswer, correctAnswer, questionType)
      };
    }
  }

  /**
   * การตรวจคำตอบแบบ fallback เมื่อ AI ไม่พร้อมใช้งาน
   */
  static getFallbackGrading(userAnswer, correctAnswer, questionType) {
    if (questionType === 'multiple_choice' && correctAnswer) {
      const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      return {
        isCorrect,
        score: isCorrect ? 1.0 : 0.0,
        feedback: isCorrect ? 'คำตอบถูกต้อง!' : `คำตอบที่ถูกต้องคือ: ${correctAnswer}`,
        reasoning: 'ตรวจคำตอบแบบพื้นฐาน (Fallback)',
        aiUsed: false
      };
    }

    // สำหรับข้อ short answer ที่ไม่มี AI
    const answerLength = userAnswer.trim().length;
    let score = 0.5; // คะแนนกลาง
    
    if (answerLength === 0) {
      score = 0.0;
    } else if (answerLength < 10) {
      score = 0.3;
    } else if (answerLength < 50) {
      score = 0.6;
    } else {
      score = 0.8;
    }

    return {
      isCorrect: score >= 0.6,
      score,
      feedback: 'ไม่สามารถใช้ AI ตรวจคำตอบได้ ให้คะแนนตามความยาวของคำตอบ',
      reasoning: 'ระบบ Fallback - ควรตรวจสอบคำตอบด้วยตนเอง',
      aiUsed: false
    };
  }

  /**
   * ตรวจคำตอบหลายข้อพร้อมกัน
   */
  static async gradeMultipleAnswers(questions) {
    const results = [];
    
    for (const question of questions) {
      const result = await this.gradeAnswer(question);
      results.push(result);
      
      // หน่วงเวลาเล็กน้อยเพื่อไม่ให้เรียก API บ่อยเกินไป
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * คำนวณคะแนนรวมจากผลการตรวจหลายข้อ
   */
  static calculateTotalScore(results) {
    if (!results || results.length === 0) return 0;
    
    const totalScore = results.reduce((sum, result) => {
      return sum + (result.success ? result.data.score : 0);
    }, 0);
    
    return Math.round((totalScore / results.length) * 100); // คะแนนเป็นเปอร์เซ็นต์
  }

  /**
   * สร้างรายงานผลการสอบ
   */
  static generateQuizReport(results, questions) {
    const totalQuestions = results.length;
    const correctAnswers = results.filter(r => r.success && r.data.isCorrect).length;
    const averageScore = this.calculateTotalScore(results);
    
    const report = {
      summary: {
        totalQuestions,
        correctAnswers,
        incorrectAnswers: totalQuestions - correctAnswers,
        averageScore,
        passStatus: averageScore >= 60 ? 'ผ่าน' : 'ไม่ผ่าน'
      },
      details: results.map((result, index) => ({
        questionNumber: index + 1,
        question: questions[index]?.question || '',
        userAnswer: questions[index]?.userAnswer || '',
        result: result.success ? result.data : result.fallback,
        aiUsed: result.success ? result.data.aiUsed : false
      })),
      recommendations: this.generateRecommendations(results)
    };
    
    return report;
  }

  /**
   * สร้างคำแนะนำจากผลการสอบ
   */
  static generateRecommendations(results) {
    const recommendations = [];
    const lowScoreAnswers = results.filter(r => 
      (r.success ? r.data.score : 0) < 0.6
    );
    
    if (lowScoreAnswers.length > 0) {
      recommendations.push('ควรทบทวนเนื้อหาในส่วนที่ได้คะแนนต่ำ');
    }
    
    const aiFailures = results.filter(r => !r.success);
    if (aiFailures.length > 0) {
      recommendations.push('บางคำตอบอาจต้องตรวจสอบเพิ่มเติมด้วยตนเอง');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('ผลการสอบดีมาก! ควรทำแบบทดสอบระดับที่สูงขึ้น');
    }
    
    return recommendations;
  }
}

export default GeminiQuizService;
