// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInAnonymously 
} from "firebase/auth";
import { 
  getFirestore,
  doc,
  collection,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC9HW4cTzwCcMcQJxVWkJjDtgZNgdE-wNc",
  authDomain: "streaming-ideatrade.firebaseapp.com",
  projectId: "streaming-ideatrade",
  storageBucket: "streaming-ideatrade.firebasestorage.app",
  messagingSenderId: "360365860290",
  appId: "1:360365860290:web:914b563b414fea5d6c625b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore - ใช้ standard getFirestore เพื่อความเสถียร
const firestore = getFirestore(app);

// Initialize Firebase services
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Configure Google Provider
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Auto authentication for development
let authInitialized = false;

const initializeAuth = async () => {
  if (authInitialized) return;
  authInitialized = true;
  
  try {
    auth.onAuthStateChanged(async (user) => {
      if (!user && process.env.NODE_ENV === 'development') {
        console.log('🔐 Auto-signing in anonymously for development...');
        try {
          await signInAnonymously(auth);
          console.log('✅ Anonymous authentication successful');
        } catch (error) {
          console.error('❌ Anonymous authentication failed:', error);
        }
      }
    });
  } catch (error) {
    console.error('❌ Auth initialization error:', error);
  }
};

// Initialize auth
initializeAuth();

// ลบการจัดการ network ด้วยตนเองเพื่อหลีกเลี่ยง internal assertion errors
// ให้ Firebase SDK จัดการ network state โดยอัตโนมัติ

// Connection monitoring สำหรับแสดงสถานะ (ไม่แทรกแซง SDK)
let lastLoggedStatus = null; // ป้องกันการ log ซ้ำ

export const monitorConnection = (callback) => {
  let isOnline = navigator.onLine;
  
  const updateConnectionStatus = (online) => {
    isOnline = online;
    
    // Log เฉพาะเมื่อสถานะเปลี่ยนแปลง
    if (lastLoggedStatus !== online) {
      console.log(`🌐 Connection status: ${online ? 'Online' : 'Offline'}`);
      lastLoggedStatus = online;
    }
    
    // The SDK handles enabling/disabling network automatically.
    // We just notify the app of the status change.
    callback(online);
  };
  
  const handleOnline = () => updateConnectionStatus(true);
  const handleOffline = () => updateConnectionStatus(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Initial check (ถ้ายังไม่เคย log)
  if (lastLoggedStatus === null) {
    updateConnectionStatus(isOnline);
  } else {
    // เรียก callback โดยไม่ log
    callback(isOnline);
  }
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Error wrapper for Firebase operations
export const withFirebaseErrorHandling = (operation) => {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      console.error('🔥 Firebase operation failed:', error);
      
      if (error.code === 'permission-denied') {
        console.error('❌ Permission denied - check authentication');
      } else if (error.code === 'unavailable') {
        console.log('🔄 Firestore temporarily unavailable');
      } else if (error.code === 'unauthenticated') {
        console.error('❌ User not authenticated');
        if (process.env.NODE_ENV === 'development') {
          await signInAnonymously(auth);
          return operation(...args);
        }
      }
      
      throw error;
    }
  };
};

// Development mode emulators (ปิดการใช้งานชั่วคราว)
/*
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATORS === 'true') {
  const useEmulators = () => {
    try {
      connectAuthEmulator(auth, "http://localhost:9099");
      connectFirestoreEmulator(firestore, 'localhost', 8080);
      connectStorageEmulator(storage, "localhost", 9199);
    } catch (error) {
    }
  };
  
  // Only connect to emulators once
  if (!auth._emulatorConfig) {
    useEmulators();
  }
}
*/

// Export services for use in other parts of your app
export { 
  auth, 
  firestore, 
  storage, 
  googleProvider,
  // Firestore functions
  doc,
  collection,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc
};
