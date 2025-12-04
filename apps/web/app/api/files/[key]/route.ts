import { NextResponse } from 'next/server';
import { getFile } from '@/lib/storage/local';
import { readFile } from 'fs/promises';
import { join } from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		},
	});
}

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
	try {
		const { key: keyParam } = await params;
		const key = decodeURIComponent(keyParam);
		// 去掉 uploads/ 前缀（如果存在）
		const relativePath = key.replace(/^uploads\//, '');
		const filePath = join(UPLOAD_DIR, relativePath);
		
		// 调试日志（仅在开发环境）
		if (process.env.NODE_ENV === 'development') {
			console.log('[File API] Requested key:', key);
			console.log('[File API] Relative path:', relativePath);
			console.log('[File API] Full file path:', filePath);
		}
		
		const buffer = await readFile(filePath);
		
		// Determine content type from extension
		const ext = key.split('.').pop()?.toLowerCase();
		let contentType = 'application/octet-stream';
		if (ext === 'txt') contentType = 'text/plain';
		else if (ext === 'md') contentType = 'text/markdown';
		else if (ext === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
		else if (ext === 'doc') contentType = 'application/msword';
		else if (ext === 'epub') contentType = 'application/epub+zip';
		else if (ext === 'pdf') contentType = 'application/pdf';
		else if (ext === 'mobi') contentType = 'application/x-mobipocket-ebook';
		else if (ext === 'azw3') contentType = 'application/vnd.amazon.ebook';
		// Image types
		else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
		else if (ext === 'png') contentType = 'image/png';
		else if (ext === 'gif') contentType = 'image/gif';
		else if (ext === 'webp') contentType = 'image/webp';
		
		return new NextResponse(buffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `inline; filename="${key.split('/').pop()}"`,
				'Access-Control-Allow-Origin': '*', // Allow CORS for EPUB.js
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	} catch (err: any) {
		return NextResponse.json({ error: '文件不存在' }, { status: 404 });
	}
}

