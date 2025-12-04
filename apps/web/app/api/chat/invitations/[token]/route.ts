import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

/**
 * 验证邀请信息
 * GET /api/chat/invitations/:token
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ token: string }> }
) {
	try {
		const { token } = await params;

		const invitation = await prisma.chatInvitation.findUnique({
			where: { token },
			include: {
				room: {
					select: {
						id: true,
						type: true,
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
				},
				inviter: {
					select: {
						id: true,
						name: true,
						email: true,
						avatarUrl: true
					}
				},
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
			// 更新状态为过期
			await prisma.chatInvitation.update({
				where: { id: invitation.id },
				data: { status: 'EXPIRED' }
			});

			return NextResponse.json(
				{ error: '邀请已过期' },
				{ status: 400 }
			);
		}

		// 检查房间状态
		if (invitation.room.status !== 'ACTIVE') {
			return NextResponse.json(
				{ error: '房间已关闭' },
				{ status: 400 }
			);
		}

		return NextResponse.json({
			ok: true,
			invitation: {
				id: invitation.id,
				room: invitation.room,
				inviter: invitation.inviter,
				invitee: invitation.invitee,
				expiresAt: invitation.expiresAt,
				createdAt: invitation.createdAt
			}
		});
	} catch (error: any) {
		console.error('[Invitation API] Error:', error);
		return NextResponse.json(
			{ error: error.message || '验证邀请失败' },
			{ status: 500 }
		);
	}
}

