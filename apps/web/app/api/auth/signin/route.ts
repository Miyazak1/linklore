import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { compare } from 'bcryptjs';
import { createSession, clearSession } from '@/lib/auth/session';
import { logAudit } from '@/lib/audit/logger';
import { associateGuestData, isGuestUser } from '@/lib/auth/guest';

const SigninSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(100),
	guestUserId: z.string().optional() // 匿名用户ID（用于关联数据）
});

export async function POST(req: Request) {
	try {
		const json = await req.json();
		const { email, password, guestUserId } = SigninSchema.parse(json);
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) return NextResponse.json({ error: '邮箱或密码错误' }, { status: 400 });
		const ok = await compare(password, user.passwordHash);
		if (!ok) {
			await logAudit({
				action: 'user.login',
				userId: user.id,
				metadata: { email, success: false, reason: 'invalid_password' },
				ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
				userAgent: req.headers.get('user-agent') || undefined,
			});
			return NextResponse.json({ error: '邮箱或密码错误' }, { status: 400 });
		}

		// 如果提供了 guestUserId，关联匿名用户数据
		if (guestUserId) {
			try {
				// 验证 guestUserId 是否是有效的匿名用户
				const guestUser = await prisma.user.findUnique({
					where: { id: guestUserId },
					select: { email: true }
				});

				if (guestUser && isGuestUser(guestUser)) {
					// 关联匿名用户数据到登录用户
					await associateGuestData(guestUserId, user.id);
					console.log(`[Signin] Associated guest data from ${guestUserId} to ${user.id}`);
				}
			} catch (associateErr: any) {
				// 关联失败不影响登录，只记录日志
				console.warn('[Signin] Failed to associate guest data:', associateErr.message);
			}
		}

		// 清除旧的 session（可能是匿名用户的）
		await clearSession();
		
		// 创建新用户的 session
		await createSession({ sub: user.id, email: user.email, role: user.role });
		
		await logAudit({
			action: 'user.login',
			userId: user.id,
			metadata: { email, success: true },
			ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
			userAgent: req.headers.get('user-agent') || undefined,
		});
		return NextResponse.json({ ok: true });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '登录失败' }, { status: 400 });
	}
}


