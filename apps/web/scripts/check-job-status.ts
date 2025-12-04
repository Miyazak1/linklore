import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function checkJobStatus() {
	console.log('=== 检查任务状态 ===\n');

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

		// 检查各种状态的任务
		const waiting = await queue.getWaiting();
		const active = await queue.getActive();
		const delayed = await queue.getDelayed();
		const completed = await queue.getCompleted();
		const failed = await queue.getFailed();

		console.log(`等待中: ${waiting.length}`);
		console.log(`处理中: ${active.length}`);
		console.log(`延迟: ${delayed.length}`);
		console.log(`已完成: ${completed.length}`);
		console.log(`失败: ${failed.length}\n`);

		// 显示最近完成的任务
		if (completed.length > 0) {
			console.log('最近完成的任务:');
			for (const job of completed.slice(0, 5)) {
				console.log(`  ${job.name} (ID: ${job.id}) - ${job.finishedOn ? new Date(job.finishedOn).toISOString() : 'N/A'}`);
			}
			console.log('');
		}

		// 显示失败的任务
		if (failed.length > 0) {
			console.log('失败的任务:');
			for (const job of failed.slice(0, 5)) {
				console.log(`  ${job.name} (ID: ${job.id}) - ${job.failedReason || 'Unknown error'}`);
			}
			console.log('');
		}

		// 检查Worker
		const workers = await connection.keys('bull:linklore-ai:*:workers');
		console.log(`Worker连接数: ${workers.length}`);
		if (workers.length > 0) {
			for (const workerKey of workers) {
				const workerInfo = await connection.hgetall(workerKey);
				console.log(`  Worker: ${workerKey}`);
				console.log(`    信息:`, workerInfo);
			}
		} else {
			console.log('  ⚠️  没有检测到Worker连接');
			console.log('  请确保Worker正在运行: pnpm --filter @linklore/ai-queue dev');
		}

		await connection.quit();
	} catch (err: any) {
		console.error('检查失败:', err.message);
		console.error(err.stack);
	}
}

checkJobStatus()
	.then(() => {
		console.log('\n检查完成');
		process.exit(0);
	})
	.catch((err) => {
		console.error('错误:', err);
		process.exit(1);
	});



