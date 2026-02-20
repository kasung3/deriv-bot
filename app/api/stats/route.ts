export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Trade } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    const allTrades = await prisma.trade.findMany({
      where: { userId, result: { in: ['WIN', 'LOSS'] } },
      orderBy: { createdAt: 'desc' },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTrades = allTrades.filter((t: Trade) => new Date(t.createdAt) >= todayStart);

    const allTimeProfit = allTrades.reduce((sum: number, t: Trade) => sum + (t.profit || 0), 0);
    const sessionProfit = todayTrades.reduce((sum: number, t: Trade) => sum + (t.profit || 0), 0);
    const wins = allTrades.filter((t: Trade) => t.result === 'WIN').length;
    const losses = allTrades.filter((t: Trade) => t.result === 'LOSS').length;
    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    // Balance history - last 20 trades
    const recentTrades = allTrades.slice(0, 20).reverse();
    let runningBalance = 0;
    const balanceHistory = recentTrades.map((t: Trade) => {
      runningBalance += t.profit || 0;
      return {
        time: t.createdAt,
        balance: runningBalance,
      };
    });

    return NextResponse.json({
      allTimeProfit: Math.round(allTimeProfit * 100) / 100,
      sessionProfit: Math.round(sessionProfit * 100) / 100,
      wins,
      losses,
      winRate: Math.round(winRate * 100) / 100,
      totalTrades,
      balanceHistory,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
