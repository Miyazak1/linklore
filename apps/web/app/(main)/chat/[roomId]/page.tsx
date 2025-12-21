'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import ChatRoom from '@/components/chat/ChatRoom';
import ChatSidebar from '@/components/chat/ChatSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('ChatRoomPage');

export default function ChatRoomPage() {
	const router = useRouter();
	const params = useParams();
	const searchParams = useSearchParams();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const roomId = params?.roomId as string;
	const inviteToken = searchParams?.get('invite') || null;
	const [loading, setLoading] = useState(true);
	const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
	const [sidebarKey, setSidebarKey] = useState(0);
	const hasAttemptedJoinRef = useRef<string | null>(null); // 记录已尝试加入的房间ID
	const isJoiningRef = useRef(false); // 防止并发请求
	const authLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// 防止 authLoading 一直为 true 导致 loading 卡住
	useEffect(() => {
		if (authLoading) {
			// 设置超时：如果 5 秒后 authLoading 还是 true，强制设置 loading 为 false
			authLoadingTimeoutRef.current = setTimeout(() => {
				log.warn('Auth loading timeout, forcing loading to false');
				setLoading(false);
			}, 5000);
		} else {
			if (authLoadingTimeoutRef.current) {
				clearTimeout(authLoadingTimeoutRef.current);
				authLoadingTimeoutRef.current = null;
			}
		}

		return () => {
			if (authLoadingTimeoutRef.current) {
				clearTimeout(authLoadingTimeoutRef.current);
			}
		};
	}, [authLoading]);

	useEffect(() => {
		if (!roomId) {
			router.replace('/chat');
			return;
		}

		// 等待认证状态加载完成（但不超过5秒）
		if (authLoading) {
			return;
		}

		// 如果已经尝试过加入这个房间，不再重复
		// 但是，如果 roomId 变化了（用户切换了聊天），需要重置标记
		if (hasAttemptedJoinRef.current === roomId && currentRoomId === roomId) {
			// 如果已经成功加入这个房间，且 roomId 和 currentRoomId 匹配，不再重复
			if (loading) {
				setLoading(false);
			}
			return;
		}

		// 如果 roomId 变化了，重置标记，允许重新加入
		if (hasAttemptedJoinRef.current !== roomId) {
			hasAttemptedJoinRef.current = null;
			isJoiningRef.current = false;
		}

		if (isAuthenticated) {
			// 已登录，清除可能存在的 guestUserId
			localStorage.removeItem('guestUserId');
			
			// 标记已尝试，防止重复调用
			hasAttemptedJoinRef.current = roomId;
			
			// 尝试加入房间
			const handleJoinRoom = async (targetRoomId: string) => {
				// 防止并发请求
				if (isJoiningRef.current) {
					log.debug('Join room already in progress, skipping', { targetRoomId });
					return;
				}

				isJoiningRef.current = true;
				setLoading(true);
				
				try {
					const res = await fetch(`/api/chat/rooms/${targetRoomId}/join`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' }
					});

					if (res.status === 429) {
						log.warn('Rate limited (429) when joining room', { targetRoomId });
						hasAttemptedJoinRef.current = targetRoomId;
						setLoading(false);
						// 清除 URL 参数，避免循环跳转
						router.replace('/chat');
						setTimeout(() => {
							alert('请求过于频繁，请稍后再试。');
						}, 100);
						return;
					}

					if (!res.ok) {
						const errorData = await res.json().catch(() => ({}));
						throw new Error(errorData.error || '加入房间失败');
					}

					const data = await res.json();
					
					if (data.joined || data.alreadyMember) {
						// 成功加入后，直接设置 currentRoomId，不跳转（避免循环）
						// 因为已经在 /chat/[roomId] 页面了
						setCurrentRoomId(data.room.id);
						setLoading(false);
						// 刷新侧边栏
						setSidebarKey((prev) => prev + 1);
					} else {
						setCurrentRoomId(data.room.id);
						setLoading(false);
					}
				} catch (error: any) {
					log.error('Failed to join room', error as Error);
					hasAttemptedJoinRef.current = targetRoomId; // 标记已尝试，避免重复
					setLoading(false);
					// 清除 URL 参数，避免循环跳转
					router.replace('/chat');
					setTimeout(() => {
						alert(`加入房间失败: ${error.message || '未知错误'}\n\n房间可能不存在或已关闭`);
					}, 100);
				} finally {
					isJoiningRef.current = false;
				}
			};

			handleJoinRoom(roomId);
		} else {
			// 未登录，检查是否有邀请token
			hasAttemptedJoinRef.current = roomId; // 标记已处理
			
			if (inviteToken) {
				// 有邀请token，允许未登录用户进入（ChatRoom会处理注册流程）
				log.debug('未登录用户通过邀请链接进入', { roomId, inviteToken });
				setLoading(false);
				setCurrentRoomId(roomId);
			} else {
				// 没有邀请token，检查房间是否允许未登录用户进入（DUO房间且无参与者）
				// 允许进入，ChatRoom会显示登录框
				log.debug('未登录用户访问聊天房间，允许进入并显示登录框', { roomId });
				setLoading(false);
				setCurrentRoomId(roomId);
			}
		}
	}, [roomId, inviteToken, router, isAuthenticated, authLoading, loading, currentRoomId]);

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

	return (
		<div
			style={{
				display: 'flex',
				height: '100vh',
				overflow: 'hidden'
			}}
		>
			<ChatSidebar
				key={sidebarKey}
				currentRoomId={currentRoomId}
				onRoomSelect={(roomId) => {
					router.push(`/chat/${roomId}`);
				}}
				onNewRoom={() => {
					router.push('/chat');
				}}
				onRoomDeleted={async () => {
					// 房间被删除后，刷新侧边栏并跳转到主聊天页面
					setSidebarKey((prev) => prev + 1);
					router.replace('/chat');
				}}
			/>
			<div style={{ flex: 1, overflow: 'hidden' }}>
				<ChatRoom 
					key={currentRoomId} // 添加key，确保roomId变化时组件重新挂载
					roomId={currentRoomId} 
					inviteToken={inviteToken || undefined}
					onRoomJoined={() => {
						// 用户成功加入房间后，刷新侧边栏
						setSidebarKey((prev) => prev + 1);
					}}
				/>
			</div>
		</div>
	);
}

