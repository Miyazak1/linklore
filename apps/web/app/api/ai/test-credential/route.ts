import { NextResponse } from 'next/server';
import { z } from 'zod';

import { callAiProvider, type AiProvider } from '@/lib/ai/adapters';

const Schema = z.object({
	provider: z.enum(['openai', 'qwen', 'siliconflow']),
	apiKey: z.string().min(10),
	model: z.string().min(1),
	apiEndpoint: z.string().url().optional().or(z.literal(''))
});

export async function POST(req: Request) {
	try {
		const { provider, apiKey, model, apiEndpoint } = Schema.parse(await req.json());
		
		// Test by making a small API call
		const result = await callAiProvider(provider as AiProvider, {
			apiKey,
			model,
			prompt: '测试连接，请回复"OK"',
			maxTokens: 10,
			apiEndpoint: apiEndpoint || undefined
		});
		
		if (!result.text) {
			throw new Error('API 返回空响应');
		}
		
		return NextResponse.json({ 
			ok: true, 
			message: `${provider === 'siliconflow' ? '硅基流动' : provider === 'openai' ? 'OpenAI' : '通义千问'} 密钥和模型测试成功` 
		});
	} catch (err: any) {
		return NextResponse.json({ error: err.message || '验证失败' }, { status: 400 });
	}
}


