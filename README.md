# 🎯 Streaming IdeaTrade

**แพลตฟอร์มจำลองการเทรดหุ้นแบบเรียลไทม์พร้อมระบบ Multiplayer**

> เว็บแอปพลิเคชันสำหรับการเรียนรู้และฝึกฝนการลงทุนในตลาดหุ้นผ่านการจำลองสถานการณ์ที่สมจริง

## ✨ ฟีเจอร์หลัก

### 🎮 **ระบบเกมเทรด**
- **Solo Trading**: เทรดคนเดียวในโหมดความยากง่ายต่างๆ (Easy, Medium, Hard, Expert)
- **Multiplayer**: เทรดแบบหลายคนในเวลาเดียวกันแบบ Real-time
- **ตลาดหุ้นจริง**: ข้อมูลราคาหุ้นจาก Yahoo Finance API
- **ตลาดครอบคลุม**: SET, MAI, TFEX, US Markets

### 📊 **ระบบ AI และควิซ**
- **AI Quiz Grader**: ตรวจคำตอบข้อเขียนด้วย Google Gemini AI
- **Level Assessment**: ประเมินระดับความรู้ก่อนเริ่มเกม
- **Practice Quiz**: ฝึกควิซความรู้ด้านการลงทุน
- **Quiz History**: ติดตามประวัติการทำควิซ

### 👥 **ระบบผู้ใช้**
- **Firebase Authentication**: ลงทะเบียนและเข้าสู่ระบบ
- **User Profile**: โปรไฟล์ส่วนตัวและสถิติการเล่น
- **Game History**: ประวัติการเทรดและผลลัพธ์
- **Ranking System**: ระบบคะแนนและอันดับ

### 🎯 **ระบบ Multiplayer**
- **Room System**: สร้างหรือเข้าร่วมห้องเทรด
- **Real-time**: เชื่อมต่อแบบเรียลไทม์ด้วย Socket.IO
- **Live Leaderboard**: ตารางคะแนนสด
- **Synchronized Trading**: เทรดพร้อมกันในเวลาเดียวกัน

## �️ เทคโนโลยี

### Frontend
- **React 18** - UI Framework
- **React Router** - Navigation
- **Socket.IO Client** - Real-time communication
- **Firebase SDK** - Authentication & Database
- **ApexCharts, Chart.js** - Data visualization
- **Tailwind CSS** - Styling

### Backend
- **Express.js** - Web server
- **Socket.IO** - Real-time multiplayer
- **Firebase Admin** - Database & Auth management
- **Google Gemini AI** - AI quiz grading
- **Yahoo Finance API** - Stock market data

### Database & Services
- **Firebase Firestore** - NoSQL database
- **Firebase Authentication** - User management
- **Google Cloud AI** - Natural language processing

## 🚀 การติดตั้งและใช้งาน

### 1. Clone Repository
```bash
git clone https://github.com/ideatrade/streaming-ideatrade.git
cd streaming-ideatrade
```

### 2. ติดตั้ง Dependencies
```bash
npm install
npm run install:all
```

### 3. ตั้งค่า Environment
```bash
# Server (.env)
PORT=5000
GOOGLE_API_KEY=your_gemini_api_key
FIREBASE_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=./firebase-admin-key.json

# Client (.env.development)
PORT=3412
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 4. รันแอปพลิเคชัน
```bash
# Development
npm run dev

# Production
npm run build
npm run server:start
```

เข้าใช้งานที่:
- **Frontend**: http://localhost:3412
- **Backend**: http://localhost:5000

## 📁 โครงสร้างโปรเจค

```
streaming-ideatrade/
├── client/                    # Frontend React App
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/            # หน้าต่างๆ ของแอป
│   │   ├── contexts/         # React contexts
│   │   ├── services/         # API services
│   │   └── firebase/         # Firebase config
│   └── package.json
├── server/                   # Backend Express Server
│   ├── server.js            # Main server file
│   ├── ecosystem.config.js  # PM2 config
│   └── package.json
└── README.md
```

## � การใช้งาน

1. **สมัครสมาชิก** - ลงทะเบียนด้วย Email/Password
2. **ประเมินระดับ** - ทำ Level Assessment Quiz
3. **เลือกโหมด**:
   - **Solo**: เทรดคนเดียว เลือกความยาก
   - **Multiplayer**: เข้าร่วมหรือสร้างห้องเทรด
4. **เทรด**: ซื้อ-ขายหุ้นในเวลาจำกัด
5. **ดูผลลัพธ์** - คะแนน อันดับ และสถิติ

## � คำสั่งที่สำคัญ

```bash
# Development
npm run dev                   # รัน client + server
npm run client:start         # รัน client อย่างเดียว
npm run server:dev          # รัน server อย่างเดียว

# Production
npm run build               # Build client
npm run server:start       # รัน server production

# Utilities
npm run clean              # ลบ node_modules
npm test                   # รัน tests
```

## 📄 License

ISC License

---

**พัฒนาโดย**: IdeaTrade Team  
**เวอร์ชัน**: 1.0.0  
**อัพเดทล่าสุด**: ตุลาคม 2025