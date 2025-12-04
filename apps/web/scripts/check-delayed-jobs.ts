import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function checkDelayedJobs() {
	console.log('=== 检查延迟任务详情 ===\n');

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

		// 获取延迟任务
		const delayed = await queue.getDelayed();
		console.log(`延迟任务数量: ${delayed.length}\n`);

		if (delayed.length > 0) {
			for (const job of delayed) {
				console.log(`任务: ${job.name} (ID: ${job.id})`);
				console.log(`  数据:`, job.data);
				console.log(`  优先级: ${job.opts.priority || 'default'}`);
				console.log(`  延迟到: ${job.opts.delay ? new Date(Date.now() + job.opts.delay).toISOString() : 'N/A'}`);
				console.log(`  创建时间: ${job.timestamp ? new Date(job.timestamp).toISOString() : 'N/A'}`);
				console.log('');
			}
		}

		// 获取等待中的任务
		const waiting = await queue.getWaiting();
		console.log(`等待中的任务数量: ${waiting.length}\n`);

		if (waiting.length > 0) {
			for (const job of waiting.slice(0, 5)) {
				console.log(`任务: ${job.name} (ID: ${job.id})`);
				console.log(`  数据:`, job.data);
				console.log(`  优先级: ${job.opts.priority || 'default'}`);
				console.log('');
			}
			if (waiting.length > 5) {
				console.log(`... 还有 ${waiting.length - 5} 个等待中的任务\n`);
			}
		}

		// 获取活跃的任务
		const active = await queue.getActive();
		console.log(`正在处理的任务数量: ${active.length}\n`);

		if (active.length > 0) {
			for (const job of active) {
				console.log(`任务: ${job.name} (ID: ${job.id})`);
				console.log(`  数据:`, job.data);
				console.log(`  开始时间: ${job.processedOn ? new Date(job.processedOn).toISOString() : 'N/A'}`);
				console.log('');
			}
		}

		// 检查Worker连接
		const workers = await connection.keys('bull:linklore-ai:*:workers');
		console.log(`Worker连接数: ${workers.length}`);
		if (workers.length > 0) {
			for (const workerKey of workers) {
				const workerInfo = await connection.hgetall(workerKey);
				console.log(`  Worker: ${workerKey}`, workerInfo);
			}
		}

		await connection.quit();
	} catch (err: any) {
		console.error('检查失败:', err.message);
		console.error(err.stack);
	}
}

checkDelayedJobs()
	.then(() => {
		console.log('\n检查完成');
		process.exit(0);
	})
	.catch((err) => {
		console.error('错误:', err);
		process.exit(1);
	});



