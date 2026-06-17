import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import QuizSystem from '../../components/quiz/QuizSystem';
import PageTransition from '../../components/common/PageTransition';

export default function PracticeQuizPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { saveQuizResult } = useUserProfile();
  const [showWelcome, setShowWelcome] = useState(true);

  const handleQuizComplete = async (results) => {
    try {
      // บันทึกผลลัพธ์ Practice Quiz ลงฐานข้อมูล
      if (currentUser && saveQuizResult) {
        const quizData = {
          score: results.totalScore,
          maxScore: results.maxScore,
          percentage: results.percentage,
          timeElapsed: results.timeElapsed,
          difficulty: results.recommendedLevel,
          answers: results.answers,
          questionsUsed: results.questionsUsed,
          mode: 'practice',
          completedAt: new Date().toISOString()
        };
        
        console.log('📊 Saving Practice Quiz result:', quizData);
        await saveQuizResult(currentUser.uid, quizData, false); // isLevelAssessment = false สำหรับ Practice
        
        console.log('✅ Practice Quiz result saved successfully');
      }
      
      // แสดงผลลัพธ์หรือ navigate ไปหน้าอื่น
      // อาจจะแสดง popup ผลลัพธ์
    } catch (error) {
      console.error('❌ Error saving practice quiz result:', error);
    }
  };

  const handleBackToMenu = () => {
    navigate('/main-menu');
  };

  if (showWelcome) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
          <div className="max-w-4xl mx-auto">
            {/* Main Welcome Card */}
            <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl rounded-3xl p-8 lg:p-12 border border-white/20 shadow-2xl relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 left-0 w-full h-full opacity-20">
                <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-xl"></div>
                <div className="absolute bottom-10 left-10 w-40 h-40 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-xl"></div>
              </div>
              
              <div className="relative z-10 text-center">
                {/* Header */}
                <div className="mb-10">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl mb-8 shadow-2xl">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                    Practice Quiz
                  </h1>
                  <p className="text-xl lg:text-2xl text-purple-200 leading-relaxed">
                    Practice investment knowledge an unlimited number of times
                  </p>
                </div>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
                    <div className="text-3xl font-bold text-purple-300 mb-3">12</div>
                    <div className="text-purple-200 text-lg">Total Questions</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
                    <div className="text-3xl font-bold text-blue-300 mb-3">3/5</div>
                    <div className="text-purple-200 text-lg">Randomized per Level</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
                    <div className="text-3xl font-bold text-pink-300 mb-3">∞</div>
                    <div className="text-purple-200 text-lg">Unlimited Practice</div>
                  </div>
                </div>

                {/* Features Section */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 mb-10 border border-white/10">
                  <h3 className="text-2xl font-semibold text-white mb-6">Highlights of Practice Quiz</h3>
                  <div className="grid md:grid-cols-2 gap-6 text-left">
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg"></div>
                      <span className="text-purple-200 text-lg">Unlimited Practice</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg"></div>
                      <span className="text-purple-200 text-lg">Randomized Questions Every Time</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg"></div>
                      <span className="text-purple-200 text-lg">Does Not Affect Level Assessment</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg"></div>
                      <span className="text-purple-200 text-lg">Focus on Learning</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <button
                    onClick={handleBackToMenu}
                    className="px-10 py-4 bg-gray-600/80 hover:bg-gray-500 border border-gray-500/50 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 text-lg shadow-lg"
                  >
                    ← Home
                  </button>
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-xl text-lg"
                  >
                    Start Practicing →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <QuizSystem 
        mode="practice"
        onQuizComplete={handleQuizComplete}
        onBack={handleBackToMenu}
      />
    </PageTransition>
  );
}
