import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

/**
 * 接受邀请
 * POST /api/chat/invitations/:token/accept
 */
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ token: string }> }
) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { token } = await params;

		// 查找邀请
		const invitation = await prisma.chatInvitation.findUnique({
			where: { token },
			include: {
				room: {
					select: {
						id: true,
						type: true,
						status: true,
						creatorId: true,
						participantId: true
					}
				}
			}
		});

		if (!invitation) {
			return NextResponse.json({ error: '邀请不存在' }, { status: 404 });
		}

		// 检查邀请状态
		if (invitation.status !== 'PENDING') {
			return NextResponse.json(
				{
					error: '邀请已处理',
					status: invitation.status
				},
				{ status: 400 }
			);
		}

		// 检查是否过期
		if (invitation.expiresAt < new Date()) {
			await prisma.chatInvitation.update({
				where: { id: invitation.id },
				data: { status: 'EXPIRED' }
			});

			return NextResponse.json(
				{ error: '邀请已过期' },
				{ status: 400 }
			);
		}

		// 检查是否是邀请对象
		if (invitation.inviteeId !== session.sub) {
			return NextResponse.json(
				{ error: '无权接受此邀请' },
				{ status: 403 }
			);
		}

		// 检查房间状态
		if (invitation.room.status !== 'ACTIVE') {
			return NextResponse.json(
				{ error: '房间已关闭' },
				{ status: 400 }
			);
		}

		// 检查房间是否已有参与者
		if (invitation.room.participantId) {
			return NextResponse.json(
				{ error: '房间已有参与者' },
				{ status: 400 }
			);
		}

		// 使用事务更新邀请和房间
		const result = await prisma.$transaction(async (tx) => {
			// 更新邀请状态
			const updatedInvitation = await tx.chatInvitation.update({
				where: { id: invitation.id },
				data: {
					status: 'ACCEPTED',
					acceptedAt: new Date()
				}
			});

			// 更新房间：添加参与者，改为 DUO 类型
			const updatedRoom = await tx.chatRoom.update({
				where: { id: invitation.roomId },
				data: {
					type: 'DUO',
					participantId: session.sub,
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

			return { invitation: updatedInvitation, room: updatedRoom };
		});

		return NextResponse.json({
			ok: true,
			room: result.room,
			invitation: {
				id: result.invitation.id,
				status: result.invitation.status,
				acceptedAt: result.invitation.acceptedAt
			}
		});
	} catch (error: any) {
		console.error('[Accept Invitation API] Error:', error);
		return NextResponse.json(
			{ error: error.message || '接受邀请失败' },
			{ status: 500 }
		);
	}
}

