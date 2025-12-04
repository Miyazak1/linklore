import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { requireRoomAccess } from '@/lib/security/roomAccess';

/**
 * GET /api/chat/rooms/:id/events
 * SSE端点：实时推送房间内的新消息
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		console.log('[Chat Events SSE] 📥 收到SSE连接请求');
		const session = await readSession();
		if (!session?.sub) {
			console.error('[Chat Events SSE] ❌ 未登录');
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { id: roomId } = await params;
		console.log('[Chat Events SSE] 🔍 检查房间访问权限:', { roomId, userId: session.sub });

		// 检查访问权限
		await requireRoomAccess(roomId, session.sub);
		console.log('[Chat Events SSE] ✅ 权限检查通过，开始创建SSE流');

		// 创建SSE流
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();

				// 发送连接成功事件
				const sendEvent = (event: string, data: any) => {
					const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
					controller.enqueue(encoder.encode(message));
				};

				sendEvent('connected', {
					roomId,
					userId: session.sub,
					timestamp: Date.now()
				});

				// 获取当前房间的最后一条消息的sequence（作为起始点）
				// 注意：这里使用 <= 而不是 <，确保能检测到连接建立时已经存在的最后一条消息之后的新消息
				const lastMessage = await prisma.chatMessage.findFirst({
					where: { roomId },
					orderBy: { sequence: 'desc' },
					select: { sequence: true }
				});
				
				// 从最后一条消息的sequence开始检查（只推送新消息）
				// 如果已经有消息，从最后一条消息的sequence开始；如果没有消息，从0开始
				let lastCheckedSequence = lastMessage?.sequence || 0;
				
				console.log(`[Chat Events SSE] 🚀 开始监听房间 ${roomId}，起始sequence: ${lastCheckedSequence}，用户: ${session.sub}，最后一条消息sequence: ${lastMessage?.sequence || '无'}`);

				// 立即检查一次
				const checkNewMessages = async () => {
					try {
						// 查询sequence大于lastCheckedSequence的新消息
						// 使用 gt (greater than) 确保只获取新消息
						const newMessages = await prisma.chatMessage.findMany({
							where: {
								roomId,
								sequence: { gt: lastCheckedSequence },
								deletedAt: null
							},
							select: {
								id: true,
								content: true,
								senderId: true,
								contentType: true,
								createdAt: true,
								sequence: true,
								moderationStatus: true,
								moderationNote: true,
								moderationDetails: true,
								isAdopted: true,
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
							orderBy: { sequence: 'asc' },
							take: 50 // 最多一次返回50条
						});

						if (newMessages.length > 0) {
							console.log(`[Chat Events SSE] 🔔 发现 ${newMessages.length} 条新消息，lastCheckedSequence: ${lastCheckedSequence} -> ${newMessages[newMessages.length - 1].sequence}`);
							// 更新lastCheckedSequence
							lastCheckedSequence = newMessages[newMessages.length - 1].sequence;

							// 发送新消息事件（使用默认的'message'事件类型）
							for (const message of newMessages) {
								const messageData = {
									id: message.id,
									content: message.content,
									senderId: message.senderId,
									sender: message.sender,
									contentType: message.contentType,
									createdAt: message.createdAt.toISOString(),
									moderationStatus: message.moderationStatus,
									moderationNote: message.moderationNote,
									moderationDetails: message.moderationDetails,
									isAdopted: message.isAdopted,
									references: (message.references || []).map((ref) => ({
										id: ref.id,
										content: ref.referencedMessage?.content || '',
										senderName: ref.referencedMessage?.sender?.name || ref.referencedMessage?.sender?.email || '未知用户'
									})).filter(ref => ref.content) // 过滤掉无效的引用
								};
								// 使用默认的'message'事件类型（不指定event字段）
								const messageStr = `data: ${JSON.stringify(messageData)}\n\n`;
								controller.enqueue(encoder.encode(messageStr));
								console.log(`[Chat Events SSE] ✅ 已推送消息到SSE流:`, {
									messageId: message.id,
									senderId: message.senderId,
									senderEmail: message.sender.email,
									senderName: message.sender.name,
									content: message.content?.substring(0, 50),
									sequence: message.sequence,
									contentType: message.contentType,
									roomId,
									userId: session.sub
								});
							}
						}
					} catch (error) {
						console.error('[Chat Events SSE] Error checking messages:', error);
						// 发生错误时发送错误事件，但不关闭连接
						sendEvent('error', {
							message: '检查新消息时出错',
							timestamp: Date.now()
						});
					}
				};

				// 立即检查一次
				checkNewMessages();

				// 每100ms检查一次（更频繁的检查，确保实时性）
				const checkInterval = setInterval(checkNewMessages, 100);

				// 发送心跳（每30秒）
				const heartbeatInterval = setInterval(() => {
					sendEvent('heartbeat', { timestamp: Date.now() });
				}, 30000);

				// 监听连接关闭
				req.signal.addEventListener('abort', () => {
					console.log('[Chat Events SSE] 连接已关闭');
					clearInterval(checkInterval);
					clearInterval(heartbeatInterval);
					controller.close();
				});
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				'X-Accel-Buffering': 'no' // 禁用nginx缓冲
			}
		});
	} catch (error: any) {
		console.error('[Chat Events SSE] Error:', error);
		if (error.message === '房间不存在' || error.message === '无权访问此房间') {
			return NextResponse.json({ error: error.message }, { status: 403 });
		}
		return NextResponse.json(
			{ error: error.message || '建立SSE连接失败' },
			{ status: 500 }
		);
	}
}

