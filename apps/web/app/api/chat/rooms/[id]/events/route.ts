import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { chatDb } from '@/lib/modules/chat/db';
import { requireRoomAccess } from '@/lib/security/roomAccess';
import { addRoomConnection, removeRoomConnection } from '@/lib/realtime/roomConnections';

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

				// 注册连接到房间连接池
				addRoomConnection(roomId, session.sub, controller);

				sendEvent('connected', {
					roomId,
					userId: session.sub,
					timestamp: Date.now()
				});

				// 获取当前房间的最后一条消息的sequence（作为起始点）
				// 注意：这里使用 <= 而不是 <，确保能检测到连接建立时已经存在的最后一条消息之后的新消息
				const lastMessage = await chatDb.messages.findFirst({
					where: { roomId },
					orderBy: { sequence: 'desc' },
					select: { sequence: true }
				});
				
				// 从最后一条消息的sequence开始检查（只推送新消息）
				// 如果已经有消息，从最后一条消息的sequence开始；如果没有消息，从0开始
				// 重要：为了确保不遗漏消息，我们检查所有sequence大于lastCheckedSequence的消息
				// 即使连接建立得晚，也能收到所有遗漏的消息
				let lastCheckedSequence = lastMessage?.sequence || 0;
				
				// 检查所有sequence大于lastCheckedSequence的消息（确保不遗漏任何消息）
				// 这样即使连接建立得晚，也能收到所有遗漏的消息
				// 注意：如果lastMessage存在，lastCheckedSequence = lastMessage.sequence
				// 我们检查sequence > lastCheckedSequence，这样就能收到所有在loadMessages之后创建的消息
				// 同时，为了安全起见，也检查最近1分钟内创建的消息（防止sequence有问题）
				const oneMinuteAgo = new Date(Date.now() - 60000);
				const recentMessages = await chatDb.messages.findMany({
					where: {
						roomId,
						deletedAt: null,
						OR: [
							{ sequence: { gt: lastCheckedSequence } }, // 检查所有sequence大于lastCheckedSequence的消息
							{ 
								AND: [
									{ createdAt: { gte: oneMinuteAgo } }, // 或者最近1分钟内创建的
									{ sequence: { gte: lastCheckedSequence } } // 且sequence大于等于lastCheckedSequence
								]
							}
						]
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
					orderBy: { sequence: 'asc' }
				});
				
				// 推送最近创建的消息（确保不遗漏）
				if (recentMessages.length > 0) {
					console.log(`[Chat Events SSE] 🔔 连接建立时发现 ${recentMessages.length} 条遗漏的消息，立即推送`, {
						roomId,
						userId: session.sub,
						lastCheckedSequence,
						messageSequences: recentMessages.map(m => m.sequence),
						messageIds: recentMessages.map(m => m.id)
					});
					for (const message of recentMessages) {
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
							})).filter(ref => ref.content)
						};
						
						// 立即推送消息给新连接的用户
						const messageStr = `data: ${JSON.stringify(messageData)}\n\n`;
						controller.enqueue(encoder.encode(messageStr));
						
						// 更新lastCheckedSequence
						if (message.sequence > lastCheckedSequence) {
							lastCheckedSequence = message.sequence;
						}
						
						console.log(`[Chat Events SSE] ✅ 连接建立时推送消息给用户 ${session.sub}`, {
							messageId: message.id,
							sequence: message.sequence,
							contentPreview: message.content?.substring(0, 50)
						});
					}
				}
				
				// 维护已检查消息的内容映射，用于检测内容更新
				const messageContentMap = new Map<string, string>();
				
				// 初始化：获取当前所有消息的内容（用于后续检测更新）
				const initialMessages = await chatDb.messages.findMany({
					where: { roomId, deletedAt: null },
					select: { id: true, content: true },
					orderBy: { sequence: 'desc' },
					take: 50 // 只检查最近50条消息
				});
				initialMessages.forEach(msg => {
					messageContentMap.set(msg.id, msg.content || '');
				});
				
				console.log(`[Chat Events SSE] 🚀 开始监听房间 ${roomId}，起始sequence: ${lastCheckedSequence}，用户: ${session.sub}，已初始化 ${messageContentMap.size} 条消息的内容映射`);

				// 检查新消息和消息更新
				const checkNewMessages = async () => {
					try {
						// 查询sequence大于lastCheckedSequence的新消息
						// 使用 gt (greater than) 确保只获取新消息
						const newMessages = await chatDb.messages.findMany({
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

						// 检查最近的消息是否有内容更新（用于检测AI流式输出的更新）
						// 只检查最近3分钟内创建或更新的AI消息，提高效率
						const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
						const recentMessages = await chatDb.messages.findMany({
							where: {
								roomId,
								deletedAt: null,
								contentType: 'AI_SUGGESTION', // 只检查AI消息
								OR: [
									{ createdAt: { gte: threeMinutesAgo } }, // 最近3分钟创建的
									{ updatedAt: { gte: threeMinutesAgo } }  // 或最近3分钟更新的
								]
							},
							select: {
								id: true,
								content: true,
								senderId: true,
								contentType: true,
								createdAt: true,
								updatedAt: true, // 添加updatedAt字段，用于检测更新
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
							orderBy: { sequence: 'desc' },
							take: 20 // 只检查最近20条AI消息
						});

						// 检查消息内容是否有更新
						const updatedMessages: typeof recentMessages = [];
						for (const message of recentMessages) {
							const oldContent = messageContentMap.get(message.id) || '';
							const newContent = message.content || '';
							
							// 如果内容有变化，就推送更新（包括从空到非空，或内容增长）
							if (oldContent !== newContent) {
								updatedMessages.push(message);
								messageContentMap.set(message.id, newContent);
								console.log(`[Chat Events SSE] 🔄 检测到消息内容更新:`, {
									messageId: message.id,
									oldLength: oldContent.length,
									newLength: newContent.length,
									oldPreview: oldContent.substring(0, 30),
									newPreview: newContent.substring(0, 30),
									isEmptyToNonEmpty: !oldContent && !!newContent
								});
							}
						}

						// 推送内容更新的消息
						if (updatedMessages.length > 0) {
							console.log(`[Chat Events SSE] 🔄 发现 ${updatedMessages.length} 条消息内容更新`);
							for (const message of updatedMessages) {
								// 确保内容不为空才推送
								if (!message.content || message.content.trim().length === 0) {
									console.warn(`[Chat Events SSE] ⚠️ 跳过空内容的消息更新:`, {
										messageId: message.id,
										contentLength: message.content?.length || 0
									});
									continue;
								}
								
								const messageData = {
									id: message.id,
									content: message.content, // 确保推送完整内容
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
									})).filter(ref => ref.content)
								};
								const messageStr = `data: ${JSON.stringify(messageData)}\n\n`;
								controller.enqueue(encoder.encode(messageStr));
								console.log(`[Chat Events SSE] ✅ 已推送消息更新到SSE流:`, {
									messageId: message.id,
									contentLength: message.content?.length || 0,
									contentPreview: message.content?.substring(0, 100),
									roomId,
									userId: session.sub
								});
							}
						}

						if (newMessages.length > 0) {
							console.log(`[Chat Events SSE] 🔔 发现 ${newMessages.length} 条新消息，lastCheckedSequence: ${lastCheckedSequence} -> ${newMessages[newMessages.length - 1].sequence}`);
							// 更新lastCheckedSequence
							lastCheckedSequence = newMessages[newMessages.length - 1].sequence;

							// 发送新消息事件（使用默认的'message'事件类型）
							for (const message of newMessages) {
								// 更新内容映射
								messageContentMap.set(message.id, message.content || '');
								
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

				// 立即检查一次（确保连接建立时能立即收到遗漏的消息）
				checkNewMessages();
				
				// 再立即检查一次（给数据库一点时间，确保能检测到刚创建的消息）
				setTimeout(() => {
					checkNewMessages();
				}, 100);

				// 每500ms检查一次（平衡实时性和性能）
				const checkInterval = setInterval(checkNewMessages, 500);

				// 发送心跳（每30秒）
				const heartbeatInterval = setInterval(() => {
					sendEvent('heartbeat', { timestamp: Date.now() });
				}, 30000);

				// 监听连接关闭
				req.signal.addEventListener('abort', () => {
					console.log('[Chat Events SSE] 连接已关闭');
					clearInterval(checkInterval);
					clearInterval(heartbeatInterval);
					// 从房间连接池中移除
					removeRoomConnection(roomId, session.sub, controller);
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

