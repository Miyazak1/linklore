import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { buildTree } from '@/lib/games/daily-issue/decisionTree';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueCurrentAPI');

/**
 * 获取今日议题
 * GET /api/games/daily-issue/current
 */
export async function GET(req: NextRequest) {
	try {
		const today = getTodayDate();

		// 查找今日议题
		const issue = await prisma.dailyIssue.findUnique({
			where: { date: today },
			include: {
				nodes: {
					orderBy: [{ stage: 'asc' }, { order: 'asc' }]
				}
			}
		});

		if (!issue) {
			return NextResponse.json(
				{
					success: false,
					error: 'No issue available for today',
					date: today,
					message: '今日暂无议题，请管理员先创建议题'
				},
				{ status: 404 }
			);
		}

		if (issue.status !== 'published') {
			return NextResponse.json(
				{
					success: false,
					error: 'Issue not published',
					date: today,
					status: issue.status,
					message: '今日议题尚未发布'
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
					category: issue.category
				},
				tree: {
					rootNode: tree.rootNode,
					nodes: Array.from(tree.nodes.values())
				}
			}
		});
	} catch (error: any) {
		log.error('获取今日议题失败', error as Error);
		
		// 检查是否是数据库表不存在的错误
		if (error.message?.includes('does not exist') || error.message?.includes('Unknown model')) {
			return NextResponse.json(
				{ 
					success: false,
					error: 'Database table not found',
					message: '数据库表尚未创建，请先运行: pnpm prisma:migrate'
				},
				{ status: 500 }
			);
		}
		
		return NextResponse.json(
			{ 
				success: false,
				error: error.message || '获取今日议题失败',
				details: process.env.NODE_ENV === 'development' ? error.stack : undefined
			},
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

