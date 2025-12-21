import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueHistoryAPI');

/**
 * 获取用户历史记录
 * GET /api/games/daily-issue/history?page=1&limit=10
 */
export async function GET(req: NextRequest) {
	try {
		const session = await readSession();
		const userId = session?.sub || null;

		if (!userId) {
			return NextResponse.json(
				{ error: 'Authentication required' },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get('page') || '1', 10);
		const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

		const skip = (page - 1) * limit;

		// 获取用户的历史路径
		const [paths, total] = await Promise.all([
			prisma.issuePath.findMany({
				where: { userId },
				include: {
					issue: {
						select: {
							id: true,
							date: true,
							title: true,
							caseDescription: true,
							difficulty: true,
							category: true
						}
					}
				},
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit
			}),
			prisma.issuePath.count({
				where: { userId }
			})
		]);

		return NextResponse.json({
			success: true,
			data: {
				paths: paths.map((path) => ({
					id: path.id,
					issueId: path.issueId,
					date: path.date,
					path: path.path,
					completed: path.completedAt !== null,
					completedAt: path.completedAt,
					createdAt: path.createdAt,
					issue: path.issue
				})),
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit)
				}
			}
		});
	} catch (error: any) {
		log.error('获取历史记录失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '获取历史记录失败' },
			{ status: 500 }
		);
	}
}

