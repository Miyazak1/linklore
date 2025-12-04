import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/api/pagination';
import { logError } from '@/lib/errors/logger';

/**
 * 获取词条列表（公开）
 */
export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const pagination = parsePaginationParams(searchParams);
		const search = searchParams.get('search') || '';
		const typeFilter = searchParams.get('type') || '';

		// 构建查询条件
		const where: any = {};

		if (search) {
			where.OR = [
				{ title: { contains: search, mode: 'insensitive' } },
				{ slug: { contains: search, mode: 'insensitive' } }
			];
		}
		if (typeFilter) {
			where.traceType = typeFilter;
		}

		// 获取总数
		const total = await prisma.entry.count({ where });

		// 获取词条列表（不加载content大字段）
		const entries = await prisma.entry.findMany({
			where,
			select: {
				id: true,
				title: true,
				slug: true,
				traceType: true,
				version: true,
				needsUpdate: true,
				createdAt: true,
				updatedAt: true,
				lastReviewedAt: true,
				sourceTrace: {
					select: {
						id: true,
						title: true,
						editor: {
							select: {
								id: true,
								email: true,
								name: true
							}
						}
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
			entries,
			total,
			pagination.page,
			pagination.pageSize
		);

		return NextResponse.json(createSuccessResponse(paginated));
	} catch (err: any) {
		logError(err, { context: 'GET /api/entries' });
		const { response, status } = handleError(err, 'GET /api/entries');
		return NextResponse.json(response, { status });
	}
}

