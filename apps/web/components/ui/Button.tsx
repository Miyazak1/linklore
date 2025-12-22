'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
	size?: 'sm' | 'md' | 'lg';
	children: ReactNode;
	fullWidth?: boolean;
}

export default function Button({
	variant = 'primary',
	size = 'md',
	fullWidth = false,
	children,
	style,
	...props
}: ButtonProps) {
	const baseStyle: React.CSSProperties = {
		padding: size === 'sm' ? '8px 16px' : size === 'lg' ? '14px 28px' : '10px 20px',
		border: 'none',
		borderRadius: 'var(--radius-lg)',
		cursor: props.disabled ? 'not-allowed' : 'pointer',
		fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem',
		fontWeight: 500,
		transition: 'all var(--transition-normal)',
		width: fullWidth ? '100%' : 'auto',
		opacity: props.disabled ? 0.6 : 1,
	};

	const variantStyles: Record<string, React.CSSProperties> = {
		primary: {
			background: 'var(--color-primary)',
			color: '#ffffff',
		},
		secondary: {
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
	};

	const hoverStyle: React.CSSProperties = !props.disabled
		? {
				transform: 'translateY(-2px)',
				boxShadow: variant === 'primary' ? '0 8px 16px rgba(0, 112, 243, 0.3)' : 'var(--shadow-lg)',
			}
		: {};

	return (
		<button
			{...props}
			style={{
				...baseStyle,
				...variantStyles[variant],
				...style,
			}}
			onMouseEnter={(e) => {
				if (!props.disabled) {
					Object.assign(e.currentTarget.style, hoverStyle);
				}
			}}
			onMouseLeave={(e) => {
				if (!props.disabled) {
					e.currentTarget.style.transform = '';
					e.currentTarget.style.boxShadow = '';
				}
			}}
		>
			{children}
		</button>
	);
}










