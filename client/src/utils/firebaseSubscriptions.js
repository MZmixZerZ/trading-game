import { firestore as db, onSnapshot, collection, doc, setDoc } from '../firebase/firebase';

// Cache for active subscriptions to prevent duplicates
const activeSubscriptions = new Map();

// Console logging throttle to prevent spam
let lastLogTime = 0;
const LOG_THROTTLE_MS = 1000; // ลดเหลือ 1 วินาที เพื่อ debug ได้ดีขึ้น

const throttledLog = (message, ...args) => {
  const now = Date.now();
  if (now - lastLogTime > LOG_THROTTLE_MS) {
    console.log(message, ...args);
    lastLogTime = now;
  }
};

// Add or update player in Firebase
export const addPlayerToRoom = async (roomCode, user) => {
  try {
    if (!roomCode || !user) {
      console.warn('❌ Invalid roomCode or user for addPlayerToRoom');
      return false;
    }

    const playerRef = doc(db, 'rooms', roomCode, 'players', user.uid);
    const playerData = {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      email: user.email,
      joinedAt: new Date(),
      lastActive: new Date(),
      status: 'active'
      // ลบ balance, totalValue, totalPnL, position ออก ให้อัปเดตจาก client
    };

    await setDoc(playerRef, playerData, { merge: true });
    console.log('✅ Player added to room:', roomCode, playerData.displayName);
    return true;
  } catch (error) {
    console.error('❌ Error adding player to room:', error);
    return false;
  }
};

// Subscribe to players in a room
export const subscribeToRoomPlayers = (roomCode, callback) => {
  try {
    // ตรวจสอบความถูกต้องของ roomCode
    if (!roomCode || roomCode === 'undefined' || roomCode.trim() === '') {
      console.warn('❌ Invalid roomCode for players subscription:', roomCode);
      return () => {}; // Return empty cleanup function
    }

    // Check if already subscribed - force new subscription for better sync
    const cacheKey = `players_${roomCode}`;
    if (activeSubscriptions.has(cacheKey)) {
      // Cleanup old subscription before creating new one
      const oldUnsubscribe = activeSubscriptions.get(cacheKey);
      oldUnsubscribe();
      activeSubscriptions.delete(cacheKey);
      console.log('🔄 Replacing existing players subscription for room:', roomCode);
    }

    const playersRef = collection(db, 'rooms', roomCode, 'players');
    
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      // Reduce excessive console logging
      throttledLog('👥 Firebase players updated:', snapshot.size, 'players');
      callback(snapshot);
    }, (error) => {
      console.error('❌ Error subscribing to players:', error);
    });

    // Cache the unsubscribe function
    const wrappedUnsubscribe = () => {
      unsubscribe();
      activeSubscriptions.delete(cacheKey);
    };
    
    activeSubscriptions.set(cacheKey, wrappedUnsubscribe);
    
    return wrappedUnsubscribe;
  } catch (error) {
    console.error('❌ Error setting up Firebase players subscription:', error);
    return () => {};
  }
};

// Subscribe to room data
export const subscribeToRoomData = (roomCode, callback) => {
  try {
    // ตรวจสอบความถูกต้องของ roomCode
    if (!roomCode || roomCode === 'undefined' || roomCode.trim() === '') {
      console.warn('❌ Invalid roomCode for room subscription:', roomCode);
      return () => {}; // Return empty cleanup function
    }

    // Check if already subscribed - force new subscription for better sync
    const cacheKey = `room_${roomCode}`;
    if (activeSubscriptions.has(cacheKey)) {
      // Cleanup old subscription before creating new one
      const oldUnsubscribe = activeSubscriptions.get(cacheKey);
      oldUnsubscribe();
      activeSubscriptions.delete(cacheKey);
      console.log('🔄 Replacing existing room subscription for room:', roomCode);
    }

    const roomRef = doc(db, 'rooms', roomCode);
    
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        // Reduce excessive console logging
        throttledLog('🏠 Firebase room updated');
        callback(snapshot);
      } else {
        console.warn('⚠️ Room not found in Firebase:', roomCode);
      }
    }, (error) => {
      console.error('❌ Error subscribing to room:', error);
    });

    // Cache the unsubscribe function
    const wrappedUnsubscribe = () => {
      unsubscribe();
      activeSubscriptions.delete(cacheKey);
    };
    
    activeSubscriptions.set(cacheKey, wrappedUnsubscribe);
    
    return wrappedUnsubscribe;
  } catch (error) {
    console.error('❌ Error setting up Firebase room subscription:', error);
    return () => {};
  }
};
