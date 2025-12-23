import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('BaikeStatusAPI');

/**
 * 获取游戏状态
 * GET /api/games/baike/status?date=20251219
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

		// 获取用户ID（可选）
		const session = await readSession();
		const userId = session?.sub || null;

		// 获取游戏记录（如果用户已登录）
		let gameRecord = null;
		if (userId) {
			gameRecord = await prisma.baikeGameRecord.findUnique({
				where: { date_userId: { date, userId } },
				include: {
					question: {
						select: {
							id: true,
							date: true,
							title: true
						}
					}
				}
			});
		}

		// 如果用户已登录但没有记录，返回初始状态
		if (userId && !gameRecord) {
			return NextResponse.json({
				success: true,
				data: {
					date,
					guessCount: 0,
					isCompleted: false,
					revealedChars: [],
					completedAt: null
				}
			});
		}

		// 返回游戏状态
		return NextResponse.json({
			success: true,
			data: {
				questionId: gameRecord?.questionId || null,
				date,
				guessCount: gameRecord?.guessCount || 0,
				isCompleted: gameRecord?.isCompleted || false,
				revealedChars: (gameRecord?.revealedChars as string[]) || [],
				completedAt: gameRecord?.completedAt?.toISOString() || null
			}
		});
	} catch (error: any) {
		log.error('获取游戏状态失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '获取游戏状态失败' },
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





