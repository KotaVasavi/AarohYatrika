import React, { useState } from 'react'; // <-- No useEffect
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../context/SocketContext';
import InAppChat from './InAppChat';

const OTPModal = ({
  ride,
  onClose,
  onRideStart,
  onRideCancel,

  // --- Passed from parent ---
  messages,
  showChat,
  hasNewMessage,
  toggleChat
}) => {
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

      // Notify rider
      socket.emit('rideUpdate', {
        rideId: ride._id,
        status: 'in-progress',
        riderId: ride.rider._id || ride.rider,
        driverId: ride.driver._id || ride.driver,
      });

      onRideStart();
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
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel Ride
            </button>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Starting...' : 'Start Ride'}
            </button>
          </div>
        </form>

        <hr style={{ margin: '1.5rem 0' }} />

        <button
          className={`btn btn-secondary ${hasNewMessage ? 'btn-chat-notify' : ''}`}
          style={{
            width: '100%',
            background: hasNewMessage ? '#007bff' : '#6c757d'
          }}
          onClick={toggleChat} // <-- Parent controls this
        >
          {showChat ? 'Hide Chat' : 'Chat with Rider'}
          {hasNewMessage && !showChat && ' (New!)'}
        </button>

        {/* showChat & messages passed from parent */}
        {showChat && <InAppChat rideId={ride._id} messages={messages} />}
      </div>
    </div>
  );
};

export default OTPModal;
