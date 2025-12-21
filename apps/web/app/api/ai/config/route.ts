import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';

const Schema = z.object({
	provider: z.enum(['openai', 'qwen', 'siliconflow']),
	model: z.string().min(1),
	apiKey: z.string().min(10),
	apiEndpoint: z.string().url().optional().or(z.literal('')),
	persist: z.boolean().optional().default(true)
});

function encodeSecret(plain: string) {
	// Simple reversible encoding placeholder — recommend KMS in production
	const salt = process.env.SESSION_SECRET || 'dev';
	return Buffer.from(`${salt}:${plain}`).toString('base64');
}

export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) return NextResponse.json({ error: '未登录' }, { status: 401 });
		const { provider, model, apiKey, apiEndpoint, persist } = Schema.parse(await req.json());
		
		// 清理 API Key：去除前后空白字符（包括换行符、空格等）
		const cleanApiKey = apiKey.trim();
		
		// 如果清理后的 Key 与原始不同，记录警告
		if (cleanApiKey.length !== apiKey.length) {
			console.warn(`[AI Config] API Key 包含空白字符，已自动清理。原始长度: ${apiKey.length}, 清理后长度: ${cleanApiKey.length}`);
		}
		
		const encApiKey = encodeSecret(cleanApiKey);
		await prisma.userAiConfig.upsert({
			where: { userId: String(session.sub) },
			update: { 
				provider, 
				model, 
				encApiKey, 
				apiEndpoint: apiEndpoint || null,
				persist 
			},
			create: { 
				userId: String(session.sub), 
				provider, 
				model, 
				encApiKey,
				apiEndpoint: apiEndpoint || null,
				persist 
			}
		});
		return NextResponse.json({ ok: true });
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '保存失败' }, { status: 400 });
	}
}


