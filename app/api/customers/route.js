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

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const ownerId = await getOwnerId(session);
    const customers = await Customer.find({ ownerId }).sort({ name: 1 });
    
    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error('Get customers error:', error);
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
    const { name, mobile, address } = await request.json();

    const customer = await Customer.create({
      ownerId,
      name,
      mobile: mobile || '',
      address: address || '',
      totalDue: 0,
    });

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
