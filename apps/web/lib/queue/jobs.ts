import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@/lib/db/client';
import { extractAndStore } from '@/lib/processing/extract';
import { summarizeAndStore } from '@/lib/processing/summarize';
import { evaluateAndStore } from '@/lib/processing/evaluate';
import { analyzeDisagreementsIncremental } from '@/lib/processing/analyzeDisagreements';
import { moderateMessage } from '@/lib/ai/moderation';
import { analyzeChatConsensus } from '@/lib/analysis/chatConsensus';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('Queue Jobs');
// trackConsensus is replaced by updateTopicConsensusSnapshot
// import { trackConsensus } from '@/lib/processing/consensusTracker';

let connection: IORedis | null = null;
let queue: Queue | null = null;
let redisAvailable = true; // Track Redis availability

// Initialize queue with error handling
function initQueue() {
	if (queue) return queue;
	if (!redisAvailable) return null;
	
	try {
		connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
			maxRetriesPerRequest: null, // BullMQ requires this to be null
			retryStrategy: () => null,
			lazyConnect: true,
			enableReadyCheck: true, // Enable ready check for BullMQ
			connectTimeout: 10000, // Increase to 10 seconds
			// Remove commandTimeout - let BullMQ handle timeouts
		});
		const queueName = 'linklore-ai';
		queue = new Queue(queueName, { connection });
		return queue;
	} catch (err) {
		log.warn('Redis initialization failed, will use sync fallback', { error: err });
		redisAvailable = false;
		return null;
	}
}

export async function enqueueExtract(documentId: string) {
	// If Redis was previously unavailable, process asynchronously in background
	if (!redisAvailable) {
		console.log(`[Queue] Redis unavailable, processing extract asynchronously for document ${documentId}`);
		// Use setImmediate to run asynchronously without blocking
		setImmediate(async () => {
			try {
				await extractAndStore(documentId);
			} catch (err: any) {
				console.error(`[Queue] Async extract failed:`, err);
			}
		});
		return { id: 'async', name: 'extract', data: { documentId } };
	}

	const q = initQueue();
	if (!q) {
		redisAvailable = false;
		// Fallback to async processing
		console.log(`[Queue] Redis unavailable, processing extract asynchronously for document ${documentId}`);
		setImmediate(async () => {
			try {
				await extractAndStore(documentId);
			} catch (err: any) {
				console.error(`[Queue] Async extract failed:`, err);
			}
		});
		return { id: 'async', name: 'extract', data: { documentId } };
	}
	
	try {
		// 提取任务：低优先级（基础处理，可以稍后）
		const job = await q.add('extract', { documentId }, { 
			removeOnComplete: 50, 
			removeOnFail: 50,
			priority: 1 // 低优先级
		});
		return job;
	} catch (err: any) {
		// If enqueue fails, mark Redis as unavailable and process asynchronously
		console.warn(`[Queue] Failed to enqueue (${err.message}), using async fallback`);
		redisAvailable = false;
		setImmediate(async () => {
			try {
				await extractAndStore(documentId);
			} catch (syncErr: any) {
				console.error(`[Queue] Async extract failed:`, syncErr);
			}
		});
		return { id: 'async', name: 'extract', data: { documentId } };
	}
}

export async function enqueueSummarize(documentId: string) {
	// If Redis was previously unavailable, process asynchronously
	if (!redisAvailable) {
		console.log(`[Queue] Redis unavailable, processing summarize asynchronously for document ${documentId}`);
		setImmediate(async () => {
			try {
				await summarizeAndStore(documentId);
			} catch (err: any) {
				console.error(`[Queue] Async summarize failed:`, err);
			}
		});
		return { id: 'async', name: 'summarize', data: { documentId } };
	}

	const q = initQueue();
	if (!q) {
		redisAvailable = false;
		setImmediate(async () => {
			try {
				await summarizeAndStore(documentId);
			} catch (err: any) {
				console.error(`[Queue] Async summarize failed:`, err);
			}
		});
		return { id: 'async', name: 'summarize', data: { documentId } };
	}
	
	try {
		// 检查是否是主题文档（parentId为null）
		const doc = await prisma.document.findUnique({
			where: { id: documentId },
			select: { parentId: true }
		});
		
		// 主题文档：最高优先级（20），回复文档：中等优先级（10）
		const priority = doc?.parentId === null ? 20 : 10;
		
		const job = await q.add('summarize', { documentId }, { 
			removeOnComplete: 50, 
			removeOnFail: 50,
			priority,
			attempts: 3, // 重试3次
			backoff: {
				type: 'exponential',
				delay: 2000
			}
		});
		
		console.log(`[Queue] Summarize job enqueued: ${job.id} for document ${documentId} (priority: ${priority})`);
		
		// 注意：任务已入队，Worker会自动处理
		// 如果Worker未运行，任务会在队列中等待
		// 建议启动Worker: pnpm --filter @linklore/ai-queue dev
		
		return job;
	} catch (err: any) {
		console.warn(`[Queue] Failed to enqueue summarize (${err.message}), using async fallback`);
		redisAvailable = false;
		setImmediate(async () => {
			try {
				await summarizeAndStore(documentId);
			} catch (syncErr: any) {
				console.error(`[Queue] Async summarize failed:`, syncErr);
			}
		});
		return { id: 'async', name: 'summarize', data: { documentId } };
	}
}

