import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { requireRoomAccess } from '@/lib/security/roomAccess';

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

		// 获取房间信息
		const room = await prisma.chatRoom.findUnique({
			where: { id: roomId },
			select: {
				creatorId: true,
				participantId: true,
				creatorCharterAccepted: true,
				participantCharterAccepted: true
			}
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		// 更新同意状态
		const isCreator = room.creatorId === session.sub;
		const updateData: any = {};

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

		const updatedRoom = await prisma.chatRoom.update({
			where: { id: roomId },
			data: updateData
		});

		return NextResponse.json({
			room: updatedRoom,
			allAccepted:
				updatedRoom.creatorCharterAccepted &&
				(updatedRoom.participantCharterAccepted || !room.participantId)
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

		const room = await prisma.chatRoom.findUnique({
			where: { id: roomId },
			select: {
				creatorCharterAccepted: true,
				participantCharterAccepted: true,
				participantId: true
			}
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		return NextResponse.json({
			creatorAccepted: room.creatorCharterAccepted,
			participantAccepted: room.participantCharterAccepted,
			allAccepted:
				room.creatorCharterAccepted &&
				(room.participantCharterAccepted || !room.participantId)
		});
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.message || '获取状态失败' },
			{ status: 500 }
		);
	}
}

