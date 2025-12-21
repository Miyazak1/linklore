import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import {
	callOpenAiCompatibleStream,
	parseStreamResponse,
	getApiKeyFromConfig
} from '@/lib/ai/adapters';

/**
 * 测试AI流式输出 - 直接测试API调用
 * GET /api/chat/ai/test-stream
 */
export async function GET() {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		// 获取系统默认配置
		const systemConfig = await prisma.systemAiConfig.findFirst({
			orderBy: { updatedAt: 'desc' }
		});

		if (!systemConfig) {
			return NextResponse.json({ error: '未配置系统AI' }, { status: 400 });
		}

		const provider = systemConfig.provider as any;
		const model = systemConfig.model;
		const apiKey = getApiKeyFromConfig(systemConfig.encApiKey);
		let endpoint: string = systemConfig.apiEndpoint || '';

		if (!endpoint) {
			switch (provider) {
				case 'openai':
					endpoint = 'https://api.openai.com/v1';
					break;
				case 'siliconflow':
					endpoint = 'https://api.siliconflow.cn/v1';
					break;
				case 'qwen':
					endpoint = 'https://dashscope.aliyuncs.com/api/v1';
					break;
				default:
					endpoint = 'https://api.openai.com/v1'; // 默认值
					break;
			}
		}

		if (!endpoint) {
			return NextResponse.json({ error: '无法确定API端点' }, { status: 400 });
		}

		console.log('[Test Stream] 配置:', {
			provider,
			model,
			endpoint,
			hasApiKey: !!apiKey,
			apiKeyLength: apiKey.length
		});

		// 对于 DeepSeek-V3，先测试非流式调用，确认API是否正常工作
		const isDeepSeekV3 = model.toLowerCase().includes('deepseek-v3');
		
		if (isDeepSeekV3) {
			console.log('[Test Stream] DeepSeek-V3 检测到，先测试非流式调用...');
			const nonStreamBody: any = {
				model,
				messages: [{ role: 'user', content: '你好，请简单回复' }],
				max_tokens: 100,
				temperature: 0.7,
				top_p: 0.95,
				reasoning_effort: 'low' // 尝试降低推理努力
			};
			
			const nonStreamResponse = await fetch(`${endpoint}/chat/completions`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(nonStreamBody)
			});

			if (nonStreamResponse.ok) {
				const nonStreamData = await nonStreamResponse.json();
				console.log('[Test Stream] 非流式调用成功:', {
					hasContent: !!nonStreamData.choices?.[0]?.message?.content,
					contentLength: nonStreamData.choices?.[0]?.message?.content?.length || 0,
					hasReasoningContent: !!nonStreamData.choices?.[0]?.message?.reasoning_content,
					usage: nonStreamData.usage
				});
				if (nonStreamData.choices?.[0]?.message?.content) {
					return NextResponse.json({
						success: true,
						mode: 'non-stream',
						text: nonStreamData.choices[0].message.content,
						usage: nonStreamData.usage,
						hasReasoningContent: !!nonStreamData.choices?.[0]?.message?.reasoning_content
					});
				} else {
					console.log('[Test Stream] 非流式调用成功但没有content，尝试流式调用...');
				}
			} else {
				const error = await nonStreamResponse.json().catch(() => ({}));
				console.log('[Test Stream] 非流式调用失败:', error);
			}
		}
		
		// 尝试流式调用
		console.log('[Test Stream] 开始流式调用...');
		const responseStream = await callOpenAiCompatibleStream(endpoint, {
			apiKey,
			model,
			messages: [{ role: 'user', content: '你好，请简单回复' }],
			maxTokens: 100,
			temperature: 0.7
		});

		let fullText = '';
		let chunkCount = 0;

		console.log('[Test Stream] 开始解析响应...');

		// 解析流式响应
		for await (const chunk of parseStreamResponse(responseStream)) {
			if (chunk.done) {
				console.log('[Test Stream] 完成，chunk数:', chunkCount, '文本长度:', fullText.length);
				return NextResponse.json({
					success: true,
					text: fullText,
					chunkCount,
					usage: chunk.usage
				});
			}

			if (chunk.text) {
				chunkCount++;
				fullText += chunk.text;
				if (chunkCount <= 3) {
					console.log(`[Test Stream] Chunk ${chunkCount}:`, chunk.text);
				}
			}
		}

		return NextResponse.json({
			success: true,
			text: fullText,
			chunkCount
		});
	} catch (error: any) {
		console.error('[Test Stream] 错误:', error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || '测试失败'
			},
			{ status: 500 }
		);
	}
}

