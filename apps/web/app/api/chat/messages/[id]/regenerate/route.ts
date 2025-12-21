import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { chatDb } from '@/lib/modules/chat/db';
import { prisma } from '@/lib/db/client'; // 保留用于 User 等共享模型
import { requireRoomAccess } from '@/lib/security/roomAccess';

/**
 * POST /api/chat/messages/:id/regenerate
 * 重新生成AI回答
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

		// 获取原始AI消息
		const originalMessage = await chatDb.messages.findUnique({
			where: { id: messageId },
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

		// 检查房间访问权限
		await requireRoomAccess(originalMessage.roomId, session.sub);

		// 只能重新生成AI建议
		if (originalMessage.contentType !== 'AI_SUGGESTION') {
			return NextResponse.json(
				{ error: '只能重新生成AI建议' },
				{ status: 400 }
			);
		}

		// 只能重新生成自己的AI回答
		if (originalMessage.senderId !== session.sub) {
			return NextResponse.json(
				{ error: '只能重新生成自己的AI回答' },
				{ status: 403 }
			);
		}

		// 获取触发这条AI回答的用户消息（应该是这条AI消息之前最近的一条用户消息）
		const triggerMessage = await chatDb.messages.findFirst({
			where: {
				roomId: originalMessage.roomId,
				contentType: 'USER',
				sequence: { lt: originalMessage.sequence }
			},
			orderBy: { sequence: 'desc' },
			select: {
				id: true,
				content: true,
				senderId: true
			}
		});

		if (!triggerMessage) {
			return NextResponse.json(
				{ error: '未找到触发此AI回答的消息' },
				{ status: 400 }
			);
		}

		// 获取房间内的所有讨论消息（用于上下文）
		const discussionMessages = await chatDb.messages.findMany({
			where: {
				roomId: originalMessage.roomId,
				contentType: { in: ['USER', 'AI_ADOPTED'] },
				sequence: { lt: originalMessage.sequence },
				deletedAt: null
			},
			include: {
				sender: { select: { id: true, email: true, name: true } }
			},
			orderBy: { sequence: 'asc' },
			take: 15
		});

		// 构建上下文
		const context: Array<{ role: 'user' | 'assistant'; content: string }> = [];
		
		const room = originalMessage.room;
		const isDuo = !!room.participantId;
		
		if (isDuo) {
			context.push({
				role: 'user',
				content: `这是一个双人讨论。请仔细阅读以下讨论内容，理解双方的观点，然后为当前用户提供建议和帮助。`
			});
		}
		
		discussionMessages.forEach((m) => {
			let messageContent = m.content;
			if (isDuo) {
				if (m.senderId === room.creatorId) {
					messageContent = `[用户A] ${m.content}`;
				} else if (m.senderId === room.participantId) {
					messageContent = `[用户B] ${m.content}`;
				}
			}
			context.push({
				role: 'user',
				content: messageContent
			});
		});

		// 添加触发消息
		context.push({
			role: 'user',
			content: isDuo && triggerMessage.senderId === room.creatorId
				? `[用户A] ${triggerMessage.content}`
				: isDuo && triggerMessage.senderId === room.participantId
				? `[用户B] ${triggerMessage.content}`
				: triggerMessage.content
		});

		// 创建新的AI建议消息（空内容，等待流式输出填充）
		const lastMessage = await chatDb.messages.findFirst({
			where: { roomId: originalMessage.roomId },
			orderBy: { sequence: 'desc' },
			select: { sequence: true }
		});
		const nextSequence = (lastMessage?.sequence || 0) + 1;

		const newAiMessage = await chatDb.messages.create({
			data: {
				roomId: originalMessage.roomId,
				senderId: session.sub,
				content: '',
				contentType: 'AI_SUGGESTION',
				sequence: nextSequence,
				aiProvider: originalMessage.aiProvider,
				aiModel: originalMessage.aiModel
			},
			select: {
				id: true,
				content: true,
				senderId: true,
				contentType: true,
				isAdopted: true,
				sequence: true,
				createdAt: true,
				moderationStatus: true,
				moderationNote: true,
				moderationDetails: true,
				aiProvider: true,
				aiModel: true,
				sender: {
					select: {
						id: true,
						email: true,
						name: true,
						avatarUrl: true
					}
				},
				references: {
					select: {
						id: true,
						referencedMessage: {
							select: {
								id: true,
								content: true,
								sender: {
									select: {
										id: true,
										name: true,
										email: true
									}
								}
							}
						}
					}
				}
			}
		});

		// 返回新消息和上下文，让前端启动流式输出
		return NextResponse.json({
			message: {
				...newAiMessage,
				createdAt: newAiMessage.createdAt.toISOString()
			},
			context,
			prompt: triggerMessage.content
		});
	} catch (error: any) {
		console.error('[Message Regenerate API] Error:', error);
		return NextResponse.json(
			{ error: error.message || '重新生成失败' },
			{ status: 500 }
		);
	}
}

