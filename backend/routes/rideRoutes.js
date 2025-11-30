import express from 'express';
const router = express.Router();
import {
  createRide,
  acceptRide,
  startRide,
  endRide,
  payForRide,
  getRideHistory,
  cancelRide,
  getCurrentRide,
  getPendingRides,
} from '../controllers/rideController.js';
import { protect, driver, rider } from '../middleware/authMiddleware.js'; // Assuming auth middleware

router.use(protect);

router.route('/').post(rider, createRide); // Only riders can create
router.route('/history').get(getRideHistory);
router.route('/current').get(getCurrentRide);
router.route('/requested').get(protect, driver, getPendingRides); 
router.route('/:id/accept').put(driver, acceptRide); // Only drivers can accept
router.route('/:id/start').post(driver, startRide); // Only drivers can start
router.route('/:id/end').put(driver, endRide); // Only drivers can end
router.route('/:id/pay').put(rider, payForRide); // Only riders can pay
router.route('/:id/cancel').put(protect, cancelRide); // 'protect' allows both roles
export default router;