/**
 * 检查当前登录状态和会话信息的调试端点
 * GET /api/auth/check
 */
import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('Auth Check API');

export async function GET() {
	try {
		const session = await readSession();

		if (!session?.sub) {
			return NextResponse.json({
				loggedIn: false,
				message: '未登录或会话已过期',
				session: null,
				user: null
			});
		}

		// 从数据库获取用户详细信息
		const user = await prisma.user.findUnique({
			where: { id: String(session.sub) },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true,
				avatarUrl: true
			}
		});

		// 检查会话是否过期
		const now = Date.now() / 1000; // 转换为秒
		const isExpired = session.exp ? session.exp < now : false;
		const expiresAt = session.exp ? new Date(session.exp * 1000).toISOString() : null;
		const remainingSeconds = session.exp ? Math.max(0, session.exp - now) : null;

		return NextResponse.json({
			loggedIn: !isExpired && !!user,
			session: {
				userId: session.sub,
				email: session.email || null,
				role: session.role || null,
				issuedAt: session.iat ? new Date((session.iat as number) * 1000).toISOString() : null,
				expiresAt,
				isExpired,
				remainingSeconds: remainingSeconds ? Math.floor(remainingSeconds) : null
			},
			user: user ? {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				avatarUrl: (user as any).avatarUrl || null,
				createdAt: user.createdAt.toISOString(),
				isGuest: user.email.endsWith('@temp.local')
			} : null,
			message: isExpired ? '会话已过期' : user ? '已登录' : '会话中的用户不存在于数据库'
		});
	} catch (error: any) {
		log.error('检查会话时出错', error as Error);
		return NextResponse.json({
			loggedIn: false,
			error: error.message || '检查会话时出错',
			session: null,
			user: null
		}, { status: 500 });
	}
}





