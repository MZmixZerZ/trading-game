import React from 'react';
import GameLoadingScreen from './GameLoadingScreen';
import usePageTransition from '../../hooks/usePageTransition';

const PageTransition = ({ children, loadingMessage, subMessage, minLoadingTime = 800 }) => {
  const { isLoading } = usePageTransition(minLoadingTime);

  if (isLoading) {
    return (
      <GameLoadingScreen 
        message={loadingMessage} 
        subMessage={subMessage}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      {children}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PageTransition;