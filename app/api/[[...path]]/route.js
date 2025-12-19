import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Product from '@/lib/models/Product';
import Customer from '@/lib/models/Customer';
import Transaction from '@/lib/models/Transaction';
import bcrypt from 'bcryptjs';
import { sendOTPEmail, sendWelcomeEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

// Helper function to get owner ID
async function getOwnerId(session) {
  if (session.user.role === 'OWNER') {
    return session.user.id;
  }
  return session.user.ownerId;
}

// ==================== AUTH ROUTES ====================

// POST /api/auth/signup
export async function POST(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    await connectDB();

    // Signup
    if (path === '/api/auth/signup') {
      const { name, email, password, mobile } = await request.json();

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists' },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        mobile,
        role: 'OWNER',
      });

      // Send welcome email
      await sendWelcomeEmail(email, name);

      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        userId: user._id,
      });
    }

    // Forgot Password - Send OTP
    if (path === '/api/auth/forgot-password') {
      const { email } = await request.json();

      const user = await User.findOne({ email });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const resetToken = uuidv4();
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store OTP and token
      user.resetToken = `${resetToken}:${otp}`;
      user.resetTokenExpiry = resetTokenExpiry;
      await user.save();

      // Send OTP email
      const emailResult = await sendOTPEmail(email, otp);

      if (!emailResult.success) {
        return NextResponse.json(
          { error: 'Failed to send OTP email' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent to your email',
        resetToken,
      });
    }

    // Verify OTP and Reset Password
    if (path === '/api/auth/reset-password') {
      const { resetToken, otp, newPassword } = await request.json();

      const user = await User.findOne({
        resetToken: { $regex: `^${resetToken}:` },
        resetTokenExpiry: { $gt: new Date() },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      // Verify OTP
      const [, storedOTP] = user.resetToken.split(':');
      if (storedOTP !== otp) {
        return NextResponse.json(
          { error: 'Invalid OTP' },
          { status: 400 }
        );
      }

      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();

      return NextResponse.json({
        success: true,
        message: 'Password reset successful',
      });
    }

    // ==================== PRODUCTS ====================

    if (path === '/api/products') {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const ownerId = await getOwnerId(session);
      const { itemName, qty, rate, unit, lowStockThreshold } = await request.json();

      const product = await Product.create({
        ownerId,
        itemName,
        qty,
        rate,
        unit: unit || 'Kg',
        lowStockThreshold: lowStockThreshold || 10,
      });

      return NextResponse.json({ success: true, product });
    }

    if (path === '/api/products/update') {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const ownerId = await getOwnerId(session);
      const { productId, ...updateData } = await request.json();

      const product = await Product.findOneAndUpdate(
        { _id: productId, ownerId },
        updateData,
        { new: true }
      );

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, product });
    }

    if (path === '/api/products/delete') {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Only owner can delete
      if (session.user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Only owner can delete products' }, { status: 403 });
      }

      const ownerId = await getOwnerId(session);
      const { productId } = await request.json();

      await Product.findOneAndDelete({ _id: productId, ownerId });

      return NextResponse.json({ success: true });
    }

    // ==================== CUSTOMERS ====================

    if (path === '/api/customers') {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const ownerId = await getOwnerId(session);
      const { name, mobile, address } = await request.json();

      const customer = await Customer.create({
        ownerId,
        name,
        mobile: mobile || '',
        address: address || '',
        totalDue: 0,
      });

      return NextResponse.json({ success: true, customer });
    }

    if (path === '/api/customers/update') {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const ownerId = await getOwnerId(session);
      const { customerId, ...updateData } = await request.json();

      const customer = await Customer.findOneAndUpdate(
        { _id: customerId, ownerId },
        updateData,
        { new: true }
      );

      return NextResponse.json({ success: true, customer });
    }

    // ==================== TRANSACTIONS ====================

    if (path === '/api/transactions') {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const ownerId = await getOwnerId(session);
      const transactionData = await request.json();

      // Create transaction
      const transaction = await Transaction.create({
        ...transactionData,
        ownerId,
        createdBy: session.user.id,
      });

      // Update stock for SALE and PURCHASE
      if (transactionData.type === 'SALE' && transactionData.items) {
        for (const item of transactionData.items) {
          await Product.findOneAndUpdate(
            { ownerId, itemName: item.itemName },
            { $inc: { qty: -item.qty } }
          );
        }
      } else if (transactionData.type === 'PURCHASE' && transactionData.items) {
        for (const item of transactionData.items) {
          await Product.findOneAndUpdate(
            { ownerId, itemName: item.itemName },
            { $inc: { qty: item.qty } }
          );
        }
      }

      // Update customer due
      if (transactionData.customerId) {
        if (transactionData.type === 'SALE') {
          await Customer.findByIdAndUpdate(transactionData.customerId, {
            $inc: { totalDue: transactionData.dueAmount },
          });
        } else if (transactionData.type === 'PAYMENT') {
          await Customer.findByIdAndUpdate(transactionData.customerId, {
            $inc: { totalDue: -transactionData.paidAmount },
          });
        }
      }

      return NextResponse.json({ success: true, transaction });
    }

    if (path === '/api/transactions/delete') {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Only owner can delete
      if (session.user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Only owner can delete transactions' }, { status: 403 });
      }

      const ownerId = await getOwnerId(session);
      const { transactionId } = await request.json();

      const transaction = await Transaction.findOneAndDelete({ _id: transactionId, ownerId });

      if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

      // Reverse stock changes
      if (transaction.type === 'SALE' && transaction.items) {
        for (const item of transaction.items) {
          await Product.findOneAndUpdate(
            { ownerId, itemName: item.itemName },
            { $inc: { qty: item.qty } }
          );
        }
      }

      // Reverse customer due
      if (transaction.customerId) {
        if (transaction.type === 'SALE') {
          await Customer.findByIdAndUpdate(transaction.customerId, {
            $inc: { totalDue: -transaction.dueAmount },
          });
        } else if (transaction.type === 'PAYMENT') {
          await Customer.findByIdAndUpdate(transaction.customerId, {
            $inc: { totalDue: transaction.paidAmount },
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    // ==================== SETTINGS ====================

    if (path === '/api/settings/update') {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { shopConfig } = await request.json();

      const user = await User.findByIdAndUpdate(
        session.user.id,
        { shopConfig },
        { new: true }
      );

      return NextResponse.json({ success: true, user });
    }

    if (path === '/api/settings/staff') {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Only owner can create staff
      if (session.user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Only owner can create staff' }, { status: 403 });
      }

      const { name, email, password, mobile } = await request.json();

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const staff = await User.create({
        name,
        email,
        password: hashedPassword,
        mobile,
        role: 'STAFF',
        ownerId: session.user.id,
      });

      return NextResponse.json({ success: true, staff });
    }

    // ==================== AI VOICE ====================

    if (path === '/api/ai/process-voice') {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { voiceText } = await request.json();

      try {
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

    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET routes
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const ownerId = await getOwnerId(session);

    // Get all products
    if (path === '/api/products') {
      const products = await Product.find({ ownerId }).sort({ itemName: 1 });
      return NextResponse.json({ success: true, products });
    }

    // Get all customers
    if (path === '/api/customers') {
      const customers = await Customer.find({ ownerId }).sort({ name: 1 });
      return NextResponse.json({ success: true, customers });
    }

    // Get all transactions
    if (path === '/api/transactions') {
      const { startDate, endDate, type } = Object.fromEntries(url.searchParams);
      
      const query = { ownerId };
      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      if (type) {
        query.type = type;
      }

      const transactions = await Transaction.find(query).sort({ date: -1 });
      return NextResponse.json({ success: true, transactions });
    }

    // Get dashboard stats
    if (path === '/api/dashboard/stats') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaySales = await Transaction.aggregate([
        {
          $match: {
            ownerId: session.user.role === 'OWNER' ? session.user.id : session.user.ownerId,
            type: 'SALE',
            date: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
          },
        },
      ]);

      const totalDue = await Customer.aggregate([
        {
          $match: { ownerId: session.user.role === 'OWNER' ? session.user.id : session.user.ownerId },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalDue' },
          },
        },
      ]);

      const lowStockProducts = await Product.find({
        ownerId,
        $expr: { $lte: ['$qty', '$lowStockThreshold'] },
      });

      const totalProducts = await Product.countDocuments({ ownerId });

      return NextResponse.json({
        success: true,
        stats: {
          todaySales: todaySales[0]?.total || 0,
          totalDue: totalDue[0]?.total || 0,
          lowStockCount: lowStockProducts.length,
          totalProducts,
        },
      });
    }

    // Get user settings
    if (path === '/api/settings') {
      const user = await User.findById(session.user.id);
      return NextResponse.json({ success: true, user });
    }

    // Get staff list
    if (path === '/api/settings/staff') {
      if (session.user.role !== 'OWNER') {
        return NextResponse.json({ error: 'Only owner can view staff' }, { status: 403 });
      }

      const staff = await User.find({ ownerId: session.user.id, role: 'STAFF' });
      return NextResponse.json({ success: true, staff });
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
