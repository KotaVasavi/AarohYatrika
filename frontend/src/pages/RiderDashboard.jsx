import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../hooks/useAuth.js';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL;
import Loader from '../components/Loader.jsx';
import InAppChat from '../components/InAppChat.jsx';
import RatingModal from '../components/RatingModal.jsx';

const ZONES = ['CMRCET', 'Hitech City', 'Airport'];

const RiderDashboard = () => {
  const [fromZone, setFromZone] = useState('CMRCET');
  const [toZone, setToZone] = useState('Hitech City');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  
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
    const fetchCurrentRide = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${auth.token}` } };
        const { data } = await axios.get(`${API}/api/rides/current`, config);

        if (data) {
          console.log("Restoring active ride:", data);
          setActiveRide({
            ride: data,
            driver: data.driver 
          });

          if (data.status === 'requested') {
             setMessage('Searching for nearby drivers...');
          } else if (data.status === 'booked') {
             setMessage('Your driver is on the way!');
             if (socket) socket.emit('joinChatRoom', data._id);
          } else if (data.status === 'in-progress') {
             setMessage('Ride is in progress! Enjoy your trip.');
             if (socket) socket.emit('joinChatRoom', data._id);
          }
        }
      } catch (error) {
        console.error("Could not fetch active ride", error);
      }
    };

    if (auth.token && !activeRide) {
      fetchCurrentRide();
    }
  }, [auth.token, socket]);


  useEffect(() => {
    if (!socket) return;

    // This is the snippet you pasted - IT IS CORRECT
    const handleRideAccepted = (data) => {
      setLoading(false);
      setMessage('Your driver is on the way!');
      setActiveRide(data);
      
      // Reset Chat
      setShowChat(false); 
      setHasNewMessage(false);
      setMessages([]);
      
      // Join the chat room
      socket.emit('joinChatRoom', data.ride._id);
    };
    
    const handleStatusChange = ({ status, rideId }) => {
      if (activeRide && activeRide.ride._id === rideId) {
        
        const updatedRide = { ...activeRide, ride: { ...activeRide.ride, status: status } };
        setActiveRide(updatedRide);

        if (status === 'in-progress') {
          setMessage('Ride is in progress! Enjoy your trip.');
          setShowChat(false);
        }
        
        if (status === 'completed') {
          setMessage('Ride complete! Please pay your driver.');
          setShowChat(false);
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
      setMessages((prev) => [...prev, message]);
      if (message.sender !== auth.role && !showChat) {
        setHasNewMessage(true);
      }
    };

    socket.on('rideAccepted', handleRideAccepted);
    socket.on('rideStatusChanged', handleStatusChange);
    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('rideAccepted', handleRideAccepted);
      socket.off('rideStatusChanged', handleStatusChange);
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, activeRide, showChat, auth.role]);



  const handleRequestRide = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Sending your request...');

    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      const rideData = { fromZone, toZone, scheduledTime: isScheduled ? scheduledTime : null };
      
      const { data: createdRide } = await axios.post(`${API}/api/rides`, rideData, config);

      // IMMEDIATE STATE UPDATE (Shows "Searching" UI)
      setActiveRide({
        ride: createdRide,
        driver: null
      });

      if (!isScheduled) {
        // Send request to drivers
        socket.emit('requestRide', { ...createdRide, rider: auth });
        setMessage('Searching for nearby drivers...');
      } else {
        setMessage(`Ride scheduled for ${new Date(scheduledTime).toLocaleString()}`);
        setLoading(false);
        setActiveRide(null); 
      }
    } catch (error) {
      console.error("Error requesting ride:", error);
      setMessage(error.response?.data?.message || 'Error requesting ride');
      setLoading(false); // Stop loading on error
    } 
    // Do not set loading false in finally() if successful, we want to stay in "waiting" mode
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
      const rideId = activeRide.ride ? activeRide.ride._id : activeRide._id;

      await axios.put(`${API}/api/rides/${rideId}/cancel`, {}, config);

      socket.emit('rideUpdate', {
        rideId: rideId,
        status: 'cancelled',
        riderId: auth._id,
        driverId: activeRide.driver ? activeRide.driver._id : null,
      });

      setActiveRide(null); 
      setMessage('Ride has been cancelled.');

    } catch (err) {
      console.error("Error cancelling ride", err);
      if (activeRide && activeRide.ride.status === 'requested') {
         setActiveRide(null);
         setMessage('Request cancelled.');
      } else {
         setMessage(err.response?.data?.message || 'Could not cancel ride');
      }
    } finally {
      setLoading(false);
    }
  };


  const toggleChat = () => {
    if (!showChat) setHasNewMessage(false);
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

  // Check if we have an active ride to show
  if (activeRide) {
    const ride = activeRide.ride || activeRide; 
    const driver = activeRide.driver;

    return (
      <div className="container dashboard-container">
        <h2>{message}</h2>
        
        {ride.status === 'requested' && (
           <div className="driver-details-card">
             <div className="loader-spinner" style={{margin: '0 auto 1rem'}}></div>
             <h3>Searching for Drivers...</h3>
             <p>We have notified drivers in <strong>{ride.fromZone}</strong>.</p>
             <p>Please wait while a driver accepts your request.</p>
             
             <button onClick={handleCancelRide} className="btn btn-secondary" style={{marginTop: '1.5rem'}}>
                Cancel Request
             </button>
           </div>
        )}

        {/* --- VIEW 2: BOOKED (Driver Found) --- */}
        {ride.status === 'booked' && (
          <div className="driver-details-card">
            <h3>Driver Details</h3>
            <img 
              src={driver?.profilePhoto || '/images/default.jpg'} 
              alt={driver?.name || 'Driver'} 
              className="profile-photo-small" 
            />
            <p><strong>Name:</strong> {driver?.name || 'Driver'}</p>
            <p><strong>Vehicle:</strong> {driver?.vehicleNumber}</p>
            <p><strong>Rating:</strong> {driver?.averageRating || 'N/A'} ★</p>
            <hr />
            <h3>Ride Info</h3>
            <p><strong>Your OTP:</strong> <strong>{ride.otp}</strong></p>
            <p>Share this OTP with your driver to start the ride.</p>
            
            <div className="ride-actions-container" style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem'}}>
              <button onClick={handleCancelRide} className="btn btn-secondary">
                Cancel Ride
              </button>
              <button 
                onClick={toggleChat} 
                className={`btn btn-primary ${hasNewMessage ? 'btn-chat-notify' : ''}`}
              >
                {showChat ? 'Hide Chat' : 'Chat with Driver'}
                {hasNewMessage && !showChat && ' (New!)'}
              </button>
            </div>
            
            {showChat && <InAppChat rideId={ride._id} messages={messages} />}
          </div>
        )}

        {/* --- VIEW 3: IN PROGRESS --- */}
        {ride.status === 'in-progress' && (
           <div className="driver-details-card">
             <h3>Ride In Progress</h3>
             <p>Destination: {ride.toZone}</p>
             <p>Enjoy your trip!</p>
             <button 
                onClick={toggleChat} 
                className={`btn btn-primary ${hasNewMessage ? 'btn-chat-notify' : ''}`}
                style={{marginTop: '1rem'}}
              >
                {showChat ? 'Hide Chat' : 'Chat with Driver'}
                {hasNewMessage && !showChat && ' (New!)'}
              </button>
              {showChat && <InAppChat rideId={ride._id} messages={messages} />}
           </div>
        )}

        {/* --- VIEW 4: COMPLETED --- */}
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

  // --- DEFAULT VIEW: REQUEST FORM ---
  if (loading) return <Loader />;

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