import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { voiceText, products = [], customers = [] } = await request.json();
    console.log('Processing voice command:', voiceText);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY not found in environment');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Create STRICT product list with Item + Company for context
    const productListForAI = products.map(p => {
      const companyStr = p.company ? ` (Company: ${p.company})` : '';
      return `${p.itemName}${companyStr}`;
    }).slice(0, 100).join(' | ');

    // Create customer context
    const customerContext = customers.length > 0
      ? customers.map(c => c.name).slice(0, 40).join(', ')
      : '';

    const systemPrompt = `तुम एक खाद दुकान (Fertilizer Shop) के AI billing assistant हो। तुम्हारा काम Voice data से Billing JSON बनाना है।

🚨🚨🚨 CRITICAL RULES - इनको कभी मत तोड़ना 🚨🚨🚨

1. 🚫 NO GUESSING ITEMS: सिर्फ वही आइटम लिखो जो User ने साफ़-साफ़ बोला है।
2. 🚫 NO AUTOPILOT: अपनी मर्जी से कोई एक्स्ट्रा आइटम (extra item) मत डालो।
3. 📦 DATABASE PRODUCTS: [${productListForAI || 'Urea | DAP | MOP | Zinc'}]
4. 👥 KNOWN CUSTOMERS: [${customerContext || 'Empty'}]

═══════════════════════════════════════════════════════════════
💰 EXTRACTION RULES (बहुत ज़रूरी)
═══════════════════════════════════════════════════════════════

【PAYMENT/DEPOSIT - जमा राशि】 
- User जब बोले "jama", "pay kiya", "payment", "diya", "cash", "advance", "baaki" - तो उस number को "paidAmount" में डालो।
- Examples: 
  - "3000 jama" ➔ paidAmount: 3000
  - "teen hazaar jama kar lo" ➔ paidAmount: 3000
  - "paanch sau pay kiya" ➔ paidAmount: 500
  - "saara cash de diya" ➔ paidAmount = totalAmount

【LABOUR/LOADING/CHARGES - मजदूरी】
- "loading", "mazdoori", "kharcha", "palledari", "bhada", "rupiya loading"
- Examples: "50 rupiya loading" ➔ labourCharges: 50

【QUANTITY - मात्रा】
- "100 bora", "sau bag", "dedh sau bori" ➔ qty: 100, 100, 150 respectively.

⚠️ PRODUCT MATCHING:
- Items सिर्फ DATABASE PRODUCTS लिस्ट से ही होने चाहिए।

═══════════════════════════════════════════════════════════════
📋 OUTPUT FORMAT (ONLY JSON):
═══════════════════════════════════════════════════════════════
{
  "type": "SALE",
  "customerName": "exact name or empty",
  "isCustomerKnown": boolean,
  "items": [
    { "itemName": "Exact Name from List", "company": "Company from List", "qty": number, "rate": number, "amount": number }
  ],
  "totalAmount": number,
  "paidAmount": number,
  "dueAmount": number,
  "paymentMode": "CASH" | "ONLINE",
  "labourCharges": number
}

═══════════════════════════════════════════════════════════════
📝 EXAMPLES (BE ACCURATE):
═══════════════════════════════════════════════════════════════
INPUT: "Naya Kisan Urea 50 bag, 3000 jama"
OUTPUT: {"type":"SALE","customerName":"Naya Kisan","isCustomerKnown":false,"items":[{"itemName":"Urea","company":"","qty":50, "rate":0, "amount":0}],"totalAmount":0,"paidAmount":3000,"dueAmount":0,"paymentMode":"CASH","labourCharges":0}

INPUT: "Ram Singh ko 10 DAP Harul, 50 rupiya loading, sab cash/jama"
OUTPUT: {"type":"SALE","customerName":"Ram Singh","isCustomerKnown":true,"items":[{"itemName":"DAP","company":"Harul","qty":10, "rate":0, "amount":0}],"totalAmount":0,"paidAmount":0,"dueAmount":0,"paymentMode":"CASH","labourCharges":50}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: voiceText }
        ],
        temperature: 0,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API Error:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: data.error?.message || 'Failed to communicate with AI service' },
        { status: response.status }
      );
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected Groq API response:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response format from AI service');
    }

    const parsedData = JSON.parse(data.choices[0].message.content);
    console.log('Parsed voice data:', parsedData);

    // Normalize and validate all fields
    const normalizedData = {
      type: 'SALE',
      customerName: (parsedData.customerName || '').trim(),
      isCustomerKnown: parsedData.isCustomerKnown !== undefined ? parsedData.isCustomerKnown : true,
      items: (parsedData.items || []).map(item => ({
        itemName: (item.itemName || '').trim(),
        company: (item.company || '').trim(),
        qty: Number(item.qty) || 0,
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || (Number(item.qty) * Number(item.rate)) || 0
      })).filter(it => it.itemName !== '' && it.qty > 0),
      totalAmount: Number(parsedData.totalAmount) || 0,
      paidAmount: Number(parsedData.paidAmount) || 0,
      dueAmount: Number(parsedData.dueAmount) || 0,
      paymentMode: parsedData.paymentMode || 'CASH',
      labourCharges: Number(parsedData.labourCharges) || 0
    };

    // Auto-calculate if needed
    if (normalizedData.items.length > 0 || normalizedData.labourCharges > 0) {
      const itemsTotal = normalizedData.items.reduce((sum, item) => sum + item.amount, 0);
      if (normalizedData.totalAmount === 0) {
        normalizedData.totalAmount = itemsTotal + normalizedData.labourCharges;
      }

      // If paidAmount is very close to or equals totalAmount but was set as 0, 
      // check if user meant "sab jama" or "online"
      if (normalizedData.paidAmount === 0 && (voiceText.toLowerCase().includes('jama') || voiceText.toLowerCase().includes('cash') || voiceText.toLowerCase().includes('online'))) {
        // This is a safety check if AI missed the paidAmount but saw the keyword
      }

      if (normalizedData.dueAmount === 0 && normalizedData.totalAmount > normalizedData.paidAmount) {
        normalizedData.dueAmount = normalizedData.totalAmount - normalizedData.paidAmount;
      }
    }

    return NextResponse.json({ success: true, data: normalizedData });
  } catch (error) {
    console.error('Groq AI error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice command. ' + (error.message || '') },
      { status: 500 }
    );
  }
}
