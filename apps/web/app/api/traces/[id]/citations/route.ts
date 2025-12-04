import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { checkTraceOwnership } from '@/lib/auth/permissions';
import {
	insertCitation,
	updateCitation,
	deleteCitation,
	type CitationData
} from '@/lib/processing/citationManager';
import { CitationSchema, validateCitationUrl } from '@/lib/validation/traceValidation';

/**
 * 获取引用列表
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;

		const citations = await prisma.citation.findMany({
			where: { traceId: id },
			orderBy: { order: 'asc' }
		});

		return NextResponse.json(createSuccessResponse(citations));
	} catch (err: any) {
		const { response, status } = handleError(err, 'GET /api/traces/[id]/citations');
		return NextResponse.json(response, { status });
	}
}

/**
 * 添加引用
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

		// 检查权限
		const trace = await prisma.trace.findUnique({
			where: { id },
			select: { editorId: true }
		});

		if (!trace) {
			return NextResponse.json(
				createErrorResponse('NOT_FOUND', '溯源不存在', 404).response,
				{ status: 404 }
			);
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { role: true }
		});

		if (!checkTraceOwnership(id, userId, user?.role || 'member')) {
			return NextResponse.json(
				createErrorResponse('PERMISSION_DENIED', '无权限修改此溯源', 403).response,
				{ status: 403 }
			);
		}

		const body = await req.json();
		const validated = CitationSchema.parse(body);

		// 验证URL
		if (validated.url) {
			const urlValidation = validateCitationUrl(validated.url);
			if (!urlValidation.valid) {
				return NextResponse.json(
					createErrorResponse('VALIDATION_ERROR', urlValidation.error || 'URL无效', 400).response,
					{ status: 400 }
				);
			}
		}

		const citation = await insertCitation(id, validated as CitationData, body.position);

		return NextResponse.json(createSuccessResponse(citation), { status: 201 });
	} catch (err: any) {
		const { response, status } = handleError(err, 'POST /api/traces/[id]/citations');
		return NextResponse.json(response, { status });
	}
}

/**
 * 更新引用
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

		const userId = String(session.sub);
		const { id: traceId } = await params;
		const { citationId, ...data } = await req.json();

		if (!citationId) {
			return NextResponse.json(
				createErrorResponse('VALIDATION_ERROR', '缺少citationId', 400).response,
				{ status: 400 }
			);
		}

		// 检查权限
		const trace = await prisma.trace.findUnique({
			where: { id: traceId },
			select: { editorId: true }
		});

		if (!trace) {
			return NextResponse.json(
				createErrorResponse('NOT_FOUND', '溯源不存在', 404).response,
				{ status: 404 }
			);
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { role: true }
		});

		if (!checkTraceOwnership(traceId, userId, user?.role || 'member')) {
			return NextResponse.json(
				createErrorResponse('PERMISSION_DENIED', '无权限修改此溯源', 403).response,
				{ status: 403 }
			);
		}

		// 验证URL（如果提供）
		if (data.url) {
			const urlValidation = validateCitationUrl(data.url);
			if (!urlValidation.valid) {
				return NextResponse.json(
					createErrorResponse('VALIDATION_ERROR', urlValidation.error || 'URL无效', 400).response,
					{ status: 400 }
				);
			}
		}

		const updated = await updateCitation(citationId, data);

		return NextResponse.json(createSuccessResponse(updated));
	} catch (err: any) {
		const { response, status } = handleError(err, 'PUT /api/traces/[id]/citations');
		return NextResponse.json(response, { status });
	}
}

/**
 * 删除引用
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

		const userId = String(session.sub);
		const { id: traceId } = await params;
		const { searchParams } = new URL(req.url);
		const citationId = searchParams.get('citationId');

		if (!citationId) {
			return NextResponse.json(
				createErrorResponse('VALIDATION_ERROR', '缺少citationId', 400).response,
				{ status: 400 }
			);
		}

		// 检查权限
		const trace = await prisma.trace.findUnique({
			where: { id: traceId },
			select: { editorId: true }
		});

		if (!trace) {
			return NextResponse.json(
				createErrorResponse('NOT_FOUND', '溯源不存在', 404).response,
				{ status: 404 }
			);
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { role: true }
		});

		if (!checkTraceOwnership(traceId, userId, user?.role || 'member')) {
			return NextResponse.json(
				createErrorResponse('PERMISSION_DENIED', '无权限修改此溯源', 403).response,
				{ status: 403 }
			);
		}

		await deleteCitation(citationId);

		return NextResponse.json(createSuccessResponse({ deleted: true }));
	} catch (err: any) {
		const { response, status } = handleError(err, 'DELETE /api/traces/[id]/citations');
		return NextResponse.json(response, { status });
	}
}

