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

    // 检查是否已收藏
    const existing = await prisma.practiceBookmark.findUnique({
      where: {
        practiceId_userId: {
          practiceId: id,
          userId: session.sub,
        },
      },
    });

    if (existing) {
      // 取消收藏
      await prisma.practiceBookmark.delete({
        where: {
          practiceId_userId: {
            practiceId: id,
            userId: session.sub,
          },
        },
      });
      return NextResponse.json({ bookmarked: false });
    } else {
      // 收藏
      await prisma.practiceBookmark.create({
        data: {
          practiceId: id,
          userId: session.sub,
        },
      });
      return NextResponse.json({ bookmarked: true });
    }
  } catch (error: any) {
    console.error('[POST /api/practices/[id]/bookmark] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle bookmark' },
      { status: 500 }
    );
  }
}











