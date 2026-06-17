import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { checkAchievementsAfterGame, loadUserAchievements } from '../utils/achievementSystem';

const AchievementContext = createContext();

export const useAchievement = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievement must be used within an AchievementProvider');
  }
  return context;
};

export const AchievementProvider = ({ children }) => {
  const [userAchievements, setUserAchievements] = useState([]);
  const [newAchievements, setNewAchievements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Load user achievements when user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const achievements = await loadUserAchievements(currentUser.uid);
          setUserAchievements(achievements);
        } catch (error) {
          console.error('Error loading achievements:', error);
        }
      } else {
        setUserAchievements([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Check for new achievements after game completion
  const checkNewAchievements = async () => {
    if (!user) return [];

    try {
      const newAchievementsList = await checkAchievementsAfterGame(user.uid);
      if (newAchievementsList.length > 0) {
        setNewAchievements(newAchievementsList);
        // Reload user achievements to include new ones
        const updatedAchievements = await loadUserAchievements(user.uid);
        setUserAchievements(updatedAchievements);
        return newAchievementsList;
      }
      return [];
    } catch (error) {
      console.error('Error checking new achievements:', error);
      return [];
    }
  };

  // Clear new achievements notification
  const clearNewAchievements = () => {
    setNewAchievements([]);
  };

  // Get achievement by ID
  const getAchievementById = (id) => {
    return userAchievements.find(achievement => achievement.id === id);
  };

  // Get achievements by rarity
  const getAchievementsByRarity = (rarity) => {
    return userAchievements.filter(achievement => achievement.rarity === rarity);
  };

  // Get achievement statistics
  const getAchievementStats = () => {
    const total = userAchievements.length;
    const byRarity = {
      mythic: getAchievementsByRarity('mythic').length,
      legendary: getAchievementsByRarity('legendary').length,
      epic: getAchievementsByRarity('epic').length,
      rare: getAchievementsByRarity('rare').length,
      uncommon: getAchievementsByRarity('uncommon').length,
      common: getAchievementsByRarity('common').length,
    };

    return {
      total,
      byRarity,
      completionRate: total > 0 ? Math.round((total / 12) * 100) : 0 // Assuming 12 total achievements
    };
  };

  const value = {
    userAchievements,
    newAchievements,
    isLoading,
    user,
    checkNewAchievements,
    clearNewAchievements,
    getAchievementById,
    getAchievementsByRarity,
    getAchievementStats,
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
    </AchievementContext.Provider>
  );
};

export default AchievementContext;