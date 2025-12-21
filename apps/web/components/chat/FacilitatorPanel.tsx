'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useChatStream } from '@/contexts/ChatStreamContext';
import TrendChart from './TrendChart';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { createModuleLogger } from '@/lib/utils/logger';
import { ChartIcon, MessageIcon, HandshakeIcon, TrendingUpIcon } from '@/components/ui/Icons';

const log = createModuleLogger('FacilitatorPanel');

export interface FacilitatorPanelProps {
	roomId: string;
	facilitatorMode?: 'v1' | 'v2' | 'v3';
}

export interface FacilitatorPanelRef {
	requestStructureAnalysis: () => Promise<void>;
	requestConsensusSummary: () => Promise<void>;
	requestToneReminder: () => Promise<void>;
}

type TaskType = 'structure' | 'tone' | 'consensus';

interface TaskResult {
	structure?: string;
	tone?: string;
	consensus?: {
		consensusPoints?: string[];
		disagreementPoints?: string[];
		suggestions?: string[];
	};
}

interface TrendDataPoint {
	timestamp: string;
	score: number;
	count: number;
}

const FacilitatorPanel = forwardRef<FacilitatorPanelRef, FacilitatorPanelProps>(
	({ roomId, facilitatorMode = 'v1' }, ref) => {
	const [activeTab, setActiveTab] = useState<'structure' | 'consensus' | 'tone' | 'trend'>('structure');
	const [structureResult, setStructureResult] = useState<string | null>(null);
	const [toneResult, setToneResult] = useState<string | null>(null);
	const [consensusResult, setConsensusResult] = useState<TaskResult['consensus'] | null>(null);
	const [loading, setLoading] = useState<TaskType | null>(null);
	const [consensusTrend, setConsensusTrend] = useState<TrendDataPoint[]>([]);
	const [divergenceTrend, setDivergenceTrend] = useState<TrendDataPoint[]>([]);
	const [trendLoading, setTrendLoading] = useState(true);

	const { startStream, getStreamState, activeStreams } = useChatStream();
	const currentStreamingIdRef = useRef<string | null>(null);

	// 加载趋势数据
	useEffect(() => {
		const loadTrends = async () => {
			setTrendLoading(true);
			try {
				const res = await fetch(`/api/chat/rooms/${roomId}/trends`);
				if (res.ok) {
					const data = await res.json();
					setConsensusTrend(data.consensusTrend || []);
					setDivergenceTrend(data.divergenceTrend || []);
				}
			} catch (error) {
				log.error('Failed to load trends', error as Error);
			} finally {
				setTrendLoading(false);
			}
		};

		if (activeTab === 'trend') {
			loadTrends();
			// 定期刷新趋势数据
			const interval = setInterval(loadTrends, 30000); // 每30秒刷新一次
			return () => clearInterval(interval);
		}
	}, [roomId, activeTab]);

	// 监听流式输出完成
	useEffect(() => {
		if (!currentStreamingIdRef.current || !loading) return;

		const streamState = getStreamState(currentStreamingIdRef.current);
		if (streamState && !streamState.isStreaming && streamState.content) {
			parseAndSetResult(streamState.content, loading);
			setLoading(null);
			currentStreamingIdRef.current = null;
		} else if (streamState && streamState.error) {
			log.error('Stream error', streamState.error as Error);
			setLoading(null);
			currentStreamingIdRef.current = null;
		}
	}, [activeStreams, loading, getStreamState]);

	// 解析AI返回的结果
	const parseAndSetResult = (content: string, taskType: TaskType) => {
		if (taskType === 'structure') {
			setStructureResult(content);
		} else if (taskType === 'tone') {
			setToneResult(content);
		} else if (taskType === 'consensus') {
			// 解析共识分析结果
			const consensus: TaskResult['consensus'] = {
				consensusPoints: [],
				disagreementPoints: [],
				suggestions: []
			};

			// 尝试提取共识点
			const consensusMatch = content.match(/共识[点]?[：:]\s*([^\n]+(?:\n[^\n]+)*?)(?=\n(?:分歧|建议|$))/i);
			if (consensusMatch) {
				const consensusText = consensusMatch[1];
				consensus.consensusPoints = consensusText
					.split(/[、，,]\s*/)
					.map(p => p.trim())
					.filter(p => p.length > 0);
			}

			// 尝试提取分歧点
			const disagreementMatch = content.match(/分歧[点]?[：:]\s*([^\n]+(?:\n[^\n]+)*?)(?=\n(?:建议|$))/i);
			if (disagreementMatch) {
				const disagreementText = disagreementMatch[1];
				consensus.disagreementPoints = disagreementText
					.split(/[、，,]\s*/)
					.map(p => p.trim())
					.filter(p => p.length > 0);
			}

			// 尝试提取建议
			const suggestionMatch = content.match(/建议[：:]\s*([^\n]+(?:\n[^\n]+)*?)$/i);
			if (suggestionMatch) {
				const suggestionText = suggestionMatch[1];
				consensus.suggestions = suggestionText
					.split(/[、，,]\s*/)
					.map(p => p.trim())
					.filter(p => p.length > 0);
			}

			// 如果没有提取到结构化数据，使用原始内容
			if (consensus.consensusPoints?.length === 0 && consensus.disagreementPoints?.length === 0) {
				// 尝试按行分割
				const lines = content.split('\n').filter(l => l.trim().length > 0);
				consensus.consensusPoints = lines.slice(0, Math.ceil(lines.length / 2));
				consensus.disagreementPoints = lines.slice(Math.ceil(lines.length / 2));
			}

			setConsensusResult(consensus);
		}
	};

	// 提取列表项
	const extractListItems = (text: string): string[] => {
		const items: string[] = [];
		// 匹配各种列表格式：1. 2. - * • 等
		const listPattern = /(?:^|\n)[\s]*[•\-\*\+\d+\.]\s*([^\n]+)/g;
		let match;
		while ((match = listPattern.exec(text)) !== null) {
			items.push(match[1].trim());
		}
		return items.length > 0 ? items : text.split('\n').filter(l => l.trim().length > 0);
	};

	// 提取分歧点
	const extractDisagreements = (text: string): string[] => {
		const items: string[] = [];
		// 匹配分歧相关的文本
		const disagreementPattern = /(?:分歧|不同|争议)[：:]\s*([^\n]+(?:\n[^\n]+)*?)(?=\n(?:建议|共识|$))/i;
		const match = text.match(disagreementPattern);
		if (match) {
			return extractListItems(match[1]);
		}
		return items;
	};

	// 请求结构分析
	const requestStructureAnalysis = async () => {
		if (!roomId || loading) return;

		setLoading('structure');
		setStructureResult(null);

		try {
			// 获取最近消息作为上下文
			const res = await fetch(`/api/chat/rooms/${roomId}/messages?limit=20`);
			if (!res.ok) throw new Error('获取消息失败');

			const data = await res.json();
			const recentMessages = data.messages || [];

			// 构建上下文
			const context: Array<{ role: 'user' | 'assistant'; content: string }> = recentMessages
				.filter((msg: any) => msg.contentType === 'USER' || msg.contentType === 'AI_ADOPTED')
				.slice(-15)
				.map((msg: any) => ({
					role: msg.contentType === 'USER' ? ('user' as const) : ('assistant' as const),
					content: msg.content
				}));

			// 创建 AI 消息
			const messageRes = await fetch(`/api/chat/rooms/${roomId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: '',
					contentType: 'AI_SUGGESTION'
				})
			});

			if (!messageRes.ok) throw new Error('创建 AI 消息失败');

			const { message } = await messageRes.json();
			const messageId = message.id;
			currentStreamingIdRef.current = messageId;

			// 使用任务提示作为 prompt
			const prompt = '请分析当前讨论的结构';

			// 启动流式输出
			startStream(messageId, roomId, prompt, context, 'structure', undefined, facilitatorMode);
		} catch (error: any) {
			log.error('结构分析失败', error as Error);
			setLoading(null);
			setStructureResult(`分析失败: ${error.message || '未知错误'}`);
		}
	};

	// 请求共识分析
	const requestConsensusSummary = async () => {
		if (!roomId || loading) return;

		setLoading('consensus');
		setConsensusResult(null);

		try {
			// 获取最近消息作为上下文
			const res = await fetch(`/api/chat/rooms/${roomId}/messages?limit=20`);
			if (!res.ok) throw new Error('获取消息失败');

			const data = await res.json();
			const recentMessages = data.messages || [];

			// 构建上下文
			const context: Array<{ role: 'user' | 'assistant'; content: string }> = recentMessages
				.filter((msg: any) => msg.contentType === 'USER' || msg.contentType === 'AI_ADOPTED')
				.slice(-15)
				.map((msg: any) => ({
					role: msg.contentType === 'USER' ? ('user' as const) : ('assistant' as const),
					content: msg.content
				}));

			// 创建 AI 消息
			const messageRes = await fetch(`/api/chat/rooms/${roomId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: '',
					contentType: 'AI_SUGGESTION'
				})
			});

			if (!messageRes.ok) throw new Error('创建 AI 消息失败');

			const { message } = await messageRes.json();
			const messageId = message.id;
			currentStreamingIdRef.current = messageId;

			// 使用任务提示作为 prompt
			const prompt = '请分析最近的讨论内容，识别共识点和分歧点';

			// 启动流式输出
			startStream(messageId, roomId, prompt, context, 'consensus', undefined, facilitatorMode);
		} catch (error: any) {
			log.error('共识分析失败', error as Error);
			setLoading(null);
			setConsensusResult({
				consensusPoints: [],
				disagreementPoints: [],
				suggestions: [`分析失败: ${error.message || '未知错误'}`]
			});
		}
	};

	// 请求语气提醒
	const requestToneReminder = async () => {
		if (!roomId || loading) return;

		setLoading('tone');
		setToneResult(null);

		try {
			// 获取最近消息作为上下文
			const res = await fetch(`/api/chat/rooms/${roomId}/messages?limit=10`);
			if (!res.ok) throw new Error('获取消息失败');

			const data = await res.json();
			const recentMessages = data.messages || [];

			// 构建上下文
			const context: Array<{ role: 'user' | 'assistant'; content: string }> = recentMessages
				.filter((msg: any) => msg.contentType === 'USER' || msg.contentType === 'AI_ADOPTED')
				.slice(-10)
				.map((msg: any) => ({
					role: msg.contentType === 'USER' ? ('user' as const) : ('assistant' as const),
					content: msg.content
				}));

			// 创建 AI 消息
			const messageRes = await fetch(`/api/chat/rooms/${roomId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: '',
					contentType: 'AI_SUGGESTION'
				})
			});

			if (!messageRes.ok) throw new Error('创建 AI 消息失败');

			const { message } = await messageRes.json();
			const messageId = message.id;
			currentStreamingIdRef.current = messageId;

			// 使用任务提示作为 prompt
			const prompt = '请评估当前讨论的语气和情绪状态';

			// 启动流式输出
			startStream(messageId, roomId, prompt, context, 'tone', undefined, facilitatorMode);
		} catch (error: any) {
			log.error('语气提醒失败', error as Error);
			setLoading(null);
			setToneResult(`分析失败: ${error.message || '未知错误'}`);
		}
	};

	// 暴露方法给父组件
	useImperativeHandle(ref, () => ({
		requestStructureAnalysis,
		requestConsensusSummary,
		requestToneReminder
	}));

	const tabs = [
		{ id: 'structure' as const, label: '结构分析', icon: ChartIcon },
		{ id: 'consensus' as const, label: '共识/分歧', icon: HandshakeIcon },
		{ id: 'tone' as const, label: '语气提醒', icon: MessageIcon },
		{ id: 'trend' as const, label: '共识趋势', icon: TrendingUpIcon }
	];

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				background: 'var(--color-background-paper)',
				borderRadius: '8px',
				overflow: 'hidden'
			}}
		>
			{/* 标签页 */}
			<div
				style={{
					display: 'flex',
					borderBottom: '1px solid var(--color-border)',
					background: 'var(--color-background)'
				}}
			>
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						style={{
							flex: 1,
							padding: '12px 8px',
							border: 'none',
							background: activeTab === tab.id ? 'var(--color-background-paper)' : 'transparent',
							borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
							color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
							fontSize: '12px',
							fontWeight: activeTab === tab.id ? 600 : 400,
							cursor: 'pointer',
							transition: 'all 0.2s',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '4px'
						}}
					>
						{tab.icon && <tab.icon size={16} color={activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)'} />}
						<span>{tab.label}</span>
					</button>
				))}
			</div>

			{/* 内容区域 */}
			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '16px'
				}}
			>
				{activeTab === 'structure' && (
					<div>
						<div style={{ marginBottom: '16px' }}>
							<button
								onClick={requestStructureAnalysis}
								disabled={loading === 'structure'}
								style={{
									padding: '10px 20px',
									background: loading === 'structure' ? 'var(--color-background-subtle)' : 'var(--color-primary)',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									cursor: loading === 'structure' ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									fontWeight: 500,
									opacity: loading === 'structure' ? 0.6 : 1
								}}
							>
								{loading === 'structure' ? '分析中...' : '分析讨论结构'}
							</button>
						</div>

						{loading === 'structure' && (
							<div style={{ textAlign: 'center', padding: '20px' }}>
								<LoadingSpinner message="正在分析讨论结构..." />
							</div>
						)}

						{structureResult && !loading && (
							<div
								style={{
									padding: '16px',
									background: 'var(--color-background)',
									borderRadius: '6px',
									border: '1px solid var(--color-border)',
									whiteSpace: 'pre-wrap',
									lineHeight: '1.6',
									color: 'var(--color-text-primary)',
									fontSize: '14px'
								}}
							>
								{structureResult}
							</div>
						)}
					</div>
				)}

				{activeTab === 'consensus' && (
					<div>
						<div style={{ marginBottom: '16px' }}>
							<button
								onClick={requestConsensusSummary}
								disabled={loading === 'consensus'}
								style={{
									padding: '10px 20px',
									background: loading === 'consensus' ? 'var(--color-background-subtle)' : 'var(--color-primary)',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									cursor: loading === 'consensus' ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									fontWeight: 500,
									opacity: loading === 'consensus' ? 0.6 : 1
								}}
							>
								{loading === 'consensus' ? '分析中...' : '分析共识与分歧'}
							</button>
						</div>

						{loading === 'consensus' && (
							<div style={{ textAlign: 'center', padding: '20px' }}>
								<LoadingSpinner message="正在分析共识与分歧..." />
							</div>
						)}

						{consensusResult && !loading && (
							<div>
								{consensusResult.consensusPoints && consensusResult.consensusPoints.length > 0 && (
									<div style={{ marginBottom: '20px' }}>
										<h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-success)' }}>
											✅ 共识点
										</h3>
										<ul style={{ margin: 0, paddingLeft: '20px' }}>
											{consensusResult.consensusPoints.map((point, index) => (
												<li key={index} style={{ marginBottom: '8px', color: 'var(--color-text-primary)', fontSize: '14px', lineHeight: '1.6' }}>
													{point}
												</li>
											))}
										</ul>
									</div>
								)}

								{consensusResult.disagreementPoints && consensusResult.disagreementPoints.length > 0 && (
									<div style={{ marginBottom: '20px' }}>
										<h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-warning)' }}>
											⚠️ 分歧点
										</h3>
										<ul style={{ margin: 0, paddingLeft: '20px' }}>
											{consensusResult.disagreementPoints.map((point, index) => (
												<li key={index} style={{ marginBottom: '8px', color: 'var(--color-text-primary)', fontSize: '14px', lineHeight: '1.6' }}>
													{point}
												</li>
											))}
										</ul>
									</div>
								)}

								{consensusResult.suggestions && consensusResult.suggestions.length > 0 && (
									<div>
										<h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-primary)' }}>
											💡 建议
										</h3>
										<ul style={{ margin: 0, paddingLeft: '20px' }}>
											{consensusResult.suggestions.map((suggestion, index) => (
												<li key={index} style={{ marginBottom: '8px', color: 'var(--color-text-primary)', fontSize: '14px', lineHeight: '1.6' }}>
													{suggestion}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{activeTab === 'tone' && (
					<div>
						<div style={{ marginBottom: '16px' }}>
							<button
								onClick={requestToneReminder}
								disabled={loading === 'tone'}
								style={{
									padding: '10px 20px',
									background: loading === 'tone' ? 'var(--color-background-subtle)' : 'var(--color-primary)',
									color: 'white',
									border: 'none',
									borderRadius: '6px',
									cursor: loading === 'tone' ? 'not-allowed' : 'pointer',
									fontSize: '14px',
									fontWeight: 500,
									opacity: loading === 'tone' ? 0.6 : 1
								}}
							>
								{loading === 'tone' ? '分析中...' : '评估语气'}
							</button>
						</div>

						{loading === 'tone' && (
							<div style={{ textAlign: 'center', padding: '20px' }}>
								<LoadingSpinner message="正在评估语气..." />
							</div>
						)}

						{toneResult && !loading && (
							<div
								style={{
									padding: '16px',
									background: 'var(--color-background)',
									borderRadius: '6px',
									border: '1px solid var(--color-border)',
									whiteSpace: 'pre-wrap',
									lineHeight: '1.6',
									color: 'var(--color-text-primary)',
									fontSize: '14px'
								}}
							>
								{toneResult}
							</div>
						)}
					</div>
				)}

				{activeTab === 'trend' && (
					<div>
						{trendLoading ? (
							<div style={{ textAlign: 'center', padding: '20px' }}>
								<LoadingSpinner message="加载趋势数据..." />
							</div>
						) : consensusTrend.length === 0 ? (
							<div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)' }}>
								<p>暂无趋势数据</p>
								<p style={{ fontSize: '12px', marginTop: '8px' }}>开始讨论后，系统会自动生成趋势分析</p>
							</div>
						) : (
							<TrendChart consensusTrend={consensusTrend} divergenceTrend={divergenceTrend} />
						)}
					</div>
				)}
			</div>
		</div>
	);
});

FacilitatorPanel.displayName = 'FacilitatorPanel';

export default FacilitatorPanel;
