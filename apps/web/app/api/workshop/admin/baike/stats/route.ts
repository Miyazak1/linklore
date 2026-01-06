import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';
import { requireAdmin } from '@/lib/auth/admin';

const log = createModuleLogger('BaikeStatsAdminAPI');

/**
 * 获取每日百科统计数据（管理员）
 * GET /api/workshop/admin/baike/stats?date=20251219
 */
export async function GET(req: NextRequest) {
	try {
		// 验证管理员权限
		await requireAdmin();

		const { searchParams } = new URL(req.url);
		const date = searchParams.get('date') || getTodayDate();

		// 验证日期格式
		if (!/^\d{8}$/.test(date)) {
			return NextResponse.json(
				{ error: 'Invalid date format. Expected YYYYMMDD' },
				{ status: 400 }
			);
		}

		// 获取题目信息
		const question = await prisma.baikeQuestion.findUnique({
			where: { date }
		});

		// 统计总游玩次数
		const totalPlays = await prisma.baikeGameRecord.count({
			where: { date }
		});

		// 统计成功次数（已完成）
		const totalCompleted = await prisma.baikeGameRecord.count({
			where: {
				date,
				isCompleted: true
			}
		});

		// 统计失败次数（未完成）
		const totalFailed = await prisma.baikeGameRecord.count({
			where: {
				date,
				isCompleted: false
			}
		});

		// 统计唯一玩家数（非匿名用户）
		const uniquePlayersResult = await prisma.baikeGameRecord.findMany({
			where: {
				date,
				userId: { not: null }
			},
			select: {
				userId: true
			},
			distinct: ['userId']
		});
		const uniquePlayers = uniquePlayersResult.length;

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
			stats: {
				date,
				totalQuestions: question ? 1 : 0,
				totalPlays,
				totalCompleted,
				totalFailed,
				uniquePlayers,
				averageGuesses: Math.round(averageGuesses * 10) / 10,
				questionTitle: question?.title || null,
				questionCategory: question?.category || null
			}
		});
	} catch (error: any) {
		log.error('获取统计数据失败', error as Error);
		
		// 如果是权限错误，返回401
		if (error.message?.includes('未授权') || error.message?.includes('管理员')) {
			return NextResponse.json(
				{ error: '需要管理员权限' },
				{ status: 401 }
			);
		}

		return NextResponse.json(
			{ error: error.message || '获取统计数据失败' },
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