export async function enqueueEvaluate(documentId: string) {
	// If Redis was previously unavailable, process asynchronously
	if (!redisAvailable) {
		console.log(`[Queue] Redis unavailable, processing evaluate asynchronously for document ${documentId}`);
		setImmediate(async () => {
			try {
				await evaluateAndStore(documentId);
			} catch (err: any) {
				console.error(`[Queue] Async evaluate failed:`, err);
			}
		});
		return { id: 'async', name: 'evaluate', data: { documentId } };
	}

	const q = initQueue();
	if (!q) {
		redisAvailable = false;
		setImmediate(async () => {
			try {
				await evaluateAndStore(documentId);
			} catch (err: any) {
				console.error(`[Queue] Async evaluate failed:`, err);
			}
		});
		return { id: 'async', name: 'evaluate', data: { documentId } };
	}
	
	try {
		// 检查是否是主题文档（parentId为null）
		const doc = await prisma.document.findUnique({
			where: { id: documentId },
			select: { parentId: true }
		});
		
		// 主题文档：最高优先级（20），回复文档：中等优先级（10）
		const priority = doc?.parentId === null ? 20 : 10;
		
		const job = await q.add('evaluate', { documentId }, { 
			removeOnComplete: 50, 
			removeOnFail: 50,
			priority,
			attempts: 3, // 重试3次
			backoff: {
				type: 'exponential',
				delay: 2000
			}
		});
		
		// 注意：任务已入队，Worker会自动处理
		// 如果Worker未运行，任务会在队列中等待
		// 建议启动Worker: pnpm --filter @linklore/ai-queue dev
		
		return job;
	} catch (err: any) {
		console.warn(`[Queue] Failed to enqueue evaluate (${err.message}), using async fallback`);
		redisAvailable = false;
		setImmediate(async () => {
			try {
				await evaluateAndStore(documentId);
			} catch (syncErr: any) {
				console.error(`[Queue] Async evaluate failed:`, syncErr);
			}
		});
		return { id: 'async', name: 'evaluate', data: { documentId } };
	}
}

// 实践功能已移除

export async function enqueueAnalyzeDisagreements(topicId: string, newDocumentId?: string) {
	// If Redis was previously unavailable, process asynchronously
	if (!redisAvailable) {
		console.log(`[Queue] Redis unavailable, processing analyzeDisagreements asynchronously for topic ${topicId}`);
		setImmediate(async () => {
			try {
				await analyzeDisagreementsIncremental(topicId, newDocumentId);
			} catch (err: any) {
				console.error(`[Queue] Async analyzeDisagreements failed:`, err);
			}
		});
		return { id: 'async', name: 'analyzeDisagreements', data: { topicId, newDocumentId } };
	}

	const q = initQueue();
	if (!q) {
		redisAvailable = false;
		setImmediate(async () => {
			try {
				await analyzeDisagreementsIncremental(topicId, newDocumentId);
			} catch (err: any) {
				console.error(`[Queue] Async analyzeDisagreements failed:`, err);
			}
		});
		return { id: 'async', name: 'analyzeDisagreements', data: { topicId, newDocumentId } };
	}
	
	try {
		// 分歧分析：较低优先级（5），在主题和回复文档处理完之后
		const job = await q.add('analyzeDisagreements', { topicId, newDocumentId }, { 
			removeOnComplete: 50, 
			removeOnFail: 50,
			priority: 5 // 较低优先级
		});
		return job;
	} catch (err: any) {
		console.warn(`[Queue] Failed to enqueue analyzeDisagreements (${err.message}), using async fallback`);
		redisAvailable = false;
		setImmediate(async () => {
			try {
				await analyzeDisagreementsIncremental(topicId, newDocumentId);
			} catch (syncErr: any) {
				console.error(`[Queue] Async analyzeDisagreements failed:`, syncErr);
			}
		});
		return { id: 'async', name: 'analyzeDisagreements', data: { topicId, newDocumentId } };
	}
}

