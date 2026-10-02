import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import CarePointBot from '../components/CarePointBot';

export default function DashboardLayout({ user }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-800 relative">
      {/* 1. The Sidebar renders once on the left */}
      <Sidebar user={user} />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white/50 flex items-center justify-between px-8 absolute w-full z-10 backdrop-blur-sm border-b border-gray-100">
          <div className="flex items-center text-sm font-medium text-gray-500">
             <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
             CarePoint Network Active
          </div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-indigo-50 text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-100 transition">
            Refresh Data
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 pt-28">
          <div className="max-w-6xl mx-auto">
            {/* 2. The Outlet acts as a window. This is where your Admin, Doctor, or Pharmacy pages will magically swap in and out! */}
            <Outlet />
          </div>
        </div>
      </main>

      {/* 3. The Chatbot renders once on the right */}
      <CarePointBot role={user?.role} />
    </div>
  );
}