import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueAnalyticsJob');

/**
 * 计算议题分析数据
 * 每日凌晨计算前一日数据，更新IssueAnalytics表，检测异常题目
 */
export async function calculateAnalytics(issueId: string, date: string) {
	try {
		log.info('开始计算议题分析数据', { issueId, date });

		// 获取所有路径记录
		const paths = await prisma.issuePath.findMany({
			where: {
				issueId,
				date
			},
			select: {
				path: true,
				completedAt: true,
				createdAt: true
			}
		});

		const totalAttempts = paths.length;
		const completedPaths = paths.filter((p) => p.completedAt !== null);
		const completionRate =
			totalAttempts > 0 ? completedPaths.length / totalAttempts : 0;

		// 计算路径分布
		const pathDistribution: Record<string, number> = {};
		for (const pathItem of paths) {
			const path = pathItem.path as any[];
			if (Array.isArray(path) && path.length > 0) {
				// 生成路径key（使用前3个节点的key组合）
				const pathKey = path
					.slice(0, 3)
					.map((step) => step.nodeKey)
					.join('->');
				pathDistribution[pathKey] = (pathDistribution[pathKey] || 0) + 1;
			}
		}

		// 计算平均完成时间
		let averageTime: number | null = null;
		const completedWithTime = completedPaths.filter(
			(p) => p.createdAt && p.completedAt
		);
		if (completedWithTime.length > 0) {
			const totalTime = completedWithTime.reduce((sum, p) => {
				if (p.createdAt && p.completedAt) {
					return (
						sum +
						(p.completedAt.getTime() - p.createdAt.getTime()) / 1000
					);
				}
				return sum;
			}, 0);
			averageTime = Math.round(totalTime / completedWithTime.length);
		}

		// 更新或创建分析数据
		await prisma.issueAnalytics.upsert({
			where: { issueId },
			update: {
				date,
				totalAttempts,
				completionRate,
				pathDistribution: pathDistribution as any,
				averageTime
			},
			create: {
				issueId,
				date,
				totalAttempts,
				completionRate,
				pathDistribution: pathDistribution as any,
				averageTime
			}
		});

		// 检测异常（一边倒选择）
		const maxPathCount = Math.max(...Object.values(pathDistribution), 0);
		const oneSidedRatio = totalAttempts > 0 ? maxPathCount / totalAttempts : 0;

		if (oneSidedRatio > 0.8) {
			log.warn('检测到一边倒选择', {
				issueId,
				date,
				ratio: oneSidedRatio,
				maxPathCount,
				totalAttempts
			});
		}

		log.info('议题分析数据计算完成', {
			issueId,
			date,
			totalAttempts,
			completionRate,
			averageTime
		});

		return {
			success: true,
			totalAttempts,
			completionRate,
			averageTime,
			oneSidedRatio
		};
	} catch (error: any) {
		log.error('计算分析数据失败', error as Error);
		throw error;
	}
}

/**
 * 批量计算所有议题的分析数据
 */
export async function calculateAllAnalytics(date?: string) {
	const targetDate = date || getYesterdayDate();

	log.info('开始批量计算分析数据', { date: targetDate });

	// 获取该日期的所有议题
	const issues = await prisma.dailyIssue.findMany({
		where: {
			date: targetDate,
			status: 'published'
		},
		select: {
			id: true,
			date: true,
			title: true
		}
	});

	const results = [];
	for (const issue of issues) {
		try {
			const result = await calculateAnalytics(issue.id, issue.date);
			results.push({
				issueId: issue.id,
				title: issue.title,
				...result
			});
		} catch (error: any) {
			log.error('计算议题分析失败', error as Error, {
				issueId: issue.id,
				title: issue.title
			});
			results.push({
				issueId: issue.id,
				title: issue.title,
				success: false,
				error: error.message
			});
		}
	}

	log.info('批量计算完成', {
		date: targetDate,
		total: issues.length,
		success: results.filter((r) => r.success).length
	});

	return results;
}

/**
 * 获取昨天的日期（YYYYMMDD格式）
 */
function getYesterdayDate(): string {
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const year = yesterday.getFullYear();
	const month = String(yesterday.getMonth() + 1).padStart(2, '0');
	const day = String(yesterday.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}

