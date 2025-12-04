import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { enqueueUserPairAnalysis } from '@/lib/queue/jobs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST: 手动触发用户对分析
 * 用于测试或修复缺失的分析数据
 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id: topicId } = await params;
		
		// 验证话题是否存在
		const topic = await prisma.topic.findUnique({ where: { id: topicId } });
		if (!topic) {
			return NextResponse.json({ error: '话题不存在' }, { status: 404 });
		}

		// 检查是否有至少2个已评价的文档
		const docs = await prisma.document.findMany({
			where: { topicId },
			select: { 
				id: true, 
				authorId: true, 
				processingStatus: true 
			}
		});

		const evaluatedDocs = docs.filter(d => {
			const status = (d.processingStatus as any) || {};
			return status.evaluate === 'completed';
		});

		if (evaluatedDocs.length < 2) {
			return NextResponse.json({ 
				error: `需要至少2个已评价的文档，当前只有 ${evaluatedDocs.length} 个`,
				evaluatedCount: evaluatedDocs.length,
				totalCount: docs.length
			}, { status: 400 });
		}

		// 触发用户对分析（分析所有用户对）
		const job = await enqueueUserPairAnalysis(topicId);
		
		return NextResponse.json({ 
			message: '用户对分析已触发',
			jobId: job.id,
			jobName: job.name,
			evaluatedDocs: evaluatedDocs.length,
			totalDocs: docs.length
		}, {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error: any) {
		console.error('[Trigger User Pair Analysis] Error:', error);
		return NextResponse.json({ error: error.message || '触发分析失败' }, { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

