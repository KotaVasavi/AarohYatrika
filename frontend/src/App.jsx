import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';

// Import Components
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Import Pages
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import RiderDashboard from './pages/RiderDashboard.jsx';
// --- THIS IS THE CORRECTED LINE ---
import DriverDashboard from './pages/DriverDashboard.jsx'; 
import RideHistoryPage from './pages/RideHistoryPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

// --- Navbar Component ---
const Navbar = () => {
  const { auth, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          AarohYatrika
        </Link>
        <div className="navbar-links">
          {auth.token ? (
            // --- Logged In Links ---
            <>
              <Link to="/">Home</Link>
              
              {auth.role === 'rider' && (
                <Link to="/rider">Ride Now</Link>
              )}
              
              {auth.role === 'driver' && (
                <Link to="/driver">My Dashboard</Link>
              )}

              <Link to="/history">My Rides</Link>
              <Link to="/profile">Profile</Link>
              <button onClick={logout} className="btn-logout">
                Logout
              </button>
            </>
          ) : (
            // --- Logged Out Links ---
            <>
              <Link to="/">Home</Link>
              <Link to="/login">Login</Link>
              <Link to="/register" className="btn-register">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// --- Main App Component (Stays the same) ---
function App() {
  return (
    <Router>
      <Navbar />
      <main>
        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* --- Protected Routes (All Users) --- */}
          <Route element={<ProtectedRoute />}>
            <Route path="/history" element={<RideHistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* --- Protected Routes (Riders Only) --- */}
          <Route element={<ProtectedRoute role="rider" />}>
            <Route path="/rider" element={<RiderDashboard />} />
          </Route>

          {/* --- Protected Routes (Drivers Only) --- */}
          <Route element={<ProtectedRoute role="driver" />}>
            <Route path="/driver" element={<DriverDashboard />} />
          </Route>
        </Routes>
      </main>
    </Router>
  );
}

export default App;