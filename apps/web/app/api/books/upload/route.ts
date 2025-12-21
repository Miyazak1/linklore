import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { getOssClient, makeObjectKey, isLocalStorage } from '@/lib/storage/oss';
import { fileExists } from '@/lib/storage/local';
import mime from 'mime-types';

const ALLOWED_BOOK_EXT = ['epub', 'pdf', 'mobi', 'azw3'];
const MAX_BOOK_MB = 50; // Books can be larger than documents

const Schema = z.object({
	key: z.string().min(3),
	mime: z.string().min(1),
	size: z.number().int().positive(),
	bookId: z.string().min(1),
	title: z.string().optional(),
	author: z.string().optional(),
	category: z.string().optional(),
	tags: z.array(z.string()).optional(),
	language: z.string().optional(),
	isbn: z.string().optional(),
	publisher: z.string().optional(),
	publishYear: z.number().int().min(1000).max(3000).optional(),
});

export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) return NextResponse.json({ error: '未登录' }, { status: 401 });
		const json = await req.json();
		const { key, mime: mimeType, size, bookId, title, author, category, tags, language, isbn, publisher, publishYear } = Schema.parse(json);

		// Verify file exists
		if (isLocalStorage()) {
			const exists = await fileExists(key);
			if (!exists) {
				return NextResponse.json({ error: '文件不存在或未上传完成' }, { status: 400 });
			}
		} else {
			const client = getOssClient();
			try {
				await client.head(key);
			} catch {
				return NextResponse.json({ error: '对象不存在或未上传完成' }, { status: 400 });
			}
		}

		// Verify book exists
		const book = await prisma.book.findUnique({ where: { id: bookId } });
		if (!book) {
			return NextResponse.json({ error: '书籍不存在' }, { status: 404 });
		}

		// Update book info if provided
		const updateData: any = {};
		if (title) updateData.title = title;
		if (author !== undefined) updateData.author = author || null;
		if (category !== undefined) updateData.category = category || null;
		if (tags !== undefined) updateData.tags = tags || [];
		if (language !== undefined) updateData.language = language || null;
		if (isbn !== undefined) updateData.isbn = isbn || null;
		if (publisher !== undefined) updateData.publisher = publisher || null;
		if (publishYear !== undefined) updateData.publishYear = publishYear || null;
		
		if (Object.keys(updateData).length > 0) {
			await prisma.book.update({
				where: { id: bookId },
				data: updateData
			});
		}

		// Create book asset
		await prisma.bookAsset.create({
			data: {
				bookId,
				fileKey: key,
				mime: mimeType
			}
		});

		return NextResponse.json({ ok: true, bookId });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '上传失败' }, { status: 400 });
	}
}










