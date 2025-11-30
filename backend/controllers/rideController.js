
import asyncHandler from 'express-async-handler';
import Ride from '../models/Ride.js';
import User from '../models/User.js';

const FARE_MATRIX = {
  CMRCET: { 'Hitech City': 250, Airport: 400 },
  'Hitech City': { CMRCET: 250, Airport: 500 },
  Airport: { CMRCET: 400, 'Hitech City': 500 },
};

const getFare = (from, to) => FARE_MATRIX[from]?.[to] || 300;

// @desc    Create a new ride request
// @route   POST /api/rides
// @access  Private (Rider)
const createRide = asyncHandler(async (req, res) => {
  const { fromZone, toZone, scheduledTime } = req.body;
  const rider = req.user._id;

  const fare = getFare(fromZone, toZone);
  if (!fare) {
    res.status(400);
    throw new Error('Fare not available for this route');
  }
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const ride = new Ride({
    rider,
    fromZone,
    toZone,
    fare,
    otp,
    status: scheduledTime ? 'scheduled' : 'requested',
    scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
  });

  const createdRide = await ride.save();
  const populated = await Ride.findById(createdRide._id)
    .populate('rider', 'name profilePhoto')
    .populate('driver', 'name profilePhoto averageRating vehicleNumber');

  // Return the created ride; socket handling is done on the client/server socket layer
  res.status(201).json(populated);
});

// @desc    Driver accepts a ride
// @route   PUT /api/rides/:id/accept
// @access  Private (Driver)
const acceptRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (!ride) {
    res.status(404);
    throw new Error('Ride not found');
  }

  if (ride.status !== 'requested') {
    res.status(400);
    throw new Error('Ride is already taken by another driver');
  }

  ride.driver = req.user._id;
  ride.status = 'booked';
  await ride.save();

  const populatedRide = await Ride.findById(ride._id)
    .populate('driver', 'name profilePhoto averageRating vehicleNumber')
    .populate('rider', 'name profilePhoto');

  

  res.json(populatedRide);
});

// @desc    Driver verifies OTP to start ride
// @route   POST /api/rides/:id/start
// @access  Private (Driver)
const startRide = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const ride = await Ride.findById(req.params.id);

  if (!ride) {
    res.status(404);
    throw new Error('Ride not found');
  }

  if (!ride.driver || ride.driver.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to start this ride');
  }

  if (ride.otp !== otp) {
    res.status(400);
    throw new Error('Invalid OTP');
  }

  ride.status = 'in-progress';
  const updatedRide = await ride.save();

  const populated = await Ride.findById(updatedRide._id)
    .populate('driver', 'name profilePhoto averageRating vehicleNumber')
    .populate('rider', 'name profilePhoto');

  res.json(populated);
});

// @desc    Driver ends a ride
// @route   PUT /api/rides/:id/end
// @access  Private (Driver)
const endRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (!ride || ride.status !== 'in-progress') {
    res.status(400);
    throw new Error('Ride not in progress');
  }

  // Optionally verify driver
  if (!ride.driver || ride.driver.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to end this ride');
  }

  ride.status = 'completed';
  const updatedRide = await ride.save();

  const populated = await Ride.findById(updatedRide._id)
    .populate('driver', 'name profilePhoto averageRating vehicleNumber')
    .populate('rider', 'name profilePhoto');

  res.json(populated);
});

// @desc    Rider "pays" for the ride
// @route   PUT /api/rides/:id/pay
// @access  Private (Rider)
const payForRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (!ride || ride.status !== 'completed') {
    res.status(400);
    throw new Error('Ride not completed');
  }

  // Only rider can mark payment (optional)
  if (!ride.rider || ride.rider.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to pay for this ride');
  }

  ride.paymentStatus = 'paid';
  await ride.save();

  // Update stats
  if (ride.driver) await User.findByIdAndUpdate(ride.driver, { $inc: { totalRides: 1 } });
  if (ride.rider) await User.findByIdAndUpdate(ride.rider, { $inc: { totalRides: 1 } });

  res.json({ message: 'Payment successful' });
});

// @desc    Get ride history for a user
// @route   GET /api/rides/history
// @access  Private
const getRideHistory = asyncHandler(async (req, res) => {
  const rides = await Ride.find({
    $or: [{ rider: req.user._id }, { driver: req.user._id }],
  })
    .populate('rider', 'name')
    .populate('driver', 'name')
    .sort({ createdAt: -1 });

  res.json(rides);
});

// @desc    Cancel a booked ride (by rider or driver)
// @route   PUT /api/rides/:id/cancel
// @access  Private
const cancelRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (!ride) {
    res.status(404);
    throw new Error('Ride not found');
  }

  const isRider = ride.rider.toString() === req.user._id.toString();
  const isDriver = ride.driver && ride.driver.toString() === req.user._id.toString();

  if (!isRider && !isDriver) {
    res.status(401);
    throw new Error('Not authorized to cancel this ride');
  }

if (ride.status !== 'requested' && ride.status !== 'booked') {
    res.status(400);
    throw new Error('Ride cannot be cancelled at this stage');
  }

  ride.status = 'cancelled';
  const updatedRide = await ride.save();

  const populated = await Ride.findById(updatedRide._id)
    .populate('driver', 'name')
    .populate('rider', 'name');

  res.json(populated);
});

// @desc    Get the current active ride for the user (Rider or Driver)
// @route   GET /api/rides/current
// @access  Private
const getCurrentRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findOne({
    $or: [{ rider: req.user._id }, { driver: req.user._id }],
    status: { $in: ['requested', 'booked', 'in-progress'] },
  })
    .populate('driver', 'name profilePhoto averageRating vehicleNumber')
    .populate('rider', 'name profilePhoto averageRating');

  if (ride) res.json(ride);
  else res.json(null);
});

// @desc    Get all rides with status 'requested' in a specific zone
// @route   GET /api/rides/requested?zone=ZoneName
// @access  Private (Driver)
const getPendingRides = asyncHandler(async (req, res) => {
  const { zone } = req.query;

  if (!zone) {
    res.status(400);
    throw new Error('Zone is required');
  }

  const rides = await Ride.find({ 
    status: 'requested', 
    fromZone: zone 
  })
  .populate('rider', 'name profilePhoto averageRating')
  .sort({ createdAt: 1 }); // Oldest requests first

  res.json(rides);
});

export {
  createRide,
  acceptRide,
  startRide,
  endRide,
  payForRide,
  getRideHistory,
  cancelRide,
  getCurrentRide,
  getPendingRides
};
