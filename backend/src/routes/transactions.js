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
            payments,
            description,
            labourCharges,
            vehicleNumber,
            isDelivered,
            date
        } = req.body;

        // Prepare payments array with correct dates and filter zero amounts
        const processedPayments = (payments || [])
            .filter(p => p.amount > 0)
            .map(p => ({
                ...p,
                date: date ? new Date(date) : new Date() // Use bill date for initial payments
            }));

        // Handle single payment mode logic if used
        const mainPaymentAmount = parseFloat(paidAmount) || 0;
        if (paymentMode !== 'SPLIT' && mainPaymentAmount > 0 && processedPayments.length === 0) {
            processedPayments.push({
                mode: paymentMode,
                amount: mainPaymentAmount,
                bankAccountId: paymentMode === 'ONLINE' ? bankAccountId : null,
                payerName: paymentMode === 'ONLINE' ? (req.body.payerName || '') : '',
                date: date ? new Date(date) : new Date()
            });
        }

        // Create Transaction
        const transaction = await Transaction.create({
            ownerId,
            createdBy: req.user.id,
            type,
            customerName,
            customerId,
            items,
            labourCharges: parseFloat(labourCharges) || 0,
            vehicleNumber: vehicleNumber || '',
            isDelivered: typeof isDelivered === 'boolean' ? isDelivered : true,
            totalAmount,
            paidAmount,
            dueAmount,
            paymentMode: (processedPayments.length > 1) ? 'SPLIT' : paymentMode,
            bankAccountId: paymentMode === 'ONLINE' ? bankAccountId : null,
            payments: processedPayments,
            description,
            invoiceNumber,
            date: date ? new Date(date) : new Date()
        });

        console.log('New Transaction Created:', {
            id: transaction._id,
            mode: transaction.paymentMode
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
                // Find product by name, company, and owner to decrement stock correctly
                const query = { ownerId, itemName: item.itemName };
                if (item.company) {
                    query.company = item.company;
                }

                await Product.findOneAndUpdate(
                    query,
                    { $inc: { qty: -1 * (item.qty || 0) } }
                );
            }
        }

        const populatedTransaction = await Transaction.findById(transaction._id)
            .populate('customerId')
            .populate('bankAccountId', 'accountName')
            .populate('payments.bankAccountId', 'accountName');

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
            .populate('customerId')
            .populate('bankAccountId', 'accountName')
            .populate('payments.bankAccountId', 'accountName')
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
            .populate('customerId')
            .populate('bankAccountId', 'accountName')
            .populate('payments.bankAccountId', 'accountName')
            .sort({ date: -1 });

        res.json({ success: true, transactions });
    } catch (error) {
        console.error('Get customer transactions error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Update a specific transaction (e.g., clear due for a specific bill)
router.patch('/:id', protect, async (req, res) => {
    try {
        const ownerId = getOwnerId(req.user);
        const { id } = req.params;
        const { payments, description, date } = req.body;

        const transaction = await Transaction.findOne({ _id: id, ownerId });
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const oldDue = transaction.dueAmount;

        // Ensure legacy payments have a date BEFORE we save (prevents Date.now overwrite)
        if (transaction.payments && transaction.payments.length > 0) {
            transaction.payments.forEach(p => {
                if (!p.date) {
                    p.date = transaction.date; // Use original bill date for legacy payments
                }
            });
        }

        // Handle new payments
        if (payments && Array.isArray(payments) && payments.length > 0) {
            let additionalPaid = 0;
            const newPaymentEntries = payments
                .filter(p => parseFloat(p.amount) > 0) // Filter zero amounts
                .map(p => {
                    const amount = parseFloat(p.amount) || 0;
                    additionalPaid += amount;
                    return {
                        mode: p.mode || 'CASH',
                        amount: amount,
                        bankAccountId: p.mode === 'ONLINE' ? p.bankAccountId : null,
                        payerName: p.mode === 'ONLINE' ? p.payerName : null,
                        // Use explicitly provided date for new payments, fallback to NOW only if strictly necessary
                        date: date ? new Date(date) : new Date()
                    };
                });

            transaction.payments = [...(transaction.payments || []), ...newPaymentEntries];
            transaction.paidAmount = (transaction.paidAmount || 0) + additionalPaid;
            transaction.dueAmount = Math.max(0, transaction.totalAmount - transaction.paidAmount);

            // Auto-set SPLIT mode if it wasn't already and we now have multiple modes or entries
            if (transaction.payments.length > 1) {
                transaction.paymentMode = 'SPLIT';
            } else if (newPaymentEntries.length === 1 && !transaction.payments.length) {
                transaction.paymentMode = newPaymentEntries[0].mode;
                transaction.bankAccountId = newPaymentEntries[0].bankAccountId;
            }
        }

        if (description) transaction.description = description;
        // if (date) transaction.date = new Date(date); // Keep original bill date

        await transaction.save();

        // Update Customer Total Due
        const dueChange = transaction.dueAmount - oldDue;
        if (transaction.customerId && dueChange !== 0) {
            await Customer.findByIdAndUpdate(transaction.customerId, {
                $inc: { totalDue: dueChange }
            });
        }

        const populatedTransaction = await Transaction.findById(transaction._id)
            .populate('customerId')
            .populate('bankAccountId', 'accountName')
            .populate('payments.bankAccountId', 'accountName');

        res.json({ success: true, transaction: populatedTransaction });
    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export default router;
