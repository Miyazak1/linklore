import { NextRequest, NextResponse } from 'next/server';
import { generateResult } from '@/lib/games/daily-issue/resultGenerator';
import { createModuleLogger } from '@/lib/utils/logger';
import type { PathStep } from '@/types/daily-issue';

const log = createModuleLogger('DailyIssueResultAPI');

/**
 * 获取结果页内容
 * POST /api/games/daily-issue/result
 * Body: { issueId: string, path: PathStep[] }
 */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { issueId, path } = body;

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

		// 生成结果页内容
		const result = await generateResult(issueId, path as PathStep[]);

		return NextResponse.json({
			success: true,
			data: result
		});
	} catch (error: any) {
		log.error('生成结果页失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '生成结果页失败' },
			{ status: 500 }
		);
	}
}





