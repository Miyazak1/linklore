import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { hash } from 'bcryptjs';
import { createSession, clearSession } from '@/lib/auth/session';
import { verifyAndConsumeInvite } from '@/lib/auth/invite';
import { verifyRegistrationCode } from '@/lib/auth/verificationCode';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('Signup API');

const SignupSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(100),
	verificationCode: z.string().length(6, '验证码必须是6位数字'),
	inviteCode: z.preprocess(
		(val) => {
			// 将空字符串转换为 undefined
			if (typeof val === 'string' && val.trim().length === 0) {
				return undefined;
			}
			return val;
		},
		z.string().min(4).optional() // 如果提供，至少4个字符
	)
});

export async function POST(req: Request) {
	try {
		const json = await req.json();
		const { email, password, verificationCode, inviteCode } = SignupSchema.parse(json);
		
		// 检查邮箱是否已注册
		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) {
			return NextResponse.json({ error: '邮箱已注册' }, { status: 400 });
		}

		// 验证验证码
		const codeVerification = verifyRegistrationCode(email, verificationCode);
		if (!codeVerification.success) {
			return NextResponse.json({ error: codeVerification.error || '验证码错误' }, { status: 400 });
		}

		// 创建用户（验证码已验证，直接设置为已验证）
		const passwordHash = await hash(password, 10);
		const user = await prisma.user.create({
			data: { 
				email, 
				passwordHash, 
				emailVerified: true // 验证码已验证，直接设置为已验证
			}
		});

		// 暂时取消邀请码验证：如果提供了邀请码才验证，否则跳过
		if (inviteCode && inviteCode.trim().length >= 4) {
			try {
				await verifyAndConsumeInvite(inviteCode.trim(), user.id);
			} catch (inviteErr: any) {
				// 如果邀请码验证失败，记录日志但不阻止注册
				log.warn('邀请码验证失败，但允许注册', { error: inviteErr.message });
			}
		}

		// 清除旧的 session（可能是匿名用户的）
		await clearSession();
		
		// 创建新用户的 session
		await createSession({ sub: user.id, email: user.email, role: user.role });
		
		return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
	} catch (err: any) {
		if (err.name === 'ZodError') {
			return NextResponse.json({ error: err.errors[0]?.message || '参数错误' }, { status: 400 });
		}
		return NextResponse.json({ error: err.message || '注册失败' }, { status: 400 });
	}
}




