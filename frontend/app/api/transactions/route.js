import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import connectDB from '@/lib/mongodb';
import Transaction from '@/lib/models/Transaction';
import Product from '@/lib/models/Product';
import Customer from '@/lib/models/Customer';
import mongoose from 'mongoose';

async function getOwnerId(session) {
  if (session.user.role === 'OWNER') {
    return session.user.id;
  }
  return session.user.ownerId;
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const ownerId = await getOwnerId(session);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');

    const query = { ownerId: new mongoose.Types.ObjectId(ownerId) };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }
    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const ownerId = await getOwnerId(session);
    const transactionData = await request.json();
    console.log('--- DEBUG: POST /api/transactions ---');
    console.log('Incoming paymentMode:', transactionData.paymentMode);
    console.log('Transaction Model Enum:', Transaction.schema.path('paymentMode').enumValues);

    const transaction = await Transaction.create({
      ...transactionData,
      ownerId: new mongoose.Types.ObjectId(ownerId),
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    // Update stock for SALE and PURCHASE
    if (transactionData.type === 'SALE' && transactionData.items) {
      for (const item of transactionData.items) {
        await Product.findOneAndUpdate(
          { ownerId: new mongoose.Types.ObjectId(ownerId), itemName: item.itemName, company: item.company || '' },
          { $inc: { qty: -item.qty } }
        );
      }
    } else if (transactionData.type === 'PURCHASE' && transactionData.items) {
      for (const item of transactionData.items) {
        await Product.findOneAndUpdate(
          { ownerId: new mongoose.Types.ObjectId(ownerId), itemName: item.itemName, company: item.company || '' },
          { $inc: { qty: item.qty } },
          { upsert: false }
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
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
