'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import ModerationWarning from './ModerationWarning';

const MAX_PREVIEW_LENGTH = 500; // 超过此长度折叠

interface ChatMessageProps {
	id: string;
	content: string;
	senderId: string;
	senderName: string;
	senderAvatar?: string;
	type: 'USER' | 'AI_SUGGESTION' | 'AI_ADOPTED';
	isStreaming?: boolean;
	streamingText?: string;
	createdAt: string;
	isCurrentUser?: boolean;
	isLeftAligned?: boolean; // 是否左对齐（创建者在左边）
	onAdopt?: (messageId: string) => void;
	onQuote?: (messageId: string) => void; // 引用消息
	onRegenerate?: (messageId: string) => void; // 重新生成AI回答
	references?: Array<{
		id: string;
		content: string;
		senderName: string;
	}>;
	aiNickname?: string | null; // AI昵称（可选）
	isSystemAi?: boolean; // 是否使用系统AI
	isAdopted?: boolean; // 是否已采纳（用于AI建议）
	moderationStatus?: 'PENDING' | 'SAFE' | 'WARNING' | 'BLOCKED'; // 监督状态
	moderationNote?: string; // 监督提醒
	moderationDetails?: {
		topicDrift?: string;
		logicalFallacies?: string[];
		factualErrors?: string[];
		suggestions?: string[];
	}; // 监督详情
}

