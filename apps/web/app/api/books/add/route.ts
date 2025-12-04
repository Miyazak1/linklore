import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

const Schema = z.object({
	title: z.string().min(1),
	author: z.string().optional(),
	coverUrl: z.string().url().optional().or(z.literal('')),
	overview: z.string().optional(),
	source: z.string().optional()
});

export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) return NextResponse.json({ error: '未登录' }, { status: 401 });
		const { title, author, coverUrl, overview, source } = Schema.parse(await req.json());

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
					source: source || 'manual'
				}
			});
		}

		return NextResponse.json({ ok: true, book });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '添加失败' }, { status: 400 });
	}
}










