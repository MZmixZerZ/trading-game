import React from 'react';
import { useNavigate } from 'react-router-dom';
import TutorialPretestSystem from '../../components/quiz/TutorialPretestSystem';
import { useAuth } from '../../contexts/AuthContext';

export default function TutorialPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleTutorialComplete = (unlockedLevels, recommendedStartLevel) => {
    // บันทึกข้อมูลผลลัพธ์ Tutorial ลง Firebase หรือ localStorage
    const tutorialResults = {
      userId: currentUser?.uid,
      unlockedLevels,
      recommendedStartLevel,
      completedAt: new Date().toISOString()
    };

    // บันทึกลง localStorage สำหรับใช้งานชั่วคราว
    localStorage.setItem('tutorialResults', JSON.stringify(tutorialResults));
    
    // นำทางไปหน้า Quiz
    navigate('/quiz', { 
      state: { 
        tutorialCompleted: true,
        unlockedLevels,
        recommendedStartLevel
      }
    });
  };

  const handleBack = () => {
    navigate('/challenge');
  };

  return (
    <TutorialPretestSystem
      onBack={handleBack}
      onTutorialComplete={handleTutorialComplete}
      isNewUser={true}
    />
  );
}
