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

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owner can delete transactions' }, { status: 403 });
    }

    await connectDB();
    const ownerId = await getOwnerId(session);
    const { transactionId } = await request.json();

    const transaction = await Transaction.findOneAndDelete({
      _id: transactionId,
      ownerId: new mongoose.Types.ObjectId(ownerId),
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Reverse stock changes
    if (transaction.type === 'SALE' && transaction.items) {
      for (const item of transaction.items) {
        await Product.findOneAndUpdate(
          { ownerId: new mongoose.Types.ObjectId(ownerId), itemName: item.itemName },
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
  } catch (error) {
    console.error('Delete transaction error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
