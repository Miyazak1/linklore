'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import InviteDialog from './InviteDialog';
import AnalysisPanel from './AnalysisPanel';
import TopicSetupDialog from './TopicSetupDialog';
import CharterAcceptanceDialog from './CharterAcceptanceDialog';
import BookSearchDialog from '@/shared/components/BookSearchDialog';
import ShareButton from './ShareButton';
import ShareCardPreview from './ShareCardPreview';
import { useChatStream } from '@/contexts/ChatStreamContext';
import { useAuth } from '@/contexts/AuthContext';
import { useChatEvents } from '@/hooks/useChatEvents';
import { useShareCard } from '@/hooks/useShareCard';
import type { ShareCardMessage } from '@/types/share';
import { createModuleLogger } from '@/lib/utils/logger';
import { MessageIcon } from '@/components/ui/Icons';

const log = createModuleLogger('ChatRoom');

interface ChatRoomProps {
	roomId: string;
	inviteToken?: string; // 可选的邀请token，用于未登录用户通过邀请链接进入
	onRoomJoined?: () => void; // 房间加入成功后的回调，用于刷新侧边栏
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
		referencedMessage?: {
			content: string;
			sender: {
				name: string | null;
				email: string;
			};
		};
	}>;
}

export default function ChatRoom({ roomId, inviteToken: propInviteToken, onRoomJoined }: ChatRoomProps) {
	const router = useRouter();
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(true);
	const [dataFullyLoaded, setDataFullyLoaded] = useState(false); // 数据是否完全加载完成（包括房间信息、消息、话题、宪章等）
	const [secondUserFullyReady, setSecondUserFullyReady] = useState(false); // 第二个用户是否完全准备好（已进入房间、同意宪章、数据加载完成）
	const { user: authUser, isAuthenticated: authIsAuthenticated, loading: authLoading, refreshAuth } = useAuth();
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [userInfoLoading, setUserInfoLoading] = useState(true); // 用户信息是否正在加载
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
	// 跟踪其他用户的AI流式输出（key: messageId, value: 当前内容）
	const [otherUserStreams, setOtherUserStreams] = useState<Map<string, string>>(new Map());
	const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
	const [showCharterForInvite, setShowCharterForInvite] = useState(false); // 邀请前的宪章对话框
	
	// 话题和宪章相关状态
	const [topic, setTopic] = useState<string | null>(null);
	const [topicDescription, setTopicDescription] = useState<string | null>(null);
	const [showTopicSetup, setShowTopicSetup] = useState(false);
	const [showCharterDialog, setShowCharterDialog] = useState(false);
	const [showBookSearchDialog, setShowBookSearchDialog] = useState(false);
	const [charterAccepted, setCharterAccepted] = useState({ creator: false, participant: false, all: false });
	
	// 邀请流程相关状态
	const searchParams = useSearchParams();
	const [showAuthDialog, setShowAuthDialog] = useState(false); // 统一的认证对话框（登录/注册）
	const [isLoginMode, setIsLoginMode] = useState(false); // true=登录模式, false=注册模式
	const [authEmail, setAuthEmail] = useState('');
	const [authPassword, setAuthPassword] = useState('');
	const [authConfirmPassword, setAuthConfirmPassword] = useState('');
	const [authError, setAuthError] = useState<string | null>(null);
	const [isAuthing, setIsAuthing] = useState(false);
	const [hasRoomAccess, setHasRoomAccess] = useState(false); // 用户是否有权限访问房间（已加入房间）
	
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesRef = useRef<Message[]>([]); // 用于定期检查监管状态
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const lastMessageIdRef = useRef<string | null>(null); // 用于轮询的最后一条消息ID
	const charterDialogInitializedRef = useRef(false); // 用于跟踪宪章对话框是否已初始化
	const { startStream, getStreamState, clearStream, activeStreams } = useChatStream();
	
	// 分享功能
	const {
		shareMode,
		selectedMessageIds,
		selectedMessages,
		cardConfig,
		enterShareMode,
		exitShareMode,
		toggleMessage,
		selectAll,
		clearSelection,
		updateConfig
	} = useShareCard();
	const [showSharePreview, setShowSharePreview] = useState(false);

	// 从全局状态获取当前流式输出的状态
	// 使用useState和useEffect来同步状态，避免在渲染时直接读取导致的问题
	const [streamState, setStreamState] = useState<ReturnType<typeof activeStreams.get> | null>(null);
	
	// 使用ref存储上一次的流状态内容长度和isStreaming状态，用于检测变化
	const lastStateRef = useRef<{ contentLength: number; isStreaming: boolean } | null>(null);
	
	// 使用ref存储activeStreams的最新引用，确保setInterval中能获取到最新状态
	const activeStreamsRef = useRef(activeStreams);
	useEffect(() => {
		activeStreamsRef.current = activeStreams;
	}, [activeStreams]);

	// 使用setInterval定期检查流状态变化，避免因Map对象引用变化导致无限循环
	useEffect(() => {
		if (!streamingMessageId) {
			setStreamState(null);
			lastStateRef.current = null;
			return;
		}
		
		// 立即检查一次
		const checkState = () => {
			// 使用ref获取最新的activeStreams，确保能获取到最新状态
			const currentState = activeStreamsRef.current.get(streamingMessageId);
			if (!currentState) {
				// 如果流状态不存在，说明流已完成并被清除
				// 立即清除streamingMessageId，避免一直显示"生成中..."
				if (streamingMessageId) {
					log.debug('流状态不存在，清除streamingMessageId', { messageId: streamingMessageId });
					setStreamingMessageId(null);
					setStreamState(null);
					lastStateRef.current = null;
				}
				return;
			}
			
			const currentContentLength = currentState?.content?.length || 0;
			const currentIsStreaming = currentState?.isStreaming || false;
			
			// 如果流已完成（isStreaming为false），立即清除streamingMessageId
			if (!currentIsStreaming && streamingMessageId) {
				log.debug('检测到流已完成（isStreaming=false），清除streamingMessageId', { 
					messageId: streamingMessageId,
					contentLength: currentContentLength
				});
				// 立即清除streamingMessageId，这样streaming状态会立即变为false
				setStreamingMessageId(null);
				// 清除streamState，避免干扰streaming状态的计算
				setStreamState(null);
				lastStateRef.current = null;
				return;
			}
			
			// 如果流状态变化（包括内容长度变化或isStreaming变化），才更新state
			if (
				!lastStateRef.current ||
				lastStateRef.current.isStreaming !== currentIsStreaming ||
				lastStateRef.current.contentLength !== currentContentLength
			) {
				setStreamState(currentState);
				lastStateRef.current = {
					contentLength: currentContentLength,
					isStreaming: currentIsStreaming
				};
			}
		};
		
		checkState();
		
		// 每50ms检查一次（流式输出需要频繁更新，更频繁的检查确保状态及时更新）
		const interval = setInterval(checkState, 50);
		
		return () => clearInterval(interval);
	}, [streamingMessageId]); // 只依赖streamingMessageId，activeStreams通过ref获取最新值
	
	// 只有当streamingMessageId存在且streamState存在且isStreaming为true时，才认为正在流式输出
	// 这样可以确保当streamingMessageId被清除时，streaming立即变为false
	const streaming = !!(streamingMessageId && streamState && streamState.isStreaming);
	const currentText = streamState?.content || '';

	// 从Context获取当前用户信息（优先使用Context，避免重复请求）
	useEffect(() => {
		// 如果Context还在加载，等待
		if (authLoading) {
			return;
		}

		// 如果Context有用户信息，直接使用
		if (authUser?.id) {
			setCurrentUserId(authUser.id);
			setUserInfoLoading(false);
			log.debug('从Context获取到用户信息', { userId: authUser.id });
			return;
		}

		// 如果Context没有用户信息，延迟3秒后请求一次（作为后备，确保Navigation先完成）
		// 这样可以避免与Navigation的请求冲突
		const timer = setTimeout(async () => {
			try {
				log.debug('Context没有用户信息，延迟请求作为后备');
				const res = await fetch('/api/auth/me');
				
				// 处理429错误
				if (res.status === 429) {
					log.warn('请求过多 (429)，跳过后备请求');
					setCurrentUserId(null);
					setUserInfoLoading(false);
					return;
				}
				
				const data = await res.json();
				const user = data?.user;
				
				if (user?.id) {
					setCurrentUserId(user.id);
					log.debug('后备请求获取到用户信息', { userId: user.id });
				} else {
					setCurrentUserId(null);
					log.debug('后备请求：用户未登录');
				}
			} catch (err) {
				log.error('后备请求失败', err as Error);
				setCurrentUserId(null);
			} finally {
				setUserInfoLoading(false);
			}
		}, 3000); // 延迟3秒，确保Navigation先完成

		return () => {
			clearTimeout(timer);
		};
	}, [authUser, authLoading]);

	// 获取AI昵称（只在用户已登录时）
	useEffect(() => {
		if (!currentUserId) {
			// 未登录时，不加载AI昵称
			return;
		}
		
		let isMounted = true;
		
		fetch('/api/ai/nickname')
			.then((res) => {
				if (!res.ok) {
					// 对于 429 错误，静默处理，不阻塞 UI
					if (res.status === 429) {
						log.warn('获取AI昵称时请求过多，稍后重试');
						return null;
					}
					// 对于 401 错误，静默处理（可能是未登录）
					if (res.status === 401) {
						log.debug('未登录用户尝试获取AI昵称，这是正常的');
						return null;
					}
					throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				}
				return res.json();
			})
			.then((data) => {
				if (data && isMounted) {
					setAiNickname(data.nickname);
					setIsSystemAi(data.isSystemAi);
				}
			})
			.catch((err) => {
				// 静默处理错误，不影响主要功能
				if (err.message?.includes('429') || err.message?.includes('401')) {
					log.debug('获取AI昵称失败（可能是未登录或请求过多）');
				} else {
					log.error('Failed to get AI nickname', err as Error);
				}
			});
		
		return () => {
			isMounted = false;
		};
	}, [currentUserId]);

	// 加载房间信息（带重试机制）
	const loadRoomInfo = async (retryCount = 0) => {
		if (!roomId) {
			log.warn('roomId为空，无法加载房间信息');
			return;
		}
		// 如果用户未登录，不加载房间信息（避免401错误）
		if (!currentUserId) {
			log.debug('用户未登录，跳过加载房间信息');
			return;
		}
		try {
			log.debug('开始加载房间信息', { roomId, retryCount });
			const res = await fetch(`/api/chat/rooms/${roomId}`);
			
			// 处理429错误：延迟重试
			if (res.status === 429) {
				if (retryCount < 3) {
					const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // 指数退避，最多5秒
					log.warn('加载房间信息时遇到429错误，将在延迟后重试', { retryCount, delay });
					setTimeout(() => {
						loadRoomInfo(retryCount + 1);
					}, delay);
					return;
				} else {
					log.error('加载房间信息时遇到429错误，重试次数已达上限', { retryCount });
					// 429错误时，不设置roomType，保持当前状态（可能是null或之前的值）
					// 这样可以避免错误地关闭SSE连接
					return;
				}
			}
			
			if (res.ok) {
				const data = await res.json();
				const roomTypeFromApi = data.room?.type || 'SOLO';
				log.debug('房间信息加载成功', {
					roomId,
					roomType: roomTypeFromApi,
					creatorId: data.room?.creatorId,
					participantId: data.room?.participantId,
					hasCreator: !!data.room?.creator,
					hasParticipant: !!data.room?.participant,
				});
				setRoomType(roomTypeFromApi);
				
				// 确保即使 participant 对象不存在，只要有 participantId 就尝试获取
				const roomInfoData = {
					creatorId: data.room?.creatorId || '',
					participantId: data.room?.participantId || null,
					creator: data.room?.creator,
					participant: data.room?.participant || null
				};
				
				// 如果 participantId 存在但 participant 对象不存在，记录警告
				if (roomInfoData.participantId && !roomInfoData.participant) {
					log.warn('参与者ID存在但参与者对象不存在', {
						participantId: roomInfoData.participantId,
						hasParticipant: !!data.room?.participant,
					});
				}
				
				setRoomInfo(roomInfoData);
				
				// 如果用户是创建者或参与者，设置权限状态
				if (currentUserId && (roomInfoData.creatorId === currentUserId || roomInfoData.participantId === currentUserId)) {
					setHasRoomAccess(true);
				}
			} else {
				const errorData = await res.json().catch(() => ({}));
				// 如果是401或403错误，可能是权限问题，不设置roomType
				if (res.status === 401 || res.status === 403) {
					// 403错误在用户注册/登录后、加入房间前是预期的，使用debug级别而不是warn
					if (res.status === 403 && currentUserId) {
						log.debug('加载房间信息时权限不足（用户可能还未加入房间）', {
							status: res.status,
							roomId,
							currentUserId
						});
					} else {
						log.warn('加载房间信息时权限不足', {
							status: res.status,
							roomId
						});
					}
					// 不设置roomType，保持当前状态
					return;
				}
				// 其他错误，默认设置为 SOLO（可能是新房间）
				log.warn('加载房间信息失败，默认设置为SOLO', {
					status: res.status,
					statusText: res.statusText,
					error: errorData,
					roomId
				});
				setRoomType('SOLO');
			}
		} catch (error) {
			log.error('加载房间信息时出错', error as Error);
			// 网络错误时，不设置roomType，保持当前状态
			// 这样可以避免错误地关闭SSE连接
		}
	};

	// 加载消息
	const loadMessages = async (skipLoadingState = false) => {
		if (!roomId) {
			if (!skipLoadingState) {
				setLoading(false);
			}
			return;
		}
		// 如果用户未登录，不加载消息（避免401错误）
		if (!currentUserId) {
			log.debug('用户未登录，跳过加载消息');
			if (!skipLoadingState) {
				setLoading(false);
			}
			return;
		}
		
		try {
			const res = await fetch(`/api/chat/rooms/${roomId}/messages?limit=50`);
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				// 如果是401错误且用户未登录，不显示错误提示（这是正常的）
				if (res.status === 401 && !currentUserId) {
					log.debug('未登录用户尝试加载消息，这是正常的');
					if (!skipLoadingState) {
						setLoading(false);
					}
					return;
				}
				// 如果是403错误且用户已登录，可能是用户还未加入房间，先尝试加入房间
				if (res.status === 403 && currentUserId) {
					// 403错误在用户注册/登录后、加入房间前是预期的，使用debug级别
					log.debug('用户可能还未加入房间，尝试加入房间', { roomId, currentUserId });
					try {
						const joinRes = await fetch(`/api/chat/rooms/${roomId}/join`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' }
						});
					if (joinRes.ok) {
						const joinData = await joinRes.json();
						log.debug('成功加入房间，重新加载消息', { joined: joinData.joined, alreadyMember: joinData.alreadyMember });
						// 如果成功加入房间，设置权限状态
						if (joinData.joined || joinData.alreadyMember) {
							setHasRoomAccess(true); // 标记用户已有权限访问房间
						}
						// 等待一下确保加入完成，然后重新加载消息
						setTimeout(() => {
							loadMessages(skipLoadingState);
						}, 200);
						return;
					}
					} catch (joinErr) {
						log.error('加入房间时出错', joinErr as Error);
					}
				}
				// 其他错误，记录并抛出
				log.error('Failed to load messages', new Error(errorData.error || 'Load failed'), {
					status: res.status,
					statusText: res.statusText,
				});
				throw new Error(errorData.error || `加载消息失败: ${res.status} ${res.statusText}`);
			}

			const data = await res.json();
			let loadedMessages = data.messages || [];
			
			// 重要：如果参与者还没有同意宪章，过滤掉AI主持人消息
			// 因为AI主持人消息应该在参与者同意宪章后才显示
			// 直接从API获取宪章状态，不依赖React状态（因为状态可能还没加载）
			if (roomInfo && currentUserId === roomInfo.participantId) {
				try {
					const charterRes = await fetch(`/api/chat/rooms/${roomId}/charter`);
					if (charterRes.ok) {
						const charterData = await charterRes.json();
						const participantAccepted = charterData.participantAccepted;
						
						if (!participantAccepted) {
							// 参与者还没有同意宪章，过滤掉AI主持人消息
							const beforeFilter = loadedMessages.length;
							loadedMessages = loadedMessages.filter((msg: Message) => {
								const isAiHostMessage = msg.contentType === 'AI_SUGGESTION' && 
									msg.content && 
									msg.content.includes('AI主持人');
								return !isAiHostMessage;
							});
							log.debug('参与者未同意宪章，已过滤AI主持人消息', {
								originalCount: beforeFilter,
								filteredCount: loadedMessages.length,
								participantAccepted
							});
						}
					}
				} catch (charterError) {
					log.warn('获取宪章状态失败，不过滤AI主持人消息', charterError as Error);
					// 如果获取宪章状态失败，为了安全起见，不过滤消息
				}
			}
			
			setMessages(loadedMessages);
			messagesRef.current = loadedMessages; // 更新ref
			if (!skipLoadingState) {
				setLoading(false);
			}
		} catch (error: any) {
			log.error('Failed to load messages', error as Error);
			if (!skipLoadingState) {
				setLoading(false);
			}
			// 如果是未登录导致的错误，不显示错误提示（这是正常的）
			if (error.message?.includes('未登录') || error.message?.includes('401')) {
				log.debug('未登录用户尝试加载消息失败，这是正常的');
				return;
			}
			// 如果是无权访问的错误，且用户已登录，尝试加入房间（可能已经自动加入了，但需要重试）
			// 注意：403错误已经在上面处理过了，这里只处理其他情况下的"无权访问"错误
			if (error.message?.includes('无权访问') && currentUserId) {
				log.debug('无权访问房间，但用户已登录，尝试加入房间', { roomId, currentUserId });
				try {
					const joinRes = await fetch(`/api/chat/rooms/${roomId}/join`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' }
					});
					if (joinRes.ok) {
						const joinData = await joinRes.json();
						log.debug('成功加入房间，重新加载消息', { joined: joinData.joined, alreadyMember: joinData.alreadyMember });
						// 如果成功加入房间，设置权限状态
						if (joinData.joined || joinData.alreadyMember) {
							setHasRoomAccess(true); // 标记用户已有权限访问房间
						}
						// 等待一下确保加入完成，然后重新加载消息
						setTimeout(() => {
							loadMessages();
						}, 200);
						return;
					}
				} catch (err) {
					log.error('加入房间时出错', err as Error);
				}
			}
			// 显示错误信息给用户（只有在无法自动处理的情况下才显示）
			// 对于403错误，如果加入房间失败，也应该显示错误
			if (error.message?.includes('无权访问') && currentUserId) {
				alert(`无法加入房间: ${error.message || '未知错误'}`);
			} else if (!error.message?.includes('未登录') && !error.message?.includes('401')) {
				alert(`加载消息失败: ${error.message || '未知错误'}`);
			}
		}
	};

	// 加载话题信息
	const loadTopicInfo = async () => {
		if (!roomId) return;
		// 如果用户未登录，不加载话题信息
		if (!currentUserId) {
			log.debug('用户未登录，跳过加载话题信息');
			return;
		}
		try {
			const res = await fetch(`/api/chat/rooms/${roomId}/topic`);
			if (res.ok) {
				const data = await res.json();
				setTopic(data.topic);
				setTopicDescription(data.description);
				
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
			log.error('加载话题信息失败', error as Error);
		}
	};
	
	// 加载宪章同意状态（仅用于参与者）
	const loadCharterStatus = async () => {
		if (!roomId) return Promise.resolve();
		// 如果用户未登录，不加载宪章状态
		if (!currentUserId) {
			log.debug('用户未登录，跳过加载宪章状态');
			return Promise.resolve();
		}
		
		// 如果是创建者，直接返回，不加载宪章状态（创建者不需要在创建时同意宪章）
		if (roomInfo && currentUserId === roomInfo.creatorId) {
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
			log.error('加载宪章状态失败', error as Error);
		}
		return Promise.resolve();
	};

	// 检查未登录用户（通过邀请链接进入的）
	// 优先使用 props 传入的 inviteToken，否则从 URL 参数获取
	// 使用 useMemo 稳定 inviteToken 值，避免依赖数组大小变化
	// 注意：必须在 useEffect 之前定义，因为 useEffect 的依赖数组中使用了它
	const urlInviteToken = searchParams?.get('invite') || null;
	const inviteToken = useMemo(() => {
		return propInviteToken || urlInviteToken || null;
	}, [propInviteToken, urlInviteToken]);

	useEffect(() => {
		// 只有在用户已登录时才加载房间信息和消息
		if (currentUserId) {
			// 先检查用户是否有权限访问房间
			// 如果是创建者或参与者，直接加载；否则需要先加入房间
			const checkAndLoad = async () => {
				// 如果用户已经有房间访问权限，直接加载数据（避免重复检查）
				if (hasRoomAccess) {
					loadRoomInfo();
					loadMessages();
					return;
				}
				
				// 如果用户是通过邀请链接进入的，跳过检查（等待注册/登录流程中的加入房间完成）
				// 这样可以避免在注册流程完成前发送检查请求导致403错误
				// 注册流程会处理加入房间，并在成功后设置 hasRoomAccess = true
				if (inviteToken && !hasRoomAccess) {
					log.debug('用户通过邀请链接进入，跳过检查，等待注册流程中的加入房间完成', { roomId, currentUserId });
					return;
				}
				
				// 如果用户还没有房间访问权限，进行一次检查
				// 如果返回403，就不再发送请求，等待加入房间流程
				try {
					const res = await fetch(`/api/chat/rooms/${roomId}`);
					if (res.ok) {
						const data = await res.json();
						const room = data.room;
						// 如果用户是创建者或参与者，设置权限状态并加载数据
						if (room && (room.creatorId === currentUserId || room.participantId === currentUserId)) {
							setHasRoomAccess(true);
							loadRoomInfo();
							loadMessages();
						} else {
							// 用户不是成员，需要先加入房间
							// 不在这里加载，等待注册/登录流程中的加入房间逻辑
							log.debug('用户不是房间成员，等待加入房间', { roomId, currentUserId });
						}
					} else if (res.status === 403) {
						// 403错误是预期的（用户还没有加入房间），不显示为错误
						// 不设置hasRoomAccess，等待加入房间流程
						log.debug('用户还没有加入房间，等待加入房间流程', { roomId, currentUserId });
					} else {
						// 其他错误，正常加载（可能会失败，但至少尝试）
						loadRoomInfo();
						loadMessages();
					}
				} catch (err) {
					log.error('检查房间访问权限时出错', err as Error);
					// 出错时也尝试加载（可能会失败，但至少尝试）
					loadRoomInfo();
					loadMessages();
				}
			};
			checkAndLoad();
		} else {
			// 未登录时，设置 loading 为 false，显示登录对话框
			setLoading(false);
			setHasRoomAccess(false);
		}
	}, [roomId, currentUserId, hasRoomAccess, inviteToken]);

	// 监听房间类型变化事件（当参与者加入时，后端会广播此事件）
	useEffect(() => {
		const handleRoomTypeChanged = (event: CustomEvent) => {
			const data = event.detail;
			log.debug('收到房间类型变化事件', {
				roomType: data.roomType,
				participantId: data.participantId,
				isCreator: roomInfo?.creatorId === currentUserId
			});
			
			// 如果是创建者，且房间类型变为DUO，立即重新加载房间信息以建立SSE连接
			if (roomInfo?.creatorId === currentUserId && data.roomType === 'DUO') {
				log.debug('✅ 创建者收到参与者加入通知，立即重新加载房间信息以建立SSE连接');
				loadRoomInfo();
			}
		};

		window.addEventListener('room-type-changed', handleRoomTypeChanged as EventListener);

		return () => {
			window.removeEventListener('room-type-changed', handleRoomTypeChanged as EventListener);
		};
	}, [roomInfo?.creatorId, currentUserId]);

	// 定期刷新房间信息（用于检测房间类型变化，如SOLO变为DUO）
	// 重要：当参与者加入时，创建者需要尽快检测到房间类型变化，以便建立SSE连接
	useEffect(() => {
		if (!roomId || !currentUserId) return;

		// 如果房间类型还不是DUO，更频繁地检查（每2秒），确保能及时检测到参与者加入
		// 如果已经是DUO，可以降低检查频率（每30秒）
		const checkInterval = roomType === 'DUO' ? 30000 : 2000;
		
		// 立即执行一次检查（不等待第一个间隔）
		const checkRoomInfo = async () => {
			// 如果用户还没有房间访问权限，跳过检查（避免403错误）
			if (!hasRoomAccess) {
				return;
			}
			
			try {
				const res = await fetch(`/api/chat/rooms/${roomId}`);
				
				// 处理429错误：跳过本次检查，等待下次
				if (res.status === 429) {
					log.warn('定期检查房间信息时遇到429错误，跳过本次检查');
					return;
				}
				
				if (res.ok) {
					const data = await res.json();
					const newRoomType = data.room?.type || 'SOLO';
					const newParticipantId = data.room?.participantId || null;
					
					// 如果房间类型或参与者发生变化，重新加载房间信息
					if (newRoomType !== roomType || newParticipantId !== roomInfo?.participantId) {
						log.debug('检测到房间状态变化，重新加载房间信息', {
							oldType: roomType,
							newType: newRoomType,
							oldParticipant: roomInfo?.participantId,
							newParticipant: newParticipantId,
							isCreator: roomInfo?.creatorId === currentUserId
						});
						
						// 如果房间类型从SOLO变为DUO，立即重新加载房间信息
						// 这会触发roomType状态更新，从而自动建立SSE连接
						loadRoomInfo();
						
						// 如果是创建者，且房间类型刚变为DUO，记录日志
						if (roomInfo?.creatorId === currentUserId && newRoomType === 'DUO' && roomType !== 'DUO') {
							log.debug('✅ 创建者检测到参与者加入，房间类型变为DUO，SSE连接将自动建立');
						}
					}
				}
			} catch (error) {
				log.error('定期检查房间信息失败', error as Error);
			}
		};
		
		// 立即执行一次检查
		checkRoomInfo();
		
		// 然后定期检查
		const interval = setInterval(checkRoomInfo, checkInterval);

		return () => clearInterval(interval);
	}, [roomId, currentUserId, roomType, roomInfo?.participantId, roomInfo?.creatorId, hasRoomAccess]);

	// 同步messagesRef和messages状态
	useEffect(() => {
		messagesRef.current = messages;
	}, [messages]);

	// 检测用户是否在底部附近
	const isNearBottom = () => {
		if (!messagesContainerRef.current) return true;
		const container = messagesContainerRef.current;
		const threshold = 200; // 距离底部200px以内认为是在底部（增加阈值，确保更可靠）
		const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
		return distance < threshold;
	};

	// 滚动到底部的函数（使用更可靠的方法）
	const scrollToBottom = (force = false) => {
		if (!messagesContainerRef.current) return;
		
		const container = messagesContainerRef.current;
		
		// 如果强制滚动或用户在底部附近，则滚动
		if (force || isNearBottom()) {
			// 使用双重 requestAnimationFrame 确保 DOM 完全更新后再滚动
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					if (messagesContainerRef.current) {
						const container = messagesContainerRef.current;
						// 直接设置 scrollTop 到最大值，比 scrollIntoView 更可靠
						container.scrollTop = container.scrollHeight;
						
						// 再次确保滚动到底部（双重保险）
						setTimeout(() => {
							if (messagesContainerRef.current) {
								messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
							}
						}, 50);
					}
				});
			});
		}
	};

	// 定期检查消息的监管状态更新（用于实时显示监管警告）
	useEffect(() => {
		if (!roomId || !currentUserId) return;

		// 每5秒检查一次消息的监管状态更新（减少请求频率）
		let isChecking = false; // 防止并发请求
		const interval = setInterval(async () => {
			if (isChecking) return; // 如果正在检查，跳过本次
			
			try {
				isChecking = true;
				// 从ref获取最新的消息列表
				const currentMessages = messagesRef.current;
				
				// 获取所有待审核或可能有更新的消息ID
				const pendingMessageIds = currentMessages
					.filter((m: Message) => !m.moderationStatus || m.moderationStatus === 'PENDING')
					.map((m: Message) => m.id);

				if (pendingMessageIds.length === 0) {
					isChecking = false;
					return;
				}

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
									log.debug('检测到消息监管状态更新', {
										messageId: msg.id,
										oldStatus: msg.moderationStatus,
										newStatus: updatedMsg.moderationStatus
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
				log.error('定期检查监管状态失败', error as Error);
			} finally {
				isChecking = false; // 确保在错误时也重置标志
			}
		}, 5000); // 每5秒检查一次，减少请求频率

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
				loadTopicInfo().then(() => {
					// 数据加载完成后，设置 dataFullyLoaded
					setTimeout(() => {
						setDataFullyLoaded(true);
					}, 100);
				});
			} else {
				// 参与者需要加载宪章状态和话题信息
				charterDialogInitializedRef.current = false; // 重置标志，允许参与者显示宪章对话框
				loadCharterStatus().then(() => {
					// 延迟一下确保charterAccepted状态已更新
					setTimeout(() => {
						loadTopicInfo().then(() => {
							// 数据加载完成后，设置 dataFullyLoaded
							setTimeout(() => {
								setDataFullyLoaded(true);
								// 参与者数据加载完成后，标记第二个用户已准备好
								setSecondUserFullyReady(true);
							}, 100);
						});
					}, 100);
				});
			}
		}
	}, [roomInfo, currentUserId, roomId, messages.length, loading]);

	// 使用 useMemo 稳定 participantId 值，避免依赖数组大小变化
	const participantId = useMemo(() => roomInfo?.participantId || null, [roomInfo?.participantId]);
	
	useEffect(() => {
		// 如果用户信息加载完成且未登录，且有房间ID，立即显示认证对话框
		if (!userInfoLoading && !currentUserId && roomId) {
			log.debug('检查认证对话框显示条件', { 
				currentUserId, 
				inviteToken, 
				roomId, 
				loading,
				userInfoLoading,
				shouldShow: true
			});
			
			// 未登录用户访问聊天房间，显示认证对话框
			// 如果有邀请token，默认注册模式；否则默认登录模式
			log.debug('显示认证对话框', { hasInviteToken: !!inviteToken });
			setShowAuthDialog(true);
			setIsLoginMode(!inviteToken); // 有邀请token时默认注册模式，否则默认登录模式
		} else if (currentUserId) {
			// 用户已登录，关闭认证对话框
			log.debug('用户已登录，关闭认证对话框');
			setShowAuthDialog(false);
		}
	}, [currentUserId, inviteToken, roomId, userInfoLoading]);
	
	// 添加超时机制：如果用户信息加载超过3秒，且未登录，强制显示认证对话框
	useEffect(() => {
		if (!roomId) return;
		
		const timeout = setTimeout(() => {
			// 如果用户信息还在加载，且未登录，且有房间ID，强制显示认证对话框
			if (userInfoLoading && !currentUserId && roomId) {
				log.warn('用户信息加载超时，强制显示认证对话框', { 
					userInfoLoading, 
					currentUserId, 
					roomId 
				});
				setShowAuthDialog(true);
				setIsLoginMode(!inviteToken);
				// 强制设置 userInfoLoading 为 false，避免重复检查
				setUserInfoLoading(false);
			}
		}, 3000); // 3秒超时
		
		return () => clearTimeout(timeout);
	}, [roomId, userInfoLoading, currentUserId, inviteToken]);

	// 监听状态变化，确保AI主持人消息能正确显示
	useEffect(() => {
		// 调试：记录AI主持人消息显示条件（现在AI主持人消息由后端自动创建，前端只需从消息列表中显示）
		if (roomType === 'DUO') {
		const hasAiHostMessage = messages.some((m: Message) => 
			m.contentType === 'AI_SUGGESTION' && m.content.includes('AI主持人')
		);
			log.debug('AI主持人消息检查', {
				roomType,
				messagesLength: messages.length,
				hasAiHostMessage,
				hasParticipant: !!participantId
			});
		}
	}, [roomType, messages.length, participantId]);

	// 处理登录
	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setAuthError(null);
		setIsAuthing(true);

		try {
			const res = await fetch('/api/auth/signin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: authEmail, password: authPassword })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || '登录失败');
			}

			// 登录成功，立即刷新用户信息（关键路径，必须立即获取）
			const userRes = await fetch('/api/auth/me');
			const userData = await userRes.json();
			if (userData?.user) {
				setCurrentUserId(userData.user.id);
				setShowAuthDialog(false);
				setIsAuthing(false);
				setDataFullyLoaded(false); // 重置数据加载完成状态
				
				// 通知Context和Navigation刷新登录状态
				window.dispatchEvent(new Event('auth:changed'));
				// 同时刷新Context（延迟一点，避免冲突）
				setTimeout(() => {
					refreshAuth();
				}, 100);
				
				// 保持 loading 状态，直到所有数据加载完成
				setLoading(true);
				
				// 等待一下确保认证状态完全同步（避免401错误）
				await new Promise(resolve => setTimeout(resolve, 200));
				
				// 先尝试加入房间（无论是否有 inviteToken，因为用户可能是通过邀请链接进入的）
				try {
					const joinRes = await fetch(`/api/chat/rooms/${roomId}/join`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' }
					});
					if (joinRes.ok) {
						const joinData = await joinRes.json();
						log.debug('成功加入房间', { joined: joinData.joined, alreadyMember: joinData.alreadyMember });
						// 如果成功加入房间（无论是新加入还是已经是成员），设置权限状态
						if (joinData.joined || joinData.alreadyMember) {
							setHasRoomAccess(true); // 标记用户已有权限访问房间
						}
					} else {
						const joinData = await joinRes.json().catch(() => ({}));
						// 如果房间已满或用户已经是成员，这是正常的
						if (joinData.error?.includes('已满') || joinData.error?.includes('已经是')) {
							log.debug('房间状态正常', { error: joinData.error });
							// 即使返回错误，如果用户已经是成员，也设置权限状态
							if (joinData.error?.includes('已经是')) {
								setHasRoomAccess(true); // 标记用户已有权限访问房间
							}
						} else {
							log.warn('加入房间失败', { error: joinData.error });
						}
					}
				} catch (err) {
					log.error('加入房间时出错', err as Error);
				}
				
				// 等待一下确保加入房间完成
				await new Promise(resolve => setTimeout(resolve, 100));
				
				// 并行加载房间信息和消息，减少等待时间
				// 注意：在登录后的加载过程中，我们手动管理 loading 状态，所以传入 skipLoadingState=true
				const [roomInfoResult, messagesResult] = await Promise.allSettled([
					loadRoomInfo(),
					loadMessages(true) // 跳过内部的 loading 状态管理
				]);
				
				// 等待一下确保 React 状态已更新
				await new Promise(resolve => setTimeout(resolve, 150));
				
				// 检查用户角色并加载相关数据
				// 由于 React 状态更新是异步的，需要重新获取房间信息来确认用户角色
				const checkParticipantAndLoadCharter = async () => {
					// 重新获取房间信息以确保使用最新值
					const roomRes = await fetch(`/api/chat/rooms/${roomId}`);
					if (roomRes.ok) {
						const roomData = await roomRes.json();
						const isParticipant = roomData.room?.participantId === userData.user.id;
						
						// 更新 roomInfo 和 roomType 状态，确保后续逻辑能正确执行
						if (roomData.room) {
							setRoomType(roomData.room.type || 'SOLO');
							setRoomInfo({
								creatorId: roomData.room.creatorId || '',
								participantId: roomData.room.participantId || null,
								creator: roomData.room.creator,
								participant: roomData.room.participant || null
							});
						}
						
						if (isParticipant) {
							// 参与者需要加载话题信息和宪章状态（会自动显示宪章对话框）
							// 先加载宪章状态（这会显示宪章对话框），然后加载话题信息
							const charterRes = await fetch(`/api/chat/rooms/${roomId}/charter`);
							if (charterRes.ok) {
								const charterData = await charterRes.json();
								setCharterAccepted({
									creator: charterData.creatorAccepted,
									participant: charterData.participantAccepted,
									all: charterData.allAccepted
								});
								
								// 如果参与者还没有同意宪章，立即显示宪章对话框
								if (!charterData.participantAccepted && roomData.room?.type === 'DUO') {
									setShowCharterDialog(true);
								}
							}
							
							// 等待话题信息加载完成，确保 topic 已设置
							await loadTopicInfo();
							
							// 直接获取 topic 数据，确保已加载
							const topicRes = await fetch(`/api/chat/rooms/${roomId}/topic`);
							if (topicRes.ok) {
								const topicData = await topicRes.json();
								if (topicData.topic) {
									setTopic(topicData.topic);
									setTopicDescription(topicData.description);
								}
							}
							
							// 返回是否是参与者，用于后续判断
							return true;
						} else {
							// 创建者也需要加载话题信息
							await loadTopicInfo();
							return false;
						}
					}
					return false;
				};
				
				// 立即执行检查，不需要额外的延迟
				const isParticipantResult = await checkParticipantAndLoadCharter();
				
				// 等待一下确保所有状态更新完成（包括 topic 的加载）
				await new Promise(resolve => setTimeout(resolve, 150));
				
				// 所有数据加载完成后，才设置 loading 为 false 和 dataFullyLoaded 为 true
				setDataFullyLoaded(true);
				setLoading(false);
				
				// 如果是参与者，标记第二个用户已准备好（使用检查结果而不是依赖状态）
				// 但需要确保 topic 已加载（因为 AI 主持人需要 topic）
				if (isParticipantResult) {
					// 等待 topic 加载完成（最多等待 2 秒）
					let retries = 0;
					while (!topic && retries < 10) {
						await new Promise(resolve => setTimeout(resolve, 200));
						retries++;
					}
					
					// 再次检查宪章状态，确保双方都同意了
					const finalCharterRes = await fetch(`/api/chat/rooms/${roomId}/charter`);
					if (finalCharterRes.ok) {
						const finalCharterData = await finalCharterRes.json();
						setCharterAccepted({
							creator: finalCharterData.creatorAccepted,
							participant: finalCharterData.participantAccepted,
							all: finalCharterData.allAccepted
						});
						
						// 只有双方都同意宪章后，才标记第二个用户已准备好
						if (finalCharterData.allAccepted) {
							setSecondUserFullyReady(true);
							log.debug('登录后设置 secondUserFullyReady', {
								charterAccepted: finalCharterData.allAccepted,
								hasTopic: !!topic,
								participantId
							});
						}
					}
				}
			}
		} catch (err: any) {
			setAuthError(err.message || '登录失败');
			setIsAuthing(false);
		}
	};

	// 处理注册
	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		setAuthError(null);

		if (authPassword !== authConfirmPassword) {
			setAuthError('两次输入的密码不一致');
			return;
		}

		setIsAuthing(true);

		try {
			const res = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: authEmail, password: authPassword })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || '注册失败');
			}

			// 注册成功，立即刷新用户信息（关键路径，必须立即获取）
			const userRes = await fetch('/api/auth/me');
			const userData = await userRes.json();
			if (userData?.user) {
				setCurrentUserId(userData.user.id);
				setShowAuthDialog(false);
				setIsAuthing(false);
				setDataFullyLoaded(false); // 重置数据加载完成状态
				
				// 通知Context和Navigation刷新登录状态
				window.dispatchEvent(new Event('auth:changed'));
				// 同时刷新Context（延迟一点，避免冲突）
				setTimeout(() => {
					refreshAuth();
				}, 100);
				
				// 保持 loading 状态，直到所有数据加载完成
				setLoading(true);
				
				// 等待一下确保认证状态完全同步（避免401错误）
				await new Promise(resolve => setTimeout(resolve, 200));
				
				// 先尝试加入房间（无论是否有 inviteToken，因为用户可能是通过邀请链接进入的）
				try {
					const joinRes = await fetch(`/api/chat/rooms/${roomId}/join`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' }
					});
					if (joinRes.ok) {
						const joinData = await joinRes.json();
						log.debug('成功加入房间', { joined: joinData.joined, alreadyMember: joinData.alreadyMember });
						// 如果成功加入房间（无论是新加入还是已经是成员），设置权限状态并通知父组件刷新侧边栏
						if (joinData.joined || joinData.alreadyMember) {
							setHasRoomAccess(true); // 标记用户已有权限访问房间
							onRoomJoined?.();
						}
					} else {
						const joinData = await joinRes.json().catch(() => ({}));
						// 如果房间已满或用户已经是成员，这是正常的
						if (joinData.error?.includes('已满') || joinData.error?.includes('已经是')) {
							log.debug('房间状态正常', { error: joinData.error });
							// 即使返回错误，如果用户已经是成员，也设置权限状态并通知刷新侧边栏
							if (joinData.error?.includes('已经是')) {
								setHasRoomAccess(true); // 标记用户已有权限访问房间
								onRoomJoined?.();
							}
						} else {
							log.warn('加入房间失败', { error: joinData.error });
						}
					}
				} catch (err) {
					log.error('加入房间时出错', err as Error);
				}
				
				// 等待一下确保加入房间完成
				await new Promise(resolve => setTimeout(resolve, 100));
				
				// 并行加载房间信息和消息，减少等待时间
				// 注意：在注册后的加载过程中，我们手动管理 loading 状态，所以传入 skipLoadingState=true
				const [roomInfoResult, messagesResult] = await Promise.allSettled([
					loadRoomInfo(),
					loadMessages(true) // 跳过内部的 loading 状态管理
				]);
				
				// 等待一下确保 React 状态已更新
				await new Promise(resolve => setTimeout(resolve, 150));
				
				// 检查用户角色并加载相关数据
				// 由于 React 状态更新是异步的，需要重新获取房间信息来确认用户角色
				const checkParticipantAndLoadCharter = async () => {
					// 重新获取房间信息以确保使用最新值
					const roomRes = await fetch(`/api/chat/rooms/${roomId}`);
					if (roomRes.ok) {
						const roomData = await roomRes.json();
						const isParticipant = roomData.room?.participantId === userData.user.id;
						
						// 更新 roomInfo 和 roomType 状态，确保后续逻辑能正确执行
						if (roomData.room) {
							setRoomType(roomData.room.type || 'SOLO');
							setRoomInfo({
								creatorId: roomData.room.creatorId || '',
								participantId: roomData.room.participantId || null,
								creator: roomData.room.creator,
								participant: roomData.room.participant || null
							});
						}
						
						if (isParticipant) {
							// 参与者需要加载话题信息和宪章状态（会自动显示宪章对话框）
							// 先加载宪章状态（这会显示宪章对话框），然后加载话题信息
							const charterRes = await fetch(`/api/chat/rooms/${roomId}/charter`);
							if (charterRes.ok) {
								const charterData = await charterRes.json();
								setCharterAccepted({
									creator: charterData.creatorAccepted,
									participant: charterData.participantAccepted,
									all: charterData.allAccepted
								});
								
								// 如果参与者还没有同意宪章，立即显示宪章对话框
								if (!charterData.participantAccepted && roomData.room?.type === 'DUO') {
									setShowCharterDialog(true);
								}
							}
							
							// 等待话题信息加载完成，确保 topic 已设置
							await loadTopicInfo();
							
							// 直接获取 topic 数据，确保已加载
							const topicRes = await fetch(`/api/chat/rooms/${roomId}/topic`);
							if (topicRes.ok) {
								const topicData = await topicRes.json();
								if (topicData.topic) {
									setTopic(topicData.topic);
									setTopicDescription(topicData.description);
								}
							}
							
							// 返回是否是参与者，用于后续判断
							return true;
						} else {
							// 创建者也需要加载话题信息
							await loadTopicInfo();
							return false;
						}
					}
					return false;
				};
				
				// 立即执行检查，不需要额外的延迟
				const isParticipantResult = await checkParticipantAndLoadCharter();
				
				// 等待一下确保所有状态更新完成（包括 topic 的加载）
				await new Promise(resolve => setTimeout(resolve, 150));
				
				// 所有数据加载完成后，才设置 loading 为 false 和 dataFullyLoaded 为 true
				setDataFullyLoaded(true);
				setLoading(false);
				
				// 如果是参与者，标记第二个用户已准备好（使用检查结果而不是依赖状态）
				// 但需要确保 topic 已加载（因为 AI 主持人需要 topic）
				if (isParticipantResult) {
					// 等待 topic 加载完成（最多等待 2 秒）
					let retries = 0;
					while (!topic && retries < 10) {
						await new Promise(resolve => setTimeout(resolve, 200));
						retries++;
					}
					
					// 再次检查宪章状态，确保双方都同意了
					const finalCharterRes = await fetch(`/api/chat/rooms/${roomId}/charter`);
					if (finalCharterRes.ok) {
						const finalCharterData = await finalCharterRes.json();
						setCharterAccepted({
							creator: finalCharterData.creatorAccepted,
							participant: finalCharterData.participantAccepted,
							all: finalCharterData.allAccepted
						});
						
						// 只有双方都同意宪章后，才标记第二个用户已准备好
						if (finalCharterData.allAccepted) {
							setSecondUserFullyReady(true);
							log.debug('注册后设置 secondUserFullyReady', {
								charterAccepted: finalCharterData.allAccepted,
								hasTopic: !!topic,
								participantId
							});
						}
					}
				}
			}
		} catch (err: any) {
			setAuthError(err.message || '注册失败');
			setIsAuthing(false);
		}
	};

	// 监听流状态变化，当流完成时重新加载消息
	// 注意：这个useEffect作为备用检查，主要的清除逻辑在setInterval的checkState中
	useEffect(() => {
		if (streamState && !streamState.isStreaming && streamingMessageId) {
			// 流已完成，重新加载消息以获取最终状态
			log.debug('检测到流完成（useEffect备用检查）', { 
				messageId: streamingMessageId, 
				contentLength: streamState.content?.length || 0 
			});
			// 立即清除streamingMessageId，避免继续显示"生成中..."
			setStreamingMessageId(null);
			// 清除streamState，确保streaming状态立即变为false
			setStreamState(null);
			lastStateRef.current = null;
			// 延迟重新加载消息，确保数据库已更新
			setTimeout(() => {
				loadMessages();
			}, 500);
		} else if (!streamingMessageId && streamState) {
			// 如果streamingMessageId已被清除但streamState还存在，也清除streamState
			setStreamState(null);
			lastStateRef.current = null;
		}
		// 只依赖isStreaming状态和messageId，避免因content变化导致无限循环
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
			log.debug('SSE收到新消息', {
				messageId: newMessage.id,
				senderId: newMessage.senderId,
				contentPreview: newMessage.content?.substring(0, 50)
			});
			
			// 添加新消息到列表
			setMessages((prev) => {
				const existingIds = new Set(prev.map((m: Message) => m.id));
				const isNewMessage = !existingIds.has(newMessage.id);
				
				if (!isNewMessage) {
					// 消息已存在，更新它（可能是AI流式输出的更新或监管状态更新）
					log.debug('更新已存在的消息', { messageId: newMessage.id });
					// 更新后再次去重，确保没有重复
					const updated = prev.map((m: Message) => 
						m.id === newMessage.id ? { ...m, ...newMessage } : m
					);
					// 最终去重：使用Map确保唯一性
					return Array.from(new Map(updated.map((m: Message) => [m.id, m])).values());
				}
				
				// 新消息，添加到列表
				log.debug('添加新消息到列表', { currentCount: prev.length, newMessageId: newMessage.id });
				// 先检查是否真的不存在（防止竞态条件）
				const alreadyExists = prev.some((m: Message) => m.id === newMessage.id);
				if (alreadyExists) {
					log.warn('消息已存在，跳过添加', { messageId: newMessage.id });
					// 更新已存在的消息
					return prev.map((m: Message) => 
						m.id === newMessage.id ? { ...m, ...newMessage } : m
					);
				}
				const merged = [...prev, newMessage].sort((a, b) => {
					const timeA = new Date(a.createdAt).getTime();
					const timeB = new Date(b.createdAt).getTime();
					// 如果时间相同，使用id作为次要排序键，确保排序稳定
					if (timeA === timeB) {
						return a.id.localeCompare(b.id);
					}
					return timeA - timeB;
				});
				
				// 最终去重：确保没有重复的消息ID（防止竞态条件）
				const uniqueMessages = merged.reduce((acc, msg) => {
					if (!acc.find((m: Message) => m.id === msg.id)) {
						acc.push(msg);
					}
					return acc;
				}, [] as Message[]);
				
				// 更新ref
				if (uniqueMessages.length > 0) {
					lastMessageIdRef.current = uniqueMessages[uniqueMessages.length - 1].id;
				}
				
				// 如果是新消息，自动滚动到底部
				setTimeout(() => {
					scrollToBottom(true); // 强制滚动，确保新消息可见
				}, 100);
				
				return uniqueMessages;
			});
		};

		onErrorRef.current = (error: Error) => {
			log.error('SSE错误', error);
		};
	}, []);

	// 使用SSE实时接收新消息（DUO房间）
	// 重要：只有在用户有权限访问房间（已加入房间）时才建立SSE连接
	// 这样可以避免在用户注册后、加入房间前尝试建立连接导致的403错误
	// 使用useMemo稳定值，避免频繁变化导致连接重建
	const sseEnabled = useMemo(() => {
		// 只有在用户有权限访问房间时才建立SSE连接
		// 这样可以避免在用户注册后、加入房间前尝试建立连接导致的403错误
		return !!roomId && !!currentUserId && hasRoomAccess;
	}, [roomId, currentUserId, hasRoomAccess]);
	
	const sseRoomId = useMemo(() => {
		// 如果有roomId，就使用它（即使房间类型还是SOLO）
		// 这样创建者可以建立SSE连接，接收房间状态变化事件
		return roomId || '';
	}, [roomId]);
	
	// 调试：输出SSE连接条件变化
	const prevSseEnabledRef = useRef<boolean | null>(null);
	const prevSseRoomIdRef = useRef<string>('');
	
	useEffect(() => {
		const sseEnabledChanged = prevSseEnabledRef.current !== sseEnabled;
		const sseRoomIdChanged = prevSseRoomIdRef.current !== sseRoomId;
		
		if (sseEnabledChanged || sseRoomIdChanged) {
			log.debug('🔍 SSE连接条件变化', {
				roomType: String(roomType || 'null'),
				roomId: String(roomId || ''),
				currentUserId: String(currentUserId || ''),
				sseEnabled: {
					previous: prevSseEnabledRef.current,
					current: sseEnabled,
					changed: sseEnabledChanged
				},
				sseRoomId: {
					previous: prevSseRoomIdRef.current || '(empty)',
					current: sseRoomId || '(empty)',
					changed: sseRoomIdChanged
				},
				reason: !sseEnabled ? 
					(roomType !== 'DUO' ? 'roomType不是DUO' : 
					 !roomId ? 'roomId为空' : 
					 !currentUserId ? 'currentUserId为空' : '未知原因') :
					'SSE已启用'
			});
			
			prevSseEnabledRef.current = sseEnabled;
			prevSseRoomIdRef.current = sseRoomId;
		}
	}, [roomType, roomId, currentUserId, sseEnabled, sseRoomId]);
	
	const { connected: sseConnected } = useChatEvents({
		roomId: sseRoomId,
		enabled: sseEnabled,
		afterMessageId: lastMessageIdRef.current,
		onNewMessage: (message: any) => {
			log.debug('onNewMessage回调被调用', { messageId: message.id, senderId: message.senderId });
			onNewMessageRef.current?.(message);
		},
		onAiStart: (data: { messageId: string; roomId: string }) => {
			log.debug('收到AI流式输出开始（其他用户）', { messageId: data.messageId });
			// 初始化流式状态
			setOtherUserStreams((prev) => {
				const newMap = new Map(prev);
				newMap.set(data.messageId, '');
				return newMap;
			});
			// 设置为流式状态（用于显示流式效果）
			setStreamingMessageId((prev) => {
				// 如果当前没有流式消息，或者这是新的流式消息，设置为流式状态
				if (!prev || prev === data.messageId) {
					return data.messageId;
				}
				return prev;
			});
			// 如果消息不存在于消息列表中，需要等待SSE推送新消息事件
			// 这里不主动添加，因为SSE会推送新消息事件
		},
		onAiChunk: (data: { messageId: string; text: string; chunkNumber: number; totalLength: number }) => {
			log.debug('收到AI流式输出chunk（其他用户）', {
				messageId: data.messageId,
				chunkLength: data.text.length,
				totalLength: data.totalLength
			});
			// 更新流式内容
			setOtherUserStreams((prev) => {
				const newMap = new Map(prev);
				const currentContent = newMap.get(data.messageId) || '';
				newMap.set(data.messageId, currentContent + data.text);
				return newMap;
			});
		},
		onAiDone: (data: { messageId: string; fullText: string; usage?: any }) => {
			log.debug('收到AI流式输出完成（其他用户）', {
				messageId: data.messageId,
				fullTextLength: data.fullText.length
			});
			// 清除流式状态，更新消息内容
			setOtherUserStreams((prev) => {
				const newMap = new Map(prev);
				newMap.delete(data.messageId);
				return newMap;
			});
			// 更新消息列表中的内容
			setMessages((prev) => {
				return prev.map((msg) => {
					if (msg.id === data.messageId) {
						return { ...msg, content: data.fullText };
					}
					return msg;
				});
			});
			// 如果这是当前流式消息，清除流式状态
			setStreamingMessageId((prev) => {
				if (prev === data.messageId) {
					return null;
				}
				return prev;
			});
		},
		onError: (error: Error) => onErrorRef.current?.(error)
	});

	// 显示SSE连接状态（调试用）
	useEffect(() => {
		if (roomType === 'DUO') {
			log.debug('SSE连接状态', {
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
		
		// 如果消息数量增加（新消息），自动滚动到底部
		if (isNewMessage) {
			setTimeout(() => {
				scrollToBottom(true); // 强制滚动，确保新消息可见
			}, 50);
		}
	}, [messages.length]); // 只依赖消息数量

	// 流式文本更新时的滚动（只在用户接近底部时）
	useEffect(() => {
		if (currentText && streamingMessageId) {
			// 流式更新时，如果用户在底部附近，自动滚动
			if (isNearBottom()) {
				scrollToBottom(true); // 强制滚动，确保流式内容可见
			}
		}
	}, [currentText, streamingMessageId]); // 依赖流式文本和消息ID

	// 初始加载完成后，滚动到底部
	useEffect(() => {
		if (!loading && messages.length > 0) {
			setTimeout(() => {
				scrollToBottom(true); // 初始加载后强制滚动到底部
			}, 100);
		}
	}, [loading]); // 依赖 loading 状态

	// 确保输入框在页面加载时完全可见（即使没有消息）
	useEffect(() => {
		// 在组件挂载后，立即确保输入框区域可见
		const ensureInputVisible = () => {
			if (messagesContainerRef.current) {
				// 如果消息列表容器存在，滚动到底部
				const container = messagesContainerRef.current;
				requestAnimationFrame(() => {
					container.scrollTop = container.scrollHeight;
				});
			}
		};
		
		// 立即执行一次
		ensureInputVisible();
		
		// 延迟执行，确保布局已完成
		setTimeout(ensureInputVisible, 50);
		setTimeout(ensureInputVisible, 200);
	}, []); // 只在组件挂载时执行一次

	// 发送消息
	// 处理@提及选择（特殊操作）
	const handleMentionSelect = async (mention: string) => {
		log.debug('@提及选择', { mention });

		// 处理@AI助手（不需要特殊处理，发送消息时会自动检测并触发AI回复）
		if (mention === 'ai') {
			// @AI助手只是插入到输入框中，发送消息时会自动检测并触发AI回复
			// 所以这里不需要做任何处理，直接返回即可
			return;
		}

		// 处理@资料命令（打开图书搜索对话框）
		if (mention === 'library') {
			setShowBookSearchDialog(true);
			return;
		}

		// 其他未知命令
		log.warn('未处理的@命令', { mention });
	};

	// 处理图书选择（从 BookSearchDialog 返回）
	const handleBookSelect = (book: { title: string; author: string | null; id?: string }) => {
		// 将图书信息插入到输入框
		// 格式：@资料 《书名》作者：xxx [bookId]
		const bookText = book.id 
			? `@资料 《${book.title}》${book.author ? ` 作者：${book.author}` : ''} [${book.id}]`
			: `@资料 《${book.title}》${book.author ? ` 作者：${book.author}` : ''}`;
		
		// 通过自定义事件将文本插入到输入框
		if (typeof window !== 'undefined') {
			const event = new CustomEvent('insert-text', {
				detail: { text: bookText }
			});
			window.dispatchEvent(event);
		}
		
		setShowBookSearchDialog(false);
	};

	const handleSend = async (content: string) => {
		if (!content.trim() || sending) return;

		setSending(true);

		try {
			log.debug('准备发送消息', {
				roomId,
				currentUserId,
				contentPreview: content.substring(0, 50),
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
				log.error('发送消息失败', new Error(error.error || 'Send failed'), { error });
				throw new Error(error.error || '发送消息失败');
			}

			const data = await res.json();
			log.debug('消息发送成功，收到响应', {
				messageId: data.message?.id,
				senderId: data.message?.senderId,
				senderEmail: data.message?.sender?.email,
				sequence: data.message?.sequence,
			});

			const newMessages = [...messages, data.message];
			setMessages(newMessages);
			messagesRef.current = newMessages; // 同步更新ref
			
			// 更新最后一条消息ID的引用
			if (data.message?.id) {
				lastMessageIdRef.current = data.message.id;
				log.debug('更新lastMessageIdRef', { messageId: data.message.id });
			}

			// 异步触发监督分析（不阻塞消息发送，DUO房间和SOLO房间都需要监督）
			if (data.message?.id) {
				fetch(`/api/chat/messages/${data.message.id}/moderate`, {
					method: 'POST'
				}).catch((err) => {
					log.error('触发监督分析失败', err as Error);
				});
			}

			// 检查消息中是否包含@AI昵称，只有包含时才触发AI回复
			// aiNickname 现在总是有值（如果没有设置，会返回默认昵称）
			const aiName = aiNickname || 'AI助手';
			const mentionPattern = new RegExp(`@${aiName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
			const hasMention = mentionPattern.test(content);
			
			if (!hasMention) {
				// 没有@AI，只是普通聊天，不触发AI回复
				log.debug('消息中未包含@AI昵称，不触发AI回复');
				return;
			}

			// 创建 AI 建议消息并启动流式输出
			try {
				log.debug('检测到@AI提及，开始创建AI消息', { contentPreview: content.substring(0, 100) });
				
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
					log.error('创建AI消息失败', new Error(errorData.error || 'Create failed'), { errorData });
					throw new Error(errorData.error || 'Failed to create AI message');
				}

				const aiData = await createAiRes.json();
				const aiMessage = aiData.message;
				log.debug('AI消息已创建', { messageId: aiMessage.id });

				// 设置正在流式输出的消息ID
				setStreamingMessageId(aiMessage.id);
				log.debug('设置streamingMessageId', { messageId: aiMessage.id });

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
					log.debug('消息列表已更新', { totalCount: updated.length });
					
					// 更新最后一条消息ID的引用
					if (aiMessage?.id) {
						lastMessageIdRef.current = aiMessage.id;
					}
					
					return updated;
				});

				// 构建上下文 - 包含房间内所有讨论消息
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
				
				log.debug('AI上下文（包含所有讨论消息）', {
					totalMessages: newMessages.length,
					discussionMessages: discussionMessages.length,
					contextLength: context.length,
					roomType,
					currentUserId
				});
				
				log.debug('启动流式输出', { contextLength: context.length });
				log.debug('调用startStream', {
					messageId: aiMessage.id,
					roomId,
					contextLength: context.length,
					roomType
				});

				// 启动流式输出（使用全局Context，即使组件卸载也会继续）
				// @AI 调用时传入 aiRole: 'assistant'，使用助手 Prompt
				try {
					startStream(
						aiMessage.id,
						roomId,
						content,
						context,
						undefined, // taskType
						undefined, // pluginType
						undefined, // facilitatorMode
						'assistant' // aiRole: 使用助手模式
					);
					log.debug('startStream调用完成', { messageId: aiMessage.id, aiRole: 'assistant' });
					setStreamingMessageId(aiMessage.id); // 设置流式消息ID
				} catch (streamError: any) {
					log.error('startStream调用失败', streamError as Error, {
						messageId: aiMessage.id
					});
					throw streamError;
				}
			} catch (error: any) {
				log.error('创建AI消息或启动流式输出失败', error as Error);
				alert(`AI回复失败: ${error.message || '未知错误'}`);
			}
		} catch (error: any) {
			log.error('Failed to send message', error as Error);
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
			log.error('设置话题失败', error as Error);
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
			
			// 同意宪章后，重新加载话题信息和宪章状态，确保所有状态都正确
			// 这对于参与者特别重要，因为需要确保 topic 和 charterAccepted.all 都正确
			// 先立即更新状态，然后异步加载最新状态
			setTimeout(async () => {
				// 并行加载话题信息和宪章状态，减少等待时间
				await Promise.all([
					loadTopicInfo(),
					(async () => {
						const charterRes = await fetch(`/api/chat/rooms/${roomId}/charter`);
						if (charterRes.ok) {
							const charterData = await charterRes.json();
							const latestCharterAccepted = {
								creator: charterData.creatorAccepted,
								participant: charterData.participantAccepted,
								all: charterData.allAccepted
							};
							setCharterAccepted(latestCharterAccepted);
							return latestCharterAccepted;
						}
						return null;
					})()
				]);
				
				// 等待一下确保状态已更新（React状态更新是异步的）
				await new Promise(resolve => setTimeout(resolve, 150));
				
				// 确保数据完全加载完成
				setDataFullyLoaded(true);
				
				// 如果是参与者，且双方都同意宪章，标记第二个用户已准备好
				if (roomInfo && currentUserId === roomInfo.participantId) {
					// 再次检查宪章状态，确保双方都同意了
					const finalCharterRes = await fetch(`/api/chat/rooms/${roomId}/charter`);
					if (finalCharterRes.ok) {
						const finalCharterData = await finalCharterRes.json();
						setCharterAccepted({
							creator: finalCharterData.creatorAccepted,
							participant: finalCharterData.participantAccepted,
							all: finalCharterData.allAccepted
						});
						
						// 只有双方都同意宪章后，才标记第二个用户已准备好
						if (finalCharterData.allAccepted) {
							setSecondUserFullyReady(true);
							log.debug('同意宪章后设置 secondUserFullyReady', {
								charterAccepted: finalCharterData.allAccepted,
								hasTopic: !!topic,
								participantId: roomInfo.participantId
							});
						}
					}
				}
				
				// 重新获取最新状态，确保使用最新值（因为React状态更新是异步的）
				const [topicRes, roomRes] = await Promise.all([
					fetch(`/api/chat/rooms/${roomId}/topic`).then(res => res.ok ? res.json() : null).catch(() => null),
					fetch(`/api/chat/rooms/${roomId}`).then(res => res.ok ? res.json() : null).catch(() => null)
				]);
				
				// 如果获取到最新数据，更新状态
				if (topicRes?.topic && !topic) {
					setTopic(topicRes.topic);
					setTopicDescription(topicRes.description);
				}
				
				if (roomRes?.room?.participantId && !roomInfo?.participantId) {
					setRoomInfo(prev => prev ? {
						...prev,
						participantId: roomRes.room.participantId
					} : null);
				}
				
				// 使用最新获取的值进行调试
				const currentTopic = topicRes?.topic || topic;
				const currentParticipantId = roomRes?.room?.participantId || roomInfo?.participantId;
				
				log.debug('同意宪章后重新加载状态完成', {
					roomType,
					topic: currentTopic,
					charterAccepted,
					messagesLength: messages.length,
					loading,
					participantId: currentParticipantId,
					shouldShowAIHost: roomType === 'DUO' && messages.length === 0 && currentTopic && !loading && charterAccepted.all && currentParticipantId
				});
				
				// 刷新左侧栏，确保聊天标题更新
				onRoomJoined?.();
			}, 100);
			
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
			log.error('同意宪章失败', error as Error);
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


	// 引用消息
	const handleQuote = (messageId: string) => {
		const message = messages.find((m: Message) => m.id === messageId);
		if (!message) {
			log.warn('未找到要引用的消息', { messageId });
			return;
		}

		log.debug('准备引用消息', {
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
			log.debug('发送引用事件', { quoteTextPreview: quoteText.substring(0, 50), messageId });
			window.dispatchEvent(event);
		} else {
			log.error('window未定义，无法发送引用事件', new Error('Window undefined'));
		}
	};

	// 重新生成AI回答
	const handleRegenerate = async (messageId: string) => {
		try {
			log.debug('开始重新生成AI回答', { originalMessageId: messageId });
			
			const res = await fetch(`/api/chat/messages/${messageId}/regenerate`, {
				method: 'POST'
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.error || '重新生成失败');
			}

			const data = await res.json();
			log.debug('重新生成API返回', {
				messageId: data.message?.id,
				promptPreview: data.prompt?.substring(0, 50),
				contextLength: data.context?.length
			});

			// 重新生成API已经创建了新消息并返回完整信息
			const aiMessage = data.message;

			if (!aiMessage) {
				throw new Error('未找到新创建的消息');
			}

			log.debug('获取到新AI消息', { messageId: aiMessage.id });

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
			log.debug('启动流式输出', { messageId: aiMessage.id });
			startStream(
				aiMessage.id,
				roomId,
				data.prompt,
				data.context
			);
		} catch (error: any) {
			log.error('重新生成失败', error as Error);
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
			log.error('Failed to adopt message', error as Error);
			alert(error.message || '采纳失败');
		}
	};

	// 如果正在加载且没有认证对话框，显示加载状态
	if (loading && !showAuthDialog) {
		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '100vh',
					background: 'var(--color-background)',
					position: 'relative'
				}}
			>
				<div style={{ textAlign: 'center' }}>
					{/* 主加载动画 - 更大的旋转圆圈 */}
					<div
						style={{
							width: 48,
							height: 48,
							border: '4px solid var(--color-border-light)',
							borderTopColor: 'var(--color-primary)',
							borderRightColor: 'var(--color-primary-light)',
							borderRadius: '50%',
							animation: 'spin 0.8s linear infinite',
							margin: '0 auto 20px',
							position: 'relative',
							boxShadow: '0 2px 8px rgba(26, 68, 128, 0.1)'
						}}
					/>
					{/* 加载文本 - 带脉冲动画 */}
					<p style={{ 
						color: 'var(--color-text-secondary)',
						fontSize: '14px',
						margin: 0,
						fontWeight: 500,
						animation: 'pulse 2s ease-in-out infinite'
					}}>加载中...</p>
					{/* 加载提示 */}
					<p style={{ 
						color: 'var(--color-text-tertiary)',
						fontSize: '12px',
						margin: '8px 0 0 0'
					}}>正在准备聊天室</p>
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				height: '100vh',
				maxHeight: '100vh', // 确保不超过视口高度
				background: 'var(--color-background)',
				width: '100%',
				overflow: 'hidden',
				position: 'relative', // 为子元素定位提供上下文
				boxSizing: 'border-box' // 确保 padding 包含在高度内
			}}
		>
			{/* 主内容区域 */}
			<div
				style={{
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					height: '100vh',
					maxHeight: '100vh', // 确保不超过视口高度
					background: 'var(--color-background)',
					overflow: 'hidden',
					minHeight: 0, // 确保 flex 子元素可以正确收缩
					position: 'relative', // 为 z-index 定位提供上下文
					boxSizing: 'border-box', // 确保 padding 包含在高度内
					width: '100%' // 确保占满宽度
				}}
			>
			{/* 房间标题（DUO房间显示创建者和参与者）- 固定在顶部 */}
			{roomType === 'DUO' && roomInfo && (
				<div
					style={{
						position: 'fixed', // 固定定位，不随页面滚动
						top: '64px', // 固定在导航栏下方，与导航栏贴合（导航栏高度约64px）
						left: '260px', // 从左侧栏右侧开始（左侧栏宽度260px）
						right: 0,
						height: '56px', // 固定高度
						borderBottom: '1px solid var(--color-border)',
						paddingTop: 0, // 移除顶部 padding，使用 flex 居中
						paddingBottom: 0, // 移除底部 padding，使用 flex 居中
						paddingLeft: '20px',
						paddingRight: '20px',
						background: '#ffffff', // 使用纯白色背景，确保完全不透明
						backdropFilter: 'none', // 禁用背景模糊，确保不透明
						opacity: 1, // 确保完全不透明
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center', // 使用 flex 的 alignItems: center 确保内容上下居中
						zIndex: 50, // 在消息列表之上，但在输入框之下
						boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' // 添加阴影，增强视觉分离
					}}
				>
					<div style={{ 
						display: 'flex', 
						alignItems: 'center', // 确保头像和文字垂直居中
						gap: '8px',
						height: '100%' // 占满容器高度
					}}>
						{roomInfo.creator?.avatarUrl ? (
							<img
								src={roomInfo.creator.avatarUrl}
								alt={roomInfo.creator.name || roomInfo.creator.email}
								style={{
									width: 24,
									height: 24,
									borderRadius: '50%',
									objectFit: 'cover',
									flexShrink: 0, // 防止头像被压缩
									transform: 'translateY(1px)' // 轻微下移，使其与文字视觉对齐
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
									fontWeight: 600,
									flexShrink: 0, // 防止头像被压缩
									transform: 'translateY(1px)' // 轻微下移，使其与文字视觉对齐
								}}
							>
								{(roomInfo.creator?.name || roomInfo.creator?.email || 'C').charAt(0).toUpperCase()}
							</div>
						)}
						<span style={{ 
							fontSize: '14px', 
							fontWeight: 500,
							lineHeight: '1.5', // 确保文字行高合适
							display: 'flex',
							alignItems: 'center' // 确保文字垂直居中
						}}>
							{roomInfo.creator?.name || roomInfo.creator?.email || '创建者'}
						</span>
					</div>
					{/* 只在有 participantId 时显示参与者信息 */}
					{roomInfo.participantId && (
						<div style={{ 
							display: 'flex', 
							alignItems: 'center', // 确保头像和文字垂直居中
							gap: '8px'
						}}>
							{roomInfo.participant?.avatarUrl ? (
								<img
									src={roomInfo.participant.avatarUrl}
									alt={roomInfo.participant.name || roomInfo.participant.email}
									style={{
										width: 24,
										height: 24,
										borderRadius: '50%',
										objectFit: 'cover',
										flexShrink: 0, // 防止头像被压缩
										transform: 'translateY(1px)' // 轻微下移，使其与文字视觉对齐
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
										fontWeight: 600,
										flexShrink: 0, // 防止头像被压缩
										transform: 'translateY(1px)' // 轻微下移，使其与文字视觉对齐
									}}
								>
									{(roomInfo.participant?.name || roomInfo.participant?.email || 'P').charAt(0).toUpperCase()}
								</div>
							)}
							<span style={{ 
								fontSize: '14px', 
								fontWeight: 500,
								lineHeight: '1.5', // 确保文字行高合适
								display: 'flex',
								alignItems: 'center' // 确保文字垂直居中
							}}>
								{roomInfo.participant?.name || roomInfo.participant?.email || `参与者 (${roomInfo.participantId.substring(0, 8)}...)`}
							</span>
						</div>
					)}
				</div>
			)}
			
			{/* 消息列表容器 */}
			<div
				ref={messagesContainerRef}
				style={{
					flex: '1 1 auto', // 使用 flex-basis: auto 确保可以收缩
					overflowY: 'auto',
					overflowX: 'hidden',
					paddingTop: roomType === 'DUO' && roomInfo ? '76px' : '20px', // 如果DUO房间有头部，减少顶部 padding，使讨论分析更紧凑（导航栏64px + 头部56px - 减少间距）
					paddingBottom: '250px', // 增加底部 padding，为固定输入框预留足够空间（输入框高度约180px + 安全边距250px）
					paddingLeft: 0,
					paddingRight: 0,
					background: 'var(--color-background)',
					scrollBehavior: 'smooth',
					minHeight: 0, // 确保 flex 子元素可以正确收缩
					display: 'flex',
					flexDirection: 'column',
					position: 'relative',
					zIndex: 1, // 确保在输入框之下
					width: '100%', // 确保占满宽度
					boxSizing: 'border-box' // 确保 padding 包含在高度内
				}}
			>
				<div
					style={{
						maxWidth: '100%',
						margin: 0, // 移除 auto，避免内容居中
						paddingTop: 0,
						paddingBottom: '10px', // 减少底部 padding，为输入框留出空间
						paddingLeft: '40px',
						paddingRight: '40px',
						display: 'flex',
						flexDirection: 'column',
						flex: 1, // 使用 flex 确保正确布局
						width: '100%' // 确保占满宽度
					}}
				>
					{/* 分析面板（仅DUO房间显示） */}
					{roomType === 'DUO' && (
						<AnalysisPanel roomId={roomId} />
					)}
					{messages.length === 0 && !(roomType === 'DUO' && topic) ? (
						<div
							style={{
								textAlign: 'center',
								paddingTop: '60px',
								paddingBottom: '60px',
								paddingLeft: '20px',
								paddingRight: '20px',
								color: 'var(--color-text-secondary)'
							}}
						>
							<div
								style={{
									marginBottom: '16px',
									opacity: 0.5,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center'
								}}
							>
								<MessageIcon size={32} color="var(--color-text-secondary)" />
							</div>
							<p style={{ fontSize: '18px', marginBottom: '8px' }}>开始对话吧！</p>
							<p style={{ fontSize: '14px', opacity: 0.7 }}>
								输入消息，AI 将为您提供建议
							</p>
						</div>
					) : (
						<>
							{/* 最终去重：确保渲染时没有重复的消息ID */}
							{Array.from(new Map(messages.map((m: Message) => [m.id, m])).values()).map((message, index) => {
								// 检查是否是正在流式输出的消息
								const isStreamingMessage = message.id === streamingMessageId;
								// 获取流式文本：优先使用当前用户的流式输出，否则使用其他用户的流式输出
								const otherUserStreamText = otherUserStreams.get(message.id);
								const streamingText = isStreamingMessage && currentText
									? currentText
									: otherUserStreamText !== undefined
									? otherUserStreamText
									: undefined;
								const isActuallyStreaming = isStreamingMessage && streaming || (otherUserStreamText !== undefined);

								// 判断消息是否属于当前用户
								// 无论是用户消息还是AI消息，只要senderId是当前用户，就是"我的消息"
								// AI主持人消息不属于任何用户，始终左对齐
							const isAiHostMessage = message.contentType === 'AI_SUGGESTION' && message.content.includes('AI主持人');
							const isMyMessage = !!(currentUserId && message.senderId === currentUserId);
							
							// AI消息（AI_SUGGESTION）始终左对齐，因为这是AI的回答，面向整个房间
							// 无论是SOLO还是DUO，当前用户的消息（非AI）在左边，对方的消息在右边
							// AI主持人消息始终左对齐
							const isAiMessage = message.contentType === 'AI_SUGGESTION' || message.contentType === 'AI_ADOPTED';
							const isLeftAligned = !!(isAiHostMessage || isAiMessage || isMyMessage);
								
								// 调试日志（仅在开发环境）
								if (process.env.NODE_ENV === 'development' && messages.length <= 2) {
									log.debug('消息对齐检查', {
										消息ID: message.id,
										发送者ID: message.senderId,
										当前用户ID: currentUserId,
										是我的消息: isMyMessage,
										左对齐: isLeftAligned,
										消息类型: message.contentType
									});
								}

								// 获取发送者的AI昵称（如果是AI消息）
								// isAiMessage已在上面定义，这里直接使用
								const messageAiNickname = isAiHostMessage 
									? 'AI主持人'
									: (isAiMessage && message.senderId === currentUserId 
										? aiNickname 
										: null);
								const messageIsSystemAi = isAiHostMessage 
									? true 
									: (isAiMessage && message.senderId === currentUserId 
										? isSystemAi 
										: false);

								// 调试：检查AI消息和重新生成按钮条件
								if (isAiMessage) {
									const canRegenerate = message.contentType === 'AI_SUGGESTION' && !message.isAdopted && message.senderId === currentUserId;
									log.debug('AI消息检查', {
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

								// 转换为分享消息格式
								const shareMessage: ShareCardMessage = {
									id: message.id,
									content: message.content,
									senderName: message.sender.name || message.sender.email,
									senderAvatar: message.sender.avatarUrl || undefined,
									isCurrentUser: message.senderId === currentUserId,
									createdAt: message.createdAt,
									type: message.contentType
								};

								return (
									<ChatMessage
										key={message.id}
										id={message.id}
										content={message.content}
										senderId={message.senderId}
										senderName={
											isAiHostMessage 
												? 'AI主持人'
												: (message.sender.name || message.sender.email)
										}
										senderAvatar={message.sender.avatarUrl || undefined}
										type={message.contentType}
										isStreaming={isActuallyStreaming}
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
										shareMode={shareMode}
										isSelected={selectedMessageIds.has(message.id)}
										onToggleSelect={() => toggleMessage(message.id, shareMessage)}
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
										shareMode={shareMode}
										isSelected={selectedMessageIds.has(message.id)}
										onToggleSelect={() => {
											const shareMessage: ShareCardMessage = {
												id: message.id,
												content: message.content,
												senderName: message.sender.name || message.sender.email,
												senderAvatar: message.sender.avatarUrl || undefined,
												isCurrentUser: message.senderId === currentUserId,
												createdAt: message.createdAt,
												type: message.contentType
											};
											toggleMessage(message.id, shareMessage);
										}}
									/>
								);
							})}
							{/* 滚动锚点，确保最新消息可见 */}
							<div 
								ref={messagesEndRef}
								style={{
									height: '1px',
									width: '100%',
									flexShrink: 0,
									minHeight: '1px' // 确保最小高度
								}}
							/>
						</>
					)}
				</div>
			</div>

			{/* 输入框 - 固定在底部 */}
			<div
				style={{
					position: 'fixed', // 固定定位，不随页面滚动
					bottom: 0, // 固定在视口底部
					left: '260px', // 从左侧栏右侧开始（左侧栏宽度260px）
					right: 0, // 覆盖到最右边
					borderTop: '1px solid var(--color-border)',
					background: 'var(--color-background)',
					paddingTop: '20px',
					paddingBottom: '24px', // 增加底部 padding，确保完整显示
					paddingLeft: 0,
					paddingRight: '120px', // 为右侧按钮留出空间（按钮宽度约80px + 边距40px）
					zIndex: 100, // 提高 z-index，确保输入框在消息列表之上
					boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)', // 添加阴影，增强视觉分离
					minHeight: 'fit-content', // 确保容器高度适应内容
					overflow: 'visible', // 确保内容不被裁剪
					boxSizing: 'border-box' // 确保 padding 包含在高度内
				}}
			>
				<div style={{ 
					maxWidth: '900px', 
					margin: '0 auto', 
					paddingTop: 0,
					paddingBottom: 0,
					paddingLeft: '24px',
					paddingRight: '24px',
					overflow: 'visible' // 确保内容不被裁剪
				}}>
					<ChatInput
						onSend={handleSend}
						disabled={sending || streaming}
						aiNickname={aiNickname}
						onMentionSelect={handleMentionSelect}
						roomType={roomType}
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
			
			{/* 分享按钮 */}
			{!shareMode && messages.length > 0 && (
				<ShareButton
					onClick={() => {
						enterShareMode();
					}}
					disabled={loading}
					hasInviteButton={(roomType === 'SOLO' || roomType === null)}
				/>
			)}
			
			{/* 分享模式控制栏 */}
			{shareMode && (
				<div
					style={{
						position: 'fixed',
						bottom: '100px',
						right: '20px',
						display: 'flex',
						gap: '12px',
						zIndex: 1000,
						background: 'var(--color-background-paper)',
						paddingTop: '12px',
						paddingBottom: '12px',
						paddingLeft: '16px',
						paddingRight: '16px',
						borderRadius: '8px',
						boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
						border: '1px solid var(--color-border)'
					}}
				>
					<button
						onClick={() => {
							if (selectedMessages.length > 0) {
								setShowSharePreview(true);
							}
						}}
						disabled={selectedMessages.length === 0}
						style={{
							paddingTop: '8px',
							paddingBottom: '8px',
							paddingLeft: '16px',
							paddingRight: '16px',
							background: selectedMessages.length > 0 ? 'var(--color-primary)' : 'var(--color-border)',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							cursor: selectedMessages.length > 0 ? 'pointer' : 'not-allowed',
							fontSize: '14px',
							fontWeight: '500',
							opacity: selectedMessages.length > 0 ? 1 : 0.6
						}}
					>
						预览 ({selectedMessages.length})
					</button>
					<button
						onClick={() => {
							selectAll(messages.map((msg) => ({
								id: msg.id,
								content: msg.content,
								senderName: msg.sender.name || msg.sender.email,
								senderAvatar: msg.sender.avatarUrl || undefined,
								isCurrentUser: msg.senderId === currentUserId,
								createdAt: msg.createdAt,
								type: msg.contentType
							})));
						}}
						style={{
							paddingTop: '8px',
							paddingBottom: '8px',
							paddingLeft: '16px',
							paddingRight: '16px',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
							border: '1px solid var(--color-border)',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: '500'
						}}
					>
						全选
					</button>
					<button
						onClick={() => {
							clearSelection();
						}}
						style={{
							paddingTop: '8px',
							paddingBottom: '8px',
							paddingLeft: '16px',
							paddingRight: '16px',
							background: 'var(--color-background)',
							color: 'var(--color-text-primary)',
							border: '1px solid var(--color-border)',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: '500'
						}}
					>
						清空
					</button>
					<button
						onClick={() => {
							exitShareMode();
						}}
						style={{
							paddingTop: '8px',
							paddingBottom: '8px',
							paddingLeft: '16px',
							paddingRight: '16px',
							background: 'var(--color-error)',
							color: 'white',
							border: 'none',
							borderRadius: '6px',
							cursor: 'pointer',
							fontSize: '14px',
							fontWeight: '500'
						}}
					>
						取消
					</button>
				</div>
			)}
			
			{/* 邀请按钮（仅SOLO房间显示，如果roomType为null则默认显示） */}
			{(roomType === 'SOLO' || roomType === null) && !shareMode && (
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
						bottom: messages.length > 0 ? '100px' : '100px', // 有消息时，放在输入框上方
						right: '20px',
						paddingTop: '12px',
						paddingBottom: '12px',
						paddingLeft: '24px',
						paddingRight: '24px',
						background: 'var(--color-primary)',
						color: 'white',
						border: 'none',
						borderRadius: '8px',
						cursor: 'pointer',
						boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
						fontSize: '14px',
						fontWeight: '500',
						zIndex: 1001 // 确保在输入框之上
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
			
			{/* 分享预览对话框 */}
			{showSharePreview && (
				<ShareCardPreview
					messages={selectedMessages}
					config={cardConfig}
					onClose={() => setShowSharePreview(false)}
					onConfigChange={updateConfig}
				/>
			)}
			
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
			
			{/* 图书搜索对话框 */}
			<BookSearchDialog
				open={showBookSearchDialog}
				onClose={() => setShowBookSearchDialog(false)}
				onSelect={handleBookSelect}
			/>
			
			{/* 认证对话框（登录/注册，未登录用户通过邀请链接进入时显示） */}
			{showAuthDialog && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.5)',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						zIndex: 1000
					}}
				>
					<div
						style={{
							background: 'var(--color-background-paper)',
							borderRadius: '12px',
							padding: '24px',
							maxWidth: '480px',
							width: '90%',
							maxHeight: '80vh',
							overflowY: 'auto',
							boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
							position: 'relative'
						}}
						onClick={(e) => e.stopPropagation()}
					>
						{/* 切换按钮 */}
						<div style={{
							display: 'flex',
							gap: 'var(--spacing-sm)',
							marginBottom: 'var(--spacing-lg)',
							background: 'var(--color-background-subtle)',
							padding: '4px',
							borderRadius: 'var(--radius-md)'
						}}>
							<button
								type="button"
								onClick={() => {
									setIsLoginMode(false);
									setAuthError(null);
								}}
								style={{
									flex: 1,
									padding: 'var(--spacing-sm) var(--spacing-md)',
									border: 'none',
									borderRadius: 'var(--radius-sm)',
									background: !isLoginMode ? 'var(--color-primary)' : 'transparent',
									color: !isLoginMode ? 'white' : 'var(--color-text-secondary)',
									fontSize: 'var(--font-size-sm)',
									fontWeight: 600,
									cursor: 'pointer',
									transition: 'all var(--transition-fast)'
								}}
							>
								注册
							</button>
							<button
								type="button"
								onClick={() => {
									setIsLoginMode(true);
									setAuthError(null);
								}}
								style={{
									flex: 1,
									padding: 'var(--spacing-sm) var(--spacing-md)',
									border: 'none',
									borderRadius: 'var(--radius-sm)',
									background: isLoginMode ? 'var(--color-primary)' : 'transparent',
									color: isLoginMode ? 'white' : 'var(--color-text-secondary)',
									fontSize: 'var(--font-size-sm)',
									fontWeight: 600,
									cursor: 'pointer',
									transition: 'all var(--transition-fast)'
								}}
							>
								登录
							</button>
						</div>

						<h2 style={{
							marginTop: 0,
							marginBottom: 'var(--spacing-md)',
							fontSize: 'var(--font-size-2xl)',
							fontWeight: 700,
							textAlign: 'center',
							background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent',
							backgroundClip: 'text'
						}}>
							{isLoginMode ? '登录' : '注册账号'}
						</h2>
						<p style={{
							textAlign: 'center',
							color: 'var(--color-text-secondary)',
							marginBottom: 'var(--spacing-xl)',
							fontSize: 'var(--font-size-sm)'
						}}>
							您已收到聊天邀请，请{isLoginMode ? '登录' : '注册'}账号以加入讨论
						</p>
						
						<form onSubmit={isLoginMode ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
								<label htmlFor="auth-email" style={{ 
									fontSize: 'var(--font-size-sm)',
									fontWeight: 600,
									color: 'var(--color-text-primary)'
								}}>
									邮箱 <span style={{ color: 'var(--color-error)' }}>*</span>
								</label>
								<input
									id="auth-email"
									type="email"
									value={authEmail}
									onChange={(e) => setAuthEmail(e.target.value)}
									required
									disabled={isAuthing}
									placeholder="your@email.com"
									style={{
										width: '100%',
										padding: 'var(--spacing-md) var(--spacing-lg)',
										border: '2px solid var(--color-border)',
										borderRadius: 'var(--radius-md)',
										fontSize: 'var(--font-size-base)',
										background: 'var(--color-background-paper)',
										color: 'var(--color-text-primary)',
										transition: 'all var(--transition-fast)',
										fontFamily: 'var(--font-family)',
										boxSizing: 'border-box'
									}}
									onFocus={(e) => {
										e.currentTarget.style.borderColor = 'var(--color-primary)';
										e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-lighter)';
									}}
									onBlur={(e) => {
										e.currentTarget.style.borderColor = 'var(--color-border)';
										e.currentTarget.style.boxShadow = 'none';
									}}
								/>
							</div>

							<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
								<label htmlFor="auth-password" style={{ 
									fontSize: 'var(--font-size-sm)',
									fontWeight: 600,
									color: 'var(--color-text-primary)'
								}}>
									密码{!isLoginMode && '（≥8位）'} <span style={{ color: 'var(--color-error)' }}>*</span>
								</label>
								<input
									id="auth-password"
									type="password"
									value={authPassword}
									onChange={(e) => setAuthPassword(e.target.value)}
									required
									minLength={isLoginMode ? undefined : 8}
									disabled={isAuthing}
									placeholder={isLoginMode ? "请输入密码" : "至少8个字符"}
									style={{
										width: '100%',
										padding: 'var(--spacing-md) var(--spacing-lg)',
										border: '2px solid var(--color-border)',
										borderRadius: 'var(--radius-md)',
										fontSize: 'var(--font-size-base)',
										background: 'var(--color-background-paper)',
										color: 'var(--color-text-primary)',
										transition: 'all var(--transition-fast)',
										fontFamily: 'var(--font-family)',
										boxSizing: 'border-box'
									}}
									onFocus={(e) => {
										e.currentTarget.style.borderColor = 'var(--color-primary)';
										e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-lighter)';
									}}
									onBlur={(e) => {
										e.currentTarget.style.borderColor = 'var(--color-border)';
										e.currentTarget.style.boxShadow = 'none';
									}}
								/>
							</div>

							{!isLoginMode && (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
									<label htmlFor="auth-confirm-password" style={{ 
										fontSize: 'var(--font-size-sm)',
										fontWeight: 600,
										color: 'var(--color-text-primary)'
									}}>
										确认密码 <span style={{ color: 'var(--color-error)' }}>*</span>
									</label>
									<input
										id="auth-confirm-password"
										type="password"
										value={authConfirmPassword}
										onChange={(e) => setAuthConfirmPassword(e.target.value)}
										required
										minLength={8}
										disabled={isAuthing}
										placeholder="再次输入密码"
									style={{
										width: '100%',
										padding: 'var(--spacing-md) var(--spacing-lg)',
										border: '2px solid var(--color-border)',
										borderRadius: 'var(--radius-md)',
										fontSize: 'var(--font-size-base)',
										background: 'var(--color-background-paper)',
										color: 'var(--color-text-primary)',
										transition: 'all var(--transition-fast)',
										fontFamily: 'var(--font-family)',
										boxSizing: 'border-box'
									}}
									onFocus={(e) => {
										e.currentTarget.style.borderColor = 'var(--color-primary)';
										e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-lighter)';
									}}
									onBlur={(e) => {
										e.currentTarget.style.borderColor = 'var(--color-border)';
										e.currentTarget.style.boxShadow = 'none';
									}}
								/>
							</div>

							)}

							{authError && (
								<div style={{
									padding: 'var(--spacing-md) var(--spacing-lg)',
									background: 'rgba(198, 40, 40, 0.1)',
									color: 'var(--color-error)',
									borderLeft: '4px solid var(--color-error)',
									borderRadius: 'var(--radius-md)',
									fontSize: 'var(--font-size-sm)',
									fontWeight: 500
								}}>
									{authError}
								</div>
							)}

							<button
								type="submit"
								disabled={isAuthing}
								className="btn-academic-primary"
								style={{
									width: '100%',
									padding: 'var(--spacing-md) var(--spacing-xl)',
									fontSize: 'var(--font-size-base)',
									fontWeight: 600,
									borderRadius: 'var(--radius-md)',
									opacity: isAuthing ? 0.6 : 1,
									cursor: isAuthing ? 'not-allowed' : 'pointer',
									transition: 'all var(--transition-fast)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: 'var(--spacing-sm)',
									marginTop: 'var(--spacing-md)'
								}}
							>
								{isAuthing ? (
									<>
										<span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
										{isLoginMode ? '登录中...' : '注册中...'}
									</>
								) : (
									<>
										<span>{isLoginMode ? '🔑' : '📝'}</span>
										{isLoginMode ? '登录并加入讨论' : '注册并加入讨论'}
									</>
								)}
							</button>
						</form>
						
						{/* 退出聊天按钮 */}
						<button
							type="button"
							onClick={() => {
								router.push('/');
							}}
							style={{
								width: '100%',
								padding: 'var(--spacing-md) var(--spacing-xl)',
								marginTop: 'var(--spacing-md)',
								fontSize: 'var(--font-size-base)',
								fontWeight: 500,
								borderRadius: 'var(--radius-md)',
								border: '1px solid var(--color-border)',
								background: 'transparent',
								color: 'var(--color-text-secondary)',
								cursor: 'pointer',
								transition: 'all var(--transition-fast)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								gap: 'var(--spacing-sm)'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'var(--color-background-subtle)';
								e.currentTarget.style.color = 'var(--color-text-primary)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'transparent';
								e.currentTarget.style.color = 'var(--color-text-secondary)';
							}}
						>
							<span>←</span>
							退出聊天
						</button>
					</div>
				</div>
			)}
			
			</div>
		</div>
	);
}
