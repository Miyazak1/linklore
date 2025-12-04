import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { requireRoomAccess } from '@/lib/security/roomAccess';
import { processMessageContent } from '@/lib/security/messageValidation';
import { z } from 'zod';

const AdoptMessageSchema = z.object({
	roomId: z.string(),
	editedContent: z.string().optional() // 可选：采纳前编辑
});

/**
 * POST /api/chat/messages/:id/adopt
 * 采纳 AI 建议
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

		const { id } = await params;
		const body = await req.json();
		const { roomId, editedContent } = AdoptMessageSchema.parse(body);

		// 检查房间访问权限
		await requireRoomAccess(roomId, session.sub);

		// 获取原始 AI 建议消息
		const originalMessage = await prisma.chatMessage.findUnique({
			where: { id },
			include: {
				room: {
					select: {
						id: true,
						creatorId: true,
						participantId: true
					}
				}
			}
		});

		if (!originalMessage) {
			return NextResponse.json({ error: '消息不存在' }, { status: 404 });
		}

		if (originalMessage.contentType !== 'AI_SUGGESTION') {
			return NextResponse.json(
				{ error: '只能采纳 AI 建议' },
				{ status: 400 }
			);
		}

		if (originalMessage.senderId !== session.sub) {
			return NextResponse.json(
				{ error: '只能采纳自己的 AI 建议' },
				{ status: 403 }
			);
		}

		// 处理消息内容（如果用户编辑了）
		const finalContent = editedContent
			? processMessageContent(editedContent)
			: originalMessage.content;

		// 直接更新原消息，标记为已采纳（不创建新消息）
		const adoptedMessage = await prisma.chatMessage.update({
			where: { id },
			data: {
				isAdopted: true,
				content: finalContent // 如果用户编辑了内容，更新内容
			},
			include: {
				sender: {
					select: {
						id: true,
						email: true,
						name: true,
						avatarUrl: true
					}
				}
			}
		});

		// 更新房间的 updatedAt
		await prisma.chatRoom.update({
			where: { id: roomId },
			data: { updatedAt: new Date() }
		});

		// TODO: 触发讨论分析更新（异步）

		return NextResponse.json({
			ok: true,
			message: adoptedMessage
		});
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '请求参数错误', details: error.errors },
				{ status: 400 }
			);
		}
		if (
			error.message === '房间不存在' ||
			error.message === '无权访问此房间' ||
			error.message.includes('消息') ||
			error.message.includes('链接')
		) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		return NextResponse.json(
			{ error: error.message || '采纳消息失败' },
			{ status: 500 }
		);
	}
}