export async function enqueueUserPairAnalysis(
	topicId: string,
	userId1?: string,
	userId2?: string
) {
	// If Redis was previously unavailable, process asynchronously
	if (!redisAvailable) {
		console.log(`[Queue] Redis unavailable, processing user pair analysis asynchronously for topic ${topicId}`);
		setImmediate(async () => {
			try {
				const { identifyUserPairs } = await import('@/lib/processing/userPairIdentifier');
				const { calculateUserPairConsensus, saveUserPairConsensus } = await import('@/lib/processing/userPairConsensus');
				const { updateTopicConsensusSnapshot } = await import('@/lib/processing/topicConsensusAggregator');
				
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
			} catch (err: any) {
				console.error(`[Queue] Async user pair analysis failed:`, err);
			}
		});
		return { id: 'async', name: 'userPairAnalysis', data: { topicId, userId1, userId2 } };
	}

	const q = initQueue();
	if (!q) {
		redisAvailable = false;
		setImmediate(async () => {
			try {
				const { identifyUserPairs } = await import('@/lib/processing/userPairIdentifier');
				const { calculateUserPairConsensus, saveUserPairConsensus } = await import('@/lib/processing/userPairConsensus');
				const { updateTopicConsensusSnapshot } = await import('@/lib/processing/topicConsensusAggregator');
				
				if (userId1 && userId2) {
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
					const userPairs = await identifyUserPairs(topicId);
					for (const pair of userPairs) {
						const result = await calculateUserPairConsensus(topicId, pair.userId1, pair.userId2);
						await saveUserPairConsensus(topicId, pair.userId1, pair.userId2, result, pair.docIds, pair.discussionPaths);
					}
					await updateTopicConsensusSnapshot(topicId);
				}
			} catch (syncErr: any) {
				console.error(`[Queue] Async user pair analysis failed:`, syncErr);
			}
		});
		return { id: 'async', name: 'userPairAnalysis', data: { topicId, userId1, userId2 } };
	}
	
	try {
		// 用户对分析：中等优先级（3），在评价完成后
		const job = await q.add('userPairAnalysis', { topicId, userId1, userId2 }, { 
			removeOnComplete: 50, 
			removeOnFail: 50,
			priority: 3 // 中等优先级
		});
		console.log(`[Queue] User pair analysis job enqueued: ${job.id} for topic ${topicId}`);
		return job;
	} catch (err: any) {
		console.warn(`[Queue] Failed to enqueue user pair analysis (${err.message}), using async fallback`);
		redisAvailable = false;
		setImmediate(async () => {
			try {
				const { identifyUserPairs } = await import('@/lib/processing/userPairIdentifier');
				const { calculateUserPairConsensus, saveUserPairConsensus } = await import('@/lib/processing/userPairConsensus');
				const { updateTopicConsensusSnapshot } = await import('@/lib/processing/topicConsensusAggregator');
				
				if (userId1 && userId2) {
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
					const userPairs = await identifyUserPairs(topicId);
					for (const pair of userPairs) {
						const result = await calculateUserPairConsensus(topicId, pair.userId1, pair.userId2);
						await saveUserPairConsensus(topicId, pair.userId1, pair.userId2, result, pair.docIds, pair.discussionPaths);
					}
					await updateTopicConsensusSnapshot(topicId);
				}
			} catch (syncErr: any) {
				console.error(`[Queue] Async user pair analysis failed:`, syncErr);
			}
		});
		return { id: 'async', name: 'userPairAnalysis', data: { topicId, userId1, userId2 } };
	}
}

