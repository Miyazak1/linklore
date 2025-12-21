import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { chatDb } from '@/lib/modules/chat/db';
import { requireRoomAccess } from '@/lib/security/roomAccess';
import { broadcastDefaultMessage } from '@/lib/realtime/roomConnections';

/**
 * POST /api/chat/rooms/:id/charter
 * 同意宪章
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

		const { id: roomId } = await params;

		// 检查访问权限
		await requireRoomAccess(roomId, session.sub);

		// 获取房间信息（包括话题信息，用于创建AI主持人消息）
		const room = await chatDb.rooms.findUnique({
			where: { id: roomId },
			select: {
				type: true,
				creatorId: true,
				participantId: true,
				creatorCharterAccepted: true,
				participantCharterAccepted: true,
				topic: true,
				topicDescription: true
			}
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		// 更新同意状态
		const isCreator = room.creatorId === session.sub;
		const updateData: any = {};

		// 记录更新前的状态，用于判断是否应该创建AI主持人消息
		const wasParticipantAccepted = room.participantCharterAccepted;
		const wasCreatorAccepted = room.creatorCharterAccepted;

		if (isCreator) {
			updateData.creatorCharterAccepted = true;
		} else if (room.participantId === session.sub) {
			updateData.participantCharterAccepted = true;
		} else {
			return NextResponse.json(
				{ error: '无权操作此房间' },
				{ status: 403 }
			);
		}

		const updatedRoom = await chatDb.rooms.update({
			where: { id: roomId },
			data: updateData
		});

		// 计算 allAccepted：对于DUO房间，必须双方都同意宪章；对于SOLO房间，只需要创建者同意
		const allAccepted = updatedRoom.type === 'DUO'
			? updatedRoom.creatorCharterAccepted && 
			  updatedRoom.participantCharterAccepted && 
			  updatedRoom.participantId !== null
			: updatedRoom.creatorCharterAccepted;

		// 重要：发起邀请的用户在邀请时就已经同意宪章了，所以不需要检查创建者
		// 只需要检查接受邀请的用户（参与者）是否刚刚同意宪章
		// 当参与者同意时，立即创建并广播AI主持人消息
		// 关键：只有当参与者（不是创建者）刚刚同意时，才创建AI主持人消息
		const isParticipantJustAccepted = !isCreator && 
			room.participantId === session.sub && // 确保是参与者
			!wasParticipantAccepted && // 之前没有同意
			updatedRoom.participantCharterAccepted === true; // 现在同意了
		
		// 检查是否应该创建AI主持人消息：
		// 1. 必须是DUO房间
		// 2. 必须有参与者
		// 3. 必须是参与者刚刚同意（创建者已经同意，所以不需要检查）
		// 4. 确保创建者已经同意（虽然理论上已经同意了，但为了安全还是检查一下）
		const shouldCreateHostMessage = updatedRoom.type === 'DUO' && 
			updatedRoom.participantId &&
			updatedRoom.creatorCharterAccepted === true && // 确保创建者已经同意
			isParticipantJustAccepted; // 只有参与者刚刚同意时才创建

		console.log(`[Charter] 📋 宪章同意状态更新`, {
			roomId,
			userId: session.sub,
			isCreator,
			wasCreatorAccepted,
			wasParticipantAccepted,
			creatorAccepted: updatedRoom.creatorCharterAccepted,
			participantAccepted: updatedRoom.participantCharterAccepted,
			allAccepted,
			isParticipantJustAccepted,
			shouldCreateHostMessage,
			participantId: updatedRoom.participantId,
			roomType: updatedRoom.type
		});

		// 如果是DUO房间且参与者刚刚同意宪章，自动创建AI主持人消息
		// 注意：创建者已经在邀请时同意了宪章，所以不需要检查创建者
		if (shouldCreateHostMessage) {
			// 检查是否已经存在AI主持人的消息（避免重复创建）
			const existingHostMessage = await chatDb.messages.findFirst({
				where: {
					roomId,
					contentType: 'AI_SUGGESTION',
					content: {
						contains: 'AI主持人'
					}
				}
			});

			if (!existingHostMessage) {
				// 获取下一个消息序号
				const lastMessage = await chatDb.messages.findFirst({
					where: { roomId },
					orderBy: { sequence: 'desc' },
					select: { sequence: true }
				});
				const nextSequence = (lastMessage?.sequence || 0) + 1;

				// 创建AI主持人消息
				const hostMessageContent = `大家好！我是AI主持人。\n\n让我们以开放、尊重和建设性的态度进行交流。请随时分享您的观点和想法！`;

				// 获取创建者信息（用于广播）
				const creator = await prisma.user.findUnique({
					where: { id: updatedRoom.creatorId },
					select: {
						id: true,
						email: true,
						name: true,
						avatarUrl: true
					}
				});

				// 使用创建者的ID作为senderId（因为创建者已经同意了宪章）
				const hostMessage = await chatDb.messages.create({
					data: {
						roomId,
						senderId: updatedRoom.creatorId,
						content: hostMessageContent,
						contentType: 'AI_SUGGESTION',
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

				// 立即通过SSE广播新消息给房间内所有用户
				const messageData = {
					id: hostMessage.id,
					content: hostMessage.content,
					senderId: hostMessage.senderId,
					sender: hostMessage.sender,
					contentType: hostMessage.contentType,
					createdAt: hostMessage.createdAt.toISOString(),
					moderationStatus: hostMessage.moderationStatus,
					moderationNote: hostMessage.moderationNote,
					moderationDetails: hostMessage.moderationDetails,
					isAdopted: hostMessage.isAdopted,
					references: (hostMessage.references || []).map((ref) => ({
						id: ref.id,
						content: ref.referencedMessage?.content || '',
						senderName: ref.referencedMessage?.sender?.name || ref.referencedMessage?.sender?.email || '未知用户'
					})).filter(ref => ref.content)
				};

				console.log(`[Charter] ✅ 创建AI主持人消息完成，准备广播`, {
					messageId: hostMessage.id,
					sequence: nextSequence,
					roomId
				});

				// 广播新消息事件（使用默认事件格式，onmessage可以接收）
				// 立即广播一次
				broadcastDefaultMessage(roomId, messageData);
				
				// 多次重试广播，确保即使连接建立得晚，也能收到消息
				// 使用异步方式，不阻塞响应
				setTimeout(() => {
					broadcastDefaultMessage(roomId, messageData);
				}, 500); // 500ms后重试
				
				setTimeout(() => {
					broadcastDefaultMessage(roomId, messageData);
				}, 1500); // 1.5秒后重试
				
				setTimeout(() => {
					broadcastDefaultMessage(roomId, messageData);
				}, 3000); // 3秒后重试
				
				setTimeout(() => {
					broadcastDefaultMessage(roomId, messageData);
				}, 5000); // 5秒后最后一次重试，确保所有连接都已建立
			}
		}

		// 如果创建了AI主持人消息，在响应中包含消息ID，方便前端立即获取
		let hostMessageId: string | undefined;
		if (allAccepted && updatedRoom.type === 'DUO' && updatedRoom.participantId) {
			const hostMsg = await chatDb.messages.findFirst({
				where: {
					roomId,
					contentType: 'AI_SUGGESTION',
					content: {
						contains: 'AI主持人'
					}
				},
				select: { id: true },
				orderBy: { createdAt: 'desc' }
			});
			hostMessageId = hostMsg?.id;
		}

		return NextResponse.json({
			room: updatedRoom,
			allAccepted,
			hostMessageId // 返回AI主持人消息ID，前端可以立即获取
		});
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.message || '操作失败' },
			{ status: 500 }
		);
	}
}

/**
 * GET /api/chat/rooms/:id/charter
 * 获取宪章同意状态
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

		const { id: roomId } = await params;
		await requireRoomAccess(roomId, session.sub);

		const room = await chatDb.rooms.findUnique({
			where: { id: roomId },
			select: {
				type: true,
				creatorCharterAccepted: true,
				participantCharterAccepted: true,
				participantId: true
			}
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		// 计算 allAccepted：对于DUO房间，必须双方都同意宪章；对于SOLO房间，只需要创建者同意
		const allAccepted = room.type === 'DUO'
			? room.creatorCharterAccepted && 
			  room.participantCharterAccepted && 
			  room.participantId !== null
			: room.creatorCharterAccepted;

		return NextResponse.json({
			creatorAccepted: room.creatorCharterAccepted,
			participantAccepted: room.participantCharterAccepted,
			allAccepted
		});
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.message || '获取状态失败' },
			{ status: 500 }
		);
	}
}








