import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('BaikeResetAPI');

/**
 * 重置游戏状态
 * DELETE /api/games/baike/reset?date=20251219
 */
export async function DELETE(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const date = searchParams.get('date');

		if (!date || !/^\d{8}$/.test(date)) {
			return NextResponse.json(
				{ error: 'Invalid date format. Expected YYYYMMDD' },
				{ status: 400 }
			);
		}

		// 获取用户ID（可选，支持匿名用户）
		const session = await readSession();
		const userId = session?.sub || null;

		// 如果是匿名用户，直接返回成功（匿名用户没有服务器端状态需要清除）
		if (!userId) {
			return NextResponse.json({
				success: true,
				data: {
					deletedCount: 0,
					message: 'Anonymous user, no server-side state to clear'
				}
			});
		}

		// 删除用户的游戏记录
		const deletedRecord = await prisma.baikeGameRecord.deleteMany({
			where: {
				date,
				userId
			}
		});

		return NextResponse.json({
			success: true,
			data: {
				deletedCount: deletedRecord.count
			}
		});
	} catch (error: any) {
		log.error('重置游戏状态失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '重置游戏状态失败' },
			{ status: 500 }
		);
	}
}
