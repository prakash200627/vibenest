import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { Send } from 'lucide-react';
import { API_URL, WS_URL } from '../constants/api';

export default function Chat() {
  const { user, token } = useContext(AuthContext);
  if (!user) return <div className="p-8 text-center text-gray-500">Loading Chat...</div>;
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const ws = useRef(null);
  const [readyState, setReadyState] = useState(0);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${API_URL}/chat/conversations`);
      setConversations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);
  
  // Connect to native WS
  useEffect(() => {
    if (!token) return;
    const socket = new WebSocket(`${WS_URL}?token=${token}`);
    ws.current = socket;

    socket.onopen = () => setReadyState(1);
    socket.onclose = () => setReadyState(3);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'error') {
        setError(data.message);
        // Remove the last optimistic message
        setMessages((prev) => prev.slice(0, -1));
      } else if (!data.type) {
        setMessages((prev) => [...prev, data]);
        fetchConversations(); // Update sidebar with last msg
      }
    };

    return () => {
      socket.close();
    };
  }, [token]);

  // Connect securely to history API
  useEffect(() => {
    setError(null);
    if (!receiverId || receiverId.trim() === '') {
      setMessages([]);
      return;
    }
    if (receiverId === user.username) {
      setError("Cannot chat with yourself.");
      setMessages([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/chat/history/${receiverId}`);
        setMessages(res.data);
      } catch (err) {
        setMessages([]);
        if (err.response && err.response.status === 404) {
          setError(`User '${receiverId}' not found.`);
        } else if (err.response && err.response.data && err.response.data.detail) {
          setError(err.response.data.detail);
        } else {
          setError("Failed to load chat history.");
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [receiverId, user.username]);

  const sendMessage = (msgStr) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(msgStr);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (inputVal.trim() === '' || !receiverId || error) return;
    
    // Optimistic UI update
    const newMsg = { sender_id: user.id, content: inputVal };
    setMessages((prev) => [...prev, newMsg]);

    sendMessage(JSON.stringify({
      receiver_username: receiverId,
      content: inputVal
    }));
    setInputVal('');
  };

  return (
    <div className="flex bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Sidebar for conversations */}
      <div className="w-1/3 border-r border-gray-100 dark:border-gray-700 flex flex-col bg-gray-50/50 dark:bg-gray-900/50">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-bold text-lg text-gray-800 dark:text-white">Messages</h2>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {/* New Chat Input */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-transparent hover:border-blue-100 dark:hover:border-blue-900 cursor-pointer transition mb-4">
            <label className="text-xs text-blue-500 font-semibold mb-1 block uppercase">Start New Chat</label>
            <input 
               type="text" 
               placeholder="Enter username..." 
               className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 dark:text-white outline-none focus:border-blue-400"
               value={receiverId}
               onChange={(e) => setReceiverId(e.target.value)}
            />
          </div>

          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Recent chats</p>
          {conversations.map((conv) => (
            <div 
              key={conv.id} 
              onClick={() => setReceiverId(conv.other_user.username)}
              className={`p-3 rounded-xl cursor-pointer transition-all ${
                receiverId === conv.other_user.username 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${receiverId === conv.other_user.username ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'}`}>
                  {conv.other_user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-sm leading-tight truncate">{conv.other_user.username}</p>
                  {conv.last_message && (
                    <p className={`text-xs truncate ${receiverId === conv.other_user.username ? 'text-blue-100' : 'text-gray-400'}`}>
                      {conv.last_message.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="text-center p-8 text-gray-400 text-xs italic">
              No conversations yet. Type a username above to start chatting!
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        {receiverId && !error ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 shadow-sm z-10 flex items-center justify-between">
               <h3 className="font-bold text-gray-800 dark:text-white">{`Chatting with ${receiverId}`}</h3>
               <div className={`w-2 h-2 rounded-full ${readyState === 1 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50">
              {messages.map((m, idx) => {
                const isMe = m.sender_id === user.id;
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-600 rounded-bl-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <form onSubmit={handleSend} className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full outline-none focus:bg-white dark:focus:bg-gray-600 dark:text-white border border-transparent focus:border-blue-400 transition"
                  placeholder="Type a message..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                />
                <button 
                   type="submit" 
                   disabled={!inputVal.trim()}
                   className="bg-blue-600 text-white p-2.5 rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                   <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/20 dark:bg-gray-900/20">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-300 text-3xl mb-4">
              💬
            </div>
            {error ? (
              <>
                <h3 className="text-xl font-bold text-red-500 mb-2">Wait a second!</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-xs">{error}</p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No conversation selected</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-xs">Select a user on the left or type a valid username to start chatting instantly.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
