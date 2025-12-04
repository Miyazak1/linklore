import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { identifyUserPairs } from '@/lib/processing/userPairIdentifier';
import { isDiscussionParticipant } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id: topicId } = await params;
		
		// 获取当前用户ID（如果提供）
		const url = new URL(req.url);
		const currentUserId = url.searchParams.get('currentUserId');
		
		// 验证话题是否存在
		const topic = await prisma.topic.findUnique({ where: { id: topicId } });
		if (!topic) {
			return NextResponse.json({ error: '话题不存在' }, { status: 404 });
		}

		// 1. 识别所有用户对
		const userPairs = await identifyUserPairs(topicId);

		// 2. 如果提供了currentUserId，判断是否是讨论者
		// 只有讨论者才能看到用户对信息，非讨论者返回空列表
		let relevantPairs = userPairs;
		if (currentUserId) {
			const isParticipant = await isDiscussionParticipant(topicId, currentUserId);
			if (!isParticipant) {
				// 非讨论者返回空列表
				return NextResponse.json({
					users: [],
					totalUsers: 0,
					totalPairs: 0
				}, {
					headers: { 'Content-Type': 'application/json' }
				});
			}
			
			// 讨论者：只返回与当前用户有直接讨论关系的用户
			relevantPairs = userPairs.filter(pair => 
				pair.userId1 === currentUserId || pair.userId2 === currentUserId
			);
		}

		// 3. 收集参与讨论的用户ID
		const userIds = new Set<string>();
		relevantPairs.forEach(pair => {
			userIds.add(pair.userId1);
			userIds.add(pair.userId2);
		});

		// 4. 获取用户信息
		const users = await prisma.user.findMany({
			where: { id: { in: Array.from(userIds) } },
			select: {
				id: true,
				email: true,
				name: true,
				avatarUrl: true
			}
		});

		// 5. 统计每个用户的文档数和讨论次数
		const userStats = new Map<string, { documentCount: number; discussionCount: number }>();
		
		// 初始化
		users.forEach(user => {
			userStats.set(user.id, { documentCount: 0, discussionCount: 0 });
		});

		// 统计文档数
		const docs = await prisma.document.findMany({
			where: { 
				topicId,
				authorId: { in: Array.from(userIds) }
			},
			select: { authorId: true }
		});

		docs.forEach(doc => {
			const stats = userStats.get(doc.authorId);
			if (stats) {
				stats.documentCount++;
			}
		});

		// 统计讨论次数（参与的用户对数量，只统计与当前用户相关的）
		relevantPairs.forEach(pair => {
			const stats1 = userStats.get(pair.userId1);
			const stats2 = userStats.get(pair.userId2);
			if (stats1) stats1.discussionCount++;
			if (stats2) stats2.discussionCount++;
		});

		// 6. 构建响应
		const userList = users.map(user => {
			const stats = userStats.get(user.id) || { documentCount: 0, discussionCount: 0 };
			return {
				userId: user.id,
				email: user.email,
				name: user.name,
				avatarUrl: user.avatarUrl,
				documentCount: stats.documentCount,
				discussionCount: stats.discussionCount
			};
		}).sort((a, b) => b.discussionCount - a.discussionCount); // 按讨论次数排序

		return NextResponse.json({
			users: userList,
			totalUsers: userList.length,
			totalPairs: relevantPairs.length
		}, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[Consensus Users API] Error:', err);
		return NextResponse.json({ error: err.message || '获取用户列表失败' }, { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}



