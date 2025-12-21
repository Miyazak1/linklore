import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { chatDb } from '@/lib/modules/chat/db';
import { requireRoomAccess } from '@/lib/security/roomAccess';
import { z } from 'zod';

const ChangeTopicRequestSchema = z.object({
	newTopic: z.string().min(1, '新主题不能为空'),
	newDescription: z.string().optional(),
	action: z.enum(['request', 'approve', 'reject']).optional().default('request')
});

/**
 * POST /api/chat/rooms/:id/topic/change
 * 请求更换话题或批准/拒绝更换话题请求
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
		const { newTopic, newDescription, action } = ChangeTopicRequestSchema.parse(body);

		// 检查访问权限
		await requireRoomAccess(roomId, session.sub);

		// 获取房间信息
		const room = await chatDb.rooms.findUnique({
			where: { id: roomId },
			select: {
				creatorId: true,
				participantId: true,
				topicChangeRequest: true,
				topicChangeRequestedBy: true
			}
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		if (action === 'request') {
			// 请求更换话题
			if (room.topicChangeRequest) {
				return NextResponse.json(
					{ error: '已有待处理的更换话题请求' },
					{ status: 400 }
				);
			}

			// 创建更换话题请求
			const updatedRoom = await chatDb.rooms.update({
				where: { id: roomId },
				data: {
					topicChangeRequest: newTopic,
					topicChangeRequestedBy: session.sub,
					topicChangeRequestedAt: new Date()
				}
			});

			return NextResponse.json({
				room: updatedRoom,
				message: '更换话题请求已发送，等待对方同意'
			});
		} else if (action === 'approve') {
			// 批准更换话题请求
			if (!room.topicChangeRequest) {
				return NextResponse.json(
					{ error: '没有待处理的更换话题请求' },
					{ status: 400 }
				);
			}

			// 只有另一方可以批准
			const isCreator = room.creatorId === session.sub;
			const isParticipant = room.participantId === session.sub;

			if (isCreator && room.topicChangeRequestedBy === room.creatorId) {
				return NextResponse.json(
					{ error: '不能批准自己的请求' },
					{ status: 400 }
				);
			}
			if (isParticipant && room.topicChangeRequestedBy === room.participantId) {
				return NextResponse.json(
					{ error: '不能批准自己的请求' },
					{ status: 400 }
				);
			}

			// 更新主题
			const updatedRoom = await chatDb.rooms.update({
				where: { id: roomId },
				data: {
					topic: room.topicChangeRequest,
					topicDescription: newDescription || null,
					topicChangeRequest: null,
					topicChangeRequestedBy: null,
					topicChangeRequestedAt: null
				}
			});

			return NextResponse.json({
				room: updatedRoom,
				message: '话题已更换'
			});
		} else if (action === 'reject') {
			// 拒绝更换话题请求
			if (!room.topicChangeRequest) {
				return NextResponse.json(
					{ error: '没有待处理的更换话题请求' },
					{ status: 400 }
				);
			}

			// 只有另一方可以拒绝
			const isCreator = room.creatorId === session.sub;
			const isParticipant = room.participantId === session.sub;

			if (isCreator && room.topicChangeRequestedBy === room.creatorId) {
				return NextResponse.json(
					{ error: '不能拒绝自己的请求' },
					{ status: 400 }
				);
			}
			if (isParticipant && room.topicChangeRequestedBy === room.participantId) {
				return NextResponse.json(
					{ error: '不能拒绝自己的请求' },
					{ status: 400 }
				);
			}

			// 清除请求
			const updatedRoom = await chatDb.rooms.update({
				where: { id: roomId },
				data: {
					topicChangeRequest: null,
					topicChangeRequestedBy: null,
					topicChangeRequestedAt: null
				}
			});

			return NextResponse.json({
				room: updatedRoom,
				message: '更换话题请求已拒绝'
			});
		}

		return NextResponse.json({ error: '无效的操作' }, { status: 400 });
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '请求参数错误', details: error.errors },
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ error: error.message || '操作失败' },
			{ status: 500 }
		);
	}
}











