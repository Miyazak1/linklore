import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';

const verifySchema = z.object({
  status: z.enum(['verified', 'needs_review']),
  notes: z.string().optional(),
});

// 获取验证状态
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
      select: {
        verificationStatus: true,
        verifiedBy: true,
        verifiedAt: true,
        verificationNotes: true,
      },
    });

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    // 如果有验证人，获取验证人信息
    let verifier = null;
    if (practice.verifiedBy) {
      const user = await prisma.user.findUnique({
        where: { id: practice.verifiedBy },
        select: { id: true, name: true },
      });
      verifier = user;
    }

    return NextResponse.json({
      verificationStatus: practice.verificationStatus,
      verifiedBy: practice.verifiedBy,
      verifiedAt: practice.verifiedAt,
      verificationNotes: practice.verificationNotes,
      verifier,
    });
  } catch (error: any) {
    console.error('[GET /api/practices/[id]/verify] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get verification status' },
      { status: 500 }
    );
  }
}

// 提交验证请求
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
    const data = verifySchema.parse(body);

    // 检查实践是否存在
    const practice = await prisma.practice.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!practice) {
      return NextResponse.json({ error: 'Practice not found' }, { status: 404 });
    }

    // 更新验证状态
    const updated = await prisma.practice.update({
      where: { id },
      data: {
        verificationStatus: data.status,
        verifiedBy: data.status === 'verified' ? session.sub : null,
        verifiedAt: data.status === 'verified' ? new Date() : null,
        verificationNotes: data.notes || null,
      },
    });

    return NextResponse.json({ practice: updated });
  } catch (error: any) {
    console.error('[POST /api/practices/[id]/verify] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to verify practice' },
      { status: 500 }
    );
  }
}

