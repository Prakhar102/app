import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import connectDB from '@/lib/mongodb';
import Transaction from '@/lib/models/Transaction';
import Customer from '@/lib/models/Customer';
import Product from '@/lib/models/Product';
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
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = await Transaction.aggregate([
      {
        $match: {
          ownerId: ownerObjectId,
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
        $match: { ownerId: ownerObjectId },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalDue' },
        },
      },
    ]);

    const lowStockProducts = await Product.find({
      ownerId: ownerObjectId,
      $expr: { $lte: ['$qty', '$lowStockThreshold'] },
    });

    const totalProducts = await Product.countDocuments({ ownerId: ownerObjectId });

    return NextResponse.json({
      success: true,
      stats: {
        todaySales: todaySales[0]?.total || 0,
        totalDue: totalDue[0]?.total || 0,
        lowStockCount: lowStockProducts.length,
        totalProducts,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
