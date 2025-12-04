import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { calculateTopicConsensus } from '@/lib/processing/topicConsensusAggregator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id: topicId } = await params;
		
		// 验证话题是否存在
		const topic = await prisma.topic.findUnique({ where: { id: topicId } });
		if (!topic) {
			return NextResponse.json({ error: '话题不存在' }, { status: 404 });
		}

		// 1. 计算话题级别共识度
		const result = await calculateTopicConsensus(topicId);

		// 2. 获取历史快照
		const snapshots = await prisma.consensusSnapshot.findMany({
			where: { topicId },
			orderBy: { snapshotAt: 'desc' },
			take: 20,
			select: {
				snapshotAt: true,
				consensusScore: true,
				divergenceScore: true,
				consensusData: true
			}
		});

		// 3. 提取关键共识点和主要分歧点
		const latestSnapshot = snapshots[0];
		const consensusData = latestSnapshot?.consensusData as any;
		const keyConsensusPoints = consensusData?.keyPoints || [];
		const keyDisagreementPoints = consensusData?.disagreements || [];
		const trend = consensusData?.trend || 'stable';

		// 4. 构建响应
		return NextResponse.json({
			consensusScore: result.consensusScore,
			divergenceScore: result.divergenceScore,
			userPairCount: result.userPairCount,
			analyzedPairs: result.analyzedPairs,
			trend,
			keyConsensusPoints,
			keyDisagreementPoints,
			userPairs: result.userPairs,
			snapshots: snapshots.map(s => ({
				snapshotAt: s.snapshotAt.toISOString(),
				consensusScore: s.consensusScore,
				divergenceScore: s.divergenceScore
			}))
		}, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[Consensus Overview API] Error:', err);
		return NextResponse.json({ error: err.message || '获取话题共识概览失败' }, { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}



