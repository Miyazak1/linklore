import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function cleanFailedJobs() {
	console.log('=== 清理失败的任务 ===\n');

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

		const failed = await queue.getFailed();
		console.log(`找到 ${failed.length} 个失败的任务\n`);

		if (failed.length > 0) {
			// 清理所有失败的任务
			for (const job of failed) {
				await job.remove();
				console.log(`已清理: ${job.name} (ID: ${job.id})`);
			}
			console.log(`\n已清理 ${failed.length} 个失败的任务`);
		} else {
			console.log('没有失败的任务需要清理');
		}

		await connection.quit();
	} catch (err: any) {
		console.error('清理失败:', err.message);
	}
}

cleanFailedJobs()
	.then(() => {
		console.log('\n清理完成');
		process.exit(0);
	})
	.catch((err) => {
		console.error('错误:', err);
		process.exit(1);
	});



