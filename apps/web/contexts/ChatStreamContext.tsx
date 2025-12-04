'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

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
		context?: Array<{ role: 'user' | 'assistant'; content: string }>
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
			context?: Array<{ role: 'user' | 'assistant'; content: string }>
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
				const response = await fetch('/api/chat/ai/stream', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messageId,
						prompt,
						roomId,
						context
					}),
					signal: abortController.signal
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const reader = response.body?.getReader();
				if (!reader) {
					throw new Error('No response body');
				}

				const decoder = new TextDecoder();
				let buffer = '';

				while (true) {
					const { done, value } = await reader.read();

					if (done) {
						break;
					}

					// 检查是否被中止
					if (abortController.signal.aborted) {
						break;
					}

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.startsWith('event: ')) {
							const eventType = line.slice(7).trim();
							continue;
						}

						if (line.startsWith('data: ')) {
							const data = line.slice(6).trim();
							if (data === '[DONE]') {
								continue;
							}

							try {
								const parsed = JSON.parse(data);

								if (parsed.text) {
									// 更新流内容
									setActiveStreams((prev) => {
										const newMap = new Map(prev);
										const current = newMap.get(messageId);
										if (current) {
											newMap.set(messageId, {
												...current,
												content: current.content + parsed.text
											});
										}
										return newMap;
									});
								}

								if (parsed.fullText) {
									// 流完成
									setActiveStreams((prev) => {
										const newMap = new Map(prev);
										const current = newMap.get(messageId);
										if (current) {
											newMap.set(messageId, {
												...current,
												content: parsed.fullText,
												isStreaming: false
											});
										}
										return newMap;
									});
									abortControllersRef.current.delete(messageId);
									break;
								}

								if (parsed.error) {
									setActiveStreams((prev) => {
										const newMap = new Map(prev);
										const current = newMap.get(messageId);
										if (current) {
											newMap.set(messageId, {
												...current,
												isStreaming: false,
												error: parsed.error
											});
										}
										return newMap;
									});
									abortControllersRef.current.delete(messageId);
									break;
								}
							} catch (e) {
								console.error('[ChatStreamContext] Failed to parse SSE data:', e);
							}
						}
					}
				}
			} catch (error: any) {
				if (error.name === 'AbortError') {
					// 流被主动中止，不更新错误状态
					return;
				}

				setActiveStreams((prev) => {
					const newMap = new Map(prev);
					const current = newMap.get(messageId);
					if (current) {
						newMap.set(messageId, {
							...current,
							isStreaming: false,
							error: error.message || '流式输出失败'
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
		[activeStreams]
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

