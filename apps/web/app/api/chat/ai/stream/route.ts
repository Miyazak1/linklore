import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { chatDb } from '@/lib/modules/chat/db';
import { prisma } from '@/lib/db/client'; // 保留用于 User 等共享模型
import { requireRoomAccess } from '@/lib/security/roomAccess';
import {
	callOpenAiCompatibleStream,
	parseStreamResponse,
	getApiKeyFromConfig
} from '@/lib/ai/adapters';
import { z } from 'zod';
import {
	getFacilitatorSystemPrompt,
	getFacilitatorTaskPrompt,
	FacilitatorMode
} from '@/lib/chat/prompts/facilitator';
import {
	getSoloSystemPrompt,
	getSoloPluginPrompt,
	type SoloPluginType
} from '@/lib/chat/prompts/solo';
import { getDuoAssistantSystemPrompt } from '@/lib/chat/prompts/assistant';
import { createModuleLogger } from '@/lib/utils/logger';
import { broadcastToRoom } from '@/lib/realtime/roomConnections';

const log = createModuleLogger('AI Stream API');

/**
 * 请求体 Schema
 */
const StreamRequestSchema = z.object({
	messageId: z.string(),
	roomId: z.string(),
	prompt: z.string(),
	context: z.array(z.object({
		role: z.enum(['user', 'assistant']),
		content: z.string()
	})).optional(),
	taskType: z.enum(['structure', 'tone', 'consensus', 'library']).optional(),
	pluginType: z.enum([
		'concept_clarifier',
		'reasoning_analyzer',
		'counter_perspective',
		'socratic_guide',
		'writing_structurer',
		'learning_navigator',
		'thought_log',
		'practice_framework'
	]).optional(),
	facilitatorMode: z.enum(['v1', 'v2', 'v3']).optional(),
	aiRole: z.enum(['assistant', 'facilitator']).optional()
});

/**
 * POST /api/chat/ai/stream
 * AI 流式输出端点
 * 支持 DUO 房间（taskType）和 SOLO 房间（pluginType）
 */
