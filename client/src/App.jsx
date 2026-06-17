import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import WelcomePage from "./pages/common/WelcomePage";
import GameLoginPage from "./pages/common/GameLoginPage";
import GameRegisterPage from "./pages/common/GameRegisterPage";
import GameProfilePage from "./pages/profile/GameProfilePage";
import ChallengePage from "./pages/solo/ChallengePage";
import SoloChallenge from "./pages/solo/SoloChallenge";
import MultiplayerChallenge from "./pages/multiplayer/MultiplayerChallenge";
import HelpPage from "./pages/common/HelpPage";
import TutorialPage from "./pages/quiz/TutorialPage";
import ProtectedRoute from "./components/common/ProtectedRoute";
import WaitingRoomPage from "./pages/multiplayer/WaitingRoom";
import QuizPage from "./pages/quiz/QuizPage";
import PracticeQuizPage from "./pages/quiz/PracticeQuizPage";
import AIQuizPage from "./pages/quiz/AIQuizPage";
import LevelAssessmentPage from "./pages/solo/LevelAssessmentPage";
import QuizHistoryPage from "./pages/quiz/QuizHistoryPage";
import GameHistoryPage from "./pages/profile/GameHistoryPage";
import { AuthProvider } from "./contexts/AuthContext";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import { MultiplayerProvider } from "./contexts/MultiplayerContext";
import { AchievementProvider, useAchievement } from "./contexts/AchievementContext";
import ScrollManager from "./components/common/ScrollManager";
import RouteTransition from "./components/common/RouteTransition";
import UltimateLoadingScreen from "./components/common/UltimateLoadingScreen";
import AchievementNotification from "./components/common/AchievementNotification";
import AppLayout from "./components/common/AppLayout";
import ErrorBoundary from "./components/common/ErrorBoundary";
import NotificationSystem from "./components/common/NotificationSystem";
import './styles/performance.css';
import RoomModeSelect from "./pages/multiplayer/RoomModeSelect";
import CreateRoomPage from "./pages/multiplayer/CreateRoomPage";
import JoinRoomPage from "./pages/multiplayer/JoinRoomPage";

// Global Achievement Notifications
function GlobalAchievementNotifications() {
  const { newAchievements, clearNewAchievements } = useAchievement();
  
  return (
    <AchievementNotification 
      achievements={newAchievements}
      onClose={clearNewAchievements}
      autoClose={true}
      autoCloseDelay={6000}
    />
  );
}

// Wrapper component เพื่อใช้ useLocation
function AppRoutes() {
  const location = useLocation();

  return (
    <RouteTransition pathname={location.pathname}>
      <Routes>
        {/* Public pages that should NOT show the sidebar */}
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<GameLoginPage />} />
        <Route path="/register" element={<GameRegisterPage />} />

        {/* App shell with persistent sidebar/header */}
        <Route element={<AppLayout />}>
          <Route path="/account" element={<GameProfilePage />} />
          <Route path="/challenge" element={<ChallengePage />} />
          <Route path="/tutorial" element={<TutorialPage />} />
          <Route path="/solo" element={<SoloChallenge />} />
          <Route path="/solo-trading" element={<SoloChallenge />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/practice-quiz" element={<PracticeQuizPage />} />
          <Route path="/ai-quiz" element={<AIQuizPage />} />
          <Route path="/level-assessment" element={<LevelAssessmentPage />} />
          <Route path="/quiz-history" element={<QuizHistoryPage />} />
          <Route path="/game-history" element={<GameHistoryPage />} />

          {/* Rooms flow */}
          <Route path="/rooms" element={<RoomModeSelect />} />
          <Route path="/rooms/create" element={<CreateRoomPage />} />
          <Route path="/rooms/join" element={<JoinRoomPage />} />

          <Route
            path="/waiting/:roomCode"
            element={
              <ProtectedRoute>
                <WaitingRoomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game/:roomCode"
            element={
              <ProtectedRoute>
                <MultiplayerChallenge />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RouteTransition>
  );
}

export default function App() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // จำลองการโหลดแอปเริ่มต้น
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2500); // ลดเวลาโหลดลง

    return () => clearTimeout(timer);
  }, []);

  if (isInitialLoading) {
    return <UltimateLoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <UserProfileProvider>
          <AchievementProvider>
            <MultiplayerProvider>
              <Router>
                <ScrollManager />
                <AppRoutes />
                <NotificationSystem />
                <GlobalAchievementNotifications />
              </Router>
            </MultiplayerProvider>
          </AchievementProvider>
        </UserProfileProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}