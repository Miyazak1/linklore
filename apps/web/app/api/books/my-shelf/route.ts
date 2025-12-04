import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

export async function GET() {
	try {
		const session = await readSession();
		if (!session?.sub) return NextResponse.json({ error: '未登录' }, { status: 401 });

		const items = await prisma.bookshelfItem.findMany({
			where: { userId: String(session.sub) },
			select: { bookId: true }
		});

		return NextResponse.json({ items });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '获取失败' }, { status: 400 });
	}
}










