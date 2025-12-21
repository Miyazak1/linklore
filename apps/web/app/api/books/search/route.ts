import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('Books Search API');

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const q = searchParams.get('q') || '';
	const save = searchParams.get('save') === 'true';
	if (!q) return NextResponse.json({ error: '缺少 q' }, { status: 400 });

	// 同时搜索本地数据库和外部API
	const [localBooks, externalBooks] = await Promise.all([
		// 搜索本地数据库
		prisma.book.findMany({
			where: {
				OR: [
					{ title: { contains: q, mode: 'insensitive' } },
					{ author: { contains: q, mode: 'insensitive' } }
				]
			},
			take: 10,
			orderBy: { createdAt: 'desc' },
			include: {
				assets: {
					select: {
						id: true,
						fileKey: true,
						mime: true
					}
				}
			}
		}).catch(() => []),
		
		// 搜索外部API
		(async () => {
			try {
				const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=10`;
				const res = await fetch(url, { cache: 'no-store' });
				if (!res.ok) return [];
				const data = await res.json();
				return (data?.docs || []).map((d: any) => ({
					title: d.title,
					author: (d.author_name || [])[0],
					coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
					source: 'openlibrary'
				}));
			} catch (err) {
				log.error('External search error', err as Error);
				return [];
			}
		})()
	]);

	// 转换本地图书格式
	const localItems = localBooks.map((book) => ({
		id: book.id,
		title: book.title,
		author: book.author,
		coverUrl: book.coverUrl,
		overview: book.overview,
		source: book.source,
		assets: book.assets
	}));

	// 合并结果：本地图书在前，外部图书在后
	// 去重：如果外部图书在本地已存在，则不包含
	const localTitles = new Set(localItems.map(b => `${b.title}|${b.author || ''}`));
	const externalItems = externalBooks.filter((book: any) => {
		const key = `${book.title}|${book.author || ''}`;
		return !localTitles.has(key);
	});

	const items = [...localItems, ...externalItems];

	// 如果设置了save参数，保存外部搜索结果到数据库
	if (save && externalItems.length) {
		for (const it of externalItems) {
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


