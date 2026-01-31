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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a smart assistant for a fertilizer shop POS system. Extract transaction details from voice commands in Hindi/English.

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

Return ONLY valid JSON, no explanation.`,
          },
          {
            role: 'user',
            content: voiceText,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();
    const parsedData = JSON.parse(data.choices[0].message.content);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Groq AI error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice command' },
      { status: 500 }
    );
  }
}
