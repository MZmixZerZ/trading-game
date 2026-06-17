import React, { useState } from "react";
import { Link } from "react-router-dom";
import GameHeader from "../../components/common/GameHeader";
import { 
  FaArrowLeft, 
  FaGamepad, 
  FaLightbulb, 
  FaChartLine, 
  FaCoins,
  FaUser,
  FaUsers,
  FaTrophy
} from "react-icons/fa";

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState("overview");

  const helpSections = [
    { id: "overview", label: "Game Overview", icon: <FaGamepad /> },
    { id: "features", label: "Game Features", icon: <FaCoins /> },
    { id: "solo", label: "Solo Mode", icon: <FaUser /> },
    { id: "multiplayer", label: "Multiplayer Mode", icon: <FaUsers /> },
    { id: "trading", label: "Trading Basics", icon: <FaChartLine /> },
    { id: "scoring", label: "Scoring System", icon: <FaTrophy /> },
    { id: "tips", label: "Trading Tips", icon: <FaLightbulb /> }
  ];

  const renderContent = () => {
    switch(activeSection) {
      case "overview":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Game Overview</h2>
            <div className="text-gray-200 space-y-4">
              <p className="text-lg leading-relaxed">
                Welcome to IDEA TRADE - an educational stock trading simulation game designed to help you learn the basics of the stock market without financial risk.
              </p>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">Game Mode</h3>
                <ul className="space-y-2">
                  <li className="text-gray-200">• <strong>Solo Mode:</strong> Practice trading skills with market situations</li>
                  <li className="text-gray-200">• <strong>Multiplayer Mode:</strong> Compete with other players in real-time</li>
                  <li className="text-gray-200">• <strong>Tutorial Mode:</strong> Learn through guided lessons</li>
                </ul>
              </div>
            </div>
          </div>
        );
      
      case "features":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-4">Game Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h4 className="text-lg text-cyan-400 mb-3">Real-time Trading System</h4>
                <p className="text-gray-300">Make quick buy/sell decisions with instantly updated data, simulating the real stock market.</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h4 className="text-lg text-emerald-400 mb-3">Rating and Ranking System</h4>
                <p className="text-gray-300">Track your progress and compete with other players by collecting gameplay statistics.</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h4 className="text-lg text-purple-400 mb-3">⚡ Multiple Game Modes</h4>
                <p className="text-gray-300">Choose to play solo or compete with friends, with various difficulty levels available.</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h4 className="text-lg text-yellow-400 mb-3">Easy to Learn</h4>
                <p className="text-gray-300">A user-friendly game suitable for beginners and experts alike, with comprehensive help systems.</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h4 className="text-lg text-blue-400 mb-3">Detailed Charts and Data</h4>
                <p className="text-gray-300">Display candlestick charts, trading volume, and other technical information.</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h4 className="text-lg text-pink-400 mb-3">Chat and Social Features</h4>
                <p className="text-gray-300">Communicate with other players, share experiences, and exchange trading techniques.</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-800/50 to-purple-800/50 rounded-lg p-6 mt-8">
              <h3 className="text-2xl text-white mb-4">Game Objectives</h3>
              <div className="text-gray-300 space-y-2">
                <p>• Learn the basics of safe stock market investing.</p>
                <p>• Practice chart analysis and quick decision-making skills.</p>
                <p>• Understand the risks and rewards of investing.</p>
                <p>• Develop a trading strategy that suits your style.</p>
              </div>
            </div>
          </div>
        );
      
      case "solo":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-4">Solo Challenge</h2>
            <div className="text-gray-300 space-y-4">
              <p>
                Practice your trading skills in a risk-free environment with virtual currency.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-xl font-semibold text-green-400 mb-2">Beginner Mode</h3>
                  <p>Start with basic market scenarios and simple trading decisions.</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-xl font-semibold text-yellow-400 mb-2">Advanced Mode</h3>
                  <p>Complex market conditions with multiple factors affecting stock prices.</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case "multiplayer":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-4">Multiplayer Mode</h2>
            <div className="text-gray-300 space-y-4">
              <p>
                Compete with other players in real-time trading competitions.
              </p>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-purple-400 mb-2">How to Play</h3>
                <ol className="space-y-2">
                  <li>1. Create or join a trading room</li>
                  <li>2. Wait for other players to join</li>
                  <li>3. Trade during the specified time period</li>
                  <li>4. Compare results with other players</li>
                </ol>
              </div>
            </div>
          </div>
        );
      
      case "trading":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-4">Trading Basics</h2>
            <div className="text-gray-300 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-xl font-semibold text-green-500 mb-2">Buy Orders</h3>
                  <p>Purchase stocks when you expect the price to rise.</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-xl font-semibold text-red-500 mb-2">Sell Orders</h3>
                  <p>Sell stocks when you expect the price to fall or to take profits.</p>
                </div>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-blue-400 mb-2">Market Analysis</h3>
                <p>Use charts, news, and technical indicators to make informed trading decisions.</p>
              </div>
            </div>
          </div>
        );
      
      case "scoring":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-4">Scoring System</h2>
            <div className="text-gray-300 space-y-4">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-yellow-400 mb-2">Points Calculation</h3>
                <ul className="space-y-2">
                  <li>• Base points for profitable trades</li>
                  <li>• Bonus points for consistent performance</li>
                  <li>• Time-based bonuses for quick decisions</li>
                  <li>• Risk management bonuses</li>
                </ul>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-purple-400 mb-2">Rankings</h3>
                <p>Your performance is ranked against other players globally and in your region.</p>
              </div>
            </div>
          </div>
        );
      
      case "tips":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-4">Trading Tips</h2>
            <div className="text-gray-300 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-green-500">
                  <h4 className="font-semibold text-green-400">Start Small</h4>
                  <p>Begin with small trades to learn the market mechanics.</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-semibold text-blue-400">Diversify</h4>
                  <p>Don't put all your virtual money in one stock.</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-yellow-500">
                  <h4 className="font-semibold text-yellow-400">Stay Informed</h4>
                  <p>Follow market news and trends to make better decisions.</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-purple-500">
                  <h4 className="font-semibold text-purple-400">Practice Patience</h4>
                  <p>Good trading opportunities take time to develop.</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-y-auto scrollbar-thin" style={{ height: '100vh' }}>
      <GameHeader showBackButton={true} backPath="/challenge" />
      
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-10 left-1/2 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row h-full pt-20">
        {/* Sidebar Navigation */}
        <div className="lg:w-1/4 p-6">
          <div className="bg-gray-800/30 backdrop-blur-md rounded-xl p-6 border border-gray-700/50">
            <h2 className="text-2xl font-bold text-white mb-6">Help Topics</h2>
            <nav className="space-y-2">
              {helpSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 hover:scale-105 ${
                    activeSection === section.id
                      ? "bg-cyan-500 text-white shadow-lg"
                      : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                  }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="font-medium">{section.label}</span>
                </button>
              ))}
            </nav>

            <Link
              to="/challenge"
              className="mt-8 w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg transition-all duration-200"
            >
              <FaArrowLeft />
              <span>Back to Challenge</span>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4 p-6">
          <div
            key={activeSection}
            className="bg-gray-800/30 backdrop-blur-md rounded-xl p-8 border border-gray-700/50 min-h-[600px] transition-all duration-300 opacity-100"
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
