import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import connectDB from '@/lib/mongodb';
import Customer from '@/lib/models/Customer';

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

    await connectDB();
    const ownerId = await getOwnerId(session);
    const { customerId, ...updateData } = await request.json();

    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, ownerId },
      updateData,
      { new: true }
    );

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
