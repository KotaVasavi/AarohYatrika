import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

// Import all necessary components
import Loader from '../components/Loader';
import InAppChat from '../components/InAppChat';
import RatingModal from '../components/RatingModal';

const ZONES = ['CMRCET', 'Hitech City', 'Airport'];

const RiderDashboard = () => {
  // Form State
  const [fromZone, setFromZone] = useState('CMRCET');
  const [toZone, setToZone] = useState('Hitech City');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  
  // UI/Data State
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // --- Ride Lifecycle State ---
  // This object will hold { ride: {...}, driver: {...} }
  const [activeRide, setActiveRide] = useState(null); 
  // This will hold the completed ride data for the rating modal
  const [completedRideData, setCompletedRideData] = useState(null); 

  const socket = useSocket();
  const { auth } = useAuth();

  useEffect(() => {
    if (!socket) return;

    // --- Socket Event Listeners ---

    // 1. A driver accepted our ride
    const handleRideAccepted = (data) => {
      // data = { ride: {...}, driver: {...} }
      setLoading(false);
      setMessage('Your driver is on the way!');
      setActiveRide(data); // <-- This triggers the UI switch
    };
    
    // 2. The ride status changed (e.g., 'in-progress', 'completed')
    const handleStatusChange = ({ status, rideId }) => {
      if (activeRide && activeRide.ride._id === rideId) {
        
        // Update the ride status in our local state
        const updatedRide = { ...activeRide, ride: { ...activeRide.ride, status: status } };
        setActiveRide(updatedRide);

        if (status === 'in-progress') {
          setMessage('Ride is in progress! Enjoy your trip.');
        }
        
        if (status === 'completed') {
          setMessage('Ride complete! Please pay your driver.');
          // The UI will now show the payment button
        }
      }
    };

    socket.on('rideAccepted', handleRideAccepted);
    socket.on('rideStatusChanged', handleStatusChange);

    return () => {
      socket.off('rideAccepted', handleRideAccepted);
      socket.off('rideStatusChanged', handleStatusChange);
    };
  }, [socket, activeRide]);

  // --- Core Functions ---

const handleRequestRide = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Sending your request...');

    try {
      const config = {
        headers: { Authorization: `Bearer ${auth.token}` },
      };
      
      const rideData = {
        fromZone,
        toZone,
        scheduledTime: isScheduled ? scheduledTime : null,
      };
      
      const { data: createdRide } = await axios.post('/api/rides', rideData, config);

      if (!isScheduled) {

socket.emit('requestRide', { ...createdRide, rider: auth });        setMessage('Ride requested! Searching for nearby drivers.');
      } else {
        setMessage(`Ride scheduled for ${new Date(scheduledTime).toLocaleString()}`);
        setLoading(false);
      }
    } catch (error) {
      // --- THIS IS THE NEW, DETAILED CATCH BLOCK ---
      
      console.error("FULL ERROR OBJECT:", error); // This is the most important line

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Backend Error Data:", error.response.data);
        console.error("Backend Error Status:", error.response.status);
        setMessage(error.response.data.message || 'Error from server');
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response from server. Is backend running? Is proxy correct?", error.request);
        setMessage('Network Error: The server is not responding.');
      } else {
        // Something happened in setting up the request that triggered an Error
        // This is likely a local JavaScript error (e.g., auth.token is undefined)
        console.error("Local JavaScript Error:", error.message);
        setMessage(`Local Error: ${error.message}`);
      }

    } finally {
      setLoading(false); 
    }
  };

  const handleSimulatedPayment = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      await axios.put(`/api/rides/${activeRide.ride._id}/pay`, {}, config);

      // Payment success!
      setLoading(false);
      
      // 1. Set data for the rating modal
      setCompletedRideData({ ride: activeRide.ride, userToRate: activeRide.driver });
      
      // 2. Clear the active ride to reset the UI
      setActiveRide(null); 

    } catch (err) {
      setLoading(false);
      setMessage('Payment failed. Please try again.');
    }
  };

  // --- UI Rendering ---

  // Show the rating modal if we have data for it
  if (completedRideData) {
    return (
      <RatingModal
        ride={completedRideData.ride}
        ratingForUser={completedRideData.userToRate}
        onClose={() => setCompletedRideData(null)} // Resets UI to default
      />
    );
  }

  // Show loading overlay
  if (loading) return <Loader />;
  
  // Show the active ride UI (if a ride is accepted)
  if (activeRide) {
    const { driver, ride } = activeRide;
    return (
      <div className="container dashboard-container">
        <h2>{message}</h2>
        
        {/* VIEW 1: Driver En Route (Status = booked) */}
        {ride.status === 'booked' && (
          <div className="driver-details-card">
            <h3>Driver Details</h3>
            <img src={driver.profilePhoto} alt={driver.name} className="profile-photo-small" />
            <p><strong>Name:</strong> {driver.name}</p>
            <p><strong>Vehicle:</strong> {driver.vehicleNumber}</p>
            <p><strong>Rating:</strong> {driver.averageRating} ★</p>
            <hr />
            <h3>Ride Info</h3>
            <p><strong>Your OTP:</strong> <strong>{ride.otp}</strong></p>
            <p>Share this OTP with your driver to start the ride.</p>
          </div>
        )}

        {/* VIEW 2: Ride In Progress (Status = in-progress) */}
        {ride.status === 'in-progress' && (
           <InAppChat rideId={ride._id} />
        )}

        {/* VIEW 3: Ride Completed (Status = completed) */}
        {ride.status === 'completed' && (
          <div className="driver-details-card">
            <h3>Ride Complete</h3>
            <p>Total Fare: <strong>₹{ride.fare}</strong></p>
            <p>Please pay your driver in cash.</p>
            <button onClick={handleSimulatedPayment} className="btn btn-primary">
              [ Pay with Cash ]
            </button>
          </div>
        )}

      </div>
    );
  }

  // Default View: Show the ride request form
  return (
    <div className="container dashboard-container">
      <h2>Request a Ride</h2>
      <form onSubmit={handleRequestRide} className="ride-form">
        <div className="form-group">
          <label htmlFor="fromZone">From</label>
          <select id="fromZone" value={fromZone} onChange={(e) => setFromZone(e.target.value)}>
            {ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="toZone">To</label>
          <select id="toZone" value={toZone} onChange={(e) => setToZone(e.target.value)}>
            {ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </div>
        
        <div className="form-group-inline">
          <input type="checkbox" id="isScheduled" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} />
          <label htmlFor="isScheduled">Ride Later?</label>
        </div>

        {isScheduled && (
          <div className="form-group">
            <label htmlFor="scheduledTime">Date & Time</label>
            <input type="datetime-local" id="scheduledTime" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} required />
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Find My SafeRide'}
        </button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
};

export default RiderDashboard;