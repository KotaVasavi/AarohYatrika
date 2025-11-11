import React, { createContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [auth, setAuth] = useState(() => {
    const storedUser = localStorage.getItem('saferideUser');
    try {
      return storedUser ? JSON.parse(storedUser) : {};
    } catch (error) {
      console.error("Failed to parse auth from localStorage", error);
      return {};
    }
  });

  const login = (userData) => {
    // 1. Save the user data to localStorage
    localStorage.setItem('saferideUser', JSON.stringify(userData));
    // 2. Save the user data to the React state
    setAuth(userData);
  };

  // --- FIX 3: LOGOUT FUNCTION ---
  // The logout function must also clear localStorage
  const logout = () => {
    // 1. Clear from localStorage
    localStorage.removeItem('saferideUser');
    // 2. Clear from state
    setAuth({});
    // 3. Redirect to login (this is fine)
    window.location.href = '/login'; 
  };

  // We pass 'login' as the value for 'setAuth'
  return (
    <AuthContext.Provider value={{ auth, setAuth: login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;