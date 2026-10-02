import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

export default function CarePointBot({ role }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showQuick, setShowQuick] = useState(true);
  const messagesEndRef = useRef(null);

  const botConfigs = {
    'admin': { welcome: "Hello Administrator! How can I help?", queries: ['stats', 'staff', 'help'], responses: { 'stats': "Check dashboard cards for live data.", 'staff': "Use the left sidebar to manage access.", 'help': "Ask about 'stats' or 'staff'." } },
    'reception': { welcome: "Hello Receptionist! Ready to manage the front desk?", queries: ['register patient', 'card', 'help'], responses: { 'register patient': "Fill out the form and click Register.", 'card': "ID cards print automatically.", 'help': "Ask about 'register patient' or 'card'." } },
    'doctor': { welcome: "Hello Doctor! Need help with your session?", queries: ['prescription', 'queue', 'help'], responses: { 'prescription': "Select a patient, add medicine, and click Save.", 'queue': "Your queue maps to scheduled appointments.", 'help': "Ask about 'prescription' or 'queue'." } },
    'pharmacist': { welcome: "Hello Pharmacist! Assisting with inventory.", queries: ['low stock', 'add stock', 'help'], responses: { 'low stock': "Low stock items highlight in red.", 'add stock': "Click '+ Add Stock' at the top right.", 'help': "Ask about 'low stock' or 'add stock'." } },
    'laboratorist': { welcome: "Hello Laboratorist! Ready to process diagnostics?", queries: ['panels', 'reports', 'help'], responses: { 'panels': "Select a panel to generate biomarker fields.", 'reports': "Click print next to any archived report.", 'help': "Ask about 'panels' or 'reports'." } },
    'billing': { welcome: "Hello Billing Officer! Need help with invoices?", queries: ['invoice', 'paid', 'help'], responses: { 'invoice': "Click '+ New Invoice' to itemize services.", 'paid': "Click 'Mark Paid' to clear open balances.", 'help': "Ask about 'invoice' or 'paid'." } }
  };

  const config = botConfigs[role || 'admin'] || botConfigs['admin'];

  useEffect(() => {
    setMessages([{ sender: 'bot', text: config.welcome }]);
  }, [role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = (queryText) => {
    const text = queryText || input;
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInput('');
    setShowQuick(false);

    setTimeout(() => {
      let reply = "Try selecting an option below.";
      const query = text.toLowerCase();
      for (const [key, value] of Object.entries(config.responses)) {
        if (query.includes(key)) {
          reply = value;
          break;
        }
      }
      setMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
      setShowQuick(true);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[340px] h-[480px] mb-4 flex flex-col overflow-hidden">
          <div className="bg-indigo-600 text-white p-3 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-indigo-600 text-lg">🤖</div>
              <div>
                <div className="font-bold text-sm">CarePoint Assistant</div>
                <div className="text-[10px] text-indigo-100 flex items-center"><span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>Online Now</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:bg-indigo-500 rounded p-1"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-3 bg-gray-50">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'items-start'}`}>
                {m.sender === 'bot' && <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs mr-2 font-bold">🤖</div>}
                <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[80%] ${m.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'}`}>
                  <span dangerouslySetInnerHTML={{ __html: m.text }}></span>
                </div>
              </div>
            ))}
            {showQuick && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {config.queries.map((q, i) => (
                  <button key={i} onClick={() => handleSend(q)} className="border border-indigo-300 text-indigo-600 px-3 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-indigo-50 capitalize transition shadow-xs">
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-100 bg-white flex items-center space-x-2">
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
              placeholder="Reply to Assistant..." 
              className="flex-1 outline-none text-xs text-gray-700 bg-gray-50 rounded-full px-4 py-2 border border-gray-200 focus:border-indigo-400 focus:bg-white transition" 
            />
            <button onClick={() => handleSend()} className="bg-indigo-600 hover:bg-indigo-700 text-white w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setIsOpen(!isOpen)} className="bg-indigo-600 hover:bg-indigo-700 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition transform hover:scale-105 cursor-pointer">
        <MessageSquare size={24} />
      </button>
    </div>
  );
}