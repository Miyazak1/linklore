import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

/**
 * GET /api/topics/[id]/participants
 * 获取话题的所有讨论参与者（已点击参与讨论的用户）
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id: topicId } = await params;
		
		// 验证话题是否存在
		const topic = await prisma.topic.findUnique({ where: { id: topicId } });
		if (!topic) {
			return NextResponse.json({ error: '话题不存在' }, { status: 404 });
		}

		// 获取所有参与者
		const participants = await prisma.topicParticipant.findMany({
			where: { topicId },
			include: {
				user: {
					select: {
						id: true,
						email: true,
						name: true,
						avatarUrl: true
					}
				}
			},
			orderBy: {
				joinedAt: 'asc' // 按参与时间排序
			}
		});

		// 构建响应
		const participantList = participants.map(p => ({
			userId: p.user.id,
			email: p.user.email,
			name: p.user.name,
			avatarUrl: p.user.avatarUrl,
			joinedAt: p.joinedAt.toISOString()
		}));

		return NextResponse.json({
			participants: participantList,
			total: participantList.length
		}, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[Topic Participants API] Error:', err);
		return NextResponse.json(
			{ error: err.message || '获取参与者列表失败' },
			{ status: 500 }
		);
	}
}

