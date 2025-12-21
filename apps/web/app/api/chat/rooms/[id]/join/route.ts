import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { chatDb } from '@/lib/modules/chat/db';
import { createModuleLogger } from '@/lib/utils/logger';
import { broadcastToRoom } from '@/lib/realtime/roomConnections';

const log = createModuleLogger('Join Room API');

/**
 * 通过链接加入房间
 * POST /api/chat/rooms/:id/join
 * 需要登录
 */
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: roomId } = await params;
		const session = await readSession();

		// 检查是否已登录
		if (!session?.sub) {
			return NextResponse.json({ error: '请先登录' }, { status: 401 });
		}

		const userId = session.sub;

		// 获取房间信息
		const room = await chatDb.rooms.findUnique({
			where: { id: roomId },
			select: {
				id: true,
				type: true,
				creatorId: true,
				participantId: true,
				status: true,
				creator: {
					select: {
						id: true,
						name: true,
						email: true,
						avatarUrl: true
					}
				},
				participant: {
					select: {
						id: true,
						name: true,
						email: true,
						avatarUrl: true
					}
				}
			}
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		// 检查房间状态
		if (room.status !== 'ACTIVE') {
			return NextResponse.json(
				{ error: '房间已关闭' },
				{ status: 400 }
			);
		}

		// 如果用户已经是创建者或参与者，直接返回房间信息
		if (room.creatorId === userId || room.participantId === userId) {
			return NextResponse.json({
				ok: true,
				room: {
					...room,
					type: room.type
				},
				alreadyMember: true
			});
		}

		// 如果房间是 DUO 且已有参与者，不能加入
		if (room.type === 'DUO' && room.participantId) {
			return NextResponse.json(
				{ error: '房间已满，无法加入' },
				{ status: 400 }
			);
		}

		// 如果房间是 SOLO，转为 DUO 并添加参与者
		if (room.type === 'SOLO') {
			const updatedRoom = await chatDb.rooms.update({
				where: { id: roomId },
				data: {
					type: 'DUO',
					participantId: userId,
					joinedAt: new Date()
				},
				include: {
					creator: {
						select: {
							id: true,
							name: true,
							email: true,
							avatarUrl: true
						}
					},
					participant: {
						select: {
							id: true,
							name: true,
							email: true,
							avatarUrl: true
						}
					}
				}
			}) as any; // 临时类型断言，因为 chatDb 的类型定义可能不完整

			// 重要：当参与者加入时，通知创建者房间类型已变为DUO
			// 这样创建者可以立即建立SSE连接
			broadcastToRoom(roomId, 'room-type-changed', {
				roomType: 'DUO',
				participantId: userId,
				participant: updatedRoom.participant,
				timestamp: Date.now()
			}, userId); // 排除参与者本人

			log.info('参与者加入，房间类型从SOLO变为DUO，已通知创建者', {
				roomId,
				creatorId: room.creatorId,
				participantId: userId
			});

			return NextResponse.json({
				ok: true,
				room: updatedRoom,
				joined: true
			});
		}

		// 如果房间已经是 DUO 但没有参与者（理论上不应该发生），添加参与者
		if (room.type === 'DUO' && !room.participantId) {
			const updatedRoom = await chatDb.rooms.update({
				where: { id: roomId },
				data: {
					participantId: userId,
					joinedAt: new Date()
				},
				include: {
					creator: {
						select: {
							id: true,
							name: true,
							email: true,
							avatarUrl: true
						}
					},
					participant: {
						select: {
							id: true,
							name: true,
							email: true,
							avatarUrl: true
						}
					}
				}
			}) as any; // 临时类型断言，因为 chatDb 的类型定义可能不完整

			// 重要：当参与者加入时，通知创建者
			broadcastToRoom(roomId, 'room-type-changed', {
				roomType: 'DUO',
				participantId: userId,
				participant: updatedRoom.participant,
				timestamp: Date.now()
			}, userId); // 排除参与者本人

			log.info('参与者加入DUO房间，已通知创建者', {
				roomId,
				creatorId: room.creatorId,
				participantId: userId
			});

			return NextResponse.json({
				ok: true,
				room: updatedRoom,
				joined: true
			});
		}

		return NextResponse.json({
			ok: true,
			room
		});
	} catch (error: any) {
		log.error('加入房间失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '加入房间失败' },
			{ status: 500 }
		);
	}
}

