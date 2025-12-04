import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const doc = await prisma.document.findUnique({ 
			where: { id },
			select: { extractedText: true }
		});
		
		if (!doc) {
			return NextResponse.json({ error: '文档不存在' }, { status: 404 });
		}

		if (!doc.extractedText) {
			return NextResponse.json({ html: null }, {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const html = Buffer.from(doc.extractedText).toString('utf-8');

		return NextResponse.json({ html }, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[Document Content] Error:', err);
		return NextResponse.json({ error: err.message || '获取文档内容失败' }, { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}



