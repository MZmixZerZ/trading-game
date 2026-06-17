import React, { useState } from 'react';
import GameHeader from '../../components/common/GameHeader';
import AIQuizGrader from '../../components/quiz/AIQuizGrader';
import { FaBrain, FaPlus, FaMinus, FaRobot } from 'react-icons/fa';

const AIQuizPage = () => {
  const [quizQuestions, setQuizQuestions] = useState([
    {
      question: "อธิบายความแตกต่างระหว่าง Limit Order และ Market Order",
      type: "short_answer",
      correctAnswer: "Limit Order คือการสั่งซื้อขายหุ้นโดยกำหนดราคาสูงสุดหรือต่ำสุดที่ยอมรับได้ ส่วน Market Order คือการสั่งซื้อขายทันทีด้วยราคาตลาดในขณะนั้น",
      rubric: "ความถูกต้องของนิยาม (50%), การอธิบายความแตกต่าง (30%), การยกตัวอย่าง (20%)"
    },
    {
      question: "การใช้ Stop Loss มีประโยชน์อย่างไรในการเทรด?",
      type: "short_answer",
      correctAnswer: "Stop Loss ช่วยจำกัดความเสียหาย โดยการขายหุ้นอัตโนมัติเมื่อราคาลดลงถึงจุดที่กำหนด",
      rubric: "ความเข้าใจแนวคิด (40%), การอธิบายประโยชน์ (40%), ตัวอย่างการใช้งาน (20%)"
    },
    {
      question: "P/E Ratio คืออะไร และใช้วิเคราะห์หุ้นอย่างไร?",
      type: "essay",
      correctAnswer: "P/E Ratio หรือ Price to Earnings Ratio คือตัวชี้วัดที่แสดงราคาหุ้นเทียบกับกำไรต่อหุ้น ใช้ประเมินว่าหุ้นแพงหรือถูก",
      rubric: "นิยาม P/E Ratio (25%), สูตรการคำนวณ (25%), การตอบโต้วิเคราะห์ (25%), ตัวอย่างการใช้งาน (25%)"
    },
    {
      question: "ถ้าคุณมีเงิน 100,000 บาท จะลงทุนในหุ้นไทยอย่างไร?",
      type: "essay",
      correctAnswer: "ควรกระจายความเสี่ยงโดยเลือกหุ้นจากหลายกลุ่มอุตสาหกรรม ศึกษาข้อมูลบริษัท และมีแผนการลงทุนระยะยาว",
      rubric: "กลยุทธ์การกระจายความเสี่ยง (30%), การวิเคราะห์หุ้น (30%), การจัดการเงิน (25%), ความสมเหตุสมผล (15%)"
    }
  ]);

  const [isCustomQuiz, setIsCustomQuiz] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    type: 'short_answer',
    correctAnswer: '',
    rubric: '',
    choices: ['', '', '', '']
  });

  const handleAddQuestion = () => {
    if (newQuestion.question.trim()) {
      setQuizQuestions([...quizQuestions, { ...newQuestion }]);
      setNewQuestion({
        question: '',
        type: 'short_answer',
        correctAnswer: '',
        rubric: '',
        choices: ['', '', '', '']
      });
    }
  };

  const handleRemoveQuestion = (index) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const handleQuizComplete = (report) => {
    // Handle quiz completion (save to database, navigate, etc.)
  };

  const sampleQuestions = [
    {
      question: "หุ้น Blue Chip หมายถึงอะไร?",
      type: "multiple_choice",
      choices: [
        "หุ้นของบริษัทขนาดใหญ่ที่มีเสถียรภาพสูง",
        "หุ้นที่มีราคาสูงที่สุดในตลาด",
        "หุ้นที่จ่ายเงินปันผลสูง",
        "หุ้นเทคโนโลยี"
      ],
      correctAnswer: "หุ้นของบริษัทขนาดใหญ่ที่มีเสถียรภาพสูง"
    },
    {
      question: "ปัจจัยใดที่มีผลต่อราคาหุ้นมากที่สุด?",
      type: "multiple_choice",
      choices: [
        "สีของโลโก้บริษัท",
        "ผลประกอบการและแนวโน้มธุรกิจ",
        "จำนวนพนักงาน",
        "ที่ตั้งสำนักงานใหญ่"
      ],
      correctAnswer: "ผลประกอบการและแนวโน้มธุรกิจ"
    }
  ];

  if (isCustomQuiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <GameHeader showBackButton={true} backPath="/quiz" />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <FaRobot className="text-5xl text-purple-400 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-white mb-2">สร้างแบบทดสอบ AI</h1>
              <p className="text-gray-300">สร้างคำถามและให้ AI ตรวจคำตอบ</p>
            </div>

            {/* Question Builder */}
            <div className="bg-gray-800 p-6 rounded-xl mb-6">
              <h2 className="text-xl font-bold text-white mb-4">เพิ่มคำถามใหม่</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    ประเภทคำถาม
                  </label>
                  <select
                    value={newQuestion.type}
                    onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                    className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="short_answer">คำตอบสั้น</option>
                    <option value="essay">อธิบาย/เรียงความ</option>
                    <option value="multiple_choice">ปรนัย</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  คำถาม
                </label>
                <textarea
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  placeholder="พิมพ์คำถาม..."
                  className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
                  rows={3}
                />
              </div>

              {newQuestion.type === 'multiple_choice' && (
                <div className="mb-4">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    ตัวเลือก
                  </label>
                  {newQuestion.choices.map((choice, index) => (
                    <input
                      key={`choice-input-${index}`}
                      type="text"
                      value={choice}
                      onChange={(e) => {
                        const newChoices = [...newQuestion.choices];
                        newChoices[index] = e.target.value;
                        setNewQuestion({ ...newQuestion, choices: newChoices });
                      }}
                      placeholder={`ตัวเลือก ${index + 1}`}
                      className="w-full p-2 mb-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  ))}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  เฉลย/คำตอบที่ต้องการ
                </label>
                {newQuestion.type === 'multiple_choice' ? (
                  <select
                    value={newQuestion.correctAnswer}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                    className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">เลือกคำตอบที่ถูกต้อง</option>
                    {newQuestion.choices.filter(c => c.trim()).map((choice, index) => (
                      <option key={`choice-${index}-${choice.slice(0, 10)}`} value={choice}>{choice}</option>
                    ))}
                  </select>
                ) : (
                  <textarea
                    value={newQuestion.correctAnswer}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                    placeholder="คำตอบที่ต้องการ (สำหรับ AI อ้างอิง)"
                    className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
                    rows={2}
                  />
                )}
              </div>

              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  เกณฑ์การให้คะแนน (Rubric)
                </label>
                <textarea
                  value={newQuestion.rubric}
                  onChange={(e) => setNewQuestion({ ...newQuestion, rubric: e.target.value })}
                  placeholder="เกณฑ์ที่ AI จะใช้ตรวจคำตอบ เช่น ความถูกต้อง (50%), ความครบถ้วน (30%), ความชัดเจน (20%)"
                  className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
                  rows={2}
                />
              </div>

              <button
                onClick={handleAddQuestion}
                disabled={!newQuestion.question.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <FaPlus />
                เพิ่มคำถาม
              </button>
            </div>

            {/* Current Questions */}
            <div className="bg-gray-800 p-6 rounded-xl mb-6">
              <h2 className="text-xl font-bold text-white mb-4">คำถามที่เพิ่มแล้ว ({quizQuestions.length} ข้อ)</h2>
              
              {quizQuestions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">ยังไม่มีคำถาม กรุณาเพิ่มคำถามด้านบน</p>
              ) : (
                <div className="space-y-4">
                  {quizQuestions.map((q, index) => (
                    <div key={`question-${index}-${q.question.slice(0, 20)}`} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-blue-400 font-bold">ข้อ {index + 1}</span>
                        <button
                          onClick={() => handleRemoveQuestion(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <FaMinus />
                        </button>
                      </div>
                      <p className="text-white mb-2">{q.question}</p>
                      <p className="text-gray-400 text-sm">ประเภท: {q.type}</p>
                      {q.choices && q.choices.some(c => c.trim()) && (
                        <div className="text-gray-400 text-sm mt-1">
                          ตัวเลือก: {q.choices.filter(c => c.trim()).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setIsCustomQuiz(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                ใช้คำถามตัวอย่าง
              </button>
              
              {quizQuestions.length > 0 && (
                <button
                  onClick={() => {
                    // Start custom quiz
                    setIsCustomQuiz(false);
                  }}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  เริ่มทำแบบทดสอบ ({quizQuestions.length} ข้อ)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <GameHeader showBackButton={true} backPath="/quiz" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <FaBrain className="text-5xl text-blue-400 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">แบบทดสอบ AI</h1>
          <p className="text-gray-300">ระบบตรวจคำตอบอัตโนมัติด้วย Gemini AI</p>
        </div>

        {/* Quiz Options */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 p-6 rounded-xl text-center">
              <div className="text-3xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-white mb-2">แบบทดสอบตัวอย่าง</h3>
              <p className="text-gray-300 mb-4">คำถามเกี่ยวกับการเทรดและการลงทุน</p>
              <p className="text-blue-400 text-sm mb-4">{quizQuestions.length} คำถาม</p>
              <button
                onClick={() => setIsCustomQuiz(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors w-full"
              >
                เริ่มทำแบบทดสอบ
              </button>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl text-center">
              <div className="text-3xl mb-4">🛠️</div>
              <h3 className="text-xl font-bold text-white mb-2">สร้างแบบทดสอบ</h3>
              <p className="text-gray-300 mb-4">สร้างคำถามเองและให้ AI ตรวจ</p>
              <p className="text-purple-400 text-sm mb-4">ปรับแต่งได้ตามต้องการ</p>
              <button
                onClick={() => setIsCustomQuiz(true)}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors w-full"
              >
                สร้างแบบทดสอบ
              </button>
            </div>
          </div>
        </div>

        {/* Sample Questions Preview */}
        <div className="max-w-4xl mx-auto mb-8">
          <h2 className="text-xl font-bold text-white mb-4 text-center">ตัวอย่างคำถาม</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sampleQuestions.map((q, index) => (
              <div key={`sample-${index}-${q.question.slice(0, 15)}`} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-400 font-bold">ตัวอย่าง {index + 1}</span>
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded text-white">
                    {q.type === 'multiple_choice' ? 'ปรนัย' : 'อัตนัย'}
                  </span>
                </div>
                <p className="text-white text-sm">{q.question}</p>
                {q.choices && (
                  <div className="mt-2 text-xs text-gray-400">
                    ตัวเลือก: {q.choices.slice(0, 2).join(', ')}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Quiz Component */}
        <AIQuizGrader 
          questions={[...quizQuestions, ...sampleQuestions]}
          onGradingComplete={handleQuizComplete}
          autoGrade={false}
        />
      </div>
    </div>
  );
};

export default AIQuizPage;
