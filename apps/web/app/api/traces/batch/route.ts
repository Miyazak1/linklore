import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { checkTraceOwnership } from '@/lib/auth/permissions';
import { deleteTrace } from '@/lib/processing/traceOperations';
import { updateTraceStatus } from '@/lib/processing/traceStateMachine';

const BatchOperationSchema = z.object({
	operation: z.enum(['delete', 'publish', 'archive']),
	traceIds: z.array(z.string()).min(1)
});

/**
 * 批量操作溯源
 */
export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json(
				createErrorResponse('UNAUTHORIZED', '未登录', 401).response,
				{ status: 401 }
			);
		}

		const userId = String(session.sub);
		const { operation, traceIds } = BatchOperationSchema.parse(await req.json());

		// 检查权限
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { role: true }
		});

		const results: Array<{ traceId: string; success: boolean; error?: string }> = [];

		for (const traceId of traceIds) {
			try {
				// 检查所有权
				const trace = await prisma.trace.findUnique({
					where: { id: traceId },
					select: { editorId: true, status: true }
				});

				if (!trace) {
					results.push({ traceId, success: false, error: '溯源不存在' });
					continue;
				}

				if (!checkTraceOwnership(traceId, userId, user?.role || 'member')) {
					results.push({ traceId, success: false, error: '无权限' });
					continue;
				}

				// 执行操作
				switch (operation) {
					case 'delete':
						await deleteTrace(traceId, userId);
						break;
					case 'publish':
						if (trace.status !== 'DRAFT') {
							results.push({ traceId, success: false, error: '只能发布草稿状态的溯源' });
							continue;
						}
						await updateTraceStatus(traceId, 'PUBLISHED', userId);
						break;
					case 'archive':
						// 归档操作（可以添加archive状态或标记）
						// 暂时不支持，可以后续实现
						results.push({ traceId, success: false, error: '归档功能暂未实现' });
						continue;
				}

				results.push({ traceId, success: true });
			} catch (err: any) {
				results.push({ traceId, success: false, error: err.message });
			}
		}

		const successCount = results.filter((r) => r.success).length;
		const failCount = results.filter((r) => !r.success).length;

		return NextResponse.json(
			createSuccessResponse({
				results,
				summary: {
					total: traceIds.length,
					success: successCount,
					failed: failCount
				}
			})
		);
	} catch (err: any) {
		const { response, status } = handleError(err, 'POST /api/traces/batch');
		return NextResponse.json(response, { status });
	}
}

