import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const productsData = {
    "Urea": ["IPL", "Uttam", "Matrix", "Kisan", "HURL", "Sardar", "KRIBHCO", "RCF", "BBCL"],
    "DAP": ["IPL", "Kisan", "KRIBHCO", "Sardar", "Uttam", "HURL", "PPL", "Paras", "RCF"],
    "MOP (Potash)": ["Matrix", "IPL", "Kisan", "Sardar", "Uttam", "Paras", "Mosaic"],
    "Zinc": ["Paras", "PPL", "Kisan", "Matrix", "BBCL", "Uttam", "IPL"],
    "Boron": ["Paras", "Shriram"],
    "Sulphur": ["Uttam", "Kisan"],
    "Magnesium": ["Uttam", "HURL", "Kisan"],
    "Calcium": ["Mukta", "BBCL", "HURL", "Uttam", "Matrix", "Yara", "Mosaic", "Paras"],
    "NPK": ["Paras", "Kisan", "Uttam", "PPL", "IPL", "Matrix", "HURL", "BBCL", "Mukta"],
    "SSP": ["Paras", "Khaitan", "HURL", "IPL", "PPL"],
    "Polyhalite": ["IPL"],
    "TSP": ["HURL", "PPL", "IPL"],
    "Zyam": ["Paras", "PPL", "Matrix", "HURL", "Uttam", "Kisan"],
    "Apna Power": ["HURL", "Uttam"],
    "Micro Raja": ["PPL"],
    "Jaivik Khali": ["Paras", "Kisan", "Dayal"],
    "Neem Khali": ["SPIC"],
    "Wheat Seed": ["Shriram", "Pantnagar", "Shreedha", "Sardar", "Kisan", "Uttam", "KRIBHCO", "Sonali Gold", "Nandini"]
};

const seed = async () => {
    try {
        await connectDB();

        // Find the primary owner
        const owner = await User.findOne({ role: 'OWNER' });
        if (!owner) {
            console.error('No OWNER user found in database. Please create a user first.');
            process.exit(1);
        }

        console.log(`Using owner: ${owner.name} (${owner.email})`);

        let count = 0;
        for (const [itemName, companies] of Object.entries(productsData)) {
            for (const company of companies) {
                // Upsert to avoid duplicates
                const existing = await Product.findOne({
                    ownerId: owner._id,
                    itemName,
                    company
                });

                if (!existing) {
                    await Product.create({
                        ownerId: owner._id,
                        itemName,
                        company,
                        qty: 0,
                        rate: 0,
                        unit: 'Bag',
                        lowStockThreshold: 10
                    });
                    count++;
                }
            }
        }

        console.log(`Successfully seeded ${count} new products!`);
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
