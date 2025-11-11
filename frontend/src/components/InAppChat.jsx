import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../hooks/useAuth';

const InAppChat = ({ rideId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const socket = useSocket();
  const { auth } = useAuth();
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Join the private chat room for this ride
    socket.emit('joinChatRoom', rideId);

    // Listen for incoming messages
    socket.on('receiveMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off('receiveMessage');
    };
  }, [socket, rideId]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      sender: auth.role, // 'rider' or 'driver'
      text: newMessage,
    };

    // Send message to the server
    socket.emit('sendMessage', { rideId, message });
    
    // Add our own message to the list immediately
    setMessages((prev) => [...prev, message]);
    setNewMessage('');
  };

  return (
    <div className="chat-container">
      <h3>In-App Chat</h3>
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.sender === auth.user.role ? 'me' : 'other'}`}>
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