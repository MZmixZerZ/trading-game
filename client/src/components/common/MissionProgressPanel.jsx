import React from 'react';
import { 
  FaTrophy, 
  FaFlag,
  FaClock, 
  FaCheckCircle,
  FaSpinner
} from 'react-icons/fa';
import { BsLightningCharge } from 'react-icons/bs';

const MissionProgressPanel = ({ 
  currentLevel = 1,
  missions = [],
  completedMissions = [],
  timeRemaining = null
}) => {

  // ข้อมูลตัวอย่างหากไม่มี missions ส่งมา
  const defaultMissions = [
    {
      id: 1,
      title: "เป้าหมายกำไร - ภารกิจหลัก",
      description: "ทำกำไร 50,000 บาท เพื่อผ่านด่าน",
      type: "profit",
      target: 50000,
      current: 0,
      reward: "ผ่านด่าน + 400 points",
      icon: "💰",
      isMainMission: true,
      priority: 1
    },
    {
      id: 2,
      title: "ทำการซื้อขายครั้งแรก",
      description: "เริ่มต้นการเทรดของคุณ",
      type: "trade",
      target: 1,
      current: 0,
      reward: "100 points",
      icon: "🎯",
      isMainMission: false,
      priority: 2
    },
    {
      id: 3,
      title: "วิเคราะห์กราฟ",
      description: "วิเคราะห์แนวโน้ม 5 ครั้ง",
      type: "analysis",
      target: 5,
      current: 0,
      reward: "150 points",
      icon: "📊",
      isMainMission: false,
      priority: 3
    }
  ];

  const activeMissions = missions.length > 0 ? missions : defaultMissions;

  // เรียงลำดับ missions โดยให้ภารกิจหลักมาก่อน
  const sortedMissions = [...activeMissions].sort((a, b) => {
    if (a.isMainMission && !b.isMainMission) return -1;
    if (!a.isMainMission && b.isMainMission) return 1;
    return (a.priority || 0) - (b.priority || 0);
  });

  const getMissionStatus = (mission) => {
    if (completedMissions.includes(mission.id)) {
      return 'completed';
    }
    if (mission.current > 0) {
      return 'in-progress';
    }
    return 'pending';
  };

  const getMissionIcon = (mission) => {
    const status = getMissionStatus(mission);
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="text-green-400 text-lg" />;
      case 'in-progress':
        return <FaSpinner className="text-blue-400 text-lg animate-spin" />;
      default:
        return <span className="text-lg">{mission.icon}</span>;
    }
  };

  const getMissionColor = (mission) => {
    const status = getMissionStatus(mission);
    
    // ภารกิจหลักจะมีสีพิเศษ
    if (mission.isMainMission) {
      switch (status) {
        case 'completed':
          return 'from-yellow-600/20 to-yellow-500/20 border-yellow-500/30 shadow-yellow-500/20';
        case 'in-progress':
          return 'from-orange-600/20 to-orange-500/20 border-orange-500/30 shadow-orange-500/20';
        default:
          return 'from-amber-600/20 to-amber-500/20 border-amber-500/30 shadow-amber-500/20';
      }
    }
    
    // ภารกิจธรรมดา
    switch (status) {
      case 'completed':
        return 'from-green-600/20 to-green-500/20 border-green-500/30';
      case 'in-progress':
        return 'from-blue-600/20 to-blue-500/20 border-blue-500/30';
      default:
        return 'from-gray-600/20 to-gray-500/20 border-gray-500/30';
    }
  };

  const formatTarget = (value, type) => {
    switch (type) {
      case 'profit':
        return `฿${value.toLocaleString()}`;
      case 'trade':
        return `${value} times`;
      case 'analysis':
        return `${value} times`;
      default:
        return value;
    }
  };

  const formatTimeRemaining = (seconds) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-gray-600/30 rounded-xl p-4 space-y-4 min-h-[400px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
            <FaFlag className="text-purple-400 text-sm" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Mission {currentLevel}</h3>
            <p className="text-xs text-gray-400">Mission Progress</p>
          </div>
        </div>
        
        {timeRemaining && (
          <div className="flex items-center gap-1 bg-gradient-to-r from-orange-600/20 to-red-500/20 border border-orange-500/30 rounded-lg px-2 py-1">
            <FaClock className="text-orange-400 text-xs" />
            <span className="text-xs font-bold text-white">
              {formatTimeRemaining(timeRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Overall Progress */}
      <div className="bg-slate-700/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Overall Progress</span>
          <span className="text-sm font-bold text-white">
            {Math.round((completedMissions.length / sortedMissions.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-1"
            style={{ width: `${(completedMissions.length / sortedMissions.length) * 100}%` }}
          >
            {completedMissions.length === sortedMissions.length && (
              <FaTrophy className="text-yellow-400 text-sm" />
            )}
          </div>
        </div>
        
        {/* แสดงสถานะภารกิจหลัก */}
        {sortedMissions.find(m => m.isMainMission) && (
          <div className="mt-3 p-2 bg-amber-600/10 border border-amber-500/20 rounded text-sm">
            <span className="text-amber-400 font-semibold">🏆 Main Mission: </span>
            <span className="text-white">
              {completedMissions.includes(sortedMissions.find(m => m.isMainMission).id) 
                ? "✅ Completed - Level Up!" 
                : "⏳ Must be completed to level up"}
            </span>
          </div>
        )}
      </div>

      {/* Missions List */}
      <div className="flex-1 flex flex-col space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-1">
          <BsLightningCharge className="text-yellow-400 text-sm" />
          Missions to Complete
        </h4>
        
        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">{/* รองรับหลาย missions */}
          {sortedMissions.map((mission) => {
            const status = getMissionStatus(mission);
            const progress = Math.min((mission.current / mission.target) * 100, 100);
            
            return (
              <div
                key={mission.id}
                className={`bg-gradient-to-r ${getMissionColor(mission)} border rounded-lg p-3 transition-all duration-300 hover:shadow-lg ${
                  mission.isMainMission ? 'ring-2 ring-amber-500/30 shadow-lg' : ''
                }`}
              >
                {/* แสดงป้าย "ภารกิจหลัก" */}
                {mission.isMainMission && (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-sm bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full font-semibold border border-amber-500/30">
                      🏆 Main Mission
                    </span>
                  </div>
                )}
                
                <div className="flex items-start gap-3">{/* เพิ่ม gap */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getMissionIcon(mission)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className={`text-sm font-bold truncate ${
                        mission.isMainMission ? 'text-amber-200' : 'text-white'
                      }`}>
                        {mission.title}
                      </h5>
                      <span className={`text-sm flex-shrink-0 ml-2 ${
                        mission.isMainMission ? 'text-amber-300 font-semibold' : 'text-gray-300'
                      }`}>
                        {mission.reward}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-2">
                      {mission.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-300">
                        {formatTarget(mission.current, mission.type)} / {formatTarget(mission.target, mission.type)}
                      </span>
                      <span className={`text-gray-400 ${mission.showAsFailed ? 'text-red-400 font-bold' : ''}`}>
                        {mission.showAsFailed ? "Failed" : `${Math.round(progress)}%`}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          mission.showAsFailed
                            ? 'bg-gradient-to-r from-red-600 to-red-500'
                            : mission.isMainMission
                            ? status === 'completed' 
                              ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                              : status === 'in-progress'
                              ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                              : 'bg-gradient-to-r from-amber-600 to-amber-500'
                            : status === 'completed' 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                              : status === 'in-progress'
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                              : 'bg-gray-600'
                        }`}
                        style={{ width: mission.showAsFailed ? '100%' : `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-600/30 mt-auto">
        <div className="text-center">
          <div className="text-lg font-bold text-green-400">
            {completedMissions.length}
          </div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">
            {sortedMissions.filter(m => getMissionStatus(m) === 'in-progress').length}
          </div>
          <div className="text-sm text-gray-400">Doing</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-gray-400">
            {sortedMissions.filter(m => getMissionStatus(m) === 'pending').length}
          </div>
          <div className="text-sm text-gray-400">Pending</div>
        </div>
      </div>
    </div>
  );
};

export default MissionProgressPanel;
