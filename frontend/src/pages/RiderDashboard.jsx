import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL;
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
  
  const [activeRide, setActiveRide] = useState(null); 
  const [completedRideData, setCompletedRideData] = useState(null); 
  const [showChat, setShowChat] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [messages, setMessages] = useState([]);

  const socket = useSocket();
  const { auth } = useAuth();

  useEffect(() => {
    if (!socket) return;

  const handleRideAccepted = (data) => {
      setLoading(false);
      setMessage('Your driver is on the way!');
      setActiveRide(data);
      setShowChat(false); 
      setHasNewMessage(false);
      setMessages([]); 
    };
    
    const handleStatusChange = ({ status, rideId }) => {
      // Check if this update is for our active ride
      if (activeRide && activeRide.ride._id === rideId) {
        
        const updatedRide = { ...activeRide, ride: { ...activeRide.ride, status: status } };
        setActiveRide(updatedRide);

        if (status === 'in-progress') {
          setMessage('Ride is in progress! Enjoy your trip.');
        }
        
        if (status === 'completed') {
          setMessage('Ride complete! Please pay your driver.');
        }

        if (status === 'cancelled') {
          setActiveRide(null);
          setCompletedRideData(null);
          setShowChat(false);
          setHasNewMessage(false);
          setMessages([]); 
          setMessage('The ride was cancelled.');
        }
      }
    };
    const handleReceiveMessage = (message) => {
      // Add the message to our persistent state
      setMessages((prev) => [...prev, message]);
      
      // Check for notification
      if (message.sender !== auth.role && !showChat) {
        setHasNewMessage(true);
      }
    };

    socket.on('rideAccepted', handleRideAccepted);
    socket.on('rideStatusChanged', handleStatusChange);
    socket.on('receiveMessage', handleReceiveMessage); // Renamed for clarity

    return () => {
      socket.off('rideAccepted', handleRideAccepted);
      socket.off('rideStatusChanged', handleStatusChange);
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, activeRide, showChat, auth.role]);
  
  useEffect(() => {
    if (socket && activeRide && activeRide.ride.status === 'booked') {
      const rideId = activeRide.ride._id;
      // We join the room as soon as the ride is 'booked'
      socket.emit('joinChatRoom', rideId);
      console.log('Rider joined chat room:', rideId);
  
      // Return a cleanup function to leave when the ride is no longer active
      return () => {
        socket.emit('leaveChatRoom', rideId);
        console.log('Rider left chat room:', rideId);
      };
    }
  }, [socket, activeRide]);

  const handleRequestRide = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Sending your request...');

    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      const rideData = { fromZone, toZone, scheduledTime: isScheduled ? scheduledTime : null };
      
      const { data: createdRide } = await axios.post(`${API}/api/rides`, rideData, config);


      if (!isScheduled) {
        // Send the full auth object as the rider
        socket.emit('requestRide', { ...createdRide, rider: auth });
        setMessage('Ride requested! Searching for nearby drivers.');
      } else {
        setMessage(`Ride scheduled for ${new Date(scheduledTime).toLocaleString()}`);
        setLoading(false);
      }
    } catch (error) {
      console.error("FULL ERROR OBJECT:", error); 
      if (error.response) {
        console.error("Backend Error Data:", error.response.data);
        setMessage(error.response.data.message || 'Error from server');
      } else if (error.request) {
        console.error("No response from server.", error.request);
        setMessage('Network Error: The server is not responding.');
      } else {
        console.error("Local JavaScript Error:", error.message);
        setMessage(`Local Error: ${error.message}`);
      }
    } finally {
      // We only set loading false in catch, because success leads to new state
      if (loading) setLoading(false);
    }
  };

  const handleSimulatedPayment = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      await axios.put(`${API}/api/rides/${activeRide.ride._id}/pay`, {}, config);

      setLoading(false);
      setCompletedRideData({ ride: activeRide.ride, userToRate: activeRide.driver });
      setActiveRide(null); 

    } catch (err) {
      setLoading(false);
      setMessage('Payment failed. Please try again.');
    }
  };

  const handleCancelRide = async () => {
    if (!window.confirm('Are you sure you want to cancel this ride?')) return;
    
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      await axios.put(`${API}/api/rides/${activeRide.ride._id}/cancel`, {}, config);

      // Notify the other user
      socket.emit('rideUpdate', {
        rideId: activeRide.ride._id,
        status: 'cancelled',
        riderId: activeRide.ride.rider._id || activeRide.ride.rider,
        driverId: activeRide.driver._id || activeRide.driver,
      });

      setActiveRide(null); // Go back to request form
      setMessage('Ride has been cancelled.');

    } catch (err) {
      console.error("Error cancelling ride", err);
      setMessage(err.response?.data?.message || 'Could not cancel ride');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleChat = () => {
    // When we open the chat, clear the notification
    if (!showChat) {
      setHasNewMessage(false);
    }
    setShowChat(prev => !prev);
  };
  // --- RENDER LOGIC ---

  if (completedRideData) {
    return (
      <RatingModal
        ride={completedRideData.ride}
        ratingForUser={completedRideData.userToRate}
        onClose={() => setCompletedRideData(null)}
      />
    );
  }

  if (loading) return <Loader />;
  if (activeRide) {
  const { driver, ride } = activeRide;

  return (
    <div className="container dashboard-container">
      <h2>{message}</h2>

      {/* --- RIDE BOOKED --- */}
      {ride.status === 'booked' && (
        <div className="driver-details-card">
          <h3>Driver Details</h3>
          <img
            src={driver?.profilePhoto || '/images/default-avatar.png'}
            alt={driver?.name || 'Driver'}
            className="profile-photo-small"
          />
          <p><strong>Name:</strong> {driver?.name || 'Driver'}</p>
          <p><strong>Vehicle:</strong> {driver?.vehicleNumber}</p>
          <p><strong>Rating:</strong> {driver?.averageRating || 'N/A'} ★</p>

          <hr />
          <h3>Ride Info</h3>
          <p><strong>Your OTP:</strong> {ride.otp}</p>
          <p>Share this OTP with your driver to start the ride.</p>

          <button onClick={handleCancelRide} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Cancel Ride
          </button>

          <button 
                onClick={toggleChat} 
                className={`btn btn-primary ${hasNewMessage ? 'btn-chat-notify' : ''}`}
              >
                {showChat ? 'Hide Chat' : 'Chat with Driver'}
                {hasNewMessage && !showChat && ' (New!)'}
              </button>

{showChat && <InAppChat rideId={ride._id} messages={messages} />}        </div>
      )}

      {/* --- RIDE IN PROGRESS --- */}
      {ride.status === 'in-progress' && (
        <div className="driver-details-card">
          <h3>Ride In Progress</h3>
          <p>Destination: {ride.toZone}</p>
          <p>Enjoy your trip!</p>
        </div>
      )}

      {/* --- RIDE COMPLETED --- */}
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