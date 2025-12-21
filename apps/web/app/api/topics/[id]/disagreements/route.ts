import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const items = await prisma.disagreement.findMany({ 
			where: { 
				topicId: id,
				status: { not: 'invalid' } // 排除无效的分歧点
			}, 
			orderBy: { createdAt: 'desc' }
			// 可以添加 include 关联查询如果需要
		});
		return NextResponse.json({ items }, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error: any) {
		console.error('[Disagreements API] Error:', error);
		return NextResponse.json({ error: error.message || 'Failed to load disagreements' }, { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

// POST: 触发重新分析（异步）
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const { newDocumentId } = await req.json().catch(() => ({}));
		
		// 触发异步分析
		const { enqueueAnalyzeDisagreements } = await import('@/lib/queue/jobs');
		await enqueueAnalyzeDisagreements(id, newDocumentId);
		
		return NextResponse.json({ 
			message: '分歧分析已启动，请稍候查看结果' 
		}, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error: any) {
		console.error('[Disagreements API] Error:', error);
		return NextResponse.json({ error: error.message || 'Failed to trigger analysis' }, { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}


