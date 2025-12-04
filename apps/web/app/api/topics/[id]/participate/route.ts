import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/topics/[id]/participate
 * 用户参与讨论
 */
export async function POST(
	_: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: topicId } = await params;
		
		// 获取当前用户
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}
		const userId = String(session.sub);

		// 验证话题是否存在
		const topic = await prisma.topic.findUnique({ where: { id: topicId } });
		if (!topic) {
			return NextResponse.json({ error: '话题不存在' }, { status: 404 });
		}

		// 检查是否已经参与
		const existing = await prisma.topicParticipant.findUnique({
			where: {
				topicId_userId: {
					topicId,
					userId
				}
			}
		});

		if (existing) {
			return NextResponse.json({ 
				message: '您已经参与讨论',
				participant: existing
			});
		}

		// 创建参与记录
		const participant = await prisma.topicParticipant.create({
			data: {
				topicId,
				userId
			}
		});

		return NextResponse.json({
			message: '成功参与讨论',
			participant
		});
	} catch (error: any) {
		console.error('参与讨论失败:', error);
		return NextResponse.json(
			{ error: error.message || '参与讨论失败' },
			{ status: 500 }
		);
	}
}

/**
 * DELETE /api/topics/[id]/participate
 * 用户退出讨论（可选功能）
 */
export async function DELETE(
	_: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: topicId } = await params;
		
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}
		const userId = String(session.sub);

		await prisma.topicParticipant.delete({
			where: {
				topicId_userId: {
					topicId,
					userId
				}
			}
		});

		return NextResponse.json({ message: '已退出讨论' });
	} catch (error: any) {
		console.error('退出讨论失败:', error);
		return NextResponse.json(
			{ error: error.message || '退出讨论失败' },
			{ status: 500 }
		);
	}
}

/**
 * GET /api/topics/[id]/participate
 * 检查当前用户是否已参与讨论
 */
export async function GET(
	_: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: topicId } = await params;
		
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ isParticipant: false });
		}
		const userId = String(session.sub);

		const participant = await prisma.topicParticipant.findUnique({
			where: {
				topicId_userId: {
					topicId,
					userId
				}
			}
		});

		return NextResponse.json({ 
			isParticipant: !!participant,
			participant: participant || null
		});
	} catch (error: any) {
		console.error('检查参与状态失败:', error);
		return NextResponse.json({ isParticipant: false });
	}
}

