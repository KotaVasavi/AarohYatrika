import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Rating from '../models/Rating.js';
import Ride from '../models/Ride.js';

// @desc    Get current user's profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password'); // req.user is from authMiddleware

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update current user's profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
if (req.body.profilePhoto) {
      user.profilePhoto = req.body.profilePhoto;
    }    if (req.body.password) {
      user.password = req.body.password; // Mongoose 'pre-save' hook will hash it
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePhoto: updatedUser.profilePhoto,
      isVerified: updatedUser.isVerified,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Submit a rating for a user after a ride
// @route   POST /api/users/rate
// @access  Private
const submitRating = asyncHandler(async (req, res) => {
  const { rideId, ratingFor, rating } = req.body; // ratingFor = ID of user being rated
  const ratingBy = req.user._id; // The user giving the rating

  // 1. Check if the ride exists and is completed
  const ride = await Ride.findById(rideId);
  if (!ride || ride.status !== 'completed') {
    res.status(400);
    throw new Error('Ride not completed or does not exist');
  }

  // 2. Check if this user has already rated for this specific ride
  const existingRating = await Rating.findOne({ ride: rideId, ratingBy });
  if (existingRating) {
    res.status(400);
    throw new Error('You have already rated this trip');
  }

  // 3. Create the new rating
  const newRating = new Rating({
    ride: rideId,
    ratingFor,
    ratingBy,
    rating: Number(rating),
  });
  await newRating.save();

  // 4. Recalculate the average rating for the user who was rated
  const allRatingsForUser = await Rating.find({ ratingFor });

  const average =
    allRatingsForUser.reduce((acc, item) => acc + item.rating, 0) /
    allRatingsForUser.length;

  // 5. Update the user's profile with the new average
  await User.findByIdAndUpdate(ratingFor, {
    averageRating: average.toFixed(1), // Store as a 1-decimal-place number
  });

  res.status(201).json({ message: 'Rating submitted successfully' });
});

export { getUserProfile, updateUserProfile, submitRating };