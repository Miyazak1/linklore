import { prisma } from '@/lib/db/client';
import { routeAiCall } from '@/lib/ai/router';
import { calculateSemanticSimilarity } from '@/lib/ai/semanticSimilarity';
import { getUserPairDocuments } from './userPairIdentifier';
import { checkDocumentQuality } from './documentQuality';
/**
 * 分析两个用户之间的共识和分歧
 */
export async function calculateUserPairConsensus(topicId, userId1, userId2) {
    console.log(`[UserPairConsensus] Analyzing consensus for users ${userId1} and ${userId2} in topic ${topicId}`);
    // 1. 获取两个用户在该话题中的所有相关文档
    const relevantDocs = await getUserPairDocuments(topicId, userId1, userId2);
    if (relevantDocs.length < 2) {
        console.log(`[UserPairConsensus] Not enough documents for analysis (${relevantDocs.length} < 2)`);
        return {
            consensus: [],
            disagreements: [],
            consensusScore: 0.5,
            divergenceScore: 0.5
        };
    }
    // 2. 获取文档的详细信息（包括总结和评价）
    const docIds = relevantDocs.map(d => d.id);
    const docs = await prisma.document.findMany({
        where: { id: { in: docIds } },
        include: {
            summaries: { orderBy: { id: 'desc' }, take: 1 },
            evaluations: { orderBy: { createdAt: 'desc' }, take: 1 },
            topic: { select: { discipline: true } }
        }
    });
    // 3. 过滤低质量文档
    const qualityDocs = docs.filter(doc => {
        if (!doc.evaluations || doc.evaluations.length === 0) {
            return false;
        }
        const qualityCheck = checkDocumentQuality(doc.evaluations[0], doc.topic?.discipline || undefined);
        return qualityCheck.isSufficient;
    });
    if (qualityDocs.length < 2) {
        console.log(`[UserPairConsensus] Not enough quality documents for analysis (${qualityDocs.length} < 2)`);
        return {
            consensus: [],
            disagreements: [],
            consensusScore: 0.5,
            divergenceScore: 0.5
        };
    }
    // 4. 提取用户1和用户2的观点
    const user1Docs = qualityDocs.filter(d => d.authorId === userId1);
    const user2Docs = qualityDocs.filter(d => d.authorId === userId2);
    const user1Claims = [];
    user1Docs.forEach(doc => {
        const summary = doc.summaries[0];
        if (summary && Array.isArray(summary.claims)) {
            summary.claims.forEach((claim) => {
                if (typeof claim === 'string') {
                    user1Claims.push({ claim, docId: doc.id });
                }
            });
        }
    });
    const user2Claims = [];
    user2Docs.forEach(doc => {
        const summary = doc.summaries[0];
        if (summary && Array.isArray(summary.claims)) {
            summary.claims.forEach((claim) => {
                if (typeof claim === 'string') {
                    user2Claims.push({ claim, docId: doc.id });
                }
            });
        }
    });
    if (user1Claims.length === 0 || user2Claims.length === 0) {
        console.log(`[UserPairConsensus] Not enough claims for analysis (user1: ${user1Claims.length}, user2: ${user2Claims.length})`);
        return {
            consensus: [],
            disagreements: [],
            consensusScore: 0.5,
            divergenceScore: 0.5
        };
    }
    // 5. 使用AI分析共识和分歧
    const user1ClaimsText = user1Claims.map(c => `- ${c.claim}`).join('\n');
    const user2ClaimsText = user2Claims.map(c => `- ${c.claim}`).join('\n');
    const prompt = `请分析以下两个用户在该话题中的观点，识别共识和分歧：

用户1的观点：
${user1ClaimsText}

用户2的观点：
${user2ClaimsText}

请识别：
1. **共识点**：两个用户都支持或表达相似的观点（至少2个观点支持）
   - 每个共识点应包含：观点描述、支持该观点的文档ID
2. **分歧点**：两个用户观点冲突或对立的地方
   - 每个分歧点应包含：用户1的观点、用户2的观点、对应的文档ID、冲突描述

请用JSON格式返回，格式如下：
{
  "consensus": [
    {
      "text": "共识观点描述",
      "supportCount": 支持该观点的文档数量,
      "docIds": ["docId1", "docId2"]
    }
  ],
  "disagreements": [
    {
      "claim1": "用户1的观点",
      "claim2": "用户2的观点",
      "doc1Id": "用户1的文档ID",
      "doc2Id": "用户2的文档ID",
      "description": "简要说明冲突的具体内容"
    }
  ]
}

请仔细分析观点的语义，不要只看关键词，要理解观点的实际含义。`;
    let aiResult;
    try {
        const result = await routeAiCall({
            userId: null,
            task: 'summarize',
            estimatedMaxCostCents: 30,
            prompt
        });
        // 解析AI结果
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            aiResult = JSON.parse(jsonMatch[0]);
        }
        else {
            throw new Error('AI返回格式不正确');
        }
    }
    catch (err) {
        console.error(`[UserPairConsensus] AI analysis failed:`, err);
        // Fallback to empty result
        aiResult = {
            consensus: [],
            disagreements: []
        };
    }
    // 6. 使用语义相似度验证和增强共识点
    const enhancedConsensus = await Promise.all((aiResult.consensus || []).map(async (item) => {
        // 对于共识点，可以计算平均相似度（如果有多个观点支持）
        // 这里简化处理，共识点的相似度应该较高
        let similarity = 0.8; // 默认值
        // 如果共识点有多个支持文档，可以计算这些文档观点的平均相似度
        if (item.docIds.length >= 2) {
            const doc1 = docs.find(d => d.id === item.docIds[0]);
            const doc2 = docs.find(d => d.id === item.docIds[1]);
            if (doc1 && doc2) {
                const summary1 = doc1.summaries[0];
                const summary2 = doc2.summaries[0];
                if (summary1 && summary2) {
                    // 计算两个文档观点的相似度
                    const claims1 = Array.isArray(summary1.claims)
                        ? summary1.claims.filter((c) => typeof c === 'string').join(' ')
                        : '';
                    const claims2 = Array.isArray(summary2.claims)
                        ? summary2.claims.filter((c) => typeof c === 'string').join(' ')
                        : '';
                    if (claims1 && claims2) {
                        try {
                            similarity = await calculateSemanticSimilarity(claims1, claims2);
                        }
                        catch (err) {
                            console.warn(`[UserPairConsensus] Failed to calculate similarity for consensus:`, err);
                        }
                    }
                }
            }
        }
        return {
            ...item,
            similarity
        };
    }));
    // 7. 使用语义相似度验证分歧点
    const enhancedDisagreements = await Promise.all((aiResult.disagreements || []).map(async (item) => {
        // 分歧点的相似度应该较低
        let similarity = 0.2; // 默认值
        try {
            similarity = await calculateSemanticSimilarity(item.claim1, item.claim2);
        }
        catch (err) {
            console.warn(`[UserPairConsensus] Failed to calculate similarity for disagreement:`, err);
        }
        return {
            ...item,
            similarity
        };
    }));
    // 8. 计算共识度
    const consensusCount = enhancedConsensus.length;
    const disagreementCount = enhancedDisagreements.length;
    const totalPoints = consensusCount + disagreementCount;
    // 共识度计算：考虑共识点数量和语义相似度
    let consensusScore = 0.5; // 默认值
    if (totalPoints > 0) {
        // 基础分数：共识点数量 / 总点数
        const baseScore = consensusCount / totalPoints;
        // 语义相似度加权：共识点的平均相似度
        const avgConsensusSimilarity = enhancedConsensus.length > 0
            ? enhancedConsensus.reduce((sum, c) => sum + (c.similarity || 0.8), 0) / enhancedConsensus.length
            : 0.5;
        // 综合分数：基础分数 * 语义相似度权重
        consensusScore = baseScore * 0.7 + avgConsensusSimilarity * 0.3;
    }
    const divergenceScore = 1 - consensusScore;
    return {
        consensus: enhancedConsensus,
        disagreements: enhancedDisagreements,
        consensusScore,
        divergenceScore
    };
}
/**
 * 保存用户对共识分析结果到数据库
 */
export async function saveUserPairConsensus(topicId, userId1, userId2, result, docIds, discussionPaths) {
    // 确保userId1 < userId2（用于唯一约束）
    const [u1, u2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    await prisma.userConsensus.upsert({
        where: {
            topicId_userId1_userId2: {
                topicId,
                userId1: u1,
                userId2: u2
            }
        },
        update: {
            consensus: result.consensus,
            disagreements: result.disagreements,
            consensusScore: result.consensusScore,
            divergenceScore: result.divergenceScore,
            docIds,
            discussionPaths: discussionPaths,
            lastAnalyzedAt: new Date()
        },
        create: {
            topicId,
            userId1: u1,
            userId2: u2,
            consensus: result.consensus,
            disagreements: result.disagreements,
            consensusScore: result.consensusScore,
            divergenceScore: result.divergenceScore,
            docIds,
            discussionPaths: discussionPaths,
            lastAnalyzedAt: new Date()
        }
    });
}
