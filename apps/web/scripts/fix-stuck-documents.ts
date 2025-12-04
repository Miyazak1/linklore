/**
 * 修复卡住的文档处理流程
 * 运行方式: cd apps/web; npx tsx scripts/fix-stuck-documents.ts
 */

import { prisma } from '../lib/db/client';
import { enqueueExtract, enqueueSummarize, enqueueEvaluate } from '../lib/queue/jobs';
import { getProcessingStatus } from '../lib/processing/status';

async function fixStuckDocuments() {
	console.log('=== 修复卡住的文档处理流程 ===\n');

	try {
		// 1. 找到已提取但未总结的文档
		const stuckSummarize = await prisma.document.findMany({
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
			take: 20,
			include: { 
				topic: { select: { title: true } },
				summaries: { take: 1 }
			}
		});

		console.log(`找到 ${stuckSummarize.length} 个需要总结的文档\n`);

		for (const doc of stuckSummarize) {
			const status = await getProcessingStatus(doc.id);
			console.log(`文档 ${doc.id} (${doc.topic.title}):`);
			console.log(`  提取状态: ${status?.extract || 'unknown'}`);
			console.log(`  总结状态: ${status?.summarize || 'unknown'}`);
			console.log(`  已有总结: ${doc.summaries.length > 0 ? '是' : '否'}`);
			
			// 检查提取是否完成
			if (status?.extract === 'completed' || doc.extractedText) {
				try {
					const job = await enqueueSummarize(doc.id);
					console.log(`  ✅ 总结任务已入队: ${job.id} (${job.name})\n`);
				} catch (err: any) {
					console.error(`  ❌ 入队失败: ${err.message}\n`);
				}
			} else {
				console.log(`  ⚠️  提取未完成，先触发提取\n`);
				try {
					const job = await enqueueExtract(doc.id);
					console.log(`  ✅ 提取任务已入队: ${job.id} (${job.name})\n`);
				} catch (err: any) {
					console.error(`  ❌ 提取入队失败: ${err.message}\n`);
				}
			}
		}

		// 2. 找到已总结但未评价的文档
		const stuckEvaluate = await prisma.document.findMany({
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
			take: 20,
			include: { 
				topic: { select: { title: true } },
				evaluations: { take: 1 }
			}
		});

		console.log(`\n找到 ${stuckEvaluate.length} 个需要评价的文档\n`);

		for (const doc of stuckEvaluate) {
			const status = await getProcessingStatus(doc.id);
			console.log(`文档 ${doc.id} (${doc.topic.title}):`);
			console.log(`  总结状态: ${status?.summarize || 'unknown'}`);
			console.log(`  评价状态: ${status?.evaluate || 'unknown'}`);
			console.log(`  已有评价: ${doc.evaluations.length > 0 ? '是' : '否'}`);
			
			// 检查总结是否完成
			if (status?.summarize === 'completed' || doc.summaries.length > 0) {
				try {
					const job = await enqueueEvaluate(doc.id);
					console.log(`  ✅ 评价任务已入队: ${job.id} (${job.name})\n`);
				} catch (err: any) {
					console.error(`  ❌ 入队失败: ${err.message}\n`);
				}
			} else {
				console.log(`  ⚠️  总结未完成，先触发总结\n`);
				try {
					const job = await enqueueSummarize(doc.id);
					console.log(`  ✅ 总结任务已入队: ${job.id} (${job.name})\n`);
				} catch (err: any) {
					console.error(`  ❌ 总结入队失败: ${err.message}\n`);
				}
			}
		}

		// 3. 找到处理失败的文档
		const failedDocs = await prisma.document.findMany({
			where: {
				processingStatus: {
					path: [],
					array_contains: ['failed']
				}
			},
			take: 10,
			include: { topic: { select: { title: true } } }
		});

		console.log(`\n找到 ${failedDocs.length} 个处理失败的文档\n`);

		for (const doc of failedDocs) {
			const status = await getProcessingStatus(doc.id);
			console.log(`文档 ${doc.id} (${doc.topic.title}):`);
			console.log(`  状态:`, JSON.stringify(status, null, 2));
			console.log(`  错误:`, JSON.stringify(status?.errors, null, 2));
			console.log(`  建议: 检查错误信息后手动重试\n`);
		}

		console.log('\n=== 修复完成 ===');
		console.log('提示: 如果任务仍然卡住，请检查：');
		console.log('1. Worker是否正在运行: pnpm --filter @linklore/ai-queue dev');
		console.log('2. Redis是否可用');
		console.log('3. AI API配置是否正确');

	} catch (err: any) {
		console.error('修复失败:', err);
		console.error(err.stack);
	} finally {
		await prisma.$disconnect();
	}
}

fixStuckDocuments();



