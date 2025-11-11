import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth.js';
import Loader from '../components/Loader.jsx';

const RideHistoryPage = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { auth } = useAuth(); // auth is { _id, name, role, token }

  useEffect(() => {
    const fetchHistory = async () => {
      if (!auth.token) {
        setLoading(false);
        setError('You must be logged in to see ride history.');
        return;
      }
      try {
        const config = {
          headers: { Authorization: `Bearer ${auth.token}` },
        };
        const { data } = await axios.get('/api/rides/history', config);
        setRides(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch ride history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [auth.token]);

  const getOtherPartyName = (ride) => {
    // --- FIX 1 HERE ---
    // It should be auth.role, not auth.user.role
    if (auth.role === 'rider') {
      return ride.driver ? ride.driver.name : 'Pending';
    } else {
      return ride.rider ? ride.rider.name : 'N/A';
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="container">
      <h2>My Ride History</h2>
      {error && <p className="error-message">{error}</p>}
      
      {rides.length === 0 && !loading ? (
        <p>You have no ride history.</p>
      ) : (
        <div className="ride-history-list">
          {rides.map((ride) => (
            <div key={ride._id} className="ride-card">
              <div className="ride-card-header">
                <strong>{ride.fromZone}</strong> to <strong>{ride.toZone}</strong>
              </div>
              <div className="ride-card-body">
                <p><strong>Date:</strong> {new Date(ride.createdAt).toLocaleString()}</p>
                <p>
                  <strong>
                    {/* --- FIX 2 HERE --- */}
                    {/* This is the line (approx 63) from your error */}
                    {auth.role === 'rider' ? 'Driver:' : 'Rider:'}
                  </strong>{' '}
                  {getOtherPartyName(ride)}
                </p>
                <p><strong>Fare:</strong> ₹{ride.fare}</p>
              </div>
              <div className="ride-card-footer">
                <span className={`status-badge status-${ride.status}`}>
                  {ride.status}
                </span>
                <span className={`payment-badge payment-${ride.paymentStatus}`}>
                  {ride.paymentStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RideHistoryPage;