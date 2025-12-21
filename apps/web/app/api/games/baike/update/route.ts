import { NextRequest, NextResponse } from 'next/server';
import { updateDailyQuestion } from '@/lib/games/baike/updateDailyQuestion';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('BaikeUpdateAPI');

/**
 * 更新每日题目
 * POST /api/games/baike/update?date=20251219
 * 
 * 可以手动触发更新，也可以由定时任务调用
 * 如果提供date参数，更新指定日期的题目；否则更新今天的题目
 */
export async function POST(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const date = searchParams.get('date');

		// 验证日期格式（如果提供）
		if (date && !/^\d{8}$/.test(date)) {
			return NextResponse.json(
				{ error: 'Invalid date format. Expected YYYYMMDD' },
				{ status: 400 }
			);
		}

		log.info('收到更新题目请求', { date: date || 'today' });

		const result = await updateDailyQuestion(date);

		if (!result.success) {
			return NextResponse.json(
				{ error: result.error || '更新题目失败' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: '题目更新成功',
			data: {
				questionId: result.questionId,
				title: result.title,
				date: date || getTodayDate()
			}
		});
	} catch (error: any) {
		log.error('更新题目失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '更新题目失败' },
			{ status: 500 }
		);
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

