'use client';

interface ChatPageLoaderProps {
	message?: string;
	subMessage?: string;
}

/**
 * 统一的聊天页面加载组件
 * 复用 ChatRoom 的加载样式，提供一致的加载体验
 */
export default function ChatPageLoader({ 
	message = '加载中...', 
	subMessage = '正在准备聊天室' 
}: ChatPageLoaderProps) {
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
				}}>{message}</p>
				{/* 加载提示 */}
				{subMessage && (
					<p style={{ 
						color: 'var(--color-text-tertiary)',
						fontSize: '12px',
						margin: '8px 0 0 0'
					}}>{subMessage}</p>
				)}
			</div>
		</div>
	);
}

