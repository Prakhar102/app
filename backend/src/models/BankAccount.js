import mongoose from 'mongoose';

const BankAccountSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    accountName: {
        type: String,
        required: true, // e.g., "SBI Savings", "PhonePe", "HDFC Current"
    },
    accountNumber: {
        type: String,
        default: '',
    },
    ifscCode: {
        type: String,
        default: '',
    },
    upiId: {
        type: String,
        default: '',
    },
    openingBalance: {
        type: Number,
        default: 0,
    }
}, {
    timestamps: true,
});

export default mongoose.models.BankAccount || mongoose.model('BankAccount', BankAccountSchema);
