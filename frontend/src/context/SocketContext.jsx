import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../hooks/useAuth.js';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { auth } = useAuth(); // auth is { _id, token, role, ... }

  useEffect(() => {
    // --- FIX 1: THE IF CHECK ---
    // We check for auth.token and auth._id (not auth.user)
    if (auth.token && auth._id) {
      // Connect to the socket server
      const newSocket = io('http://localhost:5001');

      // --- FIX 2: THE REGISTER EVENT ---
      // We emit auth._id (not auth.user._id)
      newSocket.emit('registerUser', auth._id);

      setSocket(newSocket);

      // Clean up on unmount
      return () => newSocket.close();
    } else {
      // If no user, disconnect
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [auth]); // This dependency array is correct

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};