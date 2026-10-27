import React, { useState, useMemo } from 'react';
import { Calendar, Clock, Receipt, Pill, FlaskConical, Download, Activity, LogOut, CheckCircle, Plus, X, Send, Bell } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function PatientDashboard({ 
  currentUser, appointments, prescriptions, labOrders, invoices, labReports = [],
  labTestPrices = {}, staff = [], onBookAppointment, onClearDues, onPayOnline, 
  onPrintInvoice, onPrintLab, onPrintRx, 
  onLogout, onConfirmApt, onRescheduleApt, onSendMessage,
  notifications = [], onDismissNotification, onCompleteApt, getDynamicStatus // <-- Add this here
}) {
  // ... rest of your code
  // --- WHATSAPP REDIRECT ENGINE ---
  // Initializes tab based on WhatsApp deep link if it exists
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('carepoint_redirect_tab');
    if (savedTab) {
      localStorage.removeItem('carepoint_redirect_tab'); // Clear it after reading
      return savedTab;
    }
    return 'status'; // Default tab
  });
// NEW: Contact Modal State
  const [isContactOpen, setIsContactOpen] = useState(false);
const [showNotifs, setShowNotifs] = useState(false);
// NEW: Auto-popup dropdown when new message arrives
  const prevCountRef = React.useRef(notifications?.length || 0);

  React.useEffect(() => {
    const currentCount = notifications?.length || 0;
    if (currentCount > prevCountRef.current) {
      setShowNotifs(true);
      const timer = setTimeout(() => setShowNotifs(false), 6000);
      prevCountRef.current = currentCount;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = currentCount;
  }, [notifications]);
  const [contactMsg, setContactMsg] = useState('');

  // NEW: Submit Handler for Patient Messages
  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactMsg.trim()) return;
    
    // Sends the message directly to the Admin/Reception desk
    onSendMessage('ADMIN_RECEPTION', contactMsg, { name: currentUser.name, role: 'Patient' });
    
    setIsContactOpen(false);
    setContactMsg('');
  };
  // Modal State for Patient Booking
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({ 
    doctorId: '', 
    doctorName: '', 
    time: '', 
    reason: '',
    bloodGroup: currentUser?.bloodGroup && currentUser.bloodGroup !== 'Not specified' ? currentUser.bloodGroup : 'O+' // Default to O+ if unknown
  });

  const availableDoctors = staff.filter(s => s.role.toLowerCase() === 'doctor');

  // --- DATA FILTERING FOR THIS PATIENT ---
  const myAppointments = appointments?.filter(a => a.patientId === currentUser?.id) || [];
  const myPrescriptions = prescriptions?.filter(rx => rx.patientId === currentUser?.id) || [];
  const myLabOrders = labOrders?.filter(lab => lab.patientId === currentUser?.id) || [];
  const myLabReports = labReports?.filter(lab => lab.patientId === currentUser?.id) || [];
  const myInvoices = invoices?.filter(inv => inv.patientId === currentUser?.id) || [];

  // Active / Pending Items
  const pendingRxs = myPrescriptions.filter(rx => rx.status === 'PENDING');
  const pendingLabs = myLabOrders.filter(lab => lab.status === 'PENDING');
  const activeAppointments = myAppointments.filter(a => a.status !== 'Completed');

  // History Items
  const paidInvoices = myInvoices.filter(inv => inv.status === 'PAID');
  const pastPrescriptions = myPrescriptions.filter(rx => rx.status === 'PAID' || rx.status === 'FULFILLED');
  const pastLabReports = myLabReports.filter(lab => lab.status === 'COMPLETED');

  // NEW: Smart Dues Checker
  const hasPendingDues = pendingRxs.length > 0 || pendingLabs.length > 0 || myInvoices.some(inv => inv.status === 'PENDING');

  // --- SMART HEALTH TREND ANALYTICS ---
  const hbTrendData = useMemo(() => {
    return [...pastLabReports]
      .filter(lab => lab.testName === 'CBC')
      .map(lab => {
        const match = lab.result?.match(/Hb:\s*([\d.]+)/);
        return {
          date: lab.reported ? lab.reported.substring(0, 6) : 'Unknown',
          hb: match ? parseFloat(match[1]) : null
        };
      })
      .filter(item => item.hb !== null)
      .reverse();
  }, [pastLabReports]);

  // Payment Handler Simulation
  const handleOnlinePayment = (type, id, amount) => {
    if (window.confirm(`Proceed to secure payment gateway to pay ₹${amount} + 18% GST?`)) {
      onClearDues(currentUser.id, type, id, amount);
    }
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!bookingForm.doctorId) { toast.error('Please select a doctor.'); return; }
    
    const d = bookingForm.time ? new Date(bookingForm.time) : new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const timeDisplay = bookingForm.time ? new Date(bookingForm.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '10:00';

    const newApt = {
      id: `APT-${Math.floor(Math.random() * 10000)}`,
      patientId: currentUser.id,
      patientName: currentUser.name,
      doctorId: bookingForm.doctorId,
      doctorName: bookingForm.doctorName,
      date: localDate,
      time: timeDisplay,
      reason: bookingForm.reason || 'General Consultation',
      bloodGroup: bookingForm.bloodGroup
    };

    // Triggers booking flow (logs ₹590 fee & alerts receptionist in Appointments dashboard)
    onBookAppointment(newApt, true);
    setIsBookingOpen(false);
    setBookingForm({ doctorId: '', doctorName: '', time: '', reason: '', bloodGroup: 'O+' });
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 font-sans">
      
      {/* DESKTOP/MOBILE FLUID HEADER */}
      <div className="bg-[#4355B9] pt-10 pb-8 px-6 relative md:pt-14 md:pb-12 shadow-md border-b border-indigo-700">
        <div className="max-w-7xl mx-auto flex justify-between items-end relative">
         <div>
            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Patient Portal</p>
            <h1 className="text-3xl md:text-5xl font-bold text-white capitalize tracking-tight">{currentUser?.name}</h1>
            <div className="flex items-center gap-1 text-indigo-100 text-sm mt-2 md:text-base bg-white/10 px-3 py-1 rounded-full inline-flex">
              <Activity size={14} /> Official ID: {currentUser?.id}
            </div>
          </div>
          <div className="flex gap-3 items-center">
            {/* NEW: Patient Notification Bell */}
            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition cursor-pointer shadow-inner relative">
                <Bell size={20} />
                {notifications.length > 0 && <span className="absolute top-2 right-2 md:top-3 md:right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#4355B9]"></span>}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-[100] animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Bell size={16} className="text-indigo-600"/> My Notifications</h3>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{notifications.length} New</span>
                  </div>
                  
                  {notifications.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {notifications.map((notif) => (
                        <div key={notif.id} onClick={() => onDismissNotification && onDismissNotification(notif.id)} className="p-3 bg-gray-50 hover:bg-indigo-50/50 rounded-xl border border-gray-100 transition-colors cursor-pointer group">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-bold text-gray-900 group-hover:text-indigo-600">{notif.title}</p>
                            <span className="text-[9px] text-gray-400">{notif.time}</span>
                          </div>
                          {notif.sender && <p className="text-[10px] font-bold text-indigo-600 mb-1">From: {notif.sender.name} ({notif.sender.role})</p>}
                          <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                          <p className="text-[9px] font-bold text-indigo-600 mt-1.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">Click to dismiss ✓</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-6">You have no new messages.</p>
                  )}
                </div>
              )}
            </div>

{/* Contact Desk Button */}
            <button onClick={() => setIsContactOpen(true)} className="px-4 py-2 bg-white/20 text-white text-xs md:text-sm font-bold rounded-xl hover:bg-white/30 transition cursor-pointer shadow-inner flex items-center gap-2">
              <Send size={16} /> Contact Desk
            </button>
            <button onClick={onLogout} className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition cursor-pointer shadow-inner">
              <LogOut size={20} className="ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* NEW: PATIENT CONTACT MODAL */}           
      {isContactOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsContactOpen(false)} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"><X size={16} /></button>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Hospital Support</h3>
            <p className="text-sm text-gray-500 mb-6">Send an issue report or request directly to the Reception/Administration desk.</p>
            <form onSubmit={handleContactSubmit}>
              <textarea value={contactMsg} onChange={e => setContactMsg(e.target.value)} rows="4" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none resize-none mb-4 focus:border-indigo-500" placeholder="Describe your issue or request here..." required />
              <button type="submit" className="w-full bg-[#4355B9] text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-indigo-700 transition cursor-pointer">Submit Request</button>
            </form>
          </div>
        </div>
      )}
      {/* DUAL-LOGIC WIDE CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-6 md:-mt-8 relative z-10">
        
        {/* WIDE TABS */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 flex p-1 mb-8">
          <button onClick={() => setActiveTab('status')} className={`flex-1 py-3 md:py-4 md:text-lg text-sm font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'status' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}>
            Active Status & Dues
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 md:py-4 md:text-lg text-sm font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-700 flex items-center justify-center gap-2'}`}>
            <Clock size={18} className="md:w-5 md:h-5" /> Medical History
          </button>
        </div>

        {/* ========================================= */}
        {/* TAB 1: ACTIVE STATUS (GRID ON DESKTOP)    */}
        {/* ========================================= */}
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* COLUMN 1: PENDING DUES */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2 md:text-sm">Pending Actionable Dues</h3>
              
              {pendingRxs.length === 0 && pendingLabs.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
                  <CheckCircle className="mx-auto text-emerald-400 mb-3" size={32} />
                  <p className="text-gray-500 text-sm font-medium">You have no pending payments.</p>
                </div>
              )}

              {pendingRxs.map(rx => (
                <div key={rx.id} className="bg-white border-2 border-amber-200 rounded-2xl p-6 mb-4 shadow-sm relative overflow-hidden transition hover:shadow-md">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-amber-700 font-bold mb-1 text-lg">
                        <Pill size={18} /> Pharmacy Order
                      </div>
                      <p className="text-xs text-gray-500">Order Ref: {rx.id}</p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-md">UNPAID</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {rx.medications?.length || 0} medications prescribed. Pay online to forward to pharmacy desk.
                  </p>
                  <button onClick={() => handleOnlinePayment('rx', rx.id, 350)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition shadow-sm cursor-pointer md:text-lg">
                    Pay ₹350 + GST Online
                  </button>
                </div>
              ))}

              {pendingLabs.map(lab => {
                const cost = labTestPrices?.[lab.testName] || 500;
                return (
                  <div key={lab.id} className="bg-white border-2 border-purple-200 rounded-2xl p-6 mb-4 shadow-sm relative overflow-hidden transition hover:shadow-md">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-400"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 text-purple-700 font-bold mb-1 text-lg">
                          <FlaskConical size={18} /> Lab Test: {lab.testName}
                        </div>
                        <p className="text-xs text-gray-500">Order Ref: {lab.id}</p>
                      </div>
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-1 rounded-md">UNPAID</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      Lab test assigned. Pay online to unlock processing at diagnostics desk.
                    </p>
                    <button onClick={() => handleOnlinePayment('lab', lab.id, cost)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition shadow-sm cursor-pointer md:text-lg">
                      Pay ₹{cost} + GST Online
                    </button>
                  </div>
                )
              })}
            </div>

            {/* COLUMN 2: ACTIVE APPOINTMENTS & BOOKING BUTTON */}
            <div>
              <div className="flex justify-between items-center mb-3 px-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest md:text-sm">Upcoming Appointments</h3>
                <button onClick={() => setIsBookingOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer">
                  <Plus size={14} /> Book Appointment
                </button>
              </div>
              
              {activeAppointments.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
                  <Calendar className="mx-auto text-gray-300 mb-3" size={32} />
                  <p className="text-gray-500 text-sm font-medium">No active appointments scheduled.</p>
                </div>
              ) : (
			activeAppointments.map(apt => {
                  const statusInfo = getDynamicStatus ? getDynamicStatus(apt) : { text: apt.status, color: 'bg-blue-50 text-blue-600' };
                  
                  return (
                  <div key={apt.id} className="bg-white border border-gray-200 rounded-2xl p-6 mb-4 shadow-sm transition hover:shadow-md">
                    <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                      <div>
                        <p className="font-bold text-gray-900 text-xl">{apt.date}</p>
                        <p className="text-indigo-600 font-bold text-lg">{apt.time}</p>
                      </div>
                      <span className={`text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-md ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">Dr</div>
                      <div>
                        <p className="font-bold text-gray-900 text-base">Dr. {apt.doctorName || apt.doctor}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Reason: {apt.reason}</p>
                      </div>
                    </div>

                    {/* Receptionist Negotiation Actions */}
                    {statusInfo.text === 'Waiting on Patient' && (
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mt-2">
                        <p className="text-xs md:text-sm font-bold text-blue-800 mb-3">Receptionist suggested this time. Do you accept?</p>
                        <div className="flex gap-2">
                          <button onClick={() => onConfirmApt(apt.id)} className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-lg text-xs md:text-sm hover:bg-blue-700 transition cursor-pointer">
                            Accept Time
                          </button>
                          <button onClick={() => {
                            const newTime = prompt("Enter a new time (e.g., '14:30'):");
                            if(newTime) onRescheduleApt(apt.id, { time: newTime });
                          }} className="flex-1 bg-white text-blue-600 border border-blue-200 font-bold py-2.5 rounded-lg text-xs md:text-sm hover:bg-blue-50 transition cursor-pointer">
                            Suggest New
                          </button>
                        </div>
                      </div>
                    )}                
{/* Patient Mark Complete Button */}
                    {statusInfo.text === 'Waiting for Doctor' && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button 
                          onClick={() => {
                            if (hasPendingDues) {
                              toast.error("Action denied: You have pending department dues. Please clear them first.");
                            } else if (window.confirm("Are you sure you want to mark this visit as completed?")) {
                              onCompleteApt(apt.id);
                            }
                          }}
                          className={`w-full py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                            hasPendingDues 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm'
                          }`}
                        >
                          <CheckCircle size={18} /> Mark Visit Complete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
        {/* ========================================= */}
        {/* TAB 2: MEDICAL HISTORY (GRID ON DESKTOP)  */}
{/* ========================================= */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10">
            
            {/* INVOICES SECTION */}
            <div className="mb-10">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2 md:text-sm border-b border-gray-200 pb-2">Past Billing Receipts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paidInvoices.length === 0 ? (
                  <p className="text-sm text-gray-400 px-2 italic">No past receipts.</p>
                ) : (
                  paidInvoices.map(inv => (
                    <div key={inv.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between h-full">
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 font-medium mb-1">{new Date(inv.date).toLocaleDateString('en-GB')}</p>
                        <p className="font-bold text-gray-900 text-lg">{inv.id}</p>
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded mt-1 inline-block">PAID</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-auto">
                        <p className="font-black text-gray-900 text-xl">₹{inv.totalAmount}</p>
                        <button onClick={() => onPrintInvoice(inv)} className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition cursor-pointer">
                          <Download size={14} /> PDF
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PRESCRIPTIONS SECTION */}
            <div className="mb-10">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2 md:text-sm border-b border-gray-200 pb-2">Past Prescriptions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastPrescriptions.length === 0 ? (
                  <p className="text-sm text-gray-400 px-2 italic">No past prescriptions.</p>
                ) : (
                  pastPrescriptions.map(rx => (
                    <div key={rx.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between h-full">
                      <div className="mb-4">
                        <p className="font-bold text-gray-900 flex items-center gap-2 mb-1"><Pill size={16} className="text-indigo-500" /> Dr. {rx.doctorName || 'Assigned Doctor'}</p>
                        <p className="text-xs text-gray-500">Ref: {rx.id}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4 flex-1">
                        <p className="text-sm text-gray-600 font-medium line-clamp-3">{rx.medications?.map(m=>m.name).join(', ')}</p>
                      </div>
                      <div className="flex justify-end border-t border-gray-100 pt-4 mt-auto">
                        <button onClick={() => onPrintRx(rx)} className="w-full justify-center flex items-center gap-1.5 text-sm text-indigo-600 font-bold bg-indigo-50 px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition cursor-pointer">
                          <Download size={16} /> Download Official Rx
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* HEALTH TRENDS GRAPH */}
            {hbTrendData.length > 0 && (
              <div className="mb-10">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2 md:text-sm border-b border-gray-200 pb-2">Health Trends: Hemoglobin (Hb)</h3>
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-64 hover:shadow-md transition">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hbTrendData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                      <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="hb" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} name="Hb (g/dL)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* LAB REPORTS SECTION */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2 md:text-sm border-b border-gray-200 pb-2">Diagnostic Lab Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastLabReports.length === 0 ? (
                  <p className="text-sm text-gray-400 px-2 italic">No past lab reports available.</p>
                ) : (
                  pastLabReports.map(lab => (
                    <div key={lab.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between h-full">
                      <div className="mb-4">
                        <p className="font-bold text-gray-900 flex items-center gap-2 text-lg mb-1"><FlaskConical size={18} className="text-purple-500" /> {lab.testName} Analysis</p>
                        <p className="text-xs text-gray-500">Reported: {lab.reported}</p>
                      </div>
                      <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 mb-4 flex-1">
                        <p className="text-xs font-medium text-purple-800">Verified by Diagnostic Laboratory.</p>
                      </div>
                      <div className="flex justify-end border-t border-gray-100 pt-4 mt-auto">
                        <button onClick={() => onPrintLab(lab)} className="w-full justify-center flex items-center gap-1.5 text-sm text-indigo-600 font-bold bg-indigo-50 px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition cursor-pointer">
                          <Download size={16} /> Download Results
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* PATIENT BOOKING MODAL */}
      {isBookingOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-8 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsBookingOpen(false)} className="absolute top-6 right-6 w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition cursor-pointer"><X size={16} /></button>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Book New Appointment</h3>
            <p className="text-xs text-gray-500 mb-6">Nominal consultation booking fee: ₹590 (Inclusive of 18% GST)</p>
            <form onSubmit={handleBookingSubmit}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Doctor</label>
                  <select 
                    value={bookingForm.doctorId} 
                    onChange={e => {
                      const doc = availableDoctors.find(d => d.username === e.target.value);
                      setBookingForm({...bookingForm, doctorId: doc?.username || '', doctorName: doc?.name || doc?.username || ''});
                    }} 
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" required
                  >
                    <option value="" disabled>Select specialist...</option>
                    {availableDoctors.map(doc => (
                      <option key={doc.username} value={doc.username}>
                        {doc.name || doc.username} - {doc.specialty || 'General Physician'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Preferred Date & Time</label>
                    <input type="datetime-local" value={bookingForm.time} onChange={e => setBookingForm({...bookingForm, time: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm focus:border-indigo-500" required />
                  </div>
                  <div>
                    {/* NEW: Blood Group Selector */}
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Blood Group</label>
                    <select value={bookingForm.bloodGroup} onChange={e => setBookingForm({...bookingForm, bloodGroup: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm bg-white focus:border-indigo-500" required>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="Unknown">Don't Know</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reason for Visit</label>
                  <input type="text" value={bookingForm.reason} onChange={e => setBookingForm({...bookingForm, reason: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none text-sm placeholder:text-gray-400 focus:border-indigo-500" placeholder="e.g. Fever, Checkup" required />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsBookingOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition cursor-pointer">Pay ₹590 & Request Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}