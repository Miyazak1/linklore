import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

export async function GET() {
	try {
		const session = await readSession();
		// 使用 console.error 确保在生产环境也能看到日志
		console.error('[Auth Me API] Session:', session ? { sub: session.sub, email: session.email } : 'null');
		if (!session?.sub) {
			console.error('[Auth Me API] No session or no sub');
			return NextResponse.json({ user: null });
		}
		
		// 先尝试查询包含 avatarUrl 的字段
		// 如果 Prisma Client 还没有重新生成，会失败，我们回退到基本字段
		let user;
		try {
			user = await prisma.user.findUnique({
				where: { id: String(session.sub) },
				select: { 
					id: true, 
					email: true, 
					name: true, 
					avatarUrl: true, 
					role: true 
				}
			});
		} catch (selectError: any) {
			// 如果查询失败（可能是 avatarUrl 字段不存在），回退到基本字段
			console.warn('[Auth Me API] Avatar field not available, using basic fields:', selectError.message);
			user = await prisma.user.findUnique({
				where: { id: String(session.sub) },
				select: { 
					id: true, 
					email: true, 
					name: true, 
					role: true 
				}
			});
		}
		
		if (!user) {
			return NextResponse.json({ user: null });
		}
		
		// 检查是否是匿名用户
		const isGuest = user.email.endsWith('@temp.local');

		return NextResponse.json({ 
			user: {
				id: user.id,
				email: user.email,
				name: user.name || null,
				avatarUrl: (user as any).avatarUrl || null,
				role: user.role,
				isGuest
			}
		});
	} catch (err: any) {
		console.error('[Auth Me API] Error:', err);
		// 即使出错也返回 null，而不是抛出错误
		return NextResponse.json({ user: null });
	}
}










