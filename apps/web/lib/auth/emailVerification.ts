/**
 * 邮箱验证相关功能
 */

import { prisma } from '@/lib/db/client';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '@/lib/email/sender';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('EmailVerification');

/**
 * 生成邮箱验证令牌
 */
export function generateVerificationToken(): string {
	return randomBytes(32).toString('hex');
}

/**
 * 创建邮箱验证令牌并发送验证邮件
 */
export async function createAndSendVerificationToken(userId: string, email: string): Promise<boolean> {
	try {
		// 生成验证令牌
		const token = generateVerificationToken();
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + 24); // 24小时后过期

		// 更新用户记录
		await prisma.user.update({
			where: { id: userId },
			data: {
				emailVerificationToken: token,
				emailVerificationTokenExpiresAt: expiresAt
			}
		});

		// 发送验证邮件
		const sent = await sendVerificationEmail(email, token);
		if (!sent) {
			log.warn('验证邮件发送失败', { userId, email });
			return false;
		}

		log.debug('验证令牌已创建并发送', { userId, email });
		return true;
	} catch (error: any) {
		log.error('创建验证令牌失败', error as Error, { userId, email });
		return false;
	}
}

/**
 * 验证邮箱令牌
 */
export async function verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
	try {
		const user = await prisma.user.findUnique({
			where: { emailVerificationToken: token },
			select: { id: true, email: true, emailVerificationTokenExpiresAt: true, emailVerified: true }
		});

		if (!user) {
			return { success: false, error: '无效的验证令牌' };
		}

		// 检查是否已过期
		if (user.emailVerificationTokenExpiresAt && user.emailVerificationTokenExpiresAt < new Date()) {
			return { success: false, error: '验证令牌已过期，请重新发送验证邮件' };
		}

		// 检查是否已验证
		if (user.emailVerified) {
			return { success: false, error: '邮箱已验证，无需重复验证' };
		}

		// 更新用户状态
		await prisma.user.update({
			where: { id: user.id },
			data: {
				emailVerified: true,
				emailVerificationToken: null,
				emailVerificationTokenExpiresAt: null
			}
		});

		log.debug('邮箱验证成功', { userId: user.id, email: user.email });
		return { success: true, userId: user.id };
	} catch (error: any) {
		log.error('验证邮箱令牌失败', error as Error, { token });
		return { success: false, error: '验证失败，请稍后重试' };
	}
}






