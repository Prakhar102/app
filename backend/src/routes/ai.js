
import express from 'express';
import Groq from 'groq-sdk';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/process-voice', protect, async (req, res) => {
    try {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY is not configured');
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const { voiceText } = req.body;
        const ownerId = req.user.role === 'OWNER' ? req.user.id : req.user.ownerId;

        if (!voiceText) {
            return res.status(400).json({ error: 'No voice text provided' });
        }

        // Fetch products and customers to give context to AI
        const products = await Product.find({ ownerId }).select('itemName rate company');
        const customers = await Customer.find({ ownerId }).select('name');

        const productList = products.map(p => `${p.itemName} (${p.company || 'Generic'}) - Rs.${p.rate}`).join(', ');
        const customerList = customers.map(c => c.name).join(', ');

        const prompt = `
        You are a billing assistant for a fertilizer shop in India. 
        Extract transaction details from the following Hindi/Hinglish voice command: "${voiceText}"

        Context:
        - Available Products: ${productList}
        - Existing Customers: ${customerList}

        Output JSON format only (no markdown, no explanations):
        {
            "type": "SALE" (default) or "PAYMENT" (if only money is paid) or "PURCHASE",
            "customerName": "string (match from list if possible, else use as is. If 'cash sale' or undefined, leave empty)",
            "items": [
                { "itemName": "string (match from available products)", "qty": number, "rate": number, "amount": number }
            ],
            "totalAmount": number,
            "paidAmount": number (if mentioned, else 0),
            "paymentMode": "CASH" or "ONLINE" (default CASH),
            "description": "string (optional summary)"
        }
        
        Rules:
        1. Auto-calculate amount = qty * rate if not specified.
        2. If rate is not specified in command, use the rate from Available Products.
        3. If customer is not specified, assume it's valid to be empty or "Cash Sale".
        4. If "udhaar" or "due" is mentioned, paidAmount should be 0.
        `;

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that outputs only valid JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
        });

        const text = completion.choices[0]?.message?.content || "";

        // Clean markdown code blocks if present
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data;
        try {
            data = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse Groq response:", text);
            throw new Error("Invalid JSON response from AI");
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('AI Processing Error:', error);
        res.status(500).json({ error: 'Failed to process voice command: ' + error.message });
    }
});

export default router;
