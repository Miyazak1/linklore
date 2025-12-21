import { prisma } from '@/lib/db/client';
import { fetchRandomWikipediaTitle, isValidGameTitle } from '@/lib/wikipedia/fetcher';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('UpdateDailyQuestion');

/**
 * 更新每日题目
 * 从百度百科获取随机词条作为当日题目
 * @param date 日期（YYYYMMDD格式），如果不提供则使用今天
 * @param maxRetries 最大重试次数，默认5次
 */
export async function updateDailyQuestion(
	date?: string,
	maxRetries: number = 5
): Promise<{ success: boolean; questionId?: string; title?: string; error?: string }> {
	const targetDate = date || getTodayDate();
	
	log.info('开始更新每日题目', { date: targetDate });

	try {
		// 检查是否已存在当日题目
		const existing = await prisma.baikeQuestion.findUnique({
			where: { date: targetDate }
		});

		if (existing) {
			log.info('当日题目已存在', { date: targetDate, questionId: existing.id, title: existing.title });
			return {
				success: true,
				questionId: existing.id,
				title: existing.title
			};
		}

		// 从百度百科获取题目，最多重试maxRetries次
		let baikeData = null;
		let attempts = 0;

		while (attempts < maxRetries && !baikeData) {
			attempts++;
			log.debug(`尝试获取百度百科词条 (${attempts}/${maxRetries})`);

			const data = await fetchRandomWikipediaTitle();
			
			if (data && isValidGameTitle(data.title)) {
				baikeData = data;
				break;
			} else if (data) {
				log.warn('获取的标题不适合作为游戏题目', { title: data.title });
			}
		}

		if (!baikeData) {
			throw new Error(`无法从百度百科获取有效题目（已重试${maxRetries}次）`);
		}

		// 计算难度（基于标题长度）
		const difficulty = calculateDifficulty(baikeData.title);

		// 创建或更新题目
		const question = await prisma.baikeQuestion.upsert({
			where: { date: targetDate },
			update: {
				title: baikeData.title,
				description: baikeData.description,
				category: baikeData.category,
				difficulty
			},
			create: {
				date: targetDate,
				title: baikeData.title,
				description: baikeData.description,
				category: baikeData.category,
				difficulty
			}
		});

		log.info('每日题目更新成功', {
			date: targetDate,
			questionId: question.id,
			title: question.title,
			category: question.category,
			difficulty
		});

		return {
			success: true,
			questionId: question.id,
			title: question.title
		};
	} catch (error: any) {
		log.error('更新每日题目失败', error as Error);
		return {
			success: false,
			error: error.message || '更新题目失败'
		};
	}
}

/**
 * 计算题目难度（1-5）
 * 基于标题长度和复杂度
 */
function calculateDifficulty(title: string): number {
	const length = title.length;
	
	// 简单规则：
	// 5-10字符：难度1-2
	// 11-20字符：难度2-3
	// 21-30字符：难度3-4
	// 31+字符：难度4-5
	
	if (length <= 10) {
		return length <= 6 ? 1 : 2;
	} else if (length <= 20) {
		return length <= 15 ? 2 : 3;
	} else if (length <= 30) {
		return length <= 25 ? 3 : 4;
	} else {
		return length <= 40 ? 4 : 5;
	}
}

/**
 * 获取今天的日期（YYYYMMDD格式）
 */
function getTodayDate(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}

