import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

// 临时管理接口：删除指定邮箱的用户
export async function POST(req: Request) {
	try {
		const { email } = await req.json();
		
		if (!email || typeof email !== 'string') {
			return NextResponse.json({ error: '请提供邮箱地址' }, { status: 400 });
		}

		const user = await prisma.user.findUnique({
			where: { email },
			select: { id: true, email: true }
		});

		if (!user) {
			return NextResponse.json({ error: '用户不存在' }, { status: 404 });
		}

		// 删除用户创建的话题和文档
		await prisma.document.deleteMany({
			where: { authorId: user.id }
		});

		await prisma.topic.deleteMany({
			where: { authorId: user.id }
		});

		// 删除用户
		await prisma.user.delete({
			where: { email }
		});

		return NextResponse.json({ 
			success: true, 
			message: `用户 ${email} 已删除` 
		});
	} catch (error: any) {
		console.error('[Delete User] Error:', error);
		return NextResponse.json({ 
			error: error.message || '删除失败' 
		}, { status: 500 });
	}
}








