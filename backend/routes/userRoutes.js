import express from 'express';
const router = express.Router();
import {
  getUserProfile,
  updateUserProfile,
  submitRating,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

// All these routes are protected, meaning user must be logged in
router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.post('/rate', protect, submitRating);

export default router;