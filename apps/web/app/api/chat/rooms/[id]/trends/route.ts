import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { requireRoomAccess } from '@/lib/security/roomAccess';
import { chatDb } from '@/lib/modules/chat/db';

/**
 * GET /api/chat/rooms/:id/trends
 * 获取房间的趋势数据
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const { id: roomId } = await params;

		// 检查访问权限
		await requireRoomAccess(roomId, session.sub);

		// 获取分析记录
		const analysis = await chatDb.analysis.findUnique({
			where: { roomId },
			select: {
				consensusTrend: true,
				divergenceTrend: true,
				lastAnalyzedAt: true
			}
		});

		if (!analysis) {
			return NextResponse.json({
				consensusTrend: [],
				divergenceTrend: []
			});
		}

		return NextResponse.json({
			consensusTrend: analysis.consensusTrend,
			divergenceTrend: analysis.divergenceTrend,
			lastAnalyzedAt: analysis.lastAnalyzedAt
		});
	} catch (error: any) {
		console.error('[Chat Trends API] Error:', error);
		if (
			error.message === '房间不存在' ||
			error.message === '无权访问此房间'
		) {
			return NextResponse.json({ error: error.message }, { status: 403 });
		}
		return NextResponse.json(
			{ error: error.message || '获取趋势数据失败' },
			{ status: 500 }
		);
	}
}











