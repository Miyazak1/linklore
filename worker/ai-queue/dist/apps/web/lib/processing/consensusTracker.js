import { prisma } from '@/lib/db/client';
import { getDocumentTree } from '@/lib/topics/documentTree';
import { checkDocumentQuality } from './documentQuality';
/**
 * 追踪共识并创建快照
 */
export async function trackConsensus(topicId) {
    console.log(`[ConsensusTracker] Tracking consensus for topic ${topicId}`);
    // 获取文档树
    const docTree = await getDocumentTree(topicId);
    // 获取所有文档的详细信息（包括评价和总结）
    const allDocIds = new Set();
    const collectIds = (nodes) => {
        nodes.forEach(node => {
            allDocIds.add(node.id);
            if (node.children.length > 0) {
                collectIds(node.children);
            }
        });
    };
    collectIds(docTree);
    const docs = await prisma.document.findMany({
        where: { id: { in: Array.from(allDocIds) } },
        include: {
            evaluations: { orderBy: { createdAt: 'desc' }, take: 1 },
            summaries: { orderBy: { id: 'desc' }, take: 1 },
            topic: { select: { discipline: true } }
        }
    });
    // 过滤低质量文档
    const qualityDocs = docs.filter(doc => {
        if (!doc.evaluations || doc.evaluations.length === 0) {
            return false;
        }
        const qualityCheck = checkDocumentQuality(doc.evaluations[0], doc.topic?.discipline || undefined);
        return qualityCheck.isSufficient;
    });
    console.log(`[ConsensusTracker] Total docs: ${docs.length}, Quality docs: ${qualityDocs.length}`);
    if (qualityDocs.length < 2) {
        // 文档不足，返回默认快照
        return {
            id: '',
            topicId,
            snapshotAt: new Date(),
            consensusData: {
                consensusScore: 0.5,
                divergenceScore: 0.5,
                trend: 'stable',
                keyPoints: [],
                disagreements: []
            }
        };
    }
    // 提取所有文档的观点
    const allClaims = [];
    qualityDocs.forEach(doc => {
        const summary = doc.summaries[0];
        if (summary && Array.isArray(summary.claims)) {
            const claims = summary.claims.filter((c) => typeof c === 'string');
            allClaims.push(...claims);
        }
    });
    // 计算共识度（基于观点的相似性）
    const consensusScore = calculateConsensusScore(allClaims);
    const divergenceScore = 1 - consensusScore;
    // 提取关键共识点和分歧点
    const keyPoints = extractKeyPoints(qualityDocs);
    const disagreements = await extractDisagreements(topicId);
    // 获取历史快照以计算趋势
    const recentSnapshots = await prisma.consensusSnapshot.findMany({
        where: { topicId },
        orderBy: { snapshotAt: 'desc' },
        take: 5
    });
    const trend = calculateTrend(recentSnapshots, consensusScore);
    const consensusData = {
        consensusScore,
        divergenceScore,
        trend,
        keyPoints,
        disagreements
    };
    // 创建快照
    const snapshot = await createConsensusSnapshot(topicId, consensusData);
    return snapshot;
}
/**
 * 计算共识度分数（0-1）
 * 基于观点的相似性和重复度
 */
function calculateConsensusScore(claims) {
    if (claims.length === 0)
        return 0.5;
    if (claims.length === 1)
        return 1.0;
    // 简单的相似度计算：基于关键词重叠
    const claimWords = claims.map(claim => {
        // 提取关键词（中文和英文单词）
        const words = claim.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || [];
        return new Set(words.map(w => w.toLowerCase()));
    });
    let totalSimilarity = 0;
    let pairCount = 0;
    for (let i = 0; i < claimWords.length; i++) {
        for (let j = i + 1; j < claimWords.length; j++) {
            const set1 = claimWords[i];
            const set2 = claimWords[j];
            // 计算Jaccard相似度
            const intersection = new Set([...set1].filter(x => set2.has(x)));
            const union = new Set([...set1, ...set2]);
            const similarity = union.size > 0 ? intersection.size / union.size : 0;
            totalSimilarity += similarity;
            pairCount++;
        }
    }
    return pairCount > 0 ? totalSimilarity / pairCount : 0.5;
}
/**
 * 提取关键共识点
 */
function extractKeyPoints(docs) {
    const claimCounts = new Map();
    docs.forEach(doc => {
        const summary = doc.summaries[0];
        if (summary && Array.isArray(summary.claims)) {
            summary.claims.forEach((claim) => {
                if (typeof claim === 'string') {
                    claimCounts.set(claim, (claimCounts.get(claim) || 0) + 1);
                }
            });
        }
    });
    // 返回出现次数最多的观点（至少2个文档提到）
    const keyPoints = Array.from(claimCounts.entries())
        .filter(([_, count]) => count >= 2)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 5)
        .map(([claim, _]) => claim);
    return keyPoints;
}
/**
 * 提取主要分歧点
 */
async function extractDisagreements(topicId) {
    try {
        // 从数据库获取分歧点
        const disagreements = await prisma.disagreement.findMany({
            where: {
                topicId,
                falsePositive: false // 排除误判的分歧点
            },
            orderBy: [
                { confidence: 'desc' }, // 置信度高的在前
                { createdAt: 'desc' }
            ],
            take: 10, // 最多返回10个主要分歧点
            select: {
                title: true,
                description: true,
                severity: true
            }
        });
        // 按严重程度排序（high > medium > low）
        const severityOrder = { high: 3, medium: 2, low: 1 };
        disagreements.sort((a, b) => {
            const aOrder = severityOrder[a.severity] || 0;
            const bOrder = severityOrder[b.severity] || 0;
            return bOrder - aOrder;
        });
        // 格式化分歧点描述
        return disagreements.map(d => {
            const severityLabel = d.severity === 'high' ? '严重' : d.severity === 'medium' ? '中等' : '轻微';
            return `${d.title}（${severityLabel}）：${d.description || ''}`;
        });
    }
    catch (err) {
        console.error(`[ConsensusTracker] Failed to extract disagreements for topic ${topicId}:`, err);
        return [];
    }
}
/**
 * 计算趋势
 */
function calculateTrend(snapshots, currentScore) {
    if (snapshots.length === 0)
        return 'stable';
    const recentScores = snapshots
        .map(s => s.consensusScore)
        .filter((s) => s !== null);
    if (recentScores.length === 0)
        return 'stable';
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const diff = currentScore - avgRecent;
    // 阈值：0.05
    if (diff > 0.05)
        return 'converging';
    if (diff < -0.05)
        return 'diverging';
    return 'stable';
}
/**
 * 创建共识快照
 */
export async function createConsensusSnapshot(topicId, consensusData) {
    // 清理旧快照（只保留最近50个）
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
    // 创建新快照
    const snapshot = await prisma.consensusSnapshot.create({
        data: {
            topicId,
            consensusData: consensusData,
            consensusScore: consensusData.consensusScore,
            divergenceScore: consensusData.divergenceScore
        }
    });
    return {
        id: snapshot.id,
        topicId: snapshot.topicId,
        snapshotAt: snapshot.snapshotAt,
        consensusData,
        consensusScore: snapshot.consensusScore || undefined,
        divergenceScore: snapshot.divergenceScore || undefined
    };
}
