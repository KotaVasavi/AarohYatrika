import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const RatingModal = ({ ride, ratingForUser, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { auth } = useAuth();

  const handleSubmitRating = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const config = {
        headers: { Authorization: `Bearer ${auth.token}` },
      };
      await axios.post(
        '/api/users/rate',
        {
          rideId: ride._id,
          ratingFor: ratingForUser._id, // The ID of the user being rated
          rating: rating,
        },
        config
      );
      
      onClose(); // Close the modal on success
    
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>How was your ride?</h2>
        <p>Please rate your {ratingForUser.role === 'driver' ? 'driver' : 'rider'}, <strong>{ratingForUser.name}</strong>.</p>
        
        <div className="star-rating">
          {[...Array(5)].map((star, index) => {
            const ratingValue = index + 1;
            return (
              <button
                type="button"
                key={ratingValue}
                className={ratingValue <= (hover || rating) ? 'star-on' : 'star-off'}
                onClick={() => setRating(ratingValue)}
                onMouseEnter={() => setHover(ratingValue)}
                onMouseLeave={() => setHover(0)}
              >
                &#9733; {/* Star Character */}
              </button>
            );
          })}
        </div>
        
        {error && <p className="error-message">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Skip
          </button>
          <button className="btn btn-primary" onClick={handleSubmitRating} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;