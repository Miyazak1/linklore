import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
	name: z.string().max(100).optional(),
	// avatarUrl 可以是：完整 URL、相对路径（/开头）、空字符串或 null
	avatarUrl: z.union([
		z.string(), // 任何字符串（包括完整 URL 和相对路径）
		z.null(), // null
		z.literal('') // 空字符串
	]).optional(),
});

/**
 * GET /api/user/profile
 * 获取当前用户资料
 */
export async function GET() {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		let user;
		try {
			user = await prisma.user.findUnique({
				where: { id: String(session.sub) },
				select: {
					id: true,
					email: true,
					name: true,
					avatarUrl: true,
					role: true,
					createdAt: true
				}
			});
		} catch (selectError: any) {
			// 如果 avatarUrl 字段不存在，回退到基本字段
			console.warn('[User Profile API] Avatar field not available:', selectError.message);
			user = await prisma.user.findUnique({
				where: { id: String(session.sub) },
				select: {
					id: true,
					email: true,
					name: true,
					role: true,
					createdAt: true
				}
			});
		}

		if (!user) {
			return NextResponse.json({ error: '用户不存在' }, { status: 404 });
		}

		return NextResponse.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name || null,
				avatarUrl: (user as any).avatarUrl || null,
				role: user.role,
				createdAt: user.createdAt
			}
		});
	} catch (err: any) {
		console.error('[User Profile API] Error:', err);
		return NextResponse.json(
			{ error: err.message || '获取用户资料失败' },
			{ status: 500 }
		);
	}
}

/**
 * PUT /api/user/profile
 * 更新当前用户资料
 */
export async function PUT(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const body = await req.json();
		const data = UpdateProfileSchema.parse(body);

		// 构建更新数据
		const updateData: any = {};
		if (data.name !== undefined) {
			// 空字符串转为 null，否则使用原值
			updateData.name = data.name === '' ? null : data.name;
		}
		if (data.avatarUrl !== undefined) {
			// 空字符串转为 null，否则使用原值
			updateData.avatarUrl = data.avatarUrl === '' ? null : data.avatarUrl;
		}

		// 更新用户信息
		let user;
		try {
			user = await prisma.user.update({
				where: { id: String(session.sub) },
				data: updateData,
				select: {
					id: true,
					email: true,
					name: true,
					avatarUrl: true,
					role: true
				}
			});
		} catch (updateError: any) {
			// 如果 avatarUrl 字段不存在，只更新基本字段
			if (updateData.avatarUrl !== undefined) {
				delete updateData.avatarUrl;
				user = await prisma.user.update({
					where: { id: String(session.sub) },
					data: updateData,
					select: {
						id: true,
						email: true,
						name: true,
						role: true
					}
				});
			} else {
				throw updateError;
			}
		}

		return NextResponse.json({
			message: '更新成功',
			user: {
				id: user.id,
				email: user.email,
				name: user.name || null,
				avatarUrl: (user as any).avatarUrl || null,
				role: user.role
			}
		});
	} catch (err: any) {
		if (err instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '数据验证失败', details: err.errors },
				{ status: 400 }
			);
		}
		console.error('[User Profile API] Error:', err);
		return NextResponse.json(
			{ error: err.message || '更新用户资料失败' },
			{ status: 500 }
		);
	}
}

