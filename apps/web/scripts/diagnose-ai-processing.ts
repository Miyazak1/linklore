import { prisma } from '@/lib/db/client';
import IORedis from 'ioredis';

async function diagnoseAIProcessing() {
	console.log('=== AI 处理诊断 ===\n');

	try {
		// 1. 检查 Redis 连接
		console.log('1. 检查 Redis 连接...');
		const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
		let redisAvailable = false;
		
		try {
			const testConn = new IORedis(redisUrl, {
				maxRetriesPerRequest: 0,
				retryStrategy: () => null,
				lazyConnect: true,
				connectTimeout: 3000,
				commandTimeout: 2000
			});
			
			await testConn.connect();
			await testConn.ping();
			testConn.disconnect();
			redisAvailable = true;
			console.log('   ✅ Redis 可用');
		} catch (err: any) {
			console.log('   ❌ Redis 不可用:', err.message);
			console.log('   ⚠️  任务将使用异步处理（setImmediate），可能较慢');
		}

		// 2. 检查最近的文档处理状态
		console.log('\n2. 检查最近的文档处理状态...');
		const recentDocs = await prisma.document.findMany({
			orderBy: { createdAt: 'desc' },
			take: 10,
			include: {
				topic: { select: { title: true } },
				summaries: { take: 1 },
				evaluations: { take: 1 }
			}
		});

		console.log(`   找到 ${recentDocs.length} 个最近文档\n`);

		for (const doc of recentDocs) {
			const status = (doc.processingStatus as any) || {};
			const extractStatus = status.extract || 'pending';
			const summarizeStatus = status.summarize || 'pending';
			const evaluateStatus = status.evaluate || 'pending';
			
			console.log(`   文档 ${doc.id.slice(0, 8)}... (${doc.topic.title.slice(0, 30)}...)`);
			console.log(`     Extract: ${extractStatus}`);
			console.log(`     Summarize: ${summarizeStatus}`);
			console.log(`     Evaluate: ${evaluateStatus}`);
			
			// 检查是否有错误
			if (status.errors) {
				const errors = status.errors;
				Object.keys(errors).forEach(stage => {
					console.log(`     ❌ ${stage} 错误: ${errors[stage]}`);
				});
			}
			
			// 检查是否有总结和评价
			if (doc.summaries.length > 0) {
				console.log(`     ✅ 有总结`);
			} else if (summarizeStatus === 'completed') {
				console.log(`     ⚠️  状态显示完成但无总结数据`);
			}
			
			if (doc.evaluations.length > 0) {
				console.log(`     ✅ 有评价`);
			} else if (evaluateStatus === 'completed') {
				console.log(`     ⚠️  状态显示完成但无评价数据`);
			}
			
			console.log('');
		}

		// 3. 检查卡住的文档
		console.log('3. 检查可能卡住的文档...');
		
		// 检查 extract 完成但 summarize 未开始的
		const stuckAtSummarize = await prisma.document.findMany({
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
									equals: null
								}
							}
						]
					}
				]
			},
			take: 5
		});

		if (stuckAtSummarize.length > 0) {
			console.log(`   ⚠️  发现 ${stuckAtSummarize.length} 个文档卡在 summarize 阶段`);
			for (const doc of stuckAtSummarize) {
				console.log(`      - ${doc.id.slice(0, 8)}... (创建于: ${doc.createdAt.toLocaleString('zh-CN')})`);
			}
		} else {
			console.log('   ✅ 没有卡在 summarize 的文档');
		}

		// 检查 summarize 完成但 evaluate 未开始的
		const stuckAtEvaluate = await prisma.document.findMany({
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
									equals: null
								}
							}
						]
					}
				]
			},
			take: 5
		});

		if (stuckAtEvaluate.length > 0) {
			console.log(`   ⚠️  发现 ${stuckAtEvaluate.length} 个文档卡在 evaluate 阶段`);
			for (const doc of stuckAtEvaluate) {
				console.log(`      - ${doc.id.slice(0, 8)}... (创建于: ${doc.createdAt.toLocaleString('zh-CN')})`);
			}
		} else {
			console.log('   ✅ 没有卡在 evaluate 的文档');
		}

		// 4. 检查处理中的文档（可能卡住了）
		console.log('\n4. 检查处理中的文档（可能卡住）...');
		const processingDocs = await prisma.document.findMany({
			where: {
				OR: [
					{
						processingStatus: {
							path: ['extract'],
							equals: 'processing'
						}
					},
					{
						processingStatus: {
							path: ['summarize'],
							equals: 'processing'
						}
					},
					{
						processingStatus: {
							path: ['evaluate'],
							equals: 'processing'
						}
					}
				]
			},
			take: 10,
			include: {
				topic: { select: { title: true } }
			}
		});

		if (processingDocs.length > 0) {
			console.log(`   ⚠️  发现 ${processingDocs.length} 个文档处于 processing 状态（可能卡住）`);
			for (const doc of processingDocs) {
				const status = (doc.processingStatus as any) || {};
				const processingStages = [];
				if (status.extract === 'processing') processingStages.push('extract');
				if (status.summarize === 'processing') processingStages.push('summarize');
				if (status.evaluate === 'processing') processingStages.push('evaluate');
				
				const age = Date.now() - doc.createdAt.getTime();
				const ageMinutes = Math.floor(age / 60000);
				
				console.log(`      - ${doc.id.slice(0, 8)}... (${doc.topic.title.slice(0, 30)}...)`);
				console.log(`        卡在: ${processingStages.join(', ')}`);
				console.log(`        已等待: ${ageMinutes} 分钟`);
			}
		} else {
			console.log('   ✅ 没有卡在 processing 状态的文档');
		}

		// 5. 建议
		console.log('\n=== 建议 ===');
		if (!redisAvailable) {
			console.log('1. ⚠️  Redis 不可用，建议：');
			console.log('   - 启动 Redis: redis-server (或 Windows 上的 redis-server.exe)');
			console.log('   - 或启动 Worker: pnpm --filter @linklore/ai-queue dev');
			console.log('   - 当前任务会使用异步处理，可能较慢');
		}
		
		if (stuckAtSummarize.length > 0 || stuckAtEvaluate.length > 0) {
			console.log('2. ⚠️  有文档卡住，建议运行修复脚本：');
			console.log('   cd apps/web');
			console.log('   npx tsx scripts/fix-pending-documents.ts');
		}
		
		if (processingDocs.length > 0) {
			console.log('3. ⚠️  有文档长时间处于 processing 状态，可能需要：');
			console.log('   - 检查 Worker 是否在运行');
			console.log('   - 检查 AI API 是否可用');
			console.log('   - 手动重置状态或重新触发处理');
		}

	} catch (error: any) {
		console.error('诊断失败:', error);
		process.exit(1);
	}
}

diagnoseAIProcessing()
	.then(() => {
		console.log('\n诊断完成');
		process.exit(0);
	})
	.catch((err) => {
		console.error('诊断出错:', err);
		process.exit(1);
	});



