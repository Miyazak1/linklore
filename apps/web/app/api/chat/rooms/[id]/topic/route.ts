import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { chatDb } from '@/lib/modules/chat/db';
import { requireRoomAccess } from '@/lib/security/roomAccess';
import { z } from 'zod';

const SetTopicSchema = z.object({
	topic: z.string().min(1, '主题不能为空'),
	description: z.string().optional()
});

/**
 * POST /api/chat/rooms/:id/topic
 * 设置或更新讨论主题
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
		const body = await req.json();
		const { topic, description } = SetTopicSchema.parse(body);

		// 检查访问权限
		await requireRoomAccess(roomId, session.sub);

		// 获取房间信息
		const room = await chatDb.rooms.findUnique({
			where: { id: roomId },
			select: { creatorId: true, participantId: true }
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		// 只有创建者可以设置初始主题
		if (room.creatorId !== session.sub && !room.topic) {
			return NextResponse.json(
				{ error: '只有创建者可以设置初始主题' },
				{ status: 403 }
			);
		}

		// 更新主题
		const updatedRoom = await chatDb.rooms.update({
			where: { id: roomId },
			data: {
				topic,
				topicDescription: description || null
			}
		});

		return NextResponse.json({ room: updatedRoom });
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '请求参数错误', details: error.errors },
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ error: error.message || '设置主题失败' },
			{ status: 500 }
		);
	}
}

/**
 * GET /api/chat/rooms/:id/topic
 * 获取讨论主题
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
				topic: true,
				topicDescription: true,
				topicChangeRequest: true,
				topicChangeRequestedBy: true,
				topicChangeRequestedAt: true
			}
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		return NextResponse.json({
			topic: room.topic,
			description: room.topicDescription,
			changeRequest: room.topicChangeRequest
				? {
						request: room.topicChangeRequest,
						requestedBy: room.topicChangeRequestedBy,
						requestedAt: room.topicChangeRequestedAt
					}
				: null
		});
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.message || '获取主题失败' },
			{ status: 500 }
		);
	}
}











