import { MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.svg"; // adjust path as needed

export default function Footer() {
  return (
    <footer className="bg-[#202431] text-white pt-10 pb-6 border-t border-gray-700">
      <div className="max-w-screen-xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-lg">
        {/* Left: Logo + About */}
        <div className="space-y-4">
          <img src={logo} alt="IDEA TRADE" className="h-12 filter brightness-0 invert" />
          <p className="text-gray-400 leading-relaxed">
            Pi Securities Public Company Limited บริษัทหลักทรัพย์ พาย จำกัด (มหาชน)
          </p>
        </div>

        {/* Middle: Pages */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-xl">Pages</h3>
          <ul className="space-y-2 text-gray-400">
            <li>
                <Link to="/" className="hover:text-white">
                  หน้าหลัก
                </Link>
            </li>
            <li>
                <Link to="/about-us" className="hover:text-white">
                  เกี่ยวกับเรา
                </Link>
            </li>
            <li>
                <Link to="/trading" className="hover:text-white">
                  เริ่มเทรด
                </Link>
            </li>
          </ul>
        </div>

        {/* Right: Contact */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-xl">ติดต่อเรา</h3>
          <div className="flex items-start gap-3 text-gray-400 mb-3">
            <MapPin className="text-green-400 mt-1" size={20} />
            <p>
              132 อาคารสินธร ทาวเวอร์ 3 ชั้น 27
              <br />
              ถนนวิทยุ แขวงลุมพินี เขตปทุมวัน
              <br />
              กรุงเทพมหานคร 10330
            </p>
          </div>
          <div className="flex items-center gap-3 text-gray-400 mb-3">
            <Phone className="text-green-400" size={20} />
            <p>02 205 7041</p>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <Mail className="text-green-400" size={20} />
            <p>yanisa.ph@pi.financial</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-10 border-t border-gray-700 pt-4 text-center text-gray-500 text-lg">
        © 2025 Streaming IdeaTrade. All Rights Reserved.
      </div>
    </footer>
  );
}
