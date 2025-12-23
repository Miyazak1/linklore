import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueSwitch');

/**
 * 每日议题切换机制
 * 确保每日有可用的议题，处理议题状态切换
 */

/**
 * 获取今天的日期（YYYYMMDD格式）
 */
export function getTodayDate(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}

/**
 * 确保今日有已发布的议题
 * 如果没有，尝试发布一个draft状态的议题
 */
export async function ensureTodayIssue(): Promise<{
	success: boolean;
	issueId?: string;
	error?: string;
}> {
	try {
		const today = getTodayDate();

		// 检查今日是否已有已发布的议题
		const published = await prisma.dailyIssue.findUnique({
			where: { date: today },
			select: { id: true, status: true }
		});

		if (published && published.status === 'published') {
			log.debug('今日议题已存在且已发布', { issueId: published.id, date: today });
			return {
				success: true,
				issueId: published.id
			};
		}

		// 如果有draft状态的议题，尝试发布
		if (published && published.status === 'draft') {
			log.info('发现draft状态的议题，尝试发布', {
				issueId: published.id,
				date: today
			});

			// 检查是否有足够的节点
			const nodeCount = await prisma.issueNode.count({
				where: { issueId: published.id }
			});

			if (nodeCount < 5) {
				log.warn('议题节点不足，无法发布', {
					issueId: published.id,
					nodeCount
				});
				return {
					success: false,
					error: '议题节点不足，无法发布'
				};
			}

			// 更新状态为published
			await prisma.dailyIssue.update({
				where: { id: published.id },
				data: { status: 'published' }
			});

			log.info('议题已发布', { issueId: published.id, date: today });
			return {
				success: true,
				issueId: published.id
			};
		}

		// 如果没有议题，返回错误
		log.warn('今日没有可用议题', { date: today });
		return {
			success: false,
			error: '今日没有可用议题'
		};
	} catch (error: any) {
		log.error('确保今日议题失败', error as Error);
		return {
			success: false,
			error: error.message || '确保今日议题失败'
		};
	}
}

/**
 * 归档旧议题
 * 将7天前的议题状态改为archived
 */
export async function archiveOldIssues(): Promise<number> {
	try {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		const dateStr = formatDate(sevenDaysAgo);

		// 查找需要归档的议题
		const oldIssues = await prisma.dailyIssue.findMany({
			where: {
				status: 'published',
				date: {
					lt: dateStr
				}
			},
			select: { id: true, date: true }
		});

		if (oldIssues.length === 0) {
			log.debug('没有需要归档的议题');
			return 0;
		}

		// 批量归档
		await prisma.dailyIssue.updateMany({
			where: {
				id: {
					in: oldIssues.map((i) => i.id)
				}
			},
			data: {
				status: 'archived'
			}
		});

		log.info('已归档旧议题', {
			count: oldIssues.length,
			dates: oldIssues.map((i) => i.date)
		});

		return oldIssues.length;
	} catch (error: any) {
		log.error('归档旧议题失败', error as Error);
		return 0;
	}
}

/**
 * 格式化日期为YYYYMMDD
 */
function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}





