import React, { useState } from 'react';
import { Bot, X, Send, MessageCircle, LoaderCircle } from 'lucide-react';

export default function Chatbot({ hospitalStats, userRole }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hello. I’m the CarePoint assistant. How can I help with your hospital workflow?' }]);
  const [loading, setLoading] = useState(false);

  const send = async event => {
    event?.preventDefault();
    const value = message.trim();
    if (!value || loading) return;
    setMessages(current => [...current, { role: 'user', content: value }]);
    setMessage(''); setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://carepoint-services.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: value, hospitalStats, userRole })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || data?.error || 'The assistant could not respond.');
      const reply = data.reply || data.response || data.message || data.answer || 'I received your request, but no response text was returned.';
      setMessages(current => [...current, { role: 'assistant', content: String(reply) }]);
    } catch (error) {
      setMessages(current => [...current, { role: 'assistant', content: error.message || 'Unable to connect right now. Please try again.' }]);
    } finally { setLoading(false); }
  };

  return <>
    <button className="cp-chat-launcher" onClick={() => setOpen(value => !value)} aria-label={open ? 'Close assistant' : 'Open CarePoint assistant'}>
      {open ? <X size={21}/> : <MessageCircle size={21}/>}<span>{open ? 'Close' : 'CarePoint AI'}</span>
    </button>
    {open && <section className="cp-chat-panel" aria-label="CarePoint assistant">
      <header className="cp-chat-header"><div className="cp-chat-icon"><Bot size={19}/></div><div><strong>CarePoint Assistant</strong><span>Hospital workflow support</span></div><button onClick={() => setOpen(false)} aria-label="Close chat"><X size={18}/></button></header>
      <div className="cp-chat-messages">{messages.map((item, index) => <div key={index} className={`cp-chat-message ${item.role === 'user' ? 'from-user' : 'from-assistant'}`}>{item.content}</div>)}{loading && <div className="cp-chat-loading"><LoaderCircle size={15}/> Thinking…</div>}</div>
      <form className="cp-chat-form" onSubmit={send}><input value={message} onChange={event => setMessage(event.target.value)} placeholder="Ask CarePoint…" aria-label="Message"/><button type="submit" disabled={!message.trim() || loading} aria-label="Send message"><Send size={17}/></button></form>
    </section>}
  </>;
}
