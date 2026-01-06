'use client';

import { useTheme } from '@/lib/design/theme';

interface ThemeToggleProps {
	collapsed?: boolean;
}

export default function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
	const { theme, toggleTheme } = useTheme();

	return (
		<button
			type="button"
			onClick={toggleTheme}
			title={collapsed ? (theme === 'light' ? '切换到深色模式' : '切换到浅色模式') : undefined}
			style={{
				width: collapsed ? '48px' : 'auto',
				height: collapsed ? '48px' : 'auto',
				padding: collapsed ? '0' : '8px 16px',
				background: 'var(--color-background-paper)',
				border: '1px solid var(--color-border)',
				borderRadius: collapsed ? '50%' : 'var(--radius-md)',
				cursor: 'pointer',
				fontSize: collapsed ? 'var(--font-size-lg)' : '0.9em',
				color: 'var(--color-text-primary)',
				transition: 'all var(--transition-fast)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				minWidth: collapsed ? 'auto' : 'auto',
				margin: collapsed ? '0 auto' : '0'
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = 'var(--color-background-subtle)';
				e.currentTarget.style.borderColor = 'var(--color-primary)';
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = 'var(--color-background-paper)';
				e.currentTarget.style.borderColor = 'var(--color-border)';
			}}
			aria-label="切换主题"
		>
			{theme === 'light' ? '🌙' : '☀️'}
			{!collapsed && <span style={{ marginLeft: 'var(--spacing-xs)' }}>
				{theme === 'light' ? '深色' : '浅色'}
			</span>}
		</button>
	);
}
