// Worker-specific summarize implementation
// This file reimplements summarizeAndStore using relative paths to avoid @/ alias issues

import { PrismaClient } from '@prisma/client';

// Create Prisma client instance
const prisma = new PrismaClient();

// Import using relative paths - these files also use @/ aliases, so we need to handle them
// For now, we'll import the actual implementation and patch the prisma import
// This is a workaround until we can properly configure path aliases in the worker

// Lazy load modules to avoid top-level await issues
let routeAiCall: any;
let updateProcessingStatus: any;
let checkProcessingDependencies: any;
let enqueueEvaluate: any;

async function loadModules() {
	if (routeAiCall && updateProcessingStatus && checkProcessingDependencies && enqueueEvaluate) {
		return; // Already loaded
	}
	
	try {
		// Try to import - if this fails due to path aliases, we'll need to create worker versions
		const routerModule = await import('../../apps/web/lib/ai/router.js');
		routeAiCall = routerModule.routeAiCall;
		
		const statusModule = await import('../../apps/web/lib/processing/status.js');
		updateProcessingStatus = statusModule.updateProcessingStatus;
		checkProcessingDependencies = statusModule.checkProcessingDependencies;
		
		const jobsModule = await import('../../apps/web/lib/queue/jobs.js');
		enqueueEvaluate = jobsModule.enqueueEvaluate;
	} catch (err: any) {
		console.error('[Worker] Failed to import modules, path alias issue:', err.message);
		throw new Error(`Failed to import required modules: ${err.message}. Please ensure path aliases are configured correctly.`);
	}
}

export async function summarizeAndStore(documentId: string) {
	// Load modules if not already loaded
	await loadModules();
	
	// 检查依赖（带详细日志）
	console.log(`[Summarize] Checking dependencies for document ${documentId}`);
	const deps = await checkProcessingDependencies(documentId, 'summarize');
	if (!deps.ready) {
		const errorMsg = `依赖未完成: ${deps.missing?.join(', ')}`;
		console.error(`[Summarize] ${errorMsg} for document ${documentId}`);
		// 获取当前状态用于调试
		const doc = await prisma.document.findUnique({
			where: { id: documentId },
			select: { 
				processingStatus: true,
				extractedText: true
			}
		});
		console.error(`[Summarize] Current status:`, JSON.stringify(doc?.processingStatus, null, 2));
		console.error(`[Summarize] Has extractedText:`, !!doc?.extractedText);
		throw new Error(errorMsg);
	}
	console.log(`[Summarize] Dependencies OK for document ${documentId}`);
	
	// 更新状态为 processing
	await updateProcessingStatus(documentId, 'summarize', 'processing');
	
	try {
		const doc = await prisma.document.findUnique({
			where: { id: documentId },
			include: { topic: true }
		});
		if (!doc) throw new Error('Document not found');
		if (!doc.extractedText) throw new Error('Document text not extracted yet');

		const text = Buffer.from(doc.extractedText).toString('utf-8');
		// Limit text length for AI processing (configurable, default 10000)
		const textLimit = parseInt(process.env.AI_SUMMARIZE_TEXT_LIMIT || '10000', 10);
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

		// Call AI
		const result = await routeAiCall({
			userId: doc.authorId,
			task: 'summarize',
			estimatedMaxCostCents: 20,
			prompt
		});

		// Parse AI response
		let summaryData: {
			title: string;
			overview: string;
			structure: any;
			claims: string[];
			keywords: string[];
		};

		try {
			const jsonMatch = result.text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				summaryData = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error('No JSON found in response');
			}
		} catch {
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
				counterpoints: [],
				keywords: summaryData.keywords
			}
		});

		// Update topic subtitle
		const topic = await prisma.topic.findUnique({ where: { id: doc.topicId } });
		if (topic && !(topic as any).subtitle) {
			await prisma.topic.update({
				where: { id: doc.topicId },
				data: { subtitle: summaryData.title } as any
			});
			console.log(`[Summarize] Updated topic subtitle with AI-generated title: ${summaryData.title}`);
		}

		// 更新状态为 completed
		await updateProcessingStatus(documentId, 'summarize', 'completed');
		
		// Trigger evaluate job after summarize completes
		try {
			await enqueueEvaluate(documentId);
			console.log(`[Summarize] Evaluate job enqueued for document ${documentId}`);
		} catch (err: any) {
			console.warn(`[Summarize] Failed to enqueue evaluate for document ${documentId}:`, err.message);
			// Continue even if evaluate fails - it can be retried later
		}
	} catch (err: any) {
		console.error(`[Summarize] Error processing document ${documentId}:`, err);
		await updateProcessingStatus(documentId, 'summarize', 'failed');
		throw err;
	}
}

