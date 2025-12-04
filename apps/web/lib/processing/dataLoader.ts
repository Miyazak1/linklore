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

/**
 * 批量加载溯源信息
 */
export async function loadTracesBatch(traceIds: string[]) {
	if (traceIds.length === 0) return [];

	const traces = await prisma.trace.findMany({
		where: {
			id: { in: traceIds }
		},
		include: {
			editor: {
				select: {
					id: true,
					email: true,
					name: true
				}
			},
			citationsList: {
				orderBy: { number: 'asc' }
			},
			analysis: true
		}
	});

	const traceMap = new Map(traces.map(t => [t.id, t]));
	return traceIds.map(id => traceMap.get(id) || null).filter(Boolean);
}

/**
 * 批量加载词条信息
 */
export async function loadEntriesBatch(slugs: string[]) {
	if (slugs.length === 0) return [];

	const entries = await prisma.entry.findMany({
		where: {
			slug: { in: slugs }
		},
		include: {
			sourceTrace: {
				select: {
					id: true,
					title: true,
					editor: {
						select: {
							id: true,
							email: true,
							name: true
						}
					}
				}
			},
			citationsList: {
				orderBy: { number: 'asc' }
			}
		}
	});

	const entryMap = new Map(entries.map(e => [e.slug, e]));
	return slugs.map(slug => entryMap.get(slug) || null).filter(Boolean);
}

/**
 * 批量加载分析结果
 */
export async function loadAnalysesBatch(traceIds: string[]) {
	if (traceIds.length === 0) return [];

	const analyses = await prisma.traceAnalysis.findMany({
		where: {
			traceId: { in: traceIds }
		}
	});

	const analysisMap = new Map(analyses.map(a => [a.traceId, a]));
	return traceIds.map(id => analysisMap.get(id) || null);
}

