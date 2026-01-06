import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';

/**
 * POST /api/workshop/games/play
 * 保存游戏游玩记录
 */
export async function POST(req: NextRequest) {
	try {
		const session = await readSession();
		const body = await req.json();
		const { gameId, score, completed, answers, timeSpent } = body;

		if (!gameId) {
			return NextResponse.json(
				{ success: false, error: '游戏ID不能为空' },
				{ status: 400 }
			);
		}

		// 验证游戏是否存在
		const game = await prisma.gameInstance.findUnique({
			where: { id: gameId }
		});

		if (!game) {
			return NextResponse.json(
				{ success: false, error: '游戏不存在' },
				{ status: 404 }
			);
		}

		// 创建游戏记录
		const playRecord = await prisma.gamePlay.create({
			data: {
				gameId: gameId,
				userId: session?.sub ? String(session.sub) : null,
				score: score !== undefined ? score : null,
				completed: completed || false,
				answers: answers || [],
				timeSpent: timeSpent || null
			}
		});

		return NextResponse.json({
			success: true,
			play: {
				...playRecord,
				createdAt: playRecord.createdAt.toISOString()
			}
		});
	} catch (err: any) {
		console.error('[Workshop Games Play API] Error:', err);
		return NextResponse.json(
			{ success: false, error: err.message || '保存游戏记录失败' },
			{ status: 500 }
		);
	}
}



