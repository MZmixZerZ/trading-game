import React, { useState, useEffect, useCallback } from 'react';
import { GeminiQuizService } from '../../services/geminiQuizService';
import { FaRobot, FaCheckCircle, FaTimesCircle, FaSpinner, FaBrain, FaLightbulb } from 'react-icons/fa';

const AIQuizGrader = ({ 
  questions = [], 
  onGradingComplete = () => {},
  autoGrade = false,
  showProgress = false,
  userId = null
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingComplete, setGradingComplete] = useState(false);
  const [report, setReport] = useState(null);

  const handleGradeAll = useCallback(async () => {
    setIsGrading(true);
    
    try {
      const questionsToGrade = questions.map((question, index) => ({
        question: question.question,
        userAnswer: answers[index] || '',
        correctAnswer: question.correctAnswer,
        rubric: question.rubric,
        questionType: question.type || 'short_answer',
        lang: 'th'
      }));

      const gradingResults = await GeminiQuizService.gradeMultipleAnswers(questionsToGrade);
      setResults(gradingResults);
      
      const quizReport = GeminiQuizService.generateQuizReport(gradingResults, questionsToGrade);
      setReport(quizReport);
      setGradingComplete(true);
      
      onGradingComplete(quizReport);
      
    } catch (error) {
      console.error('Error grading all questions:', error);
      alert('เกิดข้อผิดพลาดในการตรวจคำตอบ');
    } finally {
      setIsGrading(false);
    }
  }, [answers, onGradingComplete, questions]);

  // Auto-grade เมื่อมีการตอบครบทุกข้อ
  useEffect(() => {
    if (autoGrade && Object.keys(answers).length === questions.length) {
      handleGradeAll();
    }
  }, [answers, autoGrade, handleGradeAll, questions.length]);

  const handleAnswerChange = (questionIndex, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleGradeSingle = async (questionIndex) => {
    const question = questions[questionIndex];
    const userAnswer = answers[questionIndex];

    if (!userAnswer || !userAnswer.trim()) {
      alert('กรุณาตอบคำถามก่อนตรวจคำตอบ');
      return;
    }

    setIsGrading(true);
    
    try {
      const result = await GeminiQuizService.gradeAnswer({
        question: question.question,
        userAnswer: userAnswer,
        correctAnswer: question.correctAnswer,
        rubric: question.rubric,
        questionType: question.type || 'short_answer',
        lang: 'th',
        userId: userId,
        saveToHistory: false // ไม่บันทึกคำถามเดี่ยว
      });

      setResults(prev => {
        const newResults = [...prev];
        newResults[questionIndex] = result;
        return newResults;
      });

    } catch (error) {
      console.error('Error grading question:', error);
      alert('เกิดข้อผิดพลาดในการตรวจคำตอบ');
    } finally {
      setIsGrading(false);
    }
  };

  // keep function reference for buttons

  const getQuestionIcon = (type) => {
    switch (type) {
      case 'multiple_choice': return '🔘';
      case 'short_answer': return '✏️';
      case 'essay': return '📝';
      default: return '❓';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (gradingComplete && report) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-900 rounded-xl">
        {/* Quiz Report */}
        <div className="text-center mb-6">
          <FaBrain className="text-4xl text-blue-400 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-white">รายงานผลการสอบ</h2>
          <p className="text-gray-300">ตรวจโดย AI Assistant</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">{report.summary.totalQuestions}</div>
            <div className="text-gray-300">ข้อทั้งหมด</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400">{report.summary.correctAnswers}</div>
            <div className="text-gray-300">ตอบถูก</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-400">{report.summary.incorrectAnswers}</div>
            <div className="text-gray-300">ตอบผิด</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg text-center">
            <div className={`text-2xl font-bold ${report.summary.averageScore >= 60 ? 'text-green-400' : 'text-red-400'}`}>
              {report.summary.averageScore}%
            </div>
            <div className="text-gray-300">คะแนนเฉลี่ย</div>
          </div>
        </div>

        {/* Pass/Fail Status */}
        <div className={`p-4 rounded-lg mb-6 text-center ${
          report.summary.passStatus === 'ผ่าน' 
            ? 'bg-green-900/30 border border-green-500' 
            : 'bg-red-900/30 border border-red-500'
        }`}>
          <div className={`text-xl font-bold ${
            report.summary.passStatus === 'ผ่าน' ? 'text-green-400' : 'text-red-400'
          }`}>
            {report.summary.passStatus === 'ผ่าน' ? '🎉 ผ่านการสอบ!' : '😔 ไม่ผ่านการสอบ'}
          </div>
          <div className="text-gray-300 mt-2">
            {report.summary.passStatus === 'ผ่าน' 
              ? 'ยินดีด้วย! คุณมีความเข้าใจในเนื้อหาเป็นอย่างดี' 
              : 'ควรทบทวนเนื้อหาและลองทำแบบทดสอบอีกครั้ง'
            }
          </div>
        </div>

        {/* Detailed Results */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xl font-bold text-white">รายละเอียดคำตอบ</h3>
          {report.details.map((detail, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-bold">ข้อ {detail.questionNumber}</span>
                  {detail.result.isCorrect ? (
                    <FaCheckCircle className="text-green-400" />
                  ) : (
                    <FaTimesCircle className="text-red-400" />
                  )}
                  {detail.aiUsed && <FaRobot className="text-purple-400" title="ตรวจด้วย AI" />}
                </div>
                <span className={`font-bold ${getScoreColor(detail.result.score)}`}>
                  {Math.round(detail.result.score * 100)}%
                </span>
              </div>
              
              <div className="text-gray-300 mb-2">
                <strong>คำถาม:</strong> {detail.question}
              </div>
              
              <div className="text-gray-300 mb-2">
                <strong>คำตอบ:</strong> {detail.userAnswer}
              </div>
              
              <div className="text-blue-300 mb-1">
                <strong>ความเห็น:</strong> {detail.result.feedback}
              </div>
              
              {detail.result.suggestions && (
                <div className="text-yellow-300 text-sm">
                  <FaLightbulb className="inline mr-1" />
                  <strong>คำแนะนำ:</strong> {detail.result.suggestions}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="bg-blue-900/30 border border-blue-500 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-blue-400 mb-2">คำแนะนำ</h3>
            <ul className="text-gray-300 space-y-1">
              {report.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => {
              setGradingComplete(false);
              setResults([]);
              setReport(null);
              setCurrentQuestion(0);
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            ทำใหม่
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            พิมพ์ผล
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const currentAnswer = answers[currentQuestion] || '';
  const currentResult = results[currentQuestion];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 rounded-xl">
      {/* Header */}
      <div className="text-center mb-6">
        <FaRobot className="text-4xl text-purple-400 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-white">แบบทดสอบ AI</h2>
        <p className="text-gray-300">ตรวจคำตอบด้วย Gemini AI</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-300 mb-2">
          <span>ข้อ {currentQuestion + 1} จาก {questions.length}</span>
          <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      {currentQ && (
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{getQuestionIcon(currentQ.type)}</span>
            <span className="text-blue-400 font-bold">ข้อ {currentQuestion + 1}</span>
            <span className="text-gray-400 text-sm">({currentQ.type || 'short_answer'})</span>
          </div>
          
          <h3 className="text-lg font-semibold text-white mb-4">
            {currentQ.question}
          </h3>

          {/* Answer Input */}
          {currentQ.type === 'multiple_choice' ? (
            <div className="space-y-2">
              {currentQ.choices?.map((choice, index) => (
                <label key={index} className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQuestion}`}
                    value={choice}
                    checked={currentAnswer === choice}
                    onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                    className="text-blue-500"
                  />
                  {choice}
                </label>
              ))}
            </div>
          ) : (
            <textarea
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
              placeholder="พิมพ์คำตอบของคุณที่นี่..."
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
              rows={currentQ.type === 'essay' ? 6 : 3}
            />
          )}

          {/* Grade Single Question */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => handleGradeSingle(currentQuestion)}
              disabled={isGrading || !currentAnswer.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {isGrading ? <FaSpinner className="animate-spin" /> : <FaRobot />}
              ตรวจข้อนี้
            </button>

            {currentResult && (
              <div className="flex items-center gap-2">
                {currentResult.success ? (
                  <>
                    {currentResult.data.isCorrect ? (
                      <FaCheckCircle className="text-green-400" />
                    ) : (
                      <FaTimesCircle className="text-red-400" />
                    )}
                    <span className={`font-bold ${getScoreColor(currentResult.data.score)}`}>
                      {Math.round(currentResult.data.score * 100)}%
                    </span>
                  </>
                ) : (
                  <span className="text-red-400">ตรวจไม่ได้</span>
                )}
              </div>
            )}
          </div>

          {/* Result Display */}
          {currentResult && currentResult.success && (
            <div className="mt-4 p-4 bg-gray-700 rounded-lg">
              <div className="text-blue-300 mb-2">
                <strong>ผลการตรวจ:</strong> {currentResult.data.feedback}
              </div>
              {currentResult.data.suggestions && (
                <div className="text-yellow-300 text-sm">
                  <FaLightbulb className="inline mr-1" />
                  <strong>คำแนะนำ:</strong> {currentResult.data.suggestions}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevQuestion}
          disabled={currentQuestion === 0}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors"
        >
          ← ก่อนหน้า
        </button>

        {/* Grade All Button */}
        {Object.keys(answers).length === questions.length && (
          <button
            onClick={handleGradeAll}
            disabled={isGrading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isGrading ? <FaSpinner className="animate-spin" /> : <FaBrain />}
            ตรวจทั้งหมด
          </button>
        )}

        <button
          onClick={handleNextQuestion}
          disabled={currentQuestion === questions.length - 1}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors"
        >
          ถัดไป →
        </button>
      </div>
    </div>
  );
};

export default AIQuizGrader;
