'use client';

import { ReactNode } from 'react';

interface BadgeProps {
	children: ReactNode;
	variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
	size?: 'sm' | 'md';
}

export default function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
	const variantStyles: Record<string, React.CSSProperties> = {
		default: {
			background: 'var(--color-background-paper)',
			color: 'var(--color-text-primary)',
			border: '1px solid var(--color-border)',
		},
		success: {
			background: 'var(--color-success)',
			color: '#ffffff',
		},
		warning: {
			background: 'var(--color-warning)',
			color: '#ffffff',
		},
		error: {
			background: 'var(--color-error)',
			color: '#ffffff',
		},
		info: {
			background: 'var(--color-primary)',
			color: '#ffffff',
		},
	};

	return (
		<span
			style={{
				display: 'inline-block',
				padding: size === 'sm' ? '2px 8px' : '4px 12px',
				borderRadius: 'var(--radius-full)',
				fontSize: size === 'sm' ? '0.75rem' : '0.875rem',
				fontWeight: 500,
				...variantStyles[variant],
			}}
		>
			{children}
		</span>
	);
}










