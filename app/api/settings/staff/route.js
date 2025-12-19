import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owner can view staff' }, { status: 403 });
    }

    await connectDB();
    const staff = await User.find({ ownerId: session.user.id, role: 'STAFF' });
    
    return NextResponse.json({ success: true, staff });
  } catch (error) {
    console.error('Get staff error:', error);
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

    if (session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owner can create staff' }, { status: 403 });
    }

    await connectDB();
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
  } catch (error) {
    console.error('Create staff error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
