import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

// Import all necessary components
import DriverRideModal from '../components/DriverRideModal';
import OTPModal from '../components/OTPModal';
import InAppChat from '../components/InAppChat';
import RatingModal from '../components/RatingModal';
import Loader from '../components/Loader';

const ZONES = ['CMRCET', 'Hitech City', 'Airport'];

const DriverDashboard = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [currentZone, setCurrentZone] = useState('CMRCET');
  const [loading, setLoading] = useState(false);
  
  // --- Ride Lifecycle State ---
  const [incomingRide, setIncomingRide] = useState(null); // The ride request modal
  const [activeRide, setActiveRide] = useState(null); // The ride they accepted
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [completedRideData, setCompletedRideData] = useState(null);

  const socket = useSocket();
  const { auth } = useAuth();

  useEffect(() => {
    if (!socket) return;

    // --- Socket Event Listeners ---
    
    // 1. A new ride request comes in for our zone
    const handleNewRideRequest = (rideDetails) => {
      if (!incomingRide && !activeRide) { // Don't show if already in a ride
        setIncomingRide(rideDetails);
      }
    };

    // 2. The ride status changed (e.g., 'completed')
    const handleStatusChange = ({ status, rideId }) => {
      if (activeRide && activeRide._id === rideId) {
        
        // Update local state
        const updatedRide = { ...activeRide, status: status };
        setActiveRide(updatedRide);

        if (status === 'completed') {
          // Ride is over, show the rating modal
          setCompletedRideData({ ride: activeRide, userToRate: activeRide.rider });
          // Clear the active ride
          setActiveRide(null);
        }
      }
    };

    if (isOnline) {
      socket.emit('joinZoneRoom', currentZone);
      socket.on('newRideRequest', handleNewRideRequest);
      socket.on('rideStatusChanged', handleStatusChange);
    } else {
      socket.emit('leaveZoneRoom', currentZone);
    }
    
    return () => {
      socket.off('newRideRequest', handleNewRideRequest);
      socket.off('rideStatusChanged', handleStatusChange);
    };
  }, [isOnline, currentZone, socket, incomingRide, activeRide]);


  // --- Core Functions ---

  // When driver clicks "Accept" in the DriverRideModal
  const onRideAccepted = (acceptedRide) => {
    setIncomingRide(null); // Close the request modal
    setActiveRide(acceptedRide); // Set this as the current ride
    setShowOTPModal(true); // Open the OTP modal
  };

  // When driver successfully enters OTP
  const onRideStart = () => {
    setShowOTPModal(false);
    // Update local state to 'in-progress'
    setActiveRide(prev => ({ ...prev, status: 'in-progress' }));
  };

const handleEndRide = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      
      // 1. Tell backend to end the ride.
      // This API call was failing with 400. The OTPModal fix should solve this.
      const { data: endedRide } = await axios.put(
        `/api/rides/${activeRide._id}/end`,
        {},
        config
      );

      // 2. Tell all clients (rider) that the ride is completed
      // We fix the auth.user bug here
      socket.emit('rideUpdate', {
        rideId: activeRide._id,
        status: 'completed',
        // We get the rider ID from the ride object
        riderId: activeRide.rider._id || activeRide.rider,
        driverId: auth._id, // <-- FIX: was auth.user._id
      });

      // 3. Show the rating modal
      // We must get the full rider object from the `endedRide` data
      setCompletedRideData({ ride: endedRide, userToRate: endedRide.rider });
      setActiveRide(null); // Clear the active ride

    } catch (err) {
      console.error('Error ending ride', err);
      // We'll see this if the 400 error persists
    } finally {
      setLoading(false);
    }
  };

  // --- UI Rendering ---

  // Show modals on top of everything
  if (incomingRide) {
    return (
      <DriverRideModal
        ride={incomingRide}
        onClose={() => setIncomingRide(null)}
        onRideAccepted={onRideAccepted} // This is the key transition
      />
    );
  }
  if (showOTPModal) {
    return (
      <OTPModal
        ride={activeRide}
        onClose={() => setShowOTPModal(false)}
        onRideStart={onRideStart} // This is the key transition
      />
    );
  }
  if (completedRideData) {
    return (
      <RatingModal
        ride={completedRideData.ride}
        ratingForUser={completedRideData.userToRate}
        onClose={() => setCompletedRideData(null)} // Resets UI to default
      />
    );
  }
  if (loading) return <Loader />;


  // VIEW 1: Driver is "Online" and "In a Ride"
  if (isOnline && activeRide) {
    return (
      <div className="container dashboard-container">
        <h2>Ride in Progress</h2>
        <div className="driver-details-card">
          <h3>Rider Details</h3>
          <img src={activeRide.rider.profilePhoto} alt={activeRide.rider.name} className="profile-photo-small" />
          <p><strong>Name:</strong> {activeRide.rider.name}</p>
          <hr />
          <p><strong>From:</strong> {activeRide.fromZone}</p>
          <p><strong>To:</strong> {activeRide.toZone}</p>
        </div>
        
        <InAppChat rideId={activeRide._id} />
        
        <button onClick={handleEndRide} className="btn btn-primary" style={{width: '100%', marginTop: '1rem'}}>
          End Ride
        </button>
      </div>
    );
  }

  // VIEW 2: Driver is "Online" and "Waiting for a Ride"
  if (isOnline && !activeRide) {
    return (
      <div className="container dashboard-container">
        <div className="driver-toggle">
          <h2>You are online!</h2>
          <p>Listening for rides in <strong>{currentZone}</strong>...</p>
          <button onClick={() => setIsOnline(false)} className="btn btn-secondary">
            Go Offline
          </button>
        </div>
      </div>
    );
  }
  
  // VIEW 3: (Default) Driver is "Offline"
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