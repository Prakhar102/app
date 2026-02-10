import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get user settings (shop config)
// @route   GET /api/settings
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                shopConfig: user.shopConfig,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Settings Fetch Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @desc    Update user settings (shop config)
// @route   PUT /api/settings
// @access  Private
router.put('/', protect, async (req, res) => {
    try {
        const { shopName, address, logoUrl, gstNumber } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Update fields
        if (shopName) user.shopConfig.shopName = shopName;
        if (address) user.shopConfig.address = address;
        if (logoUrl) user.shopConfig.logoUrl = logoUrl;
        if (gstNumber) user.shopConfig.gstNumber = gstNumber;

        await user.save();

        res.json({
            success: true,
            user: {
                shopConfig: user.shopConfig,
                name: user.name,
                email: user.email,
                role: user.role
            },
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Settings Update Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

export default router;
