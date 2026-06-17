import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import GameHeader from '../../components/common/GameHeader';
import { FaHistory, FaTrophy, FaChartLine, FaClock } from 'react-icons/fa';

const QuizHistoryPage = () => {
  const { user } = useAuth();
  const { quizHistory, loading, fetchQuizHistory } = useUserProfile();
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    if (user?.uid) {
      fetchQuizHistory(user.uid);
      setDebugInfo(`User ID: ${user.uid}, Email: ${user.email}`);
    }
  }, [user, fetchQuizHistory]);

  // เพิ่ม effect สำหรับ refresh ข้อมูลเมื่อหน้าถูกโฟกัส
  useEffect(() => {
    const handleFocus = () => {
      if (user?.uid) {
        console.log('🔄 Refreshing quiz history on window focus');
        fetchQuizHistory(user.uid);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, fetchQuizHistory]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getQuizTypeBadge = (type) => {
    const badges = {
      'level_assessment': { text: 'วัดระดับ', color: 'bg-purple-600' },
      'practice': { text: 'ฝึกหัด', color: 'bg-blue-600' },
      'general': { text: 'ทั่วไป', color: 'bg-green-600' }
    };
    return badges[type] || badges.general;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <GameHeader showBackButton={true} backPath="/challenge" />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-white mt-4">กำลังโหลด...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <GameHeader showBackButton={true} backPath="/challenge" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <FaHistory className="text-5xl text-blue-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">ประวัติการทำ Quiz</h1>
            <p className="text-gray-300">ติดตามความก้าวหน้าและผลการเรียนรู้ของคุณ</p>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="bg-gray-800 p-4 rounded-lg mb-6">
              <p className="text-gray-300 text-sm">{debugInfo}</p>
            </div>
          )}

          {/* Summary Stats */}
          {quizHistory && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <FaTrophy className="text-3xl text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{quizHistory.totalQuizzes}</div>
                <div className="text-gray-400">Quiz ทั้งหมด</div>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <FaChartLine className="text-3xl text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {Math.round((quizHistory.averageScore || 0) * 100)}%
                </div>
                <div className="text-gray-400">คะแนนเฉลี่ย</div>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <FaClock className="text-3xl text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {quizHistory.levelAssessmentDone ? 'เสร็จแล้ว' : 'ยังไม่ได้ทำ'}
                </div>
                <div className="text-gray-400">แบบประเมินระดับ</div>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <div className="text-3xl mb-2">📅</div>
                <div className="text-sm font-bold text-white">
                  {quizHistory.lastQuizDate ? 
                    formatDate(quizHistory.lastQuizDate).split(' ')[0] : 
                    'ยังไม่เคย'
                  }
                </div>
                <div className="text-gray-400">Quiz ล่าสุด</div>
              </div>
            </div>
          )}

          {/* Quiz History List */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">รายการ Quiz</h2>
            
            {!quizHistory || quizHistory.quizzes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-white mb-2">ยังไม่มีประวัติการทำ Quiz</h3>
                <p className="text-gray-400 mb-6">เริ่มทำแบบทดสอบเพื่อติดตามความก้าวหน้าของคุณ</p>
                <div className="space-x-4">
                  <button
                    onClick={() => window.location.href = '/level-assessment'}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    ทำแบบประเมินระดับ
                  </button>
                  <button
                    onClick={() => window.location.href = '/ai-quiz'}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    ทำ AI Quiz
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {quizHistory.quizzes.slice().reverse().map((quiz, index) => {
                  const badge = getQuizTypeBadge(quiz.quizType);
                  return (
                    <div key={quiz.id || index} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${badge.color}`}>
                            {badge.text}
                          </span>
                          {quiz.isLevelAssessment && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-orange-600">
                              แบบประเมิน
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${quiz.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {Math.round(quiz.score * 100)}%
                          </div>
                          <div className="text-gray-400 text-sm">
                            {formatDate(quiz.date || quiz.timestamp)}
                          </div>
                        </div>
                      </div>
                      
                      {quiz.question && (
                        <div className="mb-2">
                          <p className="text-white font-medium">คำถาม:</p>
                          <p className="text-gray-300 text-sm">{quiz.question}</p>
                        </div>
                      )}
                      
                      {quiz.userAnswer && (
                        <div className="mb-2">
                          <p className="text-white font-medium">คำตอบ:</p>
                          <p className="text-gray-300 text-sm">{quiz.userAnswer}</p>
                        </div>
                      )}
                      
                      {quiz.feedback && (
                        <div>
                          <p className="text-white font-medium">ผลตรวจ:</p>
                          <p className="text-gray-300 text-sm">{quiz.feedback}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="text-center mt-8 space-x-4">
            <button
              onClick={() => window.location.href = '/ai-quiz'}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
            >
              ทำ Quiz ใหม่
            </button>
            <button
              onClick={() => window.location.href = '/level-assessment'}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
            >
              ทำแบบประเมินอีกครั้ง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizHistoryPage;
