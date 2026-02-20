import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTradingStatus } from '@/lib/server-trading';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const status = await getTradingStatus(userId);
    
    if (!status) {
      return NextResponse.json({
        isActive: false,
        status: 'STOPPED',
        market: 'R_10',
        accountType: 'demo',
        currentStake: 1,
        consecutiveLosses: 0,
        sessionProfit: 0,
        balance: 0,
        lastSignal: 'Not started',
      });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Failed to get trading status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
