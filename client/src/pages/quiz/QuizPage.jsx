import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../contexts/UserProfileContext';
import QuizSystem from '../../components/quiz/QuizSystem';
import PageTransition from '../../components/common/PageTransition';

export default function QuizPage() {
	const navigate = useNavigate();
	const { currentUser, hasCompletedAssessment, markAssessmentCompleted } = useAuth();
	const { saveQuizResult } = useUserProfile();
	const [phase, setPhase] = useState('welcome'); // welcome | quiz | completed

	// เช็คว่าเคยทำ Assessment Quiz แล้วหรือยัง
	const alreadyCompleted = hasCompletedAssessment();

	const handleQuizComplete = async (results) => {
		try {
			// บันทึกผลลัพธ์ลงฐานข้อมูล
			if (currentUser && saveQuizResult) {
				const quizData = {
					score: results.totalScore,
					maxScore: results.maxScore,
					percentage: results.percentage,
					timeElapsed: results.timeElapsed,
					difficulty: results.recommendedLevel,
					answers: results.answers,
					questionsUsed: results.questionsUsed,
					mode: 'assessment',
					completedAt: new Date().toISOString()
				};
				
				console.log('📊 Saving Assessment Quiz result:', quizData);
				await saveQuizResult(currentUser.uid, quizData, true); // isLevelAssessment = true
				
				console.log('✅ Assessment Quiz result saved successfully');
			}
			
			// บันทึกว่าทำ Assessment Quiz แล้ว
			markAssessmentCompleted();
			
			// ส่งผลลัพธ์ไปยังระบบประมวลผล (เช่น ปลดล็อคระดับ)
			setPhase('completed');
		} catch (error) {
			console.error('❌ Error saving quiz result:', error);
			// ยังคงให้ไปต่อแม้จะ save ไม่ได้
			markAssessmentCompleted();
			setPhase('completed');
		}
	};

	// หากเคยทำแล้ว แสดงหน้าเตือน
	if (alreadyCompleted && phase === 'welcome') {
		return (
			<PageTransition>
				<div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 text-white flex items-center justify-center p-6">
					<div className="max-w-2xl w-full bg-slate-800/70 border border-red-600/50 rounded-3xl p-10 text-center shadow-2xl backdrop-blur-sm">
						<div className="mb-8">
							<div className="text-6xl mb-4">⚠️</div>
							<h1 className="text-4xl font-extrabold mb-4 text-red-400">
								You have completed the Assessment Quiz.
							</h1>
							<div className="w-24 h-1 bg-gradient-to-r from-red-400 to-orange-400 mx-auto rounded-full mb-6"></div>
						</div>
						
						<div className="space-y-4 mb-8">
							<p className="text-2xl text-slate-200">Assessment Quiz can only be taken once per account.</p>
							<div className="bg-red-900/30 border border-red-600/30 rounded-xl p-6 space-y-3">
								<p className="text-red-200">
									If you want to practice more, you can use <strong>Practice Quiz</strong>.
								</p>
								<p className="text-red-200">
									Practice Quiz does not affect your assessment level but helps you improve your knowledge.
								</p>
							</div>
						</div>
						
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<button 
								onClick={() => navigate('/main-menu')} 
								className="px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-xl font-semibold transition-all"
							>
								← Home
							</button>
							<button 
								onClick={() => navigate('/practice-quiz')} 
								className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold transition-all transform hover:scale-105"
							>
								Go Practice Quiz →
							</button>
						</div>
					</div>
				</div>
			</PageTransition>
		);
	}

	if (phase === 'welcome') {
		return (
			<PageTransition>
				<div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white flex items-center justify-center p-6">
					<div className="max-w-2xl w-full bg-slate-800/70 border border-slate-600/50 rounded-3xl p-10 text-center shadow-2xl backdrop-blur-sm">
						<div className="mb-8">
							<h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
								Assessment Quiz
							</h1>
							<div className="w-24 h-1 bg-gradient-to-r from-emerald-400 to-blue-400 mx-auto rounded-full mb-6"></div>
							<p className="text-lg text-yellow-300 font-semibold">⚠️ Can only be done once per account</p>
						</div>
						
						<div className="space-y-4 mb-8">
							<p className="text-2xl text-slate-200">Test your investment knowledge to assess your level</p>
							<div className="bg-slate-700/50 rounded-xl p-6 space-y-3">
								<div className="flex items-center justify-center gap-3 text-slate-300">
									<span className="text-2xl">📝</span>
									<span>12 questions, short answer format</span>
								</div>
								<div className="flex items-center justify-center gap-3 text-slate-300">
									<span className="text-2xl">🎲</span>
									<span>Randomly select 3 out of 5 questions from each level</span>
								</div>
								<div className="flex items-center justify-center gap-3 text-slate-300">
									<span className="text-2xl">📊</span>
									<span>Easy: 3 questions | Medium: 3 questions | Hard: 3 questions | Expert: 3 questions</span>
								</div>
								<div className="flex items-center justify-center gap-3 text-slate-300">
									<span className="text-2xl">❤️</span>
									<span>You have 3 chances to get it wrong</span>
								</div>
								<div className="flex items-center justify-center gap-3 text-slate-300">
									<span className="text-2xl">⭐</span>
								<span>Unlock new levels based on your score</span>
							</div>
						</div>
					</div>
					
					{/* <div className="bg-amber-900/30 border border-amber-600/30 rounded-xl p-4 mb-6">
						<p className="text-amber-200 text-sm">
							<strong>หมายเหตุ:</strong> หากต้องการฝึกฝนเพิ่มเติม สามารถใช้ <strong>Practice Quiz</strong> ได้ไม่จำกัดครั้ง
						</p>
					</div> */}
					
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<button 
							onClick={() => navigate('/main-menu')} 
							className="px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-xl font-semibold transition-all"
						>
							← Home
						</button>
						{/* <button 
							onClick={() => navigate('/practice-quiz')} 
							className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-all"
						>
							🔄 Practice Quiz
						</button> */}
						<button 
							onClick={() => setPhase('quiz')} 
							className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl font-bold text-lg shadow-lg hover:shadow-emerald-500/25 transition-all transform hover:scale-105"
						>
							Start the Assessment!
						</button>
					</div>
				</div>
			</div>
		</PageTransition>
	);
}

	if (phase === 'quiz') {
		return (
			<PageTransition>
				<QuizSystem 
					mode="assessment"
					onQuizComplete={handleQuizComplete}
					onBack={() => setPhase('welcome')}
				/>
			</PageTransition>
		);
	}

	// Completed phase
	return (
		<PageTransition>
			<div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white flex items-center justify-center p-6">
				<div className="max-w-xl w-full bg-slate-800/70 border border-slate-600/50 rounded-3xl p-10 text-center shadow-2xl backdrop-blur-sm">
					<h2 className="text-3xl font-bold mb-6">Assessment Quiz Completed!</h2>
					<p className="text-slate-300 mb-8">Thank you for completing the investment knowledge assessment. Your level has been recorded.</p>
					
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						{/* <button 
							onClick={() => navigate('/practice-quiz')} 
							className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold transition-all"
						>
							🔄 Practice Quiz
						</button> */}
						<button 
							onClick={() => navigate('/solo')} 
							className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all"
						>
							Go to Challenge page
						</button>
					</div>
				</div>
			</div>
		</PageTransition>
	);
}