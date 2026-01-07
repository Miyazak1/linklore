/**
 * 邮件发送服务
 */

import nodemailer from 'nodemailer';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('EmailSender');

// 创建邮件传输器（延迟初始化）
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
	// 如果已经初始化，直接返回
	if (transporter !== null) {
		return transporter;
	}

	// 延迟初始化：每次调用时重新读取环境变量
	const host = process.env.SMTP_HOST;
	const port = parseInt(process.env.SMTP_PORT || '587', 10);
	const user = process.env.SMTP_USER;
	const password = process.env.SMTP_PASSWORD;
	const secure = process.env.SMTP_SECURE === 'true' || port === 465;

	if (!host || !user || !password) {
		log.warn('SMTP配置不完整，邮件发送功能将被禁用', {
			hasHost: !!host,
			hasUser: !!user,
			hasPassword: !!password,
			// 调试信息：显示实际读取到的值（不显示密码）
			host: host || 'undefined',
			user: user || 'undefined',
			hasPassword: !!password
		});
		transporter = null;
		return null;
	}

	transporter = nodemailer.createTransport({
		host,
		port,
		secure, // true for 465, false for other ports
		auth: {
			user,
			pass: password
		}
	});

	log.info('SMTP 传输器已初始化', {
		host,
		port,
		user,
		secure
	});

	return transporter;
}

/**
 * 发送邮件
 */
export async function sendEmail(options: {
	to: string;
	subject: string;
	html: string;
	text?: string;
}): Promise<boolean> {
	const transporter = getTransporter();
	if (!transporter) {
		log.error('邮件发送器未初始化，无法发送邮件');
		return false;
	}

	const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@mooyu.com';

	try {
		const info = await transporter.sendMail({
			from: `Mooyu <${from}>`,
			to: options.to,
			subject: options.subject,
			html: options.html,
			text: options.text || options.html.replace(/<[^>]*>/g, '') // 简单的HTML转文本
		});

		log.debug('邮件发送成功', {
			to: options.to,
			messageId: info.messageId
		});

		return true;
	} catch (error: any) {
		log.error('邮件发送失败', error as Error, {
			to: options.to,
			subject: options.subject
		});
		return false;
	}
}

/**
 * 发送邮箱验证邮件
 */
export async function sendVerificationEmail(
	email: string,
	verificationToken: string
): Promise<boolean> {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	const verificationUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`;

	const html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>验证您的邮箱</title>
		</head>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
				<h1 style="color: white; margin: 0;">Mooyu</h1>
			</div>
			<div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
				<h2 style="color: #333; margin-top: 0;">验证您的邮箱</h2>
				<p>感谢您注册 Mooyu！请点击下面的按钮验证您的邮箱地址：</p>
				<div style="text-align: center; margin: 30px 0;">
					<a href="${verificationUrl}" 
					   style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
						验证邮箱
					</a>
				</div>
				<p style="color: #666; font-size: 14px;">如果按钮无法点击，请复制以下链接到浏览器中打开：</p>
				<p style="color: #667eea; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
				<p style="color: #999; font-size: 12px; margin-top: 30px;">
					此链接将在24小时后过期。如果您没有注册 Mooyu 账户，请忽略此邮件。
				</p>
			</div>
		</body>
		</html>
	`;

	return sendEmail({
		to: email,
		subject: '验证您的 Mooyu 邮箱',
		html
	});
}



