import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';

/**
 * GET /api/topics/:id/documents/:docId/content
 * 按需加载文档内容（extractedText）
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string; docId: string }> }
) {
	try {
		const { id: topicId, docId } = await params;
		
		// 检查文档是否存在且属于该话题
		const doc = await prisma.document.findUnique({
			where: { id: docId },
			select: { 
				id: true,
				topicId: true,
				extractedText: true
			}
		});
		
		if (!doc) {
			return NextResponse.json({ error: '文档不存在' }, { status: 404 });
		}
		
		if (doc.topicId !== topicId) {
			return NextResponse.json({ error: '文档不属于该话题' }, { status: 403 });
		}
		
		if (!doc.extractedText) {
			return NextResponse.json({ 
				content: null,
				message: '文档内容尚未提取'
			});
		}
		
		const content = Buffer.from(doc.extractedText).toString('utf-8');
		
		return NextResponse.json({ 
			content,
			docId: doc.id
		});
	} catch (error: any) {
		console.error('[Document Content API] Error:', error);
		return NextResponse.json(
			{ error: error.message || '获取文档内容失败' },
			{ status: 500 }
		);
	}
}






