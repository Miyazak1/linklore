'use client';

import { ReactNode } from 'react';

interface CardProps {
	children: ReactNode;
	elevated?: boolean;
	style?: React.CSSProperties;
	className?: string;
}

export default function Card({ children, elevated = false, style, className }: CardProps) {
	return (
		<div
			className={className}
			style={{
				background: 'var(--color-background-elevated)',
				border: '1px solid var(--color-border)',
				borderRadius: 'var(--radius-md)',
				padding: 'var(--spacing-lg)',
				boxShadow: elevated ? 'var(--shadow-md)' : 'var(--shadow-sm)',
				transition: 'all var(--transition-fast)',
				...style,
			}}
		>
			{children}
		</div>
	);
}










