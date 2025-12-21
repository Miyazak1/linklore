import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { chatDb } from '@/lib/modules/chat/db';
import { requireRoomAccess } from '@/lib/security/roomAccess';
import { processMessageContent } from '@/lib/security/messageValidation';
import { z } from 'zod';

const SendMessageSchema = z.object({
	content: z.string().min(0).max(10000), // 允许空内容（用于 AI 建议）
	contentType: z.enum(['USER', 'AI_SUGGESTION', 'AI_ADOPTED']).optional().default('USER'),
	references: z
		.array(
			z.object({
				messageId: z.string(),
				type: z.enum(['QUOTE', 'REPLY', 'REFUTE', 'SUPPORT', 'EXPAND']),
				quote: z.string().optional(),
				quoteStart: z.number().optional(),
				quoteEnd: z.number().optional()
			})
		)
		.optional()
});

const GetMessagesQuerySchema = z.object({
	cursor: z.string().optional(),
	limit: z.string().optional().default('50'),
	before: z.string().optional(),
	after: z.string().optional()
});

/**
 * GET /api/chat/rooms/:id/messages
 * 获取消息列表（游标分页）
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		// 允许匿名用户访问
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { id: roomId } = await params;
		const { searchParams } = new URL(req.url);
		
		// 检查访问权限
		await requireRoomAccess(roomId, session.sub);

		// 如果提供了ids参数，按ID查询（用于批量查询特定消息的监管状态）
		const idsParam = searchParams.get('ids');
		if (idsParam) {
			const messageIds = idsParam.split(',').filter(id => id.trim());
			if (messageIds.length > 0) {
				const messages = await chatDb.messages.findMany({
					where: {
						id: { in: messageIds },
						roomId,
						deletedAt: null
					},
					select: {
						id: true,
						moderationStatus: true,
						moderationNote: true,
						moderationDetails: true,
						isAdopted: true
					}
				});
				return NextResponse.json({ messages });
			}
		}
		
		// 安全解析查询参数
		const cursorParam = searchParams.get('cursor');
		const limitParam = searchParams.get('limit');
		const beforeParam = searchParams.get('before');
		const afterParam = searchParams.get('after');
		
		// 构建解析对象（只包含有效的参数）
		const parseInput: any = {
			limit: limitParam || '50'
		};
		if (cursorParam) parseInput.cursor = cursorParam;
		if (beforeParam) parseInput.before = beforeParam;
		if (afterParam) parseInput.after = afterParam;
		
		const { cursor, limit, before, after } = GetMessagesQuerySchema.parse(parseInput);

		const limitNum = parseInt(limit, 10);
		const take = Math.min(limitNum, 100); // 最多 100 条

		// 构建查询条件
		const where: any = {
			roomId,
			deletedAt: null
		};

		if (cursor) {
			// 游标分页：获取指定消息之后的消息
			const cursorMessage = await chatDb.messages.findUnique({
				where: { id: cursor },
				select: { sequence: true }
			});
			if (cursorMessage) {
				where.sequence = { gt: cursorMessage.sequence };
			}
		} else if (before) {
			// 获取指定消息之前的消息
			const beforeMessage = await chatDb.messages.findUnique({
				where: { id: before },
				select: { sequence: true }
			});
			if (beforeMessage) {
				where.sequence = { lt: beforeMessage.sequence };
			}
		} else if (after) {
			// 获取指定消息之后的消息
			const afterMessage = await chatDb.messages.findUnique({
				where: { id: after },
				select: { sequence: true }
			});
			if (afterMessage) {
				where.sequence = { gt: afterMessage.sequence };
			}
		}

		// 查询消息（按序号降序，最新的在前）
		// 注意：如果房间没有消息，返回空数组是正常的
		let messages;
		try {
			messages = await chatDb.messages.findMany({
				where,
				select: {
					id: true,
					content: true,
					senderId: true,
					contentType: true,
					isAdopted: true, // 添加isAdopted字段
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
				},
				orderBy: { sequence: 'desc' },
				take
			});
		} catch (dbError: any) {
			// 如果表不存在，返回友好的错误信息
			if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
				throw new Error(
					'数据库表尚未创建。请运行: pnpm prisma migrate dev --name add_chat_models'
				);
			}
			throw dbError;
		}

		// 判断是否还有更多消息
		const hasMore =
			messages.length === take &&
			(await chatDb.messages.count({
				where: {
					...where,
					sequence: { lt: messages[messages.length - 1]?.sequence || 0 }
				}
			})) > 0;

		// 获取下一个游标
		const nextCursor = messages.length > 0 ? messages[messages.length - 1].id : null;

		return NextResponse.json({
			messages: messages.reverse(), // 反转顺序，最旧的在前
			nextCursor,
			hasMore
		});
	} catch (error: any) {
		console.error('[Chat Messages API] Error:', error);
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '请求参数错误', details: error.errors },
				{ status: 400 }
			);
		}
		if (error.message === '房间不存在' || error.message === '无权访问此房间') {
			return NextResponse.json({ error: error.message }, { status: 403 });
		}
		// 返回更详细的错误信息
		const errorMessage = error.message || '获取消息列表失败';
		console.error('[Chat Messages API] Error details:', {
			message: errorMessage,
			stack: error.stack,
			name: error.name,
			code: error.code
		});
		return NextResponse.json(
			{ 
				error: errorMessage, 
				details: process.env.NODE_ENV === 'development' ? error.stack : undefined 
			},
			{ status: 500 }
		);
	}
}

/**
 * POST /api/chat/rooms/:id/messages
 * 发送消息
 */
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		// 允许匿名用户发送消息
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { id: roomId } = await params;
		const body = await req.json();
		const { content, contentType, references } = SendMessageSchema.parse(body);

		console.log(`[POST /api/chat/rooms/${roomId}/messages] 📤 收到消息发送请求:`, {
			userId: session.sub,
			roomId,
			content: content?.substring(0, 50),
			contentType: contentType || 'USER'
		});

		// 检查访问权限
		await requireRoomAccess(roomId, session.sub);

		// 处理消息内容（验证 + 清理）
		// AI_SUGGESTION 类型允许空内容（会在流式输出时填充）
		const processedContent =
			contentType === 'AI_SUGGESTION' && !content.trim()
				? ''
				: processMessageContent(
						content,
						contentType === 'AI_SUGGESTION'
					);

		// 获取下一个消息序号
		const lastMessage = await chatDb.messages.findFirst({
			where: { roomId },
			orderBy: { sequence: 'desc' },
			select: { sequence: true }
		});
		const nextSequence = (lastMessage?.sequence || 0) + 1;

		console.log(`[POST /api/chat/rooms/${roomId}/messages] 📝 准备创建消息，sequence: ${nextSequence}`);

		// 创建消息
		const message = await chatDb.messages.create({
			data: {
				roomId,
				senderId: session.sub,
				content: processedContent,
				contentType: contentType || 'USER',
				sequence: nextSequence
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
		}) as any; // 临时类型断言，因为 chatDb 的类型定义可能不完整

		console.log(`[POST /api/chat/rooms/${roomId}/messages] ✅ 消息已创建:`, {
			messageId: message.id,
			senderId: message.senderId,
			senderEmail: message.sender.email,
			senderName: message.sender.name,
			content: message.content?.substring(0, 50),
			sequence: message.sequence,
			contentType: message.contentType
		});

		// 如果有引用，创建引用关系
		if (references && references.length > 0) {
			await Promise.all(
				references.map((ref) =>
					chatDb.messageReferences.create({
						data: {
							messageId: message.id,
							referencedMessageId: ref.messageId,
							referenceType: ref.type,
							quote: ref.quote,
							quoteStart: ref.quoteStart,
							quoteEnd: ref.quoteEnd
						}
					})
				)
			);

			// 重新加载消息以包含引用
			const messageWithRefs = await chatDb.messages.findUnique({
				where: { id: message.id },
				include: {
					sender: {
						select: {
							id: true,
							email: true,
							name: true,
							avatarUrl: true
						}
					},
					references: {
						include: {
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
			}) as any; // 临时类型断言，因为 chatDb 的类型定义可能不完整

			return NextResponse.json({ message: messageWithRefs });
		}

		// 更新房间的 updatedAt
		await chatDb.rooms.update({
			where: { id: roomId },
			data: { updatedAt: new Date() }
		});

		console.log(`[POST /api/chat/rooms/${roomId}/messages] 🎉 消息发送成功，返回给客户端:`, {
			messageId: message.id,
			sequence: message.sequence
		});

		return NextResponse.json({ message });
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
			{ error: error.message || '发送消息失败' },
			{ status: 500 }
		);
	}
}

