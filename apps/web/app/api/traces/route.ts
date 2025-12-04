import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { requireEditor } from '@/lib/auth/permissions';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/api/pagination';
import { createTrace, type CreateTraceData } from '@/lib/processing/traceOperations';
import { TraceSchema } from '@/lib/validation/traceValidation';
import { logError } from '@/lib/errors/logger';

/**
 * 获取溯源列表（编辑）
 */
export async function GET(req: Request) {
	let editor: any = null;
	try {
		editor = await requireEditor();

		const { searchParams } = new URL(req.url);
		const pagination = parsePaginationParams(searchParams);
		const search = searchParams.get('search') || '';
		const statusFilter = searchParams.get('status') || '';
		const typeFilter = searchParams.get('type') || '';

		// 构建查询条件
		const where: any = {
			editorId: editor.id // 只能看到自己创建的溯源
		};

		if (search) {
			where.OR = [
				{ title: { contains: search, mode: 'insensitive' } },
				{ target: { contains: search, mode: 'insensitive' } }
			];
		}
		if (statusFilter) {
			where.status = statusFilter;
		}
		if (typeFilter) {
			where.traceType = typeFilter;
		}

		// 获取总数
		const total = await prisma.trace.count({ where });

		// 获取溯源列表
		const traces = await prisma.trace.findMany({
			where,
			select: {
				id: true,
				title: true,
				traceType: true,
				target: true,
				status: true,
				version: true,
				publishedAt: true,
				analyzedAt: true,
				approvedAt: true,
				createdAt: true,
				updatedAt: true,
				analysis: {
					select: {
						credibilityScore: true,
						canApprove: true
					}
				},
				entry: {
					select: {
						id: true,
						slug: true,
						title: true
					}
				}
			},
			orderBy: pagination.sortBy
				? { [pagination.sortBy]: pagination.sortOrder }
				: { createdAt: 'desc' },
			skip: (pagination.page - 1) * pagination.pageSize,
			take: pagination.pageSize
		});

		const paginated = createPaginatedResponse(
			traces,
			total,
			pagination.page,
			pagination.pageSize
		);

		return NextResponse.json(createSuccessResponse(paginated));
	} catch (err: any) {
		logError(err, { context: 'GET /api/traces', userId: editor?.id });
		const { response, status } = handleError(err, 'GET /api/traces');
		return NextResponse.json(response, { status });
	}
}

/**
 * 创建溯源（编辑）
 */
export async function POST(req: Request) {
	let editor: any = null;
	try {
		editor = await requireEditor();

		const body = await req.json();
		const validated = TraceSchema.parse(body);

		const trace = await createTrace(validated as CreateTraceData, editor.id);

		return NextResponse.json(createSuccessResponse(trace), { status: 201 });
	} catch (err: any) {
		logError(err, { context: 'POST /api/traces', userId: editor?.id });
		const { response, status } = handleError(err, 'POST /api/traces');
		return NextResponse.json(response, { status });
	}
}

