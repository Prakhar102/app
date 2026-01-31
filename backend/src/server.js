import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import productRoutes from './routes/products.js';

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API is running...');
});


// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
import transactionRoutes from './routes/transactions.js';
import bankAccountRoutes from './routes/bankAccounts.js';
app.use('/api/transactions', transactionRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
