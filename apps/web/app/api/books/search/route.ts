import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const q = searchParams.get('q') || '';
	const save = searchParams.get('save') === 'true';
	if (!q) return NextResponse.json({ error: '缺少 q' }, { status: 400 });

	const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=10`;
	const res = await fetch(url, { cache: 'no-store' });
	if (!res.ok) return NextResponse.json({ error: '外部搜索失败' }, { status: 500 });
	const data = await res.json();
	const items =
		(data?.docs || []).map((d: any) => ({
			title: d.title,
			author: (d.author_name || [])[0],
			coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
			source: 'openlibrary'
		})) || [];

	if (save && items.length) {
		for (const it of items) {
			// Check if book already exists (title + author combination)
			const existing = await prisma.book.findFirst({
				where: { title: it.title, author: it.author || null }
			});
			if (!existing) {
				await prisma.book.create({
					data: { title: it.title, author: it.author || null, coverUrl: it.coverUrl || null, source: 'openlibrary' }
				});
			}
		}
	}
	return NextResponse.json({ items });
}


