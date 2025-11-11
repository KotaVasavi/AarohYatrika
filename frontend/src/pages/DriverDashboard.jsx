import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

import DriverRideModal from '../components/DriverRideModal.jsx';
import OTPModal from '../components/OTPModal.jsx';
import InAppChat from '../components/InAppChat.jsx';
import RatingModal from '../components/RatingModal.jsx';
import Loader from '../components/Loader.jsx';

const ZONES = ['CMRCET', 'Hitech City', 'Airport'];

const DriverDashboard = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [currentZone, setCurrentZone] = useState('CMRCET');
  const [loading, setLoading] = useState(false);
  
  const [incomingRide, setIncomingRide] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [completedRideData, setCompletedRideData] = useState(null);

  const socket = useSocket();
  const { auth } = useAuth();

  useEffect(() => {
    if (!socket) return;
    
    const handleNewRideRequest = (rideDetails) => {
      if (!incomingRide && !activeRide) {
        setIncomingRide(rideDetails);
      }
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
          setActiveRide(null); // Go back to "Online" screen
          setShowOTPModal(false); // Close OTP modal if open
          setCompletedRideData(null); // Close rating modal
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


  const onRideAccepted = (acceptedRide) => {
    setIncomingRide(null);
    setActiveRide(acceptedRide);
    setShowOTPModal(true);
  };

  const onRideStart = () => {
    setShowOTPModal(false);
    setActiveRide(prev => ({ ...prev, status: 'in-progress' }));
  };

  const handleEndRide = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      
      const { data: endedRide } = await axios.put(
        `/api/rides/${activeRide._id}/end`,
        {},
        config
      );

      socket.emit('rideUpdate', {
        rideId: activeRide._id,
        status: 'completed',
        riderId: activeRide.rider._id || activeRide.rider,
        driverId: auth._id, // <-- FIX
      });

      setCompletedRideData({ ride: endedRide, userToRate: endedRide.rider });
      setActiveRide(null);

    } catch (err) {
      console.error('Error ending ride', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!window.confirm('Are you sure you want to cancel this ride?')) return;
    
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${auth.token}` } };
      await axios.put(`/api/rides/${activeRide._id}/cancel`, {}, config);

      socket.emit('rideUpdate', {
        rideId: activeRide._id,
        status: 'cancelled',
        riderId: activeRide.rider._id || activeRide.rider,
        driverId: auth._id,
      });

      setActiveRide(null); // Go back to online screen
      setShowOTPModal(false); // Close OTP modal
    } catch (err) {
      console.error("Error cancelling ride", err);
    } finally {
      setLoading(false);
    }
  };


  if (incomingRide) {
    return (
      <DriverRideModal
        ride={incomingRide}
        onClose={() => setIncomingRide(null)}
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


  if (isOnline && activeRide) {
    return (
      <div className="container dashboard-container">
        <h2>Ride in Progress</h2>
        <div className="driver-details-card">
          <h3>Rider Details</h3>
          <img 
            src={activeRide.rider?.profilePhoto || '/images/default-avatar.png'} 
            alt={activeRide.rider?.name || 'Rider'} 
            className="profile-photo-small" 
          />
          <p><strong>Name:</strong> {activeRide.rider?.name || 'Rider'}</p>
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