'use client';

import { useTheme } from '@/lib/design/theme';

export default function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();

	return (
		<button
			type="button"
			onClick={toggleTheme}
			style={{
				padding: '8px 16px',
				background: 'var(--color-background-paper)',
				border: '1px solid var(--color-border)',
				borderRadius: 'var(--radius-md)',
				cursor: 'pointer',
				fontSize: '0.9em',
				color: 'var(--color-text-primary)',
				transition: 'all var(--transition-fast)',
			}}
			aria-label="切换主题"
		>
			{theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? '深色' : '浅色'}
		</button>
	);
}
