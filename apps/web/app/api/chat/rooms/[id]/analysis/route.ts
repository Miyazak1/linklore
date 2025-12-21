import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { requireRoomAccess } from '@/lib/security/roomAccess';
import { analyzeChatConsensus } from '@/lib/analysis/chatConsensus';
import { chatDb } from '@/lib/modules/chat/db';

/**
 * GET /api/chat/rooms/:id/analysis
 * 获取房间的分析结果
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { id: roomId } = await params;

		// 检查访问权限
		await requireRoomAccess(roomId, session.sub);

		// 尝试从数据库获取已有分析
		let analysis = await chatDb.analysis.findUnique({
			where: { roomId }
		});

		// 如果分析不存在或超过1小时未更新，重新分析
		const shouldReanalyze =
			!analysis ||
			!analysis.lastAnalyzedAt ||
			Date.now() - analysis.lastAnalyzedAt.getTime() > 3600000; // 1小时

		if (shouldReanalyze) {
			console.log(`[Chat Analysis API] 重新分析房间 ${roomId}`);
			const result = await analyzeChatConsensus(roomId);

			// 保存分析结果
			analysis = await chatDb.analysis.upsert({
				where: { roomId },
				update: {
					consensusPoints: result.consensusPoints as any,
					consensusScore: result.consensusScore,
					consensusTrend: result.consensusTrend as any,
					disagreementPoints: result.disagreementPoints as any,
					divergenceScore: result.divergenceScore,
					divergenceTrend: result.divergenceTrend as any,
					averageDepth: result.averageDepth,
					maxDepth: result.maxDepth,
					totalReferences: result.totalReferences,
					aiAdoptionRate: result.aiAdoptionRate,
					creatorMessageCount: result.creatorMessageCount,
					participantMessageCount: result.participantMessageCount,
					creatorAiAdoptionCount: result.creatorAiAdoptionCount,
					participantAiAdoptionCount: result.participantAiAdoptionCount,
					creatorAiSuggestionCount: result.creatorAiSuggestionCount,
					participantAiSuggestionCount: result.participantAiSuggestionCount,
					lastAnalyzedAt: new Date()
				},
				create: {
					roomId,
					consensusPoints: result.consensusPoints as any,
					consensusScore: result.consensusScore,
					consensusTrend: result.consensusTrend as any,
					disagreementPoints: result.disagreementPoints as any,
					divergenceScore: result.divergenceScore,
					divergenceTrend: result.divergenceTrend as any,
					averageDepth: result.averageDepth,
					maxDepth: result.maxDepth,
					totalReferences: result.totalReferences,
					aiAdoptionRate: result.aiAdoptionRate,
					creatorMessageCount: result.creatorMessageCount,
					participantMessageCount: result.participantMessageCount,
					creatorAiAdoptionCount: result.creatorAiAdoptionCount,
					participantAiAdoptionCount: result.participantAiAdoptionCount,
					creatorAiSuggestionCount: result.creatorAiSuggestionCount,
					participantAiSuggestionCount: result.participantAiSuggestionCount,
					lastAnalyzedAt: new Date()
				}
			});
		}

		// 确保 analysis 不为 null（upsert 应该总是返回一个值）
		if (!analysis) {
			return NextResponse.json(
				{ error: '无法获取分析结果' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			analysis: {
				consensusPoints: analysis.consensusPoints,
				consensusScore: analysis.consensusScore,
				consensusTrend: analysis.consensusTrend,
				disagreementPoints: analysis.disagreementPoints,
				divergenceScore: analysis.divergenceScore,
				divergenceTrend: analysis.divergenceTrend,
				averageDepth: analysis.averageDepth,
				maxDepth: analysis.maxDepth,
				totalReferences: analysis.totalReferences,
				aiAdoptionRate: analysis.aiAdoptionRate,
				creatorMessageCount: analysis.creatorMessageCount,
				participantMessageCount: analysis.participantMessageCount,
				creatorAiAdoptionCount: analysis.creatorAiAdoptionCount,
				participantAiAdoptionCount: analysis.participantAiAdoptionCount,
				creatorAiSuggestionCount: analysis.creatorAiSuggestionCount,
				participantAiSuggestionCount: analysis.participantAiSuggestionCount,
				lastAnalyzedAt: analysis.lastAnalyzedAt
			}
		});
	} catch (error: any) {
		console.error('[Chat Analysis API] Error:', error);
		if (
			error.message === '房间不存在' ||
			error.message === '无权访问此房间'
		) {
			return NextResponse.json({ error: error.message }, { status: 403 });
		}
		return NextResponse.json(
			{ error: error.message || '获取分析结果失败' },
			{ status: 500 }
		);
	}
}











