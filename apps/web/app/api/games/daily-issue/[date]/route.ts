import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { buildTree } from '@/lib/games/daily-issue/decisionTree';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueDateAPI');

/**
 * 获取指定日期的议题
 * GET /api/games/daily-issue/[date]
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ date: string }> }
) {
	try {
		const { date } = await params;

		// 验证日期格式（YYYYMMDD）
		if (!/^\d{8}$/.test(date)) {
			return NextResponse.json(
				{ error: 'Invalid date format. Expected YYYYMMDD' },
				{ status: 400 }
			);
		}

		// 查找指定日期的议题
		const issue = await prisma.dailyIssue.findUnique({
			where: { date },
			include: {
				nodes: {
					orderBy: [{ stage: 'asc' }, { order: 'asc' }]
				}
			}
		});

		if (!issue) {
			return NextResponse.json(
				{
					error: 'Issue not found for the specified date',
					date
				},
				{ status: 404 }
			);
		}

		// 构建决策树
		const tree = await buildTree(issue.id);

		// 返回完整的决策树结构
		return NextResponse.json({
			success: true,
			data: {
				issue: {
					id: issue.id,
					date: issue.date,
					title: issue.title,
					caseDescription: issue.caseDescription,
					difficulty: issue.difficulty,
					category: issue.category,
					status: issue.status
				},
				tree: {
					rootNode: tree.rootNode,
					nodes: Array.from(tree.nodes.values())
				}
			}
		});
	} catch (error: any) {
		log.error('获取议题失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '获取议题失败' },
			{ status: 500 }
		);
	}
}





