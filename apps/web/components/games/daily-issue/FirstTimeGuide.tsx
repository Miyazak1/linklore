'use client';

interface FirstTimeGuideProps {
	onClose: () => void;
}

/**
 * 首次体验引导组件
 * 必须点击"开始思考"按钮才能进入游戏
 */
export default function FirstTimeGuide({ onClose }: FirstTimeGuideProps) {

	return (
		<div
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: 'rgba(0, 0, 0, 0.7)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000
			}}
		>
			<div
				style={{
					background: 'var(--color-background)',
					padding: '32px',
					borderRadius: '12px',
					maxWidth: '500px',
					margin: '0 20px',
					animation: 'fadeIn 0.3s ease'
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<h2
					style={{
						fontSize: '20px',
						fontWeight: '600',
						color: 'var(--color-text)',
						marginBottom: '16px',
						textAlign: 'center'
					}}
				>
					欢迎来到每日议题思考游戏
				</h2>
				<div
					style={{
						fontSize: '14px',
						lineHeight: '1.6',
						color: 'var(--color-text-secondary)',
						marginBottom: '24px'
					}}
				>
					<p style={{ marginBottom: '12px' }}>
						<strong>这不是测试，没有标准答案。</strong>
					</p>
					<p style={{ marginBottom: '12px' }}>
						通过多轮选择，你将完成一次完整的公共问题思考过程。
					</p>
					<p style={{ marginBottom: '12px' }}>
						你的选择不会被评判，只会被记录，帮助你理解自己的权衡逻辑。
					</p>
					<p>
						记住：<strong>分歧来自权衡，而不是愚蠢或恶意。</strong>
					</p>
				</div>
				<button
					onClick={onClose}
					style={{
						width: '100%',
						padding: '12px',
						background: 'var(--color-primary)',
						border: 'none',
						borderRadius: '6px',
						cursor: 'pointer',
						fontSize: '14px',
						color: 'white',
						fontWeight: '500'
					}}
				>
					开始思考
				</button>
			</div>
		</div>
	);
}

