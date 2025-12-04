import IORedis from 'ioredis';

async function checkQueueStatus() {
	console.log('=== 检查队列状态 ===\n');

	const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
	
	try {
		const redis = new IORedis(redisUrl, {
			maxRetriesPerRequest: null,
			retryStrategy: () => null,
			lazyConnect: true,
			enableReadyCheck: true,
			connectTimeout: 5000
		});

		await redis.connect();

		// 检查队列中的任务
		const queueName = 'linklore-ai';
		
		// 等待中的任务
		const waiting = await redis.llen(`bull:${queueName}:wait`);
		console.log(`等待中的任务: ${waiting}`);
		
		// 活跃的任务（正在处理）
		const active = await redis.llen(`bull:${queueName}:active`);
		console.log(`正在处理的任务: ${active}`);
		
		// 延迟的任务
		const delayed = await redis.zcard(`bull:${queueName}:delayed`);
		console.log(`延迟的任务: ${delayed}`);
		
		// 失败的任务
		const failed = await redis.llen(`bull:${queueName}:failed`);
		console.log(`失败的任务: ${failed}`);
		
		// 已完成的任务
		const completed = await redis.llen(`bull:${queueName}:completed`);
		console.log(`已完成的任务: ${completed}`);

		// 检查Worker是否在运行（通过检查是否有活跃的worker连接）
		const workerKeys = await redis.keys(`bull:${queueName}:*:workers`);
		console.log(`\nWorker连接数: ${workerKeys.length}`);
		
		if (waiting > 0 && active === 0 && workerKeys.length === 0) {
			console.log('\n⚠️  警告：有任务在等待，但没有Worker在处理！');
			console.log('   建议：启动Worker: pnpm --filter @linklore/ai-queue dev');
		}

		if (failed > 0) {
			console.log(`\n⚠️  有 ${failed} 个失败的任务，可能需要检查错误日志`);
		}

		await redis.disconnect();
	} catch (err: any) {
		console.error('检查失败:', err.message);
	}
}

checkQueueStatus()
	.then(() => {
		console.log('\n检查完成');
		process.exit(0);
	})
	.catch((err) => {
		console.error('错误:', err);
		process.exit(1);
	});



