import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { chatDb } from '@/lib/modules/chat/db';
import { requireRoomAccess } from '@/lib/security/roomAccess';

/**
 * POST /api/chat/messages/:id/like
 * 点赞/取消点赞消息
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

		// 获取消息信息
		const message = await chatDb.messages.findUnique({
			where: { id: messageId },
			select: { roomId: true }
		});

		if (!message) {
			return NextResponse.json({ error: '消息不存在' }, { status: 404 });
		}

		// 检查房间访问权限
		await requireRoomAccess(message.roomId, session.sub);

		// TODO: ChatMessageLike 模型尚未在 schema 中定义，功能暂时禁用
		// 需要在 schema 中添加 ChatMessageLike 模型后才能启用
		return NextResponse.json(
			{ error: '点赞功能暂未实现，需要在 schema 中添加 ChatMessageLike 模型' },
			{ status: 501 }
		);
	} catch (error: any) {
		console.error('[Message Like API] Error:', error);
		return NextResponse.json(
			{ error: error.message || '操作失败' },
			{ status: 500 }
		);
	}
}

/**
 * GET /api/chat/messages/:id/like
 * 获取消息的点赞状态和数量
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { id: messageId } = await params;

		// 获取消息信息
		const message = await chatDb.messages.findUnique({
			where: { id: messageId },
			select: { roomId: true }
		});

		if (!message) {
			return NextResponse.json({ error: '消息不存在' }, { status: 404 });
		}

		// 检查房间访问权限
		await requireRoomAccess(message.roomId, session.sub);

		// TODO: ChatMessageLike 模型尚未在 schema 中定义，功能暂时禁用
		// 需要在 schema 中添加 ChatMessageLike 模型后才能启用
		return NextResponse.json(
			{ error: '点赞功能暂未实现，需要在 schema 中添加 ChatMessageLike 模型' },
			{ status: 501 }
		);
	} catch (error: any) {
		console.error('[Message Like API] Error:', error);
		return NextResponse.json(
			{ error: error.message || '获取点赞状态失败' },
			{ status: 500 }
		);
	}
}











