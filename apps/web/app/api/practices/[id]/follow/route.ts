import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 检查是否已关注
    const existing = await prisma.practiceFollow.findUnique({
      where: {
        practiceId_userId: {
          practiceId: id,
          userId: session.sub,
        },
      },
    });

    if (existing) {
      // 取消关注
      await prisma.practiceFollow.delete({
        where: {
          practiceId_userId: {
            practiceId: id,
            userId: session.sub,
          },
        },
      });
      return NextResponse.json({ following: false });
    } else {
      // 关注
      await prisma.practiceFollow.create({
        data: {
          practiceId: id,
          userId: session.sub,
        },
      });
      return NextResponse.json({ following: true });
    }
  } catch (error: any) {
    console.error('[POST /api/practices/[id]/follow] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle follow' },
      { status: 500 }
    );
  }
}











