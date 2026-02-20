export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const tokens = await prisma.apiToken.findMany({
      where: { userId },
      select: {
        id: true,
        tokenType: true,
        token: true,
        createdAt: true,
      },
    });

    type TokenResult = { id: string; tokenType: string; token: string; createdAt: Date };
    const result = {
      demo: tokens.find((t: TokenResult) => t.tokenType === 'demo')?.token || '',
      live: tokens.find((t: TokenResult) => t.tokenType === 'live')?.token || '',
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get tokens error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { tokenType, token } = body;

    if (!tokenType || !token) {
      return NextResponse.json({ error: 'Token type and token are required' }, { status: 400 });
    }

    if (!['demo', 'live'].includes(tokenType)) {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 400 });
    }

    const savedToken = await prisma.apiToken.upsert({
      where: {
        userId_tokenType: {
          userId,
          tokenType,
        },
      },
      update: { token },
      create: { userId, tokenType, token },
    });

    return NextResponse.json({ success: true, tokenType: savedToken.tokenType });
  } catch (error) {
    console.error('Save token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
