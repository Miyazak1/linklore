import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { hash } from 'bcryptjs';
import { createSession, clearSession } from '@/lib/auth/session';
import { verifyAndConsumeInvite } from '@/lib/auth/invite';
import { associateGuestData, isGuestUser } from '@/lib/auth/guest';

const SignupSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(100),
	inviteCode: z.preprocess(
		(val) => {
			// 将空字符串转换为 undefined
			if (typeof val === 'string' && val.trim().length === 0) {
				return undefined;
			}
			return val;
		},
		z.string().min(4).optional() // 如果提供，至少4个字符
	),
	guestUserId: z.string().optional() // 匿名用户ID（用于关联数据）
});

export async function POST(req: Request) {
	try {
		const json = await req.json();
		const { email, password, inviteCode, guestUserId } = SignupSchema.parse(json);
		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) {
			return NextResponse.json({ error: '邮箱已注册' }, { status: 400 });
		}
		const passwordHash = await hash(password, 10);
		const user = await prisma.user.create({
			data: { email, passwordHash }
		});

		// 如果提供了 guestUserId，关联匿名用户数据
		if (guestUserId) {
			try {
				// 验证 guestUserId 是否是有效的匿名用户
				const guestUser = await prisma.user.findUnique({
					where: { id: guestUserId },
					select: { email: true }
				});

				if (guestUser && isGuestUser(guestUser)) {
					// 关联匿名用户数据到新注册用户
					await associateGuestData(guestUserId, user.id);
					console.log(`[Signup] Associated guest data from ${guestUserId} to ${user.id}`);
				}
			} catch (associateErr: any) {
				// 关联失败不影响注册，只记录日志
				console.warn('[Signup] Failed to associate guest data:', associateErr.message);
			}
		}

		// 暂时取消邀请码验证：如果提供了邀请码才验证，否则跳过
		if (inviteCode && inviteCode.trim().length >= 4) {
			try {
				await verifyAndConsumeInvite(inviteCode.trim(), user.id);
			} catch (inviteErr: any) {
				// 如果邀请码验证失败，记录日志但不阻止注册
				console.warn('[Signup] Invite code verification failed, but allowing registration:', inviteErr.message);
			}
		}

		// 清除旧的 session（可能是匿名用户的）
		await clearSession();
		
		// 创建新用户的 session
		await createSession({ sub: user.id, email: user.email, role: user.role });
		
		return NextResponse.json({ ok: true });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '注册失败' }, { status: 400 });
	}
}




