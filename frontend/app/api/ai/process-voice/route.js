import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { voiceText } = await request.json();
    console.log('Processing voice command:', voiceText); // Debug log

    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `You are a smart assistant for a fertilizer shop POS system. Extract transaction details from voice commands in Hindi/English.

Extract:
- type: "SALE" (default), "PURCHASE", "PAYMENT", or "EXPENSE"
- customerName: customer name
- items: array of {itemName, qty, rate} (for SALE/PURCHASE)
- totalAmount: total amount
- paidAmount: amount paid (0 if udhaar/credit)
- paymentMode: "CASH" or "ONLINE"
- description: for expenses

Examples:
- "Raju ko 10 Urea diya 5000 mein" -> SALE, customerName: "Raju", items: [{itemName: "Urea", qty: 10}], totalAmount: 5000, paidAmount: 5000
- "Mohan ko 20 DAP udhaar" -> SALE, customerName: "Mohan", items: [{itemName: "DAP", qty: 20}], paidAmount: 0
- "500 ka chai ka kharcha" -> EXPENSE, totalAmount: 500, description: "Chai"
- "Ramesh ne 2000 online diye" -> PAYMENT, customerName: "Ramesh", paidAmount: 2000, paymentMode: "ONLINE"
- "50 Urea aaya 25000 mein" -> PURCHASE, items: [{itemName: "Urea", qty: 50}], totalAmount: 25000

Return ONLY valid JSON, no explanation.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser Input: "${voiceText}"`
          }]
        }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error Details:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: data.error?.message || 'Failed to communicate with AI service' },
        { status: response.status }
      );
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Unexpected Gemini API response format:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response format from AI service');
    }

    const parsedData = JSON.parse(data.candidates[0].content.parts[0].text);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Gemini AI error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice command. ' + (error.message || '') },
      { status: 500 }
    );
  }
}
