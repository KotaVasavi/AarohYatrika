import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema(
  {
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    fromZone: { type: String, required: true },
    toZone: { type: String, required: true },
    status: {
      type: String,
      enum: ['requested', 'scheduled', 'booked', 'in-progress', 'completed', 'cancelled'],
      default: 'requested',
    },
    scheduledTime: { type: Date, default: null }, // For "Ride Later"
    otp: { type: String, default: null },
    fare: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  },
  { timestamps: true }
);

// Generate 4-digit OTP before saving a 'booked' ride
rideSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'booked' && !this.otp) {
    this.otp = Math.floor(1000 + Math.random() * 9000).toString();
  }
  next();
});

const Ride = mongoose.model('Ride', rideSchema);
export default Ride;