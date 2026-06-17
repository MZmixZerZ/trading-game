import React, { useState, useRef, useEffect } from "react";
import { CircleUserRound, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { auth, firestore } from "../firebase/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setAvatar] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [earnedTitle, setEarnedTitle] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email);
        setAvatar(user.photoURL || localStorage.getItem(`avatarUrl-${user.email}`) || null);
        
        // โหลดฉายาจาก Firebase
        try {
          const userRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setEarnedTitle(userData.earnedTitle || '');
          }
        } catch (error) {
          console.error('Error loading user title:', error);
        }
      } else {
        setAvatar(null);
        setUserEmail(null);
        setEarnedTitle('');
      }
    });
    return () => unsubscribe();
  }, []);

  const goToAccount = () => {
    navigate("/account");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("token");
      sessionStorage.clear();
      setIsOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center">
        <CircleUserRound color="#CDCDCD" size={45} strokeWidth={1} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#202431] text-white rounded-md shadow-lg z-10 border border-[#E0B469]">
          <ul className="py-2 text-sm">
            {/* User Info Section */}
            <li className="px-4 py-3 border-b border-gray-600">
              <div className="text-gray-300 text-xs mb-1">ล็อกอินด้วย</div>
              <div className="text-white font-medium truncate">{userEmail}</div>
              {earnedTitle && (
                <div className="mt-2">
                  <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg px-3 py-1 text-center">
                    <div className="text-white font-bold text-xs">{earnedTitle}</div>
                  </div>
                </div>
              )}
            </li>
            
            <li className="hover:bg-gray-700 cursor-pointer">
              <button
                onClick={goToAccount}
                className="w-full flex items-center space-x-2 px-4 py-2 text-left"
              >
                <Settings size={18} />
                <span>Account Setting</span>
              </button>
            </li>
            <li className="hover:bg-gray-700 cursor-pointer">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-4 py-2 text-left text-red-400"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
