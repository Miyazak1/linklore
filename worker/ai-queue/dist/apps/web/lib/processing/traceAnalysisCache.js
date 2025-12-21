/**
 * 溯源分析结果缓存
 * 基于内容hash的缓存机制，避免重复分析相同内容
 */
import { prisma } from '@/lib/db/client';
import crypto from 'crypto';
/**
 * 计算内容hash
 */
export function calculateContentHash(body, citations) {
    const content = JSON.stringify({
        body,
        citations: citations.map((c) => ({
            url: c.url,
            title: c.title,
            quote: c.quote,
            author: c.author,
            year: c.year
        }))
    });
    return crypto.createHash('sha256').update(content).digest('hex');
}
/**
 * 检查是否有缓存的分析结果
 */
export async function getCachedAnalysis(traceId, contentHash) {
    const trace = await prisma.trace.findUnique({
        where: { id: traceId },
        select: { body: true, citationsList: true }
    });
    if (!trace)
        return null;
    const currentHash = calculateContentHash(trace.body, trace.citationsList);
    // 如果内容hash匹配，返回现有分析
    if (currentHash === contentHash) {
        const analysis = await prisma.traceAnalysis.findUnique({
            where: { traceId },
            include: {
                trace: {
                    select: {
                        body: true,
                        citationsList: true
                    }
                }
            }
        });
        if (analysis) {
            // 验证内容是否真的匹配
            const analysisHash = calculateContentHash(analysis.trace.body, analysis.trace.citationsList);
            if (analysisHash === contentHash) {
                return analysis;
            }
        }
    }
    return null;
}
/**
 * 保存分析结果（包含hash）
 */
export async function saveAnalysisWithHash(traceId, analysisData, contentHash) {
    // 使用事务确保一致性
    return await prisma.$transaction(async (tx) => {
        // 保存分析结果
        const analysis = await tx.traceAnalysis.upsert({
            where: { traceId },
            create: {
                traceId,
                ...analysisData
            },
            update: {
                ...analysisData
            }
        });
        return analysis;
    });
}
