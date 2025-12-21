import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
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

		// 检查是否已点赞
		const existingLike = await prisma.chatMessageLike.findUnique({
			where: {
				messageId_userId: {
					messageId,
					userId: session.sub
				}
			}
		});

		if (existingLike) {
			// 取消点赞
			await prisma.chatMessageLike.delete({
				where: { id: existingLike.id }
			});

			// 获取点赞数
			const likeCount = await prisma.chatMessageLike.count({
				where: { messageId }
			});

			return NextResponse.json({
				liked: false,
				likeCount
			});
		} else {
			// 添加点赞
			await prisma.chatMessageLike.create({
				data: {
					messageId,
					userId: session.sub
				}
			});

			// 获取点赞数
			const likeCount = await prisma.chatMessageLike.count({
				where: { messageId }
			});

			return NextResponse.json({
				liked: true,
				likeCount
			});
		}
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

		// 获取点赞数
		const likeCount = await prisma.chatMessageLike.count({
			where: { messageId }
		});

		// 检查当前用户是否已点赞
		const userLike = await prisma.chatMessageLike.findUnique({
			where: {
				messageId_userId: {
					messageId,
					userId: session.sub
				}
			}
		});

		return NextResponse.json({
			liked: !!userLike,
			likeCount
		});
	} catch (error: any) {
		console.error('[Message Like API] Error:', error);
		return NextResponse.json(
			{ error: error.message || '获取点赞状态失败' },
			{ status: 500 }
		);
	}
}











