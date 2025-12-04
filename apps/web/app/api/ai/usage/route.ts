import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';

export async function GET() {
	const session = await readSession();
	if (!session?.sub) return NextResponse.json({ error: '未登录' }, { status: 401 });
	const now = new Date();
	const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const usage = await prisma.aiUsageLog.aggregate({
		where: { userId: String(session.sub) },
		_sum: { costCents: true, promptTokens: true, completionTokens: true }
	});
	return NextResponse.json({ month, usage });
}


