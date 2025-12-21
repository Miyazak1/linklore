import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';
import { createSuccessResponse, createErrorResponse, handleError } from '@/lib/api/response';
import { logError } from '@/lib/errors/logger';
import { z } from 'zod';

const UpdateCommentSchema = z.object({
	content: z.string().min(1).max(5000, '评论内容不能超过5000字符')
});

/**
 * 更新评论
 * 权限：需要登录，且必须是评论作者
 */
export async function PUT(
	req: Request,
	{ params }: { params: Promise<{ id: string; commentId: string }> }
) {
	try {
		const { id: topicId, commentId } = await params;

		// 检查登录
		const session = await readSession();
		if (!session?.sub) {
			const { response, status } = createErrorResponse('UNAUTHORIZED', '需要登录', 401);
			return NextResponse.json(response, { status });
		}

		const userId = String(session.sub);

		// 获取评论
		const comment = await prisma.topicComment.findUnique({
			where: { id: commentId },
			select: {
				id: true,
				topicId: true,
				authorId: true,
				deletedAt: true
			}
		});

		if (!comment) {
			const { response, status } = createErrorResponse('NOT_FOUND', '评论不存在', 404);
			return NextResponse.json(response, { status });
		}

		if (comment.topicId !== topicId) {
			const { response, status } = createErrorResponse('BAD_REQUEST', '评论不属于该话题', 400);
			return NextResponse.json(response, { status });
		}

		if (comment.deletedAt) {
			const { response, status } = createErrorResponse('BAD_REQUEST', '评论已删除', 400);
			return NextResponse.json(response, { status });
		}

		// 检查权限：必须是评论作者
		if (comment.authorId !== userId) {
			const { response, status } = createErrorResponse('FORBIDDEN', '无权编辑此评论', 403);
			return NextResponse.json(response, { status });
		}

		// 解析和验证请求体
		const body = await req.json();
		const validated = UpdateCommentSchema.parse(body);

		// 更新评论
		const updated = await prisma.topicComment.update({
			where: { id: commentId },
			data: {
				content: validated.content
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

		return NextResponse.json(createSuccessResponse(updated));
	} catch (err: any) {
		if (err instanceof z.ZodError) {
			const { response, status } = createErrorResponse('VALIDATION_ERROR', err.errors[0]?.message || '请求参数错误', 400);
			return NextResponse.json(response, { status });
		}

		logError(err, { context: 'PUT /api/topics/[id]/comments/[commentId]' });
		const { response, status } = handleError(err, 'PUT /api/topics/[id]/comments/[commentId]');
		return NextResponse.json(response, { status });
	}
}

/**
 * 软删除评论
 * 权限：需要登录，且必须是评论作者或话题作者
 */
export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string; commentId: string }> }
) {
	try {
		const { id: topicId, commentId } = await params;

		// 检查登录
		const session = await readSession();
		if (!session?.sub) {
			const { response, status } = createErrorResponse('UNAUTHORIZED', '需要登录', 401);
			return NextResponse.json(response, { status });
		}

		const userId = String(session.sub);

		// 获取评论和话题
		const comment = await prisma.topicComment.findUnique({
			where: { id: commentId },
			include: {
				topic: {
					select: {
						id: true,
						authorId: true
					}
				}
			}
		});

		if (!comment) {
			const { response, status } = createErrorResponse('NOT_FOUND', '评论不存在', 404);
			return NextResponse.json(response, { status });
		}

		if (comment.topicId !== topicId) {
			const { response, status } = createErrorResponse('BAD_REQUEST', '评论不属于该话题', 400);
			return NextResponse.json(response, { status });
		}

		if (comment.deletedAt) {
			const { response, status } = createErrorResponse('BAD_REQUEST', '评论已删除', 400);
			return NextResponse.json(response, { status });
		}

		// 检查权限：必须是评论作者或话题作者
		const isCommentAuthor = comment.authorId === userId;
		const isTopicAuthor = comment.topic.authorId === userId;

		if (!isCommentAuthor && !isTopicAuthor) {
			const { response, status } = createErrorResponse('FORBIDDEN', '无权删除此评论', 403);
			return NextResponse.json(response, { status });
		}

		// 软删除评论
		await prisma.topicComment.update({
			where: { id: commentId },
			data: {
				deletedAt: new Date()
			}
		});

		// 更新话题的评论计数
		await prisma.topic.update({
			where: { id: topicId },
			data: {
				commentCount: {
					decrement: 1
				}
			}
		});

		return NextResponse.json(createSuccessResponse({ deleted: true }));
	} catch (err: any) {
		logError(err, { context: 'DELETE /api/topics/[id]/comments/[commentId]' });
		const { response, status } = handleError(err, 'DELETE /api/topics/[id]/comments/[commentId]');
		return NextResponse.json(response, { status });
	}
}

