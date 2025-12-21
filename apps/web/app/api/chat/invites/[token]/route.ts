import { NextResponse } from 'next/server';
import { chatDb } from '@/lib/modules/chat/db';
import { prisma } from '@/lib/db/client'; // 保留用于 ChatInvitation 和 User
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('Invite Token API');

/**
 * GET /api/chat/invites/:token
 * 验证邀请token并返回房间信息（不需要登录）
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ token: string }> }
) {
	try {
		const { token } = await params;

		// 查找邀请
		const invitation = await prisma.chatInvitation.findUnique({
			where: { token },
			include: {
				room: {
					select: {
						id: true,
						type: true,
						topic: true,
						status: true,
						creatorId: true,
						participantId: true,
						creator: {
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
				}
			}
		});

		if (!invitation) {
			return NextResponse.json({ error: '邀请不存在' }, { status: 404 });
		}

		// 检查邀请状态
		if (invitation.status !== 'PENDING') {
			return NextResponse.json({ error: '邀请已处理' }, { status: 400 });
		}

		// 检查是否过期
		if (invitation.expiresAt < new Date()) {
			return NextResponse.json({ error: '邀请已过期' }, { status: 400 });
		}

		// 检查房间状态
		if (invitation.room.status !== 'ACTIVE') {
			return NextResponse.json({ error: '房间已关闭' }, { status: 400 });
		}

		// 检查房间是否已有参与者
		if (invitation.room.participantId) {
			return NextResponse.json({ error: '房间已有参与者' }, { status: 400 });
		}

		return NextResponse.json({
			ok: true,
			invitation: {
				id: invitation.id,
				token: invitation.token,
				room: invitation.room,
				inviter: invitation.inviter,
				expiresAt: invitation.expiresAt
			}
		});
	} catch (error: any) {
		log.error('验证邀请失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '验证邀请失败' },
			{ status: 500 }
		);
	}
}


