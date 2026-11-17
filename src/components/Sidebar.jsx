import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList, FlaskConical,
  Pill, ReceiptText, UserRoundCog, Settings, CircleHelp, LogOut,
  ChevronRight, HeartPulse, Download, X
} from 'lucide-react';

const navigation = [
  { label: 'Overview', to: '/admin-dashboard', icon: LayoutDashboard, roles: ['admin', 'receptionist'] },
  { label: 'Patients', to: '/patients', icon: Users, roles: ['admin', 'doctor', 'receptionist', 'laboratorist', 'billing', 'pharmacist'] },
  { label: 'Appointments', to: '/appointments', icon: CalendarDays, roles: ['admin', 'doctor', 'receptionist'] },
  { label: 'Prescriptions', to: '/prescriptions', icon: ClipboardList, roles: ['admin', 'doctor', 'pharmacist'] },
  { label: 'Lab results', to: '/lab-results', icon: FlaskConical, roles: ['admin', 'doctor'] },
  { label: 'Laboratory', to: '/laboratory', icon: FlaskConical, roles: ['admin', 'doctor', 'laboratorist'] },
  { label: 'Pharmacy', to: '/pharmacy', icon: Pill, roles: ['admin', 'pharmacist'] },
  { label: 'Billing', to: '/billing', icon: ReceiptText, roles: ['admin', 'receptionist', 'billing'] },
  { label: 'Staff', to: '/staff', icon: UserRoundCog, roles: ['admin'] },
];

export default function Sidebar({ user, isOpen = false, onClose, patientCount = 0, pendingPrescriptionsCount = 0, lowStockCount = 0, labReportCount = 0, onOpenSettings, onOpenHelp, onLogout }) {
  const location = useLocation();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);
  const role = (user?.role || '').toLowerCase();
  const items = navigation.filter(item => item.roles.includes(role));
  const initials = (user?.username || user?.name || 'User').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    const capture = event => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener('beforeinstallprompt', capture);
    return () => window.removeEventListener('beforeinstallprompt', capture);
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    setInstalling(true);
    try { await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); }
    finally { setInstalling(false); }
  };

  const badgeFor = label => label === 'Prescriptions' ? pendingPrescriptionsCount : label === 'Pharmacy' ? lowStockCount : label === 'Lab results' ? labReportCount : label === 'Patients' ? patientCount : 0;

  return (
    <>
    <aside className={`cp-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="cp-brand">
        <div className="cp-brand-mark"><HeartPulse size={21} strokeWidth={2.2} /></div>
        <div><div className="cp-brand-name">CarePoint</div><div className="cp-brand-caption">HOSPITAL MANAGEMENT</div></div><button type="button" className="cp-sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={18}/></button>
      </div>
      <div className="cp-sidebar-section-label">WORKSPACE</div>
      <nav className="cp-nav" aria-label="Main navigation">
        {items.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.to || (item.to === '/laboratory' && location.pathname === '/laboratory');
          const count = badgeFor(item.label);
          return <NavLink key={item.to} to={item.to} onClick={onClose} className={({ isActive }) => `cp-nav-link ${isActive ? 'is-active' : ''}`}>
            <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{count > 0 && <span className="cp-nav-count">{count > 99 ? '99+' : count}</span>}
          </NavLink>;
        })}
      </nav>
      <div className="cp-sidebar-spacer" />
      {installPrompt && <button className="cp-install-button" onClick={installApp} disabled={installing}><Download size={16}/>{installing ? 'Opening…' : 'Install app'}</button>}
      <div className="cp-sidebar-tools">
        <button onClick={() => { onOpenSettings?.(); onClose?.(); }}><Settings size={17}/>Settings<ChevronRight size={15}/></button>
        <button onClick={() => { onOpenHelp?.(); onClose?.(); }}><CircleHelp size={17}/>Help & support<ChevronRight size={15}/></button>
      </div>
      <div className="cp-user-card">
        <div className="cp-avatar">{initials}</div>
        <div className="cp-user-meta"><strong>{user?.username || user?.name || 'CarePoint User'}</strong><span>{user?.role || 'Staff'}</span></div>
        <button className="cp-logout" onClick={onLogout} aria-label="Log out" title="Log out"><LogOut size={17}/></button>
      </div>
    </aside>
    <nav className="cp-mobile-nav" aria-label="Mobile navigation">
      {items.slice(0, 5).map(item => {
        const Icon = item.icon;
        return <NavLink key={item.to} to={item.to} className={({ isActive }) => `cp-mobile-nav-link ${isActive ? 'is-active' : ''}`}>
          <Icon size={18} strokeWidth={1.9}/><span>{item.label}</span>
        </NavLink>;
      })}
    </nav>
    </>
  );
}
