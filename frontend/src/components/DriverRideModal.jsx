import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useSocket } from '../context/SocketContext.jsx';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL;
const DriverRideModal = ({ ride, onClose, onRideAccepted }) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const { auth } = useAuth();
  const socket = useSocket();

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      const { data: acceptedRide } = await axios.put(
        `${API}/api/rides/${ride._id}/accept`,
        {},
        config
      );

      // 2. Tell the Server to notify the Rider (CRITICAL STEP)
      console.log("Ride accepted in DB. Now emitting socket event...", acceptedRide);
      
      if (socket) {
        socket.emit('acceptRide', {
          ride: acceptedRide,
          driver: acceptedRide.driver, 
        });
      } else {
        console.error("Socket not connected! Cannot notify rider.");
      }

      // 3. Update Driver UI
      onRideAccepted(acceptedRide);

    } catch (error) {
      console.error('Error accepting ride:', error);
      setIsAccepting(false);

      // Handle Race Condition (Ride already taken)
      if (error.response && error.response.status === 400) {
        alert("This ride has already been accepted by another driver.");
        onClose(); 
      } else {
        alert("Failed to accept ride. Please try again.");
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>New Ride Request!</h2>
        <div className="ride-info">
          <p><strong>From:</strong> {ride.fromZone}</p>
          <p><strong>To:</strong> {ride.toZone}</p>
          <p><strong>Fare:</strong> ₹{ride.fare}</p>
          <p><strong>Rider:</strong> {ride.rider ? ride.rider.name : 'Rider'}</p>
          {ride.rider?.averageRating && <p><strong>Rating:</strong> {ride.rider.averageRating} ★</p>}
        </div>
        
        <div className="modal-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleAccept} 
            disabled={isAccepting}
          >
            {isAccepting ? 'Accepting...' : 'Accept Ride'}
          </button>
          <button className="btn btn-secondary" onClick={onClose} disabled={isAccepting}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverRideModal;