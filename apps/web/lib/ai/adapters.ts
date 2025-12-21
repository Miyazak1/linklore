// AI Provider Adapters

import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('AI Adapter');

export type AiProvider = 'openai' | 'qwen' | 'siliconflow';

export interface AiCallOptions {
	apiKey: string;
	model: string;
	prompt: string;
	maxTokens?: number;
	temperature?: number;
	apiEndpoint?: string; // Optional custom endpoint
}

export interface AiCallResult {
	text: string;
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		costCents: number;
	};
}

// Decode encrypted API key
function decodeSecret(encrypted: string): string {
	const salt = process.env.SESSION_SECRET || 'dev';
	let decoded: string;
	
	try {
		decoded = Buffer.from(encrypted, 'base64').toString('utf-8');
	} catch (e) {
		// 如果 base64 解码失败，返回原始值
		return encrypted;
	}
	
	let apiKey: string;
	
	// 首先尝试使用当前的 SESSION_SECRET
	if (decoded.startsWith(`${salt}:`)) {
		apiKey = decoded.slice(salt.length + 1);
	} else {
		// SESSION_SECRET 不匹配，尝试从解码后的字符串中提取
		// 格式应该是: "实际的SESSION_SECRET:API_KEY"
		// 查找第一个冒号，冒号后面应该是 API Key
		const colonIndex = decoded.indexOf(':');
		if (colonIndex > 0 && colonIndex < decoded.length - 1) {
			// 找到了冒号，提取冒号后面的部分作为 API Key
			apiKey = decoded.slice(colonIndex + 1);
			const detectedSalt = decoded.slice(0, colonIndex);
			log.warn('SESSION_SECRET 不匹配', {
				detectedSaltLength: detectedSalt.length,
				currentSaltLength: salt.length
			});
			log.warn('已自动从解码后的字符串中提取 API Key');
		} else {
			// 没有找到冒号，可能是旧格式或未编码的数据
			apiKey = decoded;
		}
	}
	
	// 清理 API Key：去除前后空白字符（包括换行符、空格等）
	apiKey = apiKey.trim();
	
	// 检查：如果解码后的 API Key 看起来像 base64 编码的字符串（以 = 结尾，且可以成功 base64 解码）
	// 这可能是历史数据问题，或者用户保存时已经是 base64 编码的
	// 尝试再次 base64 解码
	if (apiKey.length > 0 && (apiKey.endsWith('=') || apiKey.endsWith('==') || apiKey.endsWith('==='))) {
		try {
			const doubleDecoded = Buffer.from(apiKey, 'base64').toString('utf-8');
			// 如果再次解码后看起来像有效的 API Key（以 sk- 开头，或者长度合理）
			if (doubleDecoded.length > 0 && (doubleDecoded.startsWith('sk-') || doubleDecoded.length >= 20)) {
				log.warn('检测到 API Key 可能是双重编码，已自动修复', {
					originalLength: apiKey.length,
					fixedLength: doubleDecoded.length
				});
				return doubleDecoded.trim();
			}
		} catch (e) {
			// 如果 base64 解码失败，说明不是 base64 编码，使用原始值
		}
	}
	
	return apiKey;
}

// Estimate token count (rough approximation: 1 token ≈ 4 characters for Chinese, 1 token ≈ 4 chars for English)
function estimateTokens(text: string): number {
	return Math.ceil(text.length / 3); // Rough estimate
}

// Calculate cost (simplified pricing, adjust based on actual provider pricing)
function calculateCost(provider: AiProvider, model: string, promptTokens: number, completionTokens: number): number {
	// Rough pricing in cents (adjust based on actual pricing)
	const pricing: Record<string, { input: number; output: number }> = {
		'openai:gpt-4o-mini': { input: 0.15, output: 0.6 }, // per 1K tokens
		'openai:gpt-4o': { input: 2.5, output: 10 },
		'siliconflow:default': { input: 0.1, output: 0.4 }, // Usually cheaper
		'qwen:default': { input: 0.08, output: 0.24 }
	};
	
	const key = `${provider}:${model}`;
	const rates = pricing[key] || pricing[`${provider}:default`] || { input: 0.2, output: 0.8 };
	
	const inputCost = (promptTokens / 1000) * rates.input;
	const outputCost = (completionTokens / 1000) * rates.output;
	return Math.ceil((inputCost + outputCost) * 100); // Convert to cents
}

// OpenAI-compatible API call (works for OpenAI and SiliconFlow)
async function callOpenAiCompatible(
	endpoint: string,
	options: AiCallOptions
): Promise<AiCallResult> {
	// Ensure endpoint ends with /v1 or add it
	let apiUrl = endpoint;
	if (!apiUrl.endsWith('/v1') && !apiUrl.endsWith('/v1/')) {
		apiUrl = apiUrl.replace(/\/$/, '') + '/v1';
	}
	
	// 确保 API Key 是干净的（去除前后空白字符）
	const cleanApiKey = options.apiKey.trim();
	
	// 调试日志：显示 API Key 的部分信息（不完整显示，安全考虑）
	if (cleanApiKey.length !== options.apiKey.length) {
		log.warn('API Key 包含空白字符，已自动清理', {
			originalLength: options.apiKey.length,
			cleanedLength: cleanApiKey.length
		});
	}
	log.debug('API Key 信息', {
		prefix: cleanApiKey.substring(0, 4),
		length: cleanApiKey.length
	});
	
	const response = await fetch(`${apiUrl}/chat/completions`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${cleanApiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: options.model,
			messages: [
				{ role: 'user', content: options.prompt }
			],
			max_tokens: options.maxTokens || 2000,
			temperature: options.temperature || 0.7
		})
	});

	// Read response body once
	let data: any;
	try {
		const text = await response.text();
		data = text ? JSON.parse(text) : {};
	} catch (e) {
		data = { error: { message: `响应解析失败: ${await response.text()}` } };
	}

	if (!response.ok) {
		let errorText = '';
		if (data.message) {
			errorText = data.message;
		} else if (data.error?.message) {
			errorText = data.error.message;
		} else if (data.error?.code) {
			errorText = `${data.error.code}: ${data.error.message || '未知错误'}`;
		} else if (typeof data === 'string') {
			errorText = data;
		} else {
			errorText = JSON.stringify(data);
		}
		
		log.error('API调用失败', new Error(errorText), {
			status: response.status,
			endpoint: apiUrl,
			model: options.model,
			response: data
		});
		
		// Provide more helpful error messages
		if (response.status === 503) {
			throw new Error(`服务暂时繁忙，请稍后重试。${errorText ? ` (${errorText})` : ''}`);
		} else if (response.status === 401) {
			// 401可能是API Key问题，也可能是模型权限问题
			if (errorText.toLowerCase().includes('model') || errorText.toLowerCase().includes('permission')) {
				throw new Error(`模型 "${options.model}" 不可用或没有权限。\n请检查：\n1. 模型名称是否正确\n2. 你的账户是否有权限使用该模型\n3. 尝试使用其他模型，如：deepseek-chat, Qwen/Qwen2.5-72B-Instruct`);
			}
			throw new Error(`API Key 无效或已过期。请检查你的 API Key。\n错误详情: ${errorText}`);
		} else if (response.status === 404 || (response.status === 400 && errorText.toLowerCase().includes('model'))) {
			throw new Error(`模型 "${options.model}" 不存在或不可用。\n请检查：\n1. 模型名称是否正确（注意大小写和格式）\n2. 该模型是否在你的账户中可用\n3. 尝试使用其他模型名称，如：deepseek-chat, Qwen/Qwen2.5-72B-Instruct\n错误详情: ${errorText}`);
		} else {
			throw new Error(`API 调用失败 (${response.status}): ${errorText || '未知错误'}`);
		}
	}
	
	// Check for errors in response
	if (data.error) {
		throw new Error(data.error.message || data.error.code || 'API 返回错误');
	}
	
	const text = data.choices?.[0]?.message?.content || '';
	if (!text && data.choices?.length > 0) {
		throw new Error('API 返回空内容，请检查模型是否支持该请求');
	}
	
	const usage = data.usage || {
		prompt_tokens: estimateTokens(options.prompt),
		completion_tokens: estimateTokens(text),
		total_tokens: 0
	};
	usage.total_tokens = usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens);

	return {
		text,
		usage: {
			promptTokens: usage.prompt_tokens,
			completionTokens: usage.completion_tokens,
			totalTokens: usage.total_tokens,
			costCents: 0 // Will be calculated by caller
		}
	};
}

// Call OpenAI
export async function callOpenAi(options: AiCallOptions): Promise<AiCallResult> {
	const result = await callOpenAiCompatible('https://api.openai.com/v1', options);
	result.usage.costCents = calculateCost('openai', options.model, result.usage.promptTokens, result.usage.completionTokens);
	return result;
}

// Call SiliconFlow (OpenAI-compatible)
export async function callSiliconFlow(options: AiCallOptions, customEndpoint?: string): Promise<AiCallResult> {
	const endpoint = customEndpoint || 'https://api.siliconflow.cn/v1';
	const result = await callOpenAiCompatible(endpoint, options);
	result.usage.costCents = calculateCost('siliconflow', options.model, result.usage.promptTokens, result.usage.completionTokens);
	return result;
}

// Call Qwen (Alibaba Cloud)
export async function callQwen(options: AiCallOptions): Promise<AiCallResult> {
	// Qwen uses different API format, implement if needed
	// For now, use OpenAI-compatible format if Qwen supports it
	const result = await callOpenAiCompatible('https://dashscope.aliyuncs.com/api/v1', options);
	result.usage.costCents = calculateCost('qwen', options.model, result.usage.promptTokens, result.usage.completionTokens);
	return result;
}

// Main adapter function
export async function callAiProvider(
	provider: AiProvider,
	options: AiCallOptions
): Promise<AiCallResult> {
	switch (provider) {
		case 'openai':
			return callOpenAi(options);
		case 'siliconflow':
			return callSiliconFlow(options, options.apiEndpoint);
		case 'qwen':
			return callQwen(options);
		default:
			throw new Error(`Unsupported provider: ${provider}`);
	}
}

// Get API key from config (decoded)
export function getApiKeyFromConfig(encApiKey: string): string {
	return decodeSecret(encApiKey);
}

// ==================== 流式输出相关 ====================

export interface AiStreamOptions extends Omit<AiCallOptions, 'prompt'> {
	onChunk?: (chunk: string) => void; // 流式回调
	messages?: Array<{ role: 'user' | 'assistant'; content: string }>; // OpenAI格式的消息数组
	prompt?: string; // 兼容旧格式
}

/**
 * 流式调用 OpenAI-compatible API
 */
export async function callOpenAiCompatibleStream(
	endpoint: string,
	options: AiStreamOptions
): Promise<ReadableStream<Uint8Array>> {
	// Ensure endpoint ends with /v1 or add it
	let apiUrl = endpoint;
	if (!apiUrl.endsWith('/v1') && !apiUrl.endsWith('/v1/')) {
		apiUrl = apiUrl.replace(/\/$/, '') + '/v1';
	}

	// 确保 API Key 是干净的
	const cleanApiKey = options.apiKey.trim();

	// 构建消息数组
	let messages: Array<{ role: 'user' | 'assistant'; content: string }>;
	if (options.messages && options.messages.length > 0) {
		messages = options.messages;
	} else if (options.prompt) {
		// 兼容旧格式：使用prompt字符串
		messages = [{ role: 'user', content: options.prompt }];
	} else {
		throw new Error('必须提供 messages 或 prompt');
	}

	// 构建请求体
	const requestBody: any = {
		model: options.model,
		messages: messages,
		max_tokens: options.maxTokens || 2000,
		temperature: options.temperature || 0.7,
		stream: true // 关键：启用流式输出
	};

	// DeepSeek-V3 特殊处理
	const isDeepSeek = options.model.toLowerCase().includes('deepseek');
	const isDeepSeekV3 = options.model.toLowerCase().includes('deepseek-v3');
	
	if (isDeepSeek) {
		// DeepSeek-V3 可能需要这些参数
		requestBody.top_p = 0.95;
		// 确保 max_tokens 足够大
		if (!requestBody.max_tokens || requestBody.max_tokens < 100) {
			requestBody.max_tokens = 100;
		}
		
		// DeepSeek-V3 特殊处理：可能需要禁用 reasoning 或使用特殊参数
		if (isDeepSeekV3) {
			// 尝试禁用 reasoning_content，只返回实际回复
			// 根据 DeepSeek-V3 文档，可能需要设置这些参数
			requestBody.reasoning_effort = 'low'; // 降低推理努力
			// 或者尝试禁用 reasoning
			// requestBody.enable_reasoning = false; // 如果API支持
			log.debug('DeepSeek-V3 模型检测到，添加特殊参数', {
				top_p: requestBody.top_p,
				max_tokens: requestBody.max_tokens,
				reasoning_effort: requestBody.reasoning_effort
			});
		} else {
			log.debug('DeepSeek模型检测到，添加特殊参数', {
				top_p: requestBody.top_p,
				max_tokens: requestBody.max_tokens
			});
		}
	}

	log.debug('调用API', {
		endpoint: `${apiUrl}/chat/completions`,
		model: options.model,
		messagesCount: messages.length,
		hasApiKey: !!cleanApiKey
	});

	// 创建 AbortController 用于超时控制（10分钟超时）
	const fetchController = new AbortController();
	const fetchTimeout = setTimeout(() => {
		fetchController.abort();
	}, 10 * 60 * 1000); // 10分钟

	try {
		const response = await fetch(`${apiUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${cleanApiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody),
			signal: fetchController.signal,
			keepalive: true // 保持连接活跃
		});
		
		clearTimeout(fetchTimeout);

		log.debug('API响应状态', { status: response.status, statusText: response.statusText });

		if (!response.ok) {
			const error = await response.json().catch(() => ({})) as any;
			log.error('API调用失败', error as Error);
			throw new Error(
				error?.error?.message || `API 调用失败: ${response.status} ${response.statusText}`
			);
		}

		log.debug('API调用成功，返回流式响应');

		// 返回 ReadableStream
		if (!response.body) {
			throw new Error('响应体为空');
		}

		return response.body;
	} catch (error: any) {
		clearTimeout(fetchTimeout);
		if (error.name === 'AbortError') {
			throw new Error('请求超时，请稍后重试');
		}
		throw error;
	}
}

/**
 * 解析流式响应
 */
export async function* parseStreamResponse(
	stream: ReadableStream<Uint8Array>
): AsyncGenerator<{ text: string; done: boolean; usage?: any }> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let chunkCount = 0;
	let totalText = '';
	let savedUsage: any = null; // 保存usage，等收到content后再返回
	let reasoningContentCount = 0; // 统计收到的reasoning_content数量

	log.debug('开始解析流式响应');

		// 设置超时时间（5分钟），防止无限等待单个chunk
		// 注意：这个超时是针对单个chunk的等待时间，不是整个流的超时
		// AI生成可能需要较长时间，特别是长文本生成
		const chunkTimeout = 300000; // 5分钟
		let lastChunkTime = Date.now();
		
		try {
			
			while (true) {
				// 检查单个chunk超时（如果5分钟没有收到新chunk，认为连接中断）
				if (Date.now() - lastChunkTime > chunkTimeout) {
					log.error('超时：等待content chunk超过5分钟', new Error('Chunk timeout'), {
						contentLength: totalText.length
					});
					try {
						reader.cancel(); // 取消读取
					} catch (e) {
						log.error('取消reader失败', e as Error);
					}
					// 即使超时，也返回已生成的内容
					if (totalText.length > 0) {
						log.warn('超时但已有内容，返回已生成部分');
						if (savedUsage) {
							yield {
								text: '',
								done: true,
								usage: savedUsage
							};
						}
					}
					break;
				}
				
				// 为 read() 添加超时保护（60秒），避免无限等待单个chunk
				// 但不会中断整个流，只是记录警告
				let readResult;
				try {
					const readPromise = reader.read();
					const readTimeout = setTimeout(() => {
						log.warn('单个read()操作超过60秒，但继续等待');
					}, 60000);
					
					readResult = await readPromise;
					clearTimeout(readTimeout);
				} catch (readErr: any) {
					log.error('read() 抛出错误', readErr as Error, {
						totalTextLength: totalText.length
					});
					// 如果已有内容，返回已生成的部分
					if (totalText.length > 0) {
						log.warn('read()错误但已有内容，返回已生成部分');
						if (savedUsage) {
							yield {
								text: '',
								done: true,
								usage: savedUsage
							};
						}
					}
					throw readErr;
				}
				
				const { done, value } = readResult;
				
				// 更新最后收到chunk的时间（每次收到数据都重置）
				if (!done && value && value.length > 0) {
					lastChunkTime = Date.now();
					log.debug('收到chunk，重置超时计时器', { size: value.length });
				}
				
				if (done) {
					log.debug('流结束', { chunkCount, totalTextLength: totalText.length, reasoningContentCount });
					if (chunkCount === 0) {
						log.error('严重问题：流结束但没有收到任何content chunk', new Error('No content chunks'), {
							reasoningContentCount
						});
					}
					break;
				}

			const decoded = decoder.decode(value, { stream: true });
			if (chunkCount === 0 && decoded.length > 0) {
				log.debug('收到第一批数据', { length: decoded.length });
				// 查找第一个完整的JSON对象来查看结构
				const firstDataMatch = decoded.match(/data:\s*(\{.*?\})/);
				if (firstDataMatch) {
					try {
						const firstJson = JSON.parse(firstDataMatch[1]);
						log.debug('第一个数据包结构', { structure: JSON.stringify(firstJson, null, 2).substring(0, 1000) });
					} catch (e) {
						log.debug('数据预览', { preview: decoded.substring(0, 500) });
					}
				} else {
					log.debug('数据预览', { preview: decoded.substring(0, 500) });
				}
			}
			
			buffer += decoded;
			const lines = buffer.split('\n');
			buffer = lines.pop() || ''; // 保留最后一个不完整的行

			for (const line of lines) {
				if (!line.trim()) continue; // 跳过空行

				if (line.startsWith('data: ')) {
					const data = line.slice(6).trim();
					if (data === '[DONE]') {
						log.debug('收到 [DONE] 标记');
						yield { text: '', done: true };
						return;
					}

					if (!data) continue; // 跳过空数据

					try {
						const json = JSON.parse(data);
						
						// 调试：打印第一个数据包的完整结构
						if (chunkCount === 0 && !json.usage) {
							const delta = json.choices?.[0]?.delta || {};
							log.debug('第一个数据包完整结构', {
								model: json.model,
								choices: json.choices?.map((c: any) => ({
									index: c.index,
									delta: {
										hasContent: !!c.delta?.content,
										contentLength: c.delta?.content?.length || 0,
										hasReasoningContent: !!c.delta?.reasoning_content,
										reasoningContentLength: c.delta?.reasoning_content?.length || 0,
										deltaKeys: Object.keys(c.delta || {})
									},
									finish_reason: c.finish_reason
								})),
								usage: json.usage
							});
						}
						
						// 检查是否有delta content（流式chunk）
						const delta = json.choices?.[0]?.delta || {};
						const deltaContent = delta.content;
						
						// DeepSeek-V3 的特殊处理：
						// - 第一个chunk可能只有 reasoning_content（思考过程）
						// - 后续chunk才有 content（实际回复）
						// - 我们需要等待 content 出现
						if (deltaContent !== undefined && deltaContent !== null) {
							// 即使内容为空字符串，也记录（可能是AI在思考）
							if (deltaContent.trim()) {
								chunkCount++;
								totalText += deltaContent;
								log.debug(`Chunk ${chunkCount}`, { totalLength: totalText.length });
								yield { text: deltaContent, done: false };
							} else {
								// 空内容，记录但不yield（可能是AI在思考或格式化）
								log.debug('收到空内容chunk，继续等待');
							}
						} else if (delta.reasoning_content) {
							// DeepSeek-V3 的 reasoning_content（思考过程），我们跳过
							// 只记录日志，不yield内容
							if (chunkCount === 0) {
								log.debug('收到 reasoning_content（思考过程），等待 content（实际回复）');
							}
						} else {
							// 如果没有delta content，检查其他可能的结构
							if (json.choices?.[0]?.message?.content) {
								// 非流式响应格式
								const content = json.choices[0].message.content;
								log.warn('收到非流式内容', { preview: content.substring(0, 50) });
								chunkCount++;
								totalText += content;
								yield { text: content, done: false };
							} else if (json.choices?.[0]?.text) {
								// 旧版API格式
								const content = json.choices[0].text;
								log.warn('收到旧格式内容', { preview: content.substring(0, 50) });
								chunkCount++;
								totalText += content;
								yield { text: content, done: false };
							} else if (chunkCount === 0 && !json.usage) {
								// 第一个数据包没有内容，记录结构用于调试
								log.warn('第一个数据包没有内容', { structure: JSON.stringify(json, null, 2).substring(0, 500) });
							}
						}

						// 检查是否有finish_reason（流结束）
						const finishReason = json.choices?.[0]?.finish_reason;
						if (finishReason) {
							log.debug('收到finish_reason', { finishReason, totalTextLength: totalText.length, chunkCount });
							// 如果finish_reason出现但内容很短，记录警告并继续等待
							if (totalText.length < 10 && chunkCount > 0) {
								log.error('警告：流过早结束', new Error('Stream ended too early'), {
									finishReason,
									contentLength: totalText.length,
									structure: JSON.stringify(json, null, 2).substring(0, 1000)
								});
								// 即使finish_reason出现，如果内容很短，继续等待更多内容
								// 因为可能是AI服务端的误报或网络问题
							}
							// 如果finish_reason出现，继续等待usage信息和更多content chunk
							// 不要立即返回，因为可能还有后续的content chunk
							// 只有在流真正结束（done: true）时才返回
						}

						// 如果包含 usage 信息（最后一条消息）
						// 注意：usage 可能在 content 之前到达（特别是 DeepSeek-V3）
						// 所以不能立即返回，需要继续等待 content
						if (json.usage) {
							log.debug('收到usage信息', { usage: json.usage, totalTextLength: totalText.length, chunkCount });
							// 保存usage，但不要立即返回
							// 因为可能还有后续的content chunk
							savedUsage = json.usage;
							
							// 检查completion_tokens，判断是否真的完成了
							const completionTokens = json.usage.completion_tokens || 0;
							if (completionTokens > 0) {
								// 如果completion_tokens > 0，说明AI生成了内容
								// 但可能content chunk还在后面，继续等待
								log.debug('completion_tokens > 0，说明AI生成了内容，继续等待content chunk', {
									currentLength: totalText.length,
									expectedTokens: completionTokens
								});
								// 不返回，继续循环等待content
							} else if (completionTokens === 0) {
								// completion_tokens为0，可能真的没有内容
								log.error('completion_tokens为0，AI没有生成任何内容', new Error('No completion tokens'), {
									possibleReasons: [
										'模型配置问题（可能需要禁用reasoning_content）',
										'请求参数问题（max_tokens、temperature等）',
										'API Key权限问题'
									]
								});
								// 即使completion_tokens为0，也继续等待，因为可能有content chunk
							}
							// 不返回，继续循环等待content（即使收到usage，也可能还有content chunk）
						}
					} catch (e) {
						log.error('JSON解析错误', e as Error, { data: data.substring(0, 200) });
						// 忽略解析错误（可能是空行或其他格式）
					}
				}
			}
		}

		// 如果流结束，发送done信号（如果有保存的usage）
		if (totalText.length > 0) {
			log.debug('流自然结束', { totalTextLength: totalText.length });
			// 如果有保存的usage，现在发送
			if (savedUsage) {
				yield {
					text: '',
					done: true,
					usage: savedUsage
				};
			}
		} else {
			log.error('严重问题：流结束但没有收到任何content', new Error('No content received'), {
				reasoningContentCount,
				chunkCount,
				totalTextLength: totalText.length,
				possibleReasons: [
					'AI模型没有生成内容（completion_tokens=0）',
					'流式响应格式不匹配（可能只有reasoning_content）',
					'需要等待更长时间才能收到content chunk',
					'DeepSeek-V3可能需要特殊参数来禁用reasoning_content'
				]
			});
			// 即使没有content，也要发送done信号（带usage），让前端知道流结束了
			if (savedUsage) {
				log.warn('发送done信号（即使没有content）');
				yield {
					text: '',
					done: true,
					usage: savedUsage
				};
			}
		}
		} finally {
			// 释放 reader
			try {
				reader.releaseLock();
			} catch (e) {
				// 忽略释放错误（可能已经释放）
			}
		}
}

