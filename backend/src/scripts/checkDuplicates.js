import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkDuplicates = async () => {
    try {
        await connectDB();
        console.log('Connected to DB. Checking for duplicates...');

        // Aggregation to find duplicates based on itemName and company
        const duplicates = await Product.aggregate([
            {
                $group: {
                    _id: { itemName: "$itemName", company: "$company" },
                    count: { $sum: 1 },
                    docs: { $push: "$_id" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        if (duplicates.length === 0) {
            console.log("No duplicates found.");
        } else {
            console.log(`Found ${duplicates.length} sets of duplicates:`);
            duplicates.forEach(d => {
                console.log(`- ${d._id.itemName} | ${d._id.company}: ${d.count} copies`);
            });
        }

        process.exit();
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
};

checkDuplicates();
