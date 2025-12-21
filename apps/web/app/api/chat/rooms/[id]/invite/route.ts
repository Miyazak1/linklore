import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { requireRoomAccess } from '@/lib/security/roomAccess';

const InviteRequestSchema = z.object({
	inviteeEmail: z.string().email('请输入有效的邮箱地址')
});

/**
 * 发送聊天室邀请
 * POST /api/chat/rooms/:id/invite
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

		// 验证房间访问权限
		await requireRoomAccess(roomId, session.sub);

		// 解析请求体
		const body = await req.json();
		const { inviteeEmail } = InviteRequestSchema.parse(body);

		// 获取房间信息
		const room = await chatDb.rooms.findUnique({
			where: { id: roomId },
			select: {
				type: true,
				creatorId: true,
				participantId: true,
				status: true
			}
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		// 检查房间状态
		if (room.status !== 'ACTIVE') {
			return NextResponse.json(
				{ error: '房间已关闭，无法发送邀请' },
				{ status: 400 }
			);
		}

		// 检查房间类型（只有 SOLO 房间可以邀请）
		if (room.type !== 'SOLO') {
			return NextResponse.json(
				{ error: '只有单人房间可以发送邀请' },
				{ status: 400 }
			);
		}

		// 检查是否已经有人参与
		if (room.participantId) {
			return NextResponse.json(
				{ error: '房间已有参与者，无法再邀请' },
				{ status: 400 }
			);
		}

		// 检查邀请者是否是创建者
		if (room.creatorId !== session.sub) {
			return NextResponse.json(
				{ error: '只有房间创建者可以发送邀请' },
				{ status: 403 }
			);
		}

		// 查找被邀请用户
		const invitee = await prisma.user.findUnique({
			where: { email: inviteeEmail },
			select: { id: true, name: true, email: true }
		});

		if (!invitee) {
			return NextResponse.json(
				{ error: '用户不存在，请确认邮箱地址' },
				{ status: 404 }
			);
		}

		// 不能邀请自己
		if (invitee.id === session.sub) {
			return NextResponse.json(
				{ error: '不能邀请自己' },
				{ status: 400 }
			);
		}

		// 检查是否已有待处理的邀请
		const existingInvitation = await prisma.chatInvitation.findFirst({
			where: {
				roomId,
				inviteeId: invitee.id,
				status: 'PENDING',
				expiresAt: {
					gt: new Date()
				}
			}
		});

		if (existingInvitation) {
			return NextResponse.json(
				{
					error: '已存在待处理的邀请',
					invitation: {
						token: existingInvitation.token,
						expiresAt: existingInvitation.expiresAt
					}
				},
				{ status: 400 }
			);
		}

		// 生成邀请令牌
		const token = Buffer.from(
			`${roomId}:${invitee.id}:${Date.now()}:${Math.random()}`
		)
			.toString('base64')
			.replace(/[+/=]/g, '');

		// 创建邀请（7天有效期）
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 7);

		const invitation = await prisma.chatInvitation.create({
			data: {
				roomId,
				inviterId: session.sub,
				inviteeId: invitee.id,
				token,
				status: 'PENDING',
				expiresAt
			},
			include: {
				invitee: {
					select: {
						id: true,
						name: true,
						email: true,
						avatarUrl: true
					}
				}
			}
		});

		// 更新房间状态
		await chatDb.rooms.update({
			where: { id: roomId },
			data: {
				invitedAt: new Date()
			}
		});

		return NextResponse.json({
			ok: true,
			invitation: {
				id: invitation.id,
				token: invitation.token,
				invitee: invitation.invitee,
				expiresAt: invitation.expiresAt,
				inviteUrl: `/chat/invite/${invitation.token}`
			}
		});
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '请求参数错误', details: error.errors },
				{ status: 400 }
			);
		}

		console.error('[Invite API] Error:', error);
		return NextResponse.json(
			{ error: error.message || '发送邀请失败' },
			{ status: 500 }
		);
	}
}











