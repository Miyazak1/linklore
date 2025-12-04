import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import {
	callOpenAiCompatibleStream,
	parseStreamResponse,
	getApiKeyFromConfig
} from '@/lib/ai/adapters';
import { requireRoomAccess } from '@/lib/security/roomAccess';
import { z } from 'zod';

const StreamRequestSchema = z.object({
	messageId: z.string(),
	prompt: z.string().min(1),
	roomId: z.string(),
	context: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant']),
				content: z.string()
			})
		)
		.optional(),
	provider: z.enum(['openai', 'qwen', 'siliconflow']).optional(),
	model: z.string().optional(),
	apiKey: z.string().optional(),
	apiEndpoint: z.string().optional()
});

/**
 * POST /api/chat/ai/stream
 * 启动流式 AI 输出（SSE）
 */
export async function POST(req: Request) {
	try {
		const session = await readSession();
		if (!session?.sub) {
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}

		const body = await req.json();
		const {
			messageId,
			prompt,
			roomId,
			context,
			provider: providedProvider,
			model: providedModel,
			apiKey: providedApiKey,
			apiEndpoint: providedEndpoint
		} = StreamRequestSchema.parse(body);

		// 检查房间访问权限
		await requireRoomAccess(roomId, session.sub);

		// 获取用户 AI 配置或使用传入的参数
		let finalProvider = providedProvider;
		let finalModel = providedModel;
		let finalApiKey = providedApiKey;
		let finalEndpoint = providedEndpoint;

		if (!finalApiKey) {
			// 从用户配置获取
			const userConfig = await prisma.userAiConfig.findUnique({
				where: { userId: session.sub }
			});

			if (userConfig) {
				finalProvider = (userConfig.provider as any) || finalProvider;
				finalModel = userConfig.model || finalModel;
				finalApiKey = getApiKeyFromConfig(userConfig.encApiKey);
				finalEndpoint = userConfig.apiEndpoint || finalEndpoint;
			} else {
				// 使用系统默认配置
				const systemConfig = await prisma.systemAiConfig.findFirst({
					orderBy: { updatedAt: 'desc' }
				});
				if (systemConfig) {
					finalProvider = (systemConfig.provider as any) || finalProvider;
					finalModel = systemConfig.model || finalModel;
					finalApiKey = getApiKeyFromConfig(systemConfig.encApiKey);
					finalEndpoint = systemConfig.apiEndpoint || finalEndpoint;
				} else {
					return NextResponse.json(
						{ error: '未配置 AI' },
						{ status: 400 }
					);
				}
			}
		}

		if (!finalProvider || !finalModel || !finalApiKey) {
			return NextResponse.json(
				{ error: 'AI 配置不完整' },
				{ status: 400 }
			);
		}

		// 确定 API endpoint
		let endpoint = finalEndpoint;
		if (!endpoint) {
			switch (finalProvider) {
				case 'openai':
					endpoint = 'https://api.openai.com/v1';
					break;
				case 'siliconflow':
					endpoint = 'https://api.siliconflow.cn/v1';
					break;
				case 'qwen':
					endpoint = 'https://dashscope.aliyuncs.com/api/v1';
					break;
			}
		}

		// 构建消息上下文
		const messages: Array<{ role: 'user' | 'assistant'; content: string }> =
			context || [];
		messages.push({ role: 'user', content: prompt });

		console.log('[Stream API] ========== 开始流式输出 ==========');
		console.log('[Stream API] 参数:', {
			messageId,
			provider: finalProvider,
			model: finalModel,
			endpoint,
			hasApiKey: !!finalApiKey,
			apiKeyLength: finalApiKey?.length || 0,
			contextLength: messages.length,
			prompt: prompt.substring(0, 100) + '...'
		});

		// 创建流式响应
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();

				try {
					// 更新消息状态为流式输出中
					await prisma.chatMessage.update({
						where: { id: messageId },
						data: {
							isStreaming: true,
							streamingCompleted: false
						}
					}).catch(err => console.error('[Stream] Failed to update message status:', err));

					// 构建OpenAI格式的消息数组
					const openAiMessages = messages.map(m => ({
						role: m.role === 'user' ? 'user' : 'assistant',
						content: m.content
					}));

					console.log('[Stream API] 调用AI，消息数量:', openAiMessages.length);
					console.log('[Stream API] 消息内容:', JSON.stringify(openAiMessages, null, 2));
					console.log('[Stream API] API配置:', {
						endpoint,
						model: finalModel,
						hasApiKey: !!finalApiKey,
						apiKeyLength: finalApiKey?.length || 0
					});

					// 对于 DeepSeek-V3，直接使用非流式调用（因为流式响应有问题，会被截断）
					const isDeepSeekV3 = finalModel?.toLowerCase().includes('deepseek-v3');
					const maxTokens = finalModel?.includes('deepseek') || finalModel?.includes('DeepSeek')
						? 4000  // DeepSeek-V3 可能需要更大的token限制
						: 2000;
					
					if (isDeepSeekV3) {
						console.log('[Stream API] DeepSeek-V3 检测到，直接使用非流式调用（流式响应会被截断）');
						try {
							const nonStreamBody: any = {
								model: finalModel,
								messages: openAiMessages,
								max_tokens: maxTokens,
								temperature: 0.7,
								top_p: 0.95,
								reasoning_effort: 'low'
							};
							
							const nonStreamResponse = await fetch(`${endpoint}/chat/completions`, {
								method: 'POST',
								headers: {
									Authorization: `Bearer ${finalApiKey}`,
									'Content-Type': 'application/json'
								},
								body: JSON.stringify(nonStreamBody)
							});
							
							if (nonStreamResponse.ok) {
								const nonStreamData = await nonStreamResponse.json();
								const content = nonStreamData.choices?.[0]?.message?.content;
								
								if (content) {
									console.log('[Stream API] ✅ 非流式调用成功，模拟流式输出，内容长度:', content.length);
									
									// 模拟流式输出：逐字符发送（每5个字符一组，稍微延迟）
									const chars = content.split('');
									for (let i = 0; i < chars.length; i++) {
										const char = chars[i];
										controller.enqueue(
											encoder.encode(
												`event: chunk\ndata: ${JSON.stringify({
													text: char
												})}\n\n`
											)
										);
										
										// 每5个字符稍微延迟，模拟流式效果
										if (i % 5 === 0 && i > 0) {
											await new Promise(resolve => setTimeout(resolve, 20));
										}
									}
									
									// 发送完成事件
									controller.enqueue(
										encoder.encode(
											`event: done\ndata: ${JSON.stringify({
												messageId,
												fullText: content,
												usage: nonStreamData.usage
											})}\n\n`
										)
									);
									
									// 更新数据库
									await prisma.chatMessage.update({
										where: { id: messageId },
										data: {
											content: content,
											contentType: 'AI_SUGGESTION',
											isStreaming: false,
											streamingCompleted: true,
											aiProvider: finalProvider,
											aiModel: finalModel
										}
									}).catch(err => console.error('[Stream] Failed to update message:', err));
									
									// 触发监督检查（根据《双人讨论宪章》第14-17条，AI回答也需要被检查）
									fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat/messages/${messageId}/moderate`, {
										method: 'POST'
									}).catch((err) => {
										console.error('[Stream] 触发AI回答监督检查失败:', err);
									});
									
									// 记录使用量
									if (nonStreamData.usage) {
										await prisma.aiUsageLog.create({
											data: {
												userId: session.sub,
												provider: finalProvider!,
												model: finalModel!,
												promptTokens: nonStreamData.usage.prompt_tokens || 0,
												completionTokens: nonStreamData.usage.completion_tokens || 0,
												costCents: 0,
												status: 'success'
											}
										}).catch(err => console.error('[Stream] Failed to log usage:', err));
									}
									
									controller.close();
									return;
								}
							}
						} catch (fallbackError: any) {
							console.error('[Stream API] 非流式调用失败:', fallbackError);
							// 如果非流式调用也失败，继续尝试流式调用
						}
					}
					
					// 对于其他模型或非流式调用失败的情况，使用流式调用
					console.log('[Stream API] 开始调用 callOpenAiCompatibleStream...');
					let responseStream: ReadableStream<Uint8Array>;
					try {
						console.log('[Stream API] 使用maxTokens:', maxTokens, '模型:', finalModel);
						
						responseStream = await callOpenAiCompatibleStream(
							endpoint!,
							{
								apiKey: finalApiKey!,
								model: finalModel!,
								messages: openAiMessages, // 使用消息数组而不是字符串
								maxTokens: maxTokens,
								temperature: 0.7
							}
						);
						console.log('[Stream API] ✅ API调用成功，收到流式响应');
					} catch (apiError: any) {
						console.error('[Stream API] ❌ API调用失败:', apiError);
						throw apiError;
					}

					let fullText = '';
					let usage: any = null;

					// 解析流式响应并发送
					let chunkCount = 0;
					let hasReceivedChunks = false;
					
					console.log('[Stream API] 开始解析流式响应...');
					
					let lastDbUpdateTime = Date.now();
					const DB_UPDATE_INTERVAL = 500; // 每500ms更新一次数据库
					
					for await (const chunk of parseStreamResponse(responseStream)) {
						if (chunk.text && chunk.text.trim()) {
							hasReceivedChunks = true;
							chunkCount++;
							fullText += chunk.text;
							
							if (chunkCount === 1) {
								console.log('[Stream API] ✅ 收到第一个chunk:', chunk.text.substring(0, 50));
							}
							
							// 发送增量文本
							controller.enqueue(
								encoder.encode(
									`event: chunk\ndata: ${JSON.stringify({
										text: chunk.text
									})}\n\n`
								)
							);

							// 每10个chunk记录一次日志
							if (chunkCount % 10 === 0) {
								console.log('[Stream API] Chunks sent:', chunkCount, 'Text length:', fullText.length);
							}
							
							// 实时更新数据库（每500ms或每20个chunk更新一次），确保用户B能看到同步的流式内容
							const now = Date.now();
							if (now - lastDbUpdateTime >= DB_UPDATE_INTERVAL || chunkCount % 20 === 0) {
								lastDbUpdateTime = now;
								// 异步更新数据库，不阻塞流式输出
								prisma.chatMessage.update({
									where: { id: messageId },
									data: { content: fullText }
								}).catch(err => {
									console.error('[Stream API] Failed to update message content in real-time:', err);
								});
							}
						}
						
						if (chunk.done) {
							// 流结束
							if (chunk.usage) {
								usage = chunk.usage;
							}

							console.log('[Stream API] Stream completed:', {
								messageId,
								fullTextLength: fullText.length,
								chunkCount,
								hasUsage: !!usage,
								completionTokens: usage?.completion_tokens || 0
							});

							// 检查：如果completion_tokens > 0但fullText很短，可能是被截断了
							// 或者如果fullText很短（< 10字符）且completion_tokens为0，也可能是流式响应有问题
							const isTruncated = usage && usage.completion_tokens > 0 && fullText.length < usage.completion_tokens;
							const isSuspiciouslyShort = fullText.length < 10 && (!usage || usage.completion_tokens === 0);
							
							if (isTruncated || isSuspiciouslyShort) {
								console.warn('[Stream API] ⚠️ 警告：回复可能被截断');
								console.warn('[Stream API] completion_tokens:', usage?.completion_tokens || 0, 'fullText长度:', fullText.length);
								
								// 对于 DeepSeek-V3，如果回复很短，尝试非流式调用获取完整回复
								const isDeepSeekV3 = finalModel?.toLowerCase().includes('deepseek-v3');
								if (isDeepSeekV3 && fullText.length < 50) {
									console.log('[Stream API] 回复太短，尝试非流式调用获取完整回复...');
									try {
										const nonStreamBody: any = {
											model: finalModel,
											messages: openAiMessages,
											max_tokens: maxTokens,
											temperature: 0.7,
											top_p: 0.95,
											reasoning_effort: 'low'
										};
										
										const nonStreamResponse = await fetch(`${endpoint}/chat/completions`, {
											method: 'POST',
											headers: {
												Authorization: `Bearer ${finalApiKey}`,
												'Content-Type': 'application/json'
											},
											body: JSON.stringify(nonStreamBody)
										});
										
										if (nonStreamResponse.ok) {
											const nonStreamData = await nonStreamResponse.json();
											const fullContent = nonStreamData.choices?.[0]?.message?.content;
											
											if (fullContent && fullContent.length > fullText.length) {
												console.log('[Stream API] ✅ 非流式调用获取到完整回复，长度:', fullContent.length);
												
												// 发送剩余部分（如果还没有发送完）
												const remainingText = fullContent.substring(fullText.length);
												if (remainingText) {
													// 逐字符发送剩余部分
													const chars = remainingText.split('');
													for (const char of chars) {
														controller.enqueue(
															encoder.encode(
																`event: chunk\ndata: ${JSON.stringify({
																	text: char
																})}\n\n`
															)
														);
													}
													fullText = fullContent; // 更新fullText
													usage = nonStreamData.usage; // 更新usage
												}
											}
										}
									} catch (fallbackError: any) {
										console.error('[Stream API] 获取完整回复失败:', fallbackError);
									}
								}
							}

							// 发送完成事件
							controller.enqueue(
								encoder.encode(
									`event: done\ndata: ${JSON.stringify({
										messageId,
										fullText,
										usage
									})}\n\n`
								)
							);

							// 更新数据库中的消息内容
							await prisma.chatMessage
								.update({
									where: { id: messageId },
									data: {
										content: fullText,
										contentType: 'AI_SUGGESTION', // 确保类型正确
										isStreaming: false,
										streamingCompleted: true,
										aiProvider: finalProvider,
										aiModel: finalModel
									}
								})
								.catch((err) =>
									console.error(
										'[Stream] Failed to update message:',
										err
									)
								);
							
							// 触发监督检查（根据《双人讨论宪章》第14-17条，AI回答也需要被检查）
							fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat/messages/${messageId}/moderate`, {
								method: 'POST'
							}).catch((err) => {
								console.error('[Stream] 触发AI回答监督检查失败:', err);
							});

							// 记录使用量
							if (usage) {
								await prisma.aiUsageLog
									.create({
										data: {
											userId: session.sub,
											provider: finalProvider!,
											model: finalModel!,
											promptTokens: usage.prompt_tokens || 0,
											completionTokens:
												usage.completion_tokens || 0,
											costCents: 0, // 将在后续计算
											status: 'success'
										}
									})
									.catch((err) =>
										console.error(
											'[Stream] Failed to log usage:',
											err
										)
									);
							}

							break;
						}
					}

					// 如果没有收到任何chunk，尝试回退到非流式调用（特别是对于 DeepSeek-V3）
					if (!hasReceivedChunks) {
						console.error('[Stream API] No chunks received from AI provider');
						
						// 对于 DeepSeek-V3，尝试非流式调用作为回退
						const isDeepSeekV3 = finalModel?.toLowerCase().includes('deepseek-v3');
						if (isDeepSeekV3) {
							console.log('[Stream API] 尝试回退到非流式调用...');
							try {
								const nonStreamBody: any = {
									model: finalModel,
									messages: openAiMessages,
									max_tokens: maxTokens,
									temperature: 0.7,
									top_p: 0.95,
									reasoning_effort: 'low'
								};
								
								const nonStreamResponse = await fetch(`${endpoint}/chat/completions`, {
									method: 'POST',
									headers: {
										Authorization: `Bearer ${finalApiKey}`,
										'Content-Type': 'application/json'
									},
									body: JSON.stringify(nonStreamBody)
								});
								
								if (nonStreamResponse.ok) {
									const nonStreamData = await nonStreamResponse.json();
									const content = nonStreamData.choices?.[0]?.message?.content;
									
									if (content) {
										console.log('[Stream API] ✅ 非流式调用成功，模拟流式输出');
										
										// 模拟流式输出：逐字符发送
										const chars = content.split('');
										for (let i = 0; i < chars.length; i++) {
											const char = chars[i];
											controller.enqueue(
												encoder.encode(
													`event: chunk\ndata: ${JSON.stringify({
														text: char
													})}\n\n`
												)
											);
											
											// 每10个字符稍微延迟，模拟流式效果
											if (i % 10 === 0 && i > 0) {
												await new Promise(resolve => setTimeout(resolve, 10));
											}
										}
										
										// 发送完成事件
										controller.enqueue(
											encoder.encode(
												`event: done\ndata: ${JSON.stringify({
													messageId,
													fullText: content,
													usage: nonStreamData.usage
												})}\n\n`
											)
										);
										
										// 更新数据库
										await prisma.chatMessage.update({
											where: { id: messageId },
											data: {
												content: content,
												contentType: 'AI_SUGGESTION',
												isStreaming: false,
												streamingCompleted: true,
												aiProvider: finalProvider,
												aiModel: finalModel
											}
										}).catch(err => console.error('[Stream] Failed to update message:', err));
										
										// 触发监督检查（根据《双人讨论宪章》第14-17条，AI回答也需要被检查）
										fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat/messages/${messageId}/moderate`, {
											method: 'POST'
										}).catch((err) => {
											console.error('[Stream] 触发AI回答监督检查失败:', err);
										});
										
										// 记录使用量
										if (nonStreamData.usage) {
											await prisma.aiUsageLog.create({
												data: {
													userId: session.sub,
													provider: finalProvider!,
													model: finalModel!,
													promptTokens: nonStreamData.usage.prompt_tokens || 0,
													completionTokens: nonStreamData.usage.completion_tokens || 0,
													costCents: 0,
													status: 'success'
												}
											}).catch(err => console.error('[Stream] Failed to log usage:', err));
										}
										
										controller.close();
										return;
									}
								}
							} catch (fallbackError: any) {
								console.error('[Stream API] 回退到非流式调用也失败:', fallbackError);
							}
						}
						
						// 如果回退也失败，发送错误
						controller.enqueue(
							encoder.encode(
								`event: error\ndata: ${JSON.stringify({
									error: 'AI 未返回任何内容，请检查API配置'
								})}\n\n`
							)
						);
					}
					
					controller.close();
				} catch (error: any) {
					console.error('[Stream API] Error in stream:', error);
					// 更新消息状态为失败
					await prisma.chatMessage
						.update({
							where: { id: messageId },
							data: {
								isStreaming: false,
								streamingCompleted: false
							}
						})
						.catch(() => {});

					// 发送错误
					controller.enqueue(
						encoder.encode(
							`event: error\ndata: ${JSON.stringify({
								error: error.message || '流式输出失败'
							})}\n\n`
						)
					);
					controller.close();
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no' // 禁用 nginx 缓冲
			}
		});
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: '请求参数错误', details: error.errors },
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ error: error.message || '启动流式输出失败' },
			{ status: 500 }
		);
	}
}

