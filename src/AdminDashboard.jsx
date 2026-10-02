import React, { useState, useEffect } from 'react';
import { Users, Calendar, Activity, Pill, ShieldAlert, Key, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard({ staffList = [], onRefreshStaff }) {
  const [loadingUser, setLoadingUser] = useState(null);
  const [localStaff, setLocalStaff] = useState(staffList);

  // Keep local state synced if props update
  useEffect(() => {
    setLocalStaff(staffList);
  }, [staffList]);

  // Filter out staff who have requested a password reset
  const pendingResets = localStaff.filter(s => s.reset_requested);

  // Handle Admin Approving a Password Reset from the Dashboard
  const handleApproveReset = async (username) => {
    setLoadingUser(username);
    try {
      const response = await fetch('[https://carepoint-backend-tt0b.onrender.com](https://carepoint-backend-tt0b.onrender.com)/api/staff/admin-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(
          <div>
            <p className="font-bold">Password Reset Approved!</p>
            <p className="text-xs mt-1">Temp Password for <b>{username}</b>:</p>
            <code className="bg-gray-100 px-2 py-1 rounded text-indigo-600 font-mono font-bold select-all">
              {data.tempPassword}
            </code>
          end,
          { duration: 12000 }
        );

        // Update local state to remove the reset badge immediately
        setLocalStaff(prev => 
          prev.map(s => s.username === username ? { ...s, reset_requested: false } : s)
        );

        if (onRefreshStaff) onRefreshStaff();
      } else {
        toast.error(data.error || 'Failed to reset password.');
      }
    } catch (err) {
      toast.error('Network error connecting to server.');
    } finally {
      setLoadingUser(null);
    }
  };

  const stats = [
    { label: 'Total Patients', value: '1,248', icon: Users, color: 'bg-blue-500' },
    { label: 'Appointments Today', value: '42', icon: Calendar, color: 'bg-indigo-500' },
    { label: 'Active Staff', value: localStaff.length || '64', icon: Activity, color: 'bg-green-500' },
    { label: 'Pharmacy Alerts', value: '3', icon: Pill, color: 'bg-red-500' },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Hospital Overview</h2>
          <p className="text-sm text-gray-500">Welcome back, Administrator. Here is your system status.</p>
        </div>
      </div>

      {/* ========================================== */}
      {/* PASSWORD RESET ALERTS BANNER (If any) */}
      {/* ========================================== */}
      {pendingResets.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-sm animate-bounce-subtle">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="font-black text-red-900 text-lg">Action Required: Password Reset Requests</h3>
              <p className="text-xs text-red-600 font-medium">The following staff members have requested access recovery from the login screen.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingResets.map(user => (
              <div key={user.id || user.username} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 capitalize">{user.username}</p>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {user.role || 'Staff'}
                  </span>
                </div>
                <button
                  onClick={() => handleApproveReset(user.username)}
                  disabled={loadingUser === user.username}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Key size={14} />
                  {loadingUser === user.username ? 'Processing...' : 'Approve Reset'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4 transition-all hover:shadow-md">
            <div className={`${stat.color} text-white p-3.5 rounded-xl flex-shrink-0 shadow-sm`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area / Live Analytics Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 h-80 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
          <Activity size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Live Analytics & Department Load</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Real-time patient flow and hospital capacity metrics are synchronized with PostgreSQL.
        </p>
      </div>

    </div>
  );
}