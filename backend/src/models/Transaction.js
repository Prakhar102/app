import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ['SALE', 'PURCHASE', 'PAYMENT', 'EXPENSE'],
    required: true,
  },
  customerName: {
    type: String,
    default: '',
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  items: [{
    itemName: String,
    qty: Number,
    rate: Number,
    amount: Number,
  }],
  labourCharges: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  dueAmount: {
    type: Number,
    default: 0,
  },
  paymentMode: {
    type: String,
    enum: ['CASH', 'ONLINE', 'SPLIT'],
    default: 'CASH',
  },
  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
  },
  payerName: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  vehicleNumber: {
    type: String,
    default: '',
  },
  isDelivered: {
    type: Boolean,
    default: true,
  },
  payments: [{
    mode: {
      type: String,
      enum: ['CASH', 'ONLINE'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BankAccount',
    },
    payerName: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      // default: Date.now // Removed to prevent overwriting old payments with today's date
    }
  }],
  invoiceNumber: {
    type: Number,
  },
}, {
  timestamps: true,
});

if (mongoose.models.Transaction) {
  delete mongoose.models.Transaction;
}
export default mongoose.model('Transaction', TransactionSchema);
