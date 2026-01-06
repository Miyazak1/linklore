import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@/lib/db/client';
import { extractAndStore } from '@/lib/processing/extract';
import { summarizeAndStore } from '@/lib/processing/summarize';
import { evaluateAndStore } from '@/lib/processing/evaluate';
import { analyzeDisagreementsIncremental } from '@/lib/processing/analyzeDisagreements';
import { createModuleLogger } from '@/lib/utils/logger';
const log = createModuleLogger('Queue Jobs');
// trackConsensus is replaced by updateTopicConsensusSnapshot
// import { trackConsensus } from '@/lib/processing/consensusTracker';
let connection = null;
let queue = null;
let redisAvailable = true; // Track Redis availability
// Initialize queue with error handling
function initQueue() {
    if (queue)
        return queue;
    if (!redisAvailable)
        return null;
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
    }
    catch (err) {
        log.warn('Redis initialization failed, will use sync fallback', { error: err });
        redisAvailable = false;
        return null;
    }
}
export async function enqueueExtract(documentId) {
    // If Redis was previously unavailable, process asynchronously in background
    if (!redisAvailable) {
        log.debug('Redis unavailable, processing extract asynchronously', { documentId });
        // Use setImmediate to run asynchronously without blocking
        setImmediate(async () => {
            try {
                await extractAndStore(documentId);
            }
            catch (err) {
                log.error('Async extract failed', err, { documentId });
            }
        });
        return { id: 'async', name: 'extract', data: { documentId } };
    }
    const q = initQueue();
    if (!q) {
        redisAvailable = false;
        // Fallback to async processing
        log.debug('Redis unavailable, processing extract asynchronously', { documentId });
        setImmediate(async () => {
            try {
                await extractAndStore(documentId);
            }
            catch (err) {
                log.error('Async extract failed', err, { documentId });
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
    }
    catch (err) {
        // If enqueue fails, mark Redis as unavailable and process asynchronously
        log.warn('Failed to enqueue, using async fallback', { error: err.message, documentId });
        redisAvailable = false;
        setImmediate(async () => {
            try {
                await extractAndStore(documentId);
            }
            catch (syncErr) {
                log.error('Async extract failed', syncErr, { documentId });
            }
        });
        return { id: 'async', name: 'extract', data: { documentId } };
    }
}
export async function enqueueSummarize(documentId) {
    // If Redis was previously unavailable, process asynchronously
    if (!redisAvailable) {
        log.debug('Redis unavailable, processing summarize asynchronously', { documentId });
        setImmediate(async () => {
            try {
                await summarizeAndStore(documentId);
            }
            catch (err) {
                log.error('Async summarize failed', err, { documentId });
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
            }
            catch (err) {
                log.error('Async summarize failed', err, { documentId });
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
        log.debug('Summarize job enqueued', { jobId: job.id, documentId, priority });
        // 注意：任务已入队，Worker会自动处理
        // 如果Worker未运行，任务会在队列中等待
        // 建议启动Worker: pnpm --filter @linklore/ai-queue dev
        return job;
    }
    catch (err) {
        log.warn('Failed to enqueue summarize, using async fallback', { error: err.message, documentId });
        redisAvailable = false;
        setImmediate(async () => {
            try {
                await summarizeAndStore(documentId);
            }
            catch (syncErr) {
                log.error('Async summarize failed', syncErr, { documentId });
            }
        });
        return { id: 'async', name: 'summarize', data: { documentId } };
    }
}
export async function enqueueEvaluate(documentId) {
    // If Redis was previously unavailable, process asynchronously
    if (!redisAvailable) {
        log.debug('Redis unavailable, processing evaluate asynchronously', { documentId });
        setImmediate(async () => {
            try {
                await evaluateAndStore(documentId);
            }
            catch (err) {
                log.error('Async evaluate failed', err, { documentId });
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
            }
            catch (err) {
                log.error('Async evaluate failed', err, { documentId });
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
    }
    catch (err) {
        log.warn('Failed to enqueue evaluate, using async fallback', { error: err.message, documentId });
        redisAvailable = false;
        setImmediate(async () => {
            try {
                await evaluateAndStore(documentId);
            }
            catch (syncErr) {
                log.error('Async evaluate failed', syncErr, { documentId });
            }
        });
        return { id: 'async', name: 'evaluate', data: { documentId } };
    }
}
// 实践功能已移除
export async function enqueueAnalyzeDisagreements(topicId, newDocumentId) {
    // If Redis was previously unavailable, process asynchronously
    if (!redisAvailable) {
        log.debug('Redis unavailable, processing analyzeDisagreements asynchronously', { topicId, newDocumentId });
        setImmediate(async () => {
            try {
                await analyzeDisagreementsIncremental(topicId, newDocumentId);
            }
            catch (err) {
                log.error('Async analyzeDisagreements failed', err, { topicId, newDocumentId });
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
            }
            catch (err) {
                log.error('Async analyzeDisagreements failed', err, { topicId, newDocumentId });
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
    }
    catch (err) {
        log.warn('Failed to enqueue analyzeDisagreements, using async fallback', { error: err.message, topicId, newDocumentId });
        redisAvailable = false;
        setImmediate(async () => {
            try {
                await analyzeDisagreementsIncremental(topicId, newDocumentId);
            }
            catch (syncErr) {
                log.error('Async analyzeDisagreements failed', syncErr, { topicId, newDocumentId });
            }
        });
        return { id: 'async', name: 'analyzeDisagreements', data: { topicId, newDocumentId } };
    }
}
export async function enqueueUserPairAnalysis(topicId, userId1, userId2) {
    // If Redis was previously unavailable, process asynchronously
    if (!redisAvailable) {
        log.debug('Redis unavailable, processing user pair analysis asynchronously', { topicId, userId1, userId2 });
        setImmediate(async () => {
            try {
                const { identifyUserPairs } = await import('@/lib/processing/userPairIdentifier');
                const { calculateUserPairConsensus, saveUserPairConsensus } = await import('@/lib/processing/userPairConsensus');
                const { updateTopicConsensusSnapshot } = await import('@/lib/processing/topicConsensusAggregator');
                if (userId1 && userId2) {
                    // 分析特定用户对
                    const result = await calculateUserPairConsensus(topicId, userId1, userId2);
                    const userPairs = await identifyUserPairs(topicId);
                    const pair = userPairs.find(p => (p.userId1 === userId1 && p.userId2 === userId2) ||
                        (p.userId1 === userId2 && p.userId2 === userId1));
                    if (pair) {
                        await saveUserPairConsensus(topicId, userId1, userId2, result, pair.docIds, pair.discussionPaths);
                    }
                }
                else {
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
            catch (err) {
                log.error('Async user pair analysis failed', err, { topicId, userId1, userId2 });
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
                    const pair = userPairs.find(p => (p.userId1 === userId1 && p.userId2 === userId2) ||
                        (p.userId1 === userId2 && p.userId2 === userId1));
                    if (pair) {
                        await saveUserPairConsensus(topicId, userId1, userId2, result, pair.docIds, pair.discussionPaths);
                    }
                }
                else {
                    const userPairs = await identifyUserPairs(topicId);
                    for (const pair of userPairs) {
                        const result = await calculateUserPairConsensus(topicId, pair.userId1, pair.userId2);
                        await saveUserPairConsensus(topicId, pair.userId1, pair.userId2, result, pair.docIds, pair.discussionPaths);
                    }
                    await updateTopicConsensusSnapshot(topicId);
                }
            }
            catch (syncErr) {
                log.error('Async user pair analysis failed', syncErr, { topicId, userId1, userId2 });
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
        log.debug('User pair analysis job enqueued', { jobId: job.id, topicId });
        return job;
    }
    catch (err) {
        log.warn('Failed to enqueue user pair analysis, using async fallback', { error: err.message, topicId, userId1, userId2 });
        redisAvailable = false;
        setImmediate(async () => {
            try {
                const { identifyUserPairs } = await import('@/lib/processing/userPairIdentifier');
                const { calculateUserPairConsensus, saveUserPairConsensus } = await import('@/lib/processing/userPairConsensus');
                const { updateTopicConsensusSnapshot } = await import('@/lib/processing/topicConsensusAggregator');
                if (userId1 && userId2) {
                    const result = await calculateUserPairConsensus(topicId, userId1, userId2);
                    const userPairs = await identifyUserPairs(topicId);
                    const pair = userPairs.find(p => (p.userId1 === userId1 && p.userId2 === userId2) ||
                        (p.userId1 === userId2 && p.userId2 === userId1));
                    if (pair) {
                        await saveUserPairConsensus(topicId, userId1, userId2, result, pair.docIds, pair.discussionPaths);
                    }
                }
                else {
                    const userPairs = await identifyUserPairs(topicId);
                    for (const pair of userPairs) {
                        const result = await calculateUserPairConsensus(topicId, pair.userId1, pair.userId2);
                        await saveUserPairConsensus(topicId, pair.userId1, pair.userId2, result, pair.docIds, pair.discussionPaths);
                    }
                    await updateTopicConsensusSnapshot(topicId);
                }
            }
            catch (syncErr) {
                log.error('Async user pair analysis failed', syncErr, { topicId, userId1, userId2 });
            }
        });
        return { id: 'async', name: 'userPairAnalysis', data: { topicId, userId1, userId2 } };
    }
}
export async function enqueueTrackConsensus(topicId) {
    // 使用新的用户对共识聚合逻辑
    const { updateTopicConsensusSnapshot } = await import('@/lib/processing/topicConsensusAggregator');
    // If Redis was previously unavailable, process asynchronously
    if (!redisAvailable) {
        log.debug('Redis unavailable, processing trackConsensus asynchronously', { topicId });
        setImmediate(async () => {
            try {
                await updateTopicConsensusSnapshot(topicId);
            }
            catch (err) {
                log.error('Async trackConsensus failed', err, { topicId });
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
            }
            catch (err) {
                log.error('Async trackConsensus failed', err, { topicId });
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
    }
    catch (err) {
        log.warn('Failed to enqueue trackConsensus, using async fallback', { error: err.message, topicId });
        redisAvailable = false;
        setImmediate(async () => {
            try {
                await updateTopicConsensusSnapshot(topicId);
            }
            catch (syncErr) {
                log.error('Async trackConsensus failed', syncErr, { topicId });
            }
        });
        return { id: 'async', name: 'trackConsensus', data: { topicId } };
    }
}
// 语义溯源功能已移除
