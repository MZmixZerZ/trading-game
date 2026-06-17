import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const UserProfileContext = createContext();

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return context;
};

export const UserProfileProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [quizHistory, setQuizHistory] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

  // สร้าง headers พร้อม XSRF Token
  const createHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // ดึง XSRF Token จาก cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    if (cookies['XSRF-TOKEN']) {
      headers['X-XSRF-TOKEN'] = decodeURIComponent(cookies['XSRF-TOKEN']);
    }
    
    return headers;
  };

  // ดึงข้อมูล Profile
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
        headers: createHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  // ดึงประวัติ Quiz
  const fetchQuizHistory = useCallback(async (userId) => {
    if (!userId) return;
    
    try {
      console.log('🔍 Fetching quiz history for user:', userId);
      const response = await fetch(`${API_BASE_URL}/api/quiz/history/${userId}`, {
        headers: createHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📝 Quiz history received:', data);
        setQuizHistory(data);
      } else {
        console.error('❌ Failed to fetch quiz history, status:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching quiz history:', error);
    }
  }, [API_BASE_URL]);

  // อัปเดต Profile
  const updateProfile = useCallback(async (userId, updates) => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
        method: 'PUT',
        headers: createHeaders(),
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        return data;
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  }, [API_BASE_URL]);

  // บันทึกประวัติ Quiz
  const saveQuizResult = useCallback(async (userId, quizData, isLevelAssessment = false) => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/quiz/history/${userId}`, {
        method: 'POST',
        headers: createHeaders(),
        body: JSON.stringify({
          quizData,
          isLevelAssessment,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuizHistory(data);
        
        // ดึงข้อมูลประวัติ Quiz ใหม่เพื่อให้แน่ใจว่าข้อมูลล่าสุด
        await fetchQuizHistory(userId);
        
        return data;
      } else {
        console.error('❌ Failed to save quiz result, status:', response.status);
      }
    } catch (error) {
      console.error('❌ Error saving quiz result:', error);
    }
  }, [API_BASE_URL, fetchQuizHistory]);

  // ตรวจสอบว่าทำ Level Assessment แล้วหรือยัง
  const hasCompletedLevelAssessment = () => {
    return quizHistory?.levelAssessmentDone || false;
  };

  // คำนวณระดับ
  const calculateUserLevel = () => {
    if (!quizHistory || quizHistory.totalQuizzes === 0) return 'beginner';
    
    const avgScore = quizHistory.averageScore;
    if (avgScore >= 0.8) return 'advanced';
    if (avgScore >= 0.6) return 'intermediate';
    return 'beginner';
  };

  // แนะนำคำถามตามระดับ
  const getRecommendedDifficulty = () => {
    const level = calculateUserLevel();
    switch (level) {
      case 'advanced': return 'hard';
      case 'intermediate': return 'medium';
      default: return 'easy';
    }
  };

  // โหลดข้อมูลเมื่อ user เปลี่ยน
  useEffect(() => {
    if (currentUser?.uid) {
      fetchProfile(currentUser.uid);
      fetchQuizHistory(currentUser.uid);
    } else {
      setProfile(null);
      setQuizHistory(null);
    }
  }, [currentUser, fetchProfile, fetchQuizHistory]);

  const value = {
    profile,
    quizHistory,
    loading,
    fetchProfile,
    fetchQuizHistory,
    updateProfile,
    saveQuizResult,
    hasCompletedLevelAssessment,
    calculateUserLevel,
    getRecommendedDifficulty,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};
