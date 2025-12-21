import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('BaikeStatsAPI');

/**
 * 获取统计信息
 * GET /api/games/baike/stats?date=20251219
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const date = searchParams.get('date') || getTodayDate();

		// 验证日期格式
		if (!/^\d{8}$/.test(date)) {
			return NextResponse.json(
				{ error: 'Invalid date format. Expected YYYYMMDD' },
				{ status: 400 }
			);
		}

		// 统计已完成游戏的数量
		const totalCompleted = await prisma.baikeGameRecord.count({
			where: {
				date,
				isCompleted: true
			}
		});

		// 计算平均猜测次数（仅统计已完成的）
		const completedRecords = await prisma.baikeGameRecord.findMany({
			where: {
				date,
				isCompleted: true
			},
			select: {
				guessCount: true
			}
		});

		const averageGuesses = completedRecords.length > 0
			? completedRecords.reduce((sum, record) => sum + record.guessCount, 0) / completedRecords.length
			: 0;

		return NextResponse.json({
			success: true,
			data: {
				date,
				totalGuessed: totalCompleted,
				averageGuesses: Math.round(averageGuesses * 10) / 10 // 保留一位小数
			}
		});
	} catch (error: any) {
		log.error('获取统计信息失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '获取统计信息失败' },
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

