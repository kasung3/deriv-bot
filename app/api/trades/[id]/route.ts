export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const tradeId = params.id;
    const body = await request.json();

    const existingTrade = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
    });

    if (!existingTrade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const trade = await prisma.trade.update({
      where: { id: tradeId },
      data: {
        ...body,
        exitTime: body.exitTime ? new Date(body.exitTime) : undefined,
      },
    });

    return NextResponse.json(trade);
  } catch (error) {
    console.error('Update trade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
