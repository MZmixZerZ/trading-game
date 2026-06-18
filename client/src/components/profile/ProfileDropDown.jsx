import React, { useState, useRef, useEffect } from "react";
import { CircleUserRound, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const goToAccount = () => {
    navigate("/account");
  };

  const handleLogout = async () => {
    try {
      await logout();
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
            <li className="px-4 py-3 border-b border-gray-600">
              <div className="text-gray-300 text-xs mb-1">ล็อกอินด้วย</div>
              <div className="text-white font-medium truncate">{currentUser?.email}</div>
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
