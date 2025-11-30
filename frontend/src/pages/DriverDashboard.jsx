import React, { useState, useEffect, useRef } from 'react'; // <--- Import useRef
import { useSocket } from '../context/SocketContext.jsx';
import { useAuth } from '../hooks/useAuth.js';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL;
import DriverRideModal from '../components/DriverRideModal.jsx';
import OTPModal from '../components/OTPModal.jsx';
import RatingModal from '../components/RatingModal.jsx';
import Loader from '../components/Loader.jsx';

const ZONES = ['CMRCET', 'Hitech City', 'Airport'];

const DriverDashboard = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [currentZone, setCurrentZone] = useState('CMRCET');
  const [loading, setLoading] = useState(false);
  
  // --- Ride Queue System ---
  const [rideQueue, setRideQueue] = useState([]); 
  const [currentModalRide, setCurrentModalRide] = useState(null); 
  const [declinedRides, setDeclinedRides] = useState(new Set());
  
  const [activeRide, setActiveRide] = useState(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [completedRideData, setCompletedRideData] = useState(null);

  const [showChat, setShowChat] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [messages, setMessages] = useState([]);

  const isCancellingRef = useRef(false);

  const socket = useSocket();
  const { auth } = useAuth();

  useEffect(() => {
    const fetchCurrentRide = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${auth.token}` } };
        const { data } = await axios.get(`${API}/api/rides/current`, config);

        if (data) {
          console.log("Restoring active ride:", data);
          setActiveRide(data);
          setIsOnline(true);
          
          if (data.status === 'booked') {
            setShowOTPModal(true);
            setCurrentZone(data.fromZone); 
            if (socket) socket.emit('joinChatRoom', data._id);
          } 
          else if (data.status === 'in-progress') {
            setShowOTPModal(false);
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
    
    const handleNewRideRequest = (rideDetails) => {
      if (activeRide) return; // Ignore if busy

      setRideQueue((prevQueue) => {
        const isDuplicate = prevQueue.some(r => r._id === rideDetails._id);
        const isDeclined = declinedRides.has(rideDetails._id);
        if (isDuplicate || isDeclined) return prevQueue; 
        return [...prevQueue, rideDetails];
      });
    };

    const handleStatusChange = ({ status, rideId }) => {
      if (activeRide && activeRide._id === rideId) {
        const updatedRide = { ...activeRide, status: status };
        setActiveRide(updatedRide);

        if (status === 'completed') {
          setCompletedRideData({ ride: activeRide, userToRate: activeRide.rider });
          setActiveRide(null);
        }

        if (status === 'cancelled') {
          setActiveRide(null); 
          setShowOTPModal(false); 
          setCompletedRideData(null);

          if (!isCancellingRef.current) {
            alert("The ride was cancelled by the rider.");
          }
          isCancellingRef.current = false;
        }
      }

      // Logic for Queue Cleanup
      if (status === 'booked' || status === 'cancelled') {
        setRideQueue((prevQueue) => prevQueue.filter((r) => r._id !== rideId));
        if (currentModalRide && currentModalRide._id === rideId) {
          setCurrentModalRide(null);
          if (status === 'booked' && (!activeRide || activeRide._id !== rideId)) {
             alert("This ride was taken by another driver.");
          }
        }
      }
    };

    const handleReceiveMessage = (message) => {
      setMessages((prev) => [...prev, message]);
      if (message.sender !== auth.role && !showChat) {
        setHasNewMessage(true);
      }
    };

    if (isOnline) {
      socket.emit('joinZoneRoom', currentZone);
      socket.on('newRideRequest', handleNewRideRequest);

      // Fetch Pending Rides
      const fetchPendingRides = async () => {
        if (activeRide) return; 
        try {
          const config = { headers: { Authorization: `Bearer ${auth.token}` } };
          const { data } = await axios.get(`${API}/api/rides/requested?zone=${currentZone}`, config);
          
          if (data && data.length > 0) {
            setRideQueue(prev => {
              const existingIds = new Set(prev.map(r => r._id));
              const newRides = data.filter(r => !existingIds.has(r._id) && !declinedRides.has(r._id));
              return [...prev, ...newRides];
            });
          }
        } catch (err) {
          console.error("Error fetching pending rides", err);
        }
      };
      fetchPendingRides();

    } else {
      socket.emit('leaveZoneRoom', currentZone);
    }
    
    socket.on('rideStatusChanged', handleStatusChange);
    socket.on('receiveMessage', handleReceiveMessage);
    
    return () => {
      socket.off('newRideRequest', handleNewRideRequest);
      socket.off('rideStatusChanged', handleStatusChange);
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [isOnline, currentZone, socket, activeRide, showChat, auth.role, currentModalRide, declinedRides]); 

  // --- 3. QUEUE PROCESSOR ---
  useEffect(() => {
    if (!currentModalRide && !activeRide && rideQueue.length > 0) {
      const nextRide = rideQueue[0];
      setRideQueue((prevQueue) => prevQueue.slice(1));
      if (!declinedRides.has(nextRide._id)) {
        setCurrentModalRide(nextRide);
      }
    }
  }, [rideQueue, currentModalRide, activeRide, declinedRides]);


  // --- 4. CHAT LOGIC ---
  useEffect(() => {
    if (socket && activeRide && (activeRide.status === 'booked' || activeRide.status === 'in-progress')) {
      const rideId = activeRide._id;
      socket.emit('joinChatRoom', rideId);
      return () => { socket.emit('leaveChatRoom', rideId); };
    }
  }, [socket, activeRide]);


  // --- CORE FUNCTIONS ---

  const onRideAccepted = (acceptedRide) => {
    setRideQueue([]); 
    setCurrentModalRide(null); 
    setActiveRide(acceptedRide); 
    setShowOTPModal(true);
    setMessages([]);
    setShowChat(false);
    setHasNewMessage(false);
  };

  const handleDecline = () => {
    if (currentModalRide) {
      setDeclinedRides(prev => new Set(prev).add(currentModalRide._id));
    }
    setCurrentModalRide(null); 
  };

  const onRideStart = () => {
    setShowOTPModal(false);
    setActiveRide(prev => ({ ...prev, status: 'in-progress' }));
  };

  const handleEndRide = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      const { data: endedRide } = await axios.put(`${API}/api/rides/${activeRide._id}/end`, {}, config);
      socket.emit('rideUpdate', {
        rideId: activeRide._id,
        status: 'completed',
        riderId: activeRide.rider._id || activeRide.rider,
        driverId: auth._id,
      });
      setCompletedRideData({ ride: endedRide, userToRate: endedRide.rider });
      setActiveRide(null);
    } catch (err) { console.error('Error ending ride', err); } 
    finally { setLoading(false); }
  };

  const handleCancelRide = async () => {
    if (!window.confirm('Are you sure you want to cancel this ride?')) return;
    
    // --- FIX: Mark that WE are cancelling ---
    isCancellingRef.current = true;

    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      await axios.put(`${API}/api/rides/${activeRide._id}/cancel`, {}, config);
      socket.emit('rideUpdate', {
        rideId: activeRide._id,
        status: 'cancelled',
        riderId: activeRide.rider._id || activeRide.rider,
        driverId: auth._id,
      });
      setActiveRide(null); 
      setShowOTPModal(false); 
    } catch (err) { 
      console.error("Error cancelling ride", err); 
      // If error, reset the ref because we failed to cancel
      isCancellingRef.current = false;
    } 
    finally { setLoading(false); }
  };

  const toggleChat = () => {
    if (!showChat) setHasNewMessage(false);
    setShowChat(prev => !prev);
  };

  // --- RENDER LOGIC ---

  if (currentModalRide) {
    return (
      <DriverRideModal
        ride={currentModalRide}
        onClose={handleDecline}
        onRideAccepted={onRideAccepted}
      />
    );
  }

  if (showOTPModal) {
    return (
      <OTPModal
        ride={activeRide}
        onClose={() => setShowOTPModal(false)}
        onRideStart={onRideStart}
        onRideCancel={handleCancelRide}
        messages={messages}
        showChat={showChat}
        hasNewMessage={hasNewMessage}
        toggleChat={toggleChat}
      />
    );
  }

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

  if (isOnline && activeRide && activeRide.status === 'in-progress') {
    return (
      <div className="container dashboard-container">
        <h2>Ride in Progress</h2>
        <div className="driver-details-card">
          <h3>Rider Details</h3>
          <img 
            src={activeRide.rider?.profilePhoto || '/images/default.png'} 
            alt={activeRide.rider?.name || 'Rider'} 
            className="profile-photo-small" 
          />
          <p><strong>Name:</strong> {activeRide.rider?.name || 'Rider'}</p>
          <hr />
          <p><strong>Destination:</strong> {activeRide.toZone}</p>
        </div>
        <button onClick={handleEndRide} className="btn btn-primary" style={{width: '100%', marginTop: '1.5rem'}}>
          End Ride
        </button>
      </div>
    );
  }

  if (isOnline && !activeRide) {
    return (
      <div className="container dashboard-container">
        <div className="driver-toggle">
          <h2>You are online!</h2>
          <p>Listening for rides in <strong>{currentZone}</strong>...</p>
          {rideQueue.length > 0 && (
            <p className="message">
              You have {rideQueue.length} {rideQueue.length > 1 ? 'rides' : 'ride'} waiting in your queue.
            </p>
          )}
          <button onClick={() => setIsOnline(false)} className="btn btn-secondary">
            Go Offline
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container dashboard-container">
      <div className="driver-toggle">
        <h2>Go Online</h2>
        <p>Select your pickup zone to start receiving ride requests.</p>
        <div className="form-group">
          <label htmlFor="zone">Select Zone</label>
          <select id="zone" value={currentZone} onChange={(e) => setCurrentZone(e.target.value)}>
            {ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </div>
        <button onClick={() => setIsOnline(true)} className="btn btn-primary">
          Go Online
        </button>
      </div>
    </div>
  );
};

export default DriverDashboard;