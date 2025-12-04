'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChatRoom from '@/components/chat/ChatRoom';
import ChatSidebar from '@/components/chat/ChatSidebar';
import TopicSetupDialog from '@/components/chat/TopicSetupDialog';

export default function ChatPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
	const [sidebarKey, setSidebarKey] = useState(0);
	const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0); // 用于强制刷新侧边栏
	const [showTopicSetup, setShowTopicSetup] = useState(false);
	const [pendingRoomType, setPendingRoomType] = useState<'SOLO' | 'DUO' | null>(null);

	useEffect(() => {
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
					
					setLoading(false);
					// 检查URL参数中是否有房间ID
					const roomIdFromUrl = searchParams?.get('room');
					if (roomIdFromUrl) {
						handleJoinRoom(roomIdFromUrl);
					} else {
						// 尝试获取或创建默认聊天室
						loadOrCreateRoom();
					}
				}
			})
			.catch((err) => {
				console.error('[ChatPage] Auth check failed:', err);
				// 即使创建匿名用户失败，也允许访问（显示错误提示）
				setLoading(false);
			});
	}, [router, searchParams]);

	const handleJoinRoom = async (roomId: string) => {
		try {
			// 获取匿名用户ID（如果存在）
			const guestUserId = localStorage.getItem('guestUserId');
			
			const res = await fetch(`/api/chat/rooms/${roomId}/join`, {
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
			setCurrentRoomId(data.room.id);
			
			// 如果成功加入房间，刷新侧边栏以显示新加入的房间
			if (data.joined || data.alreadyMember) {
				setSidebarKey((prev) => prev + 1);
			}
		} catch (error: any) {
			console.error('[ChatPage] Failed to join room:', error);
			alert(`加入房间失败: ${error.message || '未知错误'}`);
			// 失败后尝试加载或创建默认房间
			loadOrCreateRoom();
		}
	};

	const loadOrCreateRoom = async () => {
		try {
			// 只获取用户的活跃聊天室列表，不自动创建新房间
			const res = await fetch('/api/chat/rooms?status=ACTIVE&limit=1');
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				console.error('[ChatPage] Failed to load rooms:', errorData);
				// 不抛出错误，只是不设置房间ID，让用户看到空状态
				return;
			}

			const data = await res.json();
			if (data.rooms && data.rooms.length > 0) {
				// 使用第一个活跃房间
				setCurrentRoomId(data.rooms[0].id);
			}
			// 如果没有房间，不自动创建，让用户点击"创建新聊天"按钮
		} catch (error: any) {
			console.error('[ChatPage] Failed to load rooms:', error);
			// 不显示错误，让用户看到空状态
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
					<p style={{ color: 'var(--color-text-secondary)' }}>加载中...</p>
				</div>
			</div>
		);
	}

	// 如果没有房间ID，不显示任何内容，让侧边栏显示空状态
	// 用户需要点击侧边栏的"创建新聊天"按钮来创建房间

	const handleRoomSelect = (roomId: string) => {
		setCurrentRoomId(roomId);
		router.push(`/chat?room=${roomId}`);
	};

	const handleNewRoom = () => {
		// 直接显示话题设置对话框，不需要先同意宪章
		setPendingRoomType('SOLO');
		setShowTopicSetup(true);
	};

	// 处理话题设置完成
	const handleTopicSetupComplete = async (topic: string, description: string) => {
		try {
			// 现在才创建房间
			const res = await fetch('/api/chat/rooms', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: pendingRoomType || 'SOLO' })
			});

			if (!res.ok) {
				throw new Error('创建房间失败');
			}

			const data = await res.json();
			const roomId = data.room.id;

			// 立即设置话题（不再标记创建者已同意宪章）
			const topicRes = await fetch(`/api/chat/rooms/${roomId}/topic`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ topic, description })
			});

			if (!topicRes.ok) {
				console.error('[ChatPage] 设置话题失败');
				// 即使设置话题失败，也继续进入房间
			}

			// 设置当前房间ID并跳转
			setCurrentRoomId(roomId);
			setSidebarKey((prev) => prev + 1); // 刷新侧边栏
			setShowTopicSetup(false);
			setPendingRoomType(null);
			router.push(`/chat?room=${roomId}`);
		} catch (error: any) {
			console.error('[ChatPage] Failed to create room:', error);
			alert(`创建新聊天失败: ${error.message || '未知错误'}`);
			setShowTopicSetup(false);
			setPendingRoomType(null);
		}
	};

	// 处理话题设置取消
	const handleTopicSetupCancel = () => {
		setShowTopicSetup(false);
		setPendingRoomType(null);
	};

	return (
		<div
			style={{
				display: 'flex',
				height: '100vh',
				overflow: 'hidden'
			}}
		>
			<ChatSidebar
				key={sidebarKey + sidebarRefreshTrigger}
				currentRoomId={currentRoomId}
				onRoomSelect={handleRoomSelect}
				onNewRoom={handleNewRoom}
				onRoomDeleted={async () => {
					// 房间被删除后，尝试加载其他房间或创建新房间
					setSidebarKey((prev) => prev + 1); // 刷新侧边栏
					try {
						const res = await fetch('/api/chat/rooms?status=ACTIVE&limit=1');
						if (res.ok) {
							const data = await res.json();
							if (data.rooms && data.rooms.length > 0) {
								setCurrentRoomId(data.rooms[0].id);
								router.push(`/chat?room=${data.rooms[0].id}`);
							} else {
								// 没有其他房间，创建新房间
								handleNewRoom();
							}
						}
					} catch (error) {
						console.error('[ChatPage] Failed to load rooms after delete:', error);
						// 创建新房间作为后备
						handleNewRoom();
					}
				}}
			/>
			<div style={{ flex: 1, overflow: 'hidden' }}>
				{currentRoomId ? (
					<ChatRoom roomId={currentRoomId} />
				) : (
					<div
						style={{
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							height: '100%',
							color: 'var(--color-text-secondary)'
						}}
					>
						选择一个聊天或创建新聊天
					</div>
				)}
			</div>

			{/* 话题设置对话框（创建新聊天时） */}
			{showTopicSetup && pendingRoomType && (
				<TopicSetupDialog
					onComplete={handleTopicSetupComplete}
					onClose={handleTopicSetupCancel}
				/>
			)}
		</div>
	);
}

