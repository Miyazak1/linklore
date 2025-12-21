import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueFeedbackAPI');

/**
 * 提交用户反馈
 * POST /api/games/daily-issue/feedback
 * Body: { issueId: string, pathId?: string, helpful?: boolean, confusingStage?: number, isNeutral?: boolean, comment?: string }
 */
export async function POST(req: NextRequest) {
	try {
		const session = await readSession();
		const userId = session?.sub || null;

		const body = await req.json();
		const { issueId, pathId, helpful, confusingStage, isNeutral, comment } =
			body;

		if (!issueId) {
			return NextResponse.json(
				{ error: 'Missing required field: issueId' },
				{ status: 400 }
			);
		}

		// 验证confusingStage范围
		if (
			confusingStage !== undefined &&
			(confusingStage < 0 || confusingStage > 5)
		) {
			return NextResponse.json(
				{ error: 'confusingStage must be between 0 and 5' },
				{ status: 400 }
			);
		}

		// 创建反馈记录
		const feedback = await prisma.issueFeedback.create({
			data: {
				issueId,
				userId: userId || null,
				pathId: pathId || null,
				helpful: helpful ?? null,
				confusingStage: confusingStage ?? null,
				isNeutral: isNeutral ?? null,
				comment: comment || null
			}
		});

		return NextResponse.json({
			success: true,
			data: {
				feedbackId: feedback.id
			}
		});
	} catch (error: any) {
		log.error('提交反馈失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '提交反馈失败' },
			{ status: 500 }
		);
	}
}

