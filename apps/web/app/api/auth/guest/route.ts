import { NextResponse } from 'next/server';
import { getOrCreateGuestUser } from '@/lib/auth/guest';
import { createSession } from '@/lib/auth/session';

/**
 * POST /api/auth/guest
 * 创建或获取匿名用户
 * 
 * 请求体（可选）：
 * {
 *   "guestUserId": "clxxx..." // 如果提供，尝试获取现有匿名用户
 * }
 */
export async function POST(req: Request) {
	try {
		const body = await req.json().catch(() => ({}));
		const { guestUserId } = body;

		// 创建或获取匿名用户
		const guestUser = await getOrCreateGuestUser(guestUserId);

		if (!guestUser) {
			return NextResponse.json(
				{ error: '无法创建匿名用户' },
				{ status: 500 }
			);
		}

		// 为匿名用户创建 session
		await createSession({
			sub: guestUser.id,
			email: guestUser.email,
			role: guestUser.role,
			isGuest: true // 标记为匿名用户
		});

		return NextResponse.json({
			ok: true,
			user: {
				id: guestUser.id,
				name: guestUser.name,
				email: guestUser.email,
				isGuest: true
			}
		});
	} catch (error: any) {
		console.error('[Guest API] Error:', error);
		return NextResponse.json(
			{ error: error.message || '创建匿名用户失败' },
			{ status: 500 }
		);
	}
}

