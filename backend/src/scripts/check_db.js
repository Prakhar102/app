import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const check = async () => {
    try {
        await connectDB();
        let report = 'Connected to DB\n';

        const users = await User.find({});
        report += `Found ${users.length} users:\n`;

        for (const user of users) {
            const count = await Product.countDocuments({ ownerId: user._id });
            report += `- User: ${user.name} (${user.email}) Role: ${user.role} ID: ${user._id} -> Products: ${count}\n`;
        }

        const totalProductCount = await Product.countDocuments({});
        report += `Total Products in DB: ${totalProductCount}\n`;

        fs.writeFileSync(path.join(__dirname, 'db_report.txt'), report);
        console.log('Report written to db_report.txt');

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

check();
