/**
 * 清理失败的任务并重新触发
 * 运行方式: cd apps/web; npx tsx scripts/clean-failed-jobs-and-retry.ts
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../lib/db/client';
import { enqueueSummarize } from '../lib/queue/jobs';

async function cleanAndRetry() {
	console.log('=== 清理失败任务并重新触发 ===\n');

	const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
	
	try {
		const connection = new IORedis(redisUrl, {
			maxRetriesPerRequest: null,
			retryStrategy: () => null,
			lazyConnect: true,
			enableReadyCheck: true,
			connectTimeout: 5000
		});

		await connection.connect();
		const queue = new Queue('linklore-ai', { connection });

		// 获取失败的任务
		const failed = await queue.getFailed();
		console.log(`找到 ${failed.length} 个失败的任务\n`);

		// 清理所有失败的任务
		if (failed.length > 0) {
			console.log('清理失败的任务...');
			for (const job of failed) {
				await job.remove();
				console.log(`  已清理: ${job.name} (ID: ${job.id})`);
			}
			console.log('');
		}

		// 找到需要重新处理的文档
		const docsNeedingSummarize = await prisma.document.findMany({
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
			take: 10,
			include: { topic: { select: { title: true } } }
		});

		console.log(`找到 ${docsNeedingSummarize.length} 个需要重新处理的文档\n`);

		for (const doc of docsNeedingSummarize) {
			console.log(`重新触发: ${doc.id} (${doc.topic.title})`);
			try {
				const job = await enqueueSummarize(doc.id);
				console.log(`  ✅ 已入队: ${job.id} (${job.name})\n`);
			} catch (err: any) {
				console.error(`  ❌ 失败: ${err.message}\n`);
			}
		}

		await connection.quit();
		console.log('\n=== 完成 ===');
		console.log('请检查Worker日志，确认任务是否成功处理');

	} catch (err: any) {
		console.error('操作失败:', err.message);
		console.error(err.stack);
	} finally {
		await prisma.$disconnect();
	}
}

cleanAndRetry();



