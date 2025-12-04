'use client';

interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	color?: string;
}

export default function LoadingSpinner({ size = 'md', color = 'var(--color-primary)' }: LoadingSpinnerProps) {
	const sizeMap = {
		sm: '16px',
		md: '24px',
		lg: '32px',
	};

	return (
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
}










