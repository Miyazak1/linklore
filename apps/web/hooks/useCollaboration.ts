/**
 * 实时协作 Hook
 * 使用 SSE 连接进行实时协作编辑
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface CollaborationEvent {
	type: 'edit' | 'cursor' | 'conflict' | 'user_joined' | 'user_left' | 'heartbeat' | 'connected';
	traceId: string;
	userId: string;
	userEmail: string;
	timestamp: number;
	data: any;
}

interface UseCollaborationOptions {
	traceId: string;
	enabled?: boolean;
	onEvent?: (event: CollaborationEvent) => void;
	onConflict?: () => void;
	onUserJoined?: (userId: string, userEmail: string) => void;
	onUserLeft?: (userId: string) => void;
}

export function useCollaboration({
	traceId,
	enabled = true,
	onEvent,
	onConflict,
	onUserJoined,
	onUserLeft
}: UseCollaborationOptions) {
	const [connected, setConnected] = useState(false);
	const [activeUsers, setActiveUsers] = useState<Array<{ id: string; email: string }>>([]);
	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttempts = useRef(0);
	const maxReconnectAttempts = 5;

	const connect = useCallback(() => {
		if (!enabled || !traceId) return;

		// 关闭现有连接
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
		}

		try {
			const eventSource = new EventSource(`/api/traces/${traceId}/collaborate`);
			eventSourceRef.current = eventSource;

			eventSource.onopen = () => {
				setConnected(true);
				reconnectAttempts.current = 0;
			};

			eventSource.onerror = () => {
				setConnected(false);
				eventSource.close();

				// 尝试重连
				if (reconnectAttempts.current < maxReconnectAttempts) {
					reconnectAttempts.current++;
					const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
					reconnectTimeoutRef.current = setTimeout(() => {
						connect();
					}, delay);
				}
			};

			eventSource.addEventListener('connected', (e: MessageEvent) => {
				const data = JSON.parse(e.data);
				onEvent?.({
					type: 'connected',
					traceId: data.traceId,
					userId: data.userId,
					userEmail: '',
					timestamp: Date.now(),
					data
				});
			});

			eventSource.addEventListener('edit', (e: MessageEvent) => {
				const event = JSON.parse(e.data) as CollaborationEvent;
				onEvent?.(event);
			});

			eventSource.addEventListener('cursor', (e: MessageEvent) => {
				const event = JSON.parse(e.data) as CollaborationEvent;
				onEvent?.(event);
			});

			eventSource.addEventListener('conflict', (e: MessageEvent) => {
				const event = JSON.parse(e.data) as CollaborationEvent;
				onConflict?.();
				onEvent?.(event);
			});

			eventSource.addEventListener('user_joined', (e: MessageEvent) => {
				const event = JSON.parse(e.data) as CollaborationEvent;
				onUserJoined?.(event.userId, event.userEmail);
				onEvent?.(event);
			});

			eventSource.addEventListener('user_left', (e: MessageEvent) => {
				const event = JSON.parse(e.data) as CollaborationEvent;
				onUserLeft?.(event.userId);
				onEvent?.(event);
			});

			eventSource.addEventListener('heartbeat', () => {
				// 心跳，保持连接
			});
		} catch (err) {
			console.error('[useCollaboration] Failed to connect:', err);
			setConnected(false);
		}
	}, [traceId, enabled, onEvent, onConflict, onUserJoined, onUserLeft]);

	const disconnect = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
		setConnected(false);
	}, []);

	const sendEvent = useCallback(async (type: string, data: any, version?: number) => {
		try {
			const response = await fetch(`/api/traces/${traceId}/collaborate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, data, version })
			});

			if (!response.ok) {
				const error = await response.json();
				if (response.status === 409) {
					// 冲突
					onConflict?.();
				}
				throw new Error(error.error?.message || 'Failed to send event');
			}

			return await response.json();
		} catch (err) {
			console.error('[useCollaboration] Failed to send event:', err);
			throw err;
		}
	}, [traceId, onConflict]);

	useEffect(() => {
		if (enabled) {
			connect();
		}

		return () => {
			disconnect();
		};
	}, [enabled, connect, disconnect]);

	return {
		connected,
		activeUsers,
		sendEvent,
		connect,
		disconnect
	};
}

