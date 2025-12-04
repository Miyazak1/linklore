import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { requireRoomAccess } from '@/lib/security/roomAccess';

/**
 * GET /api/chat/rooms/:id
 * 获取聊天室详情
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

		const { id } = await params;

		// 检查访问权限
		await requireRoomAccess(id, session.sub);

		// 获取房间详情
		const room = await prisma.chatRoom.findUnique({
			where: { id },
			include: {
				creator: {
					select: {
						id: true,
						email: true,
						name: true,
						avatarUrl: true
					}
				},
				participant: {
					select: {
						id: true,
						email: true,
						name: true,
						avatarUrl: true
					}
				},
				_count: {
					select: {
						messages: {
							where: { deletedAt: null }
						}
					}
				}
			}
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		return NextResponse.json({ room });
	} catch (error: any) {
		if (error.message === '房间不存在' || error.message === '无权访问此房间') {
			return NextResponse.json({ error: error.message }, { status: 403 });
		}
		return NextResponse.json(
			{ error: error.message || '获取聊天室详情失败' },
			{ status: 500 }
		);
	}
}

/**
 * DELETE /api/chat/rooms/:id
 * 单方面删除房间（创建者或参与者都可以删除，只影响自己的视图）
 */
export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { id } = await params;

		// 获取房间信息
		const room = await prisma.chatRoom.findUnique({
			where: { id },
			select: {
				creatorId: true,
				participantId: true,
				status: true,
				creatorDeletedAt: true,
				participantDeletedAt: true
			}
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		// 检查用户是否是创建者或参与者
		if (room.creatorId !== session.sub && room.participantId !== session.sub) {
			return NextResponse.json({ error: '无权删除此房间' }, { status: 403 });
		}

		// 检查房间状态
		if (room.status === 'DISSOLVED') {
			return NextResponse.json({ error: '房间已解散' }, { status: 400 });
		}

		// 根据用户角色设置对应的删除时间
		const updateData: any = {};
		if (room.creatorId === session.sub) {
			updateData.creatorDeletedAt = new Date();
		}
		if (room.participantId === session.sub) {
			updateData.participantDeletedAt = new Date();
		}

		// 更新房间（只设置删除时间，不改变 status）
		await prisma.chatRoom.update({
			where: { id },
			data: updateData
		});

		return NextResponse.json({ ok: true });
	} catch (error: any) {
		if (error.message === '房间不存在' || error.message.includes('无权')) {
			return NextResponse.json({ error: error.message }, { status: 403 });
		}
		return NextResponse.json(
			{ error: error.message || '删除房间失败' },
			{ status: 500 }
		);
	}
}

