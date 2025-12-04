// Small shim to reuse web-side user pair analysis code within the worker process
import { identifyUserPairs } from '../../apps/web/lib/processing/userPairIdentifier';
import { calculateUserPairConsensus, saveUserPairConsensus } from '../../apps/web/lib/processing/userPairConsensus';
import { updateTopicConsensusSnapshot } from '../../apps/web/lib/processing/topicConsensusAggregator';

export async function processUserPairAnalysis(
	topicId: string,
	userId1?: string,
	userId2?: string
) {
	if (userId1 && userId2) {
		// 分析特定用户对
		const result = await calculateUserPairConsensus(topicId, userId1, userId2);
		const userPairs = await identifyUserPairs(topicId);
		const pair = userPairs.find(p => 
			(p.userId1 === userId1 && p.userId2 === userId2) ||
			(p.userId1 === userId2 && p.userId2 === userId1)
		);
		if (pair) {
			await saveUserPairConsensus(topicId, userId1, userId2, result, pair.docIds, pair.discussionPaths);
		}
	} else {
		// 分析所有用户对
		const userPairs = await identifyUserPairs(topicId);
		for (const pair of userPairs) {
			const result = await calculateUserPairConsensus(topicId, pair.userId1, pair.userId2);
			await saveUserPairConsensus(topicId, pair.userId1, pair.userId2, result, pair.docIds, pair.discussionPaths);
		}
		// 更新话题级别快照
		await updateTopicConsensusSnapshot(topicId);
	}
}

