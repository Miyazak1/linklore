import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getOssClient, makeObjectKey, isLocalStorage } from '@/lib/storage/oss';
import { readSession } from '@/lib/auth/session';
import mime from 'mime-types';

const ALLOWED_EXT = (process.env.ALLOWED_EXT || 'doc,docx,txt,md,pdf,rtf')
	.split(',')
	.map((s) => s.trim().toLowerCase());
const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);

const Schema = z.object({
	filename: z.string().min(1),
	size: z.number().int().positive(),
	topicId: z.string().optional()
});

export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) return NextResponse.json({ error: '未登录' }, { status: 401 });
		const json = await req.json();
		const { filename, size, topicId } = Schema.parse(json);
		if (size > MAX_MB * 1024 * 1024) {
			return NextResponse.json({ error: `文件过大，限制 ${MAX_MB}MB` }, { status: 400 });
		}
		const ext = filename.split('.').pop()?.toLowerCase();
		if (!ext || !ALLOWED_EXT.includes(ext)) {
			return NextResponse.json({ error: `不支持的文件类型：${ext}` }, { status: 400 });
		}
		const contentType = mime.lookup(ext) || 'application/octet-stream';
		const key = makeObjectKey(String(session.sub), filename);
		
		if (isLocalStorage()) {
			// Local mode: return API endpoint for direct upload
			const uploadUrl = `/api/uploads/local?key=${encodeURIComponent(key)}`;
			return NextResponse.json({ uploadUrl, key, contentType, topicId: topicId || null, local: true }, {
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		const client = getOssClient();
		// Generate signed PUT URL valid for 5 minutes
		const url = client.signatureUrl(key, { method: 'PUT', expires: 300, 'Content-Type': contentType });
		return NextResponse.json({ uploadUrl: url, key, contentType, topicId: topicId || null, local: false }, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[Upload Initiate] Error:', err);
		return NextResponse.json({ 
			error: err.message || '初始化上传失败',
			details: process.env.NODE_ENV === 'development' ? String(err.stack) : undefined
		}, { 
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}


