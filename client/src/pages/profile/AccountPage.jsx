/**
 * AccountPage.jsx - หน้าบัญชีผู้ใช้และการจัดการโปรไฟล์
 * 
 * หน้าที่หลัก:
 * 1. แสดงข้อมูลส่วนตัวของผู้ใช้ (ชื่อ, อีเมล, รูปโปรไฟล์)
 * 2. แสดงสถิติการเล่นเกม Solo Challenge
 * 3. แสดงฉายา/นิคเนมที่ได้รับจากการเล่นเกม
 * 4. อนุญาตให้แก้ไขข้อมูลส่วนตัว
 * 5. จัดการการออกจากระบบ
 * 
 * Features:
 * - ระบบแสดงผลฉายาแบบ rarity (common, uncommon, rare, legendary)
 * - สถิติการเล่นแบบรายละเอียด
 * - อัปโหลดรูปโปรไฟล์ผ่าน Firebase Storage
 * - แก้ไขชื่อผู้ใช้แบบ real-time
 */

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabaseClient";
import GameHeader from "../../components/common/GameHeader";
import { CircleUserRound, Trophy, Star, Award, Target, Brain, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DIFFICULTY_NICKNAMES, getHighestNickname, getAllEarnedNicknames, RARITY_COLORS, RARITY_BORDERS, RARITY_BACKGROUNDS } from "../../constants/nicknames";
import { useUserProfile } from "../../contexts/UserProfileContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

