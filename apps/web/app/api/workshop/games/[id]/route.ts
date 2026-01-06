import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';

/**
 * GET /api/workshop/games/[id]
 * 获取游戏详情
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const session = await readSession();

		const game = await prisma.gameInstance.findUnique({
			where: { id },
			include: {
				author: {
					select: {
						email: true,
						name: true,
						avatarUrl: true
					}
				},
				_count: {
					select: {
						plays: true
					}
				}
			}
		});

		if (!game) {
			return NextResponse.json(
				{ success: false, error: '游戏不存在' },
				{ status: 404 }
			);
		}

		// 检查权限：只有作者或公开的游戏可以查看
		const isAuthor = session?.sub && game.authorId === String(session.sub);
		if (!isAuthor && (!game.isPublic || game.status !== 'published')) {
			return NextResponse.json(
				{ success: false, error: '无权访问此游戏' },
				{ status: 403 }
			);
		}

		return NextResponse.json({
			success: true,
			game: {
				...game,
				createdAt: game.createdAt.toISOString(),
				updatedAt: game.updatedAt.toISOString()
			}
		});
	} catch (err: any) {
		console.error('[Workshop Game API] Error:', err);
		return NextResponse.json(
			{ success: false, error: err.message || '获取游戏详情失败' },
			{ status: 500 }
		);
	}
}

/**
 * PUT /api/workshop/games/[id]
 * 更新游戏
 */
export async function PUT(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json(
				{ success: false, error: '未登录' },
				{ status: 401 }
			);
		}

		const { id } = await params;
		const body = await req.json();

		// 检查游戏是否存在及权限
		const existing = await prisma.gameInstance.findUnique({
			where: { id }
		});

		if (!existing) {
			return NextResponse.json(
				{ success: false, error: '游戏不存在' },
				{ status: 404 }
			);
		}

		if (existing.authorId !== String(session.sub)) {
			return NextResponse.json(
				{ success: false, error: '无权修改此游戏' },
				{ status: 403 }
			);
		}

		const { title, description, coverUrl, tags, modules, questions, status, isPublic, difficulty } = body;

		const updateData: any = {};
		if (title !== undefined) updateData.title = title.trim();
		if (description !== undefined) updateData.description = description?.trim() || null;
		if (coverUrl !== undefined) updateData.coverUrl = coverUrl || null;
		if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
		if (modules !== undefined) updateData.modules = modules;
		if (questions !== undefined) updateData.questions = questions;
		if (status !== undefined) updateData.status = status;
		if (isPublic !== undefined) updateData.isPublic = isPublic;
		if (difficulty !== undefined) updateData.difficulty = difficulty || null;

		const game = await prisma.gameInstance.update({
			where: { id },
			data: updateData,
			include: {
				author: {
					select: {
						email: true,
						name: true,
						avatarUrl: true
					}
				}
			}
		});

		return NextResponse.json({
			success: true,
			game: {
				...game,
				createdAt: game.createdAt.toISOString(),
				updatedAt: game.updatedAt.toISOString()
			}
		});
	} catch (err: any) {
		console.error('[Workshop Game API] Error:', err);
		return NextResponse.json(
			{ success: false, error: err.message || '更新游戏失败' },
			{ status: 500 }
		);
	}
}

/**
 * DELETE /api/workshop/games/[id]
 * 删除游戏
 */
export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json(
				{ success: false, error: '未登录' },
				{ status: 401 }
			);
		}

		const { id } = await params;

		const existing = await prisma.gameInstance.findUnique({
			where: { id }
		});

		if (!existing) {
			return NextResponse.json(
				{ success: false, error: '游戏不存在' },
				{ status: 404 }
			);
		}

		if (existing.authorId !== String(session.sub)) {
			return NextResponse.json(
				{ success: false, error: '无权删除此游戏' },
				{ status: 403 }
			);
		}

		await prisma.gameInstance.delete({
			where: { id }
		});

		return NextResponse.json({
			success: true,
			message: '删除成功'
		});
	} catch (err: any) {
		console.error('[Workshop Game API] Error:', err);
		return NextResponse.json(
			{ success: false, error: err.message || '删除游戏失败' },
			{ status: 500 }
		);
	}
}



