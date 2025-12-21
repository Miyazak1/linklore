'use client';

import { ReactNode } from 'react';

interface CardProps {
	children: ReactNode;
	elevated?: boolean;
	style?: React.CSSProperties;
	className?: string;
	onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
	onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function Card({ children, elevated = false, style, className, onMouseEnter, onMouseLeave }: CardProps) {
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
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			{children}
		</div>
	);
}










