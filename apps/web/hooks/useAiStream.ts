/**
 * React Hook for AI 流式输出
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAiStreamOptions {
	onComplete?: (fullText: string, usage?: any) => void;
	onError?: (error: string) => void;
}

export function useAiStream(options: UseAiStreamOptions = {}) {
	const [streaming, setStreaming] = useState(false);
	const [currentText, setCurrentText] = useState('');
	const eventSourceRef = useRef<EventSource | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	const startStream = useCallback(
		async (
			messageId: string,
			prompt: string,
			roomId: string,
			context?: Array<{ role: 'user' | 'assistant'; content: string }>,
			provider?: string,
			model?: string,
			apiKey?: string,
			apiEndpoint?: string
		) => {
			if (streaming) {
				console.warn('[useAiStream] Already streaming');
				return;
			}

			setStreaming(true);
			setCurrentText('');

			console.log('[useAiStream] 开始流式输出，参数:', {
				messageId,
				prompt: prompt.substring(0, 50) + '...',
				roomId,
				contextLength: context?.length || 0
			});

			try {
				// 创建 AbortController 用于取消请求
				const abortController = new AbortController();
				abortControllerRef.current = abortController;

				console.log('[useAiStream] 发送请求到 /api/chat/ai/stream');
				
				// 先创建消息记录（如果还没有）
				const response = await fetch('/api/chat/ai/stream', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messageId,
						prompt,
						roomId,
						context,
						provider,
						model,
						apiKey,
						apiEndpoint
					}),
					signal: abortController.signal
				});

				console.log('[useAiStream] 收到响应，status:', response.status, 'ok:', response.ok);
				
				if (!response.ok) {
					const error = await response.json().catch(() => ({ error: '未知错误' }));
					console.error('[useAiStream] 响应错误:', error);
					throw new Error(error.error || '启动流式输出失败');
				}
				
				console.log('[useAiStream] 响应成功，开始读取流');

				// 使用 fetch + ReadableStream 接收 SSE
				const reader = response.body?.getReader();
				if (!reader) {
					throw new Error('无法读取响应流');
				}

				const decoder = new TextDecoder();
				let buffer = '';
				let currentEvent = '';

				console.log('[useAiStream] Starting to read stream...');

				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						console.log('[useAiStream] Stream ended');
						break;
					}

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || ''; // 保留最后一个不完整的行

					for (const line of lines) {
						if (!line.trim()) continue; // 跳过空行

						if (line.startsWith('event: ')) {
							currentEvent = line.slice(7).trim();
							console.log('[useAiStream] Event:', currentEvent);
							continue;
						}

						if (line.startsWith('data: ')) {
							const data = line.slice(6);
							console.log('[useAiStream] Data received:', data.substring(0, 100));
							
							try {
								const parsed = JSON.parse(data);

								if (currentEvent === 'chunk' || parsed.text !== undefined) {
									// chunk 事件
									const text = parsed.text || '';
									if (text) {
										console.log('[useAiStream] Chunk:', text);
										setCurrentText((prev) => prev + text);
									}
								} else if (currentEvent === 'done' || parsed.fullText !== undefined) {
									// done 事件
									const fullText = parsed.fullText || currentText;
									console.log('[useAiStream] Done, fullText length:', fullText.length);
									setCurrentText(fullText);
									setStreaming(false);
									options.onComplete?.(fullText, parsed.usage);
									return;
								} else if (currentEvent === 'error' || parsed.error) {
									// error 事件
									const errorMsg = parsed.error || '未知错误';
									console.error('[useAiStream] Error:', errorMsg);
									setStreaming(false);
									options.onError?.(errorMsg);
									return;
								}
							} catch (e) {
								console.error('[useAiStream] Parse error:', e, 'Data:', data);
								// 忽略解析错误，继续处理
							}
						}
					}
				}

				// 如果流结束但没有收到done事件，手动完成
				if (currentText) {
					console.log('[useAiStream] Stream ended without done event, using currentText');
					setStreaming(false);
					options.onComplete?.(currentText);
				} else {
					console.warn('[useAiStream] Stream ended with no text');
					setStreaming(false);
					options.onError?.('流式输出未返回任何内容');
				}
			} catch (error: any) {
				if (error.name === 'AbortError') {
					console.log('[useAiStream] Stream aborted');
					return;
				}
				setStreaming(false);
				options.onError?.(error.message || '流式输出失败');
			}
		},
		[streaming, options]
	);

	const stopStream = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
		setStreaming(false);
	}, []);

	// 清理函数
	useEffect(() => {
		return () => {
			stopStream();
		};
	}, [stopStream]);

	return {
		streaming,
		currentText,
		startStream,
		stopStream
	};
}

