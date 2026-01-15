/**
 * 注册验证码相关功能
 */

import { prisma } from '@/lib/db/client';
import { sendEmail } from '@/lib/email/sender';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('VerificationCode');

// 验证码存储在内存中（生产环境建议使用 Redis）
const codeStore = new Map<string, { code: string; expiresAt: Date; email: string }>();

/**
 * 生成6位数字验证码
 */
export function generateVerificationCode(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 发送注册验证码到邮箱
 */
export async function sendRegistrationCode(email: string): Promise<{ success: boolean; error?: string }> {
	try {
		// 检查邮箱是否已注册
		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) {
			return { success: false, error: '邮箱已注册' };
		}

		// 生成验证码
		const code = generateVerificationCode();
		const expiresAt = new Date();
		expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10分钟后过期

		// 存储验证码（key: email, value: { code, expiresAt, email }）
		codeStore.set(email, { code, expiresAt, email });

		// 发送邮件
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>注册验证码</title>
			</head>
			<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
				<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
					<h1 style="color: white; margin: 0;">LinkLore</h1>
				</div>
				<div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
					<h2 style="color: #333; margin-top: 0;">注册验证码</h2>
					<p>感谢您注册 LinkLore！您的验证码是：</p>
					<div style="text-align: center; margin: 30px 0;">
						<div style="display: inline-block; background: #667eea; color: white; padding: 20px 40px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
							${code}
						</div>
					</div>
					<p style="color: #666; font-size: 14px;">验证码将在10分钟后过期。如果您没有注册 LinkLore 账户，请忽略此邮件。</p>
				</div>
			</body>
			</html>
		`;

		const sent = await sendEmail({
			to: email,
			subject: 'LinkLore 注册验证码',
			html
		});

		if (!sent) {
			return { success: false, error: '验证码发送失败，请检查邮件配置' };
		}

		log.debug('注册验证码已发送', { email });
		return { success: true };
	} catch (error: any) {
		log.error('发送注册验证码失败', error as Error, { email });
		return { success: false, error: '发送失败，请稍后重试' };
	}
}

/**
 * 验证注册验证码
 */
export function verifyRegistrationCode(email: string, code: string): { success: boolean; error?: string } {
	try {
		const stored = codeStore.get(email);
		
		if (!stored) {
			return { success: false, error: '验证码不存在或已过期' };
		}

		if (stored.expiresAt < new Date()) {
			codeStore.delete(email);
			return { success: false, error: '验证码已过期，请重新获取' };
		}

		if (stored.code !== code) {
			return { success: false, error: '验证码错误' };
		}

		// 验证成功后删除验证码（一次性使用）
		codeStore.delete(email);
		
		log.debug('注册验证码验证成功', { email });
		return { success: true };
	} catch (error: any) {
		log.error('验证注册验证码失败', error as Error, { email });
		return { success: false, error: '验证失败，请稍后重试' };
	}
}

/**
 * 清理过期的验证码（定期清理）
 */
export function cleanupExpiredCodes() {
	const now = new Date();
	for (const [email, data] of codeStore.entries()) {
		if (data.expiresAt < now) {
			codeStore.delete(email);
		}
	}
}

// 每5分钟清理一次过期验证码
if (typeof setInterval !== 'undefined') {
	setInterval(cleanupExpiredCodes, 5 * 60 * 1000);
}





