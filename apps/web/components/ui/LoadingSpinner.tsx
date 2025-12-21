'use client';

interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	color?: string;
	fullscreen?: boolean; // 是否全屏显示
	message?: string; // 加载提示文字
}

export default function LoadingSpinner({ 
	size = 'md', 
	color = 'var(--color-primary)',
	fullscreen = false,
	message 
}: LoadingSpinnerProps) {
	const sizeMap = {
		sm: '16px',
		md: '24px',
		lg: '32px',
	};

	const spinner = (
		<div
			style={{
				display: 'inline-block',
				width: sizeMap[size],
				height: sizeMap[size],
				border: `3px solid ${color}20`,
				borderTop: `3px solid ${color}`,
				borderRadius: '50%',
				animation: 'spin 0.8s linear infinite',
			}}
		/>
	);

	if (fullscreen) {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'var(--color-background)',
					opacity: 0.95,
					zIndex: 9999,
					backdropFilter: 'blur(4px)',
				}}
			>
				{spinner}
				{message && (
					<p style={{
						marginTop: '16px',
						color: 'var(--color-text-secondary)',
						fontSize: '14px',
						fontWeight: 500,
					}}>{message}</p>
				)}
			</div>
		);
	}

	return spinner;
}










