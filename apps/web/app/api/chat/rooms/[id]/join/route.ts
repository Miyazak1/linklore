import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { getOrCreateGuestUser } from '@/lib/auth/guest';
import { createSession } from '@/lib/auth/session';

/**
 * 通过链接加入房间
 * POST /api/chat/rooms/:id/join
 * 支持匿名用户加入
 */
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: roomId } = await params;
		let session = await readSession();
		let userId: string;
		let isGuest = false;

		// 如果未登录，尝试创建或获取匿名用户
		if (!session?.sub) {
			// 尝试从请求体获取 guestUserId（如果客户端提供了）
			const body = await req.json().catch(() => ({}));
			const guestUserId = body.guestUserId;

			const guestUser = await getOrCreateGuestUser(guestUserId);
			if (!guestUser) {
				return NextResponse.json({ error: '无法创建匿名用户' }, { status: 500 });
			}

			// 为匿名用户创建 session
			await createSession({
				sub: guestUser.id,
				email: guestUser.email,
				role: guestUser.role,
				isGuest: true
			});

			userId = guestUser.id;
			isGuest = true;
		} else {
			userId = session.sub;
			isGuest = (session as any).isGuest === true;
		}

		// 获取房间信息
		const room = await prisma.chatRoom.findUnique({
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
			const updatedRoom = await prisma.chatRoom.update({
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
			});

			return NextResponse.json({
				ok: true,
				room: updatedRoom,
				joined: true
			});
		}

		// 如果房间已经是 DUO 但没有参与者（理论上不应该发生），添加参与者
		if (room.type === 'DUO' && !room.participantId) {
			const updatedRoom = await prisma.chatRoom.update({
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
		console.error('[Join Room API] Error:', error);
		return NextResponse.json(
			{ error: error.message || '加入房间失败' },
			{ status: 500 }
		);
	}
}

