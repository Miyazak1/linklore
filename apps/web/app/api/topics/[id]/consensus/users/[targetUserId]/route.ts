import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { isDiscussionParticipant, canViewDisagreement } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
	_: Request,
	{ params }: { params: Promise<{ id: string; targetUserId: string }> }
) {
	try {
		const { id: topicId, targetUserId } = await params;
		
		// 获取当前用户
		const session = await readSession();
		const currentUserId = session?.sub ? String(session.sub) : null;

		if (!currentUserId) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		// 检查是否是讨论者
		const isParticipant = await isDiscussionParticipant(topicId, currentUserId);
		if (!isParticipant) {
			return NextResponse.json({ error: '需要参与讨论才能查看分歧分析' }, { status: 403 });
		}

		// 检查是否可以查看与目标用户的分歧分析
		const canView = await canViewDisagreement(topicId, currentUserId, targetUserId);
		if (!canView) {
			return NextResponse.json({ 
				error: '未找到用户对关系',
				message: '这两个用户之间可能还没有进行过直接讨论'
			}, { status: 404 });
		}

		// 验证话题是否存在
		const topic = await prisma.topic.findUnique({ where: { id: topicId } });
		if (!topic) {
			return NextResponse.json({ error: '话题不存在' }, { status: 404 });
		}

		// 确保userId1 < userId2（用于查询）
		const [userId1, userId2] = currentUserId < targetUserId
			? [currentUserId, targetUserId]
			: [targetUserId, currentUserId];

		// 查询用户对共识记录
		const userConsensus = await prisma.userConsensus.findUnique({
			where: {
				topicId_userId1_userId2: {
					topicId,
					userId1,
					userId2
				}
			},
			include: {
				user1: { select: { id: true, email: true, name: true } },
				user2: { select: { id: true, email: true, name: true } }
			}
		});

		if (!userConsensus) {
			// 如果没有找到用户对共识记录，尝试实时计算
			// 检查这两个用户是否有直接讨论关系
			const { identifyUserPairs } = await import('@/lib/processing/userPairIdentifier');
			const userPairs = await identifyUserPairs(topicId);
			const hasPair = userPairs.some(pair => 
				(pair.userId1 === userId1 && pair.userId2 === userId2) ||
				(pair.userId1 === userId2 && pair.userId2 === userId1)
			);

			if (!hasPair) {
				return NextResponse.json({
					error: '未找到用户对关系',
					message: '这两个用户之间可能还没有进行过直接讨论'
				}, { status: 404 });
			}

			// 如果有用户对关系但没有分析记录，自动触发分析
			try {
				const { enqueueUserPairAnalysis } = await import('@/lib/queue/jobs');
				await enqueueUserPairAnalysis(topicId, userId1, userId2);
				console.log(`[User Pair Consensus API] Auto-triggered analysis for users ${userId1} and ${userId2} in topic ${topicId}`);
			} catch (err: any) {
				console.error(`[User Pair Consensus API] Failed to auto-trigger analysis:`, err);
			}

			// 返回"分析中"状态，让前端轮询
			return NextResponse.json({
				error: '分析尚未完成',
				message: '这两个用户之间有讨论关系，分析已自动触发，请稍候...',
				hasPair: true,
				analyzing: true
			}, { status: 202 }); // 202 Accepted - 表示请求已接受，正在处理
		}

		// 构建响应
		const response = {
			user1: {
				userId: userConsensus.user1.id,
				email: userConsensus.user1.email,
				name: userConsensus.user1.name
			},
			user2: {
				userId: userConsensus.user2.id,
				email: userConsensus.user2.email,
				name: userConsensus.user2.name
			},
			consensus: (userConsensus.consensus as any) || [],
			disagreements: (userConsensus.disagreements as any) || [],
			consensusScore: userConsensus.consensusScore,
			divergenceScore: userConsensus.divergenceScore,
			discussionPaths: (userConsensus.discussionPaths as any) || [],
			lastAnalyzedAt: userConsensus.lastAnalyzedAt
		};

		return NextResponse.json(response, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[User Pair Consensus API] Error:', err);
		return NextResponse.json({ error: err.message || '获取用户对共识失败' }, { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}



