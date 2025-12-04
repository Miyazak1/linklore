import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { updateTraceStatus } from '@/lib/processing/traceStateMachine';
import { validateTraceForPublish } from '@/lib/validation/traceValidation';
import { enqueueTraceAnalysis } from '@/lib/queue/jobs';
import { checkRateLimit } from '@/lib/rate-limit/rateLimit';
import { TRACE_PROCESSING_CONFIG } from '@/lib/config/trace-processing';
import { logAudit } from '@/lib/audit/logger';

/**
 * 发布溯源（提交AI分析）
 */
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json(
				createErrorResponse('UNAUTHORIZED', '未登录', 401).response,
				{ status: 401 }
			);
		}

		const userId = String(session.sub);
		const { id } = await params;

		// 限流检查
		const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
		const rateLimitKey = `trace:publish:${userId}:${Math.floor(Date.now() / 3600000)}`;
		const rateLimitResult = await checkRateLimit(
			rateLimitKey,
			TRACE_PROCESSING_CONFIG.RATE_LIMITS.PUBLISH_PER_HOUR,
			3600
		);

		if (!rateLimitResult.allowed) {
			return NextResponse.json(
				createErrorResponse(
					'RATE_LIMIT_EXCEEDED',
					`发布频率过高，每小时最多发布${TRACE_PROCESSING_CONFIG.RATE_LIMITS.PUBLISH_PER_HOUR}次`,
					429
				).response,
				{ status: 429 }
			);
		}

		// 获取溯源
		const trace = await prisma.trace.findUnique({
			where: { id },
			include: {
				citationsList: {
					orderBy: { order: 'asc' }
				}
			}
		});

		if (!trace) {
			return NextResponse.json(
				createErrorResponse('NOT_FOUND', '溯源不存在', 404).response,
				{ status: 404 }
			);
		}

		// 检查权限
		if (trace.editorId !== userId) {
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { role: true }
			});

			if (user?.role !== 'admin') {
				return NextResponse.json(
					createErrorResponse('PERMISSION_DENIED', '无权限发布此溯源', 403).response,
					{ status: 403 }
				);
			}
		}

		// 验证溯源内容
		const validation = validateTraceForPublish({
			body: trace.body,
			citations: trace.citationsList.map((c) => ({
				url: c.url || undefined,
				title: c.title,
				author: c.author || undefined,
				publisher: c.publisher || undefined,
				year: c.year || undefined,
				type: c.type as any,
				quote: c.quote || undefined,
				page: c.page || undefined,
				order: c.order
			}))
		});

		if (!validation.valid) {
			return NextResponse.json(
				createErrorResponse(
					'VALIDATION_ERROR',
					`验证失败：${validation.errors.join(', ')}`,
					400,
					validation.errors
				).response,
				{ status: 400 }
			);
		}

		// 更新状态为PUBLISHED
		await updateTraceStatus(id, 'PUBLISHED', userId);

		// 入队AI分析
		await enqueueTraceAnalysis(id);

		// 记录审计日志
		await logAudit({
			userId,
			action: 'trace.publish',
			resourceType: 'trace',
			resourceId: id,
			metadata: { title: trace.title }
		});

		return NextResponse.json(
			createSuccessResponse({
				message: '溯源已发布，AI分析已开始',
				traceId: id
			})
		);
	} catch (err: any) {
		const { response, status } = handleError(err, 'POST /api/traces/[id]/publish');
		return NextResponse.json(response, { status });
	}
}

