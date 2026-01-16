import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const q = searchParams.get('q') || '';
		const limit = parseInt(searchParams.get('limit') || '20', 10);

		if (!q.trim()) {
			return NextResponse.json({ items: [] });
		}

		// Search topics by title (MySQL is case-insensitive by default with utf8mb4_unicode_ci)
		const topics = await prisma.topic.findMany({
			where: {
				title: {
					contains: q
				}
			},
			orderBy: { createdAt: 'desc' },
			take: limit,
			include: {
				author: { select: { email: true } },
				_count: {
					select: { documents: true }
				}
			}
		});

		return NextResponse.json({ items: topics });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '搜索失败' }, { status: 500 });
	}
}










