/**
 * 聊天室访问权限检查
 */

import { prisma } from '@/lib/db/client';

/**
 * 检查用户是否有权访问聊天室
 */
export async function requireRoomAccess(
	roomId: string,
	userId: string
): Promise<void> {
	const room = await prisma.chatRoom.findUnique({
		where: { id: roomId },
		select: {
			creatorId: true,
			participantId: true,
			status: true,
			creatorDeletedAt: true,
			participantDeletedAt: true
		}
	});

	if (!room) {
		throw new Error('房间不存在');
	}

	if (room.status === 'DISSOLVED') {
		throw new Error('房间已解散');
	}

	// 检查用户是否是创建者或参与者
	if (room.creatorId !== userId && room.participantId !== userId) {
		throw new Error('无权访问此房间');
	}

	// 检查用户是否已删除此房间（单方面删除）
	if (room.creatorId === userId && room.creatorDeletedAt) {
		throw new Error('您已删除此房间');
	}
	if (room.participantId === userId && room.participantDeletedAt) {
		throw new Error('您已删除此房间');
	}
}

/**
 * 检查用户是否是房间创建者
 */
export async function requireRoomCreator(
	roomId: string,
	userId: string
): Promise<void> {
	const room = await prisma.chatRoom.findUnique({
		where: { id: roomId },
		select: { creatorId: true }
	});

	if (!room) {
		throw new Error('房间不存在');
	}

	if (room.creatorId !== userId) {
		throw new Error('只有房间创建者可以执行此操作');
	}
}

/**
 * 检查用户是否可以发送消息
 */
export async function canSendMessage(
	roomId: string,
	userId: string
): Promise<boolean> {
	try {
		await requireRoomAccess(roomId, userId);
		return true;
	} catch {
		return false;
	}
}

