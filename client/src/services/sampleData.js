import { firestore } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";

// ฟังก์ชันสำหรับสร้างข้อมูลผู้เล่นตัวอย่าง
export async function createSamplePlayers() {
  const samplePlayers = [
    {
      id: "player1",
      fullName: "เทรดมาสเตอร์",
      email: "master@example.com",
      totalScore: 12500,
      gamesPlayed: 156,
      gamesWon: 148,
      createdAt: "2024-01-15T08:00:00.000Z"
    },
    {
      id: "player2", 
      fullName: "เทรดเดอร์ Pro",
      email: "pro@example.com",
      totalScore: 9750,
      gamesPlayed: 234,
      gamesWon: 208,
      createdAt: "2024-01-20T10:30:00.000Z"
    },
    {
      id: "player3",
      fullName: "นักลงทุนหน้าใหม่",
      email: "newbie@example.com", 
      totalScore: 8920,
      gamesPlayed: 187,
      gamesWon: 146,
      createdAt: "2024-02-01T14:15:00.000Z"
    },
    {
      id: "player4",
      fullName: "เทรดดี้",
      email: "trader@example.com",
      totalScore: 7890,
      gamesPlayed: 145,
      gamesWon: 119,
      createdAt: "2024-02-05T09:20:00.000Z"
    },
    {
      id: "player5",
      fullName: "กำไรมาก",
      email: "profit@example.com",
      totalScore: 7250,
      gamesPlayed: 167,
      gamesWon: 132,
      createdAt: "2024-02-10T16:45:00.000Z"
    },
    {
      id: "player6",
      fullName: "นักลงทุนใหม่",
      email: "investor@example.com",
      totalScore: 6890,
      gamesPlayed: 123,
      gamesWon: 92,
      createdAt: "2024-02-15T11:30:00.000Z"
    },
    {
      id: "player7",
      fullName: "เทรดเดอร์ 2024",
      email: "trader2024@example.com",
      totalScore: 6450,
      gamesPlayed: 189,
      gamesWon: 138,
      createdAt: "2024-02-20T13:10:00.000Z"
    },
    {
      id: "player8",
      fullName: "หุ้นดี",
      email: "stock@example.com",
      totalScore: 6120,
      gamesPlayed: 134,
      gamesWon: 95,
      createdAt: "2024-02-25T15:00:00.000Z"
    },
    {
      id: "player9",
      fullName: "ชาร์ตคิง",
      email: "chart@example.com",
      totalScore: 5890,
      gamesPlayed: 156,
      gamesWon: 106,
      createdAt: "2024-03-01T12:20:00.000Z"
    },
    {
      id: "player10",
      fullName: "โปรเทรดเดอร์",
      email: "protrader@example.com",
      totalScore: 5650,
      gamesPlayed: 112,
      gamesWon: 74,
      createdAt: "2024-03-05T10:15:00.000Z"
    }
  ];

  try {
    for (const player of samplePlayers) {
      const userRef = doc(firestore, "users", player.id);
      await setDoc(userRef, player, { merge: true });
    }
    return true;
  } catch (error) {
    console.error("Error creating sample players:", error);
    return false;
  }
}

// เรียกใช้ฟังก์ชันสร้างข้อมูลตัวอย่าง (ใช้เฉพาะเมื่อต้องการ)
// createSamplePlayers();
