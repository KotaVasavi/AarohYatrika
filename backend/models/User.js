import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['rider', 'driver'], required: true },
    vehicleNumber: { type: String, default: null },
    isVerified: { type: Boolean, default: false }, // Women-only verification badge
    verificationProof: { type: String }, // e.g., link to social profile
    profilePhoto: { type: String, default: '/images/default-avatar.png' },
    averageRating: { type: Number, default: 5 },
    totalRides: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Password hashing middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Password matching method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;