import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getOssClient, isLocalStorage } from '@/lib/storage/oss';
import { getFile } from '@/lib/storage/local';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const doc = await prisma.document.findUnique({ where: { id } });
		if (!doc) return NextResponse.json({ error: '文档不存在' }, { status: 404 });

		let buffer: Buffer;
		if (isLocalStorage()) {
			buffer = await getFile(doc.fileKey);
		} else {
			const client = getOssClient();
			const object = await client.get(doc.fileKey);
			if (!object.content) {
				return NextResponse.json({ error: '文件内容为空' }, { status: 404 });
			}
			buffer = Buffer.isBuffer(object.content) ? object.content : Buffer.from(object.content);
		}

		// Determine filename from fileKey
		const filename = doc.fileKey.split('/').pop() || `document-${doc.id}`;

		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				'Content-Type': doc.mime,
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '下载失败' }, { status: 500 });
	}
}










