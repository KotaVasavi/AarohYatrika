import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js'; // You can use .js here

/**
 * @param {{ role: 'rider' | 'driver' | undefined }} props
 * role: Optional. If provided, the user must have this role to access the route.
 */
const ProtectedRoute = ({ role }) => {
  const { auth } = useAuth();

  // --- THIS IS THE FIX ---
  // We only need to check for the token.
  // The 'auth' object itself contains the token, it's not nested.
  if (!auth.token) {
    // User is not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // 2. Check if a specific role is required
  if (role && auth.role !== role) {
    // User has the wrong role, redirect them to their own dashboard
    const homeDashboard = auth.role === 'driver' ? '/driver' : '/rider';
    return <Navigate to={homeDashboard} replace />;
  }

  // 3. User is logged in and has the correct role
  return <Outlet />;
};

export default ProtectedRoute;