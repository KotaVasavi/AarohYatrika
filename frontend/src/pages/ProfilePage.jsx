import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import Loader from '../components/Loader';
const API = import.meta.env.VITE_API_URL;
const ProfilePage = () => {
  const { auth, setAuth, logout } = useAuth();
  
  // State for form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // State for user data
  const [user, setUser] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${auth.token}` },
        };
        const { data } = await axios.get(`${API}/api/users/profile`, config);
        setUser(data);
        setName(data.name);
        setEmail(data.email);
        setProfilePhoto(data.profilePhoto);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [auth.token]);
    
  const handleDeletePhoto = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;

    try {
      setLoading(true);
      const config = {
        headers: { Authorization: `Bearer ${auth.token}` },
      };

      // Send null to the backend to clear the value
      const { data } = await axios.put(`${API}/api/users/profile`, { profilePhoto: null }, config);

      // 1. Update Global Auth State (so the navbar updates instantly)
      const newAuthData = { 
        token: auth.token, 
        ...data            
      };
      setAuth(newAuthData);
      
      // 2. Update Local Storage
      localStorage.setItem('userInfo', JSON.stringify(newAuthData));

      // 3. Update Local Component State
      setUser(data);       // Updates the big profile image
      setProfilePhoto(''); // Clears the input field text
      setSuccess('Profile photo removed successfully!');

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove photo');
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const config = {
        headers: { Authorization: `Bearer ${auth.token}` },
      };
      
      const updateData = { name, email, profilePhoto };
      if (password) {
        updateData.password = password;
      }

      const { data } = await axios.put(`${API}/api/users/profile`, updateData, config);
      const newAuthData = { 
        token: auth.token, 
        ...data            
      };
      
    
      setAuth(newAuthData);
      
      localStorage.setItem('userInfo', JSON.stringify(newAuthData));
      // setAuth({ ...auth, user: { ...auth.user, ...data } });
      // setUser(data);
      setSuccess('Profile updated successfully!');
      setPassword('');
      setConfirmPassword('');

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) return <Loader />;
  if (error && !user) return <p className="error-message">{error}</p>;

  return (
    <div className="container profile-container">
      {user && (
        <div className="profile-header">
          <img 
            src={auth.profilePhoto || '/images/default.jpg'} 
            alt="Profile" 
            className="profile-avatar"
            onError={(e) => { e.target.src = '/images/default.jpg'; }}
          />
          
          
          <h2>{user.name}</h2>
          <p>{user.role}</p>
          <div className="profile-stats">
            <div>
              <span>{user.averageRating} ★</span>
              <p>Rating</p>
            </div>
            <div>
              <span>{user.totalRides}</span>
              <p>Total Rides</p>
            </div>
            <div>
              <span>{user.isVerified ? 'Yes' : 'No'}</span>
              <p>Verified</p>
            </div>
          </div>
        </div>
      )}

      <h3>Update Profile</h3>
      <form onSubmit={handleSubmit} className="profile-form">
        {loading && <Loader />}
        {error && <p className="error-message">{error}</p>}
        {success && <p className="message">{success}</p>}
        
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Profile Photo URL</label>
          <input
            type="text"
            value={profilePhoto}
            onChange={(e) => setProfilePhoto(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>New Password (Leave blank to keep current)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Update Profile
        </button>
      </form>
      
      <button onClick={logout} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
        Logout
      </button>
    </div>
  );
};

export default ProfilePage;