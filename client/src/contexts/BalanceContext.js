import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";

const BalanceContext = createContext();

export const useBalance = () => useContext(BalanceContext);

export const BalanceProvider = ({ children }) => {
  const [balance, setBalance] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        // ใช้ default balance แทน real-time tracking
        // เพื่อลด Firebase reads
        setBalance(1000000); // Default starting balance
      } else {
        setBalance(null);
        setUserId(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Method สำหรับอัปเดต balance แบบ manual
  const updateBalance = (newBalance) => {
    setBalance(newBalance);
  };

  return (
    <BalanceContext.Provider value={{ balance, userId, updateBalance }}>
      {children}
    </BalanceContext.Provider>
  );
};
