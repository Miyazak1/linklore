import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { getTrace, updateTrace, deleteTrace, type UpdateTraceData } from '@/lib/processing/traceOperations';
import { TraceSchema } from '@/lib/validation/traceValidation';

/**
 * 获取溯源详情
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		const userId = session?.sub ? String(session.sub) : undefined;
		const { id } = await params;

		const trace = await getTrace(id, userId);

		return NextResponse.json(createSuccessResponse(trace));
	} catch (err: any) {
		const { response, status } = handleError(err, 'GET /api/traces/[id]');
		return NextResponse.json(response, { status });
	}
}

/**
 * 更新溯源
 */
export async function PUT(
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

		const { id } = await params;
		const body = await req.json();

		// 部分验证（只验证提供的字段）
		const updateData: UpdateTraceData = {};
		if (body.title !== undefined) updateData.title = body.title;
		if (body.traceType !== undefined) updateData.traceType = body.traceType;
		if (body.target !== undefined) updateData.target = body.target;
		if (body.body !== undefined) updateData.body = body.body;
		if (body.citations !== undefined) updateData.citations = body.citations;
		if (body.version !== undefined) updateData.version = body.version;

		const updated = await updateTrace(id, updateData, String(session.sub));

		return NextResponse.json(createSuccessResponse(updated));
	} catch (err: any) {
		// 检查是否是冲突错误
		if (err.code === 'CONFLICT' || err.statusCode === 409) {
			return NextResponse.json(
				createErrorResponse('CONFLICT', err.message || '检测到编辑冲突，请刷新页面后重试', 409).response,
				{ status: 409 }
			);
		}
		const { response, status } = handleError(err, 'PUT /api/traces/[id]');
		return NextResponse.json(response, { status });
	}
}

/**
 * 删除溯源
 */
export async function DELETE(
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

		const { id } = await params;

		await deleteTrace(id, String(session.sub));

		return NextResponse.json(createSuccessResponse({ deleted: true }));
	} catch (err: any) {
		const { response, status } = handleError(err, 'DELETE /api/traces/[id]');
		return NextResponse.json(response, { status });
	}
}

