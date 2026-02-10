import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const migrate = async () => {
    try {
        await connectDB();

        console.log('Connected to DB. Starting migration...');

        const result = await Product.updateMany(
            { company: 'Harul' },
            { $set: { company: 'HURL' } }
        );

        console.log(`Migration complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

        // Also check if any products have "Harul" in itemName (unlikely based on seed structure but good to check)
        // logic here if needed, but per seed file, Harul is a company.

        process.exit();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
