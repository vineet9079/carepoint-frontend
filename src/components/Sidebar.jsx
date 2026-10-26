import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Calendar, FileText, 
  TestTube, Pill, CreditCard, ShieldCheck, 
  Settings, HelpCircle, LogOut, ChevronUp, User, Download 
} from 'lucide-react';

export default function Sidebar({ 
  user, 
  patientCount = 0,
  pendingPrescriptionsCount = 0,
  lowStockCount = 0,
  labReportCount = 0,
  onOpenSettings, 
  onOpenHelp, 
  onLogout 
}) {
  const location = useLocation();
  const currentPath = location.pathname;
  const role = user?.role?.toLowerCase() || 'admin';

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Catch the PWA Install Prompt
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // Prevent the mini-infobar from appearing on mobile
      setDeferredPrompt(e); // Stash the event so it can be triggered by our button
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null); // Hide the button permanently once installed
      }
      setIsMenuOpen(false); // Close the popup menu
    }
  };

  const allLinks = [
    { path: '/admin-dashboard', label: 'Overview', icon: LayoutDashboard, allowed: ['admin', 'receptionist'] },
    { path: '/patients', label: 'Patients', icon: Users, allowed: ['admin', 'doctor', 'receptionist', 'laboratorist', 'billing', 'pharmacist'], badge: patientCount },
    { path: '/appointments', label: 'Appointments', icon: Calendar, allowed: ['admin', 'receptionist', 'doctor'] },
    { path: '/prescriptions', label: 'Prescriptions', icon: FileText, allowed: ['admin', 'doctor', 'pharmacist'], badge: pendingPrescriptionsCount },
    { path: '/laboratory', label: 'Laboratory', icon: TestTube, allowed: ['admin', 'laboratorist', 'doctor'], badge: labReportCount },
    { path: '/pharmacy', label: 'Pharmacy', icon: Pill, allowed: ['admin', 'pharmacist'], badge: lowStockCount, badgeColor: 'bg-red-100 text-red-600' }, 
    { path: '/billing', label: 'Billing', icon: CreditCard, allowed: ['admin', 'receptionist', 'billing'] },
    { path: '/staff', label: 'Staff & Access', icon: ShieldCheck, allowed: ['admin'] },
  ];

  const visibleLinks = allLinks.filter(link => link.allowed.includes(role));

  return (
    <aside className="w-[260px] bg-white border-r border-gray-200 flex flex-col justify-between flex-shrink-0 no-print fixed h-screen z-[99999]">
      
      <div>
        <div className="h-20 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-lg mr-3 shadow-sm">+</div>
          <div>
            <h1 className="font-black text-gray-900 tracking-tight text-xl">CarePoint</h1>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Health Network</p>
          </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-2">Main Menu</p>
          
          {visibleLinks.map((link) => {
            const isActive = currentPath === link.path;
            const Icon = link.icon;
            
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                  {link.label}
                </div>
                {link.badge > 0 && (
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${link.badgeColor || 'bg-indigo-100 text-indigo-700'}`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM SECTION WITH EXTREME Z-INDEX */}
      <div className="relative p-4 border-t border-gray-100 bg-gray-50 mt-auto z-[999999]">
        
        {isMenuOpen && (
          <div className="absolute bottom-[80px] left-4 right-4 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 z-[999999]">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account</p>
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name || user?.username}</p>
            </div>
            
            {/* PWA INSTALL BUTTON (Only shows if browser allows it and app is not installed) */}
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick} 
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer border-b border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <Download size={16} /> Install Desktop App
                </div>
                <span className="text-[10px] bg-indigo-100 px-2 py-0.5 rounded-full">New</span>
              </button>
            )}

            <button onClick={() => { onOpenSettings(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors cursor-pointer outline-none border-none">
              <Settings size={16} /> Settings & Security
            </button>
            <button onClick={() => { onOpenHelp(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors cursor-pointer outline-none border-none">
              <HelpCircle size={16} /> Help & Support
            </button>
            <div className="h-px bg-gray-100"></div>
            <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors cursor-pointer outline-none border-none">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}

        {/* NUCLEAR CLICKABLE BUTTON */}
        <div 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`w-full flex items-center justify-between p-2 rounded-xl transition-all duration-200 border select-none ${isMenuOpen ? 'bg-white border-gray-200 shadow-sm' : 'border-transparent hover:bg-gray-200'}`}
          style={{ cursor: 'pointer' }}
        >
          {/* pointerEvents: 'none' stops the text from hijacking the mouse cursor */}
          <div className="flex items-center gap-3" style={{ pointerEvents: 'none' }}>
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm uppercase shadow-sm">
              {user?.username ? user.username.charAt(0) : <User size={16} />}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 leading-tight">{user?.username || 'Admin'}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">View Profile</p>
            </div>
          </div>
          <ChevronUp size={16} className={`text-gray-600 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} style={{ pointerEvents: 'none' }} />
        </div>

      </div>
    </aside>
  );
}