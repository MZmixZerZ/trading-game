import { firestore } from "../firebase/firebase";
import { doc, setDoc, getDoc, updateDoc, increment } from "firebase/firestore";

// ฟังก์ชันสำหรับอัพเดทคะแนนผู้เล่น
export async function updatePlayerScore(userId, gameScore, won = false) {
  try {
    const userRef = doc(firestore, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // อัพเดทข้อมูลผู้เล่นที่มีอยู่
      await updateDoc(userRef, {
        totalScore: increment(gameScore),
        gamesPlayed: increment(1),
        gamesWon: won ? increment(1) : increment(0),
        lastPlayed: new Date().toISOString()
      });
    } else {
      // สร้างข้อมูลผู้เล่นใหม่
      await setDoc(userRef, {
        totalScore: gameScore,
        gamesPlayed: 1,
        gamesWon: won ? 1 : 0,
        createdAt: new Date().toISOString(),
        lastPlayed: new Date().toISOString()
      }, { merge: true });
    }
    return true;
  } catch (error) {
    console.error("Error updating player score:", error);
    return false;
  }
}

// ฟังก์ชันสำหรับเพิ่มข้อมูลเกมที่เล่น
export async function addGameHistory(userId, gameData) {
  try {
    const gameRef = doc(firestore, "gameHistory", `${userId}_${Date.now()}`);
    await setDoc(gameRef, {
      userId,
      score: gameData.score,
      duration: gameData.duration,
      difficulty: gameData.difficulty,
      profit: gameData.profit,
      trades: gameData.trades,
      timestamp: new Date().toISOString(),
      gameMode: gameData.gameMode || "solo"
    });
    return true;
  } catch (error) {
    console.error("Error adding game history:", error);
    return false;
  }
}

// ฟังก์ชันสำหรับดึงประวัติเกมของผู้เล่น
export async function getPlayerGameHistory(userId, limit = 10) {
  try {
    const { query, collection, orderBy, where, getDocs, limitToLast } = await import("firebase/firestore");
    
    const historyQuery = query(
      collection(firestore, "gameHistory"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limitToLast(limit)
    );
    
    const querySnapshot = await getDocs(historyQuery);
    const history = [];
    
    querySnapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return history;
  } catch (error) {
    console.error("Error fetching game history:", error);
    return [];
  }
}

// ฟังก์ชันสำหรับรีเซ็ทคะแนนผู้เล่น (สำหรับ admin)
export async function resetPlayerStats(userId) {
  try {
    const userRef = doc(firestore, "users", userId);
    await updateDoc(userRef, {
      totalScore: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      lastReset: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error resetting player stats:", error);
    return false;
  }
}
