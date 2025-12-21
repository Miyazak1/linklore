import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { prisma } from '@/lib/db/client';
import { validateIssueContent } from '@/lib/games/daily-issue/contentValidator';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueCreateAPI');

/**
 * 创建完整的每日议题（包括决策树节点）
 * POST /api/admin/daily-issue/create
 * 
 * 请求体：
 * {
 *   date: string, // YYYYMMDD
 *   title: string,
 *   caseDescription: string,
 *   category?: string,
 *   difficulty?: number,
 *   status?: 'draft' | 'published',
 *   nodes: Array<{
 *     stage: number,
 *     nodeKey: string,
 *     title: string,
 *     content: string,
 *     parentNodeKey?: string,
 *     nextNodeKeys: string[],
 *     isRoot?: boolean,
 *     order: number
 *   }>
 * }
 */
export async function POST(req: NextRequest) {
	try {
		await requireAdmin();

		const body = await req.json();
		const { date, title, caseDescription, category, difficulty = 3, status = 'draft', nodes } = body;

		// 验证必填字段
		if (!date || !title || !caseDescription || !nodes || !Array.isArray(nodes)) {
			return NextResponse.json(
				{ error: 'Missing required fields: date, title, caseDescription, nodes' },
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

		// 验证内容
		const validation = validateIssueContent({
			caseDescription,
			nodes: nodes.map((n: any) => ({ 
				content: n.content || '',
				title: n.title || ''
			}))
		});

		if (!validation.valid) {
			return NextResponse.json(
				{ 
					error: 'Content validation failed',
					details: validation.errors
				},
				{ status: 400 }
			);
		}

		// 创建议题和节点（使用事务）
		const result = await prisma.$transaction(async (tx) => {
			// 1. 创建议题
			const issue = await tx.dailyIssue.create({
				data: {
					date,
					title,
					caseDescription,
					category,
					difficulty,
					status
				}
			});

			// 2. 创建所有节点
			const createdNodes = await Promise.all(
				nodes.map((node: any) =>
					tx.issueNode.create({
						data: {
							issueId: issue.id,
							stage: node.stage,
							nodeKey: node.nodeKey,
							title: node.title,
							content: node.content,
							parentNodeKey: node.parentNodeKey || null,
							nextNodeKeys: node.nextNodeKeys || [],
							isRoot: node.isRoot || false,
							order: node.order
						}
					})
				)
			);

			return { issue, nodes: createdNodes };
		});

		log.info('议题创建成功', { 
			issueId: result.issue.id, 
			date, 
			nodeCount: result.nodes.length 
		});

		return NextResponse.json({
			success: true,
			data: {
				issueId: result.issue.id,
				date: result.issue.date,
				nodeCount: result.nodes.length
			}
		});
	} catch (error: any) {
		log.error('创建议题失败', error as Error);
		return NextResponse.json(
			{ 
				success: false,
				error: error.message || '创建失败' 
			},
			{ status: 500 }
		);
	}
}

