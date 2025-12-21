/**
 * 检查评价功能是否正常
 * 运行方式: npx tsx apps/web/scripts/check-evaluation.ts
 */

import { prisma } from '../lib/db/client';
import { Prisma } from '@prisma/client';

async function checkEvaluation() {
	console.log('=== 检查评价功能 ===\n');

	try {
		// 1. 检查最近的文档
		const recentDocs = await prisma.document.findMany({
			orderBy: { createdAt: 'desc' },
			take: 5,
			include: {
				evaluations: { orderBy: { createdAt: 'desc' }, take: 1 },
				topic: { select: { title: true, id: true } }
			}
		});

		console.log(`找到 ${recentDocs.length} 个最近的文档\n`);

		for (const doc of recentDocs) {
			console.log(`文档 ID: ${doc.id}`);
			console.log(`话题: ${doc.topic.title}`);
			console.log(`处理状态: ${JSON.stringify(doc.processingStatus)}`);
			
			// 检查提取状态
			const extractStatus = (doc.processingStatus as any)?.extract;
			const summarizeStatus = (doc.processingStatus as any)?.summarize;
			const evaluateStatus = (doc.processingStatus as any)?.evaluate;

			console.log(`  提取: ${extractStatus || 'pending'}`);
			console.log(`  总结: ${summarizeStatus || 'pending'}`);
			console.log(`  评价: ${evaluateStatus || 'pending'}`);

			if (doc.evaluations && doc.evaluations.length > 0) {
				const evaluation = doc.evaluations[0];
				console.log(`  评价结果:`);
				console.log(`    学科: ${evaluation.discipline || 'default'}`);
				console.log(`    评分: ${JSON.stringify(evaluation.scores)}`);
				console.log(`    评价: ${evaluation.verdict?.substring(0, 100)}...`);
			} else {
				console.log(`  评价: 无评价结果`);
			}

			console.log('');
		}

		// 2. 检查评价统计
		const totalDocs = await prisma.document.count();
		const evaluatedDocs = await prisma.document.findMany({
			where: {
				processingStatus: {
					path: ['evaluate'],
					equals: 'completed'
				}
			}
		});

		console.log(`\n=== 统计信息 ===`);
		console.log(`总文档数: ${totalDocs}`);
		console.log(`已评价文档数: ${evaluatedDocs.length}`);
		console.log(`评价完成率: ${((evaluatedDocs.length / totalDocs) * 100).toFixed(1)}%`);

		// 3. 检查最近失败的评价
		const failedDocs = await prisma.document.findMany({
			where: {
				processingStatus: {
					path: ['evaluate'],
					equals: 'failed'
				}
			},
			take: 5,
			include: {
				topic: { select: { title: true } }
			}
		});

		if (failedDocs.length > 0) {
			console.log(`\n=== 失败的评价 ===`);
			for (const doc of failedDocs) {
				const error = (doc.processingStatus as any)?.evaluateError;
				console.log(`文档 ${doc.id} (${doc.topic.title}): ${error || '未知错误'}`);
			}
		}

		// 4. 检查待评价的文档
		const pendingDocs = await prisma.document.findMany({
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
			take: 5,
			include: {
				topic: { select: { title: true } }
			}
		});

		if (pendingDocs.length > 0) {
			console.log(`\n=== 待评价的文档 ===`);
			for (const doc of pendingDocs) {
				console.log(`文档 ${doc.id} (${doc.topic.title}): 总结已完成，但评价未开始`);
			}
		}

	} catch (error: any) {
		console.error('检查失败:', error);
		process.exit(1);
	}
}

checkEvaluation()
	.then(() => {
		console.log('\n检查完成');
		process.exit(0);
	})
	.catch((error) => {
		console.error('错误:', error);
		process.exit(1);
	});



