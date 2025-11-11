import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('rider');
  const [verificationProof, setVerificationProof] = useState('');
  
  const [vehicleNumber, setVehicleNumber] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (role === 'driver' && !vehicleNumber) {
      setError('Please enter your vehicle number');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data } = await axios.post('/api/auth/register', {
        name,
        email,
        password,
        role,
        verificationProof,
        vehicleNumber,
      });

      // Save user to context and local storage
      setAuth(data);

      // Redirect to the correct dashboard
      if (data.role === 'driver') {
        navigate('/driver');
      } else {
        navigate('/rider');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container dashboard-container">
      <h2>Create Your SafeRide Account</h2>
      <form onSubmit={handleSubmit}>
        {error && <p className="error-message">{error}</p>}
        
        <div className="form-group">
          <label>Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>I am a...</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="rider">Rider</option>
            <option value="driver">Driver</option>
          </select>
        </div>
        
        {role === 'driver' && (
          <div className="form-group">
            <label>Vehicle Number (e.g., TS 09 1234)</label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="Enter your vehicle registration number"
              required
            />
          </div>
        )}
        
        <div className="form-group">
          <label>Social Profile Link (for verification)</label>
          <input
            type="text"
            value={verificationProof}
            onChange={(e) => setVerificationProof(e.target.value)}
            placeholder="e.g., https://linkedin.com/in/..."
          />
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;