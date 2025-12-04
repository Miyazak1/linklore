import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOssClient, makeObjectKey, isLocalStorage } from '@/lib/storage/oss';
import { readSession } from '@/lib/auth/session';
import mime from 'mime-types';

const ALLOWED_BOOK_EXT = ['epub', 'pdf', 'mobi', 'azw3'];
const MAX_BOOK_MB = 50;

const Schema = z.object({
	filename: z.string().min(1),
	size: z.number().int().positive(),
	bookId: z.string().optional() // If provided, upload to existing book; otherwise create new
});

export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) return NextResponse.json({ error: '未登录' }, { status: 401 });
		const json = await req.json();
		const { filename, size, bookId } = Schema.parse(json);

		if (size > MAX_BOOK_MB * 1024 * 1024) {
			return NextResponse.json({ error: `文件过大，限制 ${MAX_BOOK_MB}MB` }, { status: 400 });
		}

		const ext = filename.split('.').pop()?.toLowerCase();
		if (!ext || !ALLOWED_BOOK_EXT.includes(ext)) {
			return NextResponse.json({ error: `不支持的文件类型：${ext}，支持：${ALLOWED_BOOK_EXT.join(', ')}` }, { status: 400 });
		}

		const contentType = mime.lookup(ext) || 'application/octet-stream';
		const key = `books/${String(session.sub)}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

		if (isLocalStorage()) {
			const uploadUrl = `/api/uploads/local?key=${encodeURIComponent(key)}`;
			return NextResponse.json({ uploadUrl, key, contentType, bookId: bookId || null, local: true });
		}

		const client = getOssClient();
		const url = client.signatureUrl(key, { method: 'PUT', expires: 300, 'Content-Type': contentType });
		return NextResponse.json({ uploadUrl: url, key, contentType, bookId: bookId || null, local: false });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '初始化上传失败' }, { status: 400 });
	}
}










