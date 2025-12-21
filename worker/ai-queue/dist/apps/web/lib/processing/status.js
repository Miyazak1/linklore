import { prisma } from '@/lib/db/client';
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
        console.warn(`[DependencyCheck] Document ${documentId} not found`);
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
                console.log(`[DependencyCheck] Extract status is "${depStatus}" but extractedText exists, treating as completed`);
                isCompleted = true;
                // 自动修复状态
                await updateProcessingStatus(documentId, 'extract', 'completed').catch(() => {
                    // 忽略修复失败，继续处理
                });
            }
            else if (dep === 'summarize' && doc.summaries.length > 0) {
                console.log(`[DependencyCheck] Summarize status is "${depStatus}" but summary exists, treating as completed`);
                isCompleted = true;
                // 自动修复状态
                await updateProcessingStatus(documentId, 'summarize', 'completed').catch(() => {
                    // 忽略修复失败，继续处理
                });
            }
            else if (dep === 'evaluate' && doc.evaluations.length > 0) {
                console.log(`[DependencyCheck] Evaluate status is "${depStatus}" but evaluation exists, treating as completed`);
                isCompleted = true;
                // 自动修复状态
                await updateProcessingStatus(documentId, 'evaluate', 'completed').catch(() => {
                    // 忽略修复失败，继续处理
                });
            }
        }
        if (!isCompleted) {
            missing.push(dep);
            console.warn(`[DependencyCheck] Document ${documentId}, stage ${requiredStage}: missing dependency ${dep} (status: ${depStatus})`);
        }
    }
    const ready = missing.length === 0;
    if (!ready) {
        console.warn(`[DependencyCheck] Document ${documentId}, stage ${requiredStage}: not ready, missing: ${missing.join(', ')}`);
    }
    else {
        console.log(`[DependencyCheck] Document ${documentId}, stage ${requiredStage}: all dependencies ready`);
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
