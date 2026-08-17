import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const campaigns = await db.campaign.findMany({
      select: { id: true, title: true, slug: true, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to load campaigns' }, { status: 500 });
  }
}
