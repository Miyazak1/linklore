/**
 * 诊断AI分析和总结未触发的问题
 * 运行方式: cd apps/web; npx tsx scripts/diagnose-ai-trigger.ts
 */

import { prisma } from '../lib/db/client';
import { enqueueExtract, enqueueSummarize, enqueueEvaluate } from '../lib/queue/jobs';
import { getProcessingStatus } from '../lib/processing/status';

async function diagnose() {
	console.log('=== AI处理流程诊断 ===\n');

	try {
		// 1. 检查最近上传的文档
		const recentDocs = await prisma.document.findMany({
			orderBy: { createdAt: 'desc' },
			take: 10,
			include: {
				topic: { select: { title: true } },
				summaries: { take: 1 },
				evaluations: { take: 1 }
			}
		});

		console.log(`找到 ${recentDocs.length} 个最近上传的文档\n`);

		for (const doc of recentDocs) {
			console.log(`\n文档 ID: ${doc.id}`);
			console.log(`  话题: ${doc.topic.title}`);
			console.log(`  创建时间: ${doc.createdAt.toISOString()}`);
			console.log(`  有提取文本: ${doc.extractedText ? '是' : '否'}`);
			
			const status = await getProcessingStatus(doc.id);
			console.log(`  处理状态:`, JSON.stringify(status, null, 2));
			
			console.log(`  有总结: ${doc.summaries.length > 0 ? '是' : '否'}`);
			console.log(`  有评价: ${doc.evaluations.length > 0 ? '是' : '否'}`);

			// 检查问题
			const issues: string[] = [];
			
			if (!doc.extractedText && status?.extract !== 'processing' && status?.extract !== 'failed') {
				issues.push('❌ 未提取文本，且未在处理中');
			}
			
			if (doc.extractedText && !status?.summarize && doc.summaries.length === 0) {
				issues.push('⚠️  已提取文本但未总结');
			}
			
			if (status?.summarize === 'completed' && !status?.evaluate && doc.evaluations.length === 0) {
				issues.push('⚠️  已总结但未评价');
			}
			
			if (status?.extract === 'failed') {
				issues.push(`❌ 提取失败: ${status.errors?.extract || '未知错误'}`);
			}
			
			if (status?.summarize === 'failed') {
				issues.push(`❌ 总结失败: ${status.errors?.summarize || '未知错误'}`);
			}
			
			if (status?.evaluate === 'failed') {
				issues.push(`❌ 评价失败: ${status.errors?.evaluate || '未知错误'}`);
			}

			if (issues.length > 0) {
				console.log(`  问题:`);
				issues.forEach(issue => console.log(`    ${issue}`));
			} else {
				console.log(`  ✅ 状态正常`);
			}
		}

		// 2. 检查需要修复的文档
		console.log(`\n\n=== 需要修复的文档 ===\n`);

		// 已提取但未总结
		const needSummarize = await prisma.document.findMany({
			where: {
				AND: [
					{ extractedText: { not: null } },
					{
						OR: [
							{ summaries: { none: {} } },
							{
								processingStatus: {
									path: ['summarize'],
									not: { equals: 'completed' }
								}
							}
						]
					}
				]
			},
			take: 5,
			include: { topic: { select: { title: true } } }
		});

		console.log(`需要总结的文档: ${needSummarize.length}`);
		for (const doc of needSummarize) {
			console.log(`  - ${doc.id} (${doc.topic.title})`);
		}

		// 已总结但未评价
		const needEvaluate = await prisma.document.findMany({
			where: {
				AND: [
					{ summaries: { some: {} } },
					{
						OR: [
							{ evaluations: { none: {} } },
							{
								processingStatus: {
									path: ['evaluate'],
									not: { equals: 'completed' }
								}
							}
						]
					}
				]
			},
			take: 5,
			include: { topic: { select: { title: true } } }
		});

		console.log(`\n需要评价的文档: ${needEvaluate.length}`);
		for (const doc of needEvaluate) {
			console.log(`  - ${doc.id} (${doc.topic.title})`);
		}

		// 3. 测试任务入队
		console.log(`\n\n=== 测试任务入队 ===\n`);
		
		if (needSummarize.length > 0) {
			const testDoc = needSummarize[0];
			console.log(`测试总结任务入队: ${testDoc.id}`);
			try {
				const result = await enqueueSummarize(testDoc.id);
				console.log(`  ✅ 入队成功: ${result.id} (${result.name})`);
			} catch (err: any) {
				console.error(`  ❌ 入队失败: ${err.message}`);
			}
		}

		if (needEvaluate.length > 0) {
			const testDoc = needEvaluate[0];
			console.log(`测试评价任务入队: ${testDoc.id}`);
			try {
				const result = await enqueueEvaluate(testDoc.id);
				console.log(`  ✅ 入队成功: ${result.id} (${result.name})`);
			} catch (err: any) {
				console.error(`  ❌ 入队失败: ${err.message}`);
			}
		}

	} catch (err: any) {
		console.error('诊断失败:', err);
		console.error(err.stack);
	} finally {
		await prisma.$disconnect();
	}
}

diagnose();



