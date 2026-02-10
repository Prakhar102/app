import Transaction from '../models/Transaction.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';

export const getDashboardStats = async (req, res) => {
    try {
        const ownerId = req.user.role === 'OWNER' ? req.user.id : req.user.ownerId;

        // Get today's start and end
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // 1. Calculate Today's Sales
        const todayTransactions = await Transaction.find({
            ownerId,
            type: 'SALE',
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        const todaySales = todayTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);

        // 2. Calculate Total Due from All Customers
        const customers = await Customer.find({ ownerId });
        const totalDue = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);

        // 3. Calculate Low Stock Count & Total Products
        const products = await Product.find({ ownerId });
        const totalProducts = products.length;
        const lowStockCount = products.filter(p => p.qty <= p.lowStockThreshold).length;

        res.json({
            success: true,
            stats: {
                todaySales,
                totalDue,
                lowStockCount,
                totalProducts
            }
        });

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};
