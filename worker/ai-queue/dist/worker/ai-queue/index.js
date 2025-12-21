import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
// Redis 连接配置，带错误处理
let connection = null;
let redisAvailable = false;
let redisCheckDone = false;
async function checkRedisAvailable() {
    if (redisCheckDone)
        return redisAvailable;
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const testConn = new IORedis(redisUrl, {
        maxRetriesPerRequest: 0,
        retryStrategy: () => null, // 不重试
        lazyConnect: true, // 延迟连接
        enableReadyCheck: true,
        connectTimeout: 5000, // Increase to 5 seconds
        commandTimeout: 3000, // Increase to 3 seconds
        showFriendlyErrorStack: false
    });
    // 静默处理错误，不输出到控制台
    testConn.on('error', () => {
        // 静默忽略错误
    });
    try {
        // 尝试连接并 ping
        await testConn.connect();
        await Promise.race([
            testConn.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
        ]);
        testConn.disconnect();
        redisAvailable = true;
        redisCheckDone = true;
        console.log('[Worker] Redis is available');
        return true;
    }
    catch (err) {
        // 静默处理错误
        try {
            testConn.disconnect();
        }
        catch {
            // 忽略断开连接时的错误
        }
        redisAvailable = false;
        redisCheckDone = true;
        console.warn('[Worker] Redis not available, will use fallback mode. Jobs will be processed asynchronously by web app.');
        return false;
    }
}
function initRedisConnection() {
    if (!redisAvailable)
        return null;
    if (connection)
        return connection;
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
        connection = new IORedis(redisUrl, {
            maxRetriesPerRequest: null, // BullMQ requires this to be null
            retryStrategy: () => null,
            lazyConnect: true,
            enableReadyCheck: true, // Enable ready check for BullMQ
            connectTimeout: 10000, // Increase to 10 seconds
            // Remove commandTimeout - let BullMQ handle timeouts
        });
        connection.on('error', (err) => {
            console.warn('[Worker] Redis error:', err.message);
        });
        connection.on('connect', () => {
            console.log('[Worker] Redis connected');
        });
        // 注意：连接会在外部调用 connect() 时建立
        // 这里不自动连接，因为 lazyConnect: true
        return connection;
    }
    catch (err) {
        console.warn('[Worker] Failed to initialize Redis:', err.message);
        return null;
    }
}
const queueName = 'linklore-ai';
let queue = null;
// 异步初始化 Redis 连接
checkRedisAvailable().then(async (available) => {
    if (available) {
        const redisConn = initRedisConnection();
        if (redisConn) {
            // 等待连接就绪
            await redisConn.connect();
            console.log('[Worker] Redis connection established');
            queue = new Queue(queueName, { connection: redisConn });
            registerWorkers();
        }
    }
    else {
        console.log('[Worker] Redis not available. Worker will exit. Jobs will be processed asynchronously by web app.');
        console.log('[Worker] To use Redis workers, please start Redis server or set REDIS_URL environment variable.');
        // 延迟退出，让日志有时间输出
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}).catch((err) => {
    console.error('[Worker] Failed to check Redis availability:', err);
    console.log('[Worker] Worker will exit. Jobs will be processed asynchronously by web app.');
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});
export { queue };
// QueueScheduler 在新版本的 bullmq 中已被移除，不再需要
// Prisma Client 会在 shim 文件中通过 web 端的 lib/db/client 导入
// 这里不需要直接导入，避免 Prisma Client 初始化问题
async function processExtract(job) {
    const { documentId } = job.data;
    // Dynamically import to reuse web lib code if available
    const { extractAndStore } = await import('../shim/extract.js');
    await extractAndStore(documentId);
}
async function processSummarize(job) {
    const { documentId } = job.data;
    // Use worker-specific implementation to avoid path alias issues
    const { summarizeAndStore } = await import('../shim/summarize-worker.js');
    await summarizeAndStore(documentId);
    return job.id;
}
async function processEvaluate(job) {
    const { documentId } = job.data;
    // Dynamically import to reuse web lib code if available
    const { evaluateAndStore } = await import('../shim/evaluate.js');
    await evaluateAndStore(documentId);
    return job.id;
}
async function processAnalyzeDisagreements(job) {
    const { topicId, newDocumentId } = job.data;
    const { analyzeDisagreementsIncremental } = await import('../shim/analyzeDisagreements.js');
    await analyzeDisagreementsIncremental(topicId, newDocumentId);
    return job.id;
}
async function processTrackConsensus(job) {
    const { topicId } = job.data;
    // 使用新的用户对共识聚合逻辑
    const { updateTopicConsensusSnapshot } = await import('../shim/topicConsensusAggregator.js');
    await updateTopicConsensusSnapshot(topicId);
    return job.id;
}
async function processUserPairAnalysis(job) {
    const { topicId, userId1, userId2 } = job.data;
    const { processUserPairAnalysis } = await import('../shim/userPairAnalysis.js');
    await processUserPairAnalysis(topicId, userId1, userId2);
    return job.id;
}
async function processTraceAnalysis(job) {
    const { traceId } = job.data;
    const { analyzeTrace } = await import('../shim/traceAnalysis.js');
    await analyzeTrace(traceId);
    return job.id;
}
async function processModeration(job) {
    const { messageId, roomId } = job.data;
    const { moderateMessage } = await import('../shim/moderation.js');
    await moderateMessage(messageId, roomId);
    return job.id;
}
async function processChatAnalysis(job) {
    const { roomId } = job.data;
    const { analyzeChatConsensus } = await import('../shim/chatConsensus.js');
    const { prisma } = await import('../shim/prisma.js');
    const result = await analyzeChatConsensus(roomId);
    // 保存分析结果
    await prisma.chatAnalysis.upsert({
        where: { roomId },
        update: {
            consensusPoints: result.consensusPoints,
            consensusScore: result.consensusScore,
            consensusTrend: result.consensusTrend,
            disagreementPoints: result.disagreementPoints,
            divergenceScore: result.divergenceScore,
            divergenceTrend: result.divergenceTrend,
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
            consensusPoints: result.consensusPoints,
            consensusScore: result.consensusScore,
            consensusTrend: result.consensusTrend,
            disagreementPoints: result.disagreementPoints,
            divergenceScore: result.divergenceScore,
            divergenceTrend: result.divergenceTrend,
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
    return job.id;
}
export function registerWorkers() {
    if (!connection || !queue) {
        return; // Redis 不可用，不注册 workers
    }
    try {
        const worker = new Worker(queueName, async (job) => {
            console.log(`[Worker] Processing job: ${job.name} (ID: ${job.id})`);
            try {
                if (job.name === 'extract')
                    return await processExtract(job);
                if (job.name === 'summarize')
                    return await processSummarize(job);
                if (job.name === 'evaluate')
                    return await processEvaluate(job);
                if (job.name === 'analyzeDisagreements')
                    return await processAnalyzeDisagreements(job);
                if (job.name === 'trackConsensus')
                    return await processTrackConsensus(job);
                if (job.name === 'userPairAnalysis')
                    return await processUserPairAnalysis(job);
                if (job.name === 'traceAnalysis')
                    return await processTraceAnalysis(job);
                if (job.name === 'moderate')
                    return await processModeration(job);
                if (job.name === 'chatAnalysis')
                    return await processChatAnalysis(job);
                throw new Error(`Unknown job: ${job.name}`);
            }
            catch (err) {
                console.error(`[Worker] Job ${job.name} (ID: ${job.id}) failed:`, err.message);
                throw err; // Re-throw to let BullMQ handle retries
            }
        }, {
            connection,
            concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '3', 10) // 提高并发度到3，可以同时处理多个任务
        });
        worker.on('completed', (job) => {
            console.log(`[Worker] Job ${job.name} (ID: ${job.id}) completed`);
        });
        worker.on('failed', (job, err) => {
            console.error(`[Worker] Job ${job?.name} (ID: ${job?.id}) failed:`, err.message);
        });
        worker.on('error', (err) => {
            console.error('[Worker] Worker error:', err.message);
        });
        worker.on('ready', () => {
            console.log('[Worker] Worker is ready to process jobs');
        });
        worker.on('active', (job) => {
            console.log(`[Worker] Job ${job.name} (ID: ${job.id}) is now active`);
        });
        console.log('[Worker] Workers registered successfully');
    }
    catch (err) {
        console.error('[Worker] Failed to register workers:', err.message);
    }
}
export function addJob(name, data, opts) {
    if (!queue) {
        throw new Error('Queue not initialized');
    }
    return queue.add(name, data, opts);
}
// Workers 会在 Redis 检查完成后自动注册（见上面的异步初始化代码）
