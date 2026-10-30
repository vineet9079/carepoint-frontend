import React, { useState, useEffect, useCallback, useRef } from 'react';
import Chatbot from './components/Chatbot';
import Sidebar from './components/Sidebar';
import PatientDashboard from './components/PatientDashboard';
import { HashRouter as Router, Routes, Route, useNavigate, Navigate, useLocation, Link, Outlet } from 'react-router-dom';
import { 
  Users, Pill, FlaskConical, Receipt, Shield, 
  Activity, Clock, Zap, Plus, ArrowRight, IndianRupee, LayoutGrid, X, 
  Search, Send, Bot, AlertTriangle, Printer, QrCode, Edit3, TrendingUp, 
  AlertCircle, CheckCircle2, FileText, Trash2, Bell, Settings, HelpCircle, Wifi, WifiOff, LogOut,
  User, Lock, ShieldAlert, ArrowLeft, ChevronUp, Eye, EyeOff
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// ==========================================
// 1. TIMEZONE FIX HELPER
// ==========================================
// Guarantees we always use the local computer's date (India Time), never UTC.
const getLocalDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ==========================================
// 2. ROLE HELPERS & ROUTE GUARDS
// ==========================================
const getLandingPath = (role) => {
  switch ((role || '').toLowerCase()) {
    case 'patient': return '/patient-portal';
    case 'admin': return '/admin-dashboard';
    case 'doctor': return '/prescriptions';
    case 'pharmacist': return '/pharmacy';
    case 'laboratorist': return '/laboratory';
    case 'billing': return '/billing';
    case 'receptionist': 
    case 'reception': 
    case 'front desk': return '/appointments';
    default: return '/login';
  }
};

const RoleGuard = ({ user, allowedRoles, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  
  // FIX: Prevent Staff/Admin from forcing their way into the Patient Portal (stops the overlapping UI glitch)
  if (allowedRoles.includes('patient') && user.role.toLowerCase() !== 'patient') {
    return <Navigate to={getLandingPath(user.role)} replace />;
  }
  
  if (user.role.toLowerCase() === 'admin' || allowedRoles.includes(user.role.toLowerCase())) return children;
  return <Navigate to={getLandingPath(user.role)} replace />;
};

// ==========================================
// 3. OFFLINE / ONLINE SYNC ENGINE HOOKS
// ==========================================
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success("Network restored. Syncing to cloud..."); };
    const handleOffline = () => { setIsOnline(false); toast.error("Connection lost. Working locally."); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOnline;
}

function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  // NEW: Real-time cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        setValue(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [value, setValue];
}
const labTestPrices = { 'CBC': 450, 'LIPID': 800, 'THYROID': 1100, 'URINE': 250, 'XRAY': 1500 };

// ==========================================
// 4. PRINT WRAPPERS & TEMPLATES
// ==========================================
const PrintWrapper = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-gray-500 flex items-center justify-center z-[100] p-4 sm:p-8 print:p-0 print:bg-white overflow-y-auto">
    <div className="bg-white shadow-2xl max-w-3xl w-full min-h-[80vh] relative p-12 print:p-0 print:shadow-none print:w-full">
      <div className="absolute top-6 right-6 flex gap-3 print:hidden">
        <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition">
          <Printer size={16}/> Print
        </button>
        <button onClick={onClose} className="w-9 h-9 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-200 transition">
          <X size={18}/>
        </button>
      </div>
      <div className="border-b-2 border-indigo-600 pb-6 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">CarePoint</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Health Network System</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>123 Medical Plaza, Care District</p>
          <p>contact@carepoint.com | +91 800-555-CARE</p>
        </div>
      </div>
      {children}
      <div className="mt-24 pt-8 border-t border-gray-200 text-center text-[10px] text-gray-400 uppercase tracking-widest">
        Official CarePoint Document • Generated by {title}
      </div>
    </div>
  </div>
);

