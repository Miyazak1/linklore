'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ChatRoom from '@/components/chat/ChatRoom';

export default function ChatRoomPage() {
	const router = useRouter();
	const params = useParams();
	const roomId = params?.roomId as string;
	const [loading, setLoading] = useState(true);
	const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

	useEffect(() => {
		if (!roomId) {
			router.push('/chat');
			return;
		}

		// 检查是否已登录（包括匿名用户）
		fetch('/api/auth/me')
			.then((res) => {
				if (!res.ok) {
					// 如果未登录，尝试创建匿名用户
					return fetch('/api/auth/guest', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							guestUserId: localStorage.getItem('guestUserId')
						})
					}).then((guestRes) => {
						if (!guestRes.ok) {
							throw new Error('无法创建匿名用户');
						}
						return guestRes.json();
					});
				}
				return res.json();
			})
			.then((data) => {
				if (data) {
					// 如果是匿名用户，保存 guestUserId 到 localStorage
					if (data.user?.isGuest && data.user?.id) {
						localStorage.setItem('guestUserId', data.user.id);
					} else if (data.user && !data.user.isGuest) {
						// 如果是真实用户，清除 guestUserId
						localStorage.removeItem('guestUserId');
					}
					
					// 尝试加入房间
					handleJoinRoom(roomId);
				}
			})
			.catch((err) => {
				console.error('[ChatRoomPage] Auth check failed:', err);
				// 即使创建匿名用户失败，也尝试加入房间（可能会失败，但至少不会直接跳转登录）
				handleJoinRoom(roomId);
			});
	}, [roomId, router]);

	const handleJoinRoom = async (targetRoomId: string) => {
		setLoading(true);
		try {
			// 获取匿名用户ID（如果存在）
			const guestUserId = localStorage.getItem('guestUserId');
			
			const res = await fetch(`/api/chat/rooms/${targetRoomId}/join`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					guestUserId: guestUserId || undefined
				})
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.error || '加入房间失败');
			}

			const data = await res.json();
			
			// 如果成功加入房间，跳转到主聊天页面（带侧边栏的完整页面）
			if (data.joined || data.alreadyMember) {
				// 使用 window.location 强制刷新整个页面，确保侧边栏更新
				window.location.href = `/chat?room=${data.room.id}`;
			} else {
				setCurrentRoomId(data.room.id);
				setLoading(false);
			}
		} catch (error: any) {
			console.error('[ChatRoomPage] Failed to join room:', error);
			setLoading(false);
			alert(`加入房间失败: ${error.message || '未知错误'}\n\n房间可能不存在或已关闭`);
		}
	};

	if (loading) {
		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '100vh',
					background: 'var(--color-background)'
				}}
			>
				<div style={{ textAlign: 'center' }}>
					<div
						style={{
							width: 40,
							height: 40,
							border: '3px solid var(--color-border)',
							borderTopColor: 'var(--color-primary)',
							borderRadius: '50%',
							animation: 'spin 1s linear infinite',
							margin: '0 auto 16px'
						}}
					/>
					<p style={{ color: 'var(--color-text-secondary)' }}>正在加入聊天室...</p>
				</div>
			</div>
		);
	}

	if (!currentRoomId) {
		return null;
	}

	return <ChatRoom roomId={currentRoomId} />;
}