export default function ChatMessage({
	id,
	content,
	senderId,
	senderName,
	senderAvatar,
	type,
	isStreaming = false,
	streamingText,
	createdAt,
	isCurrentUser = false,
	isLeftAligned: propIsLeftAligned,
	onAdopt,
	onQuote,
	onRegenerate,
	references = [],
	aiNickname,
	isSystemAi = false,
	isAdopted: propIsAdopted = false,
	moderationStatus,
	moderationNote,
	moderationDetails
}: ChatMessageProps) {
	const [expanded, setExpanded] = useState(false);
	const [displayContent, setDisplayContent] = useState(content);

	// 流式更新显示内容
	useEffect(() => {
		if (isStreaming && streamingText !== undefined) {
			setDisplayContent(streamingText);
		} else {
			setDisplayContent(content);
		}
	}, [isStreaming, streamingText, content]);

	const shouldCollapse = displayContent.length > MAX_PREVIEW_LENGTH;
	const previewContent =
		shouldCollapse && !expanded
			? displayContent.slice(0, MAX_PREVIEW_LENGTH) + '...'
			: displayContent;

	const isAiSuggestion = type === 'AI_SUGGESTION';
	const isAdopted = propIsAdopted || type === 'AI_ADOPTED'; // 使用prop或type判断
	const isUserMessage = type === 'USER' || (type === 'AI_SUGGESTION' && isAdopted);

	// 根据传入的prop决定布局（如果prop未定义，使用isCurrentUser）
	// 当前用户的消息在左边，对方的消息在右边
	const isLeftAligned = propIsLeftAligned !== undefined 
		? propIsLeftAligned 
		: isCurrentUser;

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				marginBottom: '24px',
				alignItems: isLeftAligned ? 'flex-start' : 'flex-end',
				width: '100%',
				paddingLeft: isLeftAligned ? '0' : '30%',
				paddingRight: isLeftAligned ? '30%' : '0'
			}}
		>
			{/* 监督警告（己方的消息显示在消息上方，对方的消息显示在消息气泡内） */}
			{isCurrentUser && (moderationStatus === 'WARNING' || moderationStatus === 'BLOCKED') && (
				<div style={{ width: '100%', marginBottom: '8px' }}>
					<ModerationWarning
						status={moderationStatus}
						note={moderationNote || ''}
						details={moderationDetails}
						showDetails={true} // 己方的消息显示详细内容
					/>
				</div>
			)}
			{/* 消息气泡 */}
			<div
				style={{
					display: 'flex',
					flexDirection: isLeftAligned ? 'row' : 'row-reverse',
					alignItems: 'flex-start',
					gap: '12px',
					maxWidth: '70%',
					minWidth: '250px',
					width: 'fit-content',
					position: 'relative'
				}}
			>
				{/* 头像 */}
				{senderAvatar ? (
					<img
						src={senderAvatar}
						alt={senderName}
						style={{
							width: 32,
							height: 32,
							borderRadius: '50%',
							flexShrink: 0,
							objectFit: 'cover',
							background: 'var(--color-background-subtle)'
						}}
					/>
				) : (
					<div
						style={{
							width: 32,
							height: 32,
							borderRadius: '50%',
							flexShrink: 0,
							background: isAiSuggestion
								? 'var(--color-primary)'
								: isCurrentUser
								? 'var(--color-primary)'
								: 'var(--color-background-subtle)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: 'white',
							fontSize: '14px',
							fontWeight: 600
						}}
					>
						{isAiSuggestion ? 'AI' : senderName.charAt(0).toUpperCase()}
					</div>
				)}

				{/* 消息内容 */}
				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						gap: '8px',
						position: 'relative'
					}}
				>
					{/* 发送者名称和时间 */}
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							flexDirection: isLeftAligned ? 'row' : 'row-reverse',
							marginBottom: '4px'
						}}
					>
						<span
							style={{
								fontSize: '14px',
								fontWeight: 600,
								color: 'var(--color-text-primary)'
							}}
						>
							{isAiSuggestion 
								? (aiNickname || (isSystemAi ? '官方AI' : 'AI助手'))
								: senderName}
						</span>
						{isAiSuggestion && (
							<>
								{/* 根据是否采纳显示不同标签 */}
								{isAdopted ? (
									<span
										style={{
											padding: '2px 8px',
											borderRadius: '12px',
											background: 'var(--color-success-lighter)',
											color: 'var(--color-success)',
											fontSize: '12px',
											fontWeight: 500,
											marginLeft: '8px'
										}}
									>
										已采纳
									</span>
								) : (
									<span
										style={{
											padding: '2px 8px',
											borderRadius: '12px',
											background: 'var(--color-primary-lighter)',
											color: 'var(--color-primary)',
											fontSize: '12px',
											fontWeight: 500,
											marginLeft: '8px'
										}}
									>
										建议
									</span>
								)}
								{isSystemAi && (
									<span
										style={{
											padding: '2px 8px',
											borderRadius: '12px',
											background: 'var(--color-success-lighter)',
											color: 'var(--color-success)',
											fontSize: '12px',
											fontWeight: 500,
											marginLeft: '4px'
										}}
									>
										官方
									</span>
								)}
							</>
						)}
						<span
							style={{
								fontSize: '12px',
								color: 'var(--color-text-secondary)',
								marginLeft: isLeftAligned ? 'auto' : '0',
								marginRight: isLeftAligned ? '0' : 'auto'
							}}
						>
							{new Date(createdAt).toLocaleTimeString('zh-CN', {
								hour: '2-digit',
								minute: '2-digit'
							})}
						</span>
					</div>

					{/* 引用显示 */}
					{references.length > 0 && (
						<div
							style={{
								padding: '8px 12px',
								background: 'var(--color-background-subtle)',
								borderRadius: '8px',
								borderLeft: '3px solid var(--color-primary)',
								marginBottom: '4px'
							}}
						>
							{references.map((ref) => (
								<div
									key={ref.id}
									style={{
										fontSize: '13px',
										color: 'var(--color-text-secondary)',
										lineHeight: '1.5'
									}}
								>
									<span style={{ fontWeight: 500 }}>@{ref.senderName}</span>:{' '}
									{ref.content.slice(0, 100)}
									{ref.content.length > 100 && '...'}
								</div>
							))}
						</div>
					)}

					{/* 消息气泡 */}
					<div
						style={{
							padding: '12px 16px',
							borderRadius: '18px',
							background: isAiSuggestion
								? 'var(--color-background-subtle)'
								: isAdopted
								? 'var(--color-primary-lighter)'
								: isCurrentUser
								? 'var(--color-primary)'
								: 'var(--color-background-paper)',
							color: isCurrentUser && !isAiSuggestion && !isAdopted
								? 'white'
								: 'var(--color-text-primary)',
							border: isAiSuggestion
								? '1px solid var(--color-border)'
								: 'none',
							boxShadow: isAiSuggestion
								? 'none'
								: '0 1px 2px rgba(0,0,0,0.05)',
							lineHeight: '1.6',
							wordBreak: 'break-word',
							position: 'relative'
						}}
					>
						{/* 对方的违规标签（显示在消息气泡右上角） */}
						{!isCurrentUser && (moderationStatus === 'WARNING' || moderationStatus === 'BLOCKED') && (
							<div
								style={{
									position: 'absolute',
									top: '-10px',
									right: isLeftAligned ? 'auto' : '8px',
									left: isLeftAligned ? '8px' : 'auto',
									zIndex: 10
								}}
							>
								<ModerationWarning
									status={moderationStatus}
									note={moderationNote || ''}
									details={moderationDetails}
									showDetails={false} // 对方的消息只显示标签
								/>
							</div>
						)}
						{/* Markdown 内容 */}
						<div
							style={{
								fontSize: '15px'
							}}
						>
							<ReactMarkdown
								components={{
									p: ({ children }) => (
										<p style={{ margin: '0.5em 0', lineHeight: '1.6' }}>
											{children}
										</p>
									),
									ul: ({ children }) => (
										<ul style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}>
											{children}
										</ul>
									),
									ol: ({ children }) => (
										<ol style={{ margin: '0.5em 0', paddingLeft: '1.5em' }}>
											{children}
										</ol>
									),
									li: ({ children }) => (
										<li style={{ margin: '0.25em 0' }}>{children}</li>
									),
									blockquote: ({ children }) => (
										<blockquote
											style={{
												borderLeft: '3px solid var(--color-border)',
												paddingLeft: '1em',
												margin: '0.5em 0',
												color: 'var(--color-text-secondary)',
												fontStyle: 'italic'
											}}
										>
											{children}
										</blockquote>
									),
									code: ({ children, className }) => {
										const isInline = !className;
										return isInline ? (
											<code
												style={{
													background: isCurrentUser && !isAiSuggestion && !isAdopted
														? 'rgba(255,255,255,0.2)'
														: 'var(--color-background-subtle)',
													padding: '2px 6px',
													borderRadius: '4px',
													fontFamily: 'var(--font-family-mono)',
													fontSize: '0.9em'
												}}
											>
												{children}
											</code>
										) : (
											<pre
												style={{
													background: isCurrentUser && !isAiSuggestion && !isAdopted
														? 'rgba(0,0,0,0.2)'
														: 'var(--color-background-subtle)',
													padding: '12px',
													borderRadius: '8px',
													overflowX: 'auto',
													margin: '0.5em 0',
													fontSize: '0.9em'
												}}
											>
												<code>{children}</code>
											</pre>
										);
									},
									a: ({ href, children }) => (
										<a
											href={href}
											target="_blank"
											rel="noopener noreferrer"
											style={{
												color: isCurrentUser && !isAiSuggestion && !isAdopted
													? 'rgba(255,255,255,0.9)'
													: 'var(--color-primary)',
												textDecoration: 'none'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.textDecoration = 'underline';
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.textDecoration = 'none';
											}}
										>
											{children}
										</a>
									),
									strong: ({ children }) => (
										<strong style={{ fontWeight: 600 }}>{children}</strong>
									),
									em: ({ children }) => (
										<em style={{ fontStyle: 'italic' }}>{children}</em>
									)
								}}
							>
								{previewContent}
							</ReactMarkdown>
							{isStreaming && (
								<span
									style={{
										display: 'inline-block',
										width: 8,
										height: 16,
										background: isCurrentUser && !isAiSuggestion && !isAdopted
											? 'white'
											: 'var(--color-primary)',
										marginLeft: 4,
										animation: 'blink 1s infinite',
										verticalAlign: 'middle'
									}}
								/>
							)}
						</div>
					</div>

					{/* 折叠/展开按钮 */}
					{shouldCollapse && (
						<button
							onClick={() => setExpanded(!expanded)}
							style={{
								alignSelf: isLeftAligned ? 'flex-start' : 'flex-end',
								padding: '4px 12px',
								background: 'transparent',
								border: '1px solid var(--color-border)',
								borderRadius: '16px',
								color: 'var(--color-text-secondary)',
								cursor: 'pointer',
								fontSize: '13px',
								marginTop: '4px'
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = 'var(--color-background-subtle)';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = 'transparent';
							}}
						>
							{expanded ? '收起' : '展开'}
						</button>
					)}

					{/* 消息操作按钮组（引用、重新生成） */}
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							marginTop: '8px',
							padding: '4px 0'
						}}
					>
						{/* 引用按钮 */}
						{onQuote && (
							<button
								onClick={() => onQuote(id)}
								disabled={isStreaming}
								title="引用此消息"
								style={{
									width: '32px',
									height: '32px',
									padding: 0,
									border: '1px solid var(--color-border)',
									borderRadius: '6px',
									background: 'var(--color-background)',
									cursor: isStreaming ? 'not-allowed' : 'pointer',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									opacity: isStreaming ? 0.5 : 1,
									transition: 'all 0.2s'
								}}
								onMouseEnter={(e) => {
									if (!isStreaming) {
										e.currentTarget.style.background = 'var(--color-background-subtle)';
										e.currentTarget.style.borderColor = 'var(--color-primary)';
									}
								}}
								onMouseLeave={(e) => {
									if (!isStreaming) {
										e.currentTarget.style.background = 'var(--color-background)';
										e.currentTarget.style.borderColor = 'var(--color-border)';
									}
								}}
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
									<path d="M9 10h6" />
								</svg>
							</button>
						)}

						{/* 重新生成按钮（仅AI回答显示） */}
						{(() => {
							// 调试：检查重新生成按钮的显示条件
							if (isAiSuggestion) {
								console.log('[ChatMessage] 🔄 重新生成按钮检查:', {
									messageId: id,
									isAiSuggestion,
									hasOnRegenerate: !!onRegenerate,
									isAdopted,
									type,
									shouldShow: isAiSuggestion && onRegenerate && !isAdopted
								});
							}
							return isAiSuggestion && onRegenerate && !isAdopted;
						})() && (
							<button
								onClick={() => onRegenerate(id)}
								disabled={isStreaming}
								title="重新生成回答"
								style={{
									width: '32px',
									height: '32px',
									padding: 0,
									border: '1px solid var(--color-border)',
									borderRadius: '6px',
									background: 'var(--color-background)',
									cursor: isStreaming ? 'not-allowed' : 'pointer',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									opacity: isStreaming ? 0.5 : 1,
									transition: 'all 0.2s'
								}}
								onMouseEnter={(e) => {
									if (!isStreaming) {
										e.currentTarget.style.background = 'var(--color-background-subtle)';
										e.currentTarget.style.borderColor = 'var(--color-primary)';
									}
								}}
								onMouseLeave={(e) => {
									if (!isStreaming) {
										e.currentTarget.style.background = 'var(--color-background)';
										e.currentTarget.style.borderColor = 'var(--color-border)';
									}
								}}
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<polyline points="23 4 23 10 17 10" />
									<polyline points="1 20 1 14 7 14" />
									<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
								</svg>
							</button>
						)}

						{/* AI 建议采纳按钮（只有未采纳的才显示） */}
						{isAiSuggestion && !isAdopted && onAdopt && (
							<button
								onClick={() => onAdopt(id)}
								disabled={isStreaming}
								style={{
									padding: '6px 12px',
									background: 'var(--color-primary)',
									color: 'white',
									border: 'none',
									borderRadius: '16px',
									cursor: isStreaming ? 'not-allowed' : 'pointer',
									fontSize: '13px',
									fontWeight: 500,
									opacity: isStreaming ? 0.5 : 1,
									transition: 'opacity 0.2s',
									marginLeft: 'auto'
								}}
								onMouseEnter={(e) => {
									if (!isStreaming) {
										e.currentTarget.style.opacity = '0.9';
									}
								}}
								onMouseLeave={(e) => {
									if (!isStreaming) {
										e.currentTarget.style.opacity = '1';
									}
								}}
							>
								{isStreaming ? '生成中...' : '采纳'}
							</button>
						)}
					</div>

				</div>
			</div>
		</div>
	);
}
