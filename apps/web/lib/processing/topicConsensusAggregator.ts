import { prisma } from '@/lib/db/client';

export interface TopicConsensusResult {
	consensusScore: number;
	divergenceScore: number;
	userPairCount: number;
	analyzedPairs: number;
	userPairs: Array<{
		userId1: string;
		userId2: string;
		consensusScore: number;
		divergenceScore: number;
		docCount: number;
		discussionRounds: number;
	}>;
}

/**
 * 计算话题级别的整体共识度
 * 基于所有用户对的共识度进行加权平均
 */
export async function calculateTopicConsensus(topicId: string): Promise<TopicConsensusResult> {
	console.log(`[TopicConsensusAggregator] Calculating topic consensus for ${topicId}`);

	// 1. 获取所有用户对及其分析结果
	const userConsensusRecords = await prisma.userConsensus.findMany({
		where: { topicId },
		select: {
			userId1: true,
			userId2: true,
			consensusScore: true,
			divergenceScore: true,
			docIds: true,
			discussionPaths: true
		}
	});

	if (userConsensusRecords.length === 0) {
		console.log(`[TopicConsensusAggregator] No user consensus records found`);
		return {
			consensusScore: 0.5,
			divergenceScore: 0.5,
			userPairCount: 0,
			analyzedPairs: 0,
			userPairs: []
		};
	}

	// 2. 计算加权平均（权重考虑多个因素）
	let totalWeight = 0;
	let weightedConsensus = 0;

	const userPairs: TopicConsensusResult['userPairs'] = [];

	userConsensusRecords.forEach(record => {
		if (record.consensusScore !== null) {
			const docCount = record.docIds.length;
			const discussionPaths = (record.discussionPaths as any) || [];
			const discussionRounds = discussionPaths.length;
			
			// 计算平均深度
			const avgDepth = discussionPaths.length > 0
				? discussionPaths.reduce((sum: number, path: any) => sum + (path.depth || 0), 0) / discussionPaths.length
				: 1;

			// 权重计算：
			// - 基础权重：文档数量（讨论越深入，权重越高）
			// - 深度权重：讨论深度（深度越深，权重越高）
			// - 轮数权重：讨论轮数（轮数越多，权重越高）
			const docWeight = docCount;
			const depthWeight = avgDepth;
			const roundWeight = discussionRounds;

			// 综合权重（可以根据实际情况调整公式）
			const weight = docWeight * (1 + depthWeight * 0.1) * (1 + roundWeight * 0.2);

			weightedConsensus += record.consensusScore * weight;
			totalWeight += weight;

			userPairs.push({
				userId1: record.userId1,
				userId2: record.userId2,
				consensusScore: record.consensusScore,
				divergenceScore: record.divergenceScore || (1 - record.consensusScore),
				docCount,
				discussionRounds
			});
		}
	});

	const consensusScore = totalWeight > 0 
		? weightedConsensus / totalWeight 
		: 0.5;
	const divergenceScore = 1 - consensusScore;

	return {
		consensusScore,
		divergenceScore,
		userPairCount: userConsensusRecords.length,
		analyzedPairs: userPairs.length,
		userPairs
	};
}

/**
 * 更新话题级别的共识快照
 * 基于所有用户对的共识度聚合结果
 */
