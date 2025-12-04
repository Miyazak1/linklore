import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/admin';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/api/pagination';

/**
 * 获取用户列表（管理员）
 */
export async function GET(req: Request) {
	try {
		await requireAdmin();

		const { searchParams } = new URL(req.url);
		const pagination = parsePaginationParams(searchParams);
		const search = searchParams.get('search') || '';
		const roleFilter = searchParams.get('role') || '';

		// 构建查询条件
		const where: any = {};
		if (search) {
			where.OR = [
				{ email: { contains: search, mode: 'insensitive' } },
				{ name: { contains: search, mode: 'insensitive' } }
			];
		}
		if (roleFilter) {
			where.role = roleFilter;
		}

		// 获取总数
		const total = await prisma.user.count({ where });

		// 获取用户列表
		const users = await prisma.user.findMany({
			where,
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true,
				_count: {
					select: {
						topics: true,
						documents: true
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
			users,
			total,
			pagination.page,
			pagination.pageSize
		);

		return NextResponse.json(createSuccessResponse(paginated));
	} catch (err: any) {
		const { response, status } = handleError(err, 'GET /api/admin/users');
		return NextResponse.json(response, { status });
	}
}

