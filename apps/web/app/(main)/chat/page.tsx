'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChatRoom from '@/components/chat/ChatRoom';
import ChatSidebar from '@/components/chat/ChatSidebar';
import TopicSetupDialog from '@/components/chat/TopicSetupDialog';
import { useAuth } from '@/contexts/AuthContext';
import { createModuleLogger } from '@/lib/utils/logger';
import ChatPageLoader from '@/components/ui/ChatPageLoader';

const log = createModuleLogger('ChatPage');

export default function ChatPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated, loading: authLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
	const [sidebarKey, setSidebarKey] = useState(0);
	const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0); // 用于强制刷新侧边栏
	const [showTopicSetup, setShowTopicSetup] = useState(false);
	const [pendingRoomType, setPendingRoomType] = useState<'SOLO' | 'DUO' | null>(null);
	const isLoadingRoomsRef = useRef(false); // 防止并发请求
	const lastLoadTimeRef = useRef(0); // 记录上次加载时间
	const hasInitializedRef = useRef(false); // 是否已经初始化过
	const isUserSelectingRef = useRef(false); // 标记用户是否正在主动选择房间
	const lastRoomIdRef = useRef<string | null>(null); // 记录上次的房间ID，用于检测变化
	const LOAD_COOLDOWN = 3000; // 3秒冷却期，避免与ChatSidebar冲突

	// 提取URL参数，避免searchParams对象引用变化导致循环
	const roomIdFromUrl = searchParams?.get('room') || null;
	const inviteTokenFromUrl = searchParams?.get('invite') || null;

	useEffect(() => {
		// 等待认证状态加载完成
		if (authLoading) {
			return;
		}

		// 如果用户正在主动选择房间，说明已经通过 handleRoomSelect 跳转到 /chat/${roomId} 了
		// 这里不需要处理，因为会跳转到 /chat/[roomId]/page.tsx
		// 只需要重置标记，避免影响后续逻辑
		if (isUserSelectingRef.current) {
			// 如果还在 /chat 页面（带 room 参数），说明跳转还没完成，等待跳转
			// 如果已经跳转到 /chat/${roomId}，这个 useEffect 不会执行（因为路由变了）
			// 所以这里只需要重置标记，避免影响其他逻辑
			isUserSelectingRef.current = false;
			setLoading(false);
			return;
		}

		// 如果已经初始化过，检查URL参数是否变化
		if (hasInitializedRef.current) {
			// 检查房间ID是否变化
			if (roomIdFromUrl === lastRoomIdRef.current) {
				// URL参数没变化，且已经初始化过，不再执行
				// 确保loading是false（如果之前已经初始化，loading应该已经是false了）
				if (loading) {
					setLoading(false);
				}
				return;
			}
			
			// URL参数变化了
			// 如果用户正在主动选择房间，只更新状态，不重新初始化
			if (isUserSelectingRef.current || (lastRoomIdRef.current && roomIdFromUrl)) {
				// 用户切换房间，只更新 currentRoomId
				setCurrentRoomId(roomIdFromUrl);
				lastRoomIdRef.current = roomIdFromUrl; // 更新记录
				setLoading(false); // 确保设置loading为false
				// 检查当前路径，如果不是目标路径，跳转
				if (typeof window !== 'undefined' && roomIdFromUrl) {
					const currentPath = window.location.pathname;
					if (currentPath !== `/chat/${roomIdFromUrl}`) {
						router.replace(`/chat/${roomIdFromUrl}`);
					}
				}
				// 重置用户选择标记
				isUserSelectingRef.current = false;
				return;
			}
			
			// 其他情况（从有值变成null，或从null变成有值），重置初始化标记
			hasInitializedRef.current = false;
		}

		if (isAuthenticated) {
			// 已登录，清除可能存在的 guestUserId
			localStorage.removeItem('guestUserId');
			
			// 检查URL参数中是否有房间ID
			if (roomIdFromUrl) {
				// 检查当前路径，避免循环跳转
				if (typeof window !== 'undefined') {
					const currentPath = window.location.pathname;
					if (currentPath !== `/chat/${roomIdFromUrl}`) {
						hasInitializedRef.current = true; // 标记已初始化，避免循环
						lastRoomIdRef.current = roomIdFromUrl; // 更新记录
						setLoading(false); // 确保设置loading为false
						router.replace(`/chat/${roomIdFromUrl}`);
						return;
					}
				}
				// 如果已经在正确的路径，直接设置房间ID
				setCurrentRoomId(roomIdFromUrl);
				lastRoomIdRef.current = roomIdFromUrl; // 更新记录
				setLoading(false);
				hasInitializedRef.current = true;
			} else {
				// 没有URL参数，自动加载最新房间（延迟一点，避免与ChatSidebar冲突）
				hasInitializedRef.current = true; // 标记已初始化，避免重复加载
				lastRoomIdRef.current = null; // 更新记录
				setTimeout(() => {
					loadOrCreateRoom();
				}, 500);
			}
		} else {
			// 未登录，检查是否有邀请链接
			if (roomIdFromUrl && inviteTokenFromUrl) {
				// 有邀请链接，允许未登录用户进入（ChatRoom会处理注册流程）
				setLoading(false);
				setCurrentRoomId(roomIdFromUrl);
				lastRoomIdRef.current = roomIdFromUrl; // 更新记录
				hasInitializedRef.current = true;
			} else {
				// 没有邀请链接，重定向到登录页
				hasInitializedRef.current = true; // 标记已初始化，避免循环
				router.replace('/signin?redirect=' + encodeURIComponent('/chat'));
			}
		}
	}, [isAuthenticated, authLoading, router, roomIdFromUrl, inviteTokenFromUrl, searchParams]);

	const handleJoinRoom = async (roomId: string) => {
		try {
			const res = await fetch(`/api/chat/rooms/${roomId}/join`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
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
			log.error('Failed to join room', error as Error);
			alert(`加入房间失败: ${error.message || '未知错误'}`);
			// 失败后尝试加载或创建默认房间
			loadOrCreateRoom();
		}
	};

	const loadOrCreateRoom = useCallback(async (retryCount = 0) => {
		const now = Date.now();
		const timeSinceLastLoad = now - lastLoadTimeRef.current;

		// 防止并发请求
		if (isLoadingRoomsRef.current) {
			log.debug('房间列表加载已在进行中，跳过');
			// 如果已经在加载中，确保loading状态正确
			if (loading) {
				// 不设置loading为false，因为可能正在加载中
				// 但如果等待时间过长，应该由其他逻辑处理
			}
			return;
		}

		// 如果距离上次加载时间太短，延迟执行（避免与ChatSidebar冲突）
		if (timeSinceLastLoad < LOAD_COOLDOWN && lastLoadTimeRef.current > 0 && retryCount === 0) {
			const delay = LOAD_COOLDOWN - timeSinceLastLoad;
			log.debug('房间列表加载冷却中，延迟执行', { delay });
			setTimeout(() => {
				loadOrCreateRoom(0);
			}, delay);
			return;
		}

		isLoadingRoomsRef.current = true;
		lastLoadTimeRef.current = now;

		try {
			// 只获取用户的活跃聊天室列表，不自动创建新房间
			const res = await fetch('/api/chat/rooms?status=ACTIVE&limit=1');
			
			// 处理429错误：延迟重试
			if (res.status === 429) {
				if (retryCount < 2) {
					const delay = Math.min(2000 * (retryCount + 1), 5000); // 2秒、4秒，最多5秒
					log.warn('加载房间列表时遇到429错误，将在延迟后重试', { retryCount, delay });
					setTimeout(() => {
						loadOrCreateRoom(retryCount + 1);
					}, delay);
					return;
				} else {
					log.warn('加载房间列表时遇到429错误，重试次数已达上限', { retryCount });
					setLoading(false);
					// 429错误时，不设置房间ID，让用户看到空状态，但不抛出错误
					return;
				}
			}
			
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				// 429错误已经在上面处理了，这里只处理其他错误
				// 使用warn而不是error，避免被Next.js捕获为运行时错误
				log.warn('加载房间列表失败', { status: res.status, errorData });
				setLoading(false);
				// 不抛出错误，只是不设置房间ID，让用户看到空状态
				return;
			}

			const data = await res.json();
			if (data.rooms && data.rooms.length > 0) {
				// 使用第一个活跃房间（最新的）
				const latestRoomId = data.rooms[0].id;
				log.debug('自动加载最新房间', { roomId: latestRoomId });
				
				// 检查用户是否正在主动选择房间，如果是，不覆盖用户的选择
				if (isUserSelectingRef.current) {
					log.debug('用户正在选择房间，跳过自动加载最新房间');
					setLoading(false);
					return;
				}
				
				// 检查当前URL是否已经是目标房间，避免不必要的router.replace
				const currentRoomIdFromUrl = typeof window !== 'undefined' 
					? new URLSearchParams(window.location.search).get('room')
					: null;
				
				// 如果URL中已经有房间ID，且不是最新房间，说明用户可能选择了其他房间，不覆盖
				if (currentRoomIdFromUrl && currentRoomIdFromUrl !== latestRoomId) {
					log.debug('URL中已有房间ID且不是最新房间，可能是用户选择，不覆盖', { 
						currentRoomId: currentRoomIdFromUrl, 
						latestRoomId 
					});
					// 只更新状态，不改变URL
					setCurrentRoomId(currentRoomIdFromUrl);
					setLoading(false);
					return;
				}
				
				if (currentRoomIdFromUrl !== latestRoomId) {
					// 只有在URL参数不同时才更新URL
					// 先标记已初始化，避免router.replace触发useEffect循环
					hasInitializedRef.current = true;
					lastRoomIdRef.current = latestRoomId; // 更新记录
					setCurrentRoomId(latestRoomId);
					setLoading(false); // 确保设置loading为false
					router.replace(`/chat?room=${latestRoomId}`, { scroll: false });
				} else {
					// URL已经是目标房间，只设置状态
					setCurrentRoomId(latestRoomId);
					lastRoomIdRef.current = latestRoomId; // 更新记录
					setLoading(false); // 确保设置loading为false
				}
			} else {
				// 如果没有房间，不自动创建，让用户点击"创建新聊天"按钮
				setLoading(false);
			}
		} catch (error: any) {
			// 网络错误等异常情况，使用warn而不是error
			log.warn('加载房间列表时发生异常', { error: error.message });
			setLoading(false);
			// 不显示错误，让用户看到空状态
		} finally {
			isLoadingRoomsRef.current = false;
		}
	}, [router]);

	// 所有hooks必须在早期返回之前定义，确保hooks调用顺序一致
	const handleRoomSelect = useCallback((roomId: string) => {
		// 如果已经是当前房间，不重复设置
		if (currentRoomId === roomId) {
			log.debug('已经是当前房间，跳过切换', { roomId });
			return;
		}
		log.debug('用户选择切换聊天', { from: currentRoomId, to: roomId });
		// 标记用户正在主动选择房间，避免触发自动加载逻辑
		isUserSelectingRef.current = true;
		lastRoomIdRef.current = roomId; // 更新记录，避免useEffect误判
		setCurrentRoomId(roomId);
		// 直接跳转到 /chat/${roomId}，而不是 /chat?room=${roomId}，避免复杂的URL参数处理
		router.push(`/chat/${roomId}`);
	}, [currentRoomId, router]);

	const handleNewRoom = useCallback(() => {
		// 直接显示话题设置对话框，不需要先同意宪章
		setPendingRoomType('SOLO');
		setShowTopicSetup(true);
	}, []);

	if (loading) {
		return (
			<ChatPageLoader 
				message="加载中..." 
				subMessage="正在准备聊天室"
			/>
		);
	}

	// 如果没有房间ID，不显示任何内容，让侧边栏显示空状态
	// 用户需要点击侧边栏的"创建新聊天"按钮来创建房间

	// 处理话题设置完成
	const handleTopicSetupComplete = async (topic: string, description: string) => {
		try {
			// 创建房间时同时设置话题（一次请求完成，更高效）
			const res = await fetch('/api/chat/rooms', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					type: pendingRoomType || 'SOLO',
					topic, // 创建时同时设置话题
					topicDescription: description
				})
			});

			if (!res.ok) {
				throw new Error('创建房间失败');
			}

			const data = await res.json();
			const roomId = data.room.id;

			// 直接跳转到最终路径，避免二次跳转，更丝滑
			setCurrentRoomId(roomId);
			setSidebarKey((prev) => prev + 1); // 刷新侧边栏
			setShowTopicSetup(false);
			setPendingRoomType(null);
			hasInitializedRef.current = false; // 重置初始化标记，允许重新处理URL参数
			router.push(`/chat/${roomId}`); // 直接跳转到最终路径，而不是 /chat?room=xxx
		} catch (error: any) {
			log.error('Failed to create room', error as Error);
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
						
						// 处理429错误：静默处理
						if (res.status === 429) {
							log.warn('删除房间后加载其他房间时遇到429错误');
							// 创建新房间作为后备
							handleNewRoom();
							return;
						}
						
						if (res.ok) {
							const data = await res.json();
							if (data.rooms && data.rooms.length > 0) {
								const newRoomId = data.rooms[0].id;
								setCurrentRoomId(newRoomId);
								hasInitializedRef.current = false; // 重置初始化标记
								router.push(`/chat?room=${newRoomId}`);
							} else {
								// 没有其他房间，创建新房间
								handleNewRoom();
							}
						} else {
							// 其他错误，创建新房间作为后备
							handleNewRoom();
						}
					} catch (error) {
						log.warn('删除房间后加载其他房间时发生异常', { error });
						// 创建新房间作为后备
						handleNewRoom();
					}
				}}
			/>
			<div style={{ flex: 1, overflow: 'hidden' }}>
				{currentRoomId ? (
					<ChatRoom 
						key={currentRoomId} // 添加key，确保roomId变化时组件重新挂载
						roomId={currentRoomId}
						onRoomJoined={() => {
							// 用户成功加入房间后，刷新侧边栏
							setSidebarKey((prev) => prev + 1);
						}}
					/>
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

