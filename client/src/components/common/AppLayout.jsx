import React from 'react';
import { Outlet } from 'react-router-dom';
import GameNavigation from './GameNavigation';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import FirebaseStatusPanelNew from './FirebaseStatusPanelNew';

// Shared app shell: fixed sidebar + padded content so pages don't overlap
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Fixed left sidebar */}
      <GameNavigation />

      {/* Connection Status Indicator */}
      <ConnectionStatusIndicator />

      {/* Firebase Status Panel */}
      <FirebaseStatusPanelNew />

      {/* Main content area offset to the right of the sidebar (w-20) */}
      <div className="pl-20">
        <Outlet />
      </div>
    </div>
  );
}
