import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../hooks/useAuth.js'; 

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { auth } = useAuth();

  useEffect(() => {
    if (auth && auth._id) {
      const newSocket = io('http://localhost:5001'); 
      setSocket(newSocket);

      // 2. REGISTER THE USER (This is the critical missing step)
      newSocket.on('connect', () => {
        console.log("Socket connected:", newSocket.id);
        console.log("Registering user ID:", auth._id);
        newSocket.emit('registerUser', auth._id);
      });

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [auth]); 

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};