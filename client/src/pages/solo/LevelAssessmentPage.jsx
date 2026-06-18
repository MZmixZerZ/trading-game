import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import GameHeader from '../../components/common/GameHeader';
import AIQuizGrader from '../../components/quiz/AIQuizGrader';
import { FaGraduationCap, FaCheckCircle, FaTrophy } from 'react-icons/fa';

const LevelAssessmentPage = () => {
  const { user } = useAuth();
  const { 
    quizHistory, 
    saveQuizResult, 
    hasCompletedLevelAssessment,
    calculateUserLevel,
    getRecommendedDifficulty
  } = useUserProfile();
  
  const [currentStep, setCurrentStep] = useState('intro');
  // Track completion using user profile + currentStep; avoid redundant local setter
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [userLevel, setUserLevel] = useState('beginner');

  useEffect(() => {
    if (hasCompletedLevelAssessment()) {
      setCurrentStep('completed');
      setUserLevel(calculateUserLevel());
    }
  }, [quizHistory, calculateUserLevel, hasCompletedLevelAssessment]);

  const levelAssessmentQuestions = [
    {
      question: "อธิบายความแตกต่างระหว่าง Market Order และ Limit Order",
      type: "short_answer",
      correctAnswer: "Market Order คือการสั่งซื้อขายหุ้นที่ราคาตลาดปัจจุบันทันที ส่วน Limit Order คือการสั่งซื้อขายโดยกำหนดราคาสูงสุดหรือต่ำสุดที่ต้องการ",
      rubric: "ความถูกต้องของคำจำกัดความ (40%), การอธิบายความแตกต่าง (40%), การใช้ภาษาที่เหมาะสม (20%)",
      difficulty: "easy"
    },
    {
      question: "P/E Ratio คืออะไร และใช้วิเคราะห์หุ้นอย่างไร?",
      type: "essay",
      correctAnswer: "P/E Ratio (Price to Earnings Ratio) คือตัวชี้วัดที่แสดงอัตราส่วนระหว่างราคาหุ้นกับกำไรต่อหุ้น ใช้ประเมินว่าหุ้นมีราคาแพงหรือถูกเมื่อเทียบกับผลกำไร",
      rubric: "ความเข้าใจคำจำกัดความ (30%), สูตรการคำนวณ (25%), การประยุกต์ใช้ (25%), ตัวอย่างการใช้งาน (20%)",
      difficulty: "medium"
    },
    {
      question: "การวิเคราะห์ทางเทคนิค (Technical Analysis) มีข้อดีและข้อเสียอย่างไร?",
      type: "essay",
      correctAnswer: "ข้อดี: วิเคราะห์แนวโน้มราคาได้รวดเร็ว, เหมาะกับการเทรดระยะสั้น, ใช้ข้อมูลกราฟและปริมาณการซื้อขาย ข้อเสีย: อาจไม่สะท้อนมูลค่าที่แท้จริงของบริษัท, อาจมีสัญญาณผิดพลาด",
      rubric: "การระบุข้อดี (25%), การระบุข้อเสีย (25%), ความสมดุลในการวิเคราะห์ (25%), ตัวอย่างประกอบ (25%)",
      difficulty: "hard"
    },
    {
      question: "หากคุณมีเงินลงทุน 100,000 บาท จะวางแผนการลงทุนในตลาดหุ้นไทยอย่างไร?",
      type: "essay",
      correctAnswer: "ควรกระจายความเสี่ยงโดยลงทุนในหุ้นหลายกลุ่มอุตสาหกรรม, จัดสรรเงินตามอัตราส่วนที่เหมาะสม, ศึกษาข้อมูลบริษัทและแนวโน้มตลาด, กำหนดเป้าหมายการลงทุนระยะยาว",
      rubric: "กลยุทธ์การกระจายความเสี่ยง (30%), การจัดสรรเงิน (25%), การวิเคราะห์หุ้น (25%), ความสมเหตุสมผล (20%)",
      difficulty: "hard"
    },
    {
      question: "Stop Loss คืออะไร และควรใช้อย่างไรให้มีประสิทธิภาพ?",
      type: "short_answer",
      correctAnswer: "Stop Loss คือการกำหนดจุดขายหุ้นเพื่อจำกัดความเสียหาย ควรกำหนดที่ระดับ 5-10% ของราคาซื้อ และปรับตามสถานการณ์ตลาด",
      rubric: "คำจำกัดความ (40%), วิธีการใช้งาน (35%), เปอร์เซ็นต์ที่เหมาะสม (25%)",
      difficulty: "medium"
    }
  ];

  const handleAssessmentComplete = async (report) => {
    if (!user) return;

    // คำนวณผลรวม
    const totalScore = report.results.reduce((sum, result) => sum + result.score, 0) / report.results.length;
    const correctAnswers = report.results.filter(result => result.isCorrect).length;

    // กำหนดระดับตามคะแนน
    let level = 'beginner';
    if (totalScore >= 0.8) level = 'advanced';
    else if (totalScore >= 0.6) level = 'intermediate';

    const quizData = {
      score: totalScore,
      totalQuestions: levelAssessmentQuestions.length,
      correctAnswers,
      quizType: 'level_assessment',
      details: report.results
    };

    // บันทึกผลลงระบบ
    await saveQuizResult(user.uid, quizData, true);
    
  setUserLevel(level);
  // Mark as complete locally for immediate UI hint, real source is saved result
  setAssessmentComplete(true);
    setCurrentStep('result');
  };

  const getLevelInfo = (level) => {
    const levels = {
      beginner: {
        name: 'มือใหม่',
        color: 'text-green-400',
        bgColor: 'bg-green-900',
        icon: '🌱',
        description: 'เริ่มต้นเรียนรู้การลงทุน',
        recommendations: [
          'เรียนรู้พื้นฐานการเทรด',
          'ทำความเข้าใจกับการอ่านกราฟ',
          'ฝึกด้วยโหมด Tutorial'
        ]
      },
      intermediate: {
        name: 'ระดับกลาง',
        color: 'text-blue-400',
        bgColor: 'bg-blue-900',
        icon: '📈',
        description: 'มีความรู้พื้นฐานที่ดี',
        recommendations: [
          'ศึกษาการวิเคราะห์เทคนิค',
          'ฝึกกลยุทธ์การลงทุน',
          'เข้าร่วม Challenge Mode'
        ]
      },
      advanced: {
        name: 'ระดับสูง',
        color: 'text-purple-400',
        bgColor: 'bg-purple-900',
        icon: '🚀',
        description: 'มีความเชี่ยวชาญสูง',
        recommendations: [
          'ศึกษากลยุทธ์ขั้นสูง',
          'แข่งขันในโหมด Multiplayer',
          'แชร์ความรู้กับผู้เล่นอื่น'
        ]
      }
    };
    return levels[level];
  };

  if (currentStep === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <GameHeader showBackButton={true} backPath="/challenge" />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <FaGraduationCap className="text-6xl text-blue-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-white mb-6">
              Knowledge Assessment
            </h1>
            <p className="text-gray-300 text-lg mb-8">
              Take the quiz to assess your investment knowledge level.
              The system will recommend content suitable for your level.
            </p>

            <div className="bg-gray-800 p-6 rounded-xl mb-8">
              <h3 className="text-xl font-bold text-white mb-4">Quiz Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-2xl mb-2">📝</div>
                  <div className="text-white font-semibold">5 Questions</div>
                  <div className="text-gray-400 text-sm">Various difficulty levels</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-2xl mb-2">🤖</div>
                  <div className="text-white font-semibold">AI Grading</div>
                  <div className="text-gray-400 text-sm">Graded by AI</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-2xl mb-2">⏰</div>
                  <div className="text-white font-semibold">10-15 Minutes</div>
                  <div className="text-gray-400 text-sm">Approximately</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setCurrentStep('quiz')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                Start the quiz
              </button>
              {assessmentComplete && (
                <div className="text-green-300 text-sm">You have completed the assessment. You can view the results.</div>
              )}
              <div>
                <button
                  onClick={() => window.history.back()}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Go back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'quiz') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <GameHeader showBackButton={true} backPath="/challenge" />
        
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Knowledge Assessment</h1>
            <p className="text-gray-300">Answer the questions honestly based on your knowledge.</p>
          </div>

          <AIQuizGrader 
            questions={levelAssessmentQuestions}
            onGradingComplete={handleAssessmentComplete}
            showProgress={true}
            autoGrade={true}
            userId={user?.uid}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'result') {
    const levelInfo = getLevelInfo(userLevel);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <GameHeader showBackButton={true} backPath="/challenge" />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <FaTrophy className="text-6xl text-yellow-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-white mb-2">
              Assessment Results
            </h1>
            <p className="text-gray-300 mb-8">
              Your knowledge assessment is complete!
            </p>

            <div className={`${levelInfo.bgColor} p-8 rounded-xl mb-8`}>
              <div className="text-6xl mb-4">{levelInfo.icon}</div>
              <h2 className={`text-3xl font-bold ${levelInfo.color} mb-2`}>
                {levelInfo.name}
              </h2>
              <p className="text-gray-300 text-lg mb-6">
                {levelInfo.description}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-white font-semibold">Average Score</div>
                  <div className={`text-2xl font-bold ${levelInfo.color}`}>
                    {Math.round((quizHistory?.averageScore || 0) * 100)}%
                  </div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-white font-semibold">Total Questions</div>
                  <div className={`text-2xl font-bold ${levelInfo.color}`}>
                    {levelAssessmentQuestions.length}
                  </div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-white font-semibold">Recommended level</div>
                  <div className={`text-2xl font-bold ${levelInfo.color}`}>
                    {getRecommendedDifficulty()}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl mb-8">
              <h3 className="text-xl font-bold text-white mb-4">
                Instructions for you
              </h3>
              <ul className="text-left space-y-2">
                {levelInfo.recommendations.map((rec, index) => (
                  <li key={`recommendation-${index}-${rec.slice(0, 10)}`} className="flex items-center text-gray-300">
                    <FaCheckCircle className="text-green-400 mr-3" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/challenge'}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                Start Playing!
              </button>
              <div>
                <button
                  onClick={() => window.location.href = '/ai-quiz'}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Take More Quizzes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'completed') {
    const levelInfo = getLevelInfo(userLevel);

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <GameHeader showBackButton={true} backPath="/challenge" />

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <FaCheckCircle className="text-6xl text-green-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-white mb-2">
              You have already completed the assessment.
            </h1>
            <p className="text-gray-300 mb-4">
              Your current level: <span className={`font-bold ${levelInfo.color}`}>{levelInfo.name}</span>
            </p>
            <p className="text-gray-400 text-sm mb-8">
              The Knowledge Assessment can only be taken once per account.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/challenge'}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
              >
                Start Playing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LevelAssessmentPage;