export default function AccountPage() {
  const navigate = useNavigate();
  const { currentUser: authUser, logout } = useAuth();
  const { quizHistory, loading: profileLoading, fetchProfile, fetchQuizHistory } = useUserProfile();

  const [user, setUser] = useState(null);
  
  /** @type {string} ข้อความแสดงข้อผิดพลาด */
  const [error, setError] = useState("");

  /** @type {boolean} สถานะการโหลดข้อมูล */
  const [isLoading, setIsLoading] = useState(false);

  /** @type {boolean} สถานะการแก้ไขโปรไฟล์ */
  const [isEditing, setIsEditing] = useState(false);

  const refreshUserData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Refresh Firebase data
      await fetchUserProfile(user.uid);
      
      // Refresh Quiz data from API
      if (fetchProfile && fetchQuizHistory) {
        await fetchProfile(user.uid);
        await fetchQuizHistory(user.uid);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, fetchProfile, fetchQuizHistory]); // เปลี่ยนจาก user เป็น user?.uid
  
  /** @type {string} ชื่อเต็มของผู้ใช้ */
  const [fullname, setFullname] = useState("");
  
  /** @type {string} URL รูปโปรไฟล์ */
  const [avatar, setAvatar] = useState("");
  
  /** @type {Object} สถิติการเล่น Solo Challenge */
  const [soloStats, setSoloStats] = useState({
    currentLevel: 'tutorial',
    completedLevels: [],
    totalChallenges: 0,
    winRate: 0,
    earnedNicknames: [],
    currentNickname: null,
    // เพิ่มข้อมูลสถิติใหม่
    soloScore: 0,
    soloGamesPlayed: 0,
    soloGamesWon: 0,
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    lastPlayedSolo: null
  });

  /** @type {Object} สถิติการทำ Quiz */
  const [quizStats, setQuizStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    bestScore: 0,
    completedQuizzes: 0,
    levelAssessmentDone: false,
    userLevel: 'beginner',
    lastQuizDate: null,
    quizStreak: 0
  });

  // ========== Difficulty Levels Configuration - การตั้งค่าระดับความยาก ==========
  
  /**
   * ข้อมูลระดับความยากทั้งหมด
   * ใช้สำหรับแสดงผลสถิติและความก้าวหน้า
   */
  const difficultyLevels = [
    { 
      id: 'tutorial', 
      name: 'Tutorial', 
      description: 'เรียนรู้พื้นฐาน',
      color: 'green',
      icon: '🌱',
      profitTarget: 20000,
      profitTargetPercent: 2.0,
      timeLimit: 600
    },
    { 
      id: 'easy', 
      name: 'Easy', 
      description: 'ระดับง่าย',
      color: 'blue',
      icon: '📈',
      profitTarget: 30000,
      profitTargetPercent: 3.0,
      timeLimit: 300
    },
    { 
      id: 'medium', 
      name: 'Medium', 
      description: 'ระดับกลาง',
      color: 'yellow',
      icon: '⚡',
      profitTarget: 40000,
      profitTargetPercent: 4.0,
      timeLimit: 240
    },
    { 
      id: 'hard', 
      name: 'Hard', 
      description: 'ระดับยาก',
      color: 'orange',
      icon: '🚀',
      profitTarget: 50000,
      profitTargetPercent: 5.0,
      timeLimit: 180
    },
    { 
      id: 'expert', 
      name: 'Expert', 
      description: 'ระดับผู้เชี่ยวชาญ',
      color: 'red',
      icon: '👑',
      profitTarget: 70000,
      profitTargetPercent: 7.0,
      timeLimit: 120
    }
  ];

  const fetchUserProfile = async (uid) => {
    try {
      const [historyRes, profileRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/game-history/${uid}?limit=1000`),
        fetch(`${API_BASE_URL}/api/profile/${uid}`)
      ]);
      const { games = [] } = historyRes.ok ? await historyRes.json() : {};
      const profile = profileRes.ok ? await profileRes.json() : {};

      const soloGames = games.filter(g => g.game_type === 'solo');
      const actualGamesPlayed = soloGames.length;
      const actualGamesWon = soloGames.filter(g => g.result === 'win' || g.profit > 0).length;
      const totalScore = soloGames.reduce((sum, g) => sum + (g.score || 0), 0);
      const actualWinRate = actualGamesPlayed > 0 ? (actualGamesWon / actualGamesPlayed) * 100 : 0;

      const completedLevels = profile.soloCompletedLevels || [];
      const earnedNicknames = profile.soloEarnedNicknames || [];
      const currentNickname = getHighestNickname(completedLevels);

      setSoloStats({
        currentLevel: profile.soloCurrentLevel || 'tutorial',
        completedLevels,
        totalChallenges: profile.soloTotalChallenges || 0,
        winRate: actualWinRate,
        earnedNicknames,
        currentNickname,
        soloScore: totalScore,
        soloGamesPlayed: actualGamesPlayed,
        soloGamesWon: actualGamesWon,
        totalScore,
        gamesPlayed: actualGamesPlayed,
        gamesWon: actualGamesWon,
        lastPlayedSolo: profile.lastPlayedSolo || null
      });

      return profile;
    } catch (err) {
      console.error("Error fetching user profile:", err);
      return null;
    }
  };

  // Load Quiz stats from UserProfileContext
  useEffect(() => {
    if (quizHistory) {
      setQuizStats({
        totalQuizzes: quizHistory.totalQuizzes || 0,
        averageScore: quizHistory.averageScore || 0,
        bestScore: quizHistory.bestScore || 0,
        completedQuizzes: quizHistory.completedQuizzes || 0,
        levelAssessmentDone: quizHistory.levelAssessmentDone || false,
        userLevel: quizHistory.userLevel || 'beginner',
        lastQuizDate: quizHistory.lastQuizDate || null,
        quizStreak: quizHistory.quizStreak || 0
      });
    }
  }, [quizHistory]);

  useEffect(() => {
    const load = async () => {
      if (authUser) {
        setUser(authUser);
        setError("");
        setFullname(authUser.displayName || "");

        const profile = await fetchUserProfile(authUser.uid);

        if (!authUser.photoURL && profile?.profilePicURL) {
          setAvatar(profile.profilePicURL);
        } else {
          setAvatar(authUser.photoURL || "");
        }

        if (!authUser.displayName && profile?.fullName) {
          setFullname(profile.fullName);
        }
      } else {
        setUser(null);
        setError("Please log in to view your account details.");
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid]);
  
  // Auto-refresh on page focus (when user comes back to the page)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        refreshUserData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshUserData]); // ลบ user ออกจาก dependency เพื่อป้องกัน infinite loop

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      setError("Error signing out: " + error.message);
    }
  };

  const handleSave = async () => {
    try {
      if (authUser) {
        await supabase.auth.updateUser({
          data: { full_name: fullname, displayName: fullname }
        });

        await fetch(`${API_BASE_URL}/api/profile/${authUser.uid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: fullname, profilePicURL: avatar })
        });

        setUser({ ...authUser, displayName: fullname });
        setIsEditing(false);
      }
    } catch (err) {
      setError("Error updating profile: " + err.message);
    }
  };

  const handleCancel = () => {
    setFullname(authUser?.displayName || "");
    setAvatar(authUser?.photoURL || "");
    setIsEditing(false);
  };

  const uploadProfilePicture = async (file) => {
    if (!file || !authUser) return;
    try {
      const filePath = `avatars/${authUser.uid}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("❌ Error uploading profile picture:", error);
      throw error;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const downloadURL = await uploadProfilePicture(file);

      await supabase.auth.updateUser({ data: { avatar_url: downloadURL } });
      await fetch(`${API_BASE_URL}/api/profile/${authUser.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePicURL: downloadURL })
      });

      setAvatar(downloadURL);
    } catch (err) {
      console.error("❌ Failed to update avatar:", err);
      setError("Failed to update avatar");
    }
  };

  return (
    <>
      <GameHeader showBackButton={true} backPath="/challenge" />

      <div className="bg-[#2E3343] text-white min-h-screen max-h-screen flex scrollbar-thin overflow-y-auto">
        <main className="flex-1 p-8 flex flex-col md:flex-row gap-8 justify-center items-start overflow-y-auto scrollbar-thin">
          <div className="w-full md:w-52 flex flex-col space-y-3">
            <button className="bg-[#6870FA] rounded px-4 py-2 font-semibold text-sm w-full hover:bg-indigo-500 transition">
              Account Setting
            </button>

            {user && (
              <button
                className="bg-[#FF4747] rounded px-4 py-2 text-sm w-full hover:bg-[#D03838] transition"
                onClick={handleLogout}
              >
                Log Out
              </button>
            )}
          </div>

          <div className="bg-[#202431] rounded-xl p-6 md:p-8 w-full max-w-3xl shadow-md overflow-y-auto max-h-[calc(100vh-120px)] scrollbar-thin">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              <div className="flex flex-col items-center justify-center w-20 h-20 relative">
                <CircleUserRound color="#FFFFFF" size={80} strokeWidth={1} />
                {isEditing && (
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-[#6870FA] text-xs text-white rounded-full px-2 py-1 cursor-pointer"
                    style={{
                      fontSize: "0.7rem",
                      transform: "translate(40%, 40%)",
                    }}
                    title="Upload Profile Image"
                  >
                    Change
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>
              <div className="text-center md:text-left">
                {user ? (
                  isEditing ? (
                    <div>
                      <input
                        className="bg-[#232733] border border-gray-600 rounded px-3 py-2 text-white text-lg font-bold mb-2 outline-none w-64"
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                      />
                      <div className="mt-2 flex gap-2 justify-center md:justify-start">
                        <button
                          className="px-4 py-1 bg-indigo-500 rounded text-white font-semibold"
                          onClick={handleSave}
                        >
                          Save
                        </button>
                        <button
                          className="px-4 py-1 bg-gray-600 rounded text-white"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h1 className="text-xl font-semibold inline-block">
                        {fullname || "Fullname Lastname"}
                      </h1>
                      <button
                        className="ml-4 text-sm text-indigo-300 underline"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit
                      </button>
                    </div>
                  )
                ) : (
                  <p className="text-red-500">{error}</p>
                )}
                {user && <p className="text-gray-400">{user.email}</p>}
              </div>
            </div>
            
            {/* AI Quiz Statistics */}
            <div className="mt-8 border-t border-gray-600 pt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Brain className="text-purple-400" size={24} />
                  สถิติ AI Quiz
                </h2>
                <button
                  onClick={refreshUserData}
                  disabled={isLoading || profileLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <svg 
                    className={`w-4 h-4 ${(isLoading || profileLoading) ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {(isLoading || profileLoading) ? 'กำลังอัปเดต...' : 'รีเฟรช'}
                </button>
              </div>
              
              {/* Quiz Overall Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{quizStats.totalQuizzes}</div>
                  <div className="text-sm text-gray-400">ควิซที่ทำทั้งหมด</div>
                </div>
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-pink-400">{quizStats.completedQuizzes}</div>
                  <div className="text-sm text-gray-400">ควิซที่ทำเสร็จ</div>
                </div>
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className={`text-2xl font-bold ${quizStats.averageScore >= 0.8 ? 'text-green-400' : quizStats.averageScore >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {Math.round((quizStats.averageScore || 0) * 100)}%
                  </div>
                  <div className="text-sm text-gray-400">คะแนนเฉลี่ย</div>
                </div>
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{Math.round((quizStats.bestScore || 0) * 100)}%</div>
                  <div className="text-sm text-gray-400">คะแนนสูงสุด</div>
                </div>
              </div>
              
              {/* Quiz Level and Streak */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-400 capitalize">{quizStats.userLevel}</div>
                  <div className="text-sm text-gray-400">ระดับความรู้</div>
                </div>
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">{quizStats.quizStreak}</div>
                  <div className="text-sm text-gray-400">ต่อเนื่อง (วัน)</div>
                </div>
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className={`text-2xl font-bold ${quizStats.levelAssessmentDone ? 'text-green-400' : 'text-red-400'}`}>
                    {quizStats.levelAssessmentDone ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-gray-400">ประเมินระดับ</div>
                </div>
              </div>
              
              {/* Last Quiz Date */}
              {quizStats.lastQuizDate && (
                <div className="mb-6 bg-[#2A2F3E] rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">ทำควิซครั้งล่าสุด</h3>
                  <div className="text-lg text-white">
                    {(() => {
                      try {
                        const date = new Date(quizStats.lastQuizDate);
                        return date.toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      } catch (error) {
                        return 'ไม่สามารถแสดงวันที่ได้';
                      }
                    })()}
                  </div>
                </div>
              )}
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/ai-quiz')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Brain size={20} />
                  ทำ AI Quiz
                </button>
                <button
                  onClick={() => navigate('/quiz-history')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <BookOpen size={20} />
                  ดูประวัติควิซ
                </button>
              </div>
            </div>

            {/* Solo Challenge Statistics */}
            <div className="mt-8 border-t border-gray-600 pt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Trophy className="text-yellow-400" size={24} />
                  สถิติ Solo Challenge
                </h2>
                <button
                  onClick={refreshUserData}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <svg 
                    className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isLoading ? 'กำลังอัปเดต...' : 'รีเฟรช'}
                </button>
              </div>
              
              {/* Overall Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">{soloStats.soloGamesPlayed}</div>
                  <div className="text-sm text-gray-400">เกมที่เล่น (Solo)</div>
                </div>
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{soloStats.soloGamesWon}</div>
                  <div className="text-sm text-gray-400">เกมที่ชนะ (Solo)</div>
                </div>
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className={`text-2xl font-bold ${soloStats.winRate >= 70 ? 'text-green-400' : soloStats.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {soloStats.winRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">อัตราชนะ</div>
                </div>
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{soloStats.soloScore.toLocaleString()}</div>
                  <div className="text-sm text-gray-400">คะแนนรวม (Solo)</div>
                </div>
              </div>
              
              {/* Additional Overall Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{soloStats.gamesPlayed}</div>
                  <div className="text-sm text-gray-400">เกมทั้งหมด</div>
                </div>
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{soloStats.totalScore.toLocaleString()}</div>
                  <div className="text-sm text-gray-400">คะแนนรวมทั้งหมด</div>
                </div>
                <div className="bg-[#2A2F3E] rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">{soloStats.completedLevels.length}</div>
                  <div className="text-sm text-gray-400">ระดับที่ปลดล็อค</div>
                </div>
              </div>
              
              {/* Last Played */}
              {soloStats.lastPlayedSolo && (
                <div className="mb-6 bg-[#2A2F3E] rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">เล่นครั้งล่าสุด</h3>
                  <div className="text-lg text-white">
                    {(() => {
                      try {
                        const date = soloStats.lastPlayedSolo.toDate ? 
                          soloStats.lastPlayedSolo.toDate() : 
                          new Date(soloStats.lastPlayedSolo);
                        return date.toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      } catch (error) {
                        return 'ไม่สามารถแสดงวันที่ได้';
                      }
                    })()}
                  </div>
                </div>
              )}
              
              {/* Current Level Badge */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Star className="text-yellow-400" size={20} />
                  Current level
                </h3>
                <div className="flex items-center gap-4">
                  {(() => {
                    const currentLevelData = difficultyLevels.find(l => l.id === soloStats.currentLevel);
                    return (
                      <div className={`bg-${currentLevelData?.color}-600/20 border border-${currentLevelData?.color}-400 rounded-lg p-4 flex-1`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{currentLevelData?.icon}</span>
                          <div>
                            <div className="text-lg font-bold">{currentLevelData?.name}</div>
                            <div className="text-sm text-gray-400">{currentLevelData?.description}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Target: {currentLevelData?.profitTarget.toLocaleString()} baht ({currentLevelData?.profitTargetPercent}%)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Current Nickname Display */}
              {soloStats.currentNickname && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Trophy className="text-purple-400" size={20} />
                    Current nickname
                  </h3>
                  <div className={`${RARITY_BACKGROUNDS[soloStats.currentNickname.rarity]} ${RARITY_BORDERS[soloStats.currentNickname.rarity]} border rounded-lg p-4`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{soloStats.currentNickname.icon}</span>
                      <div>
                        <div className={`text-xl font-bold ${RARITY_COLORS[soloStats.currentNickname.rarity]}`}>
                          {soloStats.currentNickname.nickname}
                        </div>
                        <div className="text-sm text-gray-400">{soloStats.currentNickname.description}</div>
                        <div className="text-xs text-gray-500 mt-1 capitalize">
                          Rarity level: {soloStats.currentNickname.rarity}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Earned Nicknames Collection */}
              {soloStats.earnedNicknames.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Award className="text-yellow-400" size={20} />
                    คอลเลกชันฉายา ({soloStats.earnedNicknames.length}/{Object.keys(DIFFICULTY_NICKNAMES).length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getAllEarnedNicknames(soloStats.completedLevels).map((nickname, index) => (
                      <div key={`earned-nickname-${nickname.id || index}-${nickname.nickname}`} className={`${RARITY_BACKGROUNDS[nickname.rarity]} ${RARITY_BORDERS[nickname.rarity]} border rounded-lg p-3`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{nickname.icon}</span>
                          <div>
                            <div className={`font-semibold ${RARITY_COLORS[nickname.rarity]}`}>
                              {nickname.nickname}
                            </div>
                            <div className="text-xs text-gray-400">{nickname.englishName}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Level Progress */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Award className="text-green-400" size={20} />
                  ความก้าวหน้าทั้งหมด
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
                  {difficultyLevels.map((level, index) => {
                    const isCompleted = soloStats.completedLevels.includes(level.id);
                    const isCurrent = level.id === soloStats.currentLevel;
                    const isUnlocked = isCompleted || (index === 0) || (index > 0 && soloStats.completedLevels.includes(difficultyLevels[index - 1].id));
                    
                    return (
                      <div key={level.id} className="flex items-center gap-4 p-3 bg-[#2A2F3E] rounded-lg">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-green-500' :
                          isCurrent ? `bg-${level.color}-500` :
                          isUnlocked ? 'bg-blue-500' :
                          'bg-gray-600'
                        }`}>
                          {isCompleted ? '✓' : !isUnlocked ? '🔒' : level.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${
                              isCompleted ? 'text-green-400' :
                              isCurrent ? 'text-white' :
                              isUnlocked ? 'text-blue-400' :
                              'text-gray-500'
                            }`}>
                              {level.name}
                            </span>
                            {isCurrent && <span className="px-2 py-1 bg-blue-600 text-xs rounded">ปัจจุบัน</span>}
                            {isCompleted && <span className="px-2 py-1 bg-green-600 text-xs rounded">ผ่านแล้ว</span>}
                          </div>
                          <div className="text-sm text-gray-400">{level.description}</div>
                          <div className="text-xs text-gray-500">
                            Target: {level.profitTarget.toLocaleString()} baht • Time: {level.timeLimit / 60} minutes
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {isCompleted ? '🏆' : isUnlocked ? '🔓' : '🔒'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Multiplayer Readiness */}
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-400 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Target className="text-purple-400" size={20} />
                  ความพร้อมสำหรับ Multiplayer
                </h3>
                <div className="text-sm text-gray-300">
                  <p className="mb-2">คุณสามารถเข้าร่วมโหมด Multiplayer ได้ตามระดับที่ปลดล็อคแล้ว:</p>
                  <div className="flex flex-wrap gap-2">
                    {soloStats.completedLevels.length === 0 ? (
                      <span className="px-3 py-1 bg-gray-600 text-gray-300 rounded-full text-xs">
                        ยังไม่พร้อม - ต้องผ่าน Tutorial ก่อน
                      </span>
                    ) : (
                      soloStats.completedLevels.map(levelId => {
                        const level = difficultyLevels.find(l => l.id === levelId);
                        return (
                          <span key={levelId} className={`px-3 py-1 bg-${level.color}-600 text-white rounded-full text-xs`}>
                            {level.icon} {level.name}
                          </span>
                        );
                      })
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    อัตราชนะของคุณ ({soloStats.winRate.toFixed(1)}%) จะใช้เป็นเกณฑ์การจับคู่ในโหมด Multiplayer
                  </p>
                </div>
              </div>
            </div>
            
            {/* Navigation Cards */}
            <div className="mt-8 border-t border-gray-600 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Play Game Card */}
                <button
                  onClick={() => {
                    navigate('/solo');
                  }}
                  className="bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white p-6 rounded-xl font-bold text-center transition-all transform hover:scale-105 shadow-lg flex flex-col items-center gap-4"
                >
                  <div className="text-4xl">🎮</div>
                  <div>
                    <div className="text-xl font-bold">เล่นเกม</div>
                    <div className="text-sm opacity-80">เริ่มเกมใหม่</div>
                  </div>
                </button>

                {/* Game History Card */}
                <button
                  onClick={() => {
                    navigate('/game-history');
                  }}
                  className="bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white p-6 rounded-xl font-bold text-center transition-all transform hover:scale-105 shadow-lg flex flex-col items-center gap-4"
                >
                  <div className="text-4xl">📊</div>
                  <div>
                    <div className="text-xl font-bold">ประวัติ</div>
                    <div className="text-sm opacity-80">ดูประวัติการเล่น</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