export async function updateTopicConsensusSnapshot(topicId: string): Promise<void> {
	console.log(`[TopicConsensusAggregator] Updating consensus snapshot for topic ${topicId}`);

	// 1. 计算话题级别共识度
	const result = await calculateTopicConsensus(topicId);

	// 2. 获取所有用户对的共识和分歧数据
	const userConsensusRecords = await prisma.userConsensus.findMany({
		where: { topicId },
		select: {
			consensus: true,
			disagreements: true
		}
	});

	// 3. 提取关键共识点和主要分歧点（跨多个用户对）
	const allConsensusPoints = new Map<string, { count: number; text: string }>();
	const allDisagreementPoints = new Map<string, { count: number; text: string }>();

	userConsensusRecords.forEach(record => {
		const consensus = (record.consensus as any) || [];
		const disagreements = (record.disagreements as any) || [];

		consensus.forEach((item: { text: string }) => {
			const key = item.text.trim();
			const existing = allConsensusPoints.get(key);
			if (existing) {
				existing.count++;
			} else {
				allConsensusPoints.set(key, { count: 1, text: item.text });
			}
		});

		disagreements.forEach((item: { claim1: string; claim2: string; description?: string }) => {
			const key = `${item.claim1} vs ${item.claim2}`.trim();
			const existing = allDisagreementPoints.get(key);
			if (existing) {
				existing.count++;
			} else {
				allDisagreementPoints.set(key, { 
					count: 1, 
					text: item.description || `${item.claim1} vs ${item.claim2}` 
				});
			}
		});
	});

	// 4. 获取历史快照以计算趋势
	const recentSnapshots = await prisma.consensusSnapshot.findMany({
		where: { topicId },
		orderBy: { snapshotAt: 'desc' },
		take: 5
	});

	const trend = calculateTrend(recentSnapshots, result.consensusScore);

	// 5. 构建共识数据
	const keyConsensusPoints = Array.from(allConsensusPoints.values())
		.filter(item => item.count >= 2) // 至少2个用户对支持
		.sort((a, b) => b.count - a.count)
		.slice(0, 10)
		.map(item => item.text);

	const keyDisagreementPoints = Array.from(allDisagreementPoints.values())
		.sort((a, b) => b.count - a.count)
		.slice(0, 10)
		.map(item => item.text);

	const consensusData = {
		consensusScore: result.consensusScore,
		divergenceScore: result.divergenceScore,
		trend,
		keyPoints: keyConsensusPoints,
		disagreements: keyDisagreementPoints,
		userPairCount: result.userPairCount,
		analyzedPairs: result.analyzedPairs
	};

	// 6. 创建快照
	await createConsensusSnapshot(topicId, consensusData);
}

/**
 * 计算趋势
 */
function calculateTrend(
	snapshots: Array<{ consensusScore: number | null }>,
	currentScore: number
): 'converging' | 'diverging' | 'stable' {
	if (snapshots.length === 0) {
		return 'stable';
	}

	const previousScore = snapshots[0].consensusScore;
	if (previousScore === null) {
		return 'stable';
	}

	const diff = currentScore - previousScore;
	const threshold = 0.05; // 5%的变化阈值

	if (diff > threshold) {
		return 'converging';
	} else if (diff < -threshold) {
		return 'diverging';
	} else {
		return 'stable';
	}
}

/**
 * 从consensusTracker导入createConsensusSnapshot函数
 * 如果不存在，需要实现
 */
async function createConsensusSnapshot(topicId: string, consensusData: any) {
	// 检查是否已有快照（保留最近50个）
	const allSnapshots = await prisma.consensusSnapshot.findMany({
		where: { topicId },
		orderBy: { snapshotAt: 'desc' }
	});

	if (allSnapshots.length >= 50) {
		const toDelete = allSnapshots.slice(50);
		await prisma.consensusSnapshot.deleteMany({
			where: { id: { in: toDelete.map(s => s.id) } }
		});
	}

	// 创建新快照（确保consensusScore和divergenceScore是有效数值）
	const consensusScore = typeof consensusData.consensusScore === 'number' && !isNaN(consensusData.consensusScore)
		? consensusData.consensusScore
		: 0.5; // 默认值
	const divergenceScore = typeof consensusData.divergenceScore === 'number' && !isNaN(consensusData.divergenceScore)
		? consensusData.divergenceScore
		: 0.5; // 默认值

	console.log(`[TopicConsensusAggregator] Creating snapshot with consensusScore: ${consensusScore}, divergenceScore: ${divergenceScore}`);

	await prisma.consensusSnapshot.create({
		data: {
			topicId,
			consensusData: consensusData as any,
			consensusScore,
			divergenceScore
		}
	});
}

