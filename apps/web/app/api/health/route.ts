import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

async function checkTraceSystem() {
	try {
		// 检查Trace相关表
		const traceCount = await prisma.trace.count();
		const entryCount = await prisma.entry.count();
		const analysisCount = await prisma.traceAnalysis.count();

		// 检查最近的分析任务
		const recentAnalysis = await prisma.traceAnalysis.findFirst({
			orderBy: { analyzedAt: 'desc' },
			select: { analyzedAt: true, credibilityScore: true }
		});

		return {
			healthy: true,
			stats: {
				traceCount,
				entryCount,
				analysisCount,
				lastAnalysis: recentAnalysis?.analyzedAt || null,
				lastAnalysisScore: recentAnalysis?.credibilityScore || null
			}
		};
	} catch (err: any) {
		return {
			healthy: false,
			error: err.message
		};
	}
}

export async function GET() {
	const results: any = {};

	// 检查数据库
	try {
		await prisma.$queryRaw`SELECT 1`;
		results.db = 'up';
	} catch {
		results.db = 'down';
		return NextResponse.json({ ok: false, ...results }, { status: 500 });
	}

	// 检查队列
	try {
		const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
		const queue = new Queue('linklore-ai', { connection });
		const waiting = await queue.getWaitingCount();
		const active = await queue.getActiveCount();
		results.queue = { waiting, active, status: 'up' };
	} catch {
		results.queue = { status: 'down' };
	}

	// 检查溯源系统
	results.traceSystem = await checkTraceSystem();

	const ok = results.db === 'up' && results.traceSystem.healthy;

	return NextResponse.json({ ok, ...results }, { status: ok ? 200 : 500 });
}











