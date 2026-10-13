import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Loader2, X } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL;

export default function OrderChat({ orderId, currentUserRole, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const containerRef = useRef(null);

  const fetchMessages = () => {
    fetch(`${API}/shared/get_messages.php?order_id=${orderId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setMessages(data.data || []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Polling every 5 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`${API}/shared/send_message.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ order_id: orderId, message: input })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setInput('');
        fetchMessages();
      }
    } catch (e) {
      console.error('Failed to send message', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col z-[100] animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-100" />
          <div>
            <h3 className="font-bold text-sm">Order #{String(orderId).padStart(6, '0')} Chat</h3>
            <p className="text-xs text-blue-200">{currentUserRole === 'patient' ? 'Chat with Pharmacist' : 'Chat with Patient'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 p-4 h-80 overflow-y-auto bg-gray-50 flex flex-col gap-3 scroll-smooth">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-blue-500 spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full flex-col text-gray-400">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs">Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            // Note: DB returns sender_role as 'patient' or 'pharmacist'
            const isMine = m.sender_role === currentUserRole;
            return (
              <div key={m.message_id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                  <p className="text-sm break-words">{m.message}</p>
                  <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
        >
          {sending ? <Loader2 className="w-4 h-4 spin" /> : <Send className="w-4 h-4 ml-0.5" />}
        </button>
      </form>
    </div>
  );
}
