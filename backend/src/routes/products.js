import express from 'express';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const getOwnerId = (user) => {
    if (user.role === 'OWNER') {
        return user.id;
    }
    return user.ownerId;
};

// GET /api/products
router.get('/', protect, async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const products = await Product.find({ ownerId }).sort({ itemName: 1 });
        res.json({ success: true, products });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// POST /api/products
router.post('/', protect, async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const { itemName, qty, rate, unit, lowStockThreshold } = req.body;

        const product = await Product.create({
            ownerId,
            itemName,
            qty,
            rate,
            unit: unit || 'Kg',
            lowStockThreshold: lowStockThreshold || 10,
        });

        res.json({ success: true, product });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// POST /api/products/update
router.post('/update', protect, async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const { productId, ...updateData } = req.body;

        const product = await Product.findOneAndUpdate(
            { _id: productId, ownerId },
            updateData,
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ success: true, product });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// POST /api/products/delete
router.post('/delete', protect, async (req, res) => {
    try {
        if (req.user.role !== 'OWNER') {
            return res.status(403).json({ error: 'Only owner can delete products' });
        }

        const ownerId = getOwnerId(req.user);
        const { productId } = req.body;

        await Product.findOneAndDelete({ _id: productId, ownerId });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export default router;
