import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const BalanceContext = createContext();

export const useBalance = () => useContext(BalanceContext);

export const BalanceProvider = ({ children }) => {
  const [balance, setBalance] = useState(null);
  const [userId, setUserId] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      setUserId(currentUser.uid);
      setBalance(1000000);
    } else {
      setBalance(null);
      setUserId(null);
    }
  }, [currentUser]);

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
