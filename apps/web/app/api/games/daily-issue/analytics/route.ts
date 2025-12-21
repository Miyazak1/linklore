import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { requireAdmin } from '@/lib/auth/admin';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('DailyIssueAnalyticsAPI');

/**
 * 获取议题分析数据（管理员）
 * GET /api/games/daily-issue/analytics?issueId=xxx
 */
export async function GET(req: NextRequest) {
	try {
		// 检查管理员权限（会抛出错误如果未登录或不是管理员）
		await requireAdmin();

		const { searchParams } = new URL(req.url);
		const issueId = searchParams.get('issueId');

		if (!issueId) {
			return NextResponse.json(
				{ error: 'Missing required parameter: issueId' },
				{ status: 400 }
			);
		}

		// 获取分析数据
		const analytics = await prisma.issueAnalytics.findUnique({
			where: { issueId },
			include: {
				issue: {
					select: {
						id: true,
						date: true,
						title: true
					}
				}
			}
		});

		// 如果分析数据不存在，返回空数据而不是错误
		if (!analytics) {
			// 获取议题基本信息
			const issue = await prisma.dailyIssue.findUnique({
				where: { id: issueId },
				select: {
					id: true,
					date: true,
					title: true
				}
			});

			if (!issue) {
				return NextResponse.json(
					{ error: 'Issue not found' },
					{ status: 404 }
				);
			}

			// 返回空的分析数据
			return NextResponse.json({
				success: true,
				data: {
					analytics: {
						id: null,
						issueId: issue.id,
						date: issue.date,
						totalAttempts: 0,
						completionRate: 0,
						pathDistribution: {},
						averageTime: null,
						updatedAt: null
					},
					issue: issue,
					feedback: {
						total: 0,
						helpful: 0,
						notHelpful: 0,
						neutral: 0,
						notNeutral: 0,
						confusingStages: {}
					}
				}
			});
		}

		// 获取反馈统计
		const feedbacks = await prisma.issueFeedback.findMany({
			where: { issueId },
			select: {
				helpful: true,
				confusingStage: true,
				isNeutral: true
			}
		});

		const feedbackStats = {
			total: feedbacks.length,
			helpful: feedbacks.filter((f) => f.helpful === true).length,
			notHelpful: feedbacks.filter((f) => f.helpful === false).length,
			neutral: feedbacks.filter((f) => f.isNeutral === true).length,
			notNeutral: feedbacks.filter((f) => f.isNeutral === false).length,
			confusingStages: feedbacks
				.filter((f) => f.confusingStage !== null)
				.reduce((acc, f) => {
					const stage = f.confusingStage!;
					acc[stage] = (acc[stage] || 0) + 1;
					return acc;
				}, {} as Record<number, number>)
		};

		return NextResponse.json({
			success: true,
			data: {
				analytics: {
					id: analytics.id,
					issueId: analytics.issueId,
					date: analytics.date,
					totalAttempts: analytics.totalAttempts,
					completionRate: analytics.completionRate,
					pathDistribution: analytics.pathDistribution,
					averageTime: analytics.averageTime,
					updatedAt: analytics.updatedAt
				},
				issue: analytics.issue,
				feedback: feedbackStats
			}
		});
	} catch (error: any) {
		log.error('获取分析数据失败', error as Error);
		return NextResponse.json(
			{ error: error.message || '获取分析数据失败' },
			{ status: 500 }
		);
	}
}

