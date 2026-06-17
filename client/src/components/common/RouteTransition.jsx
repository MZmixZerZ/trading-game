import React from 'react';
import PageTransition from './PageTransition';

// ข้อความและ sub message สำหรับแต่ละหน้า
const routeMessages = {
  '/': {
    message: 'Welcome!',
    subMessage: 'Get ready for a trading adventure'
  },
  '/login': {
    message: 'Login',
    subMessage: 'Preparing the competition stage'
  },
  '/register': {
    message: 'Register',
    subMessage: 'Getting ready for a new adventure'
  },
  '/challenge': {
    message: 'Loading game mode',
    subMessage: 'Preparing to select a challenge'
  },
  '/tutorial': {
    message: 'Loading tutorial',
    subMessage: 'Loading tutorial content'
  },
  '/solo': {
    message: 'Loading solo game',
    subMessage: 'Creating graph for competition'
  },
  '/multiplayer': {
    message: 'Joining room',
    subMessage: 'Connecting to other players'
  },
  '/ai-quiz': {
    message: 'Preparing AI Quiz',
    subMessage: 'Loading questions for you'
  },
  '/level-assessment': {
    message: 'Level Assessment',
    subMessage: 'Assessing your skills'
  },
  '/quiz-history': {
    message: 'Quiz History',
    subMessage: 'Loading your progress'
  },
  '/account': {
    message: 'Player Profile',
    subMessage: 'Loading account information'
  },
  '/leaderboard': {
    message: 'Leaderboard',
    subMessage: 'Updating player rankings'
  }
};

const RouteTransition = ({ children, pathname }) => {
  const routeConfig = routeMessages[pathname] || {
    message: 'Loading...',
    subMessage: 'Preparing for the competition stage'
  };

  // ปรับเวลา loading ตาม route
  let minLoadingTime = 800;
  if (pathname.includes('/challenge') || pathname.includes('/game')) {
    minLoadingTime = 1200; // เกมต้องโหลดนานกว่า
  } else if (pathname.includes('/quiz') || pathname.includes('/tutorial')) {
    minLoadingTime = 1000; // Quiz และ Tutorial โหลดปานกลาง
  }

  return (
    <PageTransition
      loadingMessage={routeConfig.message}
      subMessage={routeConfig.subMessage}
      minLoadingTime={minLoadingTime}
    >
      {children}
    </PageTransition>
  );
};

export default RouteTransition;
