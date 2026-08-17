import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError } from '@/lib/errors';

export async function GET() {
  try {
    const prizes = await db.prizeInventory.findMany({
      include: { campaign: true },
    });

    return NextResponse.json({ success: true, prizes });
  } catch (error) {
    return handleApiError(error);
  }
}
