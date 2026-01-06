import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

const Schema = z.object({
	title: z.string().min(1),
	author: z.string().optional().nullable(),
	coverUrl: z.string().url().optional().or(z.literal('')).nullable(),
	overview: z.string().optional().nullable(),
	source: z.string().optional().nullable(),
	category: z.string().optional().nullable(),
	tags: z.array(z.string()).optional().nullable(),
	language: z.string().optional().nullable(),
	isbn: z.string().optional().nullable(),
	publisher: z.string().optional().nullable(),
	publishYear: z.number().int().min(1000).max(3000).optional().nullable(),
});

export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) return NextResponse.json({ error: '未登录' }, { status: 401 });
		const { title, author, coverUrl, overview, source, category, tags, language, isbn, publisher, publishYear } = Schema.parse(await req.json());

		// Check if book already exists
		const existing = await prisma.book.findFirst({
			where: { title, author: author || null }
		});

		let book;
		if (existing) {
			book = existing;
		} else {
			book = await prisma.book.create({
				data: {
					title,
					author: author || null,
					coverUrl: coverUrl || null,
					overview: overview || null,
					source: source || 'manual',
					category: category || null,
					tags: tags || [],
					language: language || null,
					isbn: isbn || null,
					publisher: publisher || null,
					publishYear: publishYear || null,
				}
			});
		}

		return NextResponse.json({ ok: true, book });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '添加失败' }, { status: 400 });
	}
}










