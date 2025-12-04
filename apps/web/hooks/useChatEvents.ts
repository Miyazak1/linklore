'use client';

import { useEffect, useRef, useState } from 'react';

interface ChatMessage {
	id: string;
	content: string;
	senderId: string;
	sender: {
		id: string;
		email: string;
		name: string | null;
		avatarUrl: string | null;
	};
	contentType: 'USER' | 'AI_SUGGESTION' | 'AI_ADOPTED';
	createdAt: string;
	references?: Array<{
		id: string;
		content: string;
		senderName: string;
	}>;
}

interface UseChatEventsOptions {
	roomId: string;
	enabled?: boolean;
	afterMessageId?: string | null;
	onNewMessage?: (message: ChatMessage) => void;
	onError?: (error: Error) => void;
}

/**
 * Hook for listening to real-time chat events via SSE
 */
export function useChatEvents({
	roomId,
	enabled = true,
	afterMessageId,
	onNewMessage,
	onError
}: UseChatEventsOptions) {
	const [connected, setConnected] = useState(false);
	const eventSourceRef = useRef<EventSource | null>(null);

	// 使用ref存储afterMessageId，避免频繁重建连接
	const afterMessageIdRef = useRef<string | null | undefined>(afterMessageId);
	useEffect(() => {
		afterMessageIdRef.current = afterMessageId;
	}, [afterMessageId]);

	useEffect(() => {
		if (!enabled || !roomId) {
			console.log('[useChatEvents] ⚠️ SSE连接被禁用:', {
				enabled: enabled,
				roomId: roomId,
				reason: !enabled ? 'enabled为false' : !roomId ? 'roomId为空' : '未知原因'
			});
			return;
		}

		// 构建SSE URL（不使用afterMessageId，让服务器从sequence=0开始检查）
		const url = new URL(`/api/chat/rooms/${roomId}/events`, window.location.origin);
		// 注意：不传递afterMessageId，让服务器自己追踪sequence

		console.log('[useChatEvents] 🔌 准备连接SSE:', {
			url: url.toString(),
			roomId,
			enabled,
			afterMessageId
		});

		// 创建EventSource
		const eventSource = new EventSource(url.toString());
		eventSourceRef.current = eventSource;

		// 连接成功
		eventSource.onopen = () => {
			console.log('[useChatEvents] ✅ SSE连接已建立，URL:', url.toString());
			setConnected(true);
		};

		// 接收新消息（SSE的默认事件类型是'message'）
		eventSource.onmessage = (event: MessageEvent) => {
			try {
				const message: ChatMessage = JSON.parse(event.data);
				console.log('[useChatEvents] ✅ 收到新消息:', message.id, '发送者:', message.senderId, '内容:', message.content?.substring(0, 50));
				onNewMessage?.(message);
			} catch (error) {
				console.error('[useChatEvents] ❌ 解析消息失败:', error, '原始数据:', event.data);
				onError?.(error as Error);
			}
		};

		// 接收连接确认
		eventSource.addEventListener('connected', (event) => {
			// 连接确认，不需要处理
		});

		// 接收心跳
		eventSource.addEventListener('heartbeat', (event) => {
			// 心跳用于保持连接，不需要处理
		});

		// 接收错误
		eventSource.onerror = (event: Event) => {
			console.error('[useChatEvents] ❌ SSE错误:', {
				event,
				readyState: eventSource.readyState,
				readyStateText: eventSource.readyState === EventSource.CONNECTING ? 'CONNECTING' : 
				                eventSource.readyState === EventSource.OPEN ? 'OPEN' : 
				                eventSource.readyState === EventSource.CLOSED ? 'CLOSED' : 'UNKNOWN',
				url: url.toString(),
				roomId,
				enabled
			});
			if (eventSource.readyState === EventSource.CLOSED) {
				setConnected(false);
				// 连接关闭，尝试重连
				console.log('[useChatEvents] 连接已关闭，将在1秒后重连...');
				setTimeout(() => {
					if (enabled && roomId) {
						// 重新创建连接
						eventSource.close();
						eventSourceRef.current = null;
						// 触发重新连接（通过重新渲染）
						setConnected(false);
					}
				}, 1000);
			} else if (eventSource.readyState === EventSource.CONNECTING) {
				console.log('[useChatEvents] ⏳ 正在连接...');
			} else if (eventSource.readyState === EventSource.OPEN) {
				console.log('[useChatEvents] ✅ 连接已打开');
			}
		};

		// 清理函数
		return () => {
			console.log('[useChatEvents] 关闭SSE连接');
			eventSource.close();
			eventSourceRef.current = null;
			setConnected(false);
		};
	}, [roomId, enabled]); // 移除afterMessageId, onNewMessage, onError依赖，避免频繁重建连接

	return {
		connected,
		disconnect: () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
				setConnected(false);
			}
		}
	};
}

