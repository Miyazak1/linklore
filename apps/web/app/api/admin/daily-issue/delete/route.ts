import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueDeleteAPI');

/**
 * 删除指定日期的议题
 * DELETE /api/admin/daily-issue/delete
 * 
 * 请求体：
 * {
 *   date: string // YYYYMMDD
 * }
 */
export async function DELETE(req: NextRequest) {
	try {
		await requireAdmin();

		const body = await req.json();
		const { date } = body;

		if (!date) {
			return NextResponse.json(
				{ error: 'Missing required field: date' },
				{ status: 400 }
			);
		}

		// 验证日期格式
		if (!/^\d{8}$/.test(date)) {
			return NextResponse.json(
				{ error: 'Invalid date format. Expected YYYYMMDD' },
				{ status: 400 }
			);
		}

		// 查找议题
		const issue = await prisma.dailyIssue.findUnique({
			where: { date },
			include: {
				nodes: true,
				paths: true,
				results: true,
				feedbacks: true,
				analytics: true
			}
		});

		if (!issue) {
			return NextResponse.json(
				{ error: 'Issue not found for this date' },
				{ status: 404 }
			);
		}

		// 删除议题（关联数据会通过 onDelete: Cascade 自动删除）
		await prisma.dailyIssue.delete({
			where: { date }
		});

		log.info('议题删除成功', { 
			date, 
			title: issue.title,
			nodeCount: issue.nodes.length,
			pathCount: issue.paths.length
		});

		return NextResponse.json({
			success: true,
			message: `议题已删除：${issue.title} (${date})`
		});
	} catch (error: any) {
		log.error('删除议题失败', error as Error);
		return NextResponse.json(
			{ 
				success: false,
				error: error.message || '删除失败' 
			},
			{ status: 500 }
		);
	}
}





