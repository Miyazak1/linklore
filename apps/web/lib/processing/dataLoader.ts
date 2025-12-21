/**
 * 数据加载器
 * 用于批量加载数据，减少数据库查询次数
 */

import { prisma } from '@/lib/db/client';

/**
 * 批量加载用户信息
 */
export async function loadUsersBatch(userIds: string[]) {
	if (userIds.length === 0) return [];

	const users = await prisma.user.findMany({
		where: {
			id: { in: userIds }
		},
		select: {
			id: true,
			email: true,
			name: true,
			role: true
		}
	});

	// 创建映射以便快速查找
	const userMap = new Map(users.map(u => [u.id, u]));
	return userIds.map(id => userMap.get(id) || null).filter(Boolean);
}

// 语义溯源功能已移除

/**
 * 批量加载词条信息
 */
export async function loadEntriesBatch(slugs: string[]) {
	if (slugs.length === 0) return [];

	const entries = await prisma.entry.findMany({
		where: {
			slug: { in: slugs }
		}
	});

	const entryMap = new Map(entries.map(e => [e.slug, e]));
	return slugs.map(slug => entryMap.get(slug) || null).filter(Boolean);
}

// 语义溯源功能已移除

