import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/auth/admin';
import { collectMetrics } from '@/lib/monitoring/metrics';

/**
 * 获取系统监控指标（仅管理员）
 */
export async function GET() {
	try {
		const admin = await requireAdmin();

		const metrics = await collectMetrics();

		return NextResponse.json(createSuccessResponse(metrics));
	} catch (err: any) {
		const { response, status } = handleError(err, 'GET /api/metrics');
		return NextResponse.json(response, { status });
	}
}

