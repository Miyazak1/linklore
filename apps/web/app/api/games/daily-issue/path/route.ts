import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createModuleLogger } from '@/lib/utils/logger';
import type { PathStep } from '@/types/daily-issue';

const log = createModuleLogger('DailyIssuePathAPI');

/**
 * 保存用户思考路径
 * POST /api/games/daily-issue/path
 * Body: { issueId: string, path: PathStep[], date?: string }
 */
export async function POST(req: NextRequest) {
	try {
		const session = await readSession();
		const userId = session?.sub || null;

		const body = await req.json();
		const { issueId, path, date } = body;

		if (!issueId || !path || !Array.isArray(path)) {
			return NextResponse.json(
				{ error: 'Missing required fields: issueId, path' },
				{ status: 400 }
			);
		}

		// 验证路径格式
		for (const step of path) {
			if (
				typeof step.stage !== 'number' ||
				typeof step.nodeKey !== 'string' ||
				typeof step.selectedAt !== 'string'
			) {
				return NextResponse.json(
					{
						error:
							'Invalid path format. Each step must have: stage (number), nodeKey (string), selectedAt (string)'
					},
					{ status: 400 }
				);
			}
		}

		// 使用提供的日期或今天的日期
		const targetDate = date || getTodayDate();

		// 检查是否已存在记录
		const existing = userId
			? await prisma.issuePath.findFirst({
					where: {
						issueId,
						userId,
						date: targetDate
					}
				})
			: null;

		let pathRecord;
		if (existing) {
			// 更新现有记录
			pathRecord = await prisma.issuePath.update({
				where: { id: existing.id },
				data: {
					path: path as any,
					completedAt: path.length >= 5 ? new Date() : null
				}
			});
		} else {
			// 创建新记录
			pathRecord = await prisma.issuePath.create({
				data: {
					issueId,
					userId: userId || null,
					date: targetDate,
					path: path as any,
					completedAt: path.length >= 5 ? new Date() : null
				}
			});
		}

		return NextResponse.json({
			success: true,
			data: {
				pathId: pathRecord.id,
				completed: pathRecord.completedAt !== null
			}
		});
	} catch (error: any) {
		log.error('保存路径失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '保存路径失败' },
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

