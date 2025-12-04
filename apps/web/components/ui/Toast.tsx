'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
	message: string;
	type?: 'success' | 'error' | 'info' | 'warning';
	duration?: number;
	onClose?: () => void;
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		if (duration > 0) {
			const timer = setTimeout(() => {
				setVisible(false);
				setTimeout(() => onClose?.(), 300); // Wait for animation
			}, duration);
			return () => clearTimeout(timer);
		}
	}, [duration, onClose]);

	const typeStyles: Record<string, React.CSSProperties> = {
		success: {
			background: 'var(--color-success)',
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
		warning: {
			background: 'var(--color-warning)',
			color: '#ffffff',
		},
	};

	if (!visible) return null;

	return (
		<div
			style={{
				position: 'fixed',
				bottom: '24px',
				right: '24px',
				padding: '12px 20px',
				borderRadius: 'var(--radius-md)',
				boxShadow: 'var(--shadow-lg)',
				zIndex: 1000,
				animation: 'slideUp var(--transition-normal) ease-out',
				...typeStyles[type],
			}}
		>
			{message}
		</div>
	);
}










