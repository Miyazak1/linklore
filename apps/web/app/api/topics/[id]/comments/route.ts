import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { parsePaginationParams, createPaginatedResponse } from '@/lib/api/pagination';
import { logError } from '@/lib/errors/logger';
import { z } from 'zod';

const CommentSchema = z.object({
	content: z.string().min(1).max(5000, '评论内容不能超过5000字符'),
	parentId: z.string().optional()
});

/**
 * 获取话题的所有评论（扁平列表，前端构建嵌套）
 * 权限：无需登录
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: topicId } = await params;

		// 验证话题是否存在
		const topic = await prisma.topic.findUnique({
			where: { id: topicId },
			select: { id: true }
		});

		if (!topic) {
			return NextResponse.json(createErrorResponse('话题不存在'), { status: 404 });
		}

		const { searchParams } = new URL(req.url);
		const pagination = parsePaginationParams(searchParams);
		const sortBy = searchParams.get('sortBy') || 'createdAt';
		const sortOrder = searchParams.get('sortOrder') || 'asc';

		// 获取所有评论（扁平列表，不包含已删除的）
		// 先按创建时间排序，用于计算楼层号
		const allComments = await prisma.topicComment.findMany({
			where: {
				topicId,
				deletedAt: null
			},
			select: {
				id: true,
				parentId: true,
				authorId: true,
				author: {
					select: {
						id: true,
						email: true,
						name: true,
						avatarUrl: true
					}
				},
				content: true,
				depth: true,
				createdAt: true,
				updatedAt: true
			},
			orderBy: {
				createdAt: 'asc' // 按创建时间排序，用于计算楼层号
			}
		});

		// 计算楼层号（按创建时间顺序）
		const floorMap = new Map<string, number>();
		allComments.forEach((comment, index) => {
			floorMap.set(comment.id, index + 1);
		});

		// 添加楼层号到评论数据
		const commentsWithFloor = allComments.map(comment => ({
			...comment,
			floor: floorMap.get(comment.id) || 0
		}));

		// 应用分页和排序
		const sortedComments = [...commentsWithFloor].sort((a, b) => {
			if (sortBy === 'createdAt') {
				const aVal = new Date(a.createdAt).getTime();
				const bVal = new Date(b.createdAt).getTime();
				return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
			}
			const aVal = a[sortBy as keyof typeof a];
			const bVal = b[sortBy as keyof typeof b];
			if (sortOrder === 'desc') {
				return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
			}
			return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
		});

		const paginatedComments = sortedComments.slice(
			(pagination.page - 1) * pagination.pageSize,
			(pagination.page - 1) * pagination.pageSize + pagination.pageSize
		);

		// 获取总数
		const total = allComments.length;

		const paginated = {
			data: paginatedComments,
			total,
			page: pagination.page,
			pageSize: pagination.pageSize,
			totalPages: Math.ceil(total / pagination.pageSize)
		};

		return NextResponse.json(createSuccessResponse(paginated));
	} catch (err: any) {
		logError(err, { context: 'GET /api/topics/[id]/comments' });
		const { response, status } = handleError(err, 'GET /api/topics/[id]/comments');
		return NextResponse.json(response, { status });
	}
}

/**
 * 创建评论
 * 权限：需要登录
 */
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: topicId } = await params;

		// 检查登录
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json(createErrorResponse('需要登录'), { status: 401 });
		}

		const userId = String(session.sub);

		// 验证话题是否存在
		const topic = await prisma.topic.findUnique({
			where: { id: topicId },
			select: { id: true }
		});

		if (!topic) {
			return NextResponse.json(createErrorResponse('话题不存在'), { status: 404 });
		}

		// 解析和验证请求体
		const body = await req.json();
		const validated = CommentSchema.parse(body);

		// 计算深度（不做限制）
		let depth = 0;
		if (validated.parentId) {
			const parent = await prisma.topicComment.findUnique({
				where: { id: validated.parentId },
				select: { depth: true, topicId: true }
			});

			if (!parent) {
				return NextResponse.json(createErrorResponse('父评论不存在'), { status: 404 });
			}

			if (parent.topicId !== topicId) {
				return NextResponse.json(createErrorResponse('父评论不属于该话题'), { status: 400 });
			}

			depth = parent.depth + 1;
		}

		// 创建评论
		const comment = await prisma.topicComment.create({
			data: {
				topicId,
				parentId: validated.parentId || null,
				authorId: userId,
				content: validated.content,
				depth
			},
			include: {
				author: {
					select: {
						id: true,
						email: true,
						name: true
					}
				}
			}
		});

		// 更新话题的评论计数
		await prisma.topic.update({
			where: { id: topicId },
			data: {
				commentCount: {
					increment: 1
				}
			}
		});

		return NextResponse.json(createSuccessResponse(comment), { status: 201 });
	} catch (err: any) {
		if (err instanceof z.ZodError) {
			return NextResponse.json(
				createErrorResponse(err.errors[0]?.message || '请求参数错误'),
				{ status: 400 }
			);
		}

		logError(err, { context: 'POST /api/topics/[id]/comments' });
		const { response, status } = handleError(err, 'POST /api/topics/[id]/comments');
		return NextResponse.json(response, { status });
	}
}

