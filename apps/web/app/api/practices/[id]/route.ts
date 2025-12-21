import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

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

    const practice = await prisma.practice.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        mediaFiles: {
          orderBy: { order: 'asc' },
        },
        theoryReferences: {
          orderBy: { position: 'asc' },
        },
        aiAnalysis: true,
        consensus: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true,
            follows: true,
          },
        },
      },
    });

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    // 检查用户互动状态
    const [isLiked, isBookmarked, isFollowing] = await Promise.all([
      prisma.practiceLike.findUnique({
        where: {
          practiceId_userId: {
            practiceId: id,
            userId: session.sub,
          },
        },
      }),
      prisma.practiceBookmark.findUnique({
        where: {
          practiceId_userId: {
            practiceId: id,
            userId: session.sub,
          },
        },
      }),
      prisma.practiceFollow.findUnique({
        where: {
          practiceId_userId: {
            practiceId: id,
            userId: session.sub,
          },
        },
      }),
    ]);

    return NextResponse.json({
      ...practice,
      isLiked: !!isLiked,
      isBookmarked: !!isBookmarked,
      isFollowing: !!isFollowing,
    });
  } catch (error: any) {
    console.error('[GET /api/practices/[id]] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch practice' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // 检查权限
    const practice = await prisma.practice.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    if (practice.authorId !== session.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 更新实践记录
    const updated = await prisma.practice.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        structuredData: body.structuredData,
        practiceType: body.practiceType,
        region: body.region,
        city: body.city,
        status: body.status,
        publishedAt: body.status === 'published' ? new Date() : null,
      },
    });

    return NextResponse.json({ practice: updated });
  } catch (error: any) {
    console.error('[PUT /api/practices/[id]] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update practice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await readSession();
    if (!session?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 检查权限
    const practice = await prisma.practice.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    if (practice.authorId !== session.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 软删除
    await prisma.practice.update({
      where: { id },
      data: { status: 'archived' },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/practices/[id]] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete practice' },
      { status: 500 }
    );
  }
}











