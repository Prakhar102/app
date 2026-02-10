import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/db.js';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const removeDuplicates = async () => {
    try {
        await connectDB();
        console.log('Connected to DB. Removing duplicates...');

        const duplicates = await Product.aggregate([
            {
                $group: {
                    _id: { itemName: "$itemName", company: "$company" },
                    count: { $sum: 1 },
                    docs: { $push: "$_id" } // Push all IDs
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        if (duplicates.length === 0) {
            console.log("No duplicates found to remove.");
        } else {
            console.log(`Found ${duplicates.length} sets of duplicates. Processing...`);

            for (const d of duplicates) {
                // Determine which ID to keep. 
                // Strategy: Keep the first one? Or check timestamps?
                // Let's check timestamps of these docs to be safe, or just keep the first one found.
                // For simplicity here, we'll keep the first ID and delete the rest.

                const [keepId, ...deleteIds] = d.docs;

                console.log(`Keeping ${keepId} for ${d._id.itemName} | ${d._id.company}, deleting ${deleteIds.length} others.`);

                await Product.deleteMany({ _id: { $in: deleteIds } });
            }
            console.log("Deduplication complete.");
        }

        process.exit();
    } catch (error) {
        console.error('Deduplication failed:', error);
        process.exit(1);
    }
};

removeDuplicates();
