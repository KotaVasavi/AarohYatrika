import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 1. Get token from header
      token = req.headers.authorization.split(' ')[1];

      // 2. Verify token
      if (!process.env.JWT_SECRET) {
        throw new Error('Server is missing JWT_SECRET');
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Get user from token's ID
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('User not found, token may be invalid');
      }

      next(); // Success!
    } catch (error) {
      console.error('TOKEN ERROR:', error.message); // Log the specific error
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const driver = (req, res, next) => {
  if (req.user && req.user.role === 'driver') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as a driver');
  }
};

const rider = (req, res, next) => {
  if (req.user && req.user.role === 'rider') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as a rider');
  }
};

export { protect, driver, rider };