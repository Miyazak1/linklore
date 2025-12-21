/**
 * 修复待处理的文档
 * 运行方式: npx tsx apps/web/scripts/fix-pending-documents.ts
 */

import { prisma } from '../lib/db/client';
import { Prisma } from '@prisma/client';
import { enqueueSummarize, enqueueEvaluate } from '../lib/queue/jobs';

async function fixPendingDocuments() {
	console.log('=== 修复待处理的文档 ===\n');

	try {
	// 1. 找到提取完成但总结未开始或失败的文档
	const docsNeedingSummarize = await prisma.document.findMany({
		where: {
			AND: [
				{
					processingStatus: {
						path: ['extract'],
						equals: 'completed'
					}
				},
				{
					OR: [
						{
							processingStatus: {
								path: ['summarize'],
								equals: 'pending'
							}
						},
						{
							processingStatus: {
								path: ['summarize'],
								equals: Prisma.JsonNull
							}
						},
						{
							processingStatus: {
								path: ['summarize'],
								equals: 'failed'
							}
						}
					]
				}
			]
		},
			take: 10,
			include: {
				topic: { select: { title: true } }
			}
		});

		console.log(`找到 ${docsNeedingSummarize.length} 个需要总结的文档\n`);

		for (const doc of docsNeedingSummarize) {
			console.log(`触发总结: 文档 ${doc.id} (${doc.topic.title})`);
			try {
				await enqueueSummarize(doc.id);
				console.log(`  ✅ 总结任务已入队`);
			} catch (err: any) {
				console.error(`  ❌ 失败: ${err.message}`);
			}
		}

		// 2. 找到总结完成但评价未开始的文档
		const docsNeedingEvaluate = await prisma.document.findMany({
			where: {
				AND: [
					{
						processingStatus: {
							path: ['summarize'],
							equals: 'completed'
						}
					},
					{
						OR: [
							{
								processingStatus: {
									path: ['evaluate'],
									equals: 'pending'
								}
							},
							{
								processingStatus: {
									path: ['evaluate'],
									equals: Prisma.JsonNull
								}
							}
						]
					}
				]
			},
			take: 10,
			include: {
				topic: { select: { title: true } }
			}
		});

		console.log(`\n找到 ${docsNeedingEvaluate.length} 个需要评价的文档\n`);

		for (const doc of docsNeedingEvaluate) {
			console.log(`触发评价: 文档 ${doc.id} (${doc.topic.title})`);
			try {
				await enqueueEvaluate(doc.id);
				console.log(`  ✅ 评价任务已入队`);
			} catch (err: any) {
				console.error(`  ❌ 失败: ${err.message}`);
			}
		}

		console.log('\n修复完成！请等待任务处理...');

	} catch (error: any) {
		console.error('修复失败:', error);
		process.exit(1);
	}
}

fixPendingDocuments()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		console.error('错误:', error);
		process.exit(1);
	});

