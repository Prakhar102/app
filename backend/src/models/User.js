import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['OWNER', 'STAFF'],
    default: 'OWNER',
  },
  shopConfig: {
    shopName: { type: String, default: 'My Fertilizer Shop' },
    address: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
  },
  resetToken: String,
  resetTokenExpiry: Date,
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
