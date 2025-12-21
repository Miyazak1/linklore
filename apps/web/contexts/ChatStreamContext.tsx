'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('ChatStreamContext');

interface StreamState {
	messageId: string;
	roomId: string;
	content: string;
	isStreaming: boolean;
	error: string | null;
}

interface ChatStreamContextType {
	activeStreams: Map<string, StreamState>;
	startStream: (
		messageId: string,
		roomId: string,
		prompt: string,
		context?: Array<{ role: 'user' | 'assistant'; content: string }>,
		taskType?: 'structure' | 'tone' | 'consensus' | 'library',
		pluginType?: 'concept_clarifier' | 'reasoning_analyzer' | 'counter_perspective' | 'socratic_guide' | 'writing_structurer' | 'learning_navigator' | 'thought_log' | 'practice_framework',
		facilitatorMode?: 'v1' | 'v2' | 'v3'
	) => void;
	stopStream: (messageId: string) => void;
	getStreamState: (messageId: string) => StreamState | undefined;
	clearStream: (messageId: string) => void;
}

const ChatStreamContext = createContext<ChatStreamContextType | undefined>(undefined);

export function ChatStreamProvider({ children }: { children: React.ReactNode }) {
	const [activeStreams, setActiveStreams] = useState<Map<string, StreamState>>(new Map());
	const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

	const startStream = useCallback(
		async (
			messageId: string,
			roomId: string,
			prompt: string,
			context?: Array<{ role: 'user' | 'assistant'; content: string }>,
			taskType?: 'structure' | 'tone' | 'consensus' | 'library',
			pluginType?: 'concept_clarifier' | 'reasoning_analyzer' | 'counter_perspective' | 'socratic_guide' | 'writing_structurer' | 'learning_navigator' | 'thought_log' | 'practice_framework',
			facilitatorMode?: 'v1' | 'v2' | 'v3',
			aiRole?: 'assistant' | 'facilitator'
		) => {
			// 如果已有相同messageId的流，先停止它
			if (abortControllersRef.current.has(messageId)) {
				abortControllersRef.current.get(messageId)?.abort();
			}

			// 创建新的AbortController
			const abortController = new AbortController();
			abortControllersRef.current.set(messageId, abortController);

			// 初始化流状态
			setActiveStreams((prev) => {
				const newMap = new Map(prev);
				newMap.set(messageId, {
					messageId,
					roomId,
					content: '',
					isStreaming: true,
					error: null
				});
				return newMap;
			});

			try {
				const requestBody: any = {
					messageId,
					prompt,
					roomId,
					context
				};

				// 如果有 taskType，添加到请求体（DUO 房间）
				if (taskType) {
					requestBody.taskType = taskType;
				}

				// 如果有 pluginType，添加到请求体（SOLO 房间）
				if (pluginType) {
					requestBody.pluginType = pluginType;
				}

				// 如果有 facilitatorMode，添加到请求体（DUO 房间）
				if (facilitatorMode) {
					requestBody.facilitatorMode = facilitatorMode;
				}

				// 如果有 aiRole，添加到请求体
				if (aiRole) {
					requestBody.aiRole = aiRole;
				}

				log.debug('发送流式请求', {
					messageId,
					roomId,
					promptLength: prompt.length,
					contextLength: context?.length || 0,
					taskType,
					pluginType,
					facilitatorMode,
					aiRole,
				});
				
				let response: Response;
				try {
					response = await fetch('/api/chat/ai/stream', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(requestBody),
						signal: abortController.signal
					});
					log.debug('收到响应', {
						status: response.status,
						statusText: response.statusText,
						ok: response.ok,
					});
				} catch (fetchError: any) {
					log.error('fetch请求失败', fetchError, {
						messageId,
						roomId
					});
					throw fetchError;
				}

				if (!response.ok) {
					let errorMessage = `HTTP error! status: ${response.status}`;
					let errorDetails: any = null;
					
					try {
						// 先尝试读取 JSON
						const contentType = response.headers.get('content-type');
						if (contentType && contentType.includes('application/json')) {
							const errorData = await response.json();
							errorMessage = errorData.error || errorData.message || errorMessage;
							errorDetails = errorData.details || errorData || null;
						} else {
							// 如果不是 JSON，尝试读取文本
							const text = await response.text();
							if (text) {
								try {
									// 尝试解析为 JSON
									const parsed = JSON.parse(text);
									errorMessage = parsed.error || parsed.message || errorMessage;
									errorDetails = parsed.details || parsed || null;
								} catch (parseError) {
									// 如果解析失败，使用原始文本
									errorMessage = text.substring(0, 500); // 限制长度
									errorDetails = { rawText: text };
								}
							}
						}
					} catch (e: any) {
						// 如果读取响应失败，记录错误但继续使用默认错误信息
						log.error('读取错误响应失败', e, {
							status: response.status,
							statusText: response.statusText,
						});
						errorMessage = `HTTP ${response.status}: ${response.statusText || '未知错误'}`;
					}
					
					const httpError = new Error(errorMessage);
					(httpError as any).status = response.status;
					(httpError as any).details = errorDetails;
					(httpError as any).statusText = response.statusText;
					throw httpError;
				}

				const reader = response.body?.getReader();
				if (!reader) {
					throw new Error('No response body');
				}

				const decoder = new TextDecoder();
				let buffer = '';
				let chunkCount = 0;
				let currentEvent: string | null = null; // 当前SSE事件类型

				log.debug('开始读取流式数据');

				// 设置超时保护（15分钟，给AI生成足够的时间）
				const timeoutId = setTimeout(() => {
					log.warn('流读取超时（15分钟），中止连接');
					abortController.abort();
				}, 15 * 60 * 1000);

				while (true) {
					try {
						// 检查是否被中止
						if (abortController.signal.aborted) {
							log.debug('流被中止');
							clearTimeout(timeoutId);
							// 尝试释放 reader
							try {
								reader.releaseLock();
							} catch (releaseErr) {
								// 忽略释放错误
							}
							break;
						}

						let readResult;
						try {
							// 为 read() 添加超时保护（30秒），避免无限等待
							const readPromise = reader.read();
							const timeoutPromise = new Promise<{ done: true; value: undefined }>((_, reject) => {
								setTimeout(() => {
									reject(new Error('读取超时（30秒）'));
								}, 30000);
							});
							
							readResult = await Promise.race([readPromise, timeoutPromise]);
						} catch (readErr: any) {
							// 如果 read() 本身抛出错误，需要特殊处理
							log.error('reader.read() 抛出错误', readErr, {
								messageId,
								isTimeout: readErr?.message?.includes('超时')
							});
							
							// 如果是超时，尝试继续读取（可能是网络延迟）
							if (readErr?.message?.includes('超时')) {
								log.warn('读取超时，尝试继续');
								try {
									readResult = await reader.read();
								} catch (retryErr: any) {
									// 重试也失败，释放 reader 并抛出错误
									try {
										reader.releaseLock();
									} catch (releaseErr) {
										log.error('释放 reader 失败', releaseErr);
									}
									throw retryErr;
								}
							} else {
								// 其他错误，尝试释放 reader
								try {
									reader.releaseLock();
								} catch (releaseErr) {
									log.error('释放 reader 失败', releaseErr);
								}
								throw readErr; // 重新抛出，让外层 catch 处理
							}
						}
						
						const { done, value } = readResult;

						if (done) {
							log.debug('流读取完成', { chunkCount });
							clearTimeout(timeoutId);
							// 尝试释放 reader
							try {
								reader.releaseLock();
							} catch (releaseErr) {
								// 忽略释放错误
							}
							// 如果流正常结束但没有收到fullText，标记为完成
							setActiveStreams((prev) => {
								const newMap = new Map(prev);
								const current = newMap.get(messageId);
								if (current && current.isStreaming) {
									newMap.set(messageId, {
										...current,
										isStreaming: false
									});
								}
								return newMap;
							});
							break;
						}

						chunkCount++;
						buffer += decoder.decode(value, { stream: true });
						const lines = buffer.split('\n');
						buffer = lines.pop() || '';

						for (const line of lines) {
							if (!line.trim()) continue; // 跳过空行
							
							if (line.startsWith('event: ')) {
								currentEvent = line.slice(7).trim();
								log.debug('收到事件', { event: currentEvent });
								continue;
							}

							if (line.startsWith('data: ')) {
								const data = line.slice(6).trim();
								if (data === '[DONE]' || data === '') {
									log.debug('收到[DONE]标记或空数据');
									// 如果是done事件且收到[DONE]标记，标记流完成
									if (currentEvent === 'done') {
										clearTimeout(timeoutId);
										setActiveStreams((prev) => {
											const newMap = new Map(prev);
											const current = newMap.get(messageId);
											if (current) {
												newMap.set(messageId, {
													...current,
													isStreaming: false
												});
											}
											return newMap;
										});
										abortControllersRef.current.delete(messageId);
										break;
									}
									continue;
								}

								try {
									const parsed = JSON.parse(data);

									// 处理 done 事件（优先检查，确保流状态正确更新）
									if (currentEvent === 'done' || parsed.fullText !== undefined) {
										// 流完成
										clearTimeout(timeoutId);
										setActiveStreams((prev) => {
											const newMap = new Map(prev);
											const current = newMap.get(messageId);
											if (current) {
												const finalContent = parsed.fullText || current.content || '';
												newMap.set(messageId, {
													...current,
													content: finalContent,
													isStreaming: false
												});
												log.debug('✅ 流完成，更新状态为isStreaming=false', { 
													messageId, 
													contentLength: finalContent.length,
													wasStreaming: current.isStreaming
												});
											}
											return newMap;
										});
										abortControllersRef.current.delete(messageId);
										// 延迟删除流状态，给客户端时间检测到状态变化
										setTimeout(() => {
											setActiveStreams((prev) => {
												const newMap = new Map(prev);
												newMap.delete(messageId);
												log.debug('🗑️ 延迟删除流状态', { messageId });
												return newMap;
											});
										}, 2000); // 2秒后删除，确保客户端有时间检测
										break;
									}

									// 处理 chunk 事件（兼容 text 和 chunk 两种格式）
									if (parsed.text) {
										// 更新流内容
										setActiveStreams((prev) => {
											const newMap = new Map(prev);
											const current = newMap.get(messageId);
											if (current) {
												const newContent = current.content + parsed.text;
												log.debug('收到chunk并更新内容', {
													messageId,
													chunkLength: parsed.text.length,
													oldLength: current.content.length,
													newLength: newContent.length,
												});
												newMap.set(messageId, {
													...current,
													content: newContent
												});
											}
											return newMap;
										});
									}

									if (parsed.error) {
										const errorMsg = typeof parsed.error === 'string' 
											? parsed.error 
											: parsed.error.message || JSON.stringify(parsed.error);
										
										log.error('收到错误事件', new Error(errorMsg), {
											messageId,
											parsedError: parsed.error
										});
										
										clearTimeout(timeoutId);
										setActiveStreams((prev) => {
											const newMap = new Map(prev);
											const current = newMap.get(messageId);
											if (current) {
												newMap.set(messageId, {
													...current,
													isStreaming: false,
													error: errorMsg
												});
											}
											return newMap;
										});
										abortControllersRef.current.delete(messageId);
										break;
									}
								} catch (e) {
									log.error('Failed to parse SSE data', e as Error, {
										line: line.substring(0, 100),
										messageId
									});
								}
							}
						}
					} catch (readError: any) {
						// 提取错误信息，确保即使错误对象为空也能显示有用信息
						let errorMessage = '流读取中断';
						let errorName = 'UnknownError';
						let errorStack: string | undefined = undefined;
						let errorType = typeof readError;
						let errorString = String(readError);
						
						if (readError) {
							if (typeof readError === 'string') {
								errorMessage = readError;
								errorString = readError;
							} else if (readError instanceof Error) {
								errorMessage = readError.message || readError.toString() || errorMessage;
								errorName = readError.name || errorName;
								errorStack = readError.stack;
								errorString = readError.toString();
							} else if (readError.message) {
								errorMessage = readError.message;
								errorName = readError.name || errorName;
								errorStack = readError.stack;
								try {
									errorString = String(readError);
								} catch (e) {
									errorString = '[无法转换为字符串]';
								}
							} else if (readError.toString && typeof readError.toString === 'function') {
								try {
									errorString = readError.toString();
									errorMessage = errorString;
								} catch (e) {
									errorMessage = '无法序列化错误对象';
									errorString = '[toString() 失败]';
								}
							} else {
								// 尝试 JSON 序列化
								try {
									errorString = JSON.stringify(readError);
									errorMessage = errorString !== '{}' ? errorString : '错误对象为空';
								} catch (e) {
									errorMessage = '错误对象无法序列化';
									errorString = '[JSON.stringify() 失败]';
								}
							}
						} else {
							errorMessage = '错误对象为 null 或 undefined';
							errorString = '[null/undefined]';
						}
						
						// 构建详细的错误日志对象
						const errorLog: any = {
							message: errorMessage,
							name: errorName,
							type: errorType,
							string: errorString,
							messageId,
							chunkCount,
							isAbort: errorName === 'AbortError' || abortController.signal.aborted
						};
						
						// 只有在有值时才添加这些字段
						if (errorStack) {
							errorLog.stack = errorStack;
						}
						
						// 尝试添加原始错误信息（如果可能）
						if (readError && typeof readError === 'object') {
							try {
								const errorKeys = Object.keys(readError);
								if (errorKeys.length > 0) {
									errorLog.errorKeys = errorKeys;
									// 尝试获取一些常见属性
									if ('code' in readError) errorLog.code = (readError as any).code;
									if ('cause' in readError) errorLog.cause = String((readError as any).cause);
								}
							} catch (e) {
								// 忽略
							}
						}
						
						log.error('读取流时出错', new Error(errorMessage), errorLog);
						
						clearTimeout(timeoutId);
						
						// 尝试释放 reader
						try {
							reader.releaseLock();
						} catch (releaseErr) {
							log.error('释放 reader 失败', releaseErr as Error);
						}
						
						// 如果是主动中止，不更新错误状态
						if (errorName === 'AbortError' || abortController.signal.aborted) {
							log.debug('流被主动中止，不更新错误状态');
							break;
						}
						
						// 如果读取出错，更新状态并退出循环（保留已生成的内容）
						setActiveStreams((prev) => {
							const newMap = new Map(prev);
							const current = newMap.get(messageId);
							if (current) {
								// 保留已生成的内容，只标记为不再流式输出
								newMap.set(messageId, {
									...current,
									isStreaming: false,
									error: errorMessage,
									// content 保持不变，保留已生成的部分
								});
							}
							return newMap;
						});
						abortControllersRef.current.delete(messageId);
						break;
					}
				}
					
				log.debug('流读取循环结束', { messageId });
				
				// 如果流正常结束但仍在流式状态，标记为完成（保留已生成的内容）
				setActiveStreams((prev) => {
					const newMap = new Map(prev);
					const current = newMap.get(messageId);
					if (current && current.isStreaming) {
						log.debug('流循环结束但仍在流式状态，标记为完成', { contentLength: current.content.length });
						newMap.set(messageId, {
							...current,
							isStreaming: false
						});
					}
					return newMap;
				});
			} catch (error: any) {
				// 更详细的错误信息提取
				let errorMessage = '流式输出失败';
				let errorName = 'UnknownError';
				let errorDetails: any = null;
				
				if (error) {
					if (typeof error === 'string') {
						errorMessage = error;
					} else if (error instanceof Error) {
						errorMessage = error.message || error.toString();
						errorName = error.name || 'Error';
						errorDetails = {
							status: (error as any).status,
							details: (error as any).details,
							statusText: (error as any).statusText,
							stack: error.stack
						};
					} else if (error.message) {
						errorMessage = error.message;
						errorName = error.name || 'Error';
						errorDetails = {
							status: error.status,
							details: error.details,
							statusText: error.statusText,
							stack: error.stack
						};
					} else {
						try {
							errorMessage = JSON.stringify(error);
							errorDetails = error;
						} catch (e) {
							errorMessage = String(error);
							errorDetails = { raw: error };
						}
					}
				}
				
				// 如果 errorMessage 为空，尝试从 errorDetails 中提取
				if (!errorMessage || errorMessage === '流式输出失败') {
					if (errorDetails?.details) {
						errorMessage = typeof errorDetails.details === 'string' 
							? errorDetails.details 
							: JSON.stringify(errorDetails.details);
					} else if (errorDetails?.error) {
						errorMessage = typeof errorDetails.error === 'string'
							? errorDetails.error
							: JSON.stringify(errorDetails.error);
					} else if (errorDetails?.message) {
						errorMessage = typeof errorDetails.message === 'string'
							? errorDetails.message
							: JSON.stringify(errorDetails.message);
					}
				}
				
				log.error('流式输出异常', error as Error, {
					messageId,
					roomId,
					errorMessage: errorMessage || '未知错误',
					errorName,
					errorType: typeof error,
					errorDetails,
				});
				
				if (errorName === 'AbortError' || error?.name === 'AbortError') {
					// 流被主动中止，不更新错误状态
					log.debug('流被主动中止', { messageId });
					return;
				}

				setActiveStreams((prev) => {
					const newMap = new Map(prev);
					const current = newMap.get(messageId);
					if (current) {
						newMap.set(messageId, {
							...current,
							isStreaming: false,
							error: errorMessage
						});
					}
					return newMap;
				});
				abortControllersRef.current.delete(messageId);
			}
		},
		[]
	);

	const stopStream = useCallback((messageId: string) => {
		const controller = abortControllersRef.current.get(messageId);
		if (controller) {
			controller.abort();
			abortControllersRef.current.delete(messageId);
		}

		setActiveStreams((prev) => {
			const newMap = new Map(prev);
			const current = newMap.get(messageId);
			if (current) {
				newMap.set(messageId, {
					...current,
					isStreaming: false
				});
			}
			return newMap;
		});
	}, []);

	const getStreamState = useCallback(
		(messageId: string) => {
			return activeStreams.get(messageId);
		},
		// 使用activeStreams.size作为依赖，避免因Map对象引用变化导致无限循环
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[activeStreams.size]
	);

	const clearStream = useCallback((messageId: string) => {
		stopStream(messageId);
		setActiveStreams((prev) => {
			const newMap = new Map(prev);
			newMap.delete(messageId);
			return newMap;
		});
	}, [stopStream]);

	// 清理：组件卸载时，只清理引用，不中断流
	useEffect(() => {
		return () => {
			// 不在这里中止流，让它们继续运行
			// abortControllersRef.current.clear();
		};
	}, []);

	return (
		<ChatStreamContext.Provider
			value={{
				activeStreams,
				startStream,
				stopStream,
				getStreamState,
				clearStream
			}}
		>
			{children}
		</ChatStreamContext.Provider>
	);
}

export function useChatStream() {
	const context = useContext(ChatStreamContext);
	if (context === undefined) {
		throw new Error('useChatStream must be used within a ChatStreamProvider');
	}
	return context;
}
