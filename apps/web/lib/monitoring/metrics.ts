/**
 * 监控指标收集
 * 收集关键业务指标用于监控和分析
 */

import { prisma } from '@/lib/db/client';

export interface SystemMetrics {
	timestamp: Date;
	users: {
		total: number;
		byRole: Record<string, number>;
		activeEditors: number;
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
		userStats
	] = await Promise.all([
		// 用户统计
		prisma.user.groupBy({
			by: ['role'],
			_count: true
		})
	]);

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


	// 缓存统计（暂时禁用）
	const cacheHitRate: number | null = null;

	return {
		timestamp,
		users: {
			total: totalUsers,
			byRole: usersByRole,
			activeEditors
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
		users: metrics.users.total
	};
}

