/**
 * 监控指标收集
 * 收集关键业务指标用于监控和分析
 */

import { prisma } from '@/lib/db/client';
import { getCacheStats } from '@/lib/cache/traceCache';

export interface SystemMetrics {
	timestamp: Date;
	traces: {
		total: number;
		byStatus: Record<string, number>;
		byType: Record<string, number>;
		pendingAnalysis: number;
		avgCredibilityScore: number | null;
	};
	entries: {
		total: number;
		needsUpdate: number;
		avgVersion: number;
	};
	users: {
		total: number;
		byRole: Record<string, number>;
		activeEditors: number;
	};
	analysis: {
		total: number;
		avgProcessingTime: number | null;
		successRate: number;
	};
	performance: {
		avgResponseTime: number | null;
		cacheHitRate: number | null;
	};
}

/**
 * 收集系统指标
 */
export async function collectMetrics(): Promise<SystemMetrics> {
	const timestamp = new Date();

	// 并行收集各项指标
	const [
		traceStats,
		entryStats,
		userStats,
		analysisStats,
		recentTraces
	] = await Promise.all([
		// 溯源统计
		prisma.trace.groupBy({
			by: ['status', 'traceType'],
			_count: true
		}),
		// 词条统计
		prisma.entry.aggregate({
			_count: true,
			_avg: { version: true }
		}),
		// 用户统计
		prisma.user.groupBy({
			by: ['role'],
			_count: true
		}),
		// 分析统计
		prisma.traceAnalysis.aggregate({
			_count: true,
			_avg: { credibilityScore: true }
		}),
		// 最近的分析记录（用于计算处理时间）
		prisma.traceAnalysis.findMany({
			take: 100,
			orderBy: { analyzedAt: 'desc' },
			select: {
				analyzedAt: true,
				createdAt: true,
				credibilityScore: true
			}
		})
	]);

	// 处理溯源统计
	const tracesByStatus: Record<string, number> = {};
	const tracesByType: Record<string, number> = {};
	let totalTraces = 0;
	let pendingAnalysis = 0;

	traceStats.forEach((stat) => {
		totalTraces += stat._count;
		tracesByStatus[stat.status] = (tracesByStatus[stat.status] || 0) + stat._count;
		tracesByType[stat.traceType] = (tracesByType[stat.traceType] || 0) + stat._count;
		if (stat.status === 'PUBLISHED' || stat.status === 'ANALYZING') {
			pendingAnalysis += stat._count;
		}
	});

	// 计算平均可信度
	const avgCredibilityScore = analysisStats._avg.credibilityScore;

	// 处理用户统计
	const usersByRole: Record<string, number> = {};
	let totalUsers = 0;
	let activeEditors = 0;

	userStats.forEach((stat) => {
		totalUsers += stat._count;
		usersByRole[stat.role] = stat._count;
		if (stat.role === 'editor' || stat.role === 'admin') {
			activeEditors += stat._count;
		}
	});

	// 计算分析处理时间
	let avgProcessingTime: number | null = null;
	if (recentTraces.length > 0) {
		const processingTimes = recentTraces
			.filter((t) => t.analyzedAt && t.createdAt)
			.map((t) => {
				const analyzed = new Date(t.analyzedAt!);
				const created = new Date(t.createdAt);
				return analyzed.getTime() - created.getTime();
			})
			.filter((t) => t > 0);

		if (processingTimes.length > 0) {
			avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
		}
	}

	// 计算成功率（有可信度评分的分析视为成功）
	const successfulAnalysis = recentTraces.filter((t) => t.credibilityScore !== null).length;
	const successRate = recentTraces.length > 0 ? successfulAnalysis / recentTraces.length : 0;

	// 获取需要更新的词条数
	const needsUpdateCount = await prisma.entry.count({
		where: { needsUpdate: true }
	});

	// 获取缓存统计
	const cacheStats = getCacheStats();
	const cacheHitRate = cacheStats.hits + cacheStats.misses > 0
		? cacheStats.hits / (cacheStats.hits + cacheStats.misses)
		: null;

	return {
		timestamp,
		traces: {
			total: totalTraces,
			byStatus: tracesByStatus,
			byType: tracesByType,
			pendingAnalysis,
			avgCredibilityScore
		},
		entries: {
			total: entryStats._count,
			needsUpdate: needsUpdateCount,
			avgVersion: entryStats._avg.version || 0
		},
		users: {
			total: totalUsers,
			byRole: usersByRole,
			activeEditors
		},
		analysis: {
			total: analysisStats._count,
			avgProcessingTime,
			successRate
		},
		performance: {
			avgResponseTime: null, // 需要从API中间件收集
			cacheHitRate: cacheHitRate
		}
	};
}

/**
 * 获取指标摘要（用于快速查看）
 */
export async function getMetricsSummary() {
	const metrics = await collectMetrics();
	return {
		traces: metrics.traces.total,
		entries: metrics.entries.total,
		users: metrics.users.total,
		pendingAnalysis: metrics.traces.pendingAnalysis,
		avgCredibility: metrics.traces.avgCredibilityScore
			? (metrics.traces.avgCredibilityScore * 100).toFixed(1) + '%'
			: 'N/A'
	};
}

