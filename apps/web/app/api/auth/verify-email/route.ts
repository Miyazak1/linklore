import { NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/auth/emailVerification';
import { createSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('VerifyEmail API');

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const token = searchParams.get('token');

		if (!token) {
			return NextResponse.redirect(new URL('/signin?error=missing_token', req.url));
		}

		const result = await verifyEmailToken(token);
		if (!result.success) {
			return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(result.error || '验证失败')}`, req.url));
		}

		// 获取用户信息并创建session
		const user = await prisma.user.findUnique({
			where: { id: result.userId },
			select: { id: true, email: true, role: true }
		});

		if (!user) {
			return NextResponse.redirect(new URL('/signin?error=user_not_found', req.url));
		}

		// 创建session
		await createSession({ sub: user.id, email: user.email, role: user.role });

		// 重定向到首页，显示成功消息
		return NextResponse.redirect(new URL('/?verified=true', req.url));
	} catch (err: any) {
		log.error('验证邮箱失败', err as Error);
		return NextResponse.redirect(new URL('/signin?error=verification_failed', req.url));
	}
}






