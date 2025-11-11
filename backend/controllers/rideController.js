import asyncHandler from 'express-async-handler';
import Ride from '../models/Ride.js';
import User from '../models/User.js';

// A simple, hardcoded fare matrix. In a real app, this would be in the DB.
const FARE_MATRIX = {
  CMRCET: {
    'Hitech City': 250,
    Airport: 400,
  },
  'Hitech City': {
    CMRCET: 250,
    Airport: 500,
  },
  Airport: {
    CMRCET: 400,
    'Hitech City': 500,
  },
};

const getFare = (from, to) => {
  return FARE_MATRIX[from]?.[to] || 300; // Default fare
};

// @desc    Create a new ride request
// @route   POST /api/rides
// @access  Private (Rider)
const createRide = asyncHandler(async (req, res) => {
  const { fromZone, toZone, scheduledTime } = req.body;
  const rider = req.user._id; // From authMiddleware

  const fare = getFare(fromZone, toZone);
  if (!fare) {
    res.status(400);
    throw new Error('Fare not available for this route');
  }

  const ride = new Ride({
    rider,
    fromZone,
    toZone,
    fare,
    status: scheduledTime ? 'scheduled' : 'requested',
    scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
  });

  const createdRide = await ride.save();
  
  // If it's a "Ride Now" request, we'll handle socket emission in the frontend
  // or we can do it here. For simplicity, we'll let the frontend emit.

  res.status(201).json(createdRide);
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

  if (ride.status !== 'requested' && ride.status !== 'scheduled') {
     res.status(400);
     throw new Error('Ride is already booked or completed');
  }

  // --- THIS IS THE NEW, ROBUST LOGIC ---
  
  // 1. Update the ride details
  ride.driver = req.user._id;
  ride.status = 'booked';
  
  // 2. Save the ride. This will trigger the pre-save hook to generate the OTP.
  await ride.save();

  // 3. Re-fetch the ride by its ID, and *now* populate it.
  // This is the most reliable way to ensure we have the final, saved data.
  const populatedRide = await Ride.findById(ride._id)
    .populate('driver', 'name profilePhoto averageRating vehicleNumber') // Get driver's info
    .populate('rider', 'name profilePhoto'); // Get rider's info

  // 4. Send this fully populated ride object back to the frontend.
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

  if (ride.driver.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to start this ride');
  }

  if (ride.otp !== otp) {
    res.status(400);
    throw new Error('Invalid OTP');
  }

  ride.status = 'in-progress';
  const updatedRide = await ride.save();
  res.json(updatedRide);
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

    ride.status = 'completed';
    // Payment logic (Step 7)
    // In our simulation, we'll just wait for the rider to "pay"
    
    const updatedRide = await ride.save();
    res.json(updatedRide);
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

    ride.paymentStatus = 'paid';
    await ride.save();
    
    // Update driver/rider stats
    await User.findByIdAndUpdate(ride.driver, { $inc: { totalRides: 1 } });
    await User.findByIdAndUpdate(ride.rider, { $inc: { totalRides: 1 } });

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

  // Only the rider or driver can cancel
  const isRider = ride.rider.toString() === req.user._id.toString();
  const isDriver = ride.driver && (ride.driver.toString() === req.user._id.toString());

  if (!isRider && !isDriver) {
    res.status(401);
    throw new Error('Not authorized to cancel this ride');
  }

  // Can only cancel if 'booked' (i.e., before OTP)
  if (ride.status !== 'booked') {
    res.status(400);
    throw new Error('Ride cannot be cancelled at this stage');
  }

  ride.status = 'cancelled';
  const updatedRide = await ride.save();
  res.json(updatedRide);
});

export { 
  createRide, 
  acceptRide, 
  startRide, 
  endRide, 
  payForRide, 
  getRideHistory,
  cancelRide 
};

