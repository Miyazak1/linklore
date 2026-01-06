import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';
const log = createModuleLogger('DependencyCheck');
/**
 * 更新文档处理状态
 */
export async function updateProcessingStatus(documentId, stage, status, error) {
    const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { processingStatus: true }
    });
    const currentStatus = doc?.processingStatus || {};
    const newStatus = {
        ...currentStatus,
        [stage]: status
    };
    if (error) {
        newStatus.errors = {
            ...(currentStatus.errors || {}),
            [stage]: error
        };
    }
    else if (status === 'completed') {
        // 成功时清除错误
        newStatus.errors = {
            ...(currentStatus.errors || {})
        };
        delete newStatus.errors[stage];
    }
    await prisma.document.update({
        where: { id: documentId },
        data: {
            processingStatus: newStatus,
            lastProcessedAt: new Date()
        }
    });
}
/**
 * 检查处理依赖是否完成
 */
export async function checkProcessingDependencies(documentId, requiredStage) {
    const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
            processingStatus: true,
            extractedText: true, // 用于容错检查
            summaries: { take: 1 }, // 用于容错检查
            evaluations: { take: 1 } // 用于容错检查
        }
    });
    if (!doc) {
        log.warn('Document not found', { documentId });
        return { ready: false, missing: [requiredStage] };
    }
    const status = doc.processingStatus || {};
    // 定义依赖关系
    const dependencies = {
        extract: [],
        summarize: ['extract'],
        evaluate: ['summarize'],
        analyzeDisagreements: ['evaluate'], // 需要所有文档的 evaluate 完成
        trackConsensus: ['evaluate'] // 只需要evaluate完成，可以与analyzeDisagreements并行
    };
    const required = dependencies[requiredStage] || [];
    const missing = [];
    for (const dep of required) {
        const depStatus = status[dep];
        // 容错机制：如果状态显示未完成，但实际数据存在，认为已完成
        let isCompleted = depStatus === 'completed';
        if (!isCompleted) {
            // 容错检查
            if (dep === 'extract' && doc.extractedText) {
                log.debug('Extract status mismatch but extractedText exists, treating as completed', { documentId, depStatus });
                isCompleted = true;
                // 自动修复状态
                await updateProcessingStatus(documentId, 'extract', 'completed').catch(() => {
                    // 忽略修复失败，继续处理
                });
            }
            else if (dep === 'summarize' && doc.summaries.length > 0) {
                log.debug('Summarize status mismatch but summary exists, treating as completed', { documentId, depStatus });
                isCompleted = true;
                // 自动修复状态
                await updateProcessingStatus(documentId, 'summarize', 'completed').catch(() => {
                    // 忽略修复失败，继续处理
                });
            }
            else if (dep === 'evaluate' && doc.evaluations.length > 0) {
                log.debug('Evaluate status mismatch but evaluation exists, treating as completed', { documentId, depStatus });
                isCompleted = true;
                // 自动修复状态
                await updateProcessingStatus(documentId, 'evaluate', 'completed').catch(() => {
                    // 忽略修复失败，继续处理
                });
            }
        }
        if (!isCompleted) {
            missing.push(dep);
            log.warn('Missing dependency', { documentId, requiredStage, dep, depStatus });
        }
    }
    const ready = missing.length === 0;
    if (!ready) {
        log.warn('Dependencies not ready', { documentId, requiredStage, missing });
    }
    else {
        log.debug('All dependencies ready', { documentId, requiredStage });
    }
    return {
        ready,
        missing: missing.length > 0 ? missing : undefined
    };
}
/**
 * 获取处理状态
 */
export async function getProcessingStatus(documentId) {
    const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { processingStatus: true }
    });
    return doc?.processingStatus || null;
}
