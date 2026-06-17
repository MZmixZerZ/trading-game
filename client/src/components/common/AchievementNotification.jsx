import React, { useState, useEffect, useCallback } from 'react';
import { FaTrophy, FaStar } from 'react-icons/fa';

const AchievementNotification = ({ achievements, onClose, autoClose = true, autoCloseDelay = 5000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300); // รอ animation เสร็จ
  }, [onClose]);

  useEffect(() => {
    if (achievements.length > 0) {
      setIsVisible(true);
      
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [achievements, autoClose, autoCloseDelay, handleClose]);

  if (achievements.length === 0 || !isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`relative bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-lg rounded-3xl p-8 border border-yellow-400/30 max-w-md w-full text-center transform transition-all duration-300 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <div className="animate-bounce mb-4">
          <FaTrophy className="text-6xl text-yellow-400 mx-auto" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4">
          🎉 Achievement{achievements.length > 1 ? 's' : ''} Unlocked!
        </h2>
        
        <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="bg-black/30 rounded-xl p-4 border border-white/10">
              <div className="text-3xl mb-2">{achievement.icon}</div>
              <h3 className="text-xl font-bold text-white">{achievement.name}</h3>
              <p className="text-gray-300 text-sm mb-2">{achievement.desc}</p>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                achievement.rarity === 'mythic' ? 'bg-pink-500 text-white' :
                achievement.rarity === 'legendary' ? 'bg-yellow-500 text-black' :
                achievement.rarity === 'epic' ? 'bg-purple-500 text-white' :
                achievement.rarity === 'rare' ? 'bg-blue-500 text-white' :
                achievement.rarity === 'uncommon' ? 'bg-green-500 text-white' :
                'bg-gray-500 text-white'
              }`}>
                {achievement.rarity.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={handleClose}
          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          {achievements.length > 1 ? 'Awesome! 🎯' : 'Great! 🎯'}
        </button>
        
        {/* Auto-close indicator */}
        {autoClose && (
          <div className="absolute top-4 right-4 text-yellow-300 text-sm opacity-70">
            Auto-close in {Math.ceil(autoCloseDelay / 1000)}s
          </div>
        )}
        
        {/* Particles effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {[...Array(20)].map((_, i) => (
            <FaStar
              key={i}
              className={`absolute text-yellow-400 animate-ping`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`,
                fontSize: `${8 + Math.random() * 8}px`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementNotification;