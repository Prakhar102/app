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

        const customersWithDues = await Customer.find({
            ownerId,
            totalDue: { $gt: 0 }
        })
            .sort({ totalDue: -1 })
            .select('name mobile totalDue address');

        return NextResponse.json({
            success: true,
            customers: customersWithDues
        });
    } catch (error) {
        console.error('Get dues error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
