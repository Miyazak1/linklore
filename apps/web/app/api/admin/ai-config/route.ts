import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';

const Schema = z.object({
	provider: z.enum(['openai', 'qwen', 'siliconflow']),
	model: z.string().min(1),
	apiKey: z.string().min(10),
	apiEndpoint: z.string().url().optional().or(z.literal(''))
});

function encodeSecret(plain: string) {
	// Simple reversible encoding placeholder — recommend KMS in production
	const salt = process.env.SESSION_SECRET || 'dev';
	return Buffer.from(`${salt}:${plain}`).toString('base64');
}

export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		// 检查用户是否为管理员
		const user = await prisma.user.findUnique({
			where: { id: String(session.sub) }
		});

		if (!user || user.role !== 'admin') {
			return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
		}

		const { provider, model, apiKey, apiEndpoint } = Schema.parse(await req.json());
		
		// 清理 API Key：去除前后空白字符（包括换行符、空格等）
		// 这很重要，因为用户可能在输入时意外添加了这些字符
		const cleanApiKey = apiKey.trim();
		
		// 验证API Key格式（基本检查）
		if (cleanApiKey.length < 10) {
			return NextResponse.json({ error: 'API Key 长度不足' }, { status: 400 });
		}
		
		// 如果清理后的 Key 与原始不同，记录警告
		if (cleanApiKey.length !== apiKey.length) {
			console.warn(`[Admin AI Config] API Key 包含空白字符，已自动清理。原始长度: ${apiKey.length}, 清理后长度: ${cleanApiKey.length}`);
		}
		
		const encApiKey = encodeSecret(cleanApiKey);
		
		// 验证编码后的Key可以正确解码（确保编码逻辑正确）
		try {
			const salt = process.env.SESSION_SECRET || 'dev';
			const decoded = Buffer.from(encApiKey, 'base64').toString('utf-8');
			if (!decoded.startsWith(`${salt}:`)) {
				console.error('[Admin AI Config] API Key encoding verification failed');
				return NextResponse.json({ error: 'API Key 编码验证失败' }, { status: 500 });
			}
			const decodedKey = decoded.slice(salt.length + 1);
			// 注意：这里比较的是清理后的 Key
			if (decodedKey !== cleanApiKey) {
				console.error('[Admin AI Config] API Key encoding/decoding mismatch');
				return NextResponse.json({ error: 'API Key 编码/解码不匹配' }, { status: 500 });
			}
		} catch (err: any) {
			console.error('[Admin AI Config] API Key encoding error:', err);
			return NextResponse.json({ error: `API Key 编码错误: ${err.message}` }, { status: 500 });
		}

		// 更新或创建系统配置（只保留一个）
		// 检查 Prisma Client 是否包含 SystemAiConfig
		if (!prisma.systemAiConfig) {
			console.error('[Admin AI Config] SystemAiConfig model not found in Prisma Client. Please run: npx prisma generate');
			return NextResponse.json({ error: '系统配置模型未找到，请重新生成 Prisma Client' }, { status: 500 });
		}
		
		const existing = await prisma.systemAiConfig.findFirst({
			orderBy: { updatedAt: 'desc' }
		});

		if (existing) {
			await prisma.systemAiConfig.update({
				where: { id: existing.id },
				data: {
					provider,
					model,
					encApiKey,
					apiEndpoint: apiEndpoint || null,
					updatedBy: String(session.sub)
				}
			});
			console.log(`[Admin AI Config] Updated system config: provider=${provider}, model=${model}`);
		} else {
			await prisma.systemAiConfig.create({
				data: {
					provider,
					model,
					encApiKey,
					apiEndpoint: apiEndpoint || null,
					updatedBy: String(session.sub)
				}
			});
			console.log(`[Admin AI Config] Created system config: provider=${provider}, model=${model}`);
		}

		return NextResponse.json({ ok: true, message: '系统 AI 配置已更新' });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '保存失败' }, { status: 400 });
	}
}

export async function GET() {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		// 检查用户是否为管理员
		const user = await prisma.user.findUnique({
			where: { id: String(session.sub) }
		});

		if (!user || user.role !== 'admin') {
			return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
		}

		// 检查 Prisma Client 是否包含 SystemAiConfig
		if (!prisma.systemAiConfig) {
			console.error('[Admin AI Config] SystemAiConfig model not found in Prisma Client. Please run: npx prisma generate');
			return NextResponse.json({ error: '系统配置模型未找到，请重新生成 Prisma Client' }, { status: 500 });
		}
		
		const config = await prisma.systemAiConfig.findFirst({
			orderBy: { updatedAt: 'desc' },
			select: {
				provider: true,
				model: true,
				apiEndpoint: true,
				updatedAt: true,
				updatedBy: true
				// 不返回 encApiKey，安全考虑
			}
		});

		return NextResponse.json({ config });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '获取失败' }, { status: 400 });
	}
}

