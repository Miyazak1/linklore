'use client';

import { useEffect, useState, useRef } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import InviteDialog from './InviteDialog';
import AnalysisPanel from './AnalysisPanel';
import TopicSetupDialog from './TopicSetupDialog';
import CharterAcceptanceDialog from './CharterAcceptanceDialog';
import TopicChangeDialog from './TopicChangeDialog';
import RegisterPrompt from './RegisterPrompt';
import { useChatStream } from '@/contexts/ChatStreamContext';
import { useChatEvents } from '@/hooks/useChatEvents';

interface ChatRoomProps {
	roomId: string;
}

interface Message {
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
	isAdopted?: boolean; // 是否已采纳（用于AI建议）
	isStreaming?: boolean;
	streamingText?: string;
	createdAt: string;
	moderationStatus?: 'PENDING' | 'SAFE' | 'WARNING' | 'BLOCKED';
	moderationNote?: string | null;
	moderationDetails?: any;
	references?: Array<{
		id: string;
		content: string;
		sender: {
			name: string | null;
			email: string;
		};
	}>;
}

export default function ChatRoom({ roomId }: ChatRoomProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [isGuest, setIsGuest] = useState(false); // 是否是匿名用户
	const [roomType, setRoomType] = useState<'SOLO' | 'DUO' | null>(null);
	const [roomInfo, setRoomInfo] = useState<{ 
		creatorId: string; 
		participantId: string | null;
		creator?: { name: string | null; email: string; avatarUrl: string | null };
		participant?: { name: string | null; email: string; avatarUrl: string | null } | null;
	} | null>(null);
	const [aiNickname, setAiNickname] = useState<string | null>(null); // 当前用户的AI昵称
	const [isSystemAi, setIsSystemAi] = useState(false); // 是否使用系统AI
	const [sending, setSending] = useState(false);
	const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
	const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
	const [showCharterForInvite, setShowCharterForInvite] = useState(false); // 邀请前的宪章对话框
	
	// 话题和宪章相关状态
	const [topic, setTopic] = useState<string | null>(null);
	const [topicDescription, setTopicDescription] = useState<string | null>(null);
	const [showTopicSetup, setShowTopicSetup] = useState(false);
	const [showCharterDialog, setShowCharterDialog] = useState(false);
	const [showTopicChangeDialog, setShowTopicChangeDialog] = useState(false);
	const [charterAccepted, setCharterAccepted] = useState({ creator: false, participant: false, all: false });
	const [topicChangeRequest, setTopicChangeRequest] = useState<{ request: string; requestedBy: string; requestedAt: string } | null>(null);
	
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesRef = useRef<Message[]>([]); // 用于定期检查监管状态
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const lastMessageIdRef = useRef<string | null>(null); // 用于轮询的最后一条消息ID
	const charterDialogInitializedRef = useRef(false); // 用于跟踪宪章对话框是否已初始化
	const { startStream, getStreamState, clearStream } = useChatStream();

	// 从全局状态获取当前流式输出的状态
	const streamState = streamingMessageId ? getStreamState(streamingMessageId) : null;
	const streaming = streamState?.isStreaming || false;
	const currentText = streamState?.content || '';

	// 获取当前用户信息和AI昵称
	useEffect(() => {
		console.log('[ChatRoom] 📥 开始获取当前用户信息');
		fetch('/api/auth/me')
			.then((res) => {
				console.log('[ChatRoom] 📥 /api/auth/me 响应状态:', res.status, res.statusText);
				return res.json();
			})
			.then((data) => {
				// 注意：API返回的数据结构是 { user: { id, email, ... } }
				const user = data.user || data; // 兼容两种格式
				console.log('[ChatRoom] ✅ 获取到用户信息:', {
					hasUser: !!user,
					hasId: !!user?.id,
					id: user?.id,
					email: user?.email,
					name: user?.name,
					isGuest: user?.isGuest,
					rawData: data,
					userData: user
				});
				if (user?.id) {
					setCurrentUserId(user.id);
					setIsGuest(user.isGuest === true); // 设置是否是匿名用户
					console.log('[ChatRoom] ✅ 已设置currentUserId:', user.id, 'isGuest:', user.isGuest);
				} else {
					console.error('[ChatRoom] ❌ 用户信息中没有id字段:', { data, user });
				}
			})
			.catch((err) => {
				console.error('[ChatRoom] ❌ 获取用户信息失败:', err);
			});
		
		// 获取AI昵称
		fetch('/api/ai/nickname')
			.then((res) => res.json())
			.then((data) => {
				setAiNickname(data.nickname);
				setIsSystemAi(data.isSystemAi);
			})
			.catch((err) => console.error('[ChatRoom] Failed to get AI nickname:', err));
	}, []);

	// 加载房间信息
	const loadRoomInfo = async () => {
		if (!roomId) {
			console.log('[ChatRoom] ⚠️ roomId为空，无法加载房间信息');
			return;
		}
		try {
			console.log('[ChatRoom] 📥 开始加载房间信息，roomId:', roomId);
			const res = await fetch(`/api/chat/rooms/${roomId}`);
			if (res.ok) {
				const data = await res.json();
				const roomTypeFromApi = data.room?.type || 'SOLO';
				console.log('[ChatRoom] ✅ 房间信息加载成功:', {
					roomId,
					roomType: roomTypeFromApi,
					creatorId: data.room?.creatorId,
					participantId: data.room?.participantId,
					hasCreator: !!data.room?.creator,
					hasParticipant: !!data.room?.participant,
					rawData: data.room
				});
				setRoomType(roomTypeFromApi);
				setRoomInfo({
					creatorId: data.room?.creatorId || '',
					participantId: data.room?.participantId || null,
					creator: data.room?.creator,
					participant: data.room?.participant
				});
			} else {
				const errorData = await res.json().catch(() => ({}));
				// 如果获取房间信息失败，默认设置为 SOLO（可能是新房间）
				console.warn('[ChatRoom] ⚠️ 加载房间信息失败，默认设置为SOLO:', {
					status: res.status,
					statusText: res.statusText,
					error: errorData,
					roomId
				});
				setRoomType('SOLO');
			}
		} catch (error) {
			console.error('[ChatRoom] ❌ 加载房间信息时出错:', error);
			// 出错时也默认设置为 SOLO，确保邀请按钮可以显示
			setRoomType('SOLO');
		}
	};

	// 加载消息
	const loadMessages = async () => {
		if (!roomId) {
			setLoading(false);
			return;
		}
		
		try {
			const res = await fetch(`/api/chat/rooms/${roomId}/messages?limit=50`);
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				console.error('[ChatRoom] Failed to load messages:', {
					status: res.status,
					statusText: res.statusText,
					error: errorData
				});
				throw new Error(errorData.error || `加载消息失败: ${res.status} ${res.statusText}`);
			}

			const data = await res.json();
			const loadedMessages = data.messages || [];
			setMessages(loadedMessages);
			messagesRef.current = loadedMessages; // 更新ref
			setLoading(false);
		} catch (error: any) {
			console.error('[ChatRoom] Failed to load messages:', error);
			setLoading(false);
			// 显示错误信息给用户
			alert(`加载消息失败: ${error.message || '未知错误'}`);
		}
	};

	// 加载话题信息
	const loadTopicInfo = async () => {
		if (!roomId) return;
		try {
			const res = await fetch(`/api/chat/rooms/${roomId}/topic`);
			if (res.ok) {
				const data = await res.json();
				setTopic(data.topic);
				setTopicDescription(data.description);
				setTopicChangeRequest(data.changeRequest);
				
				// 如果没有话题且是创建者，且房间没有消息（说明是新创建的房间），显示话题设置对话框
				// 创建新聊天时不需要先同意宪章
				if (!data.topic && currentUserId && roomInfo?.creatorId === currentUserId && messages.length === 0) {
					// 确保不会同时显示宪章对话框（使用 ref 确保只设置一次）
					if (!charterDialogInitializedRef.current) {
						setShowCharterDialog(false);
						charterDialogInitializedRef.current = true;
					}
					setShowTopicSetup(true);
				} else if (data.topic && currentUserId && roomInfo?.creatorId === currentUserId) {
					// 如果已经有话题，确保创建者不会看到话题设置对话框和宪章对话框
					setShowTopicSetup(false);
					if (!charterDialogInitializedRef.current) {
						setShowCharterDialog(false);
						charterDialogInitializedRef.current = true;
					}
				}
			}
		} catch (error) {
			console.error('[ChatRoom] 加载话题信息失败:', error);
		}
	};
	
	// 加载宪章同意状态（仅用于参与者）
	const loadCharterStatus = async () => {
		if (!roomId) return Promise.resolve();
		
		// 如果是创建者，直接返回，不加载宪章状态（创建者不需要在创建时同意宪章）
		if (currentUserId && roomInfo && currentUserId === roomInfo.creatorId) {
			// 创建者永远不需要看到宪章对话框
			if (!charterDialogInitializedRef.current) {
				setShowCharterDialog(false);
				charterDialogInitializedRef.current = true;
			}
			return Promise.resolve();
		}
		
		try {
			const res = await fetch(`/api/chat/rooms/${roomId}/charter`);
			if (res.ok) {
				const data = await res.json();
				setCharterAccepted({
					creator: data.creatorAccepted,
					participant: data.participantAccepted,
					all: data.allAccepted
				});
				
				// 检查是否需要显示宪章对话框
				// 只有DUO房间的参与者需要同意宪章
				if (currentUserId && roomInfo) {
					const isParticipant = roomType === 'DUO' && currentUserId === roomInfo.participantId;
					
					if (isParticipant && !data.participantAccepted) {
						// DUO房间的参与者需要同意宪章
						setShowCharterDialog(true);
					} else {
						// 其他情况不显示宪章对话框
						setShowCharterDialog(false);
					}
				}
			}
		} catch (error) {
			console.error('[ChatRoom] 加载宪章状态失败:', error);
		}
		return Promise.resolve();
	};

	useEffect(() => {
		loadRoomInfo();
		loadMessages();
	}, [roomId]);

	// 定期刷新房间信息（用于检测房间类型变化，如SOLO变为DUO）
	useEffect(() => {
		if (!roomId || !currentUserId) return;

		// 每5秒检查一次房间信息，看是否有变化（如参与者加入）
		const interval = setInterval(async () => {
			try {
				const res = await fetch(`/api/chat/rooms/${roomId}`);
				if (res.ok) {
					const data = await res.json();
					const newRoomType = data.room?.type || 'SOLO';
					const newParticipantId = data.room?.participantId || null;
					
					// 如果房间类型或参与者发生变化，重新加载房间信息
					if (newRoomType !== roomType || newParticipantId !== roomInfo?.participantId) {
						console.log('[ChatRoom] 🔄 检测到房间状态变化，重新加载房间信息:', {
							旧类型: roomType,
							新类型: newRoomType,
							旧参与者: roomInfo?.participantId,
							新参与者: newParticipantId
						});
						loadRoomInfo();
					}
				}
			} catch (error) {
				console.error('[ChatRoom] 定期检查房间信息失败:', error);
			}
		}, 5000); // 每5秒检查一次

		return () => clearInterval(interval);
	}, [roomId, currentUserId, roomType, roomInfo?.participantId]);

	// 同步messagesRef和messages状态
	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	// 检测用户是否在底部附近
	const isNearBottom = () => {
		if (!messagesContainerRef.current) return true;
		const container = messagesContainerRef.current;
		const threshold = 150; // 距离底部150px以内认为是在底部
		return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
	};

	// 定期检查消息的监管状态更新（用于实时显示监管警告）
	useEffect(() => {
		if (!roomId || !currentUserId) return;

		// 每3秒检查一次消息的监管状态更新
		const interval = setInterval(async () => {
			try {
				// 从ref获取最新的消息列表
				const currentMessages = messagesRef.current;
				
				// 获取所有待审核或可能有更新的消息ID
				const pendingMessageIds = currentMessages
					.filter(m => !m.moderationStatus || m.moderationStatus === 'PENDING')
					.map(m => m.id);

				if (pendingMessageIds.length === 0) return;

				// 批量查询这些消息的最新状态
				const res = await fetch(`/api/chat/rooms/${roomId}/messages?ids=${pendingMessageIds.join(',')}`);
				if (res.ok) {
					const data = await res.json();
					if (data.messages && data.messages.length > 0) {
						// 更新消息的监管状态
						setMessages((prev) => {
							const updated = prev.map(msg => {
								const updatedMsg = data.messages.find((m: any) => m.id === msg.id);
								if (updatedMsg && (
									updatedMsg.moderationStatus !== msg.moderationStatus ||
									updatedMsg.moderationNote !== msg.moderationNote ||
									JSON.stringify(updatedMsg.moderationDetails) !== JSON.stringify(msg.moderationDetails)
								)) {
									console.log('[ChatRoom] 🔔 检测到消息监管状态更新:', {
										消息ID: msg.id,
										旧状态: msg.moderationStatus,
										新状态: updatedMsg.moderationStatus
									});
									return { ...msg, ...updatedMsg };
								}
								return msg;
							});
							return updated;
						});
					}
				}
			} catch (error) {
				console.error('[ChatRoom] 定期检查监管状态失败:', error);
			}
		}, 3000); // 每3秒检查一次

		return () => clearInterval(interval);
	}, [roomId, currentUserId]);
	
	// 当房间信息和消息加载完成后，加载话题和宪章状态
	useEffect(() => {
		if (roomInfo && currentUserId && !loading) {
			// 如果是创建者，直接设置宪章对话框为 false，不加载宪章状态（创建者不需要在创建时同意宪章）
			const isCreator = currentUserId === roomInfo.creatorId;
			if (isCreator) {
				// 创建者永远不需要在进入房间时看到宪章对话框
				// 使用 ref 确保只设置一次，避免闪烁
				if (!charterDialogInitializedRef.current) {
					setShowCharterDialog(false);
					charterDialogInitializedRef.current = true;
				}
				// 创建者只需要加载话题信息
				loadTopicInfo();
			} else {
				// 参与者需要加载宪章状态和话题信息
				charterDialogInitializedRef.current = false; // 重置标志，允许参与者显示宪章对话框
				loadCharterStatus().then(() => {
					// 延迟一下确保charterAccepted状态已更新
					setTimeout(() => {
						loadTopicInfo();
					}, 100);
				});
			}
		}
	}, [roomInfo, currentUserId, roomId, messages.length, loading]);

	// 监听流状态变化，当流完成时重新加载消息
	useEffect(() => {
		if (streamState && !streamState.isStreaming && streamState.content && streamingMessageId) {
			// 流已完成，重新加载消息以获取最终状态
			setTimeout(() => {
				loadMessages();
				setStreamingMessageId(null);
			}, 500);
		}
	}, [streamState?.isStreaming, streamingMessageId]);

	// 更新最后一条消息ID的引用
	useEffect(() => {
		if (messages.length > 0) {
			const lastMessage = messages[messages.length - 1];
			if (lastMessage?.id) {
				lastMessageIdRef.current = lastMessage.id;
			}
		}
	}, [messages]);

	// 使用useRef存储回调函数，避免频繁重建SSE连接
	const onNewMessageRef = useRef<(message: any) => void>();
	const onErrorRef = useRef<(error: Error) => void>();

	// 更新回调函数引用
	useEffect(() => {
		onNewMessageRef.current = (newMessage: any) => {
			console.log('[ChatRoom] ✅ SSE收到新消息:', newMessage.id, '发送者:', newMessage.senderId, '内容:', newMessage.content?.substring(0, 50));
			
			// 添加新消息到列表
			setMessages((prev) => {
				const existingIds = new Set(prev.map(m => m.id));
				const isNewMessage = !existingIds.has(newMessage.id);
				
				if (!isNewMessage) {
					// 消息已存在，更新它（可能是AI流式输出的更新或监管状态更新）
					console.log('[ChatRoom] 更新已存在的消息:', newMessage.id);
					return prev.map(m => 
						m.id === newMessage.id ? { ...m, ...newMessage } : m
					);
				}
				
				// 新消息，添加到列表
				console.log('[ChatRoom] 添加新消息到列表，当前消息数:', prev.length, '新消息ID:', newMessage.id);
				const merged = [...prev, newMessage].sort((a, b) => 
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
				);
				
				// 更新ref
				if (merged.length > 0) {
					lastMessageIdRef.current = merged[merged.length - 1].id;
				}
				
				// 如果是新消息且用户在底部附近，自动滚动到底部
				setTimeout(() => {
					if (messagesEndRef.current && isNearBottom()) {
						messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
					}
				}, 100);
				
				return merged;
			});
		};

		onErrorRef.current = (error: Error) => {
			console.error('[ChatRoom] ❌ SSE错误:', error);
		};
	}, []);

	// 使用SSE实时接收新消息（DUO房间）
	// 注意：enabled条件中移除了messages.length > 0，确保即使没有消息也能建立连接
	const sseEnabled = roomType === 'DUO' && !!roomId && !!currentUserId;
	const sseRoomId = roomType === 'DUO' ? roomId : '';
	
	// 调试：输出SSE连接条件
	useEffect(() => {
		if (roomType === 'DUO') {
			console.log('[ChatRoom] 🔍 SSE连接条件检查:', {
				roomType: String(roomType),
				roomId: String(roomId || ''),
				currentUserId: String(currentUserId || ''),
				sseEnabled: Boolean(sseEnabled),
				sseRoomId: String(sseRoomId || ''),
				afterMessageId: String(lastMessageIdRef.current || ''),
				'roomType === DUO': roomType === 'DUO',
				'!!roomId': !!roomId,
				'!!currentUserId': !!currentUserId,
				'最终enabled': sseEnabled
			});
		} else {
			console.log('[ChatRoom] ⚠️ 房间类型不是DUO，不建立SSE连接:', {
				roomType: String(roomType || 'null'),
				roomId: String(roomId || '')
			});
		}
	}, [roomType, roomId, currentUserId, sseEnabled, sseRoomId]);

	const { connected: sseConnected } = useChatEvents({
		roomId: sseRoomId,
		enabled: sseEnabled,
		afterMessageId: lastMessageIdRef.current,
		onNewMessage: (message: any) => {
			console.log('[ChatRoom] onNewMessage回调被调用，消息ID:', message.id, '发送者:', message.senderId);
			onNewMessageRef.current?.(message);
		},
		onError: (error: Error) => onErrorRef.current?.(error)
	});

	// 显示SSE连接状态（调试用）
	useEffect(() => {
		if (roomType === 'DUO') {
			console.log('[ChatRoom] 📡 SSE连接状态:', sseConnected ? '✅ 已连接' : '❌ 未连接', {
				connected: Boolean(sseConnected),
				roomId: String(roomId || ''),
				currentUserId: String(currentUserId || ''),
				sseEnabled: Boolean(sseEnabled),
				sseRoomId: String(sseRoomId || ''),
				如果未连接原因: !sseEnabled ? 'SSE连接被禁用（检查条件不满足）' : '等待连接建立'
			});
		}
	}, [sseConnected, roomType, roomId, currentUserId, sseEnabled, sseRoomId]);

	// 滚动到底部（只在用户接近底部时自动滚动）
	// 使用useRef存储上一次的消息数量，只在消息数量增加时滚动
	const prevMessageCountRef = useRef(0);
	useEffect(() => {
		const currentCount = messages.length;
		const isNewMessage = currentCount > prevMessageCountRef.current;
		prevMessageCountRef.current = currentCount;
		
		// 只有在消息数量增加（新消息）且用户在底部附近时才自动滚动
		if (isNewMessage && messagesEndRef.current && isNearBottom()) {
			setTimeout(() => {
				if (messagesEndRef.current && isNearBottom()) {
					messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
				}
			}, 50);
		}
	}, [messages.length]); // 只依赖消息数量

	// 流式文本更新时的滚动（只在用户接近底部时）
	useEffect(() => {
		if (currentText && messagesEndRef.current && isNearBottom()) {
			messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, [currentText]); // 只依赖流式文本

	// 发送消息
	// 处理@提及选择（特殊操作如更换话题）
	const handleMentionSelect = (mention: string) => {
		if (mention === '更换话题') {
			setShowTopicChangeDialog(true);
		}
	};

	const handleSend = async (content: string) => {
		if (!content.trim() || sending) return;

		setSending(true);

		try {
			console.log('[ChatRoom] 📤 准备发送消息:', {
				roomId,
				currentUserId,
				content: content.substring(0, 50),
				roomType
			});

			// 发送用户消息
			const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});

			if (!res.ok) {
				const error = await res.json();
				console.error('[ChatRoom] ❌ 发送消息失败:', error);
				throw new Error(error.error || '发送消息失败');
			}

			const data = await res.json();
			console.log('[ChatRoom] ✅ 消息发送成功，收到响应:', {
				messageId: data.message?.id,
				senderId: data.message?.senderId,
				senderEmail: data.message?.sender?.email,
				sequence: data.message?.sequence,
				content: data.message?.content?.substring(0, 50)
			});

			const newMessages = [...messages, data.message];
			setMessages(newMessages);
			messagesRef.current = newMessages; // 同步更新ref
			
			// 更新最后一条消息ID的引用
			if (data.message?.id) {
				lastMessageIdRef.current = data.message.id;
				console.log('[ChatRoom] 更新lastMessageIdRef:', data.message.id);
			}

			// 异步触发监督分析（不阻塞消息发送，DUO房间和SOLO房间都需要监督）
			if (data.message?.id) {
				fetch(`/api/chat/messages/${data.message.id}/moderate`, {
					method: 'POST'
				}).catch((err) => {
					console.error('[ChatRoom] 触发监督分析失败:', err);
				});
			}

			// 检查消息中是否包含@AI昵称，只有包含时才触发AI回复
			// aiNickname 现在总是有值（如果没有设置，会返回默认昵称）
			const aiName = aiNickname || 'AI助手';
			const mentionPattern = new RegExp(`@${aiName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
			const hasMention = mentionPattern.test(content);
			
			if (!hasMention) {
				// 没有@AI，只是普通聊天，不触发AI回复
				console.log('[ChatRoom] 消息中未包含@AI昵称，不触发AI回复');
				return;
			}

			// 创建 AI 建议消息并启动流式输出
			try {
				console.log('[ChatRoom] 检测到@AI提及，开始创建AI消息，用户消息:', content);
				
				// 先创建空的 AI 建议消息
				const createAiRes = await fetch(`/api/chat/rooms/${roomId}/messages`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						content: '',
						contentType: 'AI_SUGGESTION'
					})
				});

				if (!createAiRes.ok) {
					const errorData = await createAiRes.json().catch(() => ({}));
					console.error('[ChatRoom] 创建AI消息失败:', errorData);
					throw new Error(errorData.error || 'Failed to create AI message');
				}

				const aiData = await createAiRes.json();
				const aiMessage = aiData.message;
				console.log('[ChatRoom] AI消息已创建，ID:', aiMessage.id);

				// 设置正在流式输出的消息ID
				setStreamingMessageId(aiMessage.id);
				console.log('[ChatRoom] 设置streamingMessageId:', aiMessage.id);

				// 添加到消息列表（显示为"AI 正在思考..."）
				setMessages((prev) => {
					const updated = [
						...prev,
						{
							...aiMessage,
							isStreaming: true,
							streamingText: ''
						}
					];
					console.log('[ChatRoom] 消息列表已更新，总数:', updated.length);
					
					// 更新最后一条消息ID的引用
					if (aiMessage?.id) {
						lastMessageIdRef.current = aiMessage.id;
					}
					
					return updated;
				});

				// 构建上下文 - 包含房间内所有讨论消息，确保AI围绕话题展开
				// 包含：1) 所有用户发送的消息 2) 所有已采纳的AI消息（这些是实际讨论内容）
				// 不包含：未采纳的AI建议（这些只是建议，不是实际讨论内容）
				const discussionMessages = newMessages.filter((m: Message) => {
					return (
						m.contentType === 'USER' ||
						m.contentType === 'AI_ADOPTED'
					);
				});
				
				// 构建上下文，标识不同用户的消息
				const context: Array<{ role: 'user' | 'assistant'; content: string }> = [];
				
				// 在DUO房间中，添加系统提示
				if (roomType === 'DUO' && roomInfo) {
					context.push({
						role: 'user',
						content: `这是一个双人讨论。请仔细阅读以下讨论内容，理解讨论的话题和双方的观点，然后为当前用户提供围绕话题的建议和帮助。`
					});
				}
				
				// 添加讨论消息，标识发送者
				discussionMessages
					.slice(-15) // 保留最近15条讨论消息
					.forEach((m: Message) => {
						// 标识消息发送者
						let messageContent = m.content;
						
						if (roomType === 'DUO' && roomInfo) {
							// 在DUO房间中，标识是哪个用户的消息
							if (m.senderId === roomInfo.creatorId) {
								messageContent = `[用户A] ${m.content}`;
							} else if (m.senderId === roomInfo.participantId) {
								messageContent = `[用户B] ${m.content}`;
							}
						}
						
						context.push({
							role: 'user',
							content: messageContent
						});
					});
				
				// 添加当前用户的新消息
				context.push({
					role: 'user',
					content: roomType === 'DUO' && roomInfo && currentUserId === roomInfo.creatorId
						? `[用户A] ${content}`
						: roomType === 'DUO' && roomInfo && currentUserId === roomInfo.participantId
						? `[用户B] ${content}`
						: content
				});
				
				console.log('[ChatRoom] AI上下文（包含所有讨论消息）:', {
					totalMessages: newMessages.length,
					discussionMessages: discussionMessages.length,
					contextLength: context.length,
					roomType,
					currentUserId
				});
				
				console.log('[ChatRoom] 启动流式输出，context长度:', context.length);
				console.log('[ChatRoom] 调用startStream，参数:', {
					messageId: aiMessage.id,
					prompt: content,
					roomId,
					contextLength: context.length
				});

				// 启动流式输出（使用全局Context，即使组件卸载也会继续）
				startStream(
					aiMessage.id,
					roomId,
					content,
					context
				);
				
				console.log('[ChatRoom] startStream调用完成');
			} catch (error: any) {
				console.error('[ChatRoom] 创建AI消息或启动流式输出失败:', error);
				alert(`AI回复失败: ${error.message || '未知错误'}`);
			}
		} catch (error: any) {
			console.error('[ChatRoom] Failed to send message:', error);
			alert(error.message || '发送消息失败');
		} finally {
			setSending(false);
		}
	};

	// 处理话题设置完成
	const handleTopicSetupComplete = async (topic: string, description: string) => {
		try {
			const res = await fetch(`/api/chat/rooms/${roomId}/topic`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ topic, description })
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || '设置话题失败');
			}

			setTopic(topic);
			setTopicDescription(description);
			setShowTopicSetup(false);
		} catch (error: any) {
			console.error('[ChatRoom] 设置话题失败:', error);
			alert(`设置话题失败: ${error.message || '未知错误'}`);
		}
	};

	// 处理话题设置取消
	const handleTopicSetupCancel = () => {
		setShowTopicSetup(false);
		// 用户可以稍后再设置话题
	};

	// 处理宪章同意
	const handleCharterAccept = async () => {
		// 保存 showCharterForInvite 的值，避免状态更新导致的问题
		const wasInviteCharter = showCharterForInvite;
		
		try {
			const res = await fetch(`/api/chat/rooms/${roomId}/charter`, {
				method: 'POST'
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || '同意宪章失败');
			}

			const data = await res.json();
			const newCharterAccepted = {
				creator: data.room.creatorCharterAccepted,
				participant: data.room.participantCharterAccepted,
				all: data.allAccepted
			};
			setCharterAccepted(newCharterAccepted);
			setShowCharterDialog(false);
			
			// 如果是邀请前的宪章对话框，同意后打开邀请对话框
			// 注意：只有在用户没有关闭对话框的情况下才打开邀请对话框
			// 如果用户关闭了对话框，wasInviteCharter 会是 false，不会打开邀请对话框
			if (wasInviteCharter) {
				setShowCharterForInvite(false);
				setInviteDialogOpen(true);
			}
			
			// 同意宪章后，如果是创建者且没有话题，显示话题设置对话框
			// 重新获取话题信息以确保使用最新值
			if (currentUserId && roomInfo?.creatorId === currentUserId && messages.length === 0 && !showCharterForInvite) {
				const topicRes = await fetch(`/api/chat/rooms/${roomId}/topic`);
				if (topicRes.ok) {
					const topicData = await topicRes.json();
					if (!topicData.topic) {
						// 没有话题，显示话题设置对话框
						setShowTopicSetup(true);
					}
				}
			}
		} catch (error: any) {
			console.error('[ChatRoom] 同意宪章失败:', error);
			alert(`同意宪章失败: ${error.message || '未知错误'}`);
		}
	};

	// 处理宪章同意取消
	const handleCharterCancel = () => {
		setShowCharterDialog(false);
		// 如果是邀请前的宪章对话框，关闭时确保不会打开邀请对话框
		if (showCharterForInvite) {
			setShowCharterForInvite(false);
			// 确保不会打开邀请对话框
			setInviteDialogOpen(false);
		}
		// 取消宪章后，不进入话题设置流程或邀请流程
		// 用户可以稍后再同意宪章
	};

	// 处理更换话题请求完成
	const handleTopicChangeComplete = () => {
		setShowTopicChangeDialog(false);
		loadTopicInfo(); // 重新加载话题信息
	};

	// 处理更换话题请求的批准/拒绝
	const handleTopicChangeResponse = async (action: 'approve' | 'reject', newDescription?: string) => {
		try {
			const res = await fetch(`/api/chat/rooms/${roomId}/topic/change`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action,
					newDescription
				})
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || '操作失败');
			}

			loadTopicInfo(); // 重新加载话题信息
			alert(action === 'approve' ? '话题已更换' : '更换话题请求已拒绝');
		} catch (error: any) {
			console.error('[ChatRoom] 处理更换话题请求失败:', error);
			alert(`操作失败: ${error.message || '未知错误'}`);
		}
	};

	// 引用消息
	const handleQuote = (messageId: string) => {
		const message = messages.find(m => m.id === messageId);
		if (!message) {
			console.warn('[ChatRoom] ⚠️ 未找到要引用的消息，messageId:', messageId);
			return;
		}

		console.log('[ChatRoom] 📎 准备引用消息:', {
			messageId,
			sender: message.sender.name || message.sender.email,
			contentPreview: message.content.substring(0, 50)
		});

		// 在输入框中插入引用格式
		// 使用Markdown引用格式：> 引用内容
		const senderName = message.sender.name || message.sender.email;
		const contentPreview = message.content.length > 100 
			? message.content.substring(0, 100) + '...' 
			: message.content;
		const quoteText = `> @${senderName}: ${contentPreview}\n\n`;
		
		// 触发引用事件（需要在ChatInput中处理）
		if (typeof window !== 'undefined') {
			const event = new CustomEvent('quote-message', {
				detail: { quoteText, messageId }
			});
			console.log('[ChatRoom] 📤 发送引用事件:', { quoteText: quoteText.substring(0, 50), messageId });
			window.dispatchEvent(event);
		} else {
			console.error('[ChatRoom] ❌ window未定义，无法发送引用事件');
		}
	};

	// 重新生成AI回答
	const handleRegenerate = async (messageId: string) => {
		try {
			console.log('[ChatRoom] 🔄 开始重新生成AI回答，原始消息ID:', messageId);
			
			const res = await fetch(`/api/chat/messages/${messageId}/regenerate`, {
				method: 'POST'
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || '重新生成失败');
			}

			const data = await res.json();
			console.log('[ChatRoom] ✅ 重新生成API返回:', {
				messageId: data.message?.id,
				prompt: data.prompt?.substring(0, 50),
				contextLength: data.context?.length
			});

			// 重新生成API已经创建了新消息并返回完整信息
			const aiMessage = data.message;

			if (!aiMessage) {
				throw new Error('未找到新创建的消息');
			}

			console.log('[ChatRoom] ✅ 获取到新AI消息:', aiMessage.id);

			// 设置正在流式输出的消息ID
			setStreamingMessageId(aiMessage.id);

			// 添加到消息列表
			setMessages((prev) => [
				...prev,
				{
					...aiMessage,
					isStreaming: true,
					streamingText: ''
				}
			]);

			// 启动流式输出
			console.log('[ChatRoom] 🚀 启动流式输出，messageId:', aiMessage.id);
			startStream(
				aiMessage.id,
				roomId,
				data.prompt,
				data.context
			);
		} catch (error: any) {
			console.error('[ChatRoom] ❌ 重新生成失败:', error);
			alert(`重新生成失败: ${error.message || '未知错误'}`);
		}
	};

	// 采纳 AI 建议
	const handleAdopt = async (messageId: string) => {
		try {
			const res = await fetch(`/api/chat/messages/${messageId}/adopt`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ roomId })
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || '采纳失败');
			}

			const data = await res.json();
			
			// 直接更新本地消息状态，而不是重新加载
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === messageId
						? { ...msg, isAdopted: true, content: data.message?.content || msg.content }
						: msg
				)
			);
		} catch (error: any) {
			console.error('[ChatRoom] Failed to adopt message:', error);
			alert(error.message || '采纳失败');
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
					<p style={{ color: 'var(--color-text-secondary)' }}>加载中...</p>
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100vh',
				background: 'var(--color-background)',
				maxWidth: '100%',
				margin: '0 auto'
			}}
		>
			{/* 房间标题（DUO房间显示创建者和参与者） */}
			{roomType === 'DUO' && roomInfo && (
				<div
					style={{
						borderBottom: '1px solid var(--color-border)',
						padding: '12px 20px',
						background: 'var(--color-background-secondary)',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center'
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						{roomInfo.creator?.avatarUrl ? (
							<img
								src={roomInfo.creator.avatarUrl}
								alt={roomInfo.creator.name || roomInfo.creator.email}
								style={{
									width: 24,
									height: 24,
									borderRadius: '50%',
									objectFit: 'cover'
								}}
							/>
						) : (
							<div
								style={{
									width: 24,
									height: 24,
									borderRadius: '50%',
									background: 'var(--color-primary)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: 'white',
									fontSize: '12px',
									fontWeight: 600
								}}
							>
								{(roomInfo.creator?.name || roomInfo.creator?.email || 'C').charAt(0).toUpperCase()}
							</div>
						)}
						<span style={{ fontSize: '14px', fontWeight: 500 }}>
							{roomInfo.creator?.name || roomInfo.creator?.email || '创建者'}
						</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						{roomInfo.participant?.avatarUrl ? (
							<img
								src={roomInfo.participant.avatarUrl}
								alt={roomInfo.participant.name || roomInfo.participant.email}
								style={{
									width: 24,
									height: 24,
									borderRadius: '50%',
									objectFit: 'cover'
								}}
							/>
						) : (
							<div
								style={{
									width: 24,
									height: 24,
									borderRadius: '50%',
									background: 'var(--color-primary)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: 'white',
									fontSize: '12px',
									fontWeight: 600
								}}
							>
								{(roomInfo.participant?.name || roomInfo.participant?.email || 'P').charAt(0).toUpperCase()}
							</div>
						)}
						<span style={{ fontSize: '14px', fontWeight: 500 }}>
							{roomInfo.participant?.name || roomInfo.participant?.email || '参与者'}
						</span>
					</div>
				</div>
			)}
			
			{/* 消息列表容器 */}
			<div
				ref={messagesContainerRef}
				style={{
					flex: 1,
					overflowY: 'auto',
					overflowX: 'hidden',
					padding: '20px 0',
					background: 'var(--color-background)',
					scrollBehavior: 'smooth'
				}}
			>
				<div
					style={{
						maxWidth: '100%',
						margin: '0 auto',
						padding: '0 40px',
						display: 'flex',
						flexDirection: 'column'
					}}
				>
					{/* 分析面板（仅DUO房间显示） */}
					{roomType === 'DUO' && (
						<AnalysisPanel roomId={roomId} />
					)}
					{messages.length === 0 ? (
						<div
							style={{
								textAlign: 'center',
								padding: '60px 20px',
								color: 'var(--color-text-secondary)'
							}}
						>
							<div
								style={{
									fontSize: '32px',
									marginBottom: '16px',
									opacity: 0.5
								}}
							>
								💬
							</div>
							<p style={{ fontSize: '18px', marginBottom: '8px' }}>开始对话吧！</p>
							<p style={{ fontSize: '14px', opacity: 0.7 }}>
								输入消息，AI 将为您提供建议
							</p>
						</div>
					) : (
						<>
							{messages.map((message, index) => {
								// 检查是否是正在流式输出的消息
								const isStreamingMessage = message.id === streamingMessageId;
								const streamingText = isStreamingMessage && currentText
									? currentText
									: undefined;

								// 判断消息是否属于当前用户
								// 无论是用户消息还是AI消息，只要senderId是当前用户，就是"我的消息"
								const isMyMessage = currentUserId && message.senderId === currentUserId;
								
								// 无论是SOLO还是DUO，当前用户的消息（包括AI消息）始终在左边
								// DUO房间中，对方的消息（包括对方的AI消息）在右边
								const isLeftAligned = isMyMessage;
								
								// 调试日志（仅在开发环境）
								if (process.env.NODE_ENV === 'development' && messages.length <= 2) {
									console.log('[ChatRoom] 消息对齐检查:', {
										消息ID: message.id,
										发送者ID: message.senderId,
										当前用户ID: currentUserId,
										是我的消息: isMyMessage,
										左对齐: isLeftAligned,
										消息类型: message.contentType
									});
								}

								// 获取发送者的AI昵称（如果是AI消息）
								const isAiMessage = message.contentType === 'AI_SUGGESTION' || message.contentType === 'AI_ADOPTED';
								const messageAiNickname = isAiMessage && message.senderId === currentUserId 
									? aiNickname 
									: null;
								const messageIsSystemAi = isAiMessage && message.senderId === currentUserId 
									? isSystemAi 
									: false;

								// 调试：检查AI消息和重新生成按钮条件
								if (isAiMessage) {
									const canRegenerate = message.contentType === 'AI_SUGGESTION' && !message.isAdopted && message.senderId === currentUserId;
									console.log('[ChatRoom] 🤖 AI消息检查:', {
										messageId: message.id,
										contentType: message.contentType,
										senderId: message.senderId,
										currentUserId,
										isAdopted: message.isAdopted,
										canRegenerate,
										reason: !canRegenerate ? (
											message.contentType !== 'AI_SUGGESTION' ? '不是AI_SUGGESTION' :
											message.isAdopted ? '已采纳' :
											message.senderId !== currentUserId ? '不是当前用户的AI' : '未知'
										) : '可以重新生成'
									});
								}

								return (
									<ChatMessage
										key={message.id}
										id={message.id}
										content={message.content}
										senderId={message.senderId}
										senderName={
											message.sender.name ||
											message.sender.email
										}
										senderAvatar={message.sender.avatarUrl || undefined}
										type={message.contentType}
										isStreaming={
											isStreamingMessage && streaming
										}
										streamingText={streamingText}
										createdAt={message.createdAt}
										isCurrentUser={message.senderId === currentUserId}
										isLeftAligned={isLeftAligned}
										aiNickname={messageAiNickname}
										isSystemAi={messageIsSystemAi}
										isAdopted={message.isAdopted}
										moderationStatus={message.moderationStatus}
										moderationNote={message.moderationNote || undefined}
										moderationDetails={message.moderationDetails as any}
										onAdopt={
											message.contentType === 'AI_SUGGESTION' &&
											!message.isAdopted &&
											message.senderId === currentUserId
												? handleAdopt
												: undefined
										}
										onQuote={handleQuote}
										onRegenerate={
											message.contentType === 'AI_SUGGESTION' &&
											!message.isAdopted &&
											message.senderId === currentUserId
												? handleRegenerate
												: undefined
										}
										references={
											message.references?.map((ref) => ({
												id: ref.id,
												content: ref.referencedMessage?.content || '',
												senderName:
													ref.referencedMessage?.sender?.name ||
													ref.referencedMessage?.sender?.email ||
													'未知用户'
											})) || []
										}
									/>
								);
							})}
							<div ref={messagesEndRef} />
						</>
					)}
				</div>
			</div>

			{/* 输入框 */}
			<div
				style={{
					borderTop: '1px solid var(--color-border)',
					background: 'var(--color-background)',
					padding: '16px 0'
				}}
			>
				<div style={{ maxWidth: '768px', margin: '0 auto', padding: '0 20px' }}>
					<ChatInput
						onSend={handleSend}
						disabled={sending || streaming}
						aiNickname={aiNickname}
						onMentionSelect={handleMentionSelect}
						placeholder={
							streaming
								? 'AI 正在思考...'
								: sending
								? '发送中...'
								: aiNickname
									? `输入消息，@${aiNickname} 来激活AI回复...`
									: '输入消息，@AI助手 来激活AI回复...'
						}
					/>
				</div>
			</div>
			
			{/* 邀请按钮（仅SOLO房间显示，如果roomType为null则默认显示） */}
			{(roomType === 'SOLO' || roomType === null) && (
				<button
					onClick={async () => {
						// 检查是否已同意宪章
						if (!charterAccepted.creator) {
							// 未同意宪章，显示宪章对话框
							setShowCharterForInvite(true);
						} else {
							// 已同意宪章，直接打开邀请对话框
							setInviteDialogOpen(true);
						}
					}}
					style={{
						position: 'fixed',
						bottom: '100px',
						right: '20px',
						padding: '12px 24px',
						background: 'var(--color-primary)',
						color: 'white',
						border: 'none',
						borderRadius: '8px',
						cursor: 'pointer',
						boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
						fontSize: '14px',
						fontWeight: '500'
					}}
					title="邀请用户加入聊天室"
				>
					邀请
				</button>
			)}
			
			<InviteDialog
				roomId={roomId}
				open={inviteDialogOpen}
				onClose={() => setInviteDialogOpen(false)}
			/>
			
			{/* 话题设置对话框 */}
			{showTopicSetup && (
				<TopicSetupDialog
					roomId={roomId}
					onComplete={handleTopicSetupComplete}
					onClose={handleTopicSetupCancel}
				/>
			)}
			
			{/* 宪章同意对话框（参与者进入房间时） */}
			{showCharterDialog && !showCharterForInvite && (
				<CharterAcceptanceDialog
					onAccept={handleCharterAccept}
					onClose={handleCharterCancel}
					isCreator={currentUserId === roomInfo?.creatorId}
					canCancel={currentUserId === roomInfo?.creatorId} // 只有创建者可以取消，参与者必须同意
				/>
			)}
			
			{/* 宪章同意对话框（邀请前） */}
			{showCharterForInvite && (
				<CharterAcceptanceDialog
					onAccept={handleCharterAccept}
					onClose={handleCharterCancel}
					isCreator={true}
					canCancel={true} // 邀请前可以取消
				/>
			)}
			
			{/* 更换话题对话框 */}
			{showTopicChangeDialog && topic && (
				<TopicChangeDialog
					roomId={roomId}
					currentTopic={topic}
					currentDescription={topicDescription || undefined}
					onComplete={handleTopicChangeComplete}
					onCancel={() => setShowTopicChangeDialog(false)}
				/>
			)}
			
			{/* 更换话题请求通知（如果有待处理的请求） */}
			{topicChangeRequest && topicChangeRequest.requestedBy !== currentUserId && (
				<div
					style={{
						position: 'fixed',
						bottom: '100px',
						left: '50%',
						transform: 'translateX(-50%)',
						background: 'var(--color-warning-lighter)',
						border: '1px solid var(--color-warning)',
						borderRadius: '8px',
						padding: '16px 24px',
						maxWidth: '500px',
						zIndex: 999,
						boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
					}}
				>
					<div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-warning)' }}>
						收到更换话题请求
					</div>
					<div style={{ fontSize: '13px', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
						对方请求将话题更换为：<strong>{topicChangeRequest.request}</strong>
					</div>
					<div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
						<button
							onClick={() => handleTopicChangeResponse('reject')}
							style={{
								padding: '6px 16px',
								border: '1px solid var(--color-border)',
								borderRadius: '6px',
								background: 'var(--color-background)',
								color: 'var(--color-text-primary)',
								fontSize: '13px',
								cursor: 'pointer'
							}}
						>
							拒绝
						</button>
						<button
							onClick={() => handleTopicChangeResponse('approve')}
							style={{
								padding: '6px 16px',
								border: 'none',
								borderRadius: '6px',
								background: 'var(--color-primary)',
								color: 'white',
								fontSize: '13px',
								cursor: 'pointer'
							}}
						>
							同意
						</button>
					</div>
				</div>
			)}

			{/* 注册提示弹窗（匿名用户） */}
			<RegisterPrompt
				isGuest={isGuest}
				onRegisterSuccess={() => {
					// 注册成功后的回调
					setIsGuest(false);
				}}
			/>
		</div>
	);
}