export async function POST(req: Request) {
	log.debug('收到POST请求', {
		url: req.url,
		method: req.method,
	});
	
	try {
		// 1. 登录检查
		const session = await readSession();
		if (!session?.sub) {
			log.warn('未登录用户尝试访问');
			return NextResponse.json({ error: '未登录' }, { status: 401 });
		}
		log.debug('用户已登录', { userId: session.sub });

		// 2. 解析请求体
		let body: any;
		try {
			body = await req.json();
			log.debug('请求体解析成功', {
				hasMessageId: !!body.messageId,
				hasRoomId: !!body.roomId,
				hasPrompt: !!body.prompt,
				promptLength: body.prompt?.length || 0
			});
		} catch (parseError: any) {
			log.error('请求体解析失败', parseError, {
				messageId: body?.messageId
			});
			throw parseError;
		}
		
		const validatedData = StreamRequestSchema.parse(body);
		const {
			messageId,
			roomId,
			prompt,
			context = [],
			taskType,
			pluginType,
			facilitatorMode = 'v1',
			aiRole
		} = validatedData;

		log.info('收到流式请求', {
			messageId,
			roomId,
			userId: session.sub,
			promptLength: prompt.length,
			contextLength: context.length,
			taskType,
			pluginType,
			facilitatorMode
		});

		// 3. 检查房间访问权限
		await requireRoomAccess(roomId, session.sub);

		// 4. 获取房间信息（包括房间类型）
		const room = await chatDb.rooms.findUnique({
			where: { id: roomId },
			select: {
				id: true,
				type: true,
				creatorId: true,
				participantId: true,
				topic: true,
				topicDescription: true,
				status: true
			}
		});

		if (!room) {
			return NextResponse.json({ error: '房间不存在' }, { status: 404 });
		}

		if (room.status !== 'ACTIVE') {
			return NextResponse.json({ error: '房间已关闭' }, { status: 400 });
		}

		// 5. 房间类型验证
		if (room.type === 'DUO' && pluginType) {
			return NextResponse.json(
				{ error: 'DUO房间不能使用pluginType，请使用taskType' },
				{ status: 400 }
			);
		}

		if (room.type === 'SOLO' && taskType) {
			return NextResponse.json(
				{ error: 'SOLO房间不能使用taskType，请使用pluginType' },
				{ status: 400 }
			);
		}

		// 6. 验证消息存在且属于当前用户
		const message = await chatDb.messages.findUnique({
			where: { id: messageId },
			select: {
				id: true,
				senderId: true,
				roomId: true,
				contentType: true
			}
		});

		if (!message) {
			return NextResponse.json({ error: '消息不存在' }, { status: 404 });
		}

		if (message.roomId !== roomId) {
			return NextResponse.json({ error: '消息不属于此房间' }, { status: 400 });
		}

		if (message.senderId !== session.sub) {
			return NextResponse.json({ error: '无权操作此消息' }, { status: 403 });
		}

		if (message.contentType !== 'AI_SUGGESTION') {
			return NextResponse.json(
				{ error: '只能流式输出AI建议消息' },
				{ status: 400 }
			);
		}

		// 7. 获取系统 AI 配置
		const systemConfig = await prisma.systemAiConfig.findFirst({
			orderBy: { updatedAt: 'desc' }
		});

		if (!systemConfig) {
			return NextResponse.json({ error: '未配置系统AI' }, { status: 500 });
		}

		const provider = systemConfig.provider as any;
		const model = systemConfig.model;
		const apiKey = getApiKeyFromConfig(systemConfig.encApiKey);
		let endpoint = systemConfig.apiEndpoint;

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
					endpoint = 'https://api.openai.com/v1';
			}
		}

		// 8. 构建 AI messages
		const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

		if (room.type === 'DUO') {
			// DUO 房间：根据 aiRole 选择 Prompt
			// 如果 aiRole === 'assistant' 或没有 taskType（@AI 调用），使用助手 Prompt
			// 如果 aiRole === 'facilitator' 或有 taskType（主持人功能），使用主持人 Prompt
			const useAssistant = aiRole === 'assistant' || (!taskType && aiRole !== 'facilitator');
			
			if (useAssistant) {
				// 使用助手 Prompt
				const systemPrompt = getDuoAssistantSystemPrompt();
				messages.push({ role: 'system', content: systemPrompt });
			} else {
				// 使用主持人 Prompt
				let mode: FacilitatorMode = FacilitatorMode.V1;
				if (facilitatorMode === 'v2') {
					mode = FacilitatorMode.V2;
				} else if (facilitatorMode === 'v3') {
					mode = FacilitatorMode.V3;
				}
				const systemPrompt = getFacilitatorSystemPrompt(mode);
				messages.push({ role: 'system', content: systemPrompt });
			}

			// 如果有 taskType，添加任务特定的 prompt（仅主持人模式）
			if (taskType && !useAssistant) {
				const taskPrompt = getFacilitatorTaskPrompt(taskType, {
					recentMessages: context.map(m => m.content),
					topic: room.topic || undefined
				});
				messages.push({ role: 'user', content: taskPrompt });
			}

			// 添加讨论上下文
			if (context.length > 0) {
				messages.push(...context);
			} else {
				// 如果没有提供上下文，从数据库获取
				const discussionMessages = await chatDb.messages.findMany({
					where: {
						roomId,
						contentType: { in: ['USER', 'AI_ADOPTED'] },
						deletedAt: null
					},
					include: {
						sender: { select: { id: true } }
					},
					orderBy: { sequence: 'asc' },
					take: 15
				});

				discussionMessages.forEach((m) => {
					let messageContent = m.content;
					if (m.senderId === room.creatorId) {
						messageContent = `[用户A] ${m.content}`;
					} else if (m.senderId === room.participantId) {
						messageContent = `[用户B] ${m.content}`;
					}
					messages.push({
						role: 'user',
						content: messageContent
					});
				});
			}

			// 添加当前 prompt
			if (prompt) {
				const currentUserLabel = session.sub === room.creatorId ? '[用户A]' : '[用户B]';
				messages.push({
					role: 'user',
					content: `${currentUserLabel} ${prompt}`
				});
			}
		} else {
			// SOLO 房间：使用 Solo 系统 Prompt
			const systemPrompt = getSoloSystemPrompt();
			messages.push({ role: 'system', content: systemPrompt });

			// 如果有 pluginType，添加插件特定的 prompt
			if (pluginType) {
				const pluginPrompt = getSoloPluginPrompt(pluginType, prompt, {
					recentMessages: context.map(m => m.content)
				});
				messages.push({ role: 'user', content: pluginPrompt });
			} else {
				// 添加上下文
				if (context.length > 0) {
					messages.push(...context);
				}

				// 添加当前 prompt
				if (prompt) {
					messages.push({ role: 'user', content: prompt });
				}
			}
		}

		log.debug('构建的 AI messages', {
			messagesCount: messages.length,
			roomType: room.type,
			taskType,
			pluginType
		});

		// 9. 调用 AI API（流式）
		const responseStream = await callOpenAiCompatibleStream(endpoint, {
			apiKey,
			model,
			messages: messages as Array<{ role: 'user' | 'assistant'; content: string }>,
			maxTokens: 2000,
			temperature: 0.7
		});

		// 10. 创建 SSE 流式响应
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();
				let fullText = '';
				let chunkCount = 0;
				let lastChunkTime = Date.now();
				let lastUpdateTime = Date.now();
				const UPDATE_INTERVAL = 1000; // 每1秒更新一次数据库（更频繁，确保实时同步）
				const UPDATE_CHUNK_COUNT = 3; // 每3个chunk更新一次数据库（更频繁）

				const sendEvent = (event: string, data: any) => {
					const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
					controller.enqueue(encoder.encode(message));
				};

				// 心跳机制：每30秒发送一次心跳，保持连接活跃
				const heartbeatInterval = setInterval(() => {
					const timeSinceLastChunk = Date.now() - lastChunkTime;
					if (timeSinceLastChunk > 30000) {
						// 如果30秒没有收到新chunk，发送心跳
						sendEvent('heartbeat', { timestamp: Date.now() });
					}
				}, 30000);

				try {
					// 发送开始事件
					sendEvent('start', { messageId, roomId });

					// 同时广播给房间内所有其他用户
					broadcastToRoom(
						roomId,
						'ai-start',
						{ messageId, roomId },
						session.sub // 排除发起请求的用户
					);

					// 解析流式响应
					try {
						for await (const chunk of parseStreamResponse(responseStream)) {
							// 检查流是否被中断
							if (chunk.done) {
								// 流完成
							log.info('流完成', {
								messageId,
									chunkCount,
									textLength: fullText.length,
									usage: chunk.usage
								});

								// 更新消息内容
								try {
									await chatDb.messages.update({
										where: { id: messageId },
										data: {
											content: fullText || '[AI 生成中断]',
											aiProvider: provider,
											aiModel: model
										}
									});
								} catch (updateError: any) {
									log.error('更新消息失败', updateError);
									sendEvent('error', {
										error: '更新消息失败',
										details: updateError.message
									});
								}

								// 发送完成事件（即使内容为空也发送，让客户端知道流已结束）
								sendEvent('done', {
									messageId,
									fullText: fullText || '',
									usage: chunk.usage
								});

								// 同时广播给房间内所有其他用户
								broadcastToRoom(
									roomId,
									'ai-done',
									{
										messageId,
										fullText: fullText || '',
										usage: chunk.usage
									},
									session.sub // 排除发起请求的用户
								);

								clearInterval(heartbeatInterval);
								controller.close();
								return;
							}

						if (chunk.text) {
							chunkCount++;
							fullText += chunk.text;
							lastChunkTime = Date.now(); // 更新最后收到chunk的时间

						log.debug('发送chunk', {
							chunkNumber: chunkCount,
								chunkText: chunk.text,
								chunkLength: chunk.text.length,
								totalLength: fullText.length,
								messageId
							});

							// 定期更新数据库（让其他用户能看到流式输出）
							// 每3个chunk或每1秒更新一次，确保实时同步
							const shouldUpdate = 
								chunkCount % UPDATE_CHUNK_COUNT === 0 || 
								(Date.now() - lastUpdateTime) >= UPDATE_INTERVAL;
							
							if (shouldUpdate && fullText.length > 0) { // 确保有内容才更新
								try {
									await chatDb.messages.update({
										where: { id: messageId },
										data: { content: fullText }
									});
									lastUpdateTime = Date.now();
									log.info('✅ 定期更新消息内容到数据库', {
										messageId,
										contentLength: fullText.length,
										chunkCount,
										preview: fullText.substring(0, 50)
									});
								} catch (updateError: any) {
									log.error('❌ 定期更新消息失败', updateError);
									// 不中断流式输出，继续处理
								}
							}

							// 发送文本块给发起请求的用户
							sendEvent('chunk', {
								text: chunk.text
							});

							// 同时广播给房间内所有其他用户（实现真正的实时同步）
							broadcastToRoom(
								roomId,
								'ai-chunk',
								{
									messageId,
									text: chunk.text,
									chunkNumber: chunkCount,
									totalLength: fullText.length
								},
								session.sub // 排除发起请求的用户（他已经通过流式输出收到了）
							);
						} else {
							// 记录没有text的chunk（可能是done或其他状态）
						log.warn('收到没有text的chunk', {
							done: chunk.done,
								hasUsage: !!chunk.usage,
								chunkCount,
								totalLength: fullText.length,
								messageId
							});
						}
						}
					} catch (parseError: any) {
						// 流解析错误（可能是AI服务端连接中断）
					log.error('流解析错误', parseError, {
							stack: parseError.stack,
							messageId,
							chunkCount,
							textLength: fullText.length
						});

						// 发送错误事件（保留已生成的内容）
						sendEvent('error', {
							error: parseError.message || '流解析失败',
							details: parseError.toString()
						});

						// 更新消息为错误状态（保留已生成的内容）
						try {
							await chatDb.messages.update({
								where: { id: messageId },
								data: {
									content: fullText || '[AI 生成中断]',
									moderationStatus: 'ERROR',
									aiProvider: provider,
									aiModel: model
								}
							});
						} catch (updateError) {
							log.error('更新错误消息失败', updateError);
						}

						clearInterval(heartbeatInterval);
						controller.close();
						return;
					}
					
					// 如果循环正常结束但没有收到done标记，手动发送完成事件
					// 即使fullText为空，也发送done事件，让客户端知道流已结束
					log.warn('流正常结束但未收到done标记，手动完成', { contentLength: fullText.length });
					clearInterval(heartbeatInterval);
					sendEvent('done', {
						messageId,
						fullText: fullText || '',
						usage: null
					});
					
					// 更新消息内容（即使为空也保存，避免丢失）
					try {
						await chatDb.messages.update({
							where: { id: messageId },
							data: {
								content: fullText || '[AI 生成中断]',
								aiProvider: provider,
								aiModel: model
							}
						});
					} catch (updateError: any) {
						console.error('[AI Stream API] ❌ 更新消息失败:', updateError);
					}
					
					controller.close();
				} catch (error: any) {
					log.error('流处理错误', error, {
						stack: error.stack,
						messageId,
						chunkCount,
						textLength: fullText.length
					});

					// 发送错误事件
					sendEvent('error', {
						error: error.message || '流处理失败',
						details: error.toString()
					});

					// 更新消息为错误状态（保留已生成的内容）
					try {
						await chatDb.messages.update({
							where: { id: messageId },
							data: {
								content: fullText || '[AI 生成失败]',
								moderationStatus: 'ERROR'
							}
						});
					} catch (updateError) {
						log.error('更新错误消息失败', updateError);
					}

					clearInterval(heartbeatInterval);
					controller.close();
				}
			}
		});

		// 11. 返回 SSE 响应
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				'X-Accel-Buffering': 'no' // 禁用 nginx 缓冲
			}
		});
	} catch (error: any) {
		log.error('请求处理错误', error);

		// Zod 验证错误
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					error: '请求参数错误',
					details: error.errors
				},
				{ status: 400 }
			);
		}

		// 权限错误
		if (
			error.message === '房间不存在' ||
			error.message === '无权访问此房间' ||
			error.message === '消息不存在' ||
			error.message === '无权操作此消息'
		) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.message.includes('不存在') ? 404 : 403 }
			);
		}

		// 其他错误
		return NextResponse.json(
			{
				error: error.message || '流式输出失败',
				details: error.toString()
			},
			{ status: 500 }
		);
	}
}
