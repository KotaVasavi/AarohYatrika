import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../context/SocketContext';

const OTPModal = ({ ride, onClose, onRideStart, onRideCancel }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { auth } = useAuth();
  const socket = useSocket();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      await axios.post(`/api/rides/${ride._id}/start`, { otp }, config);

      // Notify server & rider that ride is starting
      socket.emit('rideUpdate', {
        rideId: ride._id,
        status: 'in-progress',
        riderId: ride.rider._id || ride.rider,
        driverId: ride.driver._id || ride.driver,
      });

      onRideStart(); // Callback to update parent UI
      onClose();

    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this ride?')) return;
    
    if (onRideCancel) {
      onRideCancel(); 
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Start Ride</h2>
        <p>Enter the 4-digit OTP from your rider.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              maxLength="4"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="otp-input"
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="modal-actions">
            <button className="btn btn-secondary" type="button" onClick={handleCancel} disabled={loading}>
              Cancel Ride
            </button>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Starting...' : 'Start Ride'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OTPModal;