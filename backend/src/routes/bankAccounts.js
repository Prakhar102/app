import express from 'express';
import BankAccount from '../models/BankAccount.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const getOwnerId = (user) => {
    if (user.role === 'OWNER') {
        return user.id;
    }
    return user.ownerId;
};

// Get all accounts
router.get('/', protect, async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const accounts = await BankAccount.find({ ownerId }).sort({ accountName: 1 });
        res.json({ success: true, accounts });
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Create new account
router.post('/', protect, async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const { accountName, accountNumber, ifscCode, upiId, openingBalance } = req.body;

        const account = await BankAccount.create({
            ownerId,
            accountName,
            accountNumber,
            ifscCode,
            upiId,
            openingBalance: openingBalance || 0,
        });

        res.json({ success: true, account });
    } catch (error) {
        console.error('Create account error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export default router;
