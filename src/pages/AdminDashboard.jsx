import React, { useState, useEffect, useMemo } from 'react';
import { Users, Calendar, Activity, Pill, ShieldAlert, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AdminDashboard({ 
  staffList = [], 
  onRefreshStaff,
  patients = [], 
  appointments = [], 
  inventory = [], 
  invoices = [] 
}) {
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
      const response = await fetch('https://carepoint-services.onrender.com/api/staff/admin-reset-password', {
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
          </div>,
          { duration: 12000 }
        );

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

  // ==========================================
  // REAL-TIME DATA CALCULATIONS
  // ==========================================
  const todayDate = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === todayDate).length;
  const lowStockAlerts = inventory.filter(i => i.quantity < 50).length;

  const stats = [
    { label: 'Total Patients', value: patients.length || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Appointments Today', value: todayAppointments || 0, icon: Calendar, color: 'bg-indigo-500' },
    { label: 'Active Staff', value: localStaff.length || 0, icon: Activity, color: 'bg-green-500' },
    { label: 'Pharmacy Alerts', value: lowStockAlerts || 0, icon: Pill, color: 'bg-red-500' },
  ];

  // 1. Calculate Real 7-Day Revenue Trend
  const realRevenueData = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        name: days[d.getDay()],
        dateStr: d.toISOString().split('T')[0],
        value: 0 
      };
    });

    invoices.forEach(inv => {
      if (inv.status === 'PAID' && inv.date) {
        const match = last7Days.find(d => d.dateStr === inv.date);
        if (match) {
          match.value += Number(inv.totalAmount) || 0;
        }
      }
    });

    return last7Days;
  }, [invoices]);

  // 2. Calculate Real Patient Flow for Today
  const realPatientFlowData = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    
    const flow = { '08:00': 0, '10:00': 0, '12:00': 0, '14:00': 0, '16:00': 0, '18:00': 0 };
    
    appointments.forEach(app => {
      if (app.date === todayDate && app.time) {
        const hour = parseInt(app.time.split(':')[0], 10);
        if (hour >= 8 && hour < 10) flow['08:00']++;
        else if (hour >= 10 && hour < 12) flow['10:00']++;
        else if (hour >= 12 && hour < 14) flow['12:00']++;
        else if (hour >= 14 && hour < 16) flow['14:00']++;
        else if (hour >= 16 && hour < 18) flow['16:00']++;
        else if (hour >= 18) flow['18:00']++;
      }
    });

    return Object.keys(flow).map(time => ({ time, patients: flow[time] }));
  }, [appointments, todayDate]);

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

      {/* Live Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-indigo-600" size={20} />
            <h3 className="font-bold text-gray-900">7-Day Revenue Trend</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patient Flow Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="text-emerald-500" size={20} />
            <h3 className="font-bold text-gray-900">Patient Flow (Today)</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={realPatientFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="patients" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}