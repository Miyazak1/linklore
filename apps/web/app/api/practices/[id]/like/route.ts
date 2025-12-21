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

    // 检查是否已点赞
    const existing = await prisma.practiceLike.findUnique({
      where: {
        practiceId_userId: {
          practiceId: id,
          userId: session.sub,
        },
      },
    });

    if (existing) {
      // 取消点赞
      await prisma.practiceLike.delete({
        where: {
          practiceId_userId: {
            practiceId: id,
            userId: session.sub,
          },
        },
      });
      return NextResponse.json({ liked: false });
    } else {
      // 点赞
      await prisma.practiceLike.create({
        data: {
          practiceId: id,
          userId: session.sub,
        },
      });
      return NextResponse.json({ liked: true });
    }
  } catch (error: any) {
    console.error('[POST /api/practices/[id]/like] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle like' },
      { status: 500 }
    );
  }
}