const PrintInvoice = ({ invoice, onClose }) => {
  if (!invoice) return null;
  return (
    <PrintWrapper title="Billing Department" onClose={onClose}>
      <div className="flex justify-between items-start mb-12">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Billed To</p>
          <h3 className="text-xl font-bold text-gray-900">{invoice?.patientName || 'Unknown Patient'}</h3>
          <p className="text-sm text-gray-500 mt-1">Patient ID: {invoice?.patientId || 'N/A'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Invoice Details</p>
          <p className="text-sm font-bold text-gray-900">{invoice?.id || 'INV-0000'}</p>
          <p className="text-sm text-gray-500 mt-1">
            {invoice?.date ? new Date(invoice.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
          </p>
          <div className={`inline-block mt-2 px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${invoice?.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            STATUS: {invoice?.status || 'PENDING'}
          </div>
        </div>
      </div>
      <table className="w-full text-left border-collapse mb-8">
        <thead>
          <tr className="border-b-2 border-gray-900 text-xs font-bold text-gray-900 uppercase tracking-wider">
            <th className="py-3">Description of Services</th>
            <th className="py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="text-sm border-b border-gray-200">
          <tr className="border-b border-gray-100">
            <td className="py-4 text-gray-700">{invoice?.services || 'Medical Services'}</td>
            <td className="py-4 text-right font-medium">₹{Number(invoice?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
      <div className="w-1/2 ml-auto space-y-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>₹{Number(invoice?.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>GST (18%)</span>
          <span>₹{Number(invoice?.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        {invoice?.advancePaid > 0 && (
          <div className="flex justify-between text-sm text-emerald-600 font-bold">
            <span>Advance Paid</span>
            <span>- ₹{Number(invoice.advancePaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-black text-indigo-600 pt-3 border-t-2 border-gray-900">
          <span>Net Amount Due</span>
          <span>₹{Number(invoice?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </PrintWrapper>
  );
};

const PrintPrescription = ({ prescription, onClose }) => {
  if (!prescription) return null;
  return (
    <PrintWrapper title="Clinical Department" onClose={onClose}>
      <div className="flex justify-between items-start mb-12">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Patient</p>
          <h3 className="text-xl font-bold text-gray-900 capitalize">{prescription.patientName}</h3>
          <p className="text-sm text-gray-500 mt-1">ID: {prescription.patientId}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Order Details</p>
          <p className="text-sm font-bold text-gray-900">{prescription.id}</p>
          <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </div>
      <div className="mb-8">
        <h4 className="text-sm font-bold text-gray-900 border-b-2 border-gray-900 pb-2 mb-4 uppercase tracking-wider">Clinical Diagnosis</h4>
        <p className="text-sm text-gray-700">{prescription.diagnosis || 'General checkup'}</p>
      </div>
      <div className="mb-8">
        <h4 className="text-sm font-bold text-gray-900 border-b-2 border-gray-900 pb-2 mb-4 uppercase tracking-wider">Rx Medications</h4>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <th className="py-3">Medicine Name</th>
              <th className="py-3">Route</th>
              <th className="py-3">Dosage & Freq</th>
              <th className="py-3 text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="text-sm border-b border-gray-200">
            {prescription.medications?.map((m, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-4 font-bold text-gray-900">{m.name}</td>
                <td className="py-4 text-gray-600">{m.route}</td>
                <td className="py-4 text-gray-600">{m.dosage} • {m.frequency}</td>
                <td className="py-4 text-right font-medium text-gray-900">{m.duration} days</td>
              </tr>
            ))}
            {(!prescription.medications || prescription.medications.length === 0) && (
              <tr><td colSpan="4" className="py-4 text-gray-500 italic">No medications prescribed. Lab order only.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PrintWrapper>
  );
};

const PrintLabReport = ({ labReport, onClose }) => {
  if (!labReport) return null;
  return (
    <PrintWrapper title="Diagnostic Laboratory" onClose={onClose}>
      <div className="flex justify-between items-start mb-12">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Patient</p>
          <h3 className="text-xl font-bold text-gray-900 capitalize">{labReport.patientName}</h3>
          <p className="text-sm text-gray-500 mt-1">ID: {labReport.patientId}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Test Details</p>
          <p className="text-sm font-bold text-gray-900">{labReport.testName} Analysis</p>
          <p className="text-sm text-gray-500 mt-1">Reported: {labReport.reported}</p>
          <p className="text-sm text-gray-500 mt-1">Ref: {labReport.id}</p>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-bold text-gray-900 border-b-2 border-gray-900 pb-2 mb-4 uppercase tracking-wider">Diagnostic Results</h4>
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
          {labReport.result?.split(' | ').join('\n') || 'Results pending review.'}
        </div>
      </div>
      <div className="mt-12 text-right">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Electronically Verified By</p>
        <p className="text-sm font-bold text-gray-900">CarePoint Lab Department</p>
      </div>
    </PrintWrapper>
  );
};
// ==========================================
// 5. SETTINGS & HELP MODALS
// ==========================================
function SettingsModal({ isOpen, onClose, user, onSendTicket }) {
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [showOldPass, setShowOldPass] = React.useState(false);
  const [showNewPass, setShowNewPass] = React.useState(false);
  const [message, setMessage] = React.useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = React.useState(false);

  if (!isOpen || !user) return null;

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setIsLoading(true);

    try {
      const response = await fetch('https://carepoint-services.onrender.com/api/staff/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          oldPassword: oldPassword,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ text: 'Password changed successfully.', type: 'success' });
        setOldPassword('');
        setNewPassword('');
      } else {
        setMessage({ text: data.error || 'Failed to change password.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network error. Could not reach server.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    onSendTicket(`Password Reset Request: User '${user.username}' (${user.role}) forgot their password and requires an admin reset.`);
    setMessage({ text: 'Reset request sent to Administration.', type: 'success' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 focus:outline-none">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-1">Profile Settings</h3>
          <p className="text-sm text-gray-500">Manage your account security.</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Logged in as</p>
            <p className="text-lg font-bold text-gray-900">{user.username}</p>
          </div>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-full uppercase">
            {user.role}
          </span>
        </div>

        {message.text && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Current Password</label>
            <div className="relative flex items-center">
              <input
                type={showOldPass ? "text" : "password"}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-12 focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowOldPass(!showOldPass)} className="absolute right-3 z-10 p-1 text-gray-500 hover:text-indigo-600 bg-white focus:outline-none cursor-pointer">
                {showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
            <div className="relative flex items-center">
              <input
                type={showNewPass ? "text" : "password"}
                required
                minLength="6"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-12 focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 z-10 p-1 text-gray-500 hover:text-indigo-600 bg-white focus:outline-none cursor-pointer">
                {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button type="button" onClick={handleForgotPassword} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              Forgot old password?
            </button>
            <button type="submit" disabled={isLoading} className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-70">
              {isLoading ? 'Updating...' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const HelpModal = ({ isOpen, onClose, onSendTicket }) => {
  const [message, setMessage] = useState('');
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if(!message.trim()) return;
    onSendTicket(message);
    toast.success("Help request sent to Admin.");
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition"><X size={16} /></button>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Help & Support</h3>
        <p className="text-sm text-gray-500 mb-6">Send an issue report or request directly to the system administrator.</p>
        
        <form onSubmit={handleSubmit}>
          <textarea 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none resize-none mb-4 focus:border-indigo-500" 
            placeholder="Describe your issue or request here..." 
            required 
          />
          <button type="submit" className="w-full px-5 py-2.5 bg-[#4355B9] text-white rounded-lg text-sm font-bold flex justify-center items-center gap-2 hover:bg-indigo-700 transition">
            <Send size={16} /> Submit to Admin
          </button>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 6. LOGIN VIEW (Dual-Mode Authentication)
// ==========================================
function LoginScreen({ onLogin, staff, patients, onRegisterWebPatient }) {
  const isDesktopApp = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');
  
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const defaultPhone = urlParams.get('phone') || '';
  const redirectTarget = urlParams.get('redirect');
  
  if (redirectTarget) {
    localStorage.setItem('carepoint_redirect_tab', redirectTarget);
  }
  
  const [loginMode, setLoginMode] = useState(isDesktopApp ? 'staff' : 'patient'); 
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [phone, setPhone] = useState(defaultPhone);  
  const [otpStep, setOtpStep] = useState(false);
  const [registerStep, setRegisterStep] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
const [regForm, setRegForm] = useState({ firstName: '', lastName: '', dob: '', gender: '', mobile: '' });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('https://carepoint-services.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: credentials.username, password: credentials.password })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success(`Welcome back, ${data.user.username}!`);
        onLogin(data.user);
      } else toast.error(data.error || 'Invalid username or password.');
    } catch (error) { toast.error('Network error connecting to server.'); } 
    finally { setIsLoading(false); }
  };
const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone.includes('@')) return toast.error('Please enter a valid email address');
    
    const realOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(realOtp);
    setIsLoading(true);

    try {
      const response = await fetch('https://carepoint-services.onrender.com/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: phone.trim(), otp: realOtp })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setOtpStep(true);
        toast.success(`Secure OTP sent to your Email!`);
      } else {
        toast.error("Failed to deliver OTP via Email.");
      }
    } catch (error) {
      toast.error('Network error while requesting OTP.');
    } finally {
      setIsLoading(false);
    }
  };
const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (enteredOtp !== generatedOtp) return toast.error('Invalid OTP. Please try again.');

    try {
      // Fetch secure token and profile from the cloud database
      const res = await fetch('https://carepoint-services.onrender.com/api/auth/patient-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: phone.trim() })
      });
      const data = await res.json();
      if (data.token) localStorage.setItem('token', data.token);

      // FIX: Rely on the cloud database (data.patient) instead of the empty local array
      if (!data.patient) {
        setOtpStep(false);
        setRegisterStep(true);
        toast.success('Email verified! Please set up your profile.');
      } else {
        toast.success(`Welcome back, ${data.patient.name}`);
        const sessionUser = { ...data.patient, role: 'patient' };
        localStorage.setItem('user', JSON.stringify(sessionUser));
        onLogin(sessionUser);
      }
    } catch (error) {
      toast.error('Network error while securing session.');
    }
  };
const handleRegisterPatient = (e) => {
    e.preventDefault();
    const newPatient = {
      id: `HMS-WEB-${Math.floor(Math.random() * 10000)}`,
      name: `${regForm.firstName} ${regForm.lastName}`,
      inits: `${regForm.firstName.charAt(0)}${regForm.lastName.charAt(0)}`.toUpperCase(),
      dob: regForm.dob,
      gender: regForm.gender,
      phone: regForm.mobile, 
      email: phone,          
      bloodGroup: 'Unknown', // FIX: Changed from 'Not specified' to fit VARCHAR(10) database limit
      role: 'patient',
      color: 'bg-indigo-50 text-indigo-700'
    };
    onRegisterWebPatient(newPatient); 
    toast.success('Profile created successfully!');
    localStorage.setItem('user', JSON.stringify(newPatient)); 
    onLogin(newPatient);    
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
      <div className="w-full max-w-[420px] bg-white rounded-[24px] shadow-2xl relative z-10 overflow-hidden border border-gray-100">
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg"><Activity className="text-indigo-600" size={32} /></div>
            <h1 className="text-2xl font-black text-white tracking-tight">CarePoint HMS</h1>
            <p className="text-indigo-200 text-sm font-medium mt-1">Centralized Health Management</p>
          </div>
        </div>

        <div className="p-8">
          {!registerStep && !isDesktopApp && (
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button onClick={() => { setLoginMode('patient'); setOtpStep(false); }} className={`flex-1 py-2 text-sm font-bold rounded-md transition cursor-pointer ${loginMode === 'patient' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Patient Portal</button>
              <button onClick={() => setLoginMode('staff')} className={`flex-1 py-2 text-sm font-bold rounded-md transition cursor-pointer ${loginMode === 'staff' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Hospital Staff</button>
            </div>
          )}

          {isDesktopApp && (
            <div className="mb-6 text-center">
              <span className="bg-indigo-50 text-indigo-800 border border-indigo-100 text-[10px] font-black px-3 py-1.5 rounded-md uppercase tracking-widest shadow-sm">
                Official Staff Terminal
              </span>
            </div>
          )}
{loginMode === 'patient' && !otpStep && !registerStep && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl mb-4">
                <p className="text-xs text-indigo-800 leading-relaxed text-center">
                  <strong>🔒 Secure Email Login:</strong><br/>
                  Enter your email address to receive a secure OTP instantly.
                </p>
              </div>             
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Email Address</label>
                <input type="email" value={phone} onChange={e => setPhone(e.target.value)} placeholder="patient@example.com" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition" required />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-indigo-700 transition cursor-pointer disabled:opacity-70">
                {isLoading ? 'Sending OTP...' : 'Get OTP'}
              </button>
            </form>
          )}
          {loginMode === 'patient' && otpStep && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Enter 6-Digit OTP</label><input type="text" value={enteredOtp} onChange={e => setEnteredOtp(e.target.value)} placeholder="• • • • • •" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center tracking-[1em] font-bold text-lg outline-none focus:border-indigo-500 transition" required maxLength="6" /></div>
              <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-emerald-600 transition cursor-pointer">Verify & Login</button>
<button type="button" onClick={() => setOtpStep(false)} className="w-full text-xs font-bold text-gray-500 mt-2 cursor-pointer">Change Email Address</button>             
            </form>
          )}

         {loginMode === 'patient' && registerStep && (
            <form onSubmit={handleRegisterPatient} className="space-y-4 animate-in fade-in zoom-in duration-300">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-2">Complete Profile Setup</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">First Name</label><input type="text" value={regForm.firstName} onChange={e => setRegForm({...regForm, firstName: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none focus:border-indigo-500" required /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label><input type="text" value={regForm.lastName} onChange={e => setRegForm({...regForm, lastName: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none focus:border-indigo-500" required /></div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth</label><input type="date" value={regForm.dob} onChange={e => setRegForm({...regForm, dob: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none focus:border-indigo-500" required /></div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Gender</label>
                  <select value={regForm.gender} onChange={e => setRegForm({...regForm, gender: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none focus:border-indigo-500" required>
                    <option value="" disabled>Select</option><option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number</label>
                <input type="tel" value={regForm.mobile} onChange={e => setRegForm({...regForm, mobile: e.target.value})} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="+91" required />
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition mt-2 cursor-pointer">Create Account</button>
            </form>
          )}
          {loginMode === 'staff' && (
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Username</label><input type="text" value={credentials.username} onChange={e => setCredentials({...credentials, username: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition" required /></div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={credentials.password} onChange={e => setCredentials({...credentials, password: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3 text-gray-400 cursor-pointer">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-black transition mt-2 cursor-pointer">{isLoading ? 'Authenticating...' : 'Sign In Securely'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. CORE SHELL (Header)
// ==========================================
function Header({ user, onLogout, isOnline, notifications, onDismissNotification, onOpenCompose }) {
  const [showPopup, setShowPopup] = React.useState(false);
  const prevCountRef = React.useRef(notifications?.length || 0);

  React.useEffect(() => {
    const currentCount = notifications?.length || 0;
    if (currentCount > prevCountRef.current) {
      setShowPopup(true);
      const timer = setTimeout(() => setShowPopup(false), 6000);
      prevCountRef.current = currentCount;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = currentCount;
  }, [notifications]);

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-10 relative">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
        {!isOnline && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>Offline Mode</span>}
      </div>

      <div className="flex items-center gap-6">
        {/* NEW: Compose Message Button */}
        <button onClick={onOpenCompose} className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold transition cursor-pointer shadow-sm border border-indigo-100">
          <Edit3 size={16} /> New Message
        </button>

        <div className="relative">
          <button onClick={() => setShowPopup(!showPopup)} className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer">
            <Bell size={24} />
            {notifications?.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
          </button>

          <div className={`absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 p-5 transition-all duration-300 transform origin-top-right z-50 ${showPopup ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                  <Bell size={16} />
                </div>
                <p className="text-sm font-bold text-gray-900">Notifications</p>
              </div>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                {notifications?.length || 0} New
              </span>
            </div>
            
            {notifications?.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => onDismissNotification && onDismissNotification(notif.id)}
                    className="p-3 bg-gray-50 hover:bg-indigo-50/50 rounded-xl border border-gray-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-bold text-gray-900 group-hover:text-indigo-600">{notif.title}</p>
                      <span className="text-[9px] text-gray-400">{notif.time}</span>
                    </div>
                    {/* Shows sender info if available */}
                    {notif.sender && <p className="text-[10px] font-bold text-indigo-600 mb-1">From: {notif.sender.name} ({notif.sender.role})</p>}
                    <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No unread notifications.</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <button onClick={onLogout} className="text-sm font-bold text-gray-500 hover:text-red-600 transition-colors cursor-pointer">Logout</button>
        </div>
      </div>
    </header>
  );
}
// ==========================================
// 8. SHARED MODALS
// ==========================================

const MessageComposerModal = ({ isOpen, onClose, currentUser, patients, onSubmit }) => {
  const [recipient, setRecipient] = useState('');
  const [patientId, setPatientId] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen || !currentUser) return null;

  const isAdmin = currentUser.role.toLowerCase() === 'admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (recipient === 'PATIENT' && !patientId) { toast.error("Select a patient."); return; }
    
    const finalRecipient = recipient === 'PATIENT' ? patientId : recipient;
    onSubmit(finalRecipient, message, { name: currentUser.name || currentUser.username, role: currentUser.role });
    
    setRecipient('');
    setPatientId('');
    setMessage('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition"><X size={16} /></button>
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Communication Desk</p>
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Send Notification</h3>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Send To</label>
              <select value={recipient} onChange={e => setRecipient(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" required>
                <option value="" disabled>Select recipient department...</option>
                {isAdmin && <option value="ALL_STAFF" className="font-bold text-indigo-600">Broadcast to ALL Staff</option>}
                <option value="ADMIN_RECEPTION">Administration & Reception</option>
                <option value="DOCTOR">Doctors</option>
                <option value="PHARMACIST">Pharmacy Desk</option>
                <option value="LABORATORIST">Laboratory Desk</option>
                <option value="BILLING">Billing Desk</option>
                <option value="PATIENT">Specific Patient</option>
              </select>
            </div>

            {recipient === 'PATIENT' && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Patient</label>
                <select value={patientId} onChange={e => setPatientId(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" required>
                  <option value="" disabled>Search patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows="4" className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm resize-none focus:border-indigo-500" placeholder="Type your notification here..." required></textarea>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-[#4355B9] text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
              <Send size={14} /> Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RegisterPatientModal = ({ isOpen, onClose, onSubmit, nextId }) => {
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', gender: '', phone: '', bloodGroup: '' });
  
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form, 
      id: nextId, 
      name: `${form.firstName} ${form.lastName}`,
      inits: `${form.firstName.charAt(0)}${form.lastName.charAt(0)}`.toUpperCase(),
      color: ['bg-indigo-50 text-indigo-700', 'bg-emerald-50 text-emerald-700', 'bg-purple-50 text-purple-700'][Math.floor(Math.random() * 3)]
    });
    setForm({ firstName: '', lastName: '', dob: '', gender: '', phone: '', bloodGroup: '' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-xl p-8 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition"><X size={16} /></button>
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Patient Directory</p>
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Register a new patient</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-5 mb-8">
            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">First name</label><input type="text" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required /></div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Last name</label><input type="text" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required /></div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Date of birth</label><input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required /></div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gender</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" required>
                <option value="" disabled>Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Non-binary">Non-binary</option>
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone number</label><input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required /></div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Blood group</label>
              <select value={form.bloodGroup} onChange={e => setForm({...form, bloodGroup: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" required>
                <option value="" disabled>Select group</option><option value="A+">A+</option><option value="O+">O+</option><option value="B+">B+</option><option value="AB+">AB+</option><option value="O-">O-</option><option value="A-">A-</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-[#4355B9] text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">Register patient <ArrowRight size={14} /></button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ViewPatientModal = ({ user, patient, onClose, prescriptions, labReports, invoices }) => {
  if (!patient || !user) return null;
  const role = user.role.toLowerCase();
  
  const patientRxs = prescriptions.filter(rx => rx.patientId === patient.id);
  const patientLabs = labReports.filter(lab => lab.patientId === patient.id);
  const patientInvoices = invoices.filter(inv => inv.patientId === patient.id && inv.status === 'PAID');

  const canViewClinical = ['admin', 'doctor'].includes(role);
  const canViewPharmacy = ['admin', 'doctor', 'pharmacist'].includes(role);
  const canViewLabs = ['admin', 'doctor', 'laboratorist'].includes(role);
  const canViewBilling = ['admin', 'billing'].includes(role);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl p-8 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition"><X size={16} /></button>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Restricted Patient Record</p>
        <h2 className="text-3xl font-bold text-gray-900 capitalize tracking-tight mb-4">{patient.name}</h2>
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="bg-slate-50 border border-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-semibold">{patient.id}</span>
          <span className="bg-slate-50 border border-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-semibold">{patient.bloodGroup || patient.blood} blood group</span>
          <span className="bg-slate-50 border border-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-semibold">{patient.phone}</span>
        </div>

        <div className="space-y-6">
          {canViewClinical && (
            <div className="border-t border-gray-100 pt-6">
              <h4 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">Clinical Diagnosis History</h4>
              {patientRxs.length === 0 ? (
                <p className="text-xs text-gray-400">No clinical history recorded.</p>
              ) : (
                patientRxs.map(rx => (
                  <div key={rx.id} className="mb-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm font-bold text-gray-900 mb-2">Diagnosis: {rx.diagnosis}</p>
                    <div className="space-y-1">
                      {rx.medications && rx.medications.length > 0 ? (
                        rx.medications.map((m, i) => (
                          <p key={i} className="text-xs text-gray-600 flex items-center gap-2">
                            <Pill size={12} className="text-indigo-400"/> {m.name} ({m.dosage} - {m.frequency} for {m.duration} days)
                          </p>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 italic">Lab Order Only</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {canViewPharmacy && (
            <div className="border-t border-gray-100 pt-6">
              <h4 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2"><Pill size={16}/> Dispensed Medications</h4>
              {patientRxs.filter(rx=>rx.medications && rx.medications.length > 0).length === 0 ? (
                <p className="text-xs text-gray-400">No prescriptions found.</p>
              ) : (
                patientRxs.filter(rx=>rx.medications && rx.medications.length > 0).map(rx => (
                  <div key={rx.id} className="mb-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${rx.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {rx.status}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {rx.medications.map((m, i) => (
                        <li key={i} className="text-sm text-gray-800 font-medium pb-2 border-b border-gray-200 last:border-0 last:pb-0">
                          {m.name} <span className="block text-xs font-normal text-gray-500 mt-0.5">{m.dosage} · {m.frequency} · {m.duration} days</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}

          {canViewLabs && (
            <div className="border-t border-gray-100 pt-6">
              <h4 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2"><FlaskConical size={16}/> Laboratory Reports</h4>
              {patientLabs.length === 0 ? (
                <p className="text-xs text-gray-400">No lab reports found.</p>
              ) : (
                patientLabs.map(lab => (
                  <div key={lab.id} className="mb-3 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{lab.testName} ({lab.reportType})</p>
                      <p className="text-xs text-gray-600">Result: {lab.result}</p>
                    </div>
                    <span className="text-xs font-bold text-gray-500">{lab.reported}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {canViewBilling && (
            <div className="border-t border-gray-100 pt-6">
              <h4 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2"><Receipt size={16}/> Paid Invoice History</h4>
              {patientInvoices.length === 0 ? (
                <p className="text-xs text-gray-400">No paid invoices found.</p>
              ) : (
                patientInvoices.map(inv => (
                  <div key={inv.id} className="mb-3 p-3 bg-emerald-50 rounded-lg flex justify-between items-center border border-emerald-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{inv.id} <span className="font-normal text-gray-500 text-xs ml-2">({inv.date})</span></p>
                      <p className="text-xs text-gray-600">{inv.services}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">₹{inv.totalAmount.toLocaleString()}</p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">PAID</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BookAppointmentModal = ({ isOpen, onClose, onSubmit, patients, staff, appointments = [] }) => {
  const [form, setForm] = useState({ patientId: '', doctorId: '', doctorName: '', time: '', reason: '' });
  
  if (!isOpen) return null;

  const availableDoctors = staff.filter(s => s.role.toLowerCase() === 'doctor');
  const availablePatients = patients.filter(p => {
    const hasAppointment = appointments.some(a => a.patientId === p.id);
    return !hasAppointment;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.patientId) { toast.error('Please select a patient.'); return; }
    if (!form.doctorId) { toast.error('Please assign a doctor.'); return; }

    const selectedPatient = patients.find(p => p.id === form.patientId);
    
    // Safely extract local year, month, date to prevent UTC shift
    const d = form.time ? new Date(form.time) : new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const timeDisplay = form.time ? new Date(form.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
    
    onSubmit({ 
      ...form, 
      id: `APT-${Math.floor(Math.random() * 10000)}`, 
      patientId: form.patientId, 
      patientName: selectedPatient ? selectedPatient.name : 'Unknown', 
      date: localDate, 
      time: timeDisplay, 
      reason: form.reason, 
      doctorId: form.doctorId,           
      doctorName: form.doctorName,       
      status: 'Scheduled' 
    });
    setForm({ patientId: '', doctorId: '', doctorName: '', time: '', reason: '' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg p-8 relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition"><X size={16} /></button>
        <div className="mb-6"><h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Book an appointment</h3></div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 mb-8">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Patient</label>
              <select value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" required>
                <option value="" disabled>Select a patient</option>
                {availablePatients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Assign Doctor</label>
                <select 
                  value={form.doctorId} 
                  onChange={e => {
                    const doc = availableDoctors.find(d => d.username === e.target.value);
                    setForm({...form, doctorId: doc.username, doctorName: doc.name || doc.username});
                  }} 
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" required
                >
                  <option value="" disabled>Select by Specialty...</option>
                  {availableDoctors.map(doc => (
                    <option key={doc.username} value={doc.username}>{doc.name || doc.username} - {doc.specialty || 'General'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Scheduled time</label>
                <input type="datetime-local" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Visit reason</label>
              <input type="text" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm placeholder:text-gray-400 focus:border-indigo-500" placeholder="e.g. Skin rash, Checkup" required />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-[#4355B9] text-white rounded-lg hover:bg-indigo-700">Book appointment</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditAppointmentModal = ({ isOpen, onClose, onSubmit, appointment, staff }) => {
  const [form, setForm] = useState({ doctorId: '', doctorName: '', time: '' });
  
  React.useEffect(() => {
    if (appointment) {
      setForm({ doctorId: appointment.doctorId || '', doctorName: appointment.doctorName || '', time: '' });
    }
  }, [appointment]);

  if (!isOpen || !appointment) return null;

  const availableDoctors = staff.filter(s => s.role.toLowerCase() === 'doctor');

  const handleSubmit = (e) => {
    e.preventDefault();
    let timeDisplay = appointment.time;
    let localDate = appointment.date;
    
    if (form.time) {
      const d = new Date(form.time);
      localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      timeDisplay = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    
    onSubmit({ 
      ...appointment, 
      doctorId: form.doctorId || appointment.doctorId,
      doctorName: form.doctorName || appointment.doctorName,
      date: localDate,
      time: timeDisplay
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"><X size={16} /></button>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-1">Edit Appointment</h3>
          <p className="text-xs text-gray-500">Patient: <span className="font-bold capitalize">{appointment.patientName}</span></p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Change Doctor</label>
              <select value={form.doctorId} onChange={e => {
                  const doc = availableDoctors.find(d => d.username === e.target.value);
                  setForm({...form, doctorId: doc.username, doctorName: doc.name || doc.username});
                }} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500">
                {availableDoctors.map(doc => <option key={doc.username} value={doc.username}>{doc.name || doc.username} - {doc.specialty || 'General'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reschedule Time (Leave blank to keep current)</label>
              <p className="text-[10px] text-indigo-600 mb-2 font-bold">Current: {appointment.date} at {appointment.time}</p>
              <input type="datetime-local" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer">Update Details</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditPrescriptionModal = ({ isOpen, onClose, prescription, onSubmit }) => {
  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState([]);

  React.useEffect(() => {
    if (prescription) {
      setDiagnosis(prescription.diagnosis || '');
      setMedications(prescription.medications && prescription.medications.length > 0 ? prescription.medications : [{ name: '', route: 'Oral', dosage: '', frequency: '', duration: '' }]);
    }
  }, [prescription]);

  if (!isOpen || !prescription) return null;

  const handleMedChange = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', route: 'Oral', dosage: '', frequency: '', duration: '' }]);
  };

  const handleRemoveMedication = (index) => {
    const updated = medications.filter((_, i) => i !== index);
    setMedications(updated.length > 0 ? updated : [{ name: '', route: 'Oral', dosage: '', frequency: '', duration: '' }]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validMeds = medications.filter(m => m.name.trim() !== '');
    onSubmit({ ...prescription, diagnosis, medications: validMeds });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl p-8 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
          <X size={16} />
        </button>
        <div className="mb-6"><h3 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Prescription</h3></div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Diagnosis</label>
            <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500" required></textarea>
          </div>
          
          <div className="space-y-4 mb-6">
            {medications.map((med, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-xl bg-gray-50 relative">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Medication {index + 1}</p>
                  {index > 0 && (
                    <button type="button" onClick={() => handleRemoveMedication(index)} className="text-red-500 hover:bg-red-50 p-1 rounded transition">
                      <Trash2 size={14}/>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Medicine name</label>
                    <input type="text" value={med.name} onChange={e => handleMedChange(index, 'name', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Route</label>
                    <select value={med.route} onChange={e => handleMedChange(index, 'route', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:border-indigo-500">
                      <option value="Oral">Oral</option>
                      <option value="IV">Intravenous</option>
                      <option value="IM">Intramuscular</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Dosage</label>
                    <input type="text" value={med.dosage} onChange={e => handleMedChange(index, 'dosage', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Frequency</label>
                    <input type="text" value={med.frequency} onChange={e => handleMedChange(index, 'frequency', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Days</label>
                    <input type="number" value={med.duration} onChange={e => handleMedChange(index, 'duration', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <button type="button" onClick={handleAddMedication} className="text-sm font-semibold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition">
              + Add Another Medicine
            </button>
            <button type="submit" className="px-6 py-2.5 text-sm font-semibold bg-[#4355B9] text-white rounded-lg hover:bg-indigo-700 transition">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddStockModal = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState({ name: '', batch: '', expiry: '', quantity: '', unitPrice: '' });
  
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ 
      id: `MED-${Math.floor(Math.random() * 10000)}`, 
      name: form.name, 
      batch: form.batch.toUpperCase(), 
      expiry: form.expiry, 
      quantity: parseInt(form.quantity, 10), 
      unitPrice: parseFloat(form.unitPrice) || 0 
    });
    setForm({ name: '', batch: '', expiry: '', quantity: '', unitPrice: '' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg p-8 relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
          <X size={16} />
        </button>
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Pharmacy Desk</p>
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Add stock item</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Medicine name</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Batch number</label>
              <input type="text" value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Quantity</label>
              <input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Unit price (₹)</label>
              <input type="number" step="0.01" value={form.unitPrice} onChange={e => setForm({...form, unitPrice: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
            </div>
          </div>
          <div className="mb-8">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expiry date</label>
            <input type="date" value={form.expiry} onChange={e => setForm({...form, expiry: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-[#4355B9] text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
              Add to inventory <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditStockModal = ({ isOpen, onClose, stockItem, onSubmit }) => {
  const [form, setForm] = useState({ name: '', batch: '', expiry: '', quantity: '', unitPrice: '' });
  
  React.useEffect(() => {
    if (stockItem) {
      setForm({
        name: stockItem.name,
        batch: stockItem.batch,
        expiry: stockItem.expiry,
        quantity: stockItem.quantity,
        unitPrice: stockItem.unitPrice
      });
    }
  }, [stockItem]);

  if (!isOpen || !stockItem) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ 
      ...stockItem,
      name: form.name, 
      batch: form.batch.toUpperCase(), 
      expiry: form.expiry, 
      quantity: parseInt(form.quantity, 10), 
      unitPrice: parseFloat(form.unitPrice) || 0 
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg p-8 relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
          <X size={16} />
        </button>
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Pharmacy Desk</p>
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Edit Stock Item</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Medicine name</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Batch number</label>
              <input type="text" value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Quantity</label>
              <input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Unit price (₹)</label>
              <input type="number" step="0.01" value={form.unitPrice} onChange={e => setForm({...form, unitPrice: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
            </div>
          </div>
          <div className="mb-8">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expiry date</label>
            <input type="date" value={form.expiry} onChange={e => setForm({...form, expiry: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-[#4355B9] text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
              Save Updates <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FulfillPrescriptionModal = ({ isOpen, onClose, onSubmit, prescription, inventory }) => {
  const [fulfillData, setFulfillData] = useState([]);
  
  React.useEffect(() => {
    if (prescription && prescription.medications) {
      setFulfillData(prescription.medications.map((med) => {
        const freqStr = (med.frequency || '').toLowerCase();
        let multiplier = 1;
        if (freqStr.includes('twice') || freqStr.includes('bd') || freqStr.includes('2')) multiplier = 2;
        if (freqStr.includes('thrice') || freqStr.includes('tds') || freqStr.includes('3')) multiplier = 3;
        if (freqStr.includes('four') || freqStr.includes('4')) multiplier = 4;
        const calcQty = multiplier * (parseInt(med.duration) || 1);
        return { stockId: '', dispenseQty: calcQty.toString() };
      }));
    }
  }, [prescription]);

  if (!isOpen || !prescription) return null;

  const handleFulfillChange = (index, field, value) => {
    const updated = [...fulfillData];
    updated[index][field] = value;
    setFulfillData(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let hasError = false;
    for (let i = 0; i < fulfillData.length; i++) {
      const data = fulfillData[i];
      if (!data.stockId || !data.dispenseQty) {
        toast.error(`Please complete mapping for ${prescription.medications[i].name}`);
        hasError = true; break;
      }
      const stockItem = inventory.find(inv => inv.id === data.stockId);
      if (parseInt(data.dispenseQty) > stockItem.quantity) {
        toast.error(`Not enough stock for ${stockItem.name}! Available: ${stockItem.quantity}`);
        hasError = true; break;
      }
    }
    if (!hasError) onSubmit(prescription.id, fulfillData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl p-8 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition"><X size={16} /></button>
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Pharmacy Dispensing</p>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-1">Fulfill Prescription</h3>
        </div>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
          <p className="text-xs font-bold text-blue-800 mb-1">Doctor's Order: {prescription.patientName}</p>
          <p className="text-xs text-blue-600 mt-1 italic">Diagnosis: {prescription.diagnosis || "General care"}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 mb-8">
            {prescription.medications.map((med, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <p className="font-bold text-sm text-gray-900 mb-1">{med.name}</p>
                <p className="text-xs text-gray-500 mb-4">{med.dosage} · {med.frequency} · {med.duration} days</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Match with Inventory</label>
                    <select value={fulfillData[index]?.stockId || ''} onChange={e => handleFulfillChange(index, 'stockId', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" required>
                      <option value="" disabled>Select stock...</option>
                      {inventory.map(item => (
                        <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                          {item.name} (Batch: {item.batch}) - {item.quantity} left
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Dispense Qty (Auto-Calc)</label>
                    <input type="number" min="1" value={fulfillData[index]?.dispenseQty || ''} onChange={e => handleFulfillChange(index, 'dispenseQty', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none text-sm focus:border-indigo-500 bg-amber-50 font-bold" required />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition flex items-center gap-2">Confirm & Fulfill All <ArrowRight size={14} /></button>
          </div>
        </form>
      </div>
    </div>
  );
};

function CreateInvoiceModal({ isOpen, onClose, patients, prescriptions, labOrders, labTestPrices, invoices, inventory, onSubmit }) {
  const [form, setForm] = React.useState({ consultationFee: 500, selectedPatientId: '' });

  React.useEffect(() => {
    if (form.selectedPatientId) {
      const todayStr = getLocalDateStr();
      const hasPaidConsultToday = invoices?.some(inv => 
        inv.patientId === form.selectedPatientId && 
        inv.consultationFee > 0 && 
        inv.status === 'PAID' && 
        inv.date && inv.date.includes(todayStr)
      );
      setForm(prev => ({ ...prev, consultationFee: hasPaidConsultToday ? 0 : 500 }));
    }
  }, [form.selectedPatientId, invoices]);

  if (!isOpen) return null;

  const selectedPatient = patients?.find(p => p.id === form.selectedPatientId);
  const pendingLabs = labOrders?.filter(lab => lab.patientId === form.selectedPatientId && lab.status === 'PENDING') || [];
  const labTotal = pendingLabs.reduce((sum, lab) => sum + Number(labTestPrices?.[lab.testName] || 500), 0);
  const pendingRxs = prescriptions?.filter(rx => rx.patientId === form.selectedPatientId && rx.status === 'PENDING') || [];
  
  let automatedPharmacyTotal = 0;
  const rxBillingDetails = pendingRxs.map(rx => {
    const processedMeds = rx.medications.map(med => {
      const freqStr = (med.frequency || '').toLowerCase();
      let freqMultiplier = 1;
      if (freqStr.includes('twice') || freqStr.includes('2') || freqStr.includes('bd')) freqMultiplier = 2;
      else if (freqStr.includes('thrice') || freqStr.includes('3') || freqStr.includes('tds')) freqMultiplier = 3;
      else if (freqStr.includes('four') || freqStr.includes('4')) freqMultiplier = 4;
      const estQty = freqMultiplier * (parseInt(med.duration) || 1);
      const matchedStock = inventory?.find(i => i.name.toLowerCase().includes(med.name.toLowerCase()) || med.name.toLowerCase().includes(i.name.toLowerCase()));
      const unitPrice = matchedStock?.unitPrice || 0;
      const lineTotal = estQty * unitPrice;
      automatedPharmacyTotal += lineTotal;
      return { ...med, estQty, unitPrice, lineTotal, stockName: matchedStock?.name || 'Item Not in Stock' };
    });
    return { ...rx, processedMeds };
  });

  const todayStr = getLocalDateStr();
  const advancePaid = invoices?.filter(inv => 
    inv.patientId === form.selectedPatientId && 
    inv.services === 'Online Booking Consultation Fee' && 
    inv.date && inv.date.includes(todayStr)
  ).reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0) || 0;

  const baseFee = Number(form.consultationFee) || 0;
  const subtotal = baseFee + labTotal + automatedPharmacyTotal;
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;
  const finalTotalAmount = Math.max(0, grandTotal - advancePaid); 

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.selectedPatientId) { toast.error("Please select a patient."); return; }
    const newInvoice = {
      id: `INV-${Math.floor(Math.random() * 9000) + 1000}`,
      patientId: form.selectedPatientId,
      patientName: selectedPatient?.name || 'Unknown Patient', 
      consultationFee: baseFee,
      labTotal: labTotal,
      pharmacyTotal: automatedPharmacyTotal,
      subtotal: subtotal,
      gstAmount: gst,
      advancePaid: advancePaid,
      totalAmount: finalTotalAmount, 
      status: 'PENDING',
      date: new Date().toISOString()
    };
    onSubmit(newInvoice);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-8 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 focus:outline-none"><X size={24} /></button>
        <div className="mb-6">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Revenue Cycle</p>
          <h3 className="text-2xl font-bold text-gray-900">Pre-Paid Patient Invoice</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Select Patient</label>
            <select value={form.selectedPatientId} onChange={e => setForm({...form, selectedPatientId: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" required>
              <option value="" disabled>Select patient...</option>
              {patients?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
            </select>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4 space-y-3 max-h-64 overflow-y-auto">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-blue-900 text-sm">Consultation Fee</span>
              <input type="number" value={form.consultationFee} onChange={e => setForm({...form, consultationFee: e.target.value})} className="w-24 px-2 py-1 text-right border border-blue-200 rounded outline-none text-sm bg-white" />
            </div>
            {form.consultationFee === 0 && <p className="text-[10px] text-emerald-600 font-bold -mt-2">Fee waived (Already billed today)</p>}
            <div className="border-t border-blue-200 pt-2 pb-2">
              <p className="text-xs font-bold text-blue-800 mb-2">Pending Pharmacy Items (Auto-Priced)</p>
              {rxBillingDetails.length === 0 ? (
                <p className="text-xs text-blue-600/70">No pending prescriptions.</p>
              ) : (
                rxBillingDetails.map(rx => (
                  <div key={rx.id} className="mb-2 space-y-1">
                    {rx.processedMeds.map((m, i) => (
                      <div key={i} className="flex justify-between text-xs text-blue-800">
                        <span>{m.name} <span className="text-blue-600/70">(Qty: {m.estQty} x ₹{m.unitPrice})</span></span>
                        <span className="font-semibold">₹{m.lineTotal}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
              {automatedPharmacyTotal > 0 && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-100">
                  <span className="font-bold text-blue-900 text-xs">Total Pharmacy Cost</span>
                  <span className="font-bold text-blue-900 text-xs">₹{automatedPharmacyTotal}</span>
                </div>
              )}
            </div>
            <div className="border-t border-blue-200 pt-2">
              <p className="text-xs font-bold text-blue-800 mb-1">Pending Lab Tests</p>
              {pendingLabs.length === 0 ? (
                <p className="text-xs text-blue-600/70">No pending labs to bill.</p>
              ) : (
                pendingLabs.map(lab => (
                  <div key={lab.id} className="flex justify-between text-xs text-blue-800 mb-1">
                    <span>{lab.testName}</span>
                    <span>₹{Number(labTestPrices?.[lab.testName] || 500).toLocaleString('en-IN')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl mb-6">
            <div className="flex justify-between text-xs text-gray-600 mb-1"><span>Subtotal:</span><span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between text-xs text-gray-600 mb-2"><span>+ Applicable GST (18%):</span><span>₹{gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            {advancePaid > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 font-bold mb-2 pt-2 border-t border-gray-200">
                <span>Less: Advance Paid (Web Fee):</span><span>- ₹{advancePaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Net Amount Due:</span><span>₹{finalTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-[#4355B9] text-white rounded-lg cursor-pointer">Save Pending Bill</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ProcessPaymentModal = ({ isOpen, onClose, invoice, onConfirmPayment }) => {         
  const [method, setMethod] = useState('cash');
  
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm p-8 relative animate-in fade-in zoom-in duration-200 text-center">
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
          <X size={16} />
        </button>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Terminal</p>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-4">Invoice {invoice.id}</h3>
        
        <div className="text-4xl font-black text-indigo-600 mb-6">
          ₹{Number(invoice.totalAmount || 0).toLocaleString('en-IN')}
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button onClick={() => setMethod('cash')} className={`flex-1 py-2 text-xs font-bold rounded-md transition ${method === 'cash' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Cash</button>
          <button onClick={() => setMethod('online')} className={`flex-1 py-2 text-xs font-bold rounded-md transition ${method === 'online' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Online / UPI</button>
        </div>

        {method === 'online' && (
          <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl flex flex-col items-center justify-center mb-6">
            <QrCode size={80} className="text-indigo-600 mb-3" />
            <p className="text-xs text-gray-500 font-medium mt-2">
              Scan to pay exactly ₹{Number(invoice.totalAmount || 0).toLocaleString('en-IN')}
            </p>
          </div>
        )}

        <button onClick={() => onConfirmPayment(invoice.id)} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition">
          Confirm Payment Received
        </button>
      </div>
    </div>
  );
};

function AddStaffModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', username: '', role: '', password: '', specialty: '' });
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, id: `S-${Date.now()}` }); 
    setForm({ name: '', username: '', role: '', password: '', specialty: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl p-8 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 focus:outline-none">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <div className="mb-6"><h3 className="text-2xl font-bold text-gray-900 mb-1">Add staff member</h3></div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-5 mb-8">
            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Full name</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-indigo-500" required /></div>
            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Username</label><input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-indigo-500" required /></div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value, specialty: ''})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:border-indigo-500" required>
                <option value="" disabled>Select role</option>
                <option value="Doctor">Doctor</option>
                <option value="Laboratorist">Laboratorist</option>
                <option value="Billing">Billing</option>
                <option value="Pharmacist">Pharmacist</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            
            {form.role === 'Doctor' ? (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Medical Specialty</label>
                <select value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:border-indigo-500" required>
                  <option value="" disabled>Select Specialty</option>
                  <option value="General Physician">General Physician</option>
                  <option value="Cardiologist">Cardiologist</option>
                  <option value="Dermatologist">Dermatologist</option>
                  <option value="Neurologist">Neurologist</option>
                  <option value="Pediatrician">Pediatrician</option>
                  <option value="Orthopedic">Orthopedic</option>
                  <option value="Dentist">Dentist</option>
                  <option value="Gynecologist">Gynecologist</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
                <input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-indigo-500" required />
              </div>
            )}
            
            {form.role === 'Doctor' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
                <input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-indigo-500" required />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100">Cancel</button>
            <button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold">Add staff member</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditStaffModal({ isOpen, onClose, member, onSubmit }) {
  const [form, setForm] = React.useState({ username: '', role: '', password: '', specialty: '' });

  React.useEffect(() => {
    if (member) setForm({ username: member.username, role: member.role, password: '', specialty: member.specialty || '' });
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...member, username: form.username, role: form.role, password: form.password, specialty: form.role === 'Doctor' ? form.specialty : '' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        <div className="mb-6"><h3 className="text-2xl font-bold text-gray-900 mb-1">Edit {member.username}</h3></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Username</label><input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" required /></div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white" required>
              <option value="Doctor">Doctor</option><option value="Laboratorist">Laboratorist</option>
              <option value="Billing">Billing</option><option value="Pharmacist">Pharmacist</option>
              <option value="Receptionist">Receptionist</option><option value="Admin">Admin</option>
            </select>
          </div>
          
          {form.role === 'Doctor' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Medical Specialty</label>
              <select value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:border-indigo-500" required>
                <option value="General Physician">General Physician</option><option value="Cardiologist">Cardiologist</option>
                <option value="Dermatologist">Dermatologist</option><option value="Neurologist">Neurologist</option>
                <option value="Pediatrician">Pediatrician</option><option value="Orthopedic">Orthopedic</option>
                <option value="Dentist">Dentist</option><option value="Gynecologist">Gynecologist</option>
              </select>
            </div>
          )}

          <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Reset Password</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm" placeholder="Leave blank to keep current" /></div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100">Cancel</button>
            <button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
// ==========================================
// 9. DESK MODULES: CORE VIEWS
// ==========================================
const Overview = ({ user, patientCount, appointments, pendingPrescriptionsCount, totalRevenue, onOpenModal, prescriptions, labOrders, invoices, inventory }) => {
  const lowStockCount = inventory.filter(i => i.quantity < 50).length;
  const pendingLabs = labOrders.filter(o => o.status === 'PENDING').length;
  const pendingBills = invoices.filter(i => i.status === 'PENDING').length;

  const revenueData = React.useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { name: days[d.getDay()], dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, revenue: 0 };
    });

    invoices.forEach(inv => {
      if (inv.status === 'PAID' && inv.date) {
        const invDateStr = inv.date.includes('T') ? inv.date.split('T')[0] : inv.date;
        const match = last7Days.find(d => d.dateStr === invDateStr);
        if (match) match.revenue += Number(inv.totalAmount) || 0;
      }
    });
    return last7Days;
  }, [invoices]);

  const patientFlowData = React.useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    const flow = { '12 AM': 0, '4 AM': 0, '8 AM': 0, '12 PM': 0, '4 PM': 0, '8 PM': 0 };
    const todayDate = getLocalDateStr();
    
    appointments.forEach(app => {
      if (!app.date || app.date.startsWith(todayDate)) {
        if (app.time) {
          let hour = parseInt(app.time.split(':')[0], 10);
          if (app.time.toLowerCase().includes('pm') && hour !== 12) hour += 12;
          if (app.time.toLowerCase().includes('am') && hour === 12) hour = 0;
          if (hour >= 0 && hour < 4) flow['12 AM']++;
          else if (hour >= 4 && hour < 8) flow['4 AM']++;
          else if (hour >= 8 && hour < 12) flow['8 AM']++;
          else if (hour >= 12 && hour < 16) flow['12 PM']++;
          else if (hour >= 16 && hour < 20) flow['4 PM']++;
          else if (hour >= 20) flow['8 PM']++;
        }
      }
    });
    return Object.keys(flow).map(name => ({ name, patients: flow[name] }));
  }, [appointments]);

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1">Operations Dashboard</p>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">System Overview</h2>
        </div>
        {['admin', 'receptionist'].includes(user?.role?.toLowerCase()) && (
          <button onClick={onOpenModal} className="bg-[#4355B9] hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition cursor-pointer">
            <Plus size={16} /> Register patient
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'ACTIVE PATIENTS', value: patientCount, sub: 'Registered in DB', icon: Users, alert: false, color: 'text-indigo-600' },
          { label: "TODAY'S FLOW", value: appointments.length, sub: 'Appointments scheduled', icon: Activity, alert: false, color: 'text-emerald-600' },
          { label: 'PENDING ORDERS', value: pendingPrescriptionsCount + pendingLabs, sub: 'Requires processing', icon: Clock, alert: (pendingPrescriptionsCount + pendingLabs) > 0, color: 'text-amber-500' },
          { label: 'MONTHLY REVENUE', value: `₹${totalRevenue.toLocaleString()}`, sub: 'Collections verified', icon: IndianRupee, alert: false, color: 'text-blue-600' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</span>
              <s.icon size={16} className={`${s.color} opacity-80`} />
            </div>
            <div className="text-3xl font-black text-gray-900 my-2 tracking-tight">{s.value}</div>
            <div className={`text-[10px] font-bold flex items-center gap-1.5 ${s.alert ? 'text-amber-500' : 'text-gray-400'}`}>
              {s.alert && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>}
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2"><TrendingUp size={16} className="text-indigo-600"/> 7-Day Revenue Trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4355B9" stopOpacity={0.3}/><stop offset="95%" stopColor="#4355B9" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#4355B9" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2"><Activity size={16} className="text-emerald-600"/> Patient Flow (Today)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patientFlowData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="patients" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2"><TrendingUp size={16} className="text-indigo-600"/> Department Load</h3>
            <div className="mb-4">
              <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-gray-600">Pharmacy Queue</span><span className="text-amber-600">{pendingPrescriptionsCount} pending</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-amber-500 h-2 rounded-full" style={{width: `${Math.min(pendingPrescriptionsCount * 15, 100)}%`}}></div></div>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-gray-600">Laboratory Queue</span><span className="text-purple-600">{pendingLabs} pending</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-purple-500 h-2 rounded-full" style={{width: `${Math.min(pendingLabs * 20, 100)}%`}}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-gray-600">Billing Queue</span><span className="text-red-600">{pendingBills} pending</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className="bg-red-500 h-2 rounded-full" style={{width: `${Math.min(pendingBills * 15, 100)}%`}}></div></div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><AlertCircle size={16} className="text-red-500"/> System Alerts</h3>
            {lowStockCount > 0 ? (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> {lowStockCount} items in inventory are running below critical levels (50 units).</div>
            ) : (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold flex gap-2"><CheckCircle2 size={14} className="shrink-0 mt-0.5" /> All systems and inventory levels are nominal.</div>
            )}
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[500px]">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2"><Activity size={18} className="text-emerald-500"/> Live Patient Flow</h3>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md uppercase">Real-time</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {(() => {
              const todayStr = getLocalDateStr();
              const activeQueue = appointments.filter(apt => apt.status !== 'Completed' && (!apt.date || apt.date.startsWith(todayStr)));
              
              if (activeQueue.length === 0) {
                return <p className="text-center text-gray-400 text-sm mt-20">No active patients in the system today.</p>;
              }

              return activeQueue.map(apt => {
                const pId = apt.patientId;
                const hasPendingInv = invoices.some(i => i.patientId === pId && i.status === 'PENDING');
                const hasPendingRx = prescriptions.some(r => r.patientId === pId && r.status === 'PENDING');
                const hasPendingLab = labOrders.some(l => l.patientId === pId && l.status === 'PENDING');
                const hasPaidInv = invoices.some(i => i.patientId === pId && i.status === 'PAID');
                
                let currentStage = 'Waiting for Doctor';
                let stageColor = 'text-gray-500';
                
                if (hasPendingInv) { currentStage = 'At Billing Desk'; stageColor = 'text-red-500'; }
                else if (hasPendingRx) { currentStage = 'At Pharmacy'; stageColor = 'text-amber-500'; }
                else if (hasPendingLab) { currentStage = 'At Laboratory'; stageColor = 'text-purple-500'; }
                else if (hasPaidInv) { currentStage = 'Cleared / Discharged'; stageColor = 'text-emerald-500'; }
                else if (prescriptions.some(r => r.patientId === pId)) { currentStage = 'Moving to next desk'; stageColor = 'text-blue-500'; }

                return (
                  <div key={apt.id} className="p-4 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50/50 transition rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-bold text-gray-400 w-16">{apt.time}</div>
                      <div>
                        <p className="font-bold text-sm text-gray-900 capitalize">{apt.patientName}</p>
                        <p className="text-xs text-gray-500">{apt.reason} • {apt.doctor}</p>
                      </div>
                    </div>
                    <div className={`text-xs font-bold ${stageColor} flex items-center gap-1.5`}>
                      <div className={`w-1.5 h-1.5 rounded-full bg-current ${currentStage !== 'Cleared / Discharged' ? 'animate-pulse' : ''}`}></div>
                      {currentStage}
                    </div>
                  </div>
                )
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

const PatientsDirectory = ({ user, patients, appointments, onOpenModal, onViewPatient, onDeletePatient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); 
  const isReceptionist = ['admin', 'receptionist'].includes(user?.role?.toLowerCase());

  const searchedPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm))
  );

  const unbookedPatients = searchedPatients.filter(p => !appointments?.some(a => a.patientId === p.id));
  const displayPatients = activeTab === 'unbooked' ? unbookedPatients : searchedPatients;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">RECORDS</p>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Patient Directory</h2>
          <p className="text-gray-500 text-sm mt-1">Manage hospital records and web registrations.</p>
        </div>
        {isReceptionist && (
          <button onClick={onOpenModal} className="bg-[#4355B9] hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition cursor-pointer">
            <Plus size={16} /> Register New Patient
          </button>
        )}
      </div>

      <div className="flex gap-6 mb-4 border-b border-gray-200 px-2">
        <button onClick={() => setActiveTab('all')} className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 ${activeTab === 'all' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>All Patients ({searchedPatients.length})</button>
        {isReceptionist && (
          <button onClick={() => setActiveTab('unbooked')} className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 ${activeTab === 'unbooked' ? 'border-amber-600 text-amber-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>Registered (No Appointments) ({unbookedPatients.length})</button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center">
          <div className="relative w-full max-w-md">
            <input type="text" placeholder="Search by name, ID, or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">PATIENT ID</th>
                <th className="px-6 py-4">NAME & DEMOGRAPHICS</th>
                <th className="px-6 py-4">CONTACT</th>
                <th className="px-6 py-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {displayPatients.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-12 text-gray-500 font-medium">{activeTab === 'unbooked' ? 'No unbooked patients found.' : 'No patients found.'}</td></tr>
              ) : (
                displayPatients.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold text-gray-900">{p.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 capitalize">{p.name}</p>
                     <p className="text-xs text-gray-500 mt-0.5">{p.gender} • {p.dob ? p.dob.split('T')[0] : 'DOB N/A'} • {p.bloodGroup || 'Blood: N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{p.phone || 'N/A'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => onViewPatient(p)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 cursor-pointer transition">View Profile</button>
                        {isReceptionist && (
                          <button onClick={() => onDeletePatient(p.id)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 cursor-pointer transition">Remove</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
const AppointmentsModule = ({ currentUser, appointments, onOpenBookingModal, onApproveWebRequest, onOpenEditApt, onDeleteApt, onCheckIn, onComplete, getDynamicStatus }) => {
  const isDoctor = currentUser?.role?.toLowerCase() === 'doctor';
  const isReceptionist = ['admin', 'receptionist'].includes(currentUser?.role?.toLowerCase());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('live'); 

  const myAppointments = isDoctor ? appointments.filter(a => a.doctorId === currentUser?.username) : appointments;

  const processedAppointments = myAppointments.map(apt => ({
    ...apt,
    statusInfo: getDynamicStatus(apt) 
  }));

  const webRequests = processedAppointments.filter(a => a.status === 'Pending Approval');
  const searchFiltered = processedAppointments.filter(a => a.patientName.toLowerCase().includes(searchTerm.toLowerCase()));

  const liveQueue = searchFiltered.filter(a => a.status !== 'Pending Approval' && a.statusInfo.text !== 'Completed');
  const historyQueue = searchFiltered.filter(a => a.statusInfo.text === 'Completed');

  const displayQueue = activeTab === 'live' ? liveQueue : historyQueue;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">SCHEDULE & QUEUE</p>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Appointments</h2>
          <p className="text-gray-500 text-sm mt-1">Manage web requests and live hospital queue.</p>
        </div>
        {!isDoctor && (
          <button onClick={onOpenBookingModal} className="bg-[#4355B9] hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition cursor-pointer">
            <Plus size={16} /> Book appointment
          </button>
        )}
      </div>

      {isReceptionist && webRequests.length > 0 && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-amber-100/60 px-6 py-4 border-b border-amber-200 flex justify-between items-center">
            <h3 className="font-bold text-amber-900">Pending Web Booking Requests ({webRequests.length})</h3>
            <span className="text-xs font-bold text-amber-800 bg-amber-200 px-3 py-1 rounded-full">Online Payment Verified (₹590)</span>
          </div>
          <div className="divide-y divide-amber-100">
            {webRequests.map(req => (
              <div key={req.id} className="p-5 px-6 flex items-center justify-between bg-white/50">
                <div>
                  <p className="font-bold text-gray-900 text-base capitalize">{req.patientName}</p>
                  <p className="text-xs text-gray-600 mt-1">Requested Time: <strong className="text-indigo-600">{req.date} at {req.time}</strong> with <strong className="text-gray-900">{req.doctorName || req.doctor}</strong></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onOpenEditApt(req)} className="bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">Change Dr / Time</button>
                  <button onClick={() => onApproveWebRequest(req.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">Approve & Ping Patient</button>
                  <button onClick={() => onDeleteApt(req.id)} className="bg-white border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-6 mb-4 border-b border-gray-200 px-2">
        <button onClick={() => setActiveTab('live')} className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 ${activeTab === 'live' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>Live Patient Queue ({liveQueue.length})</button>
        <button onClick={() => setActiveTab('history')} className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>Completed History ({historyQueue.length})</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center">
          <div className="relative w-full max-w-md">
            <input type="text" placeholder={`Search ${activeTab === 'live' ? 'live queue' : 'history'} by patient name...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">DATE & TIME</th>
                <th className="px-6 py-4">PATIENT</th>
                <th className="px-6 py-4">DOCTOR</th>
                <th className="px-6 py-4">STATUS</th>
                {isReceptionist && activeTab === 'live' && <th className="px-6 py-4 text-right">ACTION</th>}
              </tr>
            </thead>
            <tbody className="text-sm">
              {displayQueue.length === 0 ? (
                <tr><td colSpan={isReceptionist && activeTab === 'live' ? "5" : "4"} className="text-center py-12 text-gray-500 font-medium">{activeTab === 'live' ? 'No live appointments currently scheduled.' : 'No completed appointments found.'}</td></tr>
              ) : (
                displayQueue.map((apt) => (
                  <tr key={apt.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <span className="block text-[10px] text-indigo-600 font-black uppercase tracking-wider mb-0.5">{apt.date || 'Walk-in'}</span>
                      <span className="font-bold text-gray-900">{apt.time}</span>
                    </td>                   
                    <td className="px-6 py-4 font-bold text-gray-900 capitalize">{apt.patientName}</td>
                    <td className="px-6 py-4 text-gray-600 text-xs">{apt.doctorName || apt.doctor}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${apt.statusInfo.color}`}>{apt.statusInfo.text}</span>
                    </td>
                    {isReceptionist && activeTab === 'live' && (
                      <td className="px-6 py-4 text-right">
                        {apt.statusInfo.text !== 'Completed' && (
                         <div className="flex justify-end gap-2">
                            {apt.statusInfo.text === 'Scheduled' && apt.date === getLocalDateStr() && (
                              <button onClick={() => onCheckIn(apt)} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition shadow-sm whitespace-nowrap">
                                Check-In & Pay
                              </button>
                            )}
                            {apt.statusInfo.text === 'Waiting for Doctor' && (
                              <button onClick={() => onComplete(apt.id)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 cursor-pointer transition shadow-sm whitespace-nowrap">
                                Mark Complete
                              </button>
                            )}
                            <button onClick={() => onOpenEditApt(apt)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 cursor-pointer">Edit</button>
                            <button onClick={() => onDeleteApt(apt.id)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 cursor-pointer transition">Remove</button>
                          </div>                        )}
                      </td>
                    )}                  
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
const PrescriptionsModule = ({ currentUser, patients, appointments = [], prescriptions, getDynamicStatus, onSavePrescription, onDischarge }) => {
  const [form, setForm] = useState({ patientId: '', diagnosis: '', medications: [{ name: '', route: 'Oral', dosage: '', frequency: '', duration: '' }], reqLab: '', allergyChecked: false });
  const [editingRx, setEditingRx] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('');
  const [aiSummary, setAiSummary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
 
  React.useEffect(() => {
    if (!form.patientId) { setAiSummary(null); return; }
    setIsGenerating(true);
    const timer = setTimeout(() => {
      const pastRxs = prescriptions.filter(rx => rx.patientId === form.patientId);
      if (pastRxs.length === 0) {
        setAiSummary(["No prior clinical history found in database.", "First-time consultation for this department.", "Standard intake protocols apply."]);
      } else {
        const uniqueDiagnoses = [...new Set(pastRxs.map(r => r.diagnosis).filter(Boolean))].slice(0, 2);
        const activeMeds = pastRxs[0].medications?.map(m => m.name).join(', ') || 'None recorded';
        setAiSummary([`History of: ${uniqueDiagnoses.length > 0 ? uniqueDiagnoses.join('; ') : 'Undocumented conditions'}.`, `Recent medications: ${activeMeds}.`, `Total past visits: ${pastRxs.length} recorded interactions.`]);
      }
      setIsGenerating(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [form.patientId, prescriptions]);

  const handlePrintPrescription = (rx) => {
    const printWindow = window.open('', '_blank');
    const medicationsHtml = rx.medications?.map(m => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>${m.name}</strong></td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${m.dosage || '-'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${m.frequency || '-'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${m.duration || '-'}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="padding: 12px;">No medications listed</td></tr>';

    printWindow.document.write(`
      <html>
        <head>
          <title>Prescription - ${rx.id}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #111; line-height: 1.5; }
            .header { border-bottom: 2px solid #4355B9; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
            .logo-sec h1 { margin: 0; color: #4355B9; font-size: 24px; }
            .details-grid { display: flex; justify-content: space-between; background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 30px;}
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table th { background-color: #f3f4f6; text-transform: uppercase; font-size: 12px; padding: 12px; text-align: left; }
            .rx-symbol { font-size: 36px; font-weight: bold; margin-bottom: 10px; color: #4355B9; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; }
            .signature { border-top: 1px solid #000; padding-top: 5px; width: 200px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-sec">
              <h1>CarePoint Health Network</h1>
              <p style="margin:0; font-size:12px; color:#666;">123 Medical Plaza, Care District</p>
            </div>
            <div style="text-align: right;">
              <h3 style="margin:0;">${rx.doctorName || 'Attending Doctor'}</h3>
              <p style="margin:0; font-size:12px; color:#666;">Clinical Department</p>
            </div>
          </div>
          <div class="details-grid">
            <div><strong>Patient:</strong> ${rx.patientName || 'Unknown'} <br><strong>ID:</strong> ${rx.patientId || 'N/A'}</div>
            <div style="text-align:right;"><strong>ORDER NO:</strong> ${rx.id} <br><strong>Date:</strong> ${new Date(rx.date || Date.now()).toLocaleDateString('en-GB')}</div>
          </div>
          <div class="rx-symbol">℞</div>
          <table class="table">
            <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration (Days)</th></tr></thead>
            <tbody>${medicationsHtml}</tbody>
          </table>
          <div style="margin-top: 40px; background: #f9fafb; padding: 15px; border-radius: 8px;">
            <strong>Diagnosis & Notes:</strong><br>
            <p style="margin-top: 8px;">${rx.diagnosis || rx.notes || 'No additional notes provided.'}</p>
          </div>
          <div class="footer">
            <div style="font-size:10px; color:#999;">OFFICIAL CAREPOINT DOCUMENT • GENERATED BY CLINICAL DEPARTMENT</div>
            <div class="signature">Doctor's Signature</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const activePatients = React.useMemo(() => {
    const map = new Map();
    const isDoctor = currentUser?.role?.toLowerCase() === 'doctor';
    const todayStr = getLocalDateStr();

    appointments.forEach(apt => {
      if (apt.date !== todayStr) return;
      const statusInfo = getDynamicStatus(apt);   
      if (statusInfo.text === 'Waiting for Doctor') {
        if (isDoctor && apt.doctorId !== currentUser?.username) return; 

        const matchedPatient = patients.find(p => p.id === apt.patientId);
        map.set(apt.patientId, {
          id: apt.patientId,
          name: matchedPatient?.name || apt.patientName || 'Unknown',
          aptLabel: ` (Time: ${apt.time || 'Walk-in'})`
        });
      }
    });
    return Array.from(map.values());
  }, [patients, appointments, currentUser, getDynamicStatus]);

  const handleMedChange = (index, field, value) => {
    const newMeds = [...form.medications];
    newMeds[index][field] = value;
    setForm({ ...form, medications: newMeds });
  };
  const handleAddMedication = () => setForm({ ...form, medications: [...form.medications, { name: '', route: 'Oral', dosage: '', frequency: '', duration: '' }] });
  const handleRemoveMedication = (index) => {
    const newMeds = form.medications.filter((_, i) => i !== index);
    setForm({ ...form, medications: newMeds.length > 0 ? newMeds : [{ name: '', route: 'Oral', dosage: '', frequency: '', duration: '' }] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.allergyChecked) { toast.error("Please confirm allergy check."); return; }
    const validMeds = form.medications.filter(m => m.name.trim() !== '');
    if (validMeds.length === 0 && !form.reqLab) { toast.error("Please prescribe a medicine or select a lab test."); return; }
    
    const selectedPatient = activePatients.find(p => p.id === form.patientId) || patients.find(p => p.id === form.patientId);
    let newRx = null;
    if (validMeds.length > 0) {
      newRx = { id: `RX-${Date.now().toString().slice(-5)}`, patientName: selectedPatient ? selectedPatient.name : 'Unknown', patientId: form.patientId, medications: validMeds, diagnosis: form.diagnosis, status: 'PENDING', doctorName: currentUser?.name || currentUser?.username };
    }
    let newLabOrder = null;
    if (form.reqLab) {
      newLabOrder = { id: `ORD-${Date.now().toString().slice(-5)}`, patientName: selectedPatient ? selectedPatient.name : 'Unknown', patientId: form.patientId, testName: form.reqLab, status: 'PENDING' };
    }
    onSavePrescription(newRx, newLabOrder);
    toast.success("Clinical order submitted successfully!");
    setForm({ patientId: '', diagnosis: '', medications: [{ name: '', route: 'Oral', dosage: '', frequency: '', duration: '' }], reqLab: '', allergyChecked: false });
    setAiSummary(null);
  };

  const handleManualDischarge = () => {
    if (!form.patientId) { toast.error("Please select a patient first."); return; }
    if (window.confirm("Discharge patient without prescribing any medicines or lab tests?")) {
      onDischarge(form.patientId);
      setForm({ patientId: '', diagnosis: '', medications: [{ name: '', route: 'Oral', dosage: '', frequency: '', duration: '' }], reqLab: '', allergyChecked: false });
      setAiSummary(null);
    }
  };

  const filteredPrescriptions = historyFilter ? prescriptions.filter(rx => rx.patientId === historyFilter) : prescriptions;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">DOCTOR WORKSPACE</p>
      <div className="mb-8"><h2 className="text-3xl font-bold text-gray-900 tracking-tight">Prescriptions & Orders</h2></div>
      
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50"><h3 className="text-lg font-bold text-gray-900">New Diagnosis & Order</h3></div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8 items-start">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Active Patient (Checked-In Queue)</label>
                <select value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})} className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:border-indigo-500" required>
                  <option value="" disabled>Select a patient</option>
                  {activePatients.length === 0 && <option disabled>No checked-in patients</option>}
                  {activePatients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id}){p.aptLabel}</option>
                  ))}
                </select>
              </div>

              {form.patientId && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={16} className="text-indigo-600" />
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">AI Clinical Insights</h4>
                  </div>
                  {isGenerating ? (
                    <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      Analyzing patient history...
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {aiSummary?.map((point, idx) => (
                        <li key={idx} className="text-sm text-indigo-900 flex items-start gap-2 leading-tight">
                          <span className="text-indigo-400 mt-0.5">•</span> {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Clinical Diagnosis</label>
                <textarea value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none text-sm h-16 resize-none focus:border-indigo-500" required></textarea>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Request Lab Test (Optional)</label>
                <select value={form.reqLab} onChange={e => setForm({...form, reqLab: e.target.value})} className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:border-indigo-500">
                  <option value="">None</option>
                  <option value="CBC">Complete Blood Count (CBC)</option>
                  <option value="LIPID">Lipid Profile</option>
                  <option value="THYROID">Thyroid Panel (TSH)</option>
                  <option value="URINE">Urine Analysis</option>
                  <option value="XRAY">X-Ray Imaging</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-6 mb-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Medications (Optional if ordering lab test only)</p>
            {form.medications.map((med, index) => (
              <div key={index} className="p-5 mb-4 border border-indigo-100 rounded-xl bg-indigo-50/20 relative transition-all">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Medication {index + 1}</p>
                  {index > 0 && <button type="button" onClick={() => handleRemoveMedication(index)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>}
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Medicine name</label>
                    <input type="text" value={med.name} onChange={e => handleMedChange(index, 'name', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" placeholder="e.g. Amoxicillin 500mg" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Route</label>
                    <select value={med.route} onChange={e => handleMedChange(index, 'route', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:border-indigo-500">
                      <option value="Oral">Oral</option><option value="IV">Intravenous</option><option value="IM">Intramuscular</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-x-6">
                  <div><label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Dosage</label><input type="text" value={med.dosage} onChange={e => handleMedChange(index, 'dosage', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" placeholder="e.g. 1 Tablet" /></div>
                  <div><label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Frequency</label><input type="text" value={med.frequency} onChange={e => handleMedChange(index, 'frequency', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" placeholder="e.g. Twice a day" /></div>
                  <div><label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Duration (days)</label><input type="number" value={med.duration} onChange={e => handleMedChange(index, 'duration', e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" placeholder="e.g. 5" /></div>
                </div>
              </div>
            ))}
            <button type="button" onClick={handleAddMedication} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition cursor-pointer">+ Add Another Medicine</button>
          </div>
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.allergyChecked} onChange={e => setForm({...form, allergyChecked: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
              <span className="text-sm font-semibold text-gray-700">I checked allergy history.</span>
            </label>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <button type="button" onClick={handleManualDischarge} className="px-5 py-2.5 text-sm font-semibold text-red-600 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition">Discharge (No Rx Needed)</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-semibold bg-[#4355B9] text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition">Save Official Order</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-lg">Prescription Overview & History</h3>
          <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-indigo-500">
            <option value="">All Patients Overview</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-white">
                <th className="px-6 py-4">PATIENT</th>
                <th className="px-6 py-4">MEDICATIONS PRESCRIBED</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredPrescriptions.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-12 text-gray-500 font-medium">No prescriptions found.</td></tr>
              ) : (
                filteredPrescriptions.map((rx) => (
                  <tr key={rx.id} className="border-b border-gray-50">
                    <td className="px-6 py-4 font-bold capitalize">{rx.patientName}</td>
                    <td className="px-6 py-4">
                      {rx.medications && rx.medications.length > 0 
                        ? rx.medications.map(m=>m.name).join(', ') 
                        : <span className="text-gray-400 italic">None (Lab Only)</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${rx.status === 'FULFILLED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{rx.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-3">
                      {rx.status === 'PENDING' && (
                        <button onClick={() => setEditingRx(rx)} className="text-xs text-gray-500 font-bold hover:text-indigo-600 flex items-center gap-1 cursor-pointer"><Edit3 size={12}/> Edit</button>
                      )}
                      <button onClick={() => handlePrintPrescription(rx)} className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">Print Form</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
const DoctorLabResults = ({ patients, labReports, onOpenPrint }) => {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const completedLabs = labReports.filter(lab => (lab.status || '').toUpperCase() === 'COMPLETED');
  const selectedPatientLabs = selectedPatientId 
    ? completedLabs.filter(lab => lab.patientId === selectedPatientId)
    : completedLabs;

  const handlePrintLabReport = (lab) => {
    const printWindow = window.open('', '_blank');
    const formattedResults = lab.result 
      ? lab.result.split(' | ').map(item => {
          const parts = item.split(':');
          return `<div style="padding: 10px 0; border-bottom: 1px dashed #eee; font-size: 15px;">&#8226; <strong>${parts[0] ? parts[0].trim() : item}</strong> ${parts[1] ? `: ${parts[1].trim()}` : ''}</div>`;
        }).join('')
      : 'Results pending verification or no notes entered.';

    printWindow.document.write(`
      <html>
        <head>
          <title>Lab Report - ${lab.id}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #111; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #4355B9; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #4355B9; font-size: 26px; font-weight: 900; }
            .details-grid { display: flex; justify-content: space-between; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 30px;}
            .report-title { text-align: center; margin: 30px 0; font-size: 22px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; color: #111;}
            .content-box { border: 1px solid #e5e7eb; padding: 30px; border-radius: 8px; min-height: 250px; font-size: 15px; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-end; }
            .signature { border-top: 1px solid #000; padding-top: 5px; width: 220px; text-align: center; font-weight: bold;}
          </style>
        </head>
        <body>
          <div class="header"><h1>CarePoint Diagnostic Laboratory</h1><p style="margin:0; font-size:14px; color:#666; letter-spacing: 2px; text-transform: uppercase;">Official Pathology Report</p></div>
          <div class="details-grid">
            <div><strong>Patient Name:</strong> ${lab.patientName || 'Unknown'} <br><strong>Patient ID:</strong> ${lab.patientId || 'N/A'}<br><strong>Ref. Doctor:</strong> ${lab.doctorName || 'Self'}</div>
            <div style="text-align:right;"><strong>TEST REF:</strong> ${lab.id} <br><strong>Sample Date:</strong> ${new Date(lab.date || Date.now()).toLocaleDateString('en-GB')}<br><strong>Status:</strong> ${lab.status || 'Verified'}</div>
          </div>
          <div class="report-title">${lab.testName || lab.testType || 'Laboratory Analysis'}</div>
          <div class="content-box"><h4 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Test Results & Findings</h4><div style="margin-top: 15px;">${formattedResults}</div></div>
          <div class="footer">
            <div style="font-size:10px; color:#999; max-width: 50%;"><strong>Notice:</strong> This is a digitally verified report. Clinical correlation is recommended.<br><br>OFFICIAL CAREPOINT DOCUMENT • GENERATED BY DIAGNOSTIC LABORATORY</div>
            <div class="signature">Electronically Verified By<br><span style="font-size: 12px; font-weight: normal;">CarePoint Lab Department</span></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  }; 
  return (
    <div className="max-w-6xl mx-auto pb-10">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">DOCTOR WORKSPACE</p>
      <div className="mb-6"><h2 className="text-3xl font-bold text-gray-900 tracking-tight">Patient Lab Results</h2></div>
      
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Filter by Patient</label>
        <select value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)} className="w-full max-w-md px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm bg-white">
          <option value="">All Patients (Showing All Reports)</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100"><h3 className="font-bold text-gray-900 text-lg">Completed Diagnostic Reports</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-4">PATIENT</th>
                <th className="px-6 py-4">TEST</th>
                <th className="px-6 py-4">DATE</th>
                <th className="px-6 py-4">RESULT SUMMARY</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {selectedPatientLabs.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-12 text-gray-500 font-medium">No completed lab results found.</td></tr>
              ) : (
                selectedPatientLabs.map((lab) => (
                  <tr key={lab.id} className="border-b border-gray-50">
                    <td className="px-6 py-4 font-bold capitalize">{lab.patientName} <span className="text-xs font-normal text-gray-400">({lab.patientId})</span></td>
                    <td className="px-6 py-4 font-bold">{lab.testName}</td>
                    <td className="px-6 py-4 text-gray-500">{lab.reported}</td>
                    <td className="px-6 py-4 text-xs text-gray-600 truncate max-w-[300px]">{lab.result}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => handlePrintLabReport(lab)} className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">Print Report</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PharmacyModule = ({ prescriptions, inventory, invoices, onOpenStockModal, onOpenFulfillModal, onOpenEditStockModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('queue'); 
  const lowStockCount = inventory.filter(i => i.quantity < 50).length;
  
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const expiringItems = inventory.filter(item => {
    const expDate = new Date(item.expiry);
    return expDate <= thirtyDaysFromNow && expDate >= today;
  });
  const expiredItems = inventory.filter(item => new Date(item.expiry) < today);

  const rxWithMeds = prescriptions.filter(rx => rx.medications && rx.medications.length > 0 && rx.patientName.toLowerCase().includes(searchTerm.toLowerCase()));
  const queueRxs = rxWithMeds.filter(rx => rx.status !== 'FULFILLED');
  const historyRxs = rxWithMeds.filter(rx => rx.status === 'FULFILLED');
  const displayRxs = activeTab === 'queue' ? queueRxs : historyRxs;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">PHARMACY DESK</p>
      <div className="flex justify-between items-end mb-8">
        <div><h2 className="text-3xl font-bold text-gray-900 tracking-tight">Pharmacy</h2></div>
        <button onClick={onOpenStockModal} className="bg-[#4355B9] hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 cursor-pointer">+ Add stock</button>
      </div>
      
      {lowStockCount > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-amber-500 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-bold text-amber-800">Inventory Alert</h4>
            <p className="text-xs text-amber-700 mt-1">You have {lowStockCount} item(s) running low on stock.</p>
          </div>
        </div>
      )}

      {(expiringItems.length > 0 || expiredItems.length > 0) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-red-600 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-bold text-red-900">Critical Expiry Warning</h4>
            <p className="text-xs text-red-700 mt-1">
              {expiredItems.length > 0 && <span className="block font-bold mb-1">{expiredItems.length} batch(es) have EXPIRED. Do not dispense.</span>}
              {expiringItems.length > 0 && <span className="block">{expiringItems.length} batch(es) will expire within the next 30 days.</span>}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-6 mb-4 border-b border-gray-200 px-2">
        <button onClick={() => setActiveTab('queue')} className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 ${activeTab === 'queue' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>Live Queue ({queueRxs.length})</button>
        <button onClick={() => setActiveTab('history')} className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>Fulfilled History ({historyRxs.length})</button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 text-lg">{activeTab === 'queue' ? 'Actionable Orders' : 'Past Records'}</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input type="text" placeholder="Search by patient..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b bg-white sticky top-0">
                  <th className="px-6 py-4">PATIENT</th><th className="px-6 py-4">MEDICINES</th><th className="px-6 py-4">STATUS</th><th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {displayRxs.map((rx) => (
                  <tr key={rx.id} className="border-b border-gray-50">
                    <td className="px-6 py-4 font-bold capitalize">{rx.patientName}</td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-700">{rx.medications.map(m=>m.name).join(', ')}</td>
                    <td className="px-6 py-4"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${rx.status === 'FULFILLED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{rx.status}</span></td>
                    <td className="px-6 py-4 text-right">
                      {rx.status === 'PAID' && <button onClick={() => onOpenFulfillModal(rx)} className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg cursor-pointer hover:bg-indigo-700 transition">Fulfill Details</button>}
                      {rx.status === 'PENDING' && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">PENDING PAYMENT</span>}
                    </td>
                  </tr>
                ))}
                {displayRxs.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-gray-400">No prescriptions found in this tab.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-6 border-b border-gray-100"><h3 className="font-bold text-gray-900 text-lg">Stock watch</h3></div>
          <div className="flex-1 overflow-y-auto p-2">
            {inventory.map((item) => {
              const expDate = new Date(item.expiry);
              const isExpired = expDate < today;
              const isExpiringSoon = expDate <= thirtyDaysFromNow && expDate >= today;
              return (
                <div key={item.id} className="p-4 border-b border-gray-50 flex items-center justify-between group hover:bg-gray-50/80 transition rounded-xl">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{item.name}</p>
                    <p className="text-[10px] text-gray-400">Batch {item.batch} • <span className={`${isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-amber-600 font-bold' : ''}`}> Exp: {item.expiry}</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-xs font-bold ${item.quantity < 50 ? 'text-amber-500' : 'text-emerald-500'}`}>{item.quantity} left</div>
                    <button onClick={() => onOpenEditStockModal(item)} className="opacity-0 group-hover:opacity-100 text-indigo-600 p-1.5 hover:bg-indigo-100 rounded-lg transition cursor-pointer"><Edit3 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const LaboratoryModule = ({ patients, labOrders, labReports, invoices, onSaveLabReport }) => {
  const [activeOrder, setActiveOrder] = useState(null);
  const [form, setForm] = useState({});

  const handleSelectOrder = (order) => {
    setActiveOrder(order);
    setForm({ patientId: order.patientId, testName: order.testName });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedPatient = patients.find(p => p.id === form.patientId);
    const reportedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    let resultString = '';
    if (activeOrder.testName === 'CBC') { resultString = `Hb: ${form.hb || '--'} g/dL | WBC: ${form.wbc || '--'} cells/mcL | Plt: ${form.plt || '--'} lakhs | RBC: ${form.rbc || '--'} mil/mcL | HCT: ${form.hct || '--'}% | MCV: ${form.mcv || '--'} fL | Neutro: ${form.neutrophils || '--'}% | Lympho: ${form.lymphocytes || '--'}%`; } 
    else if (activeOrder.testName === 'LIPID') { resultString = `Chol: ${form.chol || '--'} mg/dL | HDL: ${form.hdl || '--'} mg/dL | LDL: ${form.ldl || '--'} mg/dL | Triglycerides: ${form.triglycerides || '--'} mg/dL | VLDL: ${form.vldl || '--'} mg/dL`; } 
    else if (activeOrder.testName === 'THYROID') { resultString = `TSH: ${form.tsh || '--'} mIU/L | T3: ${form.t3 || '--'} ng/dL | T4: ${form.t4 || '--'} ug/dL`; } 
    else if (activeOrder.testName === 'URINE') { resultString = `Color: ${form.color || '--'} | pH: ${form.ph || '--'} | SG: ${form.sg || '--'} | Glucose: ${form.glucose || '--'} | Protein: ${form.protein || '--'} | Ketones: ${form.ketones || '--'}`; } 
    else if (activeOrder.testName === 'XRAY') { resultString = `Impression:\n${form.impression || 'Normal'}`; }

    onSaveLabReport({ id: `LAB-${Math.floor(Math.random() * 10000)}`, orderId: activeOrder.id, patientName: selectedPatient ? selectedPatient.name : 'Unknown', patientId: form.patientId, testName: activeOrder.testName, reportType: activeOrder.testName, result: resultString, status: 'COMPLETED', reported: reportedDate });
    toast.success("Lab report completed and saved!"); setActiveOrder(null); setForm({});
  };

  // NEW: Dedicated Print Engine for the Laboratorist Desk
  const handlePrintLabReport = (lab) => {
    const printWindow = window.open('', '_blank');
    const formattedResults = lab.result 
      ? lab.result.split(' | ').map(item => {
          const parts = item.split(':');
          return `<div style="padding: 10px 0; border-bottom: 1px dashed #eee; font-size: 15px;">&#8226; <strong>${parts[0] ? parts[0].trim() : item}</strong> ${parts[1] ? `: ${parts[1].trim()}` : ''}</div>`;
        }).join('')
      : 'Results pending verification or no notes entered.';

    printWindow.document.write(`
      <html>
        <head>
          <title>Lab Report - ${lab.id}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #111; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #4355B9; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #4355B9; font-size: 26px; font-weight: 900; }
            .details-grid { display: flex; justify-content: space-between; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 30px;}
            .report-title { text-align: center; margin: 30px 0; font-size: 22px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; color: #111;}
            .content-box { border: 1px solid #e5e7eb; padding: 30px; border-radius: 8px; min-height: 250px; font-size: 15px; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-end; }
            .signature { border-top: 1px solid #000; padding-top: 5px; width: 220px; text-align: center; font-weight: bold;}
          </style>
        </head>
        <body>
          <div class="header"><h1>CarePoint Diagnostic Laboratory</h1><p style="margin:0; font-size:14px; color:#666; letter-spacing: 2px; text-transform: uppercase;">Official Pathology Report</p></div>
          <div class="details-grid">
            <div><strong>Patient Name:</strong> ${lab.patientName || 'Unknown'} <br><strong>Patient ID:</strong> ${lab.patientId || 'N/A'}<br><strong>Ref. Doctor:</strong> ${lab.doctorName || 'Self'}</div>
            <div style="text-align:right;"><strong>TEST REF:</strong> ${lab.id} <br><strong>Sample Date:</strong> ${new Date(lab.date || Date.now()).toLocaleDateString('en-GB')}<br><strong>Status:</strong> ${lab.status || 'Verified'}</div>
          </div>
          <div class="report-title">${lab.testName || lab.testType || 'Laboratory Analysis'}</div>
          <div class="content-box"><h4 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Test Results & Findings</h4><div style="margin-top: 15px;">${formattedResults}</div></div>
          <div class="footer">
            <div style="font-size:10px; color:#999; max-width: 50%;"><strong>Notice:</strong> This is a digitally verified report. Clinical correlation is recommended.<br><br>OFFICIAL CAREPOINT DOCUMENT • GENERATED BY DIAGNOSTIC LABORATORY</div>
            <div class="signature">Electronically Verified By<br><span style="font-size: 12px; font-weight: normal;">CarePoint Lab Department</span></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">DIAGNOSTICS DESK</p>
      <div className="mb-6"><h2 className="text-3xl font-bold text-gray-900 tracking-tight">Laboratory Test Processing</h2></div>
      
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[550px]">
          <div className="p-6 border-b border-gray-100"><h3 className="font-bold text-gray-900 text-lg">Pending Lab Orders</h3></div>
          <div className="flex-1 overflow-y-auto p-2">
            {labOrders.filter(o => o.status === 'PENDING' || o.status === 'PAID').map(o => (
              <div key={o.id} className="p-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-gray-900 capitalize">{o.patientName}</p>
                  <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 mt-1 rounded inline-block">{o.testName}</p>
                </div>
                {o.status === 'PAID' ? <button onClick={() => handleSelectOrder(o)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 cursor-pointer">Process</button> : <span className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">PENDING PAYMENT</span>}
              </div>
            ))}
            {labOrders.filter(o => o.status === 'PENDING' || o.status === 'PAID').length === 0 && <p className="text-center text-gray-400 text-sm mt-10">No actionable orders.</p>}
          </div>
        </div>        
        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[550px]">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50"><h3 className="font-bold text-gray-900 text-lg">Process Test Data</h3></div>
          <div className="p-6 flex-1 overflow-y-auto">
            {!activeOrder ? (
              <div className="text-center text-gray-400 mt-20">Select an order from the queue to enter detailed diagnostic parameters.</div>
            ) : (
             <form onSubmit={handleSubmit}>
                <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm font-bold text-indigo-900">Patient: <span className="capitalize">{activeOrder.patientName}</span></p>
                  <p className="text-xs text-indigo-700">Test Ordered: {activeOrder.testName}</p>
                </div>

                {activeOrder.testName === 'CBC' && (
                  <div className="grid grid-cols-3 gap-5 mb-6">
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Hemoglobin (Hb)</label><input type="text" value={form.hb || ''} onChange={e => setForm({...form, hb: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="g/dL" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">WBC Count</label><input type="text" value={form.wbc || ''} onChange={e => setForm({...form, wbc: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="cells/mcL" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Platelets</label><input type="text" value={form.plt || ''} onChange={e => setForm({...form, plt: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="Lakhs/mcL" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">RBC Count</label><input type="text" value={form.rbc || ''} onChange={e => setForm({...form, rbc: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="mil/mcL" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">HCT (%)</label><input type="text" value={form.hct || ''} onChange={e => setForm({...form, hct: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="%" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">MCV</label><input type="text" value={form.mcv || ''} onChange={e => setForm({...form, mcv: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="fL" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Neutrophils</label><input type="text" value={form.neutrophils || ''} onChange={e => setForm({...form, neutrophils: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="%" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Lymphocytes</label><input type="text" value={form.lymphocytes || ''} onChange={e => setForm({...form, lymphocytes: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="%" required /></div>
                  </div>
                )}

                {activeOrder.testName === 'LIPID' && (
                  <div className="grid grid-cols-3 gap-5 mb-6">
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Total Cholesterol</label><input type="text" value={form.chol || ''} onChange={e => setForm({...form, chol: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="mg/dL" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">HDL</label><input type="text" value={form.hdl || ''} onChange={e => setForm({...form, hdl: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="mg/dL" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">LDL</label><input type="text" value={form.ldl || ''} onChange={e => setForm({...form, ldl: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="mg/dL" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Triglycerides</label><input type="text" value={form.triglycerides || ''} onChange={e => setForm({...form, triglycerides: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="mg/dL" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">VLDL</label><input type="text" value={form.vldl || ''} onChange={e => setForm({...form, vldl: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="mg/dL" required /></div>
                  </div>
                )}

                {activeOrder.testName === 'THYROID' && (
                  <div className="grid grid-cols-3 gap-5 mb-6">
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">TSH</label><input type="text" value={form.tsh || ''} onChange={e => setForm({...form, tsh: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="mIU/L" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">T3</label><input type="text" value={form.t3 || ''} onChange={e => setForm({...form, t3: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="ng/dL" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">T4</label><input type="text" value={form.t4 || ''} onChange={e => setForm({...form, t4: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="ug/dL" required /></div>
                  </div>
                )}

                {activeOrder.testName === 'URINE' && (
                  <div className="grid grid-cols-3 gap-5 mb-6">
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Color</label><input type="text" value={form.color || ''} onChange={e => setForm({...form, color: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="e.g. Pale Yellow" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">pH</label><input type="text" value={form.ph || ''} onChange={e => setForm({...form, ph: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="e.g. 6.0" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Specific Gravity</label><input type="text" value={form.sg || ''} onChange={e => setForm({...form, sg: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="e.g. 1.015" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Glucose</label><input type="text" value={form.glucose || ''} onChange={e => setForm({...form, glucose: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="Nil / Present" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Protein</label><input type="text" value={form.protein || ''} onChange={e => setForm({...form, protein: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="Nil / Trace" required /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Ketones</label><input type="text" value={form.ketones || ''} onChange={e => setForm({...form, ketones: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="Negative" required /></div>
                  </div>
                )}

                {activeOrder.testName === 'XRAY' && (
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Radiologist Impression</label>
                    <textarea value={form.impression || ''} onChange={e => setForm({...form, impression: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 min-h-[120px]" placeholder="Enter full diagnostic impression here..." required></textarea>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button type="submit" className="px-6 py-2.5 text-sm font-semibold bg-[#4355B9] text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition">Generate Official Report</button>
                </div>
              </form>            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100"><h3 className="font-bold text-gray-900 text-lg">Completed Diagnostic Reports</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-4">PATIENT</th>
                <th className="px-6 py-4">TEST</th>
                <th className="px-6 py-4">RESULT SUMMARY</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            {/* NEW: Safe Mapping with Empty State Message */}
            <tbody className="text-sm">
              {(!labReports || labReports.length === 0) ? (
                <tr><td colSpan="4" className="text-center py-12 text-gray-500 font-medium">No completed lab results found.</td></tr>
              ) : (
                labReports.map((lab) => (
                  <tr key={lab.id} className="border-b border-gray-50">
                    <td className="px-6 py-4 font-bold capitalize">{lab.patientName}</td>
                    <td className="px-6 py-4 font-bold">{lab.testName}</td>
                    <td className="px-6 py-4 text-xs text-gray-600 truncate max-w-[300px]">{lab.result}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handlePrintLabReport(lab)} className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">
                        Print Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
const BillingModule = ({ invoices, prescriptions, labOrders, patients, onClearDues, onOpenInvoiceModal, labTestPrices }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [amounts, setAmounts] = useState({});

  const handleAmountChange = (id, val) => setAmounts(prev => ({...prev, [id]: val}));

  const handlePrintReceipt = (inv) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>CarePoint Receipt - ${inv.id}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #111; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: 900; color: #4355B9; letter-spacing: -0.5px; }
            .subtitle { font-size: 14px; color: #6b7280; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
            .details-grid { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 14px; }
            .details-box { background: #f9fafb; padding: 15px; border-radius: 8px; width: 45%; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            .table th, .table td { padding: 16px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .table th { background-color: #f3f4f6; font-weight: bold; color: #374151; text-transform: uppercase; font-size: 12px; }
            .table td.money { text-align: right; font-weight: 600; }
            .table th.money { text-align: right; }
            .total-row { font-size: 20px; font-weight: 900; }
            .footer { text-align: center; margin-top: 60px; font-size: 12px; color: #9ca3af; }
            .badge { display: inline-block; padding: 4px 10px; background: #def7ec; color: #03543f; border-radius: 4px; font-weight: bold; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">CarePoint Health Network</div>
            <div class="subtitle">Official Payment Receipt</div>
          </div>
          <div class="details-grid">
            <div class="details-box">
              <strong>Patient Details</strong><br><br>
              Name: <strong>${inv.patientName}</strong><br>
              Patient ID: ${inv.patientId || 'N/A'}
            </div>
            <div class="details-box" style="text-align: right;">
              <strong>Invoice Information</strong><br><br>
              Invoice No: <strong>${inv.id}</strong><br>
              Date: ${new Date(inv.date).toLocaleString('en-GB')}<br>
              Payment Status: <span class="badge">${inv.status}</span>
            </div>
          </div>
          <table class="table">
            <thead><tr><th>Description of Services</th><th class="money">Amount</th></tr></thead>
            <tbody>
              <tr><td>${inv.services || 'Medical Services'}</td><td class="money">₹${inv.subtotal || Math.round(inv.totalAmount / 1.18)}</td></tr>
              <tr><td>GST (18%)</td><td class="money">₹${inv.gstAmount || Math.round(inv.totalAmount - (inv.totalAmount / 1.18))}</td></tr>
              <tr class="total-row"><td style="text-align: right; border-bottom: none; padding-top: 24px;">Total Amount Paid:</td><td class="money" style="border-bottom: none; padding-top: 24px;">₹${inv.totalAmount}</td></tr>
            </tbody>
          </table>
          <div class="footer">Thank you for trusting CarePoint Health Network.<br>This is a computer-generated receipt and does not require a physical signature.</div>
        </body>
      </html>
    `);
    printWindow.document.close(); printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  const pendingRxs = prescriptions.filter(r => r.status === 'PENDING').map(r => ({ ...r, duesType: 'rx', title: 'Pharmacy Prescription' }));
  const pendingLabs = labOrders.filter(l => l.status === 'PENDING').map(l => ({ ...l, duesType: 'lab', title: 'Laboratory Tests' }));

  const allPending = [...pendingRxs, ...pendingLabs].filter(item => {
    const pName = patients.find(p => p.id === item.patientId)?.name || item.patientName || '';
    return pName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const historyInvoices = invoices.filter(inv => (inv.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">FINANCIALS</p>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Billing & Payments</h2>
          <p className="text-gray-500 text-sm mt-1">Collect pending department dues and view invoice history.</p>
        </div>
        <button onClick={onOpenInvoiceModal} className="bg-[#4355B9] hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition cursor-pointer">
          + Create Invoice
        </button>
      </div>

      <div className="flex gap-6 mb-4 border-b border-gray-200 px-2">
        <button onClick={() => setActiveTab('pending')} className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 ${activeTab === 'pending' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>Pending Lab/Rx Dues ({allPending.length})</button>
        <button onClick={() => setActiveTab('history')} className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>Invoice History ({historyInvoices.length})</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <input type="text" placeholder="Search by patient name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" />
        </div>

        {activeTab === 'pending' ? (
          <div className="divide-y divide-gray-100">
            {allPending.length === 0 ? <p className="text-center py-12 text-gray-500 font-medium text-sm">No pending lab or pharmacy orders.</p> : (
              allPending.map(item => {
                const pName = patients.find(p => p.id === item.patientId)?.name || item.patientName || 'Unknown';
                
                // THE FIX: Smartly pull the exact price from labTestPrices
                const defaultAmt = item.duesType === 'rx' ? 350 : (labTestPrices?.[item.testName] || 800); 
                
                const currentAmt = amounts[item.id] !== undefined ? amounts[item.id] : defaultAmt;

                return (
                  <div key={item.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white hover:bg-gray-50/50 transition">
                    <div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md mb-2 inline-block ${item.duesType === 'rx' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>{item.title}</span>
                      <p className="font-bold text-gray-900 capitalize text-lg">{pName}</p>
                      <p className="text-xs text-gray-500 mt-1">Order ID: {item.id}</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Base Amount (₹)</label>
                        <input type="number" value={currentAmt} onChange={e => handleAmountChange(item.id, e.target.value)} className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold outline-none focus:border-indigo-500" />
                      </div>
                      <button onClick={() => onClearDues(item.patientId, item.duesType, item.id, currentAmt)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition shadow-sm cursor-pointer whitespace-nowrap mt-4">Collect + 18% GST</button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4">INVOICE ID</th><th className="px-6 py-4">PATIENT</th><th className="px-6 py-4">SERVICES</th><th className="px-6 py-4">TOTAL</th><th className="px-6 py-4">STATUS</th><th className="px-6 py-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {historyInvoices.length === 0 ? <tr><td colSpan="6" className="text-center py-12 text-gray-500 font-medium">No invoice history found.</td></tr> : (
                  historyInvoices.map(inv => (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-bold text-gray-600">{inv.id}</td><td className="px-6 py-4 font-bold text-gray-900 capitalize">{inv.patientName}</td><td className="px-6 py-4 text-gray-600 text-xs max-w-[200px] truncate">{inv.services}</td><td className="px-6 py-4 font-bold text-gray-900">₹{inv.totalAmount}</td>
                      <td className="px-6 py-4"><span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">{inv.status}</span></td>
                      <td className="px-6 py-4 text-right"><button onClick={() => handlePrintReceipt(inv)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 cursor-pointer">Print Receipt</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
function StaffModule({ staff, onOpenStaffModal, onOpenEditModal, onDeleteStaff }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-500 mt-1">Manage network access and permissions.</p>
        </div>
        <button onClick={onOpenStaffModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"><Plus size={16} /> Add Staff</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map(member => (
          <div key={member.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xl">{member.username.charAt(0).toUpperCase()}</div>
              <div><h3 className="font-bold text-gray-900 text-lg">{member.name || member.username}</h3><p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{member.role}</p></div>
            </div>
            <div className="mt-auto flex gap-3">
              <button onClick={() => onOpenEditModal(member)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Edit Profile</button>
              <button onClick={() => { if(window.confirm(`Are you sure you want to permanently delete ${member.username}?`)) onDeleteStaff(member.id); }} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 rounded-xl flex items-center justify-center transition-colors"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 10. MAIN APP COMPONENT & ROUTER
// ==========================================
export default function App() {
const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  }); 
  const isOnline = useNetworkStatus(); 

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [viewPatient, setViewPatient] = useState(null);
  const [fulfillRx, setFulfillRx] = useState(null);
  const [payInvoice, setPayInvoice] = useState(null);
  const [printDoc, setPrintDoc] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingStock, setEditingStock] = useState(null);
  const [editingApt, setEditingApt] = useState(null);

  const [patients, setPatients] = useStickyState([], 'carepoint_patients');
  const [appointments, setAppointments] = useStickyState([], 'carepoint_appointments');
  const [prescriptions, setPrescriptions] = useStickyState([], 'carepoint_prescriptions');
  const [inventory, setInventory] = useStickyState([
    { id: 'MED-1', name: 'Amoxicillin 500mg', batch: 'AMX-2026', expiry: '2027-12-31', quantity: 200, unitPrice: 15 },
    { id: 'MED-2', name: 'Paracetamol 650mg', batch: 'PAR-2025', expiry: '2027-06-30', quantity: 45, unitPrice: 5 }
  ], 'carepoint_inventory');
  
  const [labOrders, setLabOrders] = useStickyState([], 'carepoint_labOrders');
  const [labReports, setLabReports] = useStickyState([], 'carepoint_labReports');
  const [invoices, setInvoices] = useStickyState([], 'carepoint_invoices');
  const [staff, setStaff] = useStickyState([
    { id: 'S-6', name: 'Administrator', username: 'admin', role: 'ADMIN', password: 'admin' }
  ], 'carepoint_staff');

  const [notifications, setNotifications] = useStickyState([], 'carepoint_notifications');
  const [deletedItems, setDeletedItems] = useStickyState([], 'carepoint_deleted_items');
const [offlineQueue, setOfflineQueue] = useStickyState([], 'carepoint_offline_queue');
const handleSendNotification = (recipient, message, senderInfo) => {
    const newNotif = {
      id: `msg-${Date.now()}`,
      title: recipient === 'ALL_STAFF' ? 'Broadcast Message' : 'Direct Message',
      message: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recipient: recipient,
      sender: senderInfo
    };
    setNotifications(prev => [newNotif, ...prev]);
    pushToCloud('/notifications', 'POST', newNotif);
    setIsMessageModalOpen(false);
    toast.success("Notification sent successfully!");
  };
  const [dismissedNotifs, setDismissedNotifs] = useStickyState([], 'carepoint_dismissed_notifications');

  const handleDismissNotification = (notifId) => {
    setDismissedNotifs(prev => {
      if (prev.includes(notifId)) return prev; 
      return [...prev, notifId];
    });
    toast.success("Notification permanently marked as read");
  };
  const pushToCloud = async (endpoint, method, payload) => {
    if (!isOnline) {
      setOfflineQueue(prev => [...prev, { endpoint, method, payload }]);
      toast.success("Saved locally. Will sync to cloud when online.");
      return; 
    } 
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://carepoint-services.onrender.com/api${endpoint}`, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        toast.error("Session expired."); localStorage.removeItem('token'); setUser(null); 
      }
    } catch (err) {}
  };
React.useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      const syncOfflineData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        toast.success(`Syncing ${offlineQueue.length} offline records to the cloud...`);
        for (const task of offlineQueue) {
          try {
            await fetch(`https://carepoint-services.onrender.com/api${task.endpoint}`, {
              method: task.method,
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(task.payload)
            });
          } catch (err) {}
        }
        setOfflineQueue([]); // Clear the queue after successful upload
      };
      syncOfflineData();
    }
  }, [isOnline, offlineQueue]);
const getDynamicStatus = useCallback((apt) => {
    const { patientId, status: currentStatus, date: aptDate } = apt;
    
    // Explicit manual completion checks
    if (currentStatus === 'Completed') return { text: 'Completed', color: 'bg-emerald-50 text-emerald-600 border border-emerald-100' };
    if (currentStatus === 'Pending Approval') return { text: 'Pending Approval', color: 'bg-amber-50 text-amber-700 border border-amber-200' };
    if (currentStatus === 'Awaiting Patient Confirmation') return { text: 'Waiting on Patient', color: 'bg-blue-50 text-blue-700 border border-blue-200' };

    const hasPendingInv = invoices.some(i => i.patientId === patientId && i.status === 'PENDING');
    const hasPendingRx = prescriptions.some(r => r.patientId === patientId && r.status === 'PENDING');
    const hasPendingLab = labOrders.some(l => l.patientId === patientId && l.status === 'PENDING');

    if (hasPendingInv) return { text: 'Payment Pending', color: 'bg-red-50 text-red-600 border border-red-100' };
    if (hasPendingRx) return { text: 'Pharmacy Pending', color: 'bg-amber-50 text-amber-600 border border-amber-100' };
    if (hasPendingLab) return { text: 'Lab Pending', color: 'bg-purple-50 text-purple-600 border border-purple-100' };
    
    const todayStr = getLocalDateStr();
    const targetDate = aptDate || todayStr;

    // Checks if the database says it's paid OR if a consultation invoice exists for this patient (ignoring the invoice date)
    const isPaid = 
      currentStatus === 'Scheduled (Paid)' || 
      currentStatus === 'Waiting for Doctor' ||
      invoices.some(i => i.patientId === patientId && i.status === 'PAID' && i.services && i.services.includes('Consultation Fee'));

    // Force the correct status strictly based on today's date
    if (isPaid) {
      if (targetDate === todayStr) {
        return { text: 'Waiting for Doctor', color: 'bg-indigo-50 text-indigo-600 border border-indigo-100' };
      } else {
        return { text: 'Scheduled (Paid)', color: 'bg-emerald-50 text-emerald-600 border border-emerald-200' };
      }
    }
    
    return { text: 'Scheduled', color: 'bg-gray-50 text-gray-600 border border-gray-200' };
  }, [invoices, prescriptions, labOrders]);
const handleDischargePatient = (patientId) => {
    // Find any active appointment for this patient that isn't completed yet
    const targetApt = appointments.find(a => a.patientId === patientId && a.status !== 'Completed');
    
    if (targetApt) {
      const updatedApt = { ...targetApt, status: 'Completed' };
      
      // Instantly update the local queue
      setAppointments(prev => prev.map(a => a.id === targetApt.id ? updatedApt : a));
      
      // Save it to the cloud
      pushToCloud(`/appointments/${targetApt.id}`, 'PUT', updatedApt);
      
      toast.success("Patient discharged successfully! Moved to Completed History.");
    } else {
      toast.error("No active appointment found for this patient.");
    }
  };  
  const handleAdminTicket = (message) => {
    const newNotif = { id: `ticket-${Date.now()}`, title: 'New Support Ticket', message: message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setNotifications([newNotif, ...notifications]);
  };

const sendSmartNotification = (patientId, type, refId) => {
    const patient = patients.find(p => p.id === patientId);
    
    // FIX 1: Use patient.email instead of patient.phone
    if (!patient || !patient.email) return; 
    
    const portalUrl = window.location.origin + "/#/login";
    
    const subject = type === "PAYMENT" 
      ? `Action Required: Pending Payment for Order ${refId}` 
      : `Ready: Your Medical Report ${refId} is available`;

    const redirectTarget = type === "PAYMENT" ? "status" : "history";
    
    // FIX 2: Inject patient.email into the secure deep link
    const secureLink = `${portalUrl}?phone=${encodeURIComponent(patient.email)}&redirect=${redirectTarget}`;
    
    const htmlMessage = `
      <div style="font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #4355B9; margin-top: 0;">CarePoint Health Network</h2>
        <p style="color: #374151; font-size: 16px;">Hello ${patient.name},</p>
        <p style="color: #374151; font-size: 16px;">
          ${type === "PAYMENT" 
            ? `Your medical order <strong>${refId}</strong> has been processed and requires payment before fulfillment.` 
            : `Your diagnostic report <strong>${refId}</strong> has been officially verified and is ready for download.`}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${secureLink}" style="background-color: #4355B9; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            ${type === "PAYMENT" ? "Pay Securely Online" : "View Official Report"}
          </a>
        </div>
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-bottom: 0;">
          This is an automated system message. Do not reply to this email.
        </p>
      </div>
    `;

    // FIX 3: Send payload to patient.email
    fetch('https://carepoint-services.onrender.com/api/notify/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: patient.email, subject, htmlMessage })
    }).catch(err => console.error("Email notification failed:", err));
  };
  const nextPatientId = React.useMemo(() => {
    const maxNum = patients.reduce((max, p) => {
      const match = String(p?.id || '').match(/(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 0;
      return num > max ? num : max;
    }, 0);
    return `HMS-26-${String(maxNum + 1).padStart(3, '0')}`;
  }, [patients]);

  const handleAddPatient = (newPatient) => { 
    setPatients(prev => [newPatient, ...prev]); setIsPatientModalOpen(false); pushToCloud('/patients', 'POST', newPatient);
  };  

 const handleDeletePatient = (patientId) => {
    if (window.confirm("Permanently remove patient?")) {
      setDeletedItems(prev => [...prev, patientId]);
      setPatients(prev => prev.filter(p => p.id !== patientId));
      pushToCloud(`/patients/${patientId}`, 'DELETE', {});
    }
  };
  const handleSavePrescription = (newRx, newLabOrder) => { 
    if (newRx) { setPrescriptions([newRx, ...prescriptions]); pushToCloud('/prescriptions', 'POST', newRx); sendSmartNotification(newRx.patientId, "PAYMENT", newRx.id); }
    if (newLabOrder) { setLabOrders([newLabOrder, ...labOrders]); pushToCloud('/lab-orders', 'POST', newLabOrder); if (!newRx) sendSmartNotification(newLabOrder.patientId, "PAYMENT", newLabOrder.id); }
  };

const handleBookAppointment = (newAppointment, isWebPaid = false) => { 
    const finalAppointment = { 
      ...newAppointment, 
      // FIX: Revert to 'Pending Approval' for web bookings so receptionist can confirm
      status: isWebPaid ? 'Pending Approval' : 'Scheduled' 
    };
    setAppointments(prev => [...prev, finalAppointment]); 
    setIsBookingModalOpen(false); 
    pushToCloud('/appointments', 'POST', finalAppointment);

    if (isWebPaid) {
      const feeInvoice = {
        id: `INV-FEE-${Math.floor(Math.random() * 9000) + 1000}`,
        patientId: newAppointment.patientId, patientName: newAppointment.patientName,
        consultationFee: 500, labTotal: 0, pharmacyTotal: 0, subtotal: 500, gstAmount: 90, advancePaid: 0, totalAmount: 590, 
        status: 'PAID', date: newAppointment.date, services: 'Online Booking Consultation Fee'
      };
      setInvoices(prev => [feeInvoice, ...prev]); pushToCloud('/invoices', 'POST', feeInvoice);
    }
  }; 
  const handleApproveWebRequest = (aptId) => {
    const targetApt = appointments.find(a => a.id === aptId);
    if (!targetApt) return;
    const updatedApt = { ...targetApt, status: 'Awaiting Patient Confirmation' };
    setAppointments(appointments.map(a => a.id === aptId ? updatedApt : a));
    pushToCloud(`/appointments/${aptId}`, 'PUT', updatedApt);
  };

 const handleUpdateAppointment = (updatedApt) => {
    // 1. Check if the receptionist actually changed the time, date, or doctor
    const oldApt = appointments.find(a => a.id === updatedApt.id);
    const isRescheduled = oldApt && (oldApt.date !== updatedApt.date || oldApt.time !== updatedApt.time || oldApt.doctorId !== updatedApt.doctorId);

    if (isRescheduled) {
      // 2. Force the status back to negotiation mode
      updatedApt.status = 'Awaiting Patient Confirmation';
      
      // 3. Send a direct notification to the patient's portal
      const newNotif = {
        id: `msg-${Date.now()}`,
        title: 'Appointment Rescheduled',
        message: `Your appointment was updated to ${updatedApt.date} at ${updatedApt.time} with ${updatedApt.doctorName}. Please review and accept the new time.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recipient: updatedApt.patientId,
        sender: { name: 'Reception Desk', role: 'Admin' }
      };
      setNotifications(prev => [newNotif, ...prev]);
      pushToCloud('/notifications', 'POST', newNotif);
    } else if (updatedApt.status === 'Pending Approval') {
      updatedApt.status = 'Awaiting Patient Confirmation';
    }

    // 4. Save updates to local state and cloud database
    setAppointments(prev => prev.map(a => a.id === updatedApt.id ? updatedApt : a));
    pushToCloud(`/appointments/${updatedApt.id}`, 'PUT', updatedApt);
    setEditingApt(null);
  };

  const handleDeleteAppointment = async (aptId) => {
    if (window.confirm("Cancel appointment?")) {
      try {
        const res = await fetch(`https://carepoint-services.onrender.com/api/appointments/${aptId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
        if (res.ok) { setDeletedItems(prev => [...prev, aptId]); setAppointments(prev => prev.filter(a => a.id !== aptId)); }
      } catch (err) {}
    }
  };

const handleCheckInPatient = (apt) => {
    if (window.confirm(`Collect ₹590 and check-in ${apt.patientName}?`)) {
      const updatedApt = { ...apt, status: 'Scheduled (Paid)' };
      setAppointments(prev => prev.map(a => a.id === apt.id ? updatedApt : a));
      pushToCloud(`/appointments/${apt.id}`, 'PUT', updatedApt);
      
      const feeInvoice = {
        id: `INV-FEE-${Math.floor(Math.random() * 9000) + 1000}`,
        patientId: apt.patientId, patientName: apt.patientName,
        consultationFee: 500, labTotal: 0, pharmacyTotal: 0, subtotal: 500, gstAmount: 90, advancePaid: 0, totalAmount: 590, 
        status: 'PAID', date: apt.date, services: 'Desk Walk-in Consultation Fee'
      };
      setInvoices(prev => [feeInvoice, ...prev]); pushToCloud('/invoices', 'POST', feeInvoice);
      toast.success(`₹590 fee recorded. Patient is now Waiting for Doctor.`);
    }
  };
const handleCompleteApt = (aptId) => {
    if (window.confirm("Force this appointment to Completed?")) {
      const targetApt = appointments.find(a => a.id === aptId);
      if (targetApt) {
        const updatedApt = { ...targetApt, status: 'Completed' };
        setAppointments(prev => prev.map(a => a.id === aptId ? updatedApt : a));
        pushToCloud(`/appointments/${aptId}`, 'PUT', updatedApt);
        toast.success("Appointment marked as Completed! Moved to history.");
      }
    }
  };


  const handleClearDepartmentDues = (patientId, duesType, itemId, amount) => {
    const patientName = patients.find(p => p.id === patientId)?.name || 'Unknown Patient';
    const numAmount = parseFloat(amount) || 0;
    const newInvoice = {
      id: `INV-${duesType.toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`,
      patientId: patientId, patientName: patientName, consultationFee: 0,
      labTotal: duesType === 'lab' ? numAmount : 0, pharmacyTotal: duesType === 'rx' ? numAmount : 0,
      subtotal: numAmount, gstAmount: Math.round(numAmount * 0.18), totalAmount: Math.round(numAmount * 1.18),
      status: 'PAID', date: new Date().toISOString(), services: duesType === 'rx' ? 'Pharmacy Medicines (Pre-paid)' : 'Laboratory Tests (Pre-paid)'
    };
    setInvoices(prev => [newInvoice, ...prev]);
    pushToCloud('/invoices', 'POST', newInvoice);

    if (duesType === 'rx') {
      const target = prescriptions.find(r => r.id === itemId);
      if (target) {
        const updated = { ...target, status: 'PAID' }; 
        setPrescriptions(prev => prev.map(r => r.id === itemId ? updated : r));
        pushToCloud(`/prescriptions/${itemId}`, 'PUT', updated);
      }
    } else {
      const target = labOrders.find(l => l.id === itemId);
      if (target) {
        const updated = { ...target, status: 'PAID' }; 
        setLabOrders(prev => prev.map(l => l.id === itemId ? updated : l));
        pushToCloud(`/lab-orders/${itemId}`, 'PUT', updated);
      }
    }
    toast.success(`${duesType === 'rx' ? 'Pharmacy' : 'Lab'} dues cleared! Order unlocked for fulfillment.`);
  };

const handlePatientConfirmApt = (aptId) => {
    const targetApt = appointments.find(a => a.id === aptId);
    if (!targetApt) return;
    
    const updatedApt = { ...targetApt, status: 'Scheduled (Paid)' };
    setAppointments(appointments.map(a => a.id === aptId ? updatedApt : a));
    pushToCloud(`/appointments/${aptId}`, 'PUT', updatedApt);
  };
  const handlePatientRescheduleApt = (aptId, newDetails) => {
    const targetApt = appointments.find(a => a.id === aptId);
    if (!targetApt) return;
    const updatedApt = { ...targetApt, ...newDetails, status: 'Pending Approval' };
    setAppointments(appointments.map(a => a.id === aptId ? updatedApt : a));
    pushToCloud(`/appointments/${aptId}`, 'PUT', updatedApt);
  };

  const handleUpdatePrescription = (updatedRx) => {
    setPrescriptions(prescriptions.map(rx => rx.id === updatedRx.id ? updatedRx : rx));
    pushToCloud(`/prescriptions/${updatedRx.id}`, 'PUT', updatedRx);
  };
  
  const executeFulfillPrescription = (rxId, fulfillDataList) => {
    let newInventory = [...inventory];
    let totalCost = 0;
    fulfillDataList.forEach(data => {
      const stockItem = newInventory.find(i => i.id === data.stockId);
      if(stockItem) {
        stockItem.quantity -= parseInt(data.dispenseQty);
        totalCost += (parseInt(data.dispenseQty) * stockItem.unitPrice);
        pushToCloud(`/inventory/${stockItem.id}`, 'PUT', stockItem); 
      }
    });
    setInventory(newInventory);
    const updatedRx = { ...prescriptions.find(rx => rx.id === rxId), status: 'FULFILLED', totalCost };
    setPrescriptions(prescriptions.map(rx => rx.id === rxId ? updatedRx : rx));
    pushToCloud(`/prescriptions/${rxId}`, 'PUT', updatedRx); 
    setFulfillRx(null);
  };

  const handleAddStock = (newItem) => { 
    setInventory([newItem, ...inventory]); 
    setIsStockModalOpen(false); 
    pushToCloud('/inventory', 'POST', newItem);
  };

  const handleUpdateStock = (updatedItem) => {
    setInventory(inventory.map(item => item.id === updatedItem.id ? updatedItem : item));
    setEditingStock(null);
    pushToCloud(`/inventory/${updatedItem.id}`, 'PUT', updatedItem);
  };
  
 const handleSaveLabReport = (labData) => { 
    const orderId = labData.orderId;
    const targetOrder = labOrders.find(o => o.id === orderId);
    if (!targetOrder) return;
    
    // Create the completed report object with the actual results
    const completedReport = { 
      ...targetOrder, 
      result: labData.result, 
      status: 'COMPLETED', 
      reported: new Date().toISOString().split('T')[0] 
    };
    
    // Move from Orders to Reports in local state
    setLabOrders(prev => prev.filter(o => o.id !== orderId));
    setLabReports(prev => [completedReport, ...prev]);
    
    // Hit the correct PUT route to save the text results to the cloud
    pushToCloud(`/lab-reports/${orderId}`, 'PUT', { result: labData.result, status: 'COMPLETED' });
    
    sendSmartNotification(completedReport.patientId, "REPORT", completedReport.testName);
  };  

  const handleCreateInvoice = (newInvoice) => { 
    setInvoices([newInvoice, ...invoices]); 
    setIsInvoiceModalOpen(false); 
    pushToCloud('/invoices', 'POST', newInvoice);
  };
  
  const executePayment = (invId) => {
    const updatedInv = { ...invoices.find(inv => inv.id === invId), status: 'PAID' };
    setInvoices(invoices.map(inv => inv.id === invId ? updatedInv : inv));
    setPayInvoice(null);
    pushToCloud(`/invoices/${invId}`, 'PUT', updatedInv);
  };

  const handleAddStaff = async (newStaffMember) => { 
    setStaff([newStaffMember, ...staff]); 
    setIsStaffModalOpen(false); 
    pushToCloud('/staff/add', 'POST', newStaffMember);
  };  

  const handleUpdateStaff = async (updatedMember) => { 
    const existingUser = staff.find(s => s.id === updatedMember.id);
    const currentUsername = existingUser ? existingUser.username : updatedMember.username;
    setStaff(staff.map(s => s.id === updatedMember.id ? updatedMember : s)); 
    setEditingStaff(null); 
    pushToCloud('/staff/update', 'PUT', { currentUsername, newUsername: updatedMember.username, password: updatedMember.password, role: updatedMember.role });
  };

  const handleDeleteStaff = async (staffId) => {
    const userToDelete = staff.find(s => s.id === staffId);
    if (!userToDelete) return;
    setDeletedItems(prev => [...prev, staffId, userToDelete.username]);
    setStaff(staff.filter(s => s.id !== staffId));
    pushToCloud(`/staff/${userToDelete.username}`, 'DELETE', {});
  };  

const handleLogout = () => { 
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null); 
  };
  const pendingRxCount = prescriptions.filter(rx => rx.status === 'PENDING').length;
  
  // RESTORED: Generates notifications for staff password resets
  const dbResetNotifications = (staff || []).filter(s => s.reset_requested).map(s => ({
    id: `reset-${s.username}`, 
    title: 'Password Reset Request', 
    message: `User '${s.username}' (${s.role}) requested password recovery.`, 
    time: 'Action Required'
  }));

  const visibleNotifs = React.useMemo(() => {
    if (!user) return [];
    const role = user.role.toUpperCase();
    const rawNotifs = [...dbResetNotifications, ...notifications].filter(n => !dismissedNotifs.includes(n.id));

    return rawNotifs.filter(n => {
      // 1. If user is a Patient, only show notifications sent to their specific ID
      if (role === 'PATIENT') return n.recipient === user.id;
      
      // 2. Broadcasts go to all hospital staff
      if (n.recipient === 'ALL_STAFF') return true;
      
      // 3. Department-specific routing
      if (n.recipient === role) return true;
      if (n.recipient === 'ADMIN_RECEPTION' && (role === 'ADMIN' || role === 'RECEPTIONIST')) return true;
      
      // 4. Fallback for older global notifications (show to Admin only)
      if (!n.recipient && role === 'ADMIN') return true;
      
      return false;
    });
  }, [user, dbResetNotifications, notifications, dismissedNotifs]);
    
  const hospitalStats = { patientCount: patients.length, pendingRx: pendingRxCount, lowStock: inventory.filter(i => i.quantity < 50).length };

useEffect(() => {
    const syncCloudData = async () => {
      if (!isOnline || !user) return;
      
      const token = localStorage.getItem('token');
      if (!token) return;

      const baseUrl = 'https://carepoint-services.onrender.com/api';
      const headers = { 'Authorization': `Bearer ${token}` };

      try {
      // Patient-only sync
        if (user.role === 'patient') {
          const [apt, rx, labs, inv, reports, staffRes, notifRes] = await Promise.all([
            fetch(`${baseUrl}/appointments`, { headers }),
            fetch(`${baseUrl}/prescriptions`, { headers }),
            fetch(`${baseUrl}/lab-orders`, { headers }),
            fetch(`${baseUrl}/invoices`, { headers }),
            fetch(`${baseUrl}/lab-reports`, { headers }),
            fetch(`${baseUrl}/staff`, { headers }),
            fetch(`${baseUrl}/notifications`, { headers }) // <-- ADD THIS
          ]);
          
          if (apt.ok) setAppointments(await apt.json());
          if (rx.ok) setPrescriptions(await rx.json());
          if (labs.ok) setLabOrders(await labs.json());
          if (inv.ok) setInvoices(await inv.json());
          if (reports.ok) setLabReports(await reports.json());
          if (staffRes.ok) setStaff(await staffRes.json());
          if (notifRes && notifRes.ok) setNotifications(await notifRes.json()); // <-- ADD THIS
          
          return;
        }

        // Staff sync
        const [apt, rx, labs, inv, reports, staffRes, patRes, notifRes] = await Promise.all([
          fetch(`${baseUrl}/appointments`, { headers }),
          fetch(`${baseUrl}/prescriptions`, { headers }),
          fetch(`${baseUrl}/lab-orders`, { headers }),
          fetch(`${baseUrl}/invoices`, { headers }),
          fetch(`${baseUrl}/lab-reports`, { headers }),
          fetch(`${baseUrl}/staff`, { headers }),
          fetch(`${baseUrl}/patients`, { headers }),
          fetch(`${baseUrl}/notifications`, { headers }) // <-- ADD THIS
        ]);

        if (apt.ok) setAppointments(await apt.json());
        if (rx.ok) setPrescriptions(await rx.json());
        if (labs.ok) setLabOrders(await labs.json());
        if (inv.ok) setInvoices(await inv.json());
       if (reports.ok) setLabReports(await reports.json());
        if (staffRes.ok) setStaff(await staffRes.json());
        if (patRes.ok) setPatients(await patRes.json());
        if (notifRes && notifRes.ok) setNotifications(await notifRes.json());
        
      } catch (err) {
        console.error("Cloud sync failed:", err);
      }
    };

    syncCloudData();
    const interval = setInterval(syncCloudData, 10000);
    return () => clearInterval(interval);
  }, [isOnline, user]);   
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to={user ? getLandingPath(user.role) : '/login'} replace />} />
        <Route path="/login" element={user ? <Navigate to={getLandingPath(user.role)} replace /> : <LoginScreen onLogin={setUser} staff={staff} patients={patients} onRegisterWebPatient={handleAddPatient} />} />        
        
       <Route element={
          user ? (
            <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
              {user.role !== 'patient' && (
                <div className="hidden md:block"> {/* FIX: Hides sidebar on mobile screens */}
                  <Sidebar user={user} patientCount={patients.length} pendingPrescriptionsCount={pendingRxCount} lowStockCount={inventory.filter(i => i.quantity < 50).length} labReportCount={labReports.length} onOpenSettings={() => setIsSettingsOpen(true)} onOpenHelp={() => setIsHelpOpen(true)} onLogout={handleLogout} />
                </div>
              )}
              {/* FIX: Responsive width and margins for mobile staff portal */}
              <div className={`flex-1 flex flex-col relative w-full print:ml-0 ${user.role !== 'patient' ? 'md:ml-[260px]' : ''}`}>
                {user.role !== 'patient' && (
                  <Header user={user} onLogout={handleLogout} isOnline={isOnline} notifications={visibleNotifs} onDismissNotification={handleDismissNotification} onOpenCompose={() => setIsMessageModalOpen(true)} />
                )}

            {/* Global Message Composer */}
            <MessageComposerModal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} currentUser={user} patients={patients} onSubmit={handleSendNotification} />                
            
            {/* FIX: Changed p-8 to p-4 md:p-8 for better mobile spacing */}
            <main className={`flex-1 overflow-y-auto w-full print:p-0 ${user.role === 'patient' ? 'p-0 bg-white' : 'p-4 md:p-8'}`}>
              <Outlet />
            </main>
                {user.role !== 'patient' && (
                  <Chatbot hospitalStats={hospitalStats} userRole={user?.role} />
                )}
              </div>
            </div>
          ) : <Navigate to="/login" replace />
        }>
<Route path="/patient-portal" element={<RoleGuard user={user} allowedRoles={['patient']}><PatientDashboard currentUser={user} appointments={appointments} prescriptions={prescriptions} labOrders={labOrders} labReports={labReports} invoices={invoices} staff={staff} labTestPrices={labTestPrices} onBookAppointment={handleBookAppointment} onClearDues={handleClearDepartmentDues} onPayOnline={(id) => executePayment(id)} onLogout={handleLogout} onConfirmApt={handlePatientConfirmApt} onRescheduleApt={handlePatientRescheduleApt} onPrintInvoice={(doc) => setPrintDoc({ type: 'INV', data: doc })} onPrintRx={(doc) => setPrintDoc({ type: 'RX', data: doc })} onPrintLab={(doc) => setPrintDoc({ type: 'LAB', data: doc })} onSendMessage={handleSendNotification} notifications={visibleNotifs} onDismissNotification={handleDismissNotification} onCompleteApt={handleCompleteApt} getDynamicStatus={getDynamicStatus} /></RoleGuard>} />
          <Route path="/admin-dashboard" element={<RoleGuard user={user} allowedRoles={['admin', 'receptionist']}><Overview user={user} patientCount={patients.length} appointments={appointments} pendingPrescriptionsCount={pendingRxCount} totalRevenue={invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0)} onOpenModal={() => setIsPatientModalOpen(true)} prescriptions={prescriptions} labOrders={labOrders} invoices={invoices} inventory={inventory} /></RoleGuard>} />
          <Route path="/patients" element={<RoleGuard user={user} allowedRoles={['admin', 'doctor', 'receptionist', 'laboratorist', 'billing', 'pharmacist']}><PatientsDirectory user={user} patients={patients} appointments={appointments} onOpenModal={() => setIsPatientModalOpen(true)} onViewPatient={(p) => setViewPatient(p)} onDeletePatient={handleDeletePatient} /></RoleGuard>} />
          
        <Route path="/appointments" element={<RoleGuard user={user} allowedRoles={['admin', 'receptionist', 'doctor']}><AppointmentsModule currentUser={user} appointments={appointments} onOpenBookingModal={() => setIsBookingModalOpen(true)} onApproveWebRequest={handleApproveWebRequest} onOpenEditApt={(apt) => setEditingApt(apt)} onDeleteApt={handleDeleteAppointment} onCheckIn={handleCheckInPatient} onComplete={handleCompleteApt} getDynamicStatus={getDynamicStatus} /></RoleGuard>} />          
         <Route path="/prescriptions" element={<RoleGuard user={user} allowedRoles={['admin', 'doctor', 'pharmacist']}><PrescriptionsModule currentUser={user} patients={patients} appointments={appointments} prescriptions={prescriptions} getDynamicStatus={getDynamicStatus} onSavePrescription={handleSavePrescription} onDischarge={handleDischargePatient} /></RoleGuard>} />          
          <Route path="/lab-results" element={<RoleGuard user={user} allowedRoles={['admin', 'doctor']}><DoctorLabResults patients={patients} labReports={labReports} /></RoleGuard>} />
          <Route path="/pharmacy" element={<RoleGuard user={user} allowedRoles={['admin', 'pharmacist']}><PharmacyModule prescriptions={prescriptions} inventory={inventory} invoices={invoices} onOpenStockModal={() => setIsStockModalOpen(true)} onOpenFulfillModal={(rx) => setFulfillRx(rx)} onOpenEditStockModal={(item) => setEditingStock(item)} /></RoleGuard>} />
          <Route path="/laboratory" element={
              <RoleGuard user={user} allowedRoles={['admin', 'laboratorist', 'doctor']}>
                {user?.role?.toLowerCase() === 'doctor' ? (
                  <DoctorLabResults patients={patients} labReports={labReports} />
                ) : (
                  <LaboratoryModule patients={patients} labOrders={labOrders} labReports={labReports} invoices={invoices} onSaveLabReport={handleSaveLabReport} />
                )}
              </RoleGuard>
          } />
        <Route path="/billing" element={<RoleGuard user={user} allowedRoles={['admin', 'receptionist', 'billing']}><BillingModule invoices={invoices} prescriptions={prescriptions} labOrders={labOrders} patients={patients} onClearDues={handleClearDepartmentDues} onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)} labTestPrices={labTestPrices} /></RoleGuard>} />          
          <Route path="/staff" element={<RoleGuard user={user} allowedRoles={['admin']}><StaffModule staff={staff} onOpenStaffModal={() => setIsStaffModalOpen(true)} onOpenEditModal={(member) => setEditingStaff(member)} onDeleteStaff={handleDeleteStaff} /></RoleGuard>} />
        </Route>
      </Routes>

      {/* Global Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} onSendTicket={handleAdminTicket} />        
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} onSendTicket={handleAdminTicket} />
      <RegisterPatientModal isOpen={isPatientModalOpen} onClose={() => setIsPatientModalOpen(false)} onSubmit={handleAddPatient} nextId={nextPatientId} />
      <BookAppointmentModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} onSubmit={handleBookAppointment} patients={patients} staff={staff} appointments={appointments} />   
      <EditAppointmentModal isOpen={!!editingApt} onClose={() => setEditingApt(null)} appointment={editingApt} staff={staff} onSubmit={handleUpdateAppointment} />     
      <AddStockModal isOpen={isStockModalOpen} onClose={() => setIsStockModalOpen(false)} onSubmit={handleAddStock} />
      <CreateInvoiceModal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} onSubmit={handleCreateInvoice} patients={patients} prescriptions={prescriptions} labOrders={labOrders} labTestPrices={labTestPrices} invoices={invoices} inventory={inventory} />     
      <EditStockModal isOpen={!!editingStock} onClose={() => setEditingStock(null)} stockItem={editingStock} onSubmit={handleUpdateStock} />
      <ViewPatientModal user={user} patient={viewPatient} onClose={() => setViewPatient(null)} prescriptions={prescriptions} labReports={labReports} invoices={invoices} />
      <FulfillPrescriptionModal isOpen={!!fulfillRx} onClose={() => setFulfillRx(null)} prescription={fulfillRx} inventory={inventory} onSubmit={executeFulfillPrescription} />
      <ProcessPaymentModal isOpen={!!payInvoice} onClose={() => setPayInvoice(null)} invoice={payInvoice} onConfirmPayment={executePayment} />
      <AddStaffModal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} onSubmit={handleAddStaff} />
      <EditStaffModal isOpen={!!editingStaff} onClose={() => setEditingStaff(null)} member={editingStaff} onSubmit={handleUpdateStaff} />

      {/* Print Overlays Rendered at Global Level */}
      {printDoc?.type === 'INV' && <PrintInvoice invoice={printDoc.data} onClose={() => setPrintDoc(null)} />}
      {printDoc?.type === 'RX' && <PrintPrescription prescription={printDoc.data} onClose={() => setPrintDoc(null)} />}
      {printDoc?.type === 'LAB' && <PrintLabReport labReport={printDoc.data} onClose={() => setPrintDoc(null)} />}
    </Router>
  );
}
