import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';

const commentSchema = z.object({
  content: z.string().min(1),
  parentId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const comments = await prisma.practiceComment.findMany({
      where: {
        practiceId: id,
        deletedAt: null,
        parentId: null, // 只获取顶级评论
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        replies: {
          where: { deletedAt: null },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ comments });
  } catch (error: any) {
    console.error('[GET /api/practices/[id]/comments] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

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
    const body = await req.json();
    const data = commentSchema.parse(body);

    // 计算深度
    let depth = 0;
    if (data.parentId) {
      const parent = await prisma.practiceComment.findUnique({
        where: { id: data.parentId },
        select: { depth: true },
      });
      depth = parent ? parent.depth + 1 : 1;
    }

    const comment = await prisma.practiceComment.create({
      data: {
        practiceId: id,
        authorId: session.sub,
        content: data.content,
        parentId: data.parentId,
        depth,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/practices/[id]/comments] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create comment' },
      { status: 500 }
    );
  }
}











