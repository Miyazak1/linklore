'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface Room {
	id: string;
	type: 'SOLO' | 'DUO';
	status: string;
	createdAt: string;
	updatedAt: string;
	topic?: string | null; // 讨论主题
	topicDescription?: string | null; // 主题描述
	creator: {
		id: string;
		name: string | null;
		email: string;
	};
	participant: {
		id: string;
		name: string | null;
		email: string;
	} | null;
	title?: string; // 房间标题（基于第一条消息生成，已废弃，优先使用topic）
	lastMessage?: {
		content: string;
		createdAt: string;
	};
}

interface ChatSidebarProps {
	currentRoomId: string | null;
	onRoomSelect: (roomId: string) => void;
	onNewRoom: () => void;
	onRoomDeleted?: () => void; // 房间删除后的回调
}

export default function ChatSidebar({
	currentRoomId,
	onRoomSelect,
	onNewRoom,
	onRoomDeleted
}: ChatSidebarProps) {
	const router = useRouter();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [rooms, setRooms] = useState<Room[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
	const isLoadingRef = useRef(false); // 防止并发请求
	const lastRequestTimeRef = useRef(0); // 记录上次请求时间
	const COOLDOWN_PERIOD = 2000; // 2秒冷却期
	const RETRY_429_COOLDOWN = 5000; // 429错误后5秒冷却

	useEffect(() => {
		// 等待认证状态加载完成后再加载房间列表
		if (!authLoading) {
			loadRooms();
		}
	}, [authLoading, isAuthenticated]);

	const loadRooms = async () => {
		// 如果用户未登录，不加载房间列表（避免401错误）
		if (!isAuthenticated) {
			setRooms([]);
			setLoading(false);
			return;
		}

		const now = Date.now();
		const timeSinceLastRequest = now - lastRequestTimeRef.current;

		// 防止并发请求
		if (isLoadingRef.current) {
			return;
		}

		// 如果距离上次请求时间太短，跳过（除非是首次加载）
		if (timeSinceLastRequest < COOLDOWN_PERIOD && lastRequestTimeRef.current > 0) {
			console.log('[ChatSidebar] Request cooldown, skipping', { timeSinceLastRequest });
			return;
		}

		isLoadingRef.current = true;
		lastRequestTimeRef.current = now;

		try {
			const res = await fetch('/api/chat/rooms?status=ACTIVE&limit=50');
			
			if (res.status === 429) {
				console.warn('[ChatSidebar] Rate limited (429), will retry later');
				lastRequestTimeRef.current = Date.now() + RETRY_429_COOLDOWN; // 延长冷却期
				setLoading(false); // 确保设置 loading 为 false
				return;
			}

			// 401错误：用户未登录，这是正常的，静默处理
			if (res.status === 401) {
				setRooms([]);
				setLoading(false);
				return;
			}

			if (res.ok) {
				const data = await res.json();
				setRooms(data.rooms || []);
			} else {
				// 其他错误才记录日志，并尝试获取详细错误信息
				const errorData = await res.json().catch(() => ({}));
				console.error('[ChatSidebar] Failed to load rooms:', {
					status: res.status,
					error: errorData.error,
					details: errorData.details
				});
			}
		} catch (error) {
			console.error('[ChatSidebar] Failed to load rooms:', error);
		} finally {
			setLoading(false);
			isLoadingRef.current = false;
		}
	};

	const filteredRooms = rooms.filter((room) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		return (
			room.topic?.toLowerCase().includes(query) ||
			room.title?.toLowerCase().includes(query) ||
			room.lastMessage?.content.toLowerCase().includes(query) ||
			room.creator.email.toLowerCase().includes(query)
		);
	});

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) {
			return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
		} else if (days === 1) {
			return '昨天';
		} else if (days < 7) {
			return `${days}天前`;
		} else {
			return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
		}
	};

	const getRoomTitle = (room: Room): string => {
		// 优先使用用户设置的主题
		if (room.topic) return room.topic;
		// 如果没有主题，使用最后一条消息作为标题
		if (room.lastMessage?.content) {
			// 使用最后一条消息的前30个字符作为标题
			const preview = room.lastMessage.content.substring(0, 30);
			return preview.length < room.lastMessage.content.length ? preview + '...' : preview;
		}
		// 如果既没有主题也没有消息，显示"新对话"
		return '新对话';
	};

	const handleDeleteRoom = async (roomId: string, e: React.MouseEvent) => {
		e.stopPropagation(); // 阻止触发房间选择

		if (!confirm('确定要删除此聊天吗？删除后您将无法再看到此聊天，但对方仍可继续使用。')) {
			return;
		}

		setDeletingRoomId(roomId);
		try {
			const res = await fetch(`/api/chat/rooms/${roomId}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const error = await res.json().catch(() => ({}));
				throw new Error(error.error || '删除失败');
			}

			// 从列表中移除
			setRooms((prev) => prev.filter((r) => r.id !== roomId));

			// 如果删除的是当前房间，跳转到其他房间或创建新房间
			if (roomId === currentRoomId) {
				onRoomDeleted?.();
			}
		} catch (error: any) {
			console.error('[ChatSidebar] Failed to delete room:', error);
			alert(`删除失败: ${error.message || '未知错误'}`);
		} finally {
			setDeletingRoomId(null);
		}
	};

	return (
		<div
			style={{
				width: '260px',
				height: '100vh',
				background: 'var(--color-background-secondary)',
				borderRight: '1px solid var(--color-border)',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden'
			}}
		>
			{/* 顶部：新聊天按钮 */}
			<div
				style={{
					padding: '12px',
					borderBottom: '1px solid var(--color-border)'
				}}
			>
				<button
					onClick={onNewRoom}
					style={{
						width: '100%',
						padding: '12px',
						background: 'var(--color-primary)',
						color: 'white',
						border: 'none',
						borderRadius: '6px',
						cursor: 'pointer',
						fontSize: '14px',
						fontWeight: '500',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '8px'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.opacity = '0.9';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.opacity = '1';
					}}
				>
					<span>+</span>
					<span>新聊天</span>
				</button>
			</div>

			{/* 搜索框 */}
			<div
				style={{
					padding: '12px',
					borderBottom: '1px solid var(--color-border)'
				}}
			>
				<input
					type="text"
					placeholder="搜索聊天..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					style={{
						width: '100%',
						padding: '8px 12px',
						border: '1px solid var(--color-border)',
						borderRadius: '6px',
						background: 'var(--color-background)',
						color: 'var(--color-text)',
						fontSize: '14px'
					}}
				/>
			</div>

			{/* 房间列表 */}
			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '8px'
				}}
			>
				{loading ? (
					<div
						style={{
							padding: '20px',
							textAlign: 'center',
							color: 'var(--color-text-secondary)',
							fontSize: '14px'
						}}
					>
						加载中...
					</div>
				) : filteredRooms.length === 0 ? (
					<div
						style={{
							padding: '20px',
							textAlign: 'center',
							color: 'var(--color-text-secondary)',
							fontSize: '14px'
						}}
					>
						{searchQuery ? '未找到匹配的聊天' : '还没有聊天，创建第一个吧'}
					</div>
				) : (
					filteredRooms.map((room) => {
						const isActive = room.id === currentRoomId;
						const isDeleting = deletingRoomId === room.id;
						return (
							<div
								key={room.id}
								onClick={() => !isDeleting && onRoomSelect(room.id)}
								style={{
									padding: '12px',
									marginBottom: '4px',
									borderRadius: '6px',
									cursor: isDeleting ? 'wait' : 'pointer',
									background: isActive
										? 'var(--color-primary-light)'
										: 'transparent',
									border: isActive ? '1px solid var(--color-primary)' : '1px solid transparent',
									transition: 'all 0.2s',
									position: 'relative',
									opacity: isDeleting ? 0.6 : 1
								}}
								onMouseEnter={(e) => {
									if (!isActive && !isDeleting) {
										e.currentTarget.style.background = 'var(--color-background-hover)';
									}
								}}
								onMouseLeave={(e) => {
									if (!isActive) {
										e.currentTarget.style.background = 'transparent';
									}
								}}
							>
								<div
									style={{
										fontSize: '14px',
										fontWeight: isActive ? '500' : '400',
										color: 'var(--color-text)',
										marginBottom: '4px',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
										paddingRight: '24px'
									}}
								>
									{getRoomTitle(room)}
								</div>
								{room.lastMessage && (
									<div
										style={{
											fontSize: '12px',
											color: 'var(--color-text-secondary)',
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											gap: '8px'
										}}
									>
										<span
											style={{
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
												flex: 1
											}}
										>
											{room.lastMessage.content.substring(0, 20)}
											{room.lastMessage.content.length > 20 ? '...' : ''}
										</span>
										<span style={{ flexShrink: 0 }}>
											{formatTime(room.lastMessage.createdAt)}
										</span>
									</div>
								)}
								{/* 删除按钮 */}
								<button
									onClick={(e) => handleDeleteRoom(room.id, e)}
									disabled={isDeleting}
									style={{
										position: 'absolute',
										top: '8px',
										right: '8px',
										width: '20px',
										height: '20px',
										padding: 0,
										border: 'none',
										background: 'transparent',
										color: 'var(--color-text-secondary)',
										cursor: isDeleting ? 'wait' : 'pointer',
										fontSize: '16px',
										lineHeight: 1,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										borderRadius: '4px',
										opacity: 0.6
									}}
									onMouseEnter={(e) => {
										if (!isDeleting) {
											e.currentTarget.style.background = 'var(--color-background-subtle)';
											e.currentTarget.style.opacity = '1';
										}
									}}
									onMouseLeave={(e) => {
										if (!isDeleting) {
											e.currentTarget.style.background = 'transparent';
											e.currentTarget.style.opacity = '0.6';
										}
									}}
									title="删除聊天"
								>
									{isDeleting ? '...' : '×'}
								</button>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}

