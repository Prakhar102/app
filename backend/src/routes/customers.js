import express from 'express';
import Customer from '../models/Customer.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const getOwnerId = (user) => {
    if (user.role === 'OWNER') {
        return user.id;
    }
    return user.ownerId;
};

router.get('/', protect, async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const customers = await Customer.find({ ownerId }).sort({ name: 1 });
        res.json({ success: true, customers });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

router.post('/', protect, async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const { name, mobile, address, gstNumber, dealerId } = req.body;

        const customer = await Customer.create({
            ownerId,
            name,
            mobile: mobile || '',
            address: address || '',
            gstNumber: gstNumber || '',
            dealerId: dealerId || '',
            totalDue: 0,
        });

        res.json({ success: true, customer });
    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export default router;
