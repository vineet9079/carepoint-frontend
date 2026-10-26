import React, { useState, useRef, useEffect } from 'react';

export default function Chatbot({ hospitalStats, userRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: `Hello ${userRole || 'System Administrator'}! I am your real-time hospital assistant. How can I help you?` }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setInputMessage('');
    
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setIsTyping(true);

    try {
      // 1. Grab the secure JWT token from local storage
      const token = localStorage.getItem('token');

      const response = await fetch('https://carepoint-services.onrender.com/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // 2. Attach the token to authorize the request
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          message: userText,
          context: hospitalStats || { patientCount: 0, pendingRx: 0, lowStock: 0 },
          userRole: userRole || 'Admin'
        })
      });

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev, 
        { sender: 'ai', text: data.reply || data.error || 'Error: Empty response received.' }
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Network error: Cannot reach the backend server.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-105"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div className="w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300">
          <div className="bg-indigo-600 text-white px-4 py-3 flex justify-between items-center shadow-md">
            <div>
              <h3 className="font-semibold text-lg">CarePoint AI Analyst</h3>
              <p className="text-xs text-indigo-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Analyzing Real-Time Data
              </p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white text-xl font-bold px-2">
              &times;
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-500 border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-1.5">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-xs ml-2 italic text-gray-400">Analyzing live records...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything about hospital data..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button type="submit" disabled={isTyping} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white p-2.5 rounded-xl transition flex items-center justify-center shadow">
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}