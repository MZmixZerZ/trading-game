"use client";
import { Link } from "react-router-dom";
import logo from "../assets/logo.svg";
import ProfileDropdown from "./ProfileDropDown";

export default function Navbar() {
  return (
    <nav className="w-full bg-[#202431] text-white py-2 shadow-md border-b-4 border-b-[#E0B469]">
      <div className="px-4 flex justify-between items-center w-full">
        {/* Left side: Logo + Links */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center">
            <img
              src={logo || "/placeholder.svg"}
              alt="IDEA TRADE"
              className="h-9 sm:h-12 md:h-14 lg:h-16 w-auto filter brightness-0 invert"
            />
          </Link>
          <Link to="/" className="hover:text-gray-300 text-lg sm:text-xl">
            หน้าหลัก
          </Link>
          <Link
            to="/trading"
            className="hover:text-gray-300 text-lg sm:text-xl"
          >
            ตลาด
          </Link>
          <Link
            to="/ai-quiz"
            className="hover:text-gray-300 text-lg sm:text-xl"
          >
            AI Quiz
          </Link>
          <Link
            to="/about-us"
            className="hover:text-gray-300 text-lg sm:text-xl"
          >
            เกี่ยวกับเรา
          </Link>
        </div>

        {/* Right side: Balance + Notification + Profile */}
        <div className="flex items-center space-x-4">
          <ProfileDropdown />
        </div>
      </div>
    </nav>
  );
}
