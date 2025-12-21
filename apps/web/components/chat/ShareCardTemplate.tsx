'use client';

import { forwardRef } from 'react';
import type { ShareCardMessage, ShareCardConfig } from '@/types/share';
import { truncateMessage, formatDateTime } from '@/lib/utils/shareCard';

interface ShareCardTemplateProps {
	messages: ShareCardMessage[];
	config: ShareCardConfig;
}

const ShareCardTemplate = forwardRef<HTMLDivElement, ShareCardTemplateProps>(
	({ messages, config }, ref) => {
		// 根据主题获取配色
		const theme = config.theme || 'default';
		const bgColor = config.backgroundColor;
		const textColor = config.textColor;
		
		// 马克思主义主题的特殊配色
		const isMarxismTheme = theme === 'marxism';
		const primaryColor = isMarxismTheme ? '#c62828' : '#1a4480'; // 马克思主义主题使用深红色
		const userBubbleBg = isMarxismTheme ? '#8b2635' : '#0d2d54'; // 用户消息气泡：深红/深蓝
		const aiBubbleBg = isMarxismTheme ? '#f5ebe0' : '#f5f5f5'; // AI消息气泡：温暖的米色/灰色
		const borderColor = isMarxismTheme ? '#d4a574' : '#d4d4d4'; // 边框：金色/灰色
		
		return (
			<div
				ref={ref}
				data-share-card="true"
				lang="zh-CN"
				dir="ltr"
				style={{
					width: '1080px',
					height: '1440px',
					background: bgColor,
					color: textColor,
					padding: '48px 40px', // 增加上下内边距，提升呼吸感
					boxSizing: 'border-box',
					fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Microsoft YaHei", "SimHei", "PingFang SC", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
					WebkitFontSmoothing: 'antialiased',
					MozOsxFontSmoothing: 'grayscale',
					direction: 'ltr',
					unicodeBidi: 'normal',
					lineHeight: '1.5', // 增加行高，提升可读性
				}}
			>
				{/* 顶部 Logo/标题区域 */}
				{config.showLogo && (
					<div
						style={{
							marginBottom: '28px',
							textAlign: 'center',
						}}
					>
						<div
							style={{
								fontSize: '28px',
								fontWeight: 600,
								color: primaryColor,
								marginBottom: '4px',
								letterSpacing: '0.5px', // 增加字间距，更优雅
							}}
						>
							LinkLore
						</div>
						{isMarxismTheme && (
							<div
								style={{
									fontSize: '12px',
									color: textColor,
									opacity: 0.6,
									marginTop: '4px',
								}}
							>
								深度思考 · 理论对话
							</div>
						)}
					</div>
				)}

				{/* 标题 */}
				{config.title && (
					<h1
						style={{
							fontSize: '38px',
							fontWeight: 700,
							marginBottom: '36px',
							textAlign: 'center',
							color: textColor,
							lineHeight: '1.3',
							letterSpacing: '-0.5px', // 标题字间距稍紧
						}}
					>
						{config.title}
					</h1>
				)}

				{/* 消息列表 */}
				<div
					style={{
						flex: 1,
						overflowY: 'auto',
						paddingRight: '8px',
					}}
				>
					{messages.map((message, index) => {
						const truncatedContent = truncateMessage(
							message.content,
							config.maxMessageLength
						);
						const isUserMessage = message.type === 'USER' || message.type === 'AI_ADOPTED';
						const isAiMessage = message.type === 'AI_SUGGESTION';

						return (
							<div
								key={message.id}
								style={{
									marginBottom: '28px', // 增加消息间距
									display: 'flex',
									flexDirection: message.isCurrentUser ? 'row' : 'row-reverse',
									alignItems: 'flex-start',
									gap: '14px', // 增加头像和气泡间距
								}}
							>
								{/* 头像 */}
								{message.senderAvatar ? (
									<img
										src={message.senderAvatar}
										alt={message.senderName}
										style={{
											width: '44px', // 稍大一点的头像
											height: '44px',
											borderRadius: '50%',
											flexShrink: 0,
											objectFit: 'cover',
											border: isMarxismTheme ? `2px solid ${borderColor}` : 'none',
										}}
									/>
								) : (
									<div
										style={{
											width: '44px',
											height: '44px',
											borderRadius: '50%',
											flexShrink: 0,
											background: isAiMessage
												? primaryColor
												: message.isCurrentUser
												? primaryColor
												: isMarxismTheme
												? '#e8d5c4'
												: '#f5f5f5',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											color: isAiMessage || message.isCurrentUser ? 'white' : textColor,
											fontSize: '17px',
											fontWeight: 600,
											border: isMarxismTheme && !isAiMessage && !message.isCurrentUser ? `2px solid ${borderColor}` : 'none',
										}}
									>
										{isAiMessage ? 'AI' : message.senderName.charAt(0).toUpperCase()}
									</div>
								)}

								{/* 消息气泡 */}
								<div
									style={{
										maxWidth: '72%', // 稍微宽一点
										padding: '14px 18px', // 增加内边距，更舒适
										borderRadius: '20px', // 更圆润的圆角
										background: isAiMessage
											? aiBubbleBg
											: message.isCurrentUser
											? userBubbleBg
											: isMarxismTheme
											? '#ffffff'
											: '#ffffff',
										color: isAiMessage
											? textColor
											: message.isCurrentUser
											? '#ffffff'
											: textColor,
										border: isAiMessage
											? `1px solid ${borderColor}`
											: message.isCurrentUser
											? 'none'
											: isMarxismTheme
											? `1px solid ${borderColor}`
											: '1px solid #e8e8e8',
										boxShadow: isMarxismTheme
											? '0 2px 8px rgba(0,0,0,0.08)' // 更柔和的阴影
											: '0 1px 3px rgba(0,0,0,0.1)',
										lineHeight: '1.65', // 增加行高
										wordBreak: 'break-word',
									}}
								>
									{/* 发送者名称 */}
									<div
										style={{
											fontSize: '13px',
											fontWeight: 600,
											marginBottom: '6px',
											opacity: message.isCurrentUser ? 0.95 : 0.75,
											letterSpacing: '0.3px',
										}}
									>
										{isAiMessage ? 'AI 助手' : message.senderName}
									</div>
									{/* 消息内容 */}
									<div
										style={{
											fontSize: '17px', // 稍大一点的字体
											whiteSpace: 'pre-wrap',
											fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Microsoft YaHei", "SimHei", "PingFang SC", sans-serif',
											direction: 'ltr',
											unicodeBidi: 'normal',
											lineHeight: '1.7', // 更舒适的行高
											letterSpacing: '0.2px', // 轻微字间距
										}}
									>
										{truncatedContent}
									</div>
									{/* 时间 */}
									<div
										style={{
											fontSize: '11px',
											marginTop: '6px',
											opacity: 0.55,
											letterSpacing: '0.2px',
										}}
									>
										{formatDateTime(message.createdAt)}
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* 底部信息 */}
				{config.showWatermark && (
					<div
						style={{
							marginTop: '28px',
							paddingTop: '24px',
							borderTop: isMarxismTheme ? `1px solid ${borderColor}` : '1px solid #e8e8e8',
							textAlign: 'center',
							fontSize: '12px',
							color: isMarxismTheme ? textColor : '#6b6b6b',
							opacity: 0.6,
							letterSpacing: '0.5px',
						}}
					>
						{isMarxismTheme ? '来自 LinkLore · 理论对话平台' : '来自 LinkLore - 智能对话，深度思考'}
					</div>
				)}
			</div>
		);
	}
);

ShareCardTemplate.displayName = 'ShareCardTemplate';

export default ShareCardTemplate;

