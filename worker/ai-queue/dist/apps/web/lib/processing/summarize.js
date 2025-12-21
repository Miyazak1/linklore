import { prisma } from '@/lib/db/client';
import { routeAiCall } from '@/lib/ai/router';
import { updateProcessingStatus, checkProcessingDependencies } from './status';
import { AI_PROCESSING_CONFIG } from '@/lib/config/ai-processing';
export async function summarizeAndStore(documentId) {
    // 检查依赖
    const deps = await checkProcessingDependencies(documentId, 'summarize');
    if (!deps.ready) {
        throw new Error(`依赖未完成: ${deps.missing?.join(', ')}`);
    }
    // 更新状态为 processing
    await updateProcessingStatus(documentId, 'summarize', 'processing');
    try {
        const doc = await prisma.document.findUnique({
            where: { id: documentId },
            include: { topic: true }
        });
        if (!doc)
            throw new Error('Document not found');
        if (!doc.extractedText)
            throw new Error('Document text not extracted yet');
        const text = Buffer.from(doc.extractedText).toString('utf-8');
        // Limit text length for AI processing (configurable)
        const textLimit = AI_PROCESSING_CONFIG.TEXT_LIMITS.SUMMARIZE;
        const textForAi = text.slice(0, textLimit);
        if (text.length > textLimit) {
            console.log(`[Summarize] Text truncated from ${text.length} to ${textLimit} characters`);
        }
        // Build prompt for multi-dimensional summary
        const prompt = `请对以下文档进行多维度总结，要求：
1. 标题：如果文档有明确标题则提取，否则生成一个简洁的标题（不超过50字）
2. 概述：用200-300字概括文档的核心内容和主要观点
3. 结构：分析文档的结构，用JSON格式返回，包含：章节/段落、主要论点、论证逻辑
4. 观点：提取文档的核心观点和主张，用JSON数组返回
5. 关键词：提取5-10个关键词，用数组返回

文档内容：
${textForAi}

请用JSON格式返回，格式如下：
{
  "title": "标题",
  "overview": "概述",
  "structure": { "sections": [], "arguments": [], "logic": "" },
  "claims": ["观点1", "观点2"],
  "keywords": ["关键词1", "关键词2"]
}`;
        // Call AI (currently returns placeholder)
        const result = await routeAiCall({
            userId: doc.authorId,
            task: 'summarize',
            estimatedMaxCostCents: 20, // Estimate cost
            prompt
        });
        // Parse AI response (for now, use placeholder structure)
        let summaryData;
        try {
            // Try to parse JSON from AI response
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                summaryData = JSON.parse(jsonMatch[0]);
            }
            else {
                throw new Error('No JSON found in response');
            }
        }
        catch {
            // Fallback: generate basic summary from text
            const lines = text.split('\n').filter(l => l.trim().length > 0);
            const firstLine = lines[0]?.slice(0, 50) || '未命名文档';
            summaryData = {
                title: firstLine,
                overview: text.slice(0, 300) + (text.length > 300 ? '...' : ''),
                structure: { sections: [], arguments: [], logic: '待AI分析' },
                claims: [],
                keywords: []
            };
        }
        // Save summary to database
        await prisma.summary.create({
            data: {
                documentId: doc.id,
                title: summaryData.title,
                overview: summaryData.overview,
                structure: summaryData.structure,
                claims: summaryData.claims,
                counterpoints: [], // 不再提取单个文档的对立观点，改为在共识分析中分析文档间的冲突
                keywords: summaryData.keywords
            }
        });
        // Update topic subtitle with AI-generated title (asynchronously)
        // The main title is already set by user during upload
        // We only update subtitle if it's not already set
        // Note: Using type assertion because Prisma Client needs to be regenerated
        const topic = await prisma.topic.findUnique({ where: { id: doc.topicId } });
        if (topic && !topic.subtitle) {
            await prisma.topic.update({
                where: { id: doc.topicId },
                data: { subtitle: summaryData.title } // AI-generated title as subtitle
            });
            console.log(`[Summarize] Updated topic subtitle with AI-generated title: ${summaryData.title}`);
        }
        // 更新状态为 completed
        await updateProcessingStatus(documentId, 'summarize', 'completed');
        // Trigger evaluate job after summarize completes
        try {
            const { enqueueEvaluate } = await import('@/lib/queue/jobs');
            const job = await enqueueEvaluate(doc.id);
            console.log(`[Summarize] Evaluate job enqueued: ${job.id} (${job.name}) for document ${doc.id}`);
        }
        catch (err) {
            console.error(`[Summarize] Failed to enqueue evaluate for document ${doc.id}:`, err.message);
            console.error(`[Summarize] Error stack:`, err.stack);
            // Continue even if evaluate fails - can be retried manually
        }
        return { ok: true };
    }
    catch (error) {
        // 更新状态为 failed
        await updateProcessingStatus(documentId, 'summarize', 'failed', error.message);
        console.error(`[Summarize] Summarization failed for document ${documentId}:`, error);
        throw error;
    }
}
