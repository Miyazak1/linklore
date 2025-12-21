import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';


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

	const ok = results.db === 'up';

	return NextResponse.json({ ok, ...results }, { status: ok ? 200 : 500 });
}











