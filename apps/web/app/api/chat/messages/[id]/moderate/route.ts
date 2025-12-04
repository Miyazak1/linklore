import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { moderateMessage } from '@/lib/ai/moderation';
import { requireRoomAccess } from '@/lib/security/roomAccess';

/**
 * POST /api/chat/messages/:id/moderate
 * 触发消息的监督分析
 */
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { id: messageId } = await params;

		// 获取消息以获取roomId
		const { prisma } = await import('@/lib/db/client');
		const message = await prisma.chatMessage.findUnique({
			where: { id: messageId },
			select: { roomId: true }
		});

		if (!message) {
			return NextResponse.json({ error: '消息不存在' }, { status: 404 });
		}

		// 检查访问权限
		await requireRoomAccess(message.roomId, session.sub);

		// 执行监督分析
		const result = await moderateMessage(messageId, message.roomId);

		return NextResponse.json({ result });
	} catch (error: any) {
		console.error('[Moderate API] Error:', error);
		if (
			error.message === '房间不存在' ||
			error.message === '无权访问此房间' ||
			error.message === '消息不存在'
		) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		return NextResponse.json(
			{ error: error.message || '监督分析失败' },
			{ status: 500 }
		);
	}
}

