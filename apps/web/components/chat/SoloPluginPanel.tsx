'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatStream } from '@/contexts/ChatStreamContext';
import type { SoloPluginType } from '@/lib/chat/prompts/solo';
import { createModuleLogger } from '@/lib/utils/logger';
import { SearchIcon, LinkIcon, FileIcon, QuestionIcon, RefreshIcon, LibraryIcon, BookMarkedIcon, TargetIcon } from '@/components/ui/Icons';

const log = createModuleLogger('SoloPluginPanel');

interface SoloPluginPanelProps {
	roomId: string;
	roomType: 'SOLO' | 'DUO';
	messages?: Array<{ id: string; content: string; contentType: string }>;
}

interface PluginInfo {
	type: SoloPluginType;
	name: string;
	description: string;
	icon: React.ComponentType<{ size?: number; color?: string }>;
	category: 'core' | 'advanced';
}

/**
 * 单人房间 AI 插件面板
 * 显示 8 大 AI 思想教练插件
 */
export default function SoloPluginPanel({ roomId, roomType, messages = [] }: SoloPluginPanelProps) {
	const [activePlugin, setActivePlugin] = useState<SoloPluginType | null>(null);
	const [pluginResult, setPluginResult] = useState<string | null>(null);
	const [loading, setLoading] = useState<SoloPluginType | null>(null);
	const [recommendedPlugins, setRecommendedPlugins] = useState<SoloPluginType[]>([]);

	const { startStream, getStreamState, activeStreams } = useChatStream();
	const currentStreamingIdRef = useRef<string | null>(null);

	// 8 大插件定义
	const plugins: PluginInfo[] = [
		{
			type: 'concept_clarifier',
			name: '概念澄清器',
			description: '帮助拆分和界定模糊概念',
			icon: SearchIcon,
			category: 'core'
		},
		{
			type: 'reasoning_analyzer',
			name: '推理链路分析',
			description: '将观点拆解成前提→推理→结论',
			icon: LinkIcon,
			category: 'core'
		},
		{
			type: 'writing_structurer',
			name: '结构化写作',
			description: '整理长文本为结构化内容',
			icon: FileIcon,
			category: 'core'
		},
		{
			type: 'socratic_guide',
			name: '深度问答引导',
			description: '通过提问深化思考',
			icon: QuestionIcon,
			category: 'advanced'
		},
		{
			type: 'counter_perspective',
			name: '对立视角生成',
			description: '提供不同的分析框架',
			icon: RefreshIcon,
			category: 'advanced'
		},
		{
			type: 'learning_navigator',
			name: '学习引导',
			description: '推荐相关理论章节',
			icon: LibraryIcon,
			category: 'advanced'
		},
		{
			type: 'thought_log',
			name: '思想日志',
			description: '生成结构化思考记录',
			icon: BookMarkedIcon,
			category: 'advanced'
		},
		{
			type: 'practice_framework',
			name: '实践框架',
			description: '提供实践思考模板',
			icon: TargetIcon,
			category: 'advanced'
		}
	];

	// 根据最近消息自动推荐插件
	useEffect(() => {
		if (!messages || messages.length === 0) {
			setRecommendedPlugins([]);
			return;
		}

		const recentUserMessages = messages
			.filter(m => m.contentType === 'USER')
			.slice(-3)
			.map(m => m.content.toLowerCase());

		const recommendations: SoloPluginType[] = [];

		// 检测关键词
		const combinedText = recentUserMessages.join(' ');

		// 检测抽象概念词
		if (
			/(自由|公正|平等|阶级|意识形态|实践|权力|美学|价值|制度|革命)/.test(
				combinedText
			)
		) {
			recommendations.push('concept_clarifier');
		}

		// 检测长文本（>200字符）
		if (recentUserMessages.some(m => m.length > 200)) {
			recommendations.push('writing_structurer');
		}

		// 检测"实践"相关
		if (/(实践|行动|怎么做|日常)/.test(combinedText)) {
			recommendations.push('practice_framework');
		}

		// 检测推理相关
		if (/(因为|所以|如果|那么|逻辑|推理)/.test(combinedText)) {
			recommendations.push('reasoning_analyzer');
		}

		setRecommendedPlugins([...new Set(recommendations)]);
	}, [messages]);

	// 监听流式输出完成
	useEffect(() => {
		if (!currentStreamingIdRef.current || !activePlugin) return;

		const streamState = getStreamState(currentStreamingIdRef.current);
		if (streamState && !streamState.isStreaming && streamState.content) {
			setPluginResult(streamState.content);
			setLoading(null);
			currentStreamingIdRef.current = null;
		}
	}, [activeStreams, activePlugin, getStreamState]);

	// 调用插件
	const invokePlugin = async (pluginType: SoloPluginType) => {
		if (!roomId) return;

		setActivePlugin(pluginType);
		setLoading(pluginType);
		setPluginResult(null);

		try {
			// 获取最近消息作为上下文
			const res = await fetch(`/api/chat/rooms/${roomId}/messages?limit=20`);
			if (!res.ok) throw new Error('获取消息失败');

			const data = await res.json();
			const recentMessages = data.messages || [];

			// 构建上下文
			const context: Array<{ role: 'user' | 'assistant'; content: string }> = recentMessages
				.slice(-10)
				.map((msg: any) => ({
					role: msg.contentType === 'USER' ? ('user' as const) : ('assistant' as const),
					content: msg.content
				}));

			// 获取当前用户的最新输入
			const latestUserMessage =
				recentMessages.find((m: any) => m.contentType === 'USER')?.content || '';

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

			// 使用用户的最新输入作为 prompt
			const prompt = latestUserMessage || '请帮助我整理思路';

			// 启动流式输出，传入 pluginType（第 5 个参数是 taskType，第 6 个参数是 pluginType）
			startStream(messageId, roomId, prompt, context, undefined, pluginType);
		} catch (error: any) {
			log.error('调用插件失败', error as Error);
			setLoading(null);
			setPluginResult(`调用失败: ${error.message || '未知错误'}`);
		}
	};

	// 仅 SOLO 房间显示
	if (roomType !== 'SOLO') {
		return null;
	}

	const corePlugins = plugins.filter(p => p.category === 'core');
	const advancedPlugins = plugins.filter(p => p.category === 'advanced');
	const activePluginInfo = activePlugin ? plugins.find(p => p.type === activePlugin) : null;

	return (
		<div
			style={{
				background: 'var(--color-background-paper)',
				borderRadius: '8px',
				padding: '20px',
				marginBottom: '20px',
				border: '1px solid var(--color-border)'
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '20px'
				}}
			>
				<h3
					style={{
						fontSize: '18px',
						fontWeight: 600,
						color: 'var(--color-text-primary)',
						margin: 0
					}}
				>
					🤖 AI 思想教练
				</h3>
				<div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
					8 大思维工具
				</div>
			</div>

			{/* 推荐插件提示 */}
			{recommendedPlugins.length > 0 && !activePlugin && (
				<div
					style={{
					padding: '12px',
					background: 'var(--color-primary-lighter)',
					borderRadius: '6px',
					marginBottom: '16px'
				}}
				>
					<div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
						推荐工具
					</div>
					<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
						{recommendedPlugins.map(pluginType => {
							const plugin = plugins.find(p => p.type === pluginType);
							if (!plugin) return null;
							return (
								<button
									key={pluginType}
									onClick={() => invokePlugin(pluginType)}
									style={{
										padding: '6px 12px',
										background: 'var(--color-primary)',
										color: 'white',
										border: 'none',
										borderRadius: '4px',
										fontSize: '12px',
										cursor: 'pointer',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									<plugin.icon size={16} color="currentColor" />
									{plugin.name}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* 插件结果展示 */}
			{activePlugin && (
				<div
					style={{
						padding: '16px',
						background: 'var(--color-background)',
						borderRadius: '6px',
						marginBottom: '16px',
						border: '1px solid var(--color-border)'
					}}
				>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '12px'
						}}
					>
						<div style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
							{activePluginInfo && <activePluginInfo.icon size={18} color="currentColor" />}
							{activePluginInfo?.name}
						</div>
						<button
							onClick={() => {
								setActivePlugin(null);
								setPluginResult(null);
							}}
							style={{
								padding: '4px 8px',
								background: 'transparent',
								border: '1px solid var(--color-border)',
								borderRadius: '4px',
								fontSize: '12px',
								cursor: 'pointer'
							}}
						>
							关闭
						</button>
					</div>
					{loading === activePlugin ? (
						<div
							style={{
								padding: '20px',
								textAlign: 'center',
								color: 'var(--color-text-secondary)',
								fontSize: '14px'
							}}
						>
							AI 正在思考...
						</div>
					) : pluginResult ? (
						<div
							style={{
								fontSize: '14px',
								lineHeight: '1.6',
								color: 'var(--color-text-primary)',
								whiteSpace: 'pre-wrap'
							}}
						>
							{pluginResult}
						</div>
					) : null}
				</div>
			)}

			{/* 核心插件 */}
			<div style={{ marginBottom: '20px' }}>
				<div
					style={{
						fontSize: '13px',
						fontWeight: 600,
						color: 'var(--color-text-secondary)',
						marginBottom: '12px'
					}}
				>
					核心工具
				</div>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
					{corePlugins.map(plugin => (
						<button
							key={plugin.type}
							onClick={() => invokePlugin(plugin.type)}
							disabled={loading !== null}
							style={{
								padding: '12px',
								background: activePlugin === plugin.type ? 'var(--color-primary-lighter)' : 'var(--color-background)',
								border: `1px solid ${activePlugin === plugin.type ? 'var(--color-primary)' : 'var(--color-border)'}`,
								borderRadius: '6px',
								cursor: loading ? 'not-allowed' : 'pointer',
								textAlign: 'left',
								opacity: loading && loading !== plugin.type ? 0.5 : 1,
								transition: 'all 0.2s'
							}}
						>
							<div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								<plugin.icon size={24} color="var(--color-primary)" />
							</div>
							<div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
								{plugin.name}
							</div>
							<div
								style={{
									fontSize: '11px',
									color: 'var(--color-text-secondary)',
									lineHeight: '1.4'
								}}
							>
								{plugin.description}
							</div>
						</button>
					))}
				</div>
			</div>

			{/* 高级插件（可折叠） */}
			<details style={{ cursor: 'pointer' }}>
				<summary
					style={{
						fontSize: '13px',
						fontWeight: 600,
						color: 'var(--color-text-secondary)',
						marginBottom: '12px',
						listStyle: 'none',
						cursor: 'pointer'
					}}
				>
					高级工具 ▼
				</summary>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
					{advancedPlugins.map(plugin => (
						<button
							key={plugin.type}
							onClick={() => invokePlugin(plugin.type)}
							disabled={loading !== null}
							style={{
								padding: '12px',
								background: activePlugin === plugin.type ? 'var(--color-primary-lighter)' : 'var(--color-background)',
								border: `1px solid ${activePlugin === plugin.type ? 'var(--color-primary)' : 'var(--color-border)'}`,
								borderRadius: '6px',
								cursor: loading ? 'not-allowed' : 'pointer',
								textAlign: 'left',
								opacity: loading && loading !== plugin.type ? 0.5 : 1,
								transition: 'all 0.2s'
							}}
						>
							<div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								<plugin.icon size={24} color="var(--color-primary)" />
							</div>
							<div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
								{plugin.name}
							</div>
							<div
								style={{
									fontSize: '11px',
									color: 'var(--color-text-secondary)',
									lineHeight: '1.4'
								}}
							>
								{plugin.description}
							</div>
						</button>
					))}
				</div>
			</details>
		</div>
	);
}

