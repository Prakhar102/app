import express from 'express';
import Transaction from '../models/Transaction.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import BankAccount from '../models/BankAccount.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const getOwnerId = (user) => {
    if (user.role === 'OWNER') {
        return user.id;
    }
    return user.ownerId;
};

// Create a new transaction (Save Bill)
router.post('/', protect, async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const {
            type,
            customerName,
            customerId,
            items,
            totalAmount,
            paidAmount,
            dueAmount,
            paymentMode,
            bankAccountId,
            description
        } = req.body;

        // Create Transaction
        const transaction = await Transaction.create({
            ownerId,
            createdBy: req.user.id,
            type,
            customerName,
            customerId,
            items,
            totalAmount,
            paidAmount,
            dueAmount,
            paymentMode,
            bankAccountId: paymentMode === 'ONLINE' ? bankAccountId : null,
            description,
            date: new Date()
        });

        console.log('New Transaction Created:', {
            id: transaction._id,
            mode: transaction.paymentMode,
            bankAccId: transaction.bankAccountId
        });

        // Update Customer Due Amount if applicable
        if (customerId && dueAmount !== 0) {
            await Customer.findByIdAndUpdate(customerId, {
                $inc: { totalDue: dueAmount }
            });
        }

        // Update Product Stock (Simple decrement based on itemName match)
        // Note: In a real app, we should use product IDs.
        // Assuming items have itemName.
        if (type === 'SALE' && items && items.length > 0) {
            for (const item of items) {
                // Find product by name and owner
                await Product.findOneAndUpdate(
                    { ownerId, itemName: item.itemName },
                    { $inc: { qty: -1 * (item.qty || 0) } }
                );
            }
        }

        const populatedTransaction = await Transaction.findById(transaction._id)
            .populate('bankAccountId', 'accountName');

        res.json({ success: true, transaction: populatedTransaction });
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Get all transactions
router.get('/', protect, async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const transactions = await Transaction.find({ ownerId })
            .populate('bankAccountId', 'accountName')
            .sort({ date: -1 })
            .limit(100); // Limit to last 100 for now
        res.json({ success: true, transactions });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Get transactions for a specific customer
router.get('/customer/:customerId', protect, async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const { customerId } = req.params;

        const transactions = await Transaction.find({ ownerId, customerId })
            .populate('bankAccountId', 'accountName')
            .sort({ date: -1 });

        res.json({ success: true, transactions });
    } catch (error) {
        console.error('Get customer transactions error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export default router;
