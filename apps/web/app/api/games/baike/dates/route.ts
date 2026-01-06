import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('BaikeDatesAPI');

/**
 * 获取所有有题目的日期列表
 * GET /api/games/baike/dates?year=2026&month=1
 */
export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const year = searchParams.get('year');
		const month = searchParams.get('month');

		// 构建查询条件
		let where: any = {};
		
		if (year && month) {
			// 查询指定年月
			const yearNum = parseInt(year, 10);
			const monthNum = parseInt(month, 10);
			const startDate = `${yearNum}${String(monthNum).padStart(2, '0')}01`;
			const endDate = `${yearNum}${String(monthNum).padStart(2, '0')}31`;
			where.date = {
				gte: startDate,
				lte: endDate
			};
		}

		// 查询所有有题目的日期
		const questions = await prisma.baikeQuestion.findMany({
			where,
			select: {
				date: true
			},
			orderBy: {
				date: 'desc'
			}
		});

		return NextResponse.json({
			success: true,
			data: {
				dates: questions.map(q => q.date)
			}
		});
	} catch (error: any) {
		log.error('获取日期列表失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '获取日期列表失败' },
			{ status: 500 }
		);
	}
}

