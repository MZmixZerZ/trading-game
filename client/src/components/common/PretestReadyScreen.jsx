/**
 * PretestReadyScreen.jsx - หน้าจอสำหรับถามความพร้อมในการทำ Pretest
 * 
 * ใช้แสดงหลังจากเล่น Tutorial Popup จบแล้ว
 * มี UI ที่ดูสวยงามและน่าสนใจ พร้อมข้อมูลครบถ้วน
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa';

export default function PretestReadyScreen({ 
  onStartPretest, 
  onGoBack, 
  tutorialCompleted = true 
}) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[1001] bg-slate-950/80 backdrop-blur-sm">
      <div className="absolute inset-0 flex items-start md:items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-4xl">
          <div className="mx-auto rounded-2xl md:rounded-3xl border border-slate-700/60 bg-slate-800/70 shadow-2xl">
            {/* Top bar */}
            <div className="h-14 w-full bg-slate-900/50 rounded-t-2xl md:rounded-t-3xl border-b border-slate-700/60" />

            {/* Card content */}
            <div className="p-6 md:p-10">
              {/* Life Points */}
              <div className="text-center text-emerald-400 font-medium mb-6 md:mb-8">
                การทดสอบ: ใช้เวลา 5 นาที เพื่อประเมินความสามารถ
                {tutorialCompleted ? '' : ''}
              </div>

              {/* Hearts */}
              <div className="flex justify-center gap-6 md:gap-8 mb-6 md:mb-8">
                {[0,1,2].map((i) => (
                  <div key={i} className="text-emerald-500 animate-[heartbeat_1.2s_ease-in-out_infinite]" style={{animationDelay: `${i*120}ms`}}>
                    <FaHeart className="text-3xl md:text-4xl drop-shadow" />
                  </div>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-center text-3xl md:text-4xl font-extrabold text-white mb-6 md:mb-8 tracking-tight">
                พร้อมสำหรับแบบทดสอบหรือยัง?
              </h1>

              {/* Description */}
              <div className="text-center text-slate-300/90 space-y-3 md:space-y-4 mb-8 md:mb-10">
                <p className="text-lg">ทดสอบความรู้ที่ได้เรียนมาเป็นเวลา 5 นาที</p>
                <p>ลองใช้ความรู้ที่ได้เรียน ก่อนเข้าสู่การแข่งขันจริง</p>
                <p>สิ่งที่คุณจะได้รับ:</p>
                <div className="bg-slate-800/50 rounded-xl p-4 mx-auto max-w-md">
                  <p>✅ ปลดล็อคระดับความยาก</p>
                  <p>✅ ฉายาตามผลงาน</p>
                  <p>✅ ประเมินทักษะการซื้อขาย</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={onGoBack}
                  className="px-6 py-2 md:px-8 md:py-3 rounded-xl bg-slate-700/80 text-slate-200 hover:bg-slate-600 transition-all shadow-md"
                >
                  ← หน้าก่อนหน้า
                </button>
                <button
                  onClick={() => navigate('/quiz')}
                  className="px-6 py-2 md:px-8 md:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg ring-1 ring-indigo-400/20 hover:shadow-indigo-500/25 transition-all"
                >
                  ไปหน้า Quiz
                </button>
                <button
                  onClick={onStartPretest}
                  className="px-6 py-2 md:px-8 md:py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg ring-1 ring-emerald-400/20 hover:shadow-emerald-500/25 transition-all"
                >
                  เริ่มทดสอบเลย!
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* tiny gimmick animations */}
      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(239,68,68,.0)); }
          25% { transform: scale(1.2); filter: drop-shadow(0 0 8px rgba(239,68,68,.35)); }
          40% { transform: scale(0.95); }
          60% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
