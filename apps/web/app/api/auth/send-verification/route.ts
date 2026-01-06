import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { createAndSendVerificationToken } from '@/lib/auth/emailVerification';
import { prisma } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('SendVerification API');

export async function POST() {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '请先登录' }, { status: 401 });
		}

		const user = await prisma.user.findUnique({
			where: { id: session.sub },
			select: { id: true, email: true, emailVerified: true }
		});

		if (!user) {
			return NextResponse.json({ error: '用户不存在' }, { status: 404 });
		}

		if (user.emailVerified) {
			return NextResponse.json({ error: '邮箱已验证，无需重复验证' }, { status: 400 });
		}

		const sent = await createAndSendVerificationToken(user.id, user.email);
		if (!sent) {
			return NextResponse.json({ error: '验证邮件发送失败，请检查邮件配置' }, { status: 500 });
		}

		return NextResponse.json({ ok: true, message: '验证邮件已发送，请查收' });
	} catch (err: any) {
		log.error('发送验证邮件失败', err as Error);
		return NextResponse.json({ error: err.message || '发送失败' }, { status: 500 });
	}
}






