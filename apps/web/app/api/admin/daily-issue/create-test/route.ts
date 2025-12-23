import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/admin';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueCreateTestAPI');

/**
 * 创建测试议题（管理员）
 * POST /api/admin/daily-issue/create-test
 * 用于快速创建测试数据
 */
export async function POST(req: NextRequest) {
	try {
		await requireAdmin();

		const body = await req.json();
		const { date, title, caseDescription } = body;

		if (!date || !title || !caseDescription) {
			return NextResponse.json(
				{ error: 'Missing required fields: date, title, caseDescription' },
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

		// 检查是否已存在
		const existing = await prisma.dailyIssue.findUnique({
			where: { date }
		});

		if (existing) {
			return NextResponse.json(
				{ error: 'Issue already exists for this date' },
				{ status: 400 }
			);
		}

		// 创建议题
		const issue = await prisma.dailyIssue.create({
			data: {
				date,
				title,
				caseDescription,
				status: 'draft', // 创建为draft，需要手动发布
				difficulty: 3,
				category: '测试'
			}
		});

		// 创建根节点（阶段0）
		const rootNode = await prisma.issueNode.create({
			data: {
				issueId: issue.id,
				stage: 0,
				nodeKey: 'stage0',
				title: '案例呈现',
				content: caseDescription,
				parentNodeKey: null,
				nextNodeKeys: [],
				isRoot: true,
				order: 0
			}
		});

		return NextResponse.json({
			success: true,
			data: {
				issueId: issue.id,
				rootNodeId: rootNode.id,
				message: '议题已创建，请继续添加节点完成决策树'
			}
		});
	} catch (error: any) {
		log.error('创建测试议题失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '创建失败' },
			{ status: 500 }
		);
	}
}





