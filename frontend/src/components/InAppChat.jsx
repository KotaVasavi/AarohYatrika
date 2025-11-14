import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx'; 
import { useAuth } from '../hooks/useAuth.js';

// We add `= []` as a default prop to prevent crashes
const InAppChat = ({ rideId, messages = [] }) => {
  const [newMessage, setNewMessage] = useState('');
  const socket = useSocket();
  const { auth } = useAuth();
  const chatEndRef = useRef(null);

  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      sender: auth.role,
      text: newMessage,
    };

    socket.emit('sendMessage', { rideId, message });
    setNewMessage('');
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`chat-bubble ${msg.sender === auth.role ? 'me' : 'other'}`}
          >
            <p>{msg.text}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="chat-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit" className="btn btn-primary">Send</button>
      </form>
    </div>
  );
};

export default InAppChat;