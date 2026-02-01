import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    default: '',
  },
  totalDue: {
    type: Number,
    default: 0,
  },
  address: {
    type: String,
    default: '',
  },
  gstNumber: {
    type: String,
    default: '',
  },
  dealerId: {
    type: String,
    default: '',
    unique: true,
    sparse: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
