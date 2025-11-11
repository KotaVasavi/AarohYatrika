import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

const DriverRideModal = ({ ride, onClose ,onRideAccepted}) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const { auth } = useAuth();
  const socket = useSocket();

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      // 1. Tell the server we are accepting
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      const { data: acceptedRide } = await axios.put(
        `/api/rides/${ride._id}/accept`,
        {},
        config
      );

      // --- THIS IS THE FIX ---
      // The 'acceptedRide' object from the API already contains the
      // populated 'driver' and 'rider' details.
      
      // 2. Create the data object the Rider's screen is expecting.
      const dataToSend = {
        ride: acceptedRide,
        driver: acceptedRide.driver // The driver is already inside acceptedRide
      };

      // 3. Emit the correct data to the rider
      // This will no longer crash, as all data is valid.
socket.emit('acceptRide', dataToSend);
      // 4. THIS LINE WILL NOW RUN:
      // Tell the DriverDashboard to switch to the OTP modal
      onRideAccepted(acceptedRide);
      // --- END OF FIX ---

    } catch (error) {
      console.error('Error accepting ride:', error);
      setIsAccepting(false);
    }
  };
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>New Ride Request!</h2>
        <p><strong>From:</strong> {ride.fromZone}</p>
        <p><strong>To:</strong> {ride.toZone}</p>
        <p><strong>Fare:</strong> ₹{ride.fare}</p>
        <p><strong>Rider:</strong> {ride.rider.name}</p>
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