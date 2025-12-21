import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { compare } from 'bcryptjs';
import { createSession, clearSession } from '@/lib/auth/session';
import { logAudit } from '@/lib/audit/logger';

const SigninSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(100)
});

export async function POST(req: Request) {
	try {
		const json = await req.json();
		const { email, password } = SigninSchema.parse(json);
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