export async function enqueueTrackConsensus(topicId: string) {
	// 使用新的用户对共识聚合逻辑
	const { updateTopicConsensusSnapshot } = await import('@/lib/processing/topicConsensusAggregator');
	
	// If Redis was previously unavailable, process asynchronously
	if (!redisAvailable) {
		console.log(`[Queue] Redis unavailable, processing trackConsensus asynchronously for topic ${topicId}`);
		setImmediate(async () => {
			try {
				await updateTopicConsensusSnapshot(topicId);
			} catch (err: any) {
				console.error(`[Queue] Async trackConsensus failed:`, err);
			}
		});
		return { id: 'async', name: 'trackConsensus', data: { topicId } };
	}

	const q = initQueue();
	if (!q) {
		redisAvailable = false;
		setImmediate(async () => {
			try {
				await updateTopicConsensusSnapshot(topicId);
			} catch (err: any) {
				console.error(`[Queue] Async trackConsensus failed:`, err);
			}
		});
		return { id: 'async', name: 'trackConsensus', data: { topicId } };
	}
	
	try {
		// 共识分析：较低优先级（5），在主题和回复文档处理完之后
		const job = await q.add('trackConsensus', { topicId }, { 
			removeOnComplete: 50, 
			removeOnFail: 50,
			priority: 5 // 较低优先级
		});
		return job;
	} catch (err: any) {
		console.warn(`[Queue] Failed to enqueue trackConsensus (${err.message}), using async fallback`);
		redisAvailable = false;
		setImmediate(async () => {
			try {
				await updateTopicConsensusSnapshot(topicId);
			} catch (syncErr: any) {
				console.error(`[Queue] Async trackConsensus failed:`, syncErr);
			}
		});
		return { id: 'async', name: 'trackConsensus', data: { topicId } };
	}
}

/**
 * 将消息监督分析加入队列
 */
export async function enqueueModeration(messageId: string, roomId: string) {
	const q = initQueue();
	if (!q) {
		// Redis不可用，异步执行
		console.log(`[Queue] Redis unavailable, processing moderation asynchronously for message ${messageId}`);
		setImmediate(async () => {
			try {
				await moderateMessage(messageId, roomId);
			} catch (err: any) {
				console.error(`[Queue] Async moderation failed:`, err);
			}
		});
		return;
	}

	try {
		const job = await q.add(
			'moderate',
			{ messageId, roomId },
			{
				attempts: 2,
				backoff: {
					type: 'exponential',
					delay: 2000
				},
				removeOnComplete: {
					age: 3600, // 保留1小时
					count: 1000
				},
				removeOnFail: {
					age: 86400 // 失败任务保留24小时
				}
			}
		);
		console.log(`[Queue] Moderation job enqueued: ${job.id} for message ${messageId}`);
	} catch (err: any) {
		console.warn(`[Queue] Failed to enqueue moderation (${err.message}), using async fallback`);
		setImmediate(async () => {
			try {
				await moderateMessage(messageId, roomId);
			} catch (error: any) {
				console.error(`[Queue] Async moderation failed:`, error);
			}
		});
	}
}

/**
 * 将聊天分析加入队列
 */
export async function enqueueChatAnalysis(roomId: string) {
	const q = initQueue();
	if (!q) {
		// Redis不可用，异步执行
		console.log(`[Queue] Redis unavailable, processing chat analysis asynchronously for room ${roomId}`);
		setImmediate(async () => {
			try {
				const result = await analyzeChatConsensus(roomId);
				// 保存分析结果
				await prisma.chatAnalysis.upsert({
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
			} catch (err: any) {
				console.error(`[Queue] Async chat analysis failed:`, err);
			}
		});
		return;
	}

	try {
		const job = await q.add(
			'chatAnalysis',
			{ roomId },
			{
				attempts: 2,
				backoff: {
					type: 'exponential',
					delay: 2000
				},
				removeOnComplete: {
					age: 3600, // 保留1小时
					count: 1000
				},
				removeOnFail: {
					age: 86400 // 失败任务保留24小时
				}
			}
		);
		console.log(`[Queue] Chat analysis job enqueued: ${job.id} for room ${roomId}`);
	} catch (err: any) {
		console.warn(`[Queue] Failed to enqueue chat analysis (${err.message}), using async fallback`);
		setImmediate(async () => {
			try {
				const result = await analyzeChatConsensus(roomId);
				await prisma.chatAnalysis.upsert({
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
			} catch (error: any) {
				console.error(`[Queue] Async chat analysis failed:`, error);
			}
		});
	}
}

// 语义溯源功能已移除
